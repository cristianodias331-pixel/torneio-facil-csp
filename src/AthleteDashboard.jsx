import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Medal,
  Moon,
  Save,
  Search,
  ShieldCheck,
  Sun,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import "./athlete-dashboard.css";

const PROFILE_FIELDS = "user_id, display_name, photo_url, bio, is_public, show_achievements, updated_at";
const REGISTRATION_FIELDS = "id, tournament_id, athlete_user_id, athlete_name, partner_name, category, status, created_at, updated_at";
const THEME_STORAGE_PREFIX = "torneio360:athlete-theme:";
const ACTIVE_REGISTRATION_STATUSES = new Set(["pending", "confirmed"]);
const REGISTRATION_STATUS_META = {
  pending: { label: "Pendente", className: "pending" },
  confirmed: { label: "Confirmada", className: "confirmed" },
  rejected: { label: "Recusada", className: "rejected" },
  cancelled: { label: "Cancelada", className: "cancelled" },
};

function getUserProfile(user) {
  const metadata = user?.user_metadata || {};
  return {
    display_name: metadata.display_name || metadata.name || metadata.full_name || "Atleta",
    photo_url: metadata.photo_url || metadata.avatar_url || "",
    bio: metadata.athlete_bio || "",
    is_public: metadata.athlete_profile_public === true,
    show_achievements: metadata.athlete_show_achievements !== false,
  };
}

function parseTournamentData(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "AT";
}

function formatDate(value) {
  if (!value) return "Data a confirmar";
  const normalized = String(value).slice(0, 10);
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getStoredTheme(userId) {
  if (!userId || typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(`${THEME_STORAGE_PREFIX}${userId}`) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function getLocalDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateISO(value) {
  if (!value) return "";
  const rawValue = String(value).trim();
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawValue);
  if (isoMatch) return isoMatch[1];
  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? "" : getLocalDateISO(date);
}

function getTournamentRegistrationAvailability(tournament) {
  const data = parseTournamentData(tournament?.data);
  const today = getLocalDateISO();
  const registrationDeadline = getDateISO(data.registrationDeadline);
  const eventEndDate = getDateISO(data.eventEndDate || data.eventDate || data.eventStartDate);

  if (data.deletedAt) {
    return { canRegister: false, label: "Indisponível", buttonLabel: "Torneio indisponível", reason: "Este torneio não está mais disponível." };
  }
  if (eventEndDate && eventEndDate < today) {
    return { canRegister: false, label: "Encerrado", buttonLabel: "Torneio encerrado", reason: `O torneio terminou em ${formatDate(eventEndDate)}.` };
  }
  if (registrationDeadline && registrationDeadline < today) {
    return { canRegister: false, label: "Inscrições encerradas", buttonLabel: "Inscrições encerradas", reason: `O prazo de inscrição terminou em ${formatDate(registrationDeadline)}.` };
  }
  return { canRegister: true, label: "Inscrições abertas", buttonLabel: "Inscrever-se", reason: "" };
}

function getRegistrationStatusMeta(status) {
  return REGISTRATION_STATUS_META[status] || { label: "Em análise", className: "pending" };
}

function isMissingTableError(error, tableName) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || error?.details || "").toLowerCase();
  return code === "42P01"
    || code === "PGRST205"
    || (message.includes(tableName.toLowerCase()) && (
      message.includes("does not exist")
      || message.includes("schema cache")
      || message.includes("could not find")
      || message.includes("não existe")
    ));
}

function isMissingRegistrationInfrastructure(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || error?.details || "").toLowerCase();
  return isMissingTableError(error, "tournament_registrations")
    || code === "PGRST202"
    || (message.includes("submit_tournament_registration") && (
      message.includes("schema cache")
      || message.includes("could not find")
      || message.includes("does not exist")
    ));
}

function resizeAthletePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Escolha uma imagem JPG ou PNG."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Escolha uma imagem com até 5 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível abrir essa imagem."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 360;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Não foi possível preparar a foto."));
          return;
        }
        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function Notice({ notice, onClose }) {
  if (!notice) return null;
  const Icon = notice.type === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`athleteDashNotice ${notice.type || "info"}`} role="status">
      <Icon aria-hidden="true" />
      <div><strong>{notice.title}</strong><span>{notice.message}</span></div>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">×</button>
    </div>
  );
}

