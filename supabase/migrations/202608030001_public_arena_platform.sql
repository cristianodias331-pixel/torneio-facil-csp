begin;

create extension if not exists pgcrypto;

alter table public.circuits
  add column if not exists ranking_criteria text not null default 'wins_points_balance',
  add column if not exists ranking_criteria_mode text not null default 'automatic';

-- O histórico acumulado ainda não existia no banco de produção. Esta tabela
-- guarda somente resultados derivados; torneios, jogos e placares continuam
-- preservados integralmente no JSON original de public.tournaments.
create table if not exists public.circuit_ranking_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  circuit_id uuid not null references public.circuits(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_key text not null default 'geral',
  player_key text not null,
  player_name text not null,
  pts integer not null default 0,
  w integer not null default 0,
  bal integer not null default 0,
  played integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, circuit_id, tournament_id, group_key, player_key)
);

create index if not exists circuit_ranking_history_circuit_idx
  on public.circuit_ranking_history (user_id, circuit_id);

alter table public.circuit_ranking_history enable row level security;

drop policy if exists circuit_ranking_history_owner_select on public.circuit_ranking_history;
create policy circuit_ranking_history_owner_select
on public.circuit_ranking_history for select
to authenticated
using (user_id = auth.uid());

drop policy if exists circuit_ranking_history_owner_insert on public.circuit_ranking_history;
create policy circuit_ranking_history_owner_insert
on public.circuit_ranking_history for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists circuit_ranking_history_owner_update on public.circuit_ranking_history;
create policy circuit_ranking_history_owner_update
on public.circuit_ranking_history for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists circuit_ranking_history_owner_delete on public.circuit_ranking_history;
create policy circuit_ranking_history_owner_delete
on public.circuit_ranking_history for delete
to authenticated
using (user_id = auth.uid());

revoke all on table public.circuit_ranking_history from anon;
grant select, insert, update, delete on table public.circuit_ranking_history to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.circuits'::regclass
      and conname = 'circuits_ranking_criteria_mode_check'
  ) then
    alter table public.circuits
      add constraint circuits_ranking_criteria_mode_check
      check (ranking_criteria_mode in ('automatic', 'manual'));
  end if;
end;
$$;

-- Circuitos automáticos antigos passam a herdar o critério do primeiro torneio
-- ainda vinculado, preservando o mesmo comportamento do painel após o login.
update public.circuits as circuit
set ranking_criteria = coalesce((
  select tournament.data ->> 'rankingCriteria'
  from jsonb_array_elements_text(coalesce(to_jsonb(circuit.tournament_ids), '[]'::jsonb))
    with ordinality as linked_id(value, ordinality)
  join public.tournaments tournament
    on tournament.id::text = linked_id.value
   and tournament.user_id = circuit.user_id
  where coalesce(tournament.data ->> 'deletedAt', '') = ''
    and tournament.data ->> 'rankingCriteria' in (
      'wins_points_balance',
      'wins_balance_points',
      'points_wins_balance',
      'points_balance_wins',
      'balance_wins_points',
      'balance_points_wins'
    )
  order by linked_id.ordinality
  limit 1
), circuit.ranking_criteria)
where circuit.ranking_criteria_mode = 'automatic';

-- Todo torneio existente fora da lixeira passa a integrar automaticamente o
-- perfil real da arena. O identificador continua estável para links antigos.
update public.tournaments
set
  public_id = coalesce(
    nullif(trim(public_id), ''),
    't360_' || replace(gen_random_uuid()::text, '-', '')
  ),
  is_public = case when coalesce(data ->> 'deletedAt', '') = '' then true else false end,
  status = case
    when coalesce(data ->> 'eventEndDate', data ->> 'eventDate', '') ~ '^\d{4}-\d{2}-\d{2}$'
      and coalesce(data ->> 'eventEndDate', data ->> 'eventDate')::date
        < (statement_timestamp() at time zone 'America/Sao_Paulo')::date
      then 'finished'
    else 'active'
  end;

