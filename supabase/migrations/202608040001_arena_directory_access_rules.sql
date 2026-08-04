begin;

-- Contas de organizador nascem pendentes e só recebem escrita administrativa
-- depois que o e-mail é confirmado. A promoção é idempotente e não altera
-- visitantes ou atletas.
create or replace function private.promote_confirmed_organizer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  update auth.users account
  set raw_app_meta_data = coalesce(account.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'organizer')
  where account.id = p_user_id
    and account.email_confirmed_at is not null
    and lower(coalesce(account.raw_app_meta_data ->> 'role', '')) = 'organizer_pending';
end;
$$;

revoke all on function private.promote_confirmed_organizer(uuid) from public, anon, authenticated;

-- O perfil inicial não recebe mais o prazo legado de 14 dias da coluna.
-- O período Premium começa somente após a confirmação do e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    plan,
    status,
    expires_at,
    is_public
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Organizador'
    ),
    'premium',
    case when new.email_confirmed_at is null then 'pending' else 'active' end,
    case
      when new.email_confirmed_at is null then null
      else (new.email_confirmed_at at time zone 'America/Sao_Paulo')::date + 6
    end,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Reconciliação segura para cadastros novos e antigos. A data do teste é
-- derivada da confirmação original; executar novamente nunca renova o prazo.
create or replace function private.provision_profile_from_auth_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  account_row auth.users%rowtype;
  trial_end date;
  is_confirmed boolean;
  profile_name text;
begin
  select *
  into account_row
  from auth.users
  where id = p_user_id;

  if not found then
    raise exception 'Usuário de autenticação não encontrado';
  end if;

  is_confirmed := account_row.email_confirmed_at is not null;
  trial_end := case
    when is_confirmed
      then (account_row.email_confirmed_at at time zone 'America/Sao_Paulo')::date + 6
    else null
  end;
  profile_name := left(trim(coalesce(
    nullif(account_row.raw_user_meta_data ->> 'name', ''),
    nullif(account_row.raw_user_meta_data ->> 'full_name', ''),
    nullif(account_row.raw_user_meta_data ->> 'first_name', ''),
    split_part(coalesce(account_row.email, ''), '@', 1),
    'Organizador'
  )), 120);

  insert into public.profiles as profile (
    id,
    email,
    name,
    status,
    plan,
    expires_at,
    is_public
  )
  values (
    account_row.id,
    account_row.email,
    profile_name,
    case when is_confirmed then 'active' else 'pending' end,
    'premium',
    trial_end,
    false
  )
  on conflict (id) do update
  set
    email = coalesce(nullif(profile.email, ''), excluded.email),
    name = coalesce(nullif(trim(profile.name), ''), excluded.name),
    status = case
      when is_confirmed
        and lower(coalesce(profile.status, '')) in (
          'pending', 'pendente', 'pending_email', 'awaiting',
          'awaiting_approval', 'in_review', 'analysis'
        )
      then 'active'
      else profile.status
    end,
    plan = case
      when is_confirmed
        and lower(coalesce(profile.status, '')) in (
          'pending', 'pendente', 'pending_email', 'awaiting',
          'awaiting_approval', 'in_review', 'analysis'
        )
      then 'premium'
      else profile.plan
    end,
    expires_at = case
      when is_confirmed
        and lower(coalesce(profile.status, '')) in (
          'pending', 'pendente', 'pending_email', 'awaiting',
          'awaiting_approval', 'in_review', 'analysis'
        )
        and profile.expires_at is null
      then trial_end
      else profile.expires_at
    end;

  if is_confirmed then
    perform private.promote_confirmed_organizer(account_row.id);
  end if;
end;
$$;

revoke all on function private.provision_profile_from_auth_user(uuid) from public, anon, authenticated;

create or replace function public.reconcile_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  account_role text;
  profile_row public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;

  select lower(coalesce(account.raw_app_meta_data ->> 'role', ''))
  into account_role
  from auth.users account
  where account.id = auth.uid();

  if not found then
    raise exception 'Conta não encontrada.';
  end if;

  if account_role not in ('organizer', 'organizer_pending') then
    raise exception 'Esta conta não é de organizador.';
  end if;

  perform private.provision_profile_from_auth_user(auth.uid());

  select *
  into profile_row
  from public.profiles
  where id = auth.uid();

  return to_jsonb(profile_row);