function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return (
    <label className="athleteDashToggleRow">
      <span className="athleteDashToggleIcon"><Icon aria-hidden="true" /></span>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true"><b /></i>
    </label>
  );
}

export default function AthleteDashboard({ user, supabase, onLogout, logoSrc }) {
  const fallbackProfile = useMemo(() => getUserProfile(user), [user]);
  const [activeSection, setActiveSection] = useState("overview");
  const [profile, setProfile] = useState(fallbackProfile);
  const [draft, setDraft] = useState(fallbackProfile);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [registrationTarget, setRegistrationTarget] = useState(null);
  const [partnerName, setPartnerName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [notice, setNotice] = useState(null);
  const [availability, setAvailability] = useState({ athleteProfiles: true, registrations: true });
  const [theme, setTheme] = useState(() => getStoredTheme(user?.id));
  const photoInputRef = useRef(null);

  useEffect(() => {
    setTheme(getStoredTheme(user?.id));
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      if (!user?.id || !supabase) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      const baseProfile = getUserProfile(user);
      setProfile(baseProfile);
      setDraft(baseProfile);

      const [profileResult, tournamentResult, registrationResult] = await Promise.all([
        supabase.from("athlete_profiles").select(PROFILE_FIELDS).eq("user_id", user.id).maybeSingle(),
        supabase.rpc("list_public_tournaments", { p_limit: 200 }),
        supabase.from("tournament_registrations").select(REGISTRATION_FIELDS).eq("athlete_user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      if (profileResult.error) {
        if (isMissingTableError(profileResult.error, "athlete_profiles")) {
          setAvailability((current) => ({ ...current, athleteProfiles: false }));
        } else {
          setNotice({ type: "warning", title: "Perfil parcialmente carregado", message: "Usamos os dados seguros da sua conta porque o perfil detalhado não respondeu agora." });
        }
      } else if (profileResult.data) {
        const loadedProfile = {
          display_name: profileResult.data.display_name ?? "",
          photo_url: profileResult.data.photo_url ?? "",
          bio: profileResult.data.bio ?? "",
          is_public: profileResult.data.is_public === true,
          show_achievements: profileResult.data.show_achievements !== false,
        };
        setProfile(loadedProfile);
        setDraft(loadedProfile);
      }

      if (tournamentResult.error) {
        setNotice({ type: "warning", title: "Torneios indisponíveis", message: "Não foi possível carregar os torneios públicos agora. Tente novamente em alguns instantes." });
      } else {
        const publicTournaments = Array.isArray(tournamentResult.data) ? tournamentResult.data : [];
        setTournaments(publicTournaments.filter((tournament) => !parseTournamentData(tournament.data).deletedAt));
      }

      if (registrationResult.error) {
        if (isMissingTableError(registrationResult.error, "tournament_registrations")) {
          setAvailability((current) => ({ ...current, registrations: false }));
        } else {
          setNotice({ type: "warning", title: "Inscrições indisponíveis", message: "Suas inscrições não puderam ser carregadas agora." });
        }
      } else {
        setRegistrations(registrationResult.data || []);
      }

      setLoading(false);
    }

    void loadDashboard();
    return () => { active = false; };
  }, [user?.id, supabase]);

  const tournamentById = useMemo(
    () => new Map(tournaments.map((tournament) => [String(tournament.id), tournament])),
    [tournaments]
  );

  const filteredTournaments = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return tournaments;
    return tournaments.filter((tournament) => {
      const data = parseTournamentData(tournament.data);
      return [tournament.name, tournament.type, data.location, data.eventName]
        .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [search, tournaments]);

  const registrationCounts = useMemo(() => registrations.reduce((counts, item) => {
    const status = REGISTRATION_STATUS_META[item.status] ? item.status : "pending";
    counts[status] += 1;
    return counts;
  }, { pending: 0, confirmed: 0, rejected: 0, cancelled: 0 }), [registrations]);
  const profileComplete = Boolean(profile.display_name && profile.photo_url);

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === "light" ? "dark" : "light";
      try {
        if (user?.id) window.localStorage.setItem(`${THEME_STORAGE_PREFIX}${user.id}`, nextTheme);
      } catch {
        // O tema continua ativo durante a sessão mesmo sem armazenamento local.
      }
      return nextTheme;
    });
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const photoUrl = await resizeAthletePhoto(file);
      updateDraft("photo_url", photoUrl);
      setNotice({ type: "success", title: "Foto preparada", message: "Clique em Salvar perfil para confirmar a alteração." });
    } catch (error) {
      setNotice({ type: "warning", title: "Foto não alterada", message: error.message || "Escolha outra imagem." });
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!user?.id || !supabase || saving) return;
    const displayName = draft.display_name.trim();
    if (!displayName) {
      setNotice({ type: "warning", title: "Informe seu nome", message: "O nome é necessário para identificar suas inscrições e seu perfil." });
      return;
    }

    const nextProfile = {
      display_name: displayName.slice(0, 100),
      photo_url: draft.photo_url || "",
      bio: draft.bio.trim().slice(0, 240),
      is_public: draft.is_public === true,
      show_achievements: draft.show_achievements === true,
    };
    setSaving(true);
    setNotice(null);

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: nextProfile.display_name,
        name: nextProfile.display_name,
        athlete_bio: nextProfile.bio,
        athlete_profile_public: nextProfile.is_public,
        athlete_show_achievements: nextProfile.show_achievements,
        account_type: "athlete",
      },
    });

    if (authError) {
      setSaving(false);
      setNotice({ type: "error", title: "Não foi possível salvar", message: "Confira sua conexão e tente novamente." });
      return;
    }

    let profileStored = false;
    if (availability.athleteProfiles) {
      const { error: profileError } = await supabase.from("athlete_profiles").upsert({
        user_id: user.id,
        ...nextProfile,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (profileError && isMissingTableError(profileError, "athlete_profiles")) {
        setAvailability((current) => ({ ...current, athleteProfiles: false }));
      } else if (profileError) {
        setSaving(false);
        setNotice({ type: "warning", title: "Conta salva, perfil pendente", message: "Seus dados básicos foram atualizados, mas o perfil detalhado não pôde ser sincronizado agora." });
        return;
      } else {
        profileStored = true;
      }
    }

    setProfile(nextProfile);
    setDraft(nextProfile);
    setSaving(false);
    setNotice({
      type: "success",
      title: "Perfil atualizado",
      message: profileStored
        ? "Suas informações e preferências de privacidade foram salvas."
        : "Os dados da conta foram salvos. A área detalhada do perfil está sendo preparada.",
    });
  }

  function openTournament(tournament) {
    if (!tournament?.public_id) {
      setNotice({ type: "warning", title: "Página ainda indisponível", message: "O organizador ainda não publicou o link deste torneio." });
      return;
    }
    window.open(`/?public=${encodeURIComponent(tournament.public_id)}`, "_blank", "noopener,noreferrer");
  }

  function openOwnProfile() {
    if (!profile.is_public) {
      setNotice({ type: "warning", title: "Perfil privado", message: "Ative Perfil público e salve para abrir sua página pública." });
      setActiveSection("profile");
      return;
    }
    window.open(`/?atleta=${encodeURIComponent(user.id)}`, "_blank", "noopener,noreferrer");
  }

  function startRegistration(tournament) {
    if (!availability.registrations) {
      setNotice({ type: "warning", title: "Inscrições em preparação", message: "Esta função estará disponível assim que a estrutura de inscrições for ativada." });
      return;
    }
    const registrationAvailability = getTournamentRegistrationAvailability(tournament);
    if (!registrationAvailability.canRegister) {
      setNotice({ type: "warning", title: registrationAvailability.label, message: registrationAvailability.reason });
      return;
    }
    const currentRegistration = registrations.find((item) => String(item.tournament_id) === String(tournament.id));
    if (currentRegistration && ACTIVE_REGISTRATION_STATUSES.has(currentRegistration.status)) {
      setNotice({ type: "info", title: "Inscrição já enviada", message: "Este torneio já aparece em Minhas inscrições." });
      setActiveSection("registrations");
      return;
    }
    setPartnerName("");
    setRegistrationTarget(tournament);
  }

  async function confirmRegistration(event) {
    event.preventDefault();
    if (!registrationTarget || !user?.id || registering) return;
    const registrationAvailability = getTournamentRegistrationAvailability(registrationTarget);
    if (!registrationAvailability.canRegister) {
      setRegistrationTarget(null);
      setNotice({ type: "warning", title: registrationAvailability.label, message: registrationAvailability.reason });
      return;
    }
    const athleteName = profile.display_name || draft.display_name.trim();
    if (!athleteName) {
      setRegistrationTarget(null);
      setActiveSection("profile");
      setNotice({ type: "warning", title: "Complete seu perfil", message: "Salve seu nome antes de realizar uma inscrição." });
      return;
    }

    setRegistering(true);
    const now = new Date().toISOString();
    const payload = {
      tournament_id: registrationTarget.id,
      athlete_user_id: user.id,
      athlete_name: athleteName,
      partner_name: partnerName.trim() || null,
      category: registrationTarget.type || null,
      status: "pending",
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.rpc("submit_tournament_registration", {
      p_tournament_id: registrationTarget.id,
      p_athlete_name: athleteName,
      p_partner_name: partnerName.trim() || null,
      p_category: registrationTarget.type || null,
    });

    setRegistering(false);
    if (error) {
      if (isMissingRegistrationInfrastructure(error)) {
        setAvailability((current) => ({ ...current, registrations: false }));
        setRegistrationTarget(null);
        setNotice({ type: "warning", title: "Inscrições em preparação", message: "A estrutura de inscrições ainda não foi ativada. Nenhum dado foi perdido." });
      } else if (String(error.code) === "23505") {
        setRegistrationTarget(null);
        setNotice({ type: "info", title: "Inscrição já existente", message: "Você já está inscrito neste torneio." });
      } else {
        setNotice({ type: "error", title: "Inscrição não enviada", message: "Não foi possível concluir agora. Tente novamente em alguns instantes." });
      }
      return;
    }

    const returnedRegistration = Array.isArray(data) ? data[0] : data;
    const nextRegistration = returnedRegistration && typeof returnedRegistration === "object"
      ? returnedRegistration
      : { ...payload, id: `${user.id}-${registrationTarget.id}` };
    setRegistrations((current) => [
      nextRegistration,
      ...current.filter((item) => String(item.tournament_id) !== String(registrationTarget.id)),
    ]);
    setRegistrationTarget(null);
    setPartnerName("");
    setNotice({ type: "success", title: "Inscrição enviada", message: "O organizador receberá sua inscrição com status pendente." });
    setActiveSection("registrations");
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (onLogout) await onLogout();
      else await supabase?.auth?.signOut();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) {
    return (
      <div className={`athleteDashboard athleteDashboard--${theme} athleteDashboardEmpty`}>
        <section><UserRound aria-hidden="true" /><h1>Entre como atleta</h1><p>Faça login para acessar seu perfil e suas inscrições.</p></section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`athleteDashboard athleteDashboard--${theme} athleteDashboardEmpty`}>
        <section><Loader2 className="athleteDashSpinner" aria-hidden="true" /><h1>Preparando seu painel</h1><p>Carregando perfil, torneios e inscrições.</p></section>
      </div>
    );
  }

  return (
    <div className={`athleteDashboard athleteDashboard--${theme}`}>
      <header className="athleteDashHeader">
        <button type="button" className="athleteDashBrand" onClick={() => window.location.assign("/")} aria-label="Ir para o início">
          {logoSrc ? <img src={logoSrc} alt="Torneio360" /> : <><span><Trophy aria-hidden="true" /></span><strong>TORNEIO<span>360</span></strong></>}
        </button>
        <div className="athleteDashHeaderUser">
          <button
            type="button"
            className="athleteDashThemeToggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <button type="button" className="athleteDashPublicButton" onClick={openOwnProfile}><ExternalLink aria-hidden="true" /> Meu perfil público</button>
          <div className="athleteDashMiniAvatar">{draft.photo_url ? <img src={draft.photo_url} alt="" /> : getInitials(draft.display_name)}</div>
          <div><strong>{draft.display_name || "Atleta"}</strong><span>ATLETA</span></div>
          <button type="button" className="athleteDashLogout" onClick={handleLogout} disabled={loggingOut} aria-label="Sair da conta"><LogOut aria-hidden="true" /></button>
        </div>
      </header>

      <aside className="athleteDashSidebar">
        <nav aria-label="Painel do atleta">
          <button type="button" className={activeSection === "overview" ? "active" : ""} onClick={() => setActiveSection("overview")}><LayoutDashboard aria-hidden="true" /> Visão geral</button>
          <button type="button" className={activeSection === "profile" ? "active" : ""} onClick={() => setActiveSection("profile")}><UserRound aria-hidden="true" /> Meu perfil</button>
          <button type="button" className={activeSection === "tournaments" ? "active" : ""} onClick={() => setActiveSection("tournaments")}><Trophy aria-hidden="true" /> Torneios</button>
          <button type="button" className={activeSection === "registrations" ? "active" : ""} onClick={() => setActiveSection("registrations")}><ClipboardList aria-hidden="true" /> Minhas inscrições</button>
        </nav>
        <div className="athleteDashPrivacySeal"><ShieldCheck aria-hidden="true" /><span><strong>Área do atleta</strong><small>Você edita somente os seus próprios dados.</small></span></div>
      </aside>

      <main className="athleteDashMain">
        <Notice notice={notice} onClose={() => setNotice(null)} />

        {!availability.athleteProfiles || !availability.registrations ? (
          <div className="athleteDashSetupBanner">
            <Clock3 aria-hidden="true" />
            <div><strong>Alguns recursos estão sendo preparados</strong><span>{!availability.athleteProfiles && !availability.registrations ? "Perfil detalhado e inscrições" : !availability.athleteProfiles ? "Perfil detalhado" : "Inscrições"} ficarão disponíveis após a atualização do banco. Você pode continuar usando as demais áreas.</span></div>
          </div>
        ) : null}

        {activeSection === "overview" ? (
          <>
            <section className="athleteDashWelcome">
              <div><span>PAINEL DO ATLETA</span><h1>Olá, {profile.display_name.trim().split(" ")[0] || "Atleta"}</h1><p>Cuide do seu perfil esportivo, encontre torneios públicos e acompanhe suas inscrições.</p></div>
              <button type="button" onClick={() => setActiveSection("tournaments")}><Trophy aria-hidden="true" /> Encontrar torneios</button>
            </section>
            <section className="athleteDashStats" aria-label="Resumo da conta">
              <article><UserRound aria-hidden="true" /><span>Perfil</span><strong>{profileComplete ? "Completo" : "Em construção"}</strong><small>{profile.is_public ? "Público" : "Privado"}</small></article>
              <article><ClipboardList aria-hidden="true" /><span>Inscrições</span><strong>{registrations.length}</strong><small>Total enviado</small></article>
              <article><CheckCircle2 aria-hidden="true" /><span>Confirmadas</span><strong>{registrationCounts.confirmed}</strong><small>{registrationCounts.pending} pend. · {registrationCounts.rejected} recus. · {registrationCounts.cancelled} canc.</small></article>
              <article><Trophy aria-hidden="true" /><span>Torneios públicos</span><strong>{tournaments.length}</strong><small>Disponíveis agora</small></article>
            </section>
            <section className="athleteDashPanel athleteDashRecent">
              <div className="athleteDashSectionTitle"><div><span>PRÓXIMAS OPORTUNIDADES</span><h2>Torneios em destaque</h2></div><button type="button" onClick={() => setActiveSection("tournaments")}>Ver todos <ChevronRight aria-hidden="true" /></button></div>
              <div className="athleteDashTournamentGrid compact">
                {tournaments.slice(0, 3).map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} registration={registrations.find((item) => String(item.tournament_id) === String(tournament.id))} onOpen={openTournament} onRegister={startRegistration} />)}
                {!tournaments.length ? <EmptyState icon={Trophy} title="Nenhum torneio público agora" text="Novos campeonatos aparecerão aqui quando forem publicados." /> : null}
              </div>
            </section>
          </>
        ) : null}

        {activeSection === "profile" ? (
          <form className="athleteDashProfile" onSubmit={saveProfile}>
            <div className="athleteDashPageTitle"><div><span>MEU PERFIL</span><h1>Seu cartão esportivo</h1><p>Estas são as únicas informações pessoais que você pode editar.</p></div><button type="submit" disabled={saving}><Save aria-hidden="true" /> {saving ? "Salvando..." : "Salvar perfil"}</button></div>
            <section className="athleteDashPanel athleteDashProfileHero">
              <div className="athleteDashPhotoEditor">
                <div className="athleteDashProfilePhoto">{draft.photo_url ? <img src={draft.photo_url} alt={`Foto de ${draft.display_name}`} /> : getInitials(draft.display_name)}</div>
                <input ref={photoInputRef} type="file" accept="image/png,image/jpeg" onChange={handlePhoto} />
                <button type="button" onClick={() => photoInputRef.current?.click()}><Camera aria-hidden="true" /> Trocar foto</button>
                {draft.photo_url ? <button type="button" className="subtle" onClick={() => updateDraft("photo_url", "")}>Remover</button> : null}
              </div>
              <div className="athleteDashProfileFields">
                <label><span>Nome do atleta</span><input value={draft.display_name} maxLength={100} onChange={(event) => updateDraft("display_name", event.target.value)} placeholder="Seu nome" /></label>
                <label><span>Bio <small>opcional</small></span><textarea value={draft.bio} maxLength={240} onChange={(event) => updateDraft("bio", event.target.value)} placeholder="Uma frase curta que resume você como atleta." /><b>{draft.bio.length}/240</b></label>
              </div>
            </section>
            <section className="athleteDashPanel athleteDashPrivacyPanel">
              <div className="athleteDashSectionTitle"><div><span>PRIVACIDADE</span><h2>O que outras pessoas podem ver</h2></div><ShieldCheck aria-hidden="true" /></div>
              <Toggle checked={draft.is_public} onChange={(value) => updateDraft("is_public", value)} label="Perfil público" description="Permite que pessoas abram sua foto, nome e bio a partir dos torneios." icon={draft.is_public ? Eye : EyeOff} />
              <Toggle checked={draft.show_achievements} onChange={(value) => updateDraft("show_achievements", value)} label="Conquistas públicas" description="Exibe apenas pódios e resultados validados oficialmente por organizadores." icon={Medal} />
            </section>
          </form>
        ) : null}

        {activeSection === "tournaments" ? (
          <section className="athleteDashTournaments">
            <div className="athleteDashPageTitle"><div><span>TORNEIOS PÚBLICOS</span><h1>Encontre seu próximo desafio</h1><p>Veja os eventos publicados e envie sua inscrição como atleta.</p></div></div>
            <label className="athleteDashSearch"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por torneio, modalidade ou local..." /></label>
            <div className="athleteDashTournamentGrid">
              {filteredTournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} registration={registrations.find((item) => String(item.tournament_id) === String(tournament.id))} onOpen={openTournament} onRegister={startRegistration} />)}
              {!filteredTournaments.length ? <EmptyState icon={Search} title="Nenhum torneio encontrado" text="Tente buscar por outro nome, modalidade ou local." /> : null}
            </div>
          </section>
        ) : null}

        {activeSection === "registrations" ? (
          <section className="athleteDashRegistrations">
            <div className="athleteDashPageTitle"><div><span>MINHAS INSCRIÇÕES</span><h1>Acompanhe seus pedidos</h1><p>O status é definido pelo organizador de cada torneio.</p></div><button type="button" onClick={() => setActiveSection("tournaments")}><Trophy aria-hidden="true" /> Nova inscrição</button></div>
            <div className="athleteDashRegistrationList">
              {registrations.map((registration) => {
                const tournament = tournamentById.get(String(registration.tournament_id));
                const statusMeta = getRegistrationStatusMeta(registration.status);
                return (
                  <article key={registration.id}>
                    <div className="athleteDashRegistrationIcon"><ClipboardList aria-hidden="true" /></div>
                    <div><strong>{tournament?.name || "Torneio"}</strong><span>{registration.athlete_name}{registration.partner_name ? ` • Dupla com ${registration.partner_name}` : ""}</span><small>{registration.category || tournament?.type || "Beach Tennis"} • Enviada em {formatDate(registration.created_at)}</small></div>
                    <span className={`athleteDashStatus ${statusMeta.className}`}>{statusMeta.label}</span>
                    {tournament?.public_id ? <button type="button" onClick={() => openTournament(tournament)}>Abrir <ExternalLink aria-hidden="true" /></button> : null}
                  </article>
                );
              })}
              {!registrations.length ? <EmptyState icon={ClipboardList} title="Você ainda não se inscreveu" text="Abra a área Torneios para encontrar um campeonato público." /> : null}
            </div>
          </section>
        ) : null}
      </main>

      {registrationTarget ? (
        <div className="athleteDashModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !registering) setRegistrationTarget(null); }}>
          <form className="athleteDashModal" onSubmit={confirmRegistration} role="dialog" aria-modal="true" aria-labelledby="athlete-registration-title">
            <div className="athleteDashModalIcon"><Users aria-hidden="true" /></div>
            <span>INSCRIÇÃO NO TORNEIO</span>
            <h2 id="athlete-registration-title">{registrationTarget.name}</h2>
            <p>Você será inscrito como <strong>{profile.display_name}</strong>. O organizador confirmará o pedido.</p>
            <label><span>Nome do parceiro <small>opcional</small></span><input value={partnerName} maxLength={100} onChange={(event) => setPartnerName(event.target.value)} placeholder="Preencha se já tiver uma dupla" autoFocus /></label>
            <div><button type="button" className="secondary" onClick={() => setRegistrationTarget(null)} disabled={registering}>Cancelar</button><button type="submit" disabled={registering}>{registering ? <Loader2 className="athleteDashSpinner" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />} {registering ? "Enviando..." : "Enviar inscrição"}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function TournamentCard({ tournament, registration, onOpen, onRegister }) {
  const data = parseTournamentData(tournament.data);
  const date = data.eventDate || data.date || tournament.created_at;
  const location = data.location || data.publicInfo?.organizer?.arenaName || "Local a confirmar";
  const registrationAvailability = getTournamentRegistrationAvailability(tournament);
  const registrationMeta = registration ? getRegistrationStatusMeta(registration.status) : null;
  const registrationIsActive = Boolean(registration && ACTIVE_REGISTRATION_STATUSES.has(registration.status));
  const canRegister = registrationAvailability.canRegister && !registrationIsActive;
  const canResend = registration?.status === "rejected" || registration?.status === "cancelled";
  const badge = registrationMeta || (registrationAvailability.canRegister
    ? { label: registrationAvailability.label, className: "open" }
    : { label: registrationAvailability.label, className: "closed" });
  const buttonLabel = registrationIsActive
    ? registration.status === "confirmed" ? "Inscrição confirmada" : "Aguardando confirmação"
    : !registrationAvailability.canRegister
      ? registrationAvailability.buttonLabel
      : canResend ? "Reenviar inscrição" : registrationAvailability.buttonLabel;
  return (
    <article className="athleteDashTournamentCard">
      <header><span>{tournament.type || "Beach Tennis"}</span><b className={badge.className}>{registrationIsActive ? <CheckCircle2 aria-hidden="true" /> : null}{badge.label}</b></header>
      <h3>{data.eventName || tournament.name}</h3>
      <div><span><CalendarDays aria-hidden="true" /> {formatDate(date)}</span><span><MapPin aria-hidden="true" /> {location}</span></div>
      {!registrationAvailability.canRegister ? <p className="athleteDashTournamentClosed"><Clock3 aria-hidden="true" /> {registrationAvailability.reason}</p> : null}
      <footer><button type="button" className="secondary" onClick={() => onOpen(tournament)}>Ver torneio <ExternalLink aria-hidden="true" /></button><button type="button" onClick={() => onRegister(tournament)} disabled={!canRegister}>{buttonLabel}</button></footer>
    </article>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="athleteDashEmptyState"><Icon aria-hidden="true" /><strong>{title}</strong><span>{text}</span></div>;
}