create or replace function public.t360_keep_tournament_on_arena_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if nullif(trim(new.public_id), '') is null then
    new.public_id := 't360_' || replace(gen_random_uuid()::text, '-', '');
  end if;

  new.is_public := coalesce(new.data ->> 'deletedAt', '') = '';

  if coalesce(new.data ->> 'eventEndDate', new.data ->> 'eventDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    new.status := case
      when coalesce(new.data ->> 'eventEndDate', new.data ->> 'eventDate')::date
        < (statement_timestamp() at time zone 'America/Sao_Paulo')::date
        then 'finished'
      else 'active'
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists torneio360_keep_tournament_on_arena_profile on public.tournaments;
create trigger torneio360_keep_tournament_on_arena_profile
before insert or update of data, public_id, is_public on public.tournaments
for each row execute function public.t360_keep_tournament_on_arena_profile();

revoke all on function public.t360_keep_tournament_on_arena_profile() from public, anon, authenticated;

-- A ordenação feita por arrastar é salva em uma única transação. A função só
-- aceita torneios pertencentes ao organizador autenticado.
create or replace function public.set_tournament_order(p_tournament_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  updated_count integer := 0;
  requested_count integer := cardinality(coalesce(p_tournament_ids, '{}'::uuid[]));
begin
  update public.tournaments as tournament
  set data = jsonb_set(
    coalesce(tournament.data, '{}'::jsonb),
    '{displayOrder}',
    to_jsonb((ordered_item.ordinality - 1)::integer),
    true
  )
  from unnest(coalesce(p_tournament_ids, '{}'::uuid[]))
    with ordinality as ordered_item(id, ordinality)
  where tournament.id = ordered_item.id
    and tournament.user_id = auth.uid()
    and coalesce(tournament.data ->> 'deletedAt', '') = '';

  get diagnostics updated_count = row_count;

  if updated_count <> requested_count then
    raise exception 'Não foi possível validar todos os torneios da nova ordem.';
  end if;

  return updated_count;
end;
$$;

revoke all on function public.set_tournament_order(uuid[]) from public, anon;
grant execute on function public.set_tournament_order(uuid[]) to authenticated;

-- A área pública não recebe metadados privados de vínculos de atletas.
create or replace function public.t360_public_tournament_data(p_data jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select coalesce(p_data, '{}'::jsonb)
    - 'participantMeta'
    - 'participant_meta'
    - 'privateData'
    - 'internalData';
$$;

revoke all on function public.t360_public_tournament_data(jsonb) from public, anon, authenticated;

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
  join auth.users account on account.id = profile.id
  where account.email_confirmed_at is not null
    and lower(coalesce(account.raw_app_meta_data ->> 'role', 'organizer')) not in (
      'athlete', 'visitor', 'spectator', 'organizer_pending'
    )
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or concat_ws(' ', profile.arena_name, profile.name, profile.city, profile.state)
        ilike '%' || trim(p_search) || '%'
    )
  order by lower(coalesce(nullif(profile.arena_name, ''), profile.name, 'Arena'))
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

drop function if exists public.get_public_arena_bundle(uuid, text);
create function public.get_public_arena_bundle(
  p_organizer_id uuid default null,
  p_public_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  owner_id uuid;
  profile_json jsonb;
  tournaments_json jsonb := '[]'::jsonb;
  circuits_json jsonb := '[]'::jsonb;
begin
  owner_id := p_organizer_id;

  if owner_id is null and nullif(trim(coalesce(p_public_id, '')), '') is not null then
    select tournament.user_id
    into owner_id
    from public.tournaments tournament
    where tournament.public_id = trim(p_public_id)
      and coalesce(tournament.data ->> 'deletedAt', '') = ''
    limit 1;
  end if;

  if owner_id is null then
    return jsonb_build_object('profile', null, 'tournaments', '[]'::jsonb, 'circuits', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'id', profile.id,
    'name', profile.name,
    'arena_name', profile.arena_name,
    'city', profile.city,
    'state', profile.state,
    'photo_url', profile.photo_url,
    'phone', profile.phone,
    'address', profile.address,
    'maps_link', profile.maps_link,
    'instagram_handle', profile.instagram_handle,
    'instagram_link', profile.instagram_link,
    'whatsapp_group_link', profile.whatsapp_group_link
  )
  into profile_json
  from public.profiles profile
  join auth.users account on account.id = profile.id
  where profile.id = owner_id
    and account.email_confirmed_at is not null
    and lower(coalesce(account.raw_app_meta_data ->> 'role', 'organizer')) not in (
      'athlete', 'visitor', 'spectator', 'organizer_pending'
    );

  if profile_json is null then
    return jsonb_build_object('profile', null, 'tournaments', '[]'::jsonb, 'circuits', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', tournament.id,
      'user_id', tournament.user_id,
      'name', tournament.name,
      'type', tournament.type,
      'data', public.t360_public_tournament_data(tournament.data),
      'public_id', tournament.public_id,
      'is_public', true,
      'status', tournament.status,
      'created_at', tournament.created_at,
      'updated_at', tournament.updated_at
    ) order by
      case
        when tournament.data ->> 'displayOrder' ~ '^-?[0-9]+$'
          then (tournament.data ->> 'displayOrder')::integer
        else null
      end asc nulls last,
      tournament.created_at desc
  ), '[]'::jsonb)
  into tournaments_json
  from public.tournaments tournament
  where tournament.user_id = owner_id
    and coalesce(tournament.data ->> 'deletedAt', '') = '';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', circuit.id,
      'user_id', circuit.user_id,
      'name', circuit.name,
      'start_date', circuit.start_date,
      'end_date', circuit.end_date,
      'status', case
        when circuit.end_date is not null
          and circuit.end_date < (statement_timestamp() at time zone 'America/Sao_Paulo')::date
          then 'finished'
        else 'active'
      end,
      'tournament_ids', coalesce((
        select jsonb_agg(linked_id.value order by linked_id.ordinality)
        from jsonb_array_elements_text(coalesce(to_jsonb(circuit.tournament_ids), '[]'::jsonb))
          with ordinality as linked_id(value, ordinality)
        where exists (
          select 1
          from public.tournaments linked_tournament
          where linked_tournament.id::text = linked_id.value
            and linked_tournament.user_id = owner_id
            and coalesce(linked_tournament.data ->> 'deletedAt', '') = ''
        )
      ), '[]'::jsonb),
      'ranking_criteria', circuit.ranking_criteria,
      'ranking_criteria_mode', circuit.ranking_criteria_mode,
      'ranking_groups', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'key', grouped.group_key,
            'title', case grouped.group_key
              when 'masculino' then 'Ranking Masculino'
              when 'feminino' then 'Ranking Feminino'
              else 'Ranking geral acumulado'
            end,
            'rows', grouped.rows
          ) order by grouped.group_key
        )
        from (
          select
            ranking.group_key,
            jsonb_agg(
              jsonb_build_object(
                'id', ranking.group_key || ':' || ranking.player_key,
                'name', ranking.player_name,
                'pts', ranking.pts,
                'w', ranking.w,
                'bal', ranking.bal,
                'played', ranking.played,
                'tournaments', ranking.tournaments
              ) order by ranking.player_name
            ) as rows
          from (
            select
              coalesce(history.group_key, 'geral') as group_key,
              history.player_key,
              max(history.player_name) as player_name,
              sum(history.pts)::integer as pts,
              sum(history.w)::integer as w,
              sum(history.bal)::integer as bal,
              sum(history.played)::integer as played,
              count(distinct history.tournament_id)::integer as tournaments
            from public.circuit_ranking_history history
            where history.circuit_id = circuit.id
              and history.user_id = owner_id
              and history.played > 0
              and exists (
                select 1
                from jsonb_array_elements_text(coalesce(to_jsonb(circuit.tournament_ids), '[]'::jsonb))
                  as selected_tournament(value)
                join public.tournaments linked_tournament
                  on linked_tournament.id::text = selected_tournament.value
                where selected_tournament.value = history.tournament_id::text
                  and linked_tournament.user_id = owner_id
                  and coalesce(linked_tournament.data ->> 'deletedAt', '') = ''
              )
            group by coalesce(history.group_key, 'geral'), history.player_key
          ) ranking
          group by ranking.group_key
        ) grouped
      ), '[]'::jsonb),
      'updated_at', circuit.updated_at
    ) order by circuit.updated_at desc
  ), '[]'::jsonb)
  into circuits_json
  from public.circuits circuit
  where circuit.user_id = owner_id;

  return jsonb_build_object(
    'profile', profile_json,
    'tournaments', tournaments_json,
    'circuits', circuits_json
  );