end;
$$;

-- A arena entra no diretório quando possui nome da arena e responsável e:
--   * é assinante com acesso ativo; ou
--   * está no teste ativo e já criou um torneio/circuito; ou
--   * possui um evento ainda em andamento, mesmo após o acesso expirar.
-- Eventos e resultados antigos continuam acessíveis pelos links diretos.
create or replace function public.t360_arena_directory_visible(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select coalesce((
    select
      nullif(trim(coalesce(profile.arena_name, '')), '') is not null
      and nullif(trim(coalesce(profile.name, '')), '') is not null
      and account.email_confirmed_at is not null
      and lower(coalesce(account.raw_app_meta_data ->> 'role', '')) not in (
        'athlete', 'visitor', 'spectator'
      )
      and lower(coalesce(profile.status, '')) not in ('blocked', 'bloqueado')
      and (
        (
          lower(coalesce(profile.status, '')) in ('active', 'ativo')
          and (
            profile.expires_at is null
            or profile.expires_at >= (statement_timestamp() at time zone 'America/Sao_Paulo')::date
          )
          and (
            profile.expires_at is null
            or profile.expires_at
              > coalesce(
                  (account.email_confirmed_at at time zone 'America/Sao_Paulo')::date,
                  (account.created_at at time zone 'America/Sao_Paulo')::date
                ) + 6
            or exists (
              select 1
              from public.tournaments tournament
              where tournament.user_id = profile.id
                and coalesce(tournament.data ->> 'deletedAt', '') = ''
            )
            or exists (
              select 1
              from public.circuits circuit
              where circuit.user_id = profile.id
            )
          )
        )
        or exists (
          select 1
          from public.tournaments tournament
          cross join lateral (
            select coalesce(
              nullif(tournament.data ->> 'eventEndDate', ''),
              nullif(tournament.data ->> 'eventStartDate', ''),
              nullif(tournament.data ->> 'eventDate', '')
            ) as event_end_value
          ) event_date
          where tournament.user_id = profile.id
            and coalesce(tournament.data ->> 'deletedAt', '') = ''
            and event_date.event_end_value ~ '^\d{4}-\d{2}-\d{2}$'
            and event_date.event_end_value::date
              >= (statement_timestamp() at time zone 'America/Sao_Paulo')::date
        )
        or exists (
          select 1
          from public.circuits circuit
          where circuit.user_id = profile.id
            and circuit.end_date
              >= (statement_timestamp() at time zone 'America/Sao_Paulo')::date
        )
      )
    from public.profiles profile
    join auth.users account on account.id = profile.id
    where profile.id = p_profile_id
  ), false);
$$;

revoke all on function public.t360_arena_directory_visible(uuid) from public, anon, authenticated;

drop function if exists public.list_public_arenas(text, integer);
create function public.list_public_arenas(
  p_search text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  name text,
  arena_name text,
  city text,
  state text,
  photo_url text,
  phone text,
  address text,
  maps_link text,
  instagram_handle text,
  instagram_link text,
  whatsapp_group_link text
)
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select
    profile.id,
    profile.name,
    profile.arena_name,
    profile.city,
    profile.state,
    profile.photo_url,
    profile.phone,
    profile.address,
    profile.maps_link,
    profile.instagram_handle,
    profile.instagram_link,
    profile.whatsapp_group_link
  from public.profiles profile
  where public.t360_arena_directory_visible(profile.id)
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or concat_ws(' ', profile.arena_name, profile.name, profile.city, profile.state)
        ilike '%' || trim(p_search) || '%'
    )
  order by lower(coalesce(nullif(profile.arena_name, ''), profile.name, 'Arena'))
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.list_public_arenas(text, integer) from public, anon, authenticated;
grant execute on function public.list_public_arenas(text, integer) to anon, authenticated;

-- Corrige contas antigas de forma idempotente. Perfis já ativos, assinaturas e
-- vencimentos existentes não são sobrescritos.
do $$
declare
  account_row record;
begin
  for account_row in
    select account.id
    from auth.users account
    where lower(coalesce(account.raw_app_meta_data ->> 'role', '')) in (
      'organizer', 'organizer_pending'
    )
  loop
    perform private.provision_profile_from_auth_user(account_row.id);
  end loop;
end;
$$;

commit;