end;
$$;

revoke all on function public.list_public_arenas(text, integer) from public, anon, authenticated;
revoke all on function public.get_public_arena_bundle(uuid, text) from public, anon, authenticated;
grant execute on function public.list_public_arenas(text, integer) to anon, authenticated;
grant execute on function public.get_public_arena_bundle(uuid, text) to anon, authenticated;

-- Visitantes não recebem escrita. Mesmo uma conta autenticada só pode alterar
-- o perfil quando é o próprio organizador e possui acesso administrativo ativo.
alter table public.profiles enable row level security;
drop policy if exists profiles_no_direct_insert_guard on public.profiles;
create policy profiles_no_direct_insert_guard
on public.profiles as restrictive for insert
to authenticated
with check (false);

drop policy if exists profiles_active_organizer_update_guard on public.profiles;
create policy profiles_active_organizer_update_guard
on public.profiles as restrictive for update
to authenticated
using (
  id = auth.uid()
  and lower(coalesce(status, '')) = 'active'
  and (expires_at is null or expires_at >= (statement_timestamp() at time zone 'America/Sao_Paulo')::date)
  and lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'organizer')) not in (
    'athlete', 'visitor', 'spectator', 'organizer_pending'
  )
)
with check (
  id = auth.uid()
  and lower(coalesce(status, '')) = 'active'
  and (expires_at is null or expires_at >= (statement_timestamp() at time zone 'America/Sao_Paulo')::date)
  and lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'organizer')) not in (
    'athlete', 'visitor', 'spectator', 'organizer_pending'
  )
);

commit;
