import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  AtSign,
  Camera,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
  Edit2,
  Filter,
  Flame,
  Gift,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  LockKeyhole,
  LockOpen,
  LogOut,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MoreVertical,
  Moon,
  PlusCircle,
  Search,
  Settings,
  Share2,
  Sun,
  Tag,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import InstallAppBanner from "./InstallAppBanner.jsx";
import AthleteDashboard from "./AthleteDashboard.jsx";
import "./style.css";
import "./figma-complete.css";

const SUPABASE_URL = "https://dttutybojealkvuywszt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Tr5qiUea-p42UknVoWwPKg_6K_b1EX_";
const IS_ATHLETE_LINK_ROUTE = new URLSearchParams(window.location.search).has("vincular-atleta");
const PLATFORM_SUPPORT = Object.freeze([
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: "85 9.8873-9056",
    href: "https://wa.me/5585988739056?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20o%20Torneio360.",
    Icon: MessageCircle,
    external: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    value: "@torneio360",
    href: "https://www.instagram.com/torneio360/",
    Icon: AtSign,
    external: true,
  },
  {
    id: "email",
    label: "E-mail",
    value: "torneio360@gmail.com",
    href: "mailto:torneio360@gmail.com",
    Icon: Mail,
    external: false,
  },
]);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // O fluxo de vínculo usa uma sessão isolada para não desconectar o
    // organizador que abriu a nova aba.
    detectSessionInUrl: !IS_ATHLETE_LINK_ROUTE,
  },
});
const athleteLinkSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: "torneio360-athlete-link-auth",
  },
});
const ATHLETE_LINK_RESULT_PREFIX = "torneio360:athlete-link-result:";
const ATHLETE_PROFILE_DRAFT_PREFIX = "torneio360:athlete-profile:";
const ACCOUNT_TYPE_ORGANIZER = "organizer";
const ACCOUNT_TYPE_ORGANIZER_PENDING = "organizer_pending";
const ACCOUNT_TYPE_ATHLETE = "athlete";
const TORNEIO360_LOGO = "/torneio360-logo.png";
const TORNEIO360_LOGO_BLUE = "/torneio360-logo-blue.png";
const TORNEIO360_TAGLINE = "Gestão inteligente de torneios";

function getUserAccountType(user) {
  const trustedRole = user?.app_metadata?.role;
  if (trustedRole === ACCOUNT_TYPE_ATHLETE) return ACCOUNT_TYPE_ATHLETE;
  if (trustedRole === ACCOUNT_TYPE_ORGANIZER || trustedRole === ACCOUNT_TYPE_ORGANIZER_PENDING) {
    return ACCOUNT_TYPE_ORGANIZER;
  }

  // Sem um papel emitido pelo servidor, a interface nunca promove a conta
  // para organizador. O metadata editável pelo usuário só pode restringir o
  // acesso durante a migração de contas antigas.
  if (user?.user_metadata?.account_type === ACCOUNT_TYPE_ATHLETE) return ACCOUNT_TYPE_ATHLETE;
  return null;
}

async function logout() {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (e) {
    console.error(e);
  }

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-") || key.includes("auth")) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();
  } catch (e) {
    console.error(e);
  }

  window.location.replace("/");
}

const rankingCriteriaOptions = [
  {
    value: "wins_points_balance",
    label: "Vitórias > Pontos > Saldo de games",
    order: ["w", "pts", "bal"],
  },
  {
    value: "wins_balance_points",
    label: "Vitórias > Saldo de games > Pontos",
    order: ["w", "bal", "pts"],
  },
  {
    value: "points_wins_balance",
    label: "Pontos > Vitórias > Saldo de games",
    order: ["pts", "w", "bal"],
  },
  {
    value: "points_balance_wins",
    label: "Pontos > Saldo de games > Vitórias",
    order: ["pts", "bal", "w"],
  },
  {
    value: "balance_wins_points",
    label: "Saldo de games > Vitórias > Pontos",
    order: ["bal", "w", "pts"],
  },
  {
    value: "balance_points_wins",
    label: "Saldo de games > Pontos > Vitórias",
    order: ["bal", "pts", "w"],
  },
];

const defaultRankingCriteria = "wins_points_balance";

function generatePublicId() {
  return `tfbt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPublicUrl(publicId) {
  return `${window.location.origin}${window.location.pathname}?public=${publicId}`;
}

function getPublicShareMessage(publicId) {
  const url = getPublicUrl(publicId);
  return `${TORNEIO360_TAGLINE}:
${url}`;
}

function readPublicViewStorage(key, fallbackValue) {
  try {
    return sessionStorage.getItem(key) || fallbackValue;
  } catch (error) {
    // Links públicos também precisam funcionar quando o navegador bloqueia
    // o armazenamento da sessão, como em algumas visualizações dentro de apps.
    return fallbackValue;
  }
}

function savePublicViewStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    // A aba continua navegável mesmo sem persistir a última subaba aberta.
  }
}

const USER_APP_STATE_STORAGE_PREFIX = "torneio360:user-app-state:v2:";

function getUserAppStateStorageKey(userId) {
  return `${USER_APP_STATE_STORAGE_PREFIX}${userId}`;
}

function getAppStateTimestamp(state) {
  const time = Date.parse(state?.updated_at || "");
  return Number.isFinite(time) ? time : 0;
}

function readLocalUserAppState(userId) {
  if (!userId) return null;

  const key = getUserAppStateStorageKey(userId);
  const states = [];

  try {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) states.push(JSON.parse(sessionValue));
  } catch (error) {
    console.warn("Não foi possível ler a posição salva nesta aba", error);
  }

  try {
    const localValue = localStorage.getItem(key);
    if (localValue) states.push(JSON.parse(localValue));
  } catch (error) {
    console.warn("Não foi possível ler a posição salva neste dispositivo", error);
  }

  return states
    .filter((state) => state && typeof state === "object")
    .sort((first, second) => getAppStateTimestamp(second) - getAppStateTimestamp(first))[0] || null;
}

function saveLocalUserAppState(userId, state) {
  if (!userId || !state) return;

  const serialized = JSON.stringify(state);
  const key = getUserAppStateStorageKey(userId);

  try {
    // sessionStorage recupera a posição imediatamente ao voltar para esta aba.
    sessionStorage.setItem(key, serialized);
  } catch (error) {
    console.warn("Não foi possível salvar a posição nesta aba", error);
  }

  try {
    // localStorage é o backup caso o navegador descarregue a aba antes do upsert.
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.warn("Não foi possível salvar a posição neste dispositivo", error);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error(e);

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}

function getRankingCriteria(value) {
  return rankingCriteriaOptions.find((item) => item.value === value) || rankingCriteriaOptions[0];
}

function getRankingColumnLabel(key) {
  return { w: "Vitórias", pts: "Pontos", bal: "Saldo de games" }[key] || key;
}

function formatDateBR(value) {
  if (!value) return "";

  const [year, month, day] = String(value).split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function formatStatusBR(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "active") return "ATIVO";
  if (normalized === "inactive") return "INATIVO";
  if (normalized === "blocked") return "BLOQUEADO";
  if (normalized === "pending") return "PENDENTE";
  if (normalized === "expired") return "VENCIDO";
  return String(value || "").toUpperCase();
}

const TRIAL_DAYS = 7;
const MILLISECONDS_PER_DAY = 86_400_000;
const AUTH_FLOW_QUERY_KEY = "auth";

function getBrazilTodayISO(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch (error) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

function getBrazilDateISO(value) {
  if (!value) return "";

  const rawValue = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return rawValue;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return "";

  return getBrazilTodayISO(date);
}

function isoDateToUtcDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcTime = Date.UTC(year, month - 1, day);
  const parsed = new Date(utcTime);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(utcTime / MILLISECONDS_PER_DAY);
}

function getCalendarDayDifference(startValue, endValue) {
  const startDay = isoDateToUtcDay(getBrazilDateISO(startValue));
  const endDay = isoDateToUtcDay(getBrazilDateISO(endValue));

  if (startDay === null || endDay === null) return null;
  return endDay - startDay;
}

function getTournamentUiStatus(tournament, today = getBrazilTodayISO()) {
  if (String(tournament?.status || "").toLowerCase() === "draft") return "Rascunho";

  const details = tournament?.data || {};
  const startDate = getBrazilDateISO(details.eventDate || details.eventStartDate);
  const endDate = getBrazilDateISO(details.eventEndDate || details.eventDate || details.eventStartDate);
  const registrationDeadline = getBrazilDateISO(details.registrationDeadline);

  if (endDate && endDate < today) return "Encerrado";
  if (startDate && startDate <= today && (!endDate || endDate >= today)) return "Em andamento";
  if (registrationDeadline && registrationDeadline >= today) return "Inscrições abertas";
  return "Programado";
}

function getFreeTrialDetails(profile, user) {
  if (String(profile?.status || "").toLowerCase() !== "active") return null;

  const trialEndValue = profile?.trial_ends_at || profile?.trial_end_at;
  const accessEndValue = trialEndValue || profile?.expires_at;
  const accessEndDate = getBrazilDateISO(accessEndValue);
  if (!accessEndDate) return null;

  const accessType = String(
    profile?.access_type || profile?.access_kind || profile?.subscription_status || ""
  ).toLowerCase();
  const hasExplicitTrial =
    profile?.is_trial === true ||
    Boolean(trialEndValue) ||
    ["trial", "free_trial", "free-trial", "gratuito", "teste"].includes(accessType);
  const hasExplicitPaidAccess =
    profile?.is_trial === false ||
    ["paid", "active_paid", "subscribed", "assinante", "pago"].includes(accessType);

  const trialStartValue =
    profile?.trial_started_at ||
    profile?.trial_start_at ||
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    profile?.created_at ||
    user?.created_at;
  const inferredTrialLength = getCalendarDayDifference(trialStartValue, accessEndDate);
  const isInitialPremiumTrial =
    !hasExplicitPaidAccess &&
    String(profile?.plan || "").toLowerCase() === "premium" &&
    inferredTrialLength !== null &&
    inferredTrialLength >= 0 &&
    inferredTrialLength <= TRIAL_DAYS;

  if (!hasExplicitTrial && !isInitialPremiumTrial) return null;

  const remainingDifference = getCalendarDayDifference(getBrazilTodayISO(), accessEndDate);
  if (remainingDifference === null || remainingDifference < 0) return null;

  return {
    daysRemaining: remainingDifference + 1,
    expiresAt: accessEndDate,
  };
}

function getAuthRedirectUrl(flow) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(AUTH_FLOW_QUERY_KEY, flow);
  return url.toString();
}

function getAuthFlowFromLocation() {
  const url = new URL(window.location.href);
  const queryFlow = url.searchParams.get(AUTH_FLOW_QUERY_KEY);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashType = hashParams.get("type");

  if (queryFlow === "recovery" || hashType === "recovery") return "recovery";
  if (queryFlow === "confirm" || hashType === "signup" || hashType === "email") return "confirm";
  return null;
}

function getAuthCallbackError() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const rawMessage = hashParams.get("error_description") || url.searchParams.get("error_description") || "";

  if (!rawMessage) return null;

  if (/expired|invalid|otp/i.test(rawMessage)) {
    return "Este link expirou ou já foi usado. Solicite um novo link para continuar.";
  }

  return "Não foi possível concluir este link de acesso. Solicite um novo link e tente novamente.";
}

function clearAuthCallbackUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete(AUTH_FLOW_QUERY_KEY);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isEmailNotConfirmedError(error) {
  return /email[^\n]*not[^\n]*confirm|not[^\n]*confirm[^\n]*email|email_not_confirmed/i.test(`${error?.message || ""} ${error?.code || ""}`);
}

function getAuthErrorMessage(error, fallback) {
  const message = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();

  if (/rate limit|too many requests|over_email_send_rate_limit/.test(message)) {
    return "Aguarde alguns minutos antes de pedir outro e-mail.";
  }

  if (/redirect|redirect_to|not allowed/.test(message)) {
    return "O retorno por e-mail ainda não está autorizado no Supabase. Confira as URLs permitidas.";
  }

  if (/not authorized|not allowed to send|email address not authorized/.test(message)) {
    return "O serviço de e-mail ainda não está configurado para este endereço. Configure o SMTP do Supabase.";
  }

  return fallback;
}

async function resendEmailConfirmation(email) {
  return supabase.auth.resend({
    type: "signup",
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: getAuthRedirectUrl("confirm"),
    },
  });
}

function isProfilePendingEmailConfirmation(profile) {
  return profile?.status === "pending" && !profile?.expires_at;
}

function getWeekdayBR(value) {
  if (!value) return "";

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);

  return [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ][date.getDay()];
}

function getMaxScore(winningScore = 4) {
  return Number(winningScore) === 6 ? 7 : 4;
}

function normalizeScoreInput(value, winningScore = 4) {
  if (value === "") return "";

  const number = Number(value);
  const maxScore = getMaxScore(winningScore);

  if (Number.isNaN(number)) return "";
  if (number < 0) return "0";
  if (number > maxScore) return String(maxScore);

  return String(Math.floor(number));
}

const allowedByPlan = {
  basic: [
    "Super 8",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
  ],
  pro: [
    "Super 8",
    "Super 8 (Dupla Fixa)",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Fixa)",
  ],
  premium: [
    "Super 8",
    "Super 8 (Dupla Fixa)",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Fixa)",
    "Simples 8",
    "Copa - 12 ou 24 duplas",
    "Copa - 18 duplas",
    "Copa - 21 duplas",
    "Copinha - grupos de 3",
  ],
};

const DEFAULT_SPORT_ID = "beach-tennis";
const SPORT_CATALOG = Object.freeze([
  {
    id: DEFAULT_SPORT_ID,
    name: "Beach Tennis",
    icon: "🎾",
    enabled: true,
    description: "Modalidade ativa para criação, organização e acompanhamento completo de torneios.",
  },
  {
    id: "futevolei",
    name: "Futevôlei",
    icon: "⚽",
    enabled: false,
    description: "Disponível em uma próxima etapa da plataforma.",
  },
  {
    id: "volei-de-praia",
    name: "Vôlei de Praia",
    icon: "🏐",
    enabled: false,
    description: "Disponível em uma próxima etapa da plataforma.",
  },
  {
    id: "padel",
    name: "Padel",
    icon: "🏸",
    enabled: false,
    description: "Planejada para uma futura expansão da plataforma.",
  },
  {
    id: "tenis",
    name: "Tênis",
    icon: "🎾",
    enabled: false,
    description: "Planejada para uma futura expansão da plataforma.",
  },
  {
    id: "pickleball",
    name: "Pickleball",
    icon: "◉",
    enabled: false,
    description: "Planejada para uma futura expansão da plataforma.",
  },
]);

function getSportDefinition(sportId) {
  return SPORT_CATALOG.find((sport) => sport.id === sportId) || SPORT_CATALOG[0];
}

const LEGACY_MODALITY_NAMES = Object.freeze({
  "Super 08": "Super 8",
  "Super 16 Mista (Dupla Fixa)": "Super 8 (Dupla Fixa)",
});

function normalizeModalityName(type) {
  return LEGACY_MODALITY_NAMES[type] || type;
}

const modalityConfig = {
  "Super 8": {
    type: "super8",
    total: 8,
    label: "Participante",
    courts: 2,
  },

  "Super 8 (Dupla Fixa)": {
    type: "fixed16",
    teams: 8,
    courts: 4,
  },

  "Super 10 Mista (Dupla Aleatória)": {
    type: "mixed10",
    men: 5,
    women: 5,
    courts: 2,
  },

  "Super 12 Mista (Dupla Aleatória)": {
    type: "mixed12",
    men: 6,
    women: 6,
    courts: 3,
  },

  "Super 16 Mista (Dupla Aleatória)": {
    type: "mixed16",
    men: 8,
    women: 8,
    courts: 4,
  },

  "Super 12 Mista (Dupla Fixa)": {
    type: "fixed12",
    teams: 6,
    courts: 3,
  },

  "Simples 8": {
    type: "simple8",
    total: 8,
    label: "Jogador",
    courts: 4,
  },

  "Copa - 12 ou 24 duplas": {
    type: "cup",
    cupMode: "standard",
    allowedTeamCounts: [12, 24],
    defaultTeams: 12,
    groupSize: 3,
    defaultMainBracketName: "Principal",
    defaultRepechageName: "Repescagem",
    courts: 4,
  },

  "Copa - 18 duplas": {
    type: "cup18",
    cupMode: "cup18",
    allowedTeamCounts: [18],
    defaultTeams: 18,
    groupSize: 3,
    defaultMainBracketName: "Principal",
    defaultRepechageName: "Disputa Paralela",
    courts: 6,
  },

  "Copa - 21 duplas": {
    type: "cup21",
    cupMode: "cup21",
    allowedTeamCounts: [21],
    defaultTeams: 21,
    groupSize: 3,
    defaultMainBracketName: "Chave Principal",
    defaultRepechageName: "Disputa Paralela",
    courts: 7,
  },

  "Copinha - grupos de 3": {
    type: "copinha",
    cupMode: "copinha",
    allowedTeamCounts: [6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    defaultTeams: 6,
    groupSize: 3,
    defaultMainBracketName: "Chave Principal",
    defaultRepechageName: "Consolação",
    courts: 4,
  },
};

function getModalityConfig(type) {
  return modalityConfig[normalizeModalityName(type)];
}

function getWinningScore(data) {
  return Number(data?.winningScore || 4);
}

function getScoreWinnerSide(game, winningScore = 4) {
  const s1 = Number(game.s1);
  const s2 = Number(game.s2);
  const target = Number(winningScore || 4);

  if (game.s1 === "" || game.s2 === "") return null;
  if (Number.isNaN(s1) || Number.isNaN(s2)) return null;
  if (s1 === s2) return null;

  if (target === 6) {
    if (s1 >= 6 && s1 > s2) return "team1";
    if (s2 >= 6 && s2 > s1) return "team2";
    return null;
  }

  if (s1 >= target && s1 > s2) return "team1";
  if (s2 >= target && s2 > s1) return "team2";

  return null;
}

function isGameFinished(game, winningScore = 4) {
  return getScoreWinnerSide(game, winningScore) !== null;
}

function isCupType(config) {
  return config?.type === "cup" || config?.type === "cup18" || config?.type === "cup21" || config?.type === "copinha";
}

function getCupGroupCount(config, teamCount) {
  const groupSize = Math.max(1, Number(config?.groupSize) || 3);
  return Math.max(0, Math.floor((Number(teamCount) || 0) / groupSize));
}

function formatCupGroupOption(config, teamCount) {
  const groupCount = getCupGroupCount(config, teamCount);
  const groupLabel = groupCount === 1 ? "grupo" : "grupos";
  const teamLabel = Number(teamCount) === 1 ? "dupla" : "duplas";
  return `${groupCount} ${groupLabel} · ${teamCount} ${teamLabel}`;
}

const super8Template = [
  [[[1, 2], [3, 4]], [[5, 6], [7, 8]]],
  [[[1, 3], [6, 8]], [[2, 4], [5, 7]]],
  [[[1, 4], [5, 8]], [[2, 3], [6, 7]]],
  [[[1, 5], [2, 6]], [[3, 7], [4, 8]]],
  [[[1, 6], [4, 7]], [[2, 5], [3, 8]]],
  [[[1, 7], [3, 5]], [[2, 8], [4, 6]]],
  [[[1, 8], [2, 7]], [[3, 6], [4, 5]]],
];

const super10MixedTemplate = [
  // 5 homens (1-5) + 5 mulheres (6-10)
  // Regra: cada atleta joga 4 partidas, descansa 1 rodada
  // e cada homem joga com cada mulher no máximo uma única vez.
  [[1, 7, 2, 8], [3, 9, 4, 10]], // descansam: Homem 5 e Mulher 1
  [[1, 6, 2, 9], [3, 8, 5, 10]], // descansam: Homem 4 e Mulher 2
  [[1, 9, 3, 10], [4, 6, 5, 7]], // descansam: Homem 2 e Mulher 3
  [[1, 8, 2, 10], [4, 7, 5, 6]], // descansam: Homem 3 e Mulher 4
  [[2, 6, 3, 7], [4, 8, 5, 9]], // descansam: Homem 1 e Mulher 5
];

const super12MixedTemplate = [
  [[1, 7, 4, 12], [2, 8, 6, 11], [3, 9, 5, 10]],
  [[1, 8, 2, 7], [3, 10, 4, 9], [5, 12, 6, 11]],
  [[1, 9, 6, 10], [2, 11, 5, 7], [3, 8, 4, 12]],
  [[1, 10, 3, 12], [2, 9, 4, 11], [5, 7, 6, 8]],
  [[1, 11, 5, 8], [2, 10, 6, 7], [3, 12, 4, 9]],
  [[1, 12, 4, 8], [2, 7, 3, 11], [5, 9, 6, 10]],
];

const super16MixedTemplate = [
  [[1, 9, 6, 16], [2, 10, 8, 15], [3, 11, 7, 14], [4, 12, 5, 13]],
  [[1, 10, 2, 9], [3, 12, 4, 11], [5, 14, 7, 13], [8, 16, 6, 15]],
  [[1, 12, 8, 14], [2, 11, 6, 13], [3, 10, 5, 16], [4, 9, 7, 15]],
  [[1, 13, 4, 16], [2, 14, 3, 15], [5, 9, 6, 12], [7, 10, 8, 11]],
  [[1, 14, 5, 10], [2, 13, 7, 9], [3, 16, 8, 12], [4, 15, 6, 11]],
  [[1, 15, 3, 13], [2, 16, 4, 14], [5, 11, 8, 9], [7, 12, 6, 10]],
  [[1, 16, 7, 11], [2, 15, 5, 12], [3, 14, 6, 9], [4, 13, 8, 10]],
  [[1, 11, 2, 12], [3, 9, 4, 10], [5, 15, 7, 16], [8, 13, 6, 14]],
];

const fixed12Template = [
  [[1, 6], [2, 5], [3, 4]],
  [[1, 5], [6, 4], [2, 3]],
  [[1, 4], [5, 3], [6, 2]],
  [[1, 3], [4, 2], [5, 6]],
  [[1, 2], [3, 6], [4, 5]],
];

function berger(n) {
  let arr = Array.from({ length: n }, (_, i) => i);
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const games = [];

    for (let i = 0; i < n / 2; i++) {
      games.push([arr[i], arr[n - 1 - i]]);
    }

    rounds.push(games);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }

  return rounds;
}

function shuffleArray(list) {
  const arr = [...list];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function optimizeCourts(schedule) {
  if (!schedule || schedule.length === 0) return schedule;

  const usage = {};

  function players(game) {
    return [...(game.ids1 || []), ...(game.ids2 || [])];
  }

  function get(id, court) {
    return usage[id]?.[court] || 0;
  }

  function add(id, court) {
    if (!usage[id]) usage[id] = {};
    usage[id][court] = (usage[id][court] || 0) + 1;
  }

  function score(game, court, courts) {
    let total = 0;

    players(game).forEach((id) => {
      const same = get(id, court);
      total += same * 10000;
      total += same * same * 3000;

      const hasUnused = courts.some((c) => get(id, c) === 0);
      if (hasUnused && same > 0) total += 5000;

      const values = courts.map((c) => get(id, c));
      total += (Math.max(...values) - Math.min(...values)) * 500;
    });

    return total;
  }

  return schedule.map((round, roundIndex) => {
    const courts = round.map((_, i) => i + 1);
    const remaining = round.map((game, i) => ({
      ...game,
      preferredCourt: ((i + roundIndex) % courts.length) + 1,
    }));

    const balanced = [];

    courts.forEach((court) => {
      let bestIndex = 0;
      let bestScore = Infinity;

      remaining.forEach((game, i) => {
        let s = score(game, court, courts);
        if (game.preferredCourt !== court) s += 100;

        if (s < bestScore) {
          bestScore = s;
          bestIndex = i;
        }
      });

      const selected = remaining.splice(bestIndex, 1)[0];
      const game = { ...selected, court };
      delete game.preferredCourt;

      players(game).forEach((id) => add(id, court));
      balanced.push(game);
    });

    return balanced.sort((a, b) => a.court - b.court);
  });
}

function getTeamName(team) {
  if (!team) return "";
  return `${team.a || ""} + ${team.b || ""}`.trim();
}

function getCupTeams(data) {
  return data?.players?.teams || [];
}

function getCupTeamName(data, id) {
  const team = getCupTeams(data)[id];
  return getTeamName(team);
}

function getGroupLetter(index) {
  return String.fromCharCode(65 + index);
}

function createCupGroups(teamCount) {
  const groups = [];

  for (let i = 0; i < teamCount / 3; i++) {
    groups.push({
      id: i,
      name: `Grupo ${getGroupLetter(i)}`,
      teamIds: [i * 3, i * 3 + 1, i * 3 + 2],
    });
  }

  return groups;
}

function generateCupGroupSchedule(players, cupConfig, configuredCourts = 4) {
  const teamCount = cupConfig.teamCount || 12;
  const groups = createCupGroups(teamCount);
  const teamNames = players.teams.map((t) => getTeamName(t));
  const courtCount = Math.max(1, Math.floor(Number(configuredCourts) || 1));

  const roundTemplates = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];

  const rounds = [[], [], []];

  groups.forEach((group, groupIndex) => {
    roundTemplates.forEach(([aIndex, bIndex], roundIndex) => {
      const id1 = group.teamIds[aIndex];
      const id2 = group.teamIds[bIndex];

      rounds[roundIndex].push({
        phase: "groups",
        groupId: group.id,
        groupName: group.name,
        court: ((groupIndex + roundIndex) % courtCount) + 1,
        team1: [teamNames[id1]],
        ids1: [id1],
        team2: [teamNames[id2]],
        ids2: [id2],
        s1: "",
        s2: "",
      });
    });
  });

  return rounds;
}

function getCupFormat(data) {
  return data?.cupConfig?.format || data?.cupConfig?.cupMode || "";
}

function isCopinhaData(data) {
  return getCupFormat(data) === "copinha";
}

function resetCopinhaTieBreaks(data) {
  if (!isCopinhaData(data)) return data;

  data.cupConfig = {
    ...(data.cupConfig || {}),
    tieBreakOverrides: {},
    groupTieBreakOverrides: {},
  };

  return data;
}

function getCopinhaHeadToHeadWinnerId(firstId, secondId, groupGames, winningScore) {
  const game = groupGames.find((item) => {
    const id1 = item.ids1?.[0];
    const id2 = item.ids2?.[0];
    return (id1 === firstId && id2 === secondId) || (id1 === secondId && id2 === firstId);
  });

  if (!game) return null;

  const winnerSide = getScoreWinnerSide(game, winningScore);
  if (!winnerSide) return null;

  return winnerSide === "team1" ? game.ids1?.[0] ?? null : game.ids2?.[0] ?? null;
}

function getCopinhaManualTieOrder(tiedRows, storedOrder) {
  const tiedIds = tiedRows.map((row) => row.id);
  const order = Array.isArray(storedOrder)
    ? storedOrder.map((id) => Number(id)).filter((id) => tiedIds.includes(id))
    : [];
  const uniqueOrder = Array.from(new Set(order));

  return uniqueOrder.length === tiedRows.length ? uniqueOrder : null;
}

function rankCopinhaGroupRows(rows, groupGames, winningScore, storedTieOrder) {
  const baseRows = [...rows].sort((a, b) => {
    const winsDiff = b.w - a.w;
    if (winsDiff !== 0) return winsDiff;

    const balanceDiff = b.bal - a.bal;
    if (balanceDiff !== 0) return balanceDiff;

    return a.name.localeCompare(b.name);
  });

  const allGroupGamesFinished = groupGames.length === 3 && groupGames.every((game) => (
    getScoreWinnerSide(game, winningScore) !== null
  ));

  if (!allGroupGamesFinished) {
    return { rows: baseRows, unresolvedTieIds: [] };
  }

  const rankedRows = [];
  const unresolvedTieIds = [];

  for (let start = 0; start < baseRows.length;) {
    let end = start + 1;

    while (
      end < baseRows.length &&
      baseRows[end].w === baseRows[start].w &&
      baseRows[end].bal === baseRows[start].bal
    ) {
      end += 1;
    }

    const tiedRows = baseRows.slice(start, end);

    if (tiedRows.length === 1) {
      rankedRows.push(tiedRows[0]);
    } else {
      const manualOrder = getCopinhaManualTieOrder(tiedRows, storedTieOrder);

      if (manualOrder) {
        rankedRows.push(...[...tiedRows].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id)));
      } else if (tiedRows.length === 2) {
        const winnerId = getCopinhaHeadToHeadWinnerId(
          tiedRows[0].id,
          tiedRows[1].id,
          groupGames,
          winningScore
        );

        if (winnerId !== null) {
          rankedRows.push(...[...tiedRows].sort((a, b) => (a.id === winnerId ? -1 : 1)));
        } else {
          unresolvedTieIds.push(...tiedRows.map((row) => row.id));
          rankedRows.push(...tiedRows);
        }
      } else {
        // Com três duplas empatadas, o confronto direto pode formar um ciclo.
        // A planilha determina sorteio; o organizador registra esse sorteio na tela de grupos.
        unresolvedTieIds.push(...tiedRows.map((row) => row.id));
        rankedRows.push(...tiedRows);
      }
    }

    start = end;
  }

  return { rows: rankedRows, unresolvedTieIds };
}

function calculateCupGroupRankings(data, rankingCriteriaValue = defaultRankingCriteria) {
  const cupConfig = data.cupConfig || {};
  const teamCount = cupConfig.teamCount || 12;
  const groups = createCupGroups(teamCount);
  const teamNames = data.players.teams.map((t) => getTeamName(t));
  const criteria = getRankingCriteria(rankingCriteriaValue);
  const winningScore = getWinningScore(data);
  const isCopinha = isCopinhaData(data);
  const tieBreakOverrides = cupConfig.tieBreakOverrides || {};

  const groupRankings = groups.map((group) => {
    const rows = group.teamIds.map((id) => ({
      id,
      name: teamNames[id],
      groupId: group.id,
      groupName: group.name,
      pts: 0,
      w: 0,
      bal: 0,
      played: 0,
    }));

    const tableById = {};
    rows.forEach((row) => {
      tableById[row.id] = row;
    });

    const groupGames = (data.schedule || [])
      .flat()
      .filter((game) => game.phase === "groups" && game.groupId === group.id);

    groupGames.forEach((game) => {
      const s1 = Number(game.s1);
      const s2 = Number(game.s2);

      if (game.s1 === "" || game.s2 === "" || Number.isNaN(s1) || Number.isNaN(s2)) return;

      const winnerSide = getScoreWinnerSide(game, winningScore);
      if (!winnerSide) return;

      const win1 = winnerSide === "team1";
      const win2 = winnerSide === "team2";

      game.ids1.forEach((id) => {
        tableById[id].pts += s1;
        tableById[id].bal += s1 - s2;
        tableById[id].played += 1;
        if (win1) tableById[id].w += 1;
      });

      game.ids2.forEach((id) => {
        tableById[id].pts += s2;
        tableById[id].bal += s2 - s1;
        tableById[id].played += 1;
        if (win2) tableById[id].w += 1;
      });
    });

    if (isCopinha) {
      const ranked = rankCopinhaGroupRows(
        rows,
        groupGames,
        winningScore,
        tieBreakOverrides[String(group.id)]
      );

      return {
        ...group,
        rows: ranked.rows,
        unresolvedTieIds: ranked.unresolvedTieIds,
        rankingMode: "copinha",
      };
    }

    rows.sort((a, b) => {
      for (const key of criteria.order) {
        const diff = b[key] - a[key];
        if (diff !== 0) return diff;
      }

      return a.name.localeCompare(b.name);
    });

    return {
      ...group,
      rows,
      unresolvedTieIds: [],
      rankingMode: "standard",
    };
  });

  return groupRankings;
}

function sortRowsByPointsBalanceWins(a, b) {
  const ptsDiff = b.pts - a.pts;
  if (ptsDiff !== 0) return ptsDiff;

  const balDiff = b.bal - a.bal;
  if (balDiff !== 0) return balDiff;

  const winDiff = b.w - a.w;
  if (winDiff !== 0) return winDiff;

  return a.name.localeCompare(b.name);
}

function getCup18Qualified(data) {
  const groupRankings = calculateCupGroupRankings(data, data.rankingCriteria);

  const direct = [];
  const thirds = [];

  groupRankings.forEach((group) => {
    if (group.rows[0]) direct.push({ ...group.rows[0], groupPosition: 1 });
    if (group.rows[1]) direct.push({ ...group.rows[1], groupPosition: 2 });
    if (group.rows[2]) thirds.push({ ...group.rows[2], groupPosition: 3 });
  });

  const sortedThirds = [...thirds].sort(sortRowsByPointsBalanceWins);

  const extraMain = sortedThirds.slice(0, 2);
  const parallel = sortedThirds.slice(2);

  const criteria = getRankingCriteria(data.rankingCriteria || defaultRankingCriteria);

  function sortMain(a, b) {
    if (a.groupPosition !== b.groupPosition) return a.groupPosition - b.groupPosition;

    for (const key of criteria.order) {
      const diff = b[key] - a[key];
      if (diff !== 0) return diff;
    }

    return a.name.localeCompare(b.name);
  }

  const main = [...direct, ...extraMain].sort(sortMain);

  return {
    main,
    repechage: parallel,
  };
}

function getCup21Qualified(data) {
  const groupRankings = calculateCupGroupRankings(data, data.rankingCriteria);
  const main = [];
  const repechage = [];

  groupRankings.forEach((group) => {
    if (group.rows[0]) main.push({ ...group.rows[0], groupPosition: 1 });
    if (group.rows[1]) main.push({ ...group.rows[1], groupPosition: 2 });
    if (group.rows[2]) repechage.push({ ...group.rows[2], groupPosition: 3 });
  });

  const criteria = getRankingCriteria(data.rankingCriteria || defaultRankingCriteria);

  function sortGeneral(a, b) {
    if (a.groupPosition !== b.groupPosition) return a.groupPosition - b.groupPosition;

    for (const key of criteria.order) {
      const diff = b[key] - a[key];
      if (diff !== 0) return diff;
    }

    return a.name.localeCompare(b.name);
  }

  main.sort(sortGeneral);
  repechage.sort(sortRowsByPointsBalanceWins);

  return { main, repechage };
}

function compareCopinhaGroupCampaign(firstGroup, secondGroup) {
  const first = firstGroup.rows[0] || {};
  const second = secondGroup.rows[0] || {};

  const winsDiff = Number(second.w || 0) - Number(first.w || 0);
  if (winsDiff !== 0) return winsDiff;

  const balanceDiff = Number(second.bal || 0) - Number(first.bal || 0);
  if (balanceDiff !== 0) return balanceDiff;

  return firstGroup.id - secondGroup.id;
}

function getCopinhaGroupTieKey(group) {
  const champion = group.rows[0] || {};
  return `${Number(champion.w || 0)}:${Number(champion.bal || 0)}`;
}

function getCopinhaSeededGroups(data) {
  const groupRankings = calculateCupGroupRankings(data, data.rankingCriteria);
  const baseGroups = [...groupRankings].sort(compareCopinhaGroupCampaign);
  const groupsFinished = baseGroups.every((group) => group.rows.every((row) => row.played === 2));

  if (!groupsFinished) {
    return { rankedGroups: baseGroups, unresolvedGroupTies: [] };
  }

  const rankedGroups = [];
  const unresolvedGroupTies = [];
  const storedOverrides = data.cupConfig?.groupTieBreakOverrides || {};

  for (let start = 0; start < baseGroups.length;) {
    let end = start + 1;
    const tieKey = getCopinhaGroupTieKey(baseGroups[start]);

    while (end < baseGroups.length && getCopinhaGroupTieKey(baseGroups[end]) === tieKey) {
      end += 1;
    }

    const tiedGroups = baseGroups.slice(start, end);

    if (tiedGroups.length === 1) {
      rankedGroups.push(tiedGroups[0]);
    } else {
      const manualOrder = getCopinhaManualTieOrder(tiedGroups, storedOverrides[tieKey]);

      if (manualOrder) {
        rankedGroups.push(...[...tiedGroups].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id)));
      } else {
        unresolvedGroupTies.push({
          tieKey,
          groupIds: tiedGroups.map((group) => group.id),
        });
        rankedGroups.push(...tiedGroups);
      }
    }

    start = end;
  }

  return { rankedGroups, unresolvedGroupTies };
}

function getCopinhaQualified(data) {
  const { rankedGroups } = getCopinhaSeededGroups(data);

  const champions = rankedGroups
    .filter((group) => group.rows[0])
    .map((group, index) => ({
      ...group.rows[0],
      groupPosition: 1,
      groupRank: index + 1,
    }));

  const runnersUp = rankedGroups
    .filter((group) => group.rows[1])
    .map((group, index) => ({
      ...group.rows[1],
      groupPosition: 2,
      groupRank: index + 1,
    }));

  const thirds = rankedGroups
    .filter((group) => group.rows[2])
    .map((group, index) => ({
      ...group.rows[2],
      groupPosition: 3,
      groupRank: index + 1,
    }));

  return {
    // Campeões de grupo recebem as melhores sementes; depois vêm os segundos.
    main: [...champions, ...runnersUp],
    // Na planilha de 2 grupos os terceiros não disputam consolação.
    repechage: rankedGroups.length > 2 ? thirds : [],
  };
}

function getCupQualified(data) {
  const format = getCupFormat(data);
  const teamCount = data.cupConfig?.teamCount || 12;

  if (format === "copinha") {
    return getCopinhaQualified(data);
  }

  // Os torneios antigos não guardavam o formato. Mantemos a compatibilidade
  // apenas para eles, sem deixar uma Copinha de 18/21 cair na regra errada.
  if (format === "cup18" || (!format && teamCount === 18)) {
    return getCup18Qualified(data);
  }

  if (format === "cup21" || (!format && teamCount === 21)) {
    return getCup21Qualified(data);
  }

  const groupRankings = calculateCupGroupRankings(data, data.rankingCriteria);
  const main = [];
  const repechage = [];

  groupRankings.forEach((group) => {
    if (group.rows[0]) main.push({ ...group.rows[0], groupPosition: 1 });
    if (group.rows[1]) main.push({ ...group.rows[1], groupPosition: 2 });
    if (group.rows[2]) repechage.push({ ...group.rows[2], groupPosition: 3 });
  });

  const criteria = getRankingCriteria(data.rankingCriteria || defaultRankingCriteria);

  function sortGeneral(a, b) {
    if (a.groupPosition !== b.groupPosition) return a.groupPosition - b.groupPosition;

    for (const key of criteria.order) {
      const diff = b[key] - a[key];
      if (diff !== 0) return diff;
    }

    return a.name.localeCompare(b.name);
  }

  main.sort(sortGeneral);
  repechage.sort(sortGeneral);

  return { main, repechage };
}

function seedBracket(teamIds, bracketType) {
  if (teamIds.length === 4) {
    return [
      [teamIds[0], teamIds[3]],
      [teamIds[1], teamIds[2]],
    ].map((pair, index) => ({
      phase: bracketType,
      roundName: "Semifinal",
      matchKey: `${bracketType}_sf_${index + 1}`,
      source1: null,
      source2: null,
      ids1: [pair[0]],
      ids2: [pair[1]],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: index + 1,
    }));
  }

  if (teamIds.length === 8) {
    return [
      [teamIds[0], teamIds[7]],
      [teamIds[3], teamIds[4]],
      [teamIds[2], teamIds[5]],
      [teamIds[1], teamIds[6]],
    ].map((pair, index) => ({
      phase: bracketType,
      roundName: "Quartas de final",
      matchKey: `${bracketType}_qf_${index + 1}`,
      source1: null,
      source2: null,
      ids1: [pair[0]],
      ids2: [pair[1]],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: index + 1,
    }));
  }

  if (teamIds.length === 7) {
    return [
      [teamIds[1], teamIds[6]],
      [teamIds[2], teamIds[5]],
      [teamIds[3], teamIds[4]],
    ].map((pair, index) => ({
      phase: bracketType,
      roundName: "Preliminar",
      matchKey: `${bracketType}_pre_${index + 1}`,
      source1: null,
      source2: null,
      ids1: [pair[0]],
      ids2: [pair[1]],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: index + 1,
    }));
  }

  if (teamIds.length === 14) {
    return [
      [teamIds[2], teamIds[13]],
      [teamIds[3], teamIds[12]],
      [teamIds[4], teamIds[11]],
      [teamIds[5], teamIds[10]],
      [teamIds[6], teamIds[9]],
      [teamIds[7], teamIds[8]],
    ].map((pair, index) => ({
      phase: bracketType,
      roundName: "Preliminar",
      matchKey: `${bracketType}_pre_${index + 1}`,
      source1: null,
      source2: null,
      ids1: [pair[0]],
      ids2: [pair[1]],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: index + 1,
    }));
  }

  if (teamIds.length === 16) {
    return [
      [teamIds[0], teamIds[15]],
      [teamIds[7], teamIds[8]],
      [teamIds[4], teamIds[11]],
      [teamIds[3], teamIds[12]],
      [teamIds[2], teamIds[13]],
      [teamIds[5], teamIds[10]],
      [teamIds[6], teamIds[9]],
      [teamIds[1], teamIds[14]],
    ].map((pair, index) => ({
      phase: bracketType,
      roundName: "Oitavas de final",
      matchKey: `${bracketType}_r16_${index + 1}`,
      source1: null,
      source2: null,
      ids1: [pair[0]],
      ids2: [pair[1]],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: index + 1,
    }));
  }

  return [];
}

function generateParallelRoundRobin(teamIds) {
  const pairs = [
    [teamIds[0], teamIds[1]],
    [teamIds[2], teamIds[3]],
    [teamIds[0], teamIds[2]],
    [teamIds[1], teamIds[3]],
    [teamIds[0], teamIds[3]],
    [teamIds[1], teamIds[2]],
  ];

  return pairs.map((pair, index) => ({
    phase: "repechage",
    roundName: "Disputa Paralela",
    matchKey: `repechage_parallel_${index + 1}`,
    source1: null,
    source2: null,
    ids1: [pair[0]],
    ids2: [pair[1]],
    team1: null,
    team2: null,
    s1: "",
    s2: "",
    court: (index % 2) + 1,
  }));
}

function getGameWinnerId(game, data = null) {
  const winningScore = getWinningScore(data);
  const winnerSide = getScoreWinnerSide(game, winningScore);

  if (!game.ids1?.length || !game.ids2?.length) return null;
  if (!winnerSide) return null;

  return winnerSide === "team1" ? game.ids1[0] : game.ids2[0];
}

function getGameLoserId(game, data = null) {
  const winningScore = getWinningScore(data);
  const winnerSide = getScoreWinnerSide(game, winningScore);

  if (!game.ids1?.length || !game.ids2?.length) return null;
  if (!winnerSide) return null;

  return winnerSide === "team1" ? game.ids2[0] : game.ids1[0];
}

function resolveBracketGame(game, allGames, data) {
  const copy = { ...game };

  if (copy.source1) {
    const sourceGame = allGames.find((item) => item.matchKey === copy.source1);

    const sourceId = sourceGame
      ? copy.source1Mode === "loser"
        ? getGameLoserId(resolveBracketGame(sourceGame, allGames, data), data)
        : getGameWinnerId(resolveBracketGame(sourceGame, allGames, data), data)
      : null;

    copy.ids1 = sourceId === null ? [] : [sourceId];
  }

  if (copy.source2) {
    const sourceGame = allGames.find((item) => item.matchKey === copy.source2);

    const sourceId = sourceGame
      ? copy.source2Mode === "loser"
        ? getGameLoserId(resolveBracketGame(sourceGame, allGames, data), data)
        : getGameWinnerId(resolveBracketGame(sourceGame, allGames, data), data)
      : null;

    copy.ids2 = sourceId === null ? [] : [sourceId];
  }

  copy.team1 = copy.ids1?.length
    ? [getCupTeamName(data, copy.ids1[0])]
    : ["Aguardando"];

  copy.team2 = copy.ids2?.length
    ? [getCupTeamName(data, copy.ids2[0])]
    : ["Aguardando"];

  return copy;
}

function shuffleParticipantsWithMeta(players, metadata) {
  const paired = (Array.isArray(players) ? players : []).map((player, index) => ({
    player,
    meta: Array.isArray(metadata) ? metadata[index] : undefined,
  }));
  const shuffled = shuffleArray(paired);
  return {
    players: shuffled.map((item) => item.player),
    metadata: shuffled.map((item) => item.meta || { payment: "pending", registration: "pending", profileLinked: false }),
  };
}

function buildNextRound(previousGames, bracketType, roundName, keyPrefix) {
  const games = [];

  for (let i = 0; i < previousGames.length; i += 2) {
    games.push({
      phase: bracketType,
      roundName,
      matchKey: `${bracketType}_${keyPrefix}_${games.length + 1}`,
      source1: previousGames[i].matchKey,
      source2: previousGames[i + 1].matchKey,
      ids1: [],
      ids2: [],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: games.length + 1,
    });
  }

  return games;
}

function buildThirdPlaceGame(semifinals, bracketType = "main") {
  if (!semifinals || semifinals.length < 2) return [];

  return [
    {
      phase: bracketType,
      roundName: "3º lugar",
      matchKey: `${bracketType}_third_1`,
      source1: semifinals[0].matchKey,
      source2: semifinals[1].matchKey,
      source1Mode: "loser",
      source2Mode: "loser",
      ids1: [],
      ids2: [],
      team1: null,
      team2: null,
      s1: "",
      s2: "",
      court: 2,
    },
  ];
}

function getLargestPowerOfTwo(value) {
  let power = 1;

  while (power * 2 <= value) {
    power *= 2;
  }

  return power;
}

function getBracketSeedOrder(size) {
  let order = [1, 2];

  while (order.length < size) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }

  return order;
}

function getEliminationRoundName(teamCount) {
  if (teamCount === 2) return "Final";
  if (teamCount === 4) return "Semifinal";
  if (teamCount === 8) return "Quartas de final";
  if (teamCount === 16) return "Oitavas de final";
  return `Rodada de ${teamCount}`;
}

function getCopinhaPreliminaryPairs(entries) {
  const remaining = [...entries];
  const pairs = [];

  while (remaining.length > 1) {
    const first = remaining.shift();
    let opponentIndex = -1;

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      if (remaining[index].groupId !== first.groupId) {
        opponentIndex = index;
        break;
      }
    }

    if (opponentIndex < 0) opponentIndex = remaining.length - 1;

    pairs.push([first, remaining.splice(opponentIndex, 1)[0]]);
  }

  return pairs;
}

function createCopinhaBracketGame({
  bracketType,
  roundName,
  matchKey,
  entry1,
  entry2,
  court,
}) {
  return {
    phase: bracketType,
    roundName,
    matchKey,
    source1: entry1?.sourceMatchKey || null,
    source2: entry2?.sourceMatchKey || null,
    source1Mode: entry1?.sourceMode || null,
    source2Mode: entry2?.sourceMode || null,
    ids1: Number.isInteger(entry1?.id) ? [entry1.id] : [],
    ids2: Number.isInteger(entry2?.id) ? [entry2.id] : [],
    team1: null,
    team2: null,
    s1: "",
    s2: "",
    court,
  };
}

// Mapas de chaveamento da Copinha. C = campeão do grupo, R = segundo e T =
// terceiro; o número é a posição da campanha do grupo. As abas de 2 a 9
// grupos foram transcritas da planilha. Em 10 grupos, a planilha repete o
// 2º MG4 no Jogo 8 e deixa o 1º MG4 de fora; usamos 1º MG4 para que as 20
// duplas classificadas apareçam uma única vez. Os formatos 11 e 12 seguem a
// mesma distribuição, corrigindo as cópias incompletas dessas abas.
const copinhaBracketPlans = {
  2: {
    main: [
      { title: "Semifinal", games: [["m1", "c1", "r2"], ["m2", "c2", "r1"]] },
      { title: "3º lugar", games: [["m3", "l:m1", "l:m2"]] },
      { title: "Final", games: [["m4", "w:m1", "w:m2"]] },
    ],
    repechage: [],
  },
  3: {
    main: [
      { title: "Quartas de final", games: [["m1", "r2", "r3"], ["m2", "r1", "c3"]] },
      { title: "Semifinal", games: [["m3", "c1", "w:m1"], ["m4", "c2", "w:m2"]] },
      { title: "3º lugar", games: [["m5", "l:m3", "l:m4"]] },
      { title: "Final", games: [["m6", "w:m3", "w:m4"]] },
    ],
    repechage: [
      { title: "Semifinal", games: [["r1", "t2", "t3"]] },
      { title: "Final", games: [["r2", "t1", "w:r1"]] },
    ],
  },
  4: {
    main: [
      { title: "Quartas de final", games: [["m1", "c1", "r3"], ["m2", "c4", "r2"], ["m3", "c3", "r1"], ["m4", "c2", "r4"]] },
      { title: "Semifinal", games: [["m5", "w:m1", "w:m2"], ["m6", "w:m3", "w:m4"]] },
      { title: "3º lugar", games: [["m7", "l:m5", "l:m6"]] },
      { title: "Final", games: [["m8", "w:m5", "w:m6"]] },
    ],
    repechage: [
      { title: "Semifinal", games: [["r1", "t1", "t4"], ["r2", "t2", "t3"]] },
      { title: "Final", games: [["r3", "w:r1", "w:r2"]] },
    ],
  },
  5: {
    main: [
      { title: "Oitavas de final", games: [["m1", "r3", "r2"], ["m2", "r4", "r5"]] },
      { title: "Quartas de final", games: [["m3", "c1", "w:m1"], ["m4", "c4", "c5"], ["m5", "c3", "r1"], ["m6", "c2", "w:m2"]] },
      { title: "Semifinal", games: [["m7", "w:m3", "w:m4"], ["m8", "w:m5", "w:m6"]] },
      { title: "3º lugar", games: [["m9", "l:m7", "l:m8"]] },
      { title: "Final", games: [["m10", "w:m7", "w:m8"]] },
    ],
    repechage: [
      { title: "Quartas de final", games: [["r1", "t5", "t4"]] },
      { title: "Semifinal", games: [["r2", "t1", "w:r1"], ["r3", "t2", "t3"]] },
      { title: "Final", games: [["r4", "w:r2", "w:r3"]] },
    ],
  },
  6: {
    main: [
      { title: "Oitavas de final", games: [["m1", "r2", "r6"], ["m2", "r3", "c5"], ["m3", "r1", "c6"], ["m4", "r4", "r5"]] },
      { title: "Quartas de final", games: [["m5", "c1", "w:m1"], ["m6", "c4", "w:m2"], ["m7", "c3", "w:m3"], ["m8", "c2", "w:m4"]] },
      { title: "Semifinal", games: [["m9", "w:m5", "w:m6"], ["m10", "w:m7", "w:m8"]] },
      { title: "3º lugar", games: [["m11", "l:m9", "l:m10"]] },
      { title: "Final", games: [["m12", "w:m9", "w:m10"]] },
    ],
    repechage: [
      { title: "Quartas de final", games: [["r1", "t4", "t6"], ["r2", "t3", "t5"]] },
      { title: "Semifinal", games: [["r3", "t1", "w:r1"], ["r4", "t2", "w:r2"]] },
      { title: "Final", games: [["r5", "w:r3", "w:r4"]] },
    ],
  },
  7: {
    main: [
      { title: "Oitavas de final", games: [["m1", "c7", "r6"], ["m2", "r3", "c5"], ["m3", "c4", "r2"], ["m4", "r5", "r4"], ["m5", "c6", "r7"], ["m6", "c3", "r1"]] },
      { title: "Quartas de final", games: [["m7", "c1", "w:m1"], ["m8", "w:m2", "w:m3"], ["m9", "w:m5", "w:m6"], ["m10", "c2", "w:m4"]] },
      { title: "Semifinal", games: [["m11", "w:m7", "w:m8"], ["m12", "w:m9", "w:m10"]] },
      { title: "3º lugar", games: [["m13", "l:m11", "l:m12"]] },
      { title: "Final", games: [["m14", "w:m11", "w:m12"]] },
    ],
    repechage: [
      { title: "Quartas de final", games: [["r1", "t2", "t7"], ["r2", "t3", "t6"], ["r3", "t4", "t5"]] },
      { title: "Semifinal", games: [["r4", "t1", "w:r3"], ["r5", "w:r1", "w:r2"]] },
      { title: "Final", games: [["r6", "w:r4", "w:r5"]] },
    ],
  },
  8: {
    main: [
      { title: "Oitavas de final", games: [["m1", "c1", "r8"], ["m2", "c5", "r3"], ["m3", "c7", "r2"], ["m4", "c4", "r6"], ["m5", "c3", "r5"], ["m6", "c6", "r4"], ["m7", "c8", "r1"], ["m8", "c2", "r7"]] },
      { title: "Quartas de final", games: [["m9", "w:m1", "w:m2"], ["m10", "w:m3", "w:m4"], ["m11", "w:m5", "w:m6"], ["m12", "w:m7", "w:m8"]] },
      { title: "Semifinal", games: [["m13", "w:m9", "w:m10"], ["m14", "w:m11", "w:m12"]] },
      { title: "3º lugar", games: [["m15", "l:m13", "l:m14"]] },
      { title: "Final", games: [["m16", "w:m13", "w:m14"]] },
    ],
    repechage: [
      { title: "Quartas de final", games: [["r1", "t1", "t8"], ["r2", "t2", "t7"], ["r3", "t3", "t6"], ["r4", "t4", "t5"]] },
      { title: "Semifinal", games: [["r5", "w:r1", "w:r2"], ["r6", "w:r3", "w:r4"]] },
      { title: "Final", games: [["r7", "w:r5", "w:r6"]] },
    ],
  },
  9: {
    main: [
      { title: "1ª Rodada", games: [["m1", "r8", "r6"], ["m2", "r9", "r7"]] },
      { title: "Oitavas de final", games: [["m3", "c1", "w:m1"], ["m4", "c5", "r3"], ["m5", "c7", "c9"], ["m6", "c4", "r2"], ["m7", "c2", "w:m2"], ["m8", "c8", "r4"], ["m9", "c6", "r5"], ["m10", "c3", "r1"]] },
      { title: "Quartas de final", games: [["m11", "w:m3", "w:m4"], ["m12", "w:m5", "w:m6"], ["m13", "w:m7", "w:m8"], ["m14", "w:m9", "w:m10"]] },
      { title: "Semifinal", games: [["m15", "w:m11", "w:m12"], ["m16", "w:m13", "w:m14"]] },
      { title: "3º lugar", games: [["m17", "l:m15", "l:m16"]] },
      { title: "Final", games: [["m18", "w:m15", "w:m16"]] },
    ],
    repechage: [
      { title: "1ª Rodada", games: [["r1", "t8", "t9"]] },
      { title: "Quartas de final", games: [["r2", "t1", "w:r1"], ["r3", "t2", "t7"], ["r4", "t3", "t6"], ["r5", "t4", "t5"]] },
      { title: "Semifinal", games: [["r6", "w:r2", "w:r3"], ["r7", "w:r4", "w:r5"]] },
      { title: "Final", games: [["r8", "w:r6", "w:r7"]] },
    ],
  },
  10: {
    main: [
      { title: "1ª Rodada", games: [["m1", "r3", "r6"], ["m2", "r8", "r10"], ["m3", "r4", "r5"], ["m4", "r7", "r9"]] },
      { title: "Oitavas de final", games: [["m5", "c1", "w:m1"], ["m6", "c5", "r2"], ["m7", "c7", "c9"], ["m8", "c4", "w:m2"], ["m9", "c3", "w:m3"], ["m10", "r1", "c6"], ["m11", "c8", "c10"], ["m12", "c2", "w:m4"]] },
      { title: "Quartas de final", games: [["m13", "w:m5", "w:m6"], ["m14", "w:m7", "w:m8"], ["m15", "w:m9", "w:m10"], ["m16", "w:m11", "w:m12"]] },
      { title: "Semifinal", games: [["m17", "w:m13", "w:m14"], ["m18", "w:m15", "w:m16"]] },
      { title: "3º lugar", games: [["m19", "l:m17", "l:m18"]] },
      { title: "Final", games: [["m20", "w:m17", "w:m18"]] },
    ],
    repechage: [
      { title: "1ª Rodada", games: [["r1", "t9", "t10"], ["r2", "t7", "t8"]] },
      { title: "Quartas de final", games: [["r3", "t1", "w:r1"], ["r4", "t2", "w:r2"], ["r5", "t3", "t4"], ["r6", "t5", "t6"]] },
      { title: "Semifinal", games: [["r7", "w:r3", "w:r4"], ["r8", "w:r5", "w:r6"]] },
      { title: "Final", games: [["r9", "w:r7", "w:r8"]] },
    ],
  },
  11: {
    main: [
      { title: "1ª Rodada", games: [["m1", "c11", "r10"], ["m2", "r1", "r11"], ["m3", "r2", "r9"], ["m4", "r3", "r8"], ["m5", "r4", "r7"], ["m6", "r5", "r6"]] },
      { title: "Oitavas de final", games: [["m7", "c1", "w:m1"], ["m8", "c8", "w:m2"], ["m9", "c4", "w:m3"], ["m10", "c5", "w:m4"], ["m11", "c2", "w:m5"], ["m12", "c7", "w:m6"], ["m13", "c3", "c10"], ["m14", "c6", "c9"]] },
      { title: "Quartas de final", games: [["m15", "w:m7", "w:m8"], ["m16", "w:m9", "w:m10"], ["m17", "w:m11", "w:m12"], ["m18", "w:m13", "w:m14"]] },
      { title: "Semifinal", games: [["m19", "w:m15", "w:m16"], ["m20", "w:m17", "w:m18"]] },
      { title: "3º lugar", games: [["m21", "l:m19", "l:m20"]] },
      { title: "Final", games: [["m22", "w:m19", "w:m20"]] },
    ],
    repechage: [
      { title: "1ª Rodada", games: [["r1", "t6", "t11"], ["r2", "t7", "t10"], ["r3", "t8", "t9"]] },
      { title: "Quartas de final", games: [["r4", "t1", "w:r1"], ["r5", "t4", "w:r2"], ["r6", "t2", "w:r3"], ["r7", "t3", "t5"]] },
      { title: "Semifinal", games: [["r8", "w:r4", "w:r5"], ["r9", "w:r6", "w:r7"]] },
      { title: "Final", games: [["r10", "w:r8", "w:r9"]] },
    ],
  },
  12: {
    main: [
      { title: "1ª Rodada", games: [["m1", "c9", "r12"], ["m2", "c10", "r11"], ["m3", "c11", "r10"], ["m4", "c12", "r9"], ["m5", "r1", "r8"], ["m6", "r2", "r7"], ["m7", "r3", "r6"], ["m8", "r4", "r5"]] },
      { title: "Oitavas de final", games: [["m9", "c1", "w:m1"], ["m10", "c8", "w:m2"], ["m11", "c4", "w:m3"], ["m12", "c5", "w:m4"], ["m13", "c2", "w:m5"], ["m14", "c3", "w:m6"], ["m15", "c7", "w:m7"], ["m16", "c6", "w:m8"]] },
      { title: "Quartas de final", games: [["m17", "w:m9", "w:m10"], ["m18", "w:m11", "w:m12"], ["m19", "w:m13", "w:m14"], ["m20", "w:m15", "w:m16"]] },
      { title: "Semifinal", games: [["m21", "w:m17", "w:m18"], ["m22", "w:m19", "w:m20"]] },
      { title: "3º lugar", games: [["m23", "l:m21", "l:m22"]] },
      { title: "Final", games: [["m24", "w:m21", "w:m22"]] },
    ],
    repechage: [
      { title: "1ª Rodada", games: [["r1", "t5", "t12"], ["r2", "t6", "t11"], ["r3", "t7", "t10"], ["r4", "t8", "t9"]] },
      { title: "Quartas de final", games: [["r5", "t1", "w:r1"], ["r6", "t4", "w:r2"], ["r7", "t2", "w:r3"], ["r8", "t3", "w:r4"]] },
      { title: "Semifinal", games: [["r9", "w:r5", "w:r6"], ["r10", "w:r7", "w:r8"]] },
      { title: "Final", games: [["r11", "w:r9", "w:r10"]] },
    ],
  },
};

function getCopinhaEntryCode(entry) {
  const prefix = entry?.groupPosition === 1 ? "c" : entry?.groupPosition === 2 ? "r" : "t";
  return prefix ? `${prefix}${entry.groupRank}` : "";
}

function getCopinhaPlanEntry(reference, entryByCode, bracketType) {
  if (typeof reference !== "string") return null;

  if (reference.startsWith("w:") || reference.startsWith("l:")) {
    return {
      sourceMatchKey: `${bracketType}_${reference.slice(2)}`,
      sourceMode: reference.startsWith("l:") ? "loser" : "winner",
    };
  }

  return entryByCode[reference] || null;
}

function buildCopinhaBracketFromPlan(entries, bracketType, bracketTitle, roundPlan) {
  const entryByCode = Object.fromEntries(
    entries.map((entry) => [getCopinhaEntryCode(entry), entry])
  );

  return roundPlan.map((round) => ({
    title: round.title,
    bracketTitle,
    games: round.games.map(([key, first, second], index) => (
      createCopinhaBracketGame({
        bracketType,
        roundName: round.title,
        matchKey: `${bracketType}_${key}`,
        entry1: getCopinhaPlanEntry(first, entryByCode, bracketType),
        entry2: getCopinhaPlanEntry(second, entryByCode, bracketType),
        court: index + 1,
      })
    )),
  }));
}

function buildCopinhaEliminationRounds(entries, bracketType, bracketTitle, includeThirdPlace = false) {
  if (!Array.isArray(entries) || entries.length < 2) return [];

  const teamCount = entries.length;
  const targetSize = getLargestPowerOfTwo(teamCount);
  const preliminaryGameCount = teamCount - targetSize;
  const directEntryCount = teamCount - preliminaryGameCount * 2;
  const directEntries = entries.slice(0, directEntryCount);
  const preliminaryPairs = getCopinhaPreliminaryPairs(entries.slice(directEntryCount));
  const preliminaryGames = preliminaryPairs.map(([entry1, entry2], index) => (
    createCopinhaBracketGame({
      bracketType,
      roundName: "Preliminar",
      matchKey: `${bracketType}_pre_${index + 1}`,
      entry1,
      entry2,
      court: index + 1,
    })
  ));

  const seededEntries = [
    ...directEntries,
    ...preliminaryGames.map((game) => ({ sourceMatchKey: game.matchKey })),
  ];
  const seedOrder = getBracketSeedOrder(targetSize);
  const openingRoundName = getEliminationRoundName(targetSize);
  const openingGames = [];

  for (let index = 0; index < seedOrder.length; index += 2) {
    openingGames.push(createCopinhaBracketGame({
      bracketType,
      roundName: openingRoundName,
      matchKey: `${bracketType}_r${targetSize}_${openingGames.length + 1}`,
      entry1: seededEntries[seedOrder[index] - 1],
      entry2: seededEntries[seedOrder[index + 1] - 1],
      court: openingGames.length + 1,
    }));
  }

  const rounds = [];

  if (preliminaryGames.length > 0) {
    rounds.push({
      title: "Preliminar",
      bracketTitle,
      games: preliminaryGames,
    });
  }

  rounds.push({
    title: openingRoundName,
    bracketTitle,
    games: openingGames,
  });

  let currentGames = openingGames;
  let currentTeamCount = targetSize;

  while (currentGames.length > 1) {
    const nextTeamCount = currentTeamCount / 2;
    const nextRoundName = getEliminationRoundName(nextTeamCount);
    const nextGames = buildNextRound(
      currentGames,
      bracketType,
      nextRoundName,
      `r${nextTeamCount}`
    );

    if (nextTeamCount === 2 && includeThirdPlace) {
      const thirdPlaceGames = buildThirdPlaceGame(currentGames, bracketType);

      if (thirdPlaceGames.length) {
        rounds.push({
          title: "3º lugar",
          bracketTitle,
          games: thirdPlaceGames,
        });
      }
    }

    rounds.push({
      title: nextRoundName,
      bracketTitle,
      games: nextGames,
    });

    currentGames = nextGames;
    currentTeamCount = nextTeamCount;
  }

  return rounds;
}

function generateCopinhaBrackets(data) {
  const qualified = getCopinhaQualified(data);
  const cupConfig = data.cupConfig || {};
  const mainName = cupConfig.mainBracketName || "Chave Principal";
  const repechageName = cupConfig.repechageName || "Consolação";
  const groupCount = Math.floor((cupConfig.teamCount || 0) / 3);
  const plan = copinhaBracketPlans[groupCount];
  const mainRounds = plan
    ? buildCopinhaBracketFromPlan(qualified.main, "main", mainName, plan.main)
    : buildCopinhaEliminationRounds(qualified.main, "main", mainName, true);
  const repechageRounds = plan
    ? buildCopinhaBracketFromPlan(qualified.repechage, "repechage", repechageName, plan.repechage)
    : buildCopinhaEliminationRounds(qualified.repechage, "repechage", repechageName, false);
  const allGames = [...mainRounds, ...repechageRounds].flatMap((round) => round.games);

  return {
    main: mainRounds.map((round) => ({
      ...round,
      games: round.games.map((game) => resolveBracketGame(game, allGames, data)),
    })),
    repechage: repechageRounds.map((round) => ({
      ...round,
      games: round.games.map((game) => resolveBracketGame(game, allGames, data)),
    })),
  };
}

function generateCupBrackets(data) {
  if (isCopinhaData(data)) {
    return generateCopinhaBrackets(data);
  }

  const qualified = getCupQualified(data);
  const cupConfig = data.cupConfig || {};
  const teamCount = cupConfig.teamCount || 12;
  const mainName = cupConfig.mainBracketName || "Principal";
  const repechageName = cupConfig.repechageName || "Repescagem";

  const mainIds = qualified.main.map((item) => item.id);
  const repechageIds = qualified.repechage.map((item) => item.id);

  const mainRounds = [];
  const repechageRounds = [];

  if ((teamCount === 18 || teamCount === 21) && mainIds.length === 14) {
    const preliminary = seedBracket(mainIds, "main");

    const quarterfinals = [
      {
        phase: "main",
        roundName: "Quartas de final",
        matchKey: "main_qf_1",
        source1: null,
        source2: preliminary[0].matchKey,
        ids1: [mainIds[0]],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 1,
      },
      {
        phase: "main",
        roundName: "Quartas de final",
        matchKey: "main_qf_2",
        source1: null,
        source2: preliminary[1].matchKey,
        ids1: [mainIds[1]],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 2,
      },
      {
        phase: "main",
        roundName: "Quartas de final",
        matchKey: "main_qf_3",
        source1: preliminary[2].matchKey,
        source2: preliminary[3].matchKey,
        ids1: [],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 3,
      },
      {
        phase: "main",
        roundName: "Quartas de final",
        matchKey: "main_qf_4",
        source1: preliminary[4].matchKey,
        source2: preliminary[5].matchKey,
        ids1: [],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 4,
      },
    ];

    const semifinals = [
      {
        phase: "main",
        roundName: "Semifinal",
        matchKey: "main_sf_1",
        source1: "main_qf_1",
        source2: "main_qf_4",
        ids1: [],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 1,
      },
      {
        phase: "main",
        roundName: "Semifinal",
        matchKey: "main_sf_2",
        source1: "main_qf_2",
        source2: "main_qf_3",
        ids1: [],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 2,
      },
    ];

    const final = [
      {
        phase: "main",
        roundName: "Final",
        matchKey: "main_final_1",
        source1: "main_sf_1",
        source2: "main_sf_2",
        ids1: [],
        ids2: [],
        team1: null,
        team2: null,
        s1: "",
        s2: "",
        court: 1,
      },
    ];

    mainRounds.push({
      title: "Preliminar",
      bracketTitle: mainName,
      games: preliminary,
    });

    mainRounds.push({
      title: "Quartas de final",
      bracketTitle: mainName,
      games: quarterfinals,
    });

    mainRounds.push({
      title: "Semifinal",
      bracketTitle: mainName,
      games: semifinals,
    });

    mainRounds.push({
      title: "3º lugar",
      bracketTitle: mainName,
      games: buildThirdPlaceGame(semifinals),
    });

    mainRounds.push({
      title: "Final",
      bracketTitle: mainName,
      games: final,
    });
  } else {
    const mainFirstRound = seedBracket(mainIds, "main");

    if (mainFirstRound.length) {
      mainRounds.push({
        title: mainFirstRound[0].roundName,
        bracketTitle: mainName,
        games: mainFirstRound,
      });

      if (mainIds.length === 8) {
        const semifinals = buildNextRound(mainFirstRound, "main", "Semifinal", "sf");
        const thirdPlace = buildThirdPlaceGame(semifinals);
        const final = buildNextRound(semifinals, "main", "Final", "final");

        mainRounds.push({ title: "Semifinal", bracketTitle: mainName, games: semifinals });
        mainRounds.push({ title: "3º lugar", bracketTitle: mainName, games: thirdPlace });
        mainRounds.push({ title: "Final", bracketTitle: mainName, games: final });
      }

      if (mainIds.length === 16) {
        const quarterfinals = buildNextRound(mainFirstRound, "main", "Quartas de final", "qf");
        const semifinals = buildNextRound(quarterfinals, "main", "Semifinal", "sf");
        const thirdPlace = buildThirdPlaceGame(semifinals);
        const final = buildNextRound(semifinals, "main", "Final", "final");

        mainRounds.push({ title: "Quartas de final", bracketTitle: mainName, games: quarterfinals });
        mainRounds.push({ title: "Semifinal", bracketTitle: mainName, games: semifinals });
        mainRounds.push({ title: "3º lugar", bracketTitle: mainName, games: thirdPlace });
        mainRounds.push({ title: "Final", bracketTitle: mainName, games: final });
      }
    }
  }

  const repechageFirstRound =
    repechageIds.length === 4
      ? generateParallelRoundRobin(repechageIds)
      : seedBracket(repechageIds, "repechage");

  if (repechageFirstRound.length) {
    repechageRounds.push({
      title: repechageFirstRound[0].roundName,
      bracketTitle: repechageName,
      games: repechageFirstRound,
    });

    if (repechageIds.length === 4) {
      // Disputa Paralela: todos contra todos. Não gera final.
    } else if (repechageIds.length === 7) {
      const semifinals = [
        {
          phase: "repechage",
          roundName: "Semifinal",
          matchKey: "repechage_sf_1",
          source1: null,
          source2: repechageFirstRound[0].matchKey,
          ids1: [repechageIds[0]],
          ids2: [],
          team1: null,
          team2: null,
          s1: "",
          s2: "",
          court: 1,
        },
        {
          phase: "repechage",
          roundName: "Semifinal",
          matchKey: "repechage_sf_2",
          source1: repechageFirstRound[1].matchKey,
          source2: repechageFirstRound[2].matchKey,
          ids1: [],
          ids2: [],
          team1: null,
          team2: null,
          s1: "",
          s2: "",
          court: 2,
        },
      ];
      const final = buildNextRound(semifinals, "repechage", "Final", "final");

      repechageRounds.push({ title: "Semifinal", bracketTitle: repechageName, games: semifinals });
      repechageRounds.push({ title: "Final", bracketTitle: repechageName, games: final });
    } else if (repechageIds.length === 8) {
      const semifinals = buildNextRound(repechageFirstRound, "repechage", "Semifinal", "sf");
      const final = buildNextRound(semifinals, "repechage", "Final", "final");

      repechageRounds.push({ title: "Semifinal", bracketTitle: repechageName, games: semifinals });
      repechageRounds.push({ title: "Final", bracketTitle: repechageName, games: final });
    }
  }

  const allGames = [...mainRounds, ...repechageRounds].flatMap((round) => round.games);

  const resolvedMainRounds = mainRounds.map((round) => ({
    ...round,
    games: round.games.map((game) => resolveBracketGame(game, allGames, data)),
  }));

  const resolvedRepechageRounds = repechageRounds.map((round) => ({
    ...round,
    games: round.games.map((game) => resolveBracketGame(game, allGames, data)),
  }));

  return {
    main: resolvedMainRounds,
    repechage: resolvedRepechageRounds,
  };
}

function getCupAllBracketGames(data) {
  const brackets = generateCupBrackets(data);
  return [...brackets.main, ...brackets.repechage].flatMap((round) => round.games);
}

function rebuildCupBracketGames(currentData, existingScores = {}) {
  const baseGames = getCupAllBracketGames(currentData).map((game) => ({
    ...game,
    s1: existingScores[game.matchKey]?.s1 ?? game.s1 ?? "",
    s2: existingScores[game.matchKey]?.s2 ?? game.s2 ?? "",
  }));

  // Resolve novamente depois de reaplicar os placares. Assim, o vencedor de
  // uma fase anterior aparece imediatamente na fase seguinte.
  return baseGames.map((game) => resolveBracketGame(game, baseGames, currentData));
}

function syncCupBracketScores(currentData) {
  const copy = structuredClone(currentData);
  const existingScores = {};

  (copy.brackets || []).forEach((game) => {
    existingScores[game.matchKey] = {
      s1: game.s1,
      s2: game.s2,
    };
  });

  copy.brackets = rebuildCupBracketGames(copy, existingScores);
  return copy;
}

function calculateParallelRanking(data, rankingCriteriaValue = defaultRankingCriteria) {
  const allRepechageGames = (data.brackets || []).filter((game) => game.phase === "repechage");
  const games = allRepechageGames.map((game) =>
    resolveBracketGame(game, data.brackets || [], data)
  );

  const winningScore = getWinningScore(data);

  const qualified = getCupQualified(data);
  const baseIds = (qualified.repechage || []).map((item) => item.id);
  const ids = Array.from(
    new Set([
      ...baseIds,
      ...games.flatMap((game) => [
        ...(game.ids1 || []),
        ...(game.ids2 || []),
      ]),
    ])
  );

  const rows = ids.map((id) => ({
    id,
    name: getCupTeamName(data, id),
    pts: 0,
    w: 0,
    bal: 0,
    played: 0,
  }));

  const tableById = {};
  rows.forEach((row) => {
    tableById[row.id] = row;
  });

  games.forEach((game) => {
    const s1 = Number(game.s1);
    const s2 = Number(game.s2);

    if (game.s1 === "" || game.s2 === "" || Number.isNaN(s1) || Number.isNaN(s2)) return;

    const id1 = game.ids1?.[0];
    const id2 = game.ids2?.[0];

    if (id1 === undefined || id2 === undefined) return;

    if (!tableById[id1]) return;
    if (!tableById[id2]) return;

    const winnerSide = getScoreWinnerSide(game, winningScore);
    if (!winnerSide) return;

    const win1 = winnerSide === "team1";
    const win2 = winnerSide === "team2";

    tableById[id1].pts += s1;
    tableById[id1].bal += s1 - s2;
    tableById[id1].played += 1;
    if (win1) tableById[id1].w += 1;

    tableById[id2].pts += s2;
    tableById[id2].bal += s2 - s1;
    tableById[id2].played += 1;
    if (win2) tableById[id2].w += 1;
  });

  const finalGame = games.find((game) => game.roundName === "Final");
  const finalWinnerId = finalGame ? getGameWinnerId(finalGame, data) : null;
  const finalLoserId = finalGame ? getGameLoserId(finalGame, data) : null;

  if (finalWinnerId !== null && tableById[finalWinnerId]) tableById[finalWinnerId].parallelPosition = 1;
  if (finalLoserId !== null && tableById[finalLoserId]) tableById[finalLoserId].parallelPosition = 2;

  const criteria = getRankingCriteria(rankingCriteriaValue);

  return rows.sort((a, b) => {
    if (a.parallelPosition && b.parallelPosition) return a.parallelPosition - b.parallelPosition;
    if (a.parallelPosition) return -1;
    if (b.parallelPosition) return 1;

    for (const key of criteria.order) {
      const diff = b[key] - a[key];
      if (diff !== 0) return diff;
    }

    return a.name.localeCompare(b.name);
  });
}

function calculateMainCupPodium(data) {
  const games = data.brackets || [];

  const finalGame = games.find(
    (game) => game.phase === "main" && game.roundName === "Final"
  );

  const thirdPlaceGame = games.find(
    (game) => game.phase === "main" && game.roundName === "3º lugar"
  );

  if (!finalGame) return [];

  const resolvedFinal = resolveBracketGame(finalGame, games, data);
  const championId = getGameWinnerId(resolvedFinal, data);
  const runnerUpId = getGameLoserId(resolvedFinal, data);

  if (championId === null || runnerUpId === null) return [];

  const podium = [
    { position: "🏆 Campeão", name: getCupTeamName(data, championId) },
    { position: "🥈 Vice", name: getCupTeamName(data, runnerUpId) },
  ];

  if (thirdPlaceGame) {
    const resolvedThirdPlace = resolveBracketGame(thirdPlaceGame, games, data);
    const thirdId = getGameWinnerId(resolvedThirdPlace, data);

    if (thirdId !== null) {
      podium.push({ position: "🥉 3º lugar", name: getCupTeamName(data, thirdId) });
    }
  }

  return podium;
}

function calculateCupBracketPodium(data, phase) {
  const games = data.brackets || [];
  const finalGame = games.find(
    (game) => game.phase === phase && game.roundName === "Final"
  );
  const thirdPlaceGame = games.find((game) => (
    game.phase === phase && String(game.roundName || "").includes("3")
  ));

  if (!finalGame) return [];

  const resolvedFinal = resolveBracketGame(finalGame, games, data);
  const championId = getGameWinnerId(resolvedFinal, data);
  const runnerUpId = getGameLoserId(resolvedFinal, data);

  if (championId === null || runnerUpId === null) return [];

  const podium = [
    { position: "🏆 Campeão", name: getCupTeamName(data, championId) },
    { position: "🥈 Vice", name: getCupTeamName(data, runnerUpId) },
  ];

  if (thirdPlaceGame) {
    const resolvedThirdPlace = resolveBracketGame(thirdPlaceGame, games, data);
    const thirdId = getGameWinnerId(resolvedThirdPlace, data);

    if (thirdId !== null) {
      podium.push({ position: "🥉 3º lugar", name: getCupTeamName(data, thirdId) });
    }
  }

  return podium;
}

function calculateCopinhaConsolationPodium(data) {
  return calculateCupBracketPodium(data, "repechage");
}

function canUseSpeech() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function stopSpeech() {
  if (!canUseSpeech()) return;
  window.speechSynthesis.cancel();
}

function speakText(text) {
  if (!canUseSpeech()) {
    alert("Seu navegador não suporta chamada por voz.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

function cleanSpeechName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\+/g, " e ")
    .trim();
}

function formatTeamForSpeech(team) {
  if (!team || team.length === 0) return "equipe aguardando definição";

  return team
    .map((item) => cleanSpeechName(item))
    .filter(Boolean)
    .join(" e ");
}

function getGameSpeechText(game, options = {}) {
  const {
    roundLabel = "",
    includeIntro = true,
    includeGroup = true,
    includeClosing = true,
  } = options;

  const groupText = includeGroup && game.groupName ? `${game.groupName}. ` : "";
  const roundText = roundLabel ? `${roundLabel}. ` : "";
  const team1 = formatTeamForSpeech(game.team1);
  const team2 = formatTeamForSpeech(game.team2);

  return [
    includeIntro ? "Atenção atletas." : "",
    roundText,
    groupText,
    `Quadra ${game.court}.`,
    `${team1} contra ${team2}.`,
    includeClosing ? `Compareçam à quadra ${game.court}. Boa partida.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function repeatText(text, times = 1) {
  return Array.from({ length: Number(times) || 1 }, () => text).join(" ");
}

function speakGame(game, options = {}) {
  const { repeat = 1 } = options;

  const text = getGameSpeechText(game, {
    ...options,
    includeIntro: true,
    includeClosing: true,
  });

  speakText(repeatText(text, repeat));
}

function speakRound(round, roundIndex, options = {}) {
  const {
    titlePrefix = "Rodada",
    includeGroup = true,
    repeat = 1,
  } = options;

  const roundLabel = `${titlePrefix} ${roundIndex + 1}`;

  const gamesText = round
    .map((game) => {
      const gameText = getGameSpeechText(game, {
        includeIntro: false,
        includeClosing: false,
        includeGroup,
      });

      return repeatText(gameText, repeat);
    })
    .join(" ");

  speakText(
    `Atenção atletas. ${roundLabel} iniciando. ${gamesText} Compareçam às suas quadras. Boa partida.`
  );
}

function speakBracketRound(round, repeat = 1) {
  const title = round.bracketTitle
    ? `${round.title} da chave ${round.bracketTitle}`
    : round.title;

  const gamesText = round.games
    .map((game) => {
      const gameText = getGameSpeechText(game, {
        includeIntro: false,
        includeClosing: false,
        includeGroup: false,
      });

      return repeatText(gameText, repeat);
    })
    .join(" ");

  speakText(
    `Atenção atletas. ${title} iniciando. ${gamesText} Compareçam às suas quadras. Boa partida.`
  );
}

function NoticeModal({ notice, onClose }) {
  if (!notice) return null;

  const icon = {
    success: "✅",
    error: "⚠️",
    info: "ℹ️",
    warning: "⚠️",
  }[notice.type || "info"];

  return (
    <div className="confirmOverlay">
      <div className={`confirmBox noticeBox ${notice.type || "info"}`}>
        <div className="confirmIcon">{icon}</div>
        <h2>{notice.title}</h2>
        <p>{notice.message}</p>

        <div className="confirmActions">
          <button type="button" onClick={onClose}>Entendi</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ target, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div className="confirmOverlay">
      <div className="confirmBox">
        <div className="confirmIcon">⚠️</div>
        <h2>Mover para a lixeira?</h2>

        <p>
          O torneio <strong>{target.name}</strong> será movido para a lixeira e
          poderá ser recuperado em até 30 dias.
        </p>

        <div className="confirmActions">
          <button type="button" className="cancelBtn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="deleteBtn" onClick={onConfirm}>Mover para lixeira</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmClearScoresModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="confirmOverlay">
      <div className="confirmBox">
        <div className="confirmIcon">🧹</div>
        <h2>Apagar somente os placares?</h2>

        <p>
          Todos os placares preenchidos deste campeonato serão apagados. A tabela
          e os participantes serão mantidos.
        </p>

        <div className="confirmActions">
          <button type="button" className="cancelBtn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="deleteBtn" onClick={onConfirm}>Sim, apagar</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmClearTableModal({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="confirmOverlay">
      <div className="confirmBox">
        <div className="confirmIcon">🗑️</div>
        <h2>Apagar todos os jogos e placares?</h2>

        <p>
          Os participantes serão mantidos, mas todos os jogos, rodadas, placares
          e chaves deste torneio serão removidos.
        </p>

        <div className="confirmActions">
          <button type="button" className="cancelBtn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="deleteBtn" onClick={onConfirm}>Sim, apagar tudo</button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ title, tag, badge, price, text, items }) {
  return (
    <div className="planCard">
      {badge && <div className="planBadge">{badge}</div>}

      <div className="planTop">
        <h3>{title}</h3>
        <span>{tag}</span>
      </div>

      <div className="planPrice">
        <strong>{price}</strong>
        <small>/mês</small>
      </div>

      <p className="planDesc">{text}</p>

      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Info({ title, text }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="modalityInfoCard">
      <div className="modalityInfoTop">
        <strong>{title}</strong>

        <button
          type="button"
          className="explainBtn"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Fechar" : "Como funciona?"}
        </button>
      </div>

      {open && (
        <div className="modalityExplainBox">
          <p>{text}</p>
        </div>
      )}
    </div>
  );
}

function CupPodiumView({ podium, title = "Principal", variant = "main" }) {
  if (!podium || podium.length === 0) return null;

  return (
    <div className={`cupPodiumBox ${variant === "parallel" ? "parallelPodiumBox" : "mainPodiumBox"}`}>
      <h3>Pódio da {title}</h3>

      <div className="cupPodiumGrid">
        {podium.map((item) => (
          <div className="cupPodiumItem" key={item.position}>
            <strong>{item.position}</strong>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const publicId = new URLSearchParams(window.location.search).get("public");

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authFlow, setAuthFlow] = useState(() => getAuthFlowFromLocation());
  const [authCallbackError, setAuthCallbackError] = useState(() => getAuthCallbackError());
  const [authNotice, setAuthNotice] = useState(null);
  const activeUserIdRef = useRef(null);

  async function reconcileOwnProfile() {
    const { error } = await supabase.rpc("reconcile_my_profile");

    // A função existe na correção de banco desta atualização. Enquanto ela
    // ainda não tiver sido aplicada, o restante do fluxo continua funcionando
    // normalmente e não exibe um erro técnico para o organizador.
    if (error && !/reconcile_my_profile|function.*does not exist/i.test(`${error.message || ""} ${error.code || ""}`)) {
      console.warn("Não foi possível concluir a preparação do perfil:", error);
    }
  }

  async function loadProfile(userId, { waitForAccess = false } = {}) {
    const attempts = waitForAccess ? 6 : 1;
    let lastProfile = null;

    if (waitForAccess) {
      await reconcileOwnProfile();
    }

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar perfil:", error);

        if (!waitForAccess || attempt === attempts - 1) {
          if (!lastProfile) setProfile(null);
          return lastProfile;
        }
      } else if (data) {
        lastProfile = data;
        setProfile(data);

        const status = String(data.status || "").toLowerCase();
        const isStableProfile =
          status === "active" ||
          status === "blocked" ||
          status === "expired" ||
          isProfilePendingEmailConfirmation(data);

        if (!waitForAccess || isStableProfile || attempt === attempts - 1) {
          return data;
        }
      } else if (!waitForAccess) {
        setProfile(null);
        return null;
      }

      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setProfile(lastProfile);
    return lastProfile;
  }

  async function refreshProfile() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.error("Não foi possível atualizar a sessão:", error);
      return null;
    }

    setSession((current) => (current ? { ...current, user: data.user } : current));
    activeUserIdRef.current = data.user.id;

    const accountType = getUserAccountType(data.user);
    if (accountType !== ACCOUNT_TYPE_ORGANIZER) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    const nextProfile = await loadProfile(data.user.id, { waitForAccess: true });
    setLoading(false);
    return nextProfile;
  }

  async function endRecoveryFlow(nextNotice = null, scope = "local") {
    try {
      await supabase.auth.signOut({ scope });
    } catch (error) {
      console.error("Não foi possível encerrar a sessão de recuperação:", error);
    } finally {
      clearAuthCallbackUrl();
      activeUserIdRef.current = null;
      setSession(null);
      setProfile(null);
      setAuthFlow(null);
      setAuthCallbackError(null);
      setAuthNotice(nextNotice);
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const callbackError = getAuthCallbackError();
      const callbackFlow = callbackError ? null : getAuthFlowFromLocation();

      if (callbackError) {
        setAuthCallbackError(callbackError);
        clearAuthCallbackUrl();
      }

      setAuthFlow(callbackFlow);

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      let currentSession = data.session;
      if (currentSession?.user && !getUserAccountType(currentSession.user)) {
        const { data: currentUserData } = await supabase.auth.getUser();
        if (currentUserData?.user) currentSession = { ...currentSession, user: currentUserData.user };
      }

      setSession(currentSession);
      activeUserIdRef.current = currentSession?.user?.id || null;

      // A recuperação tem prioridade sobre qualquer Dashboard: o token desse
      // link só pode ser usado para trocar a senha.
      if (callbackFlow === "recovery") {
        setLoading(false);
        return;
      }

      if (currentSession?.user?.id && getUserAccountType(currentSession.user) === ACCOUNT_TYPE_ORGANIZER) {
        await loadProfile(currentSession.user.id, { waitForAccess: true });
      }

      if (!active) return;

      if (callbackFlow === "confirm" && currentSession?.user?.email_confirmed_at) {
        clearAuthCallbackUrl();
        setAuthFlow(null);
      }

      setLoading(false);
    }

    async function handleAuthEvent(event, newSession) {
      if (!active) return;

      const previousUserId = activeUserIdRef.current;
      const nextUserId = newSession?.user?.id || null;
      setSession(newSession);

      if (event === "PASSWORD_RECOVERY") {
        activeUserIdRef.current = nextUserId;
        setAuthCallbackError(null);
        setAuthNotice(null);
        setAuthFlow("recovery");
        setLoading(false);
        return;
      }

      // A renovação automática de token acontece ao voltar para a aba. Ela
      // não deve desmontar o Dashboard, pois isso apagava as abas abertas.
      if (event === "TOKEN_REFRESHED" && previousUserId === nextUserId) return;

      if (!nextUserId) {
        activeUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      activeUserIdRef.current = nextUserId;
      const isSameUser = previousUserId === nextUserId;

      if (isSameUser) {
        if (event === "USER_UPDATED") {
          if (getUserAccountType(newSession?.user) === ACCOUNT_TYPE_ORGANIZER) {
            await loadProfile(nextUserId, { waitForAccess: true });
          }

          if (getAuthFlowFromLocation() === "confirm" && newSession?.user?.email_confirmed_at) {
            clearAuthCallbackUrl();
            setAuthFlow(null);
          }
        }
        return;
      }

      setLoading(true);
      if (getUserAccountType(newSession?.user) !== ACCOUNT_TYPE_ORGANIZER) {
        setProfile(null);
      } else {
        await loadProfile(nextUserId, { waitForAccess: true });
      }

      if (!active) return;

      if (getAuthFlowFromLocation() === "confirm" && newSession?.user?.email_confirmed_at) {
        clearAuthCallbackUrl();
        setAuthFlow(null);
      }

      setLoading(false);
    }

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      void handleAuthEvent(event, newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (publicId) return <PublicTournamentPage publicId={publicId} />;

  if (loading) {
    return (
      <div className="loadingPage">
        <div className="loadingCard">
          <div className="loadingSpinner" aria-hidden="true" />
          <p>Carregando Torneio 360...</p>
        </div>
      </div>
    );
  }

  if (authFlow === "recovery") {
    return (
      <Login
        key="password-recovery"
        initialMode="resetPassword"
        recoverySession={session}
        onRecoveryFinished={(notice) => endRecoveryFlow(notice, "global")}
        onRecoveryExit={() => endRecoveryFlow()}
      />
    );
  }

  if (!session) {
    return (
      <Login
        key="guest-login"
        initialMode={authCallbackError ? "forgotPassword" : "login"}
        initialNotice={authCallbackError || authNotice}
      />
    );
  }

  const accountType = getUserAccountType(session.user);

  if (accountType === ACCOUNT_TYPE_ATHLETE) {
    return <AthleteDashboard user={session.user} supabase={supabase} onLogout={logout} logoSrc={TORNEIO360_LOGO} />;
  }

  if (accountType !== ACCOUNT_TYPE_ORGANIZER) {
    return <ProfileUnavailable onRetry={refreshProfile} />;
  }

  if (!profile) {
    return <ProfileUnavailable onRetry={refreshProfile} />;
  }

  if (isProfilePendingEmailConfirmation(profile)) {
    return (
      <EmailConfirmationPending
        email={session.user?.email}
        onRefresh={refreshProfile}
      />
    );
  }

  const today = getBrazilTodayISO();
  const expired = Boolean(profile.expires_at && profile.expires_at < today);
  const hasActivePeriod = !profile.expires_at || profile.expires_at >= today;
  const status = String(profile.status || "").toLowerCase();
  const isActive = status === "active";
  const isExplicitlyBlocked = ["blocked", "suspended", "inactive", "expired"].includes(status);

  if (!isActive && !expired && !isExplicitlyBlocked) {
    return <AccessPreparing onRetry={refreshProfile} />;
  }

  if (expired || !isActive || !hasActivePeriod) return <Blocked profile={profile} />;

  return <Dashboard profile={profile} user={session.user} onProfileChange={setProfile} />;
}


function BeachLogo({ variant = "light" } = {}) {
  const logoSrc = variant === "blue" ? TORNEIO360_LOGO_BLUE : TORNEIO360_LOGO;

  return (
    <div className={`beachLogo torneio360Logo ${variant === "blue" ? "torneio360LogoBlue" : ""}`} aria-label="Torneio 360">
      <img src={logoSrc} alt="Torneio 360" />
    </div>
  );
}

function PublicPortalHeader({ active = "inicio", onNavigate, onLogin, onSignup }) {
  const links = [
    ["inicio", "Início"],
    ["torneios", "Torneios"],
    ["circuitos", "Circuitos"],
    ["arenas", "Arenas"],
    ["publicacoes", "Publicações"],
  ];

  return (
    <header className="figmaPublicHeader">
      <button type="button" className="figmaPublicBrand" onClick={() => onNavigate?.("inicio")} aria-label="Ir para o início">
        <BeachLogo />
      </button>
      <nav aria-label="Navegação pública">
        {links.map(([key, label]) => (
          <button key={key} type="button" className={active === key ? "active" : ""} onClick={() => onNavigate?.(key)}>{label}</button>
        ))}
      </nav>
      <label className="figmaPublicSearch">
        <Search aria-hidden="true" />
        <input placeholder="Buscar torneios..." aria-label="Buscar torneios" />
      </label>
      <button type="button" className="figmaPublicTheme" aria-label="Alternar aparência"><Sun aria-hidden="true" /></button>
      <button type="button" className="figmaPublicLogin" onClick={onLogin}>Entrar</button>
      <button type="button" className="figmaPublicSignup" onClick={onSignup}>Criar perfil gratuito</button>
    </header>
  );
}

function PublicPortalFooter() {
  return (
    <footer className="figmaPublicFooter">
      <BeachLogo />
      <div>
        <strong>Acompanhamento público gerado pela plataforma.</strong>
        <span>Torneio360 © 2026. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}

function FigmaPublicHome({ onNavigate, onLogin, onSignup }) {
  const [publicTournaments, setPublicTournaments] = useState([]);
  const [publicArenas, setPublicArenas] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadPublicPortalData() {
      const [tournamentResult, arenaResult] = await Promise.all([
        supabase.rpc("list_public_tournaments", { p_limit: 3 }),
        supabase.from("profiles").select("id, name, arena_name, city, state, photo_url, is_public").eq("is_public", true).order("arena_name", { ascending: true }).limit(4),
      ]);

      if (!active) return;
      if (!tournamentResult.error) setPublicTournaments((tournamentResult.data || []).filter((item) => !item.data?.deletedAt));
      if (!arenaResult.error) setPublicArenas(arenaResult.data || []);
    }

    void loadPublicPortalData();
    return () => { active = false; };
  }, []);

  const visibleTournaments = publicTournaments.slice(0, 2);
  const visibleArenas = publicArenas.slice(0, 4);

  return (
    <div className="figmaPublicPage">
      <PublicPortalHeader active="inicio" onNavigate={onNavigate} onLogin={onLogin} onSignup={onSignup} />
      <main>
        <section className="figmaPublicHero">
          <div className="figmaPublicHeroInner">
            <span className="figmaPublicHeroBadge">A PLATAFORMA OFICIAL DE GESTÃO</span>
            <h1>Sua jornada esportiva começa <em>aqui</em></h1>
            <p>Acompanhe torneios, resultados, rankings, atletas e arenas em um só lugar.<br />Tenha o seu perfil esportivo oficial gratuito.</p>
            <div className="figmaPublicHeroActions">
              <button type="button" className="primary" onClick={() => document.getElementById("torneios-publicos")?.scrollIntoView({ behavior: "smooth" })}><Search aria-hidden="true" /> Encontrar torneios</button>
              <button type="button" className="secondary" onClick={onSignup}>Criar perfil gratuito</button>
            </div>
            <button type="button" className="figmaOrganizerLink" onClick={onLogin}>Sou organizador de torneios <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <div className="figmaPublicSections">
          <section id="torneios-publicos" className="figmaPublicSection">
            <div className="figmaPublicSectionHeader">
              <div><h2><span className="pulse" />Acontecendo agora</h2><p>Torneios ativos e com partidas em andamento.</p></div>
              <button type="button" onClick={() => onNavigate?.("torneios")}>Ver todos <span>›</span></button>
            </div>
            {visibleTournaments.length ? (
              <div className="figmaPublicTournamentGrid">
                {visibleTournaments.map((tournament) => {
                  const details = tournament.data || {};
                  const uiStatus = getTournamentUiStatus(tournament);
                  const uiStatusKey = uiStatus === "Em andamento" ? "in_progress" : uiStatus === "Inscrições abertas" ? "open" : uiStatus === "Encerrado" ? "closed" : "scheduled";
                  return (
                    <article className="figmaPublicTournamentCard" key={tournament.id}>
                      <div className="figmaPublicTournamentCover">
                        {details.coverImage ? <img src={details.coverImage} alt="" /> : null}
                        <span className={`status ${uiStatusKey}`}>{uiStatus}</span>
                      </div>
                      <div className="figmaPublicTournamentBody">
                        <small>⌁ {getSportDefinition(details.sport || DEFAULT_SPORT_ID).name} • {details.gender || normalizeModalityName(tournament.type)}</small>
                        <h3>{details.eventName || tournament.name}</h3>
                        <p><MapPin aria-hidden="true" /> {details.location || "Local a confirmar"}</p>
                        <p><CalendarDays aria-hidden="true" /> {details.eventPeriodLabel || (details.eventDate ? formatDateBR(details.eventDate) : "Data a confirmar")}</p>
                        <button type="button" onClick={() => tournament.public_id && window.location.assign(`/?public=${tournament.public_id}`)}>{uiStatusKey === "in_progress" ? "Acompanhar" : "Ver detalhes"}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <div className="figmaPublicEmpty">Nenhum torneio público disponível neste momento.</div>}
          </section>

          <section className="figmaPublicSection">
            <div className="figmaPublicSectionHeader"><div><h2>Arenas perto de você</h2><p>Descubra os melhores locais e organizadores da sua região.</p></div></div>
            {visibleArenas.length ? (
              <div className="figmaPublicArenaGrid">
                {visibleArenas.map((arena) => (
                  <article className="figmaPublicArenaCard" key={arena.id}>
                    <div className="figmaPublicArenaAvatar">{arena.photo_url ? <img src={arena.photo_url} alt="" /> : <span>{(arena.arena_name || arena.name || "A").slice(0, 2).toUpperCase()}</span>}</div>
                    <h3>{arena.arena_name || arena.name || "Arena Torneio360"}</h3>
                    <p><MapPin aria-hidden="true" /> {[arena.city, arena.state].filter(Boolean).join(", ") || "Local não informado"}</p>
                    <div><span>Perfil oficial</span><strong>Ver arena</strong></div>
                  </article>
                ))}
              </div>
            ) : <div className="figmaPublicEmpty">As arenas públicas aparecerão aqui.</div>}
          </section>
        </div>
      </main>
      <PublicPortalFooter />
    </div>
  );
}


function EmailConfirmationPending({ email, onRefresh }) {
  const [notice, setNotice] = useState(null);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email || resending || cooldown > 0) return;

    setResending(true);
    try {
      const { error } = await resendEmailConfirmation(email);

      if (error) {
        setNotice({
          type: "error",
          title: "Não foi possível reenviar",
          message: getAuthErrorMessage(error, "Tente novamente em alguns minutos."),
        });
        return;
      }

      setCooldown(60);
      setNotice({
        type: "success",
        title: "E-mail reenviado",
        message: "Abra o link recebido para confirmar seu endereço e iniciar os 7 dias grátis.",
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        title: "Não foi possível reenviar",
        message: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setResending(false);
    }
  }

  async function handleCheck() {
    if (checking) return;

    setChecking(true);
    try {
      const nextProfile = await onRefresh();

      if (!nextProfile || isProfilePendingEmailConfirmation(nextProfile)) {
        setNotice({
          type: "warning",
          title: "Confirmação ainda pendente",
          message: "Depois de abrir o link no e-mail, toque em “Já confirmei meu e-mail” novamente.",
        });
      }
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        title: "Não foi possível atualizar",
        message: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="authStatusPage">
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />

      <section className="authStatusCard" aria-labelledby="email-confirmation-title">
        <div className="authStatusIcon" aria-hidden="true">✉️</div>
        <span className="authStatusEyebrow">Confirmação necessária</span>
        <h1 id="email-confirmation-title">Confirme seu e-mail</h1>
        <p>
          Enviamos um link de confirmação para <strong>{email || "seu e-mail"}</strong>. O teste Premium de {TRIAL_DAYS} dias só começa depois dessa confirmação.
        </p>

        <div className="authStatusActions">
          <button type="button" onClick={handleCheck} disabled={checking}>
            {checking ? "Conferindo..." : "Já confirmei meu e-mail"}
          </button>
          <button type="button" className="secondaryBtn" onClick={handleResend} disabled={resending || cooldown > 0}>
            {resending ? "Reenviando..." : cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar confirmação"}
          </button>
        </div>

        <button type="button" className="linkBtn authStatusSignOut" onClick={logout}>
          Sair da conta
        </button>
      </section>
    </div>
  );
}


function ProfileUnavailable({ onRetry }) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="authStatusPage">
      <section className="authStatusCard" aria-labelledby="profile-unavailable-title">
        <div className="authStatusIcon" aria-hidden="true">⏳</div>
        <span className="authStatusEyebrow">Conta em preparação</span>
        <h1 id="profile-unavailable-title">Estamos preparando seu acesso</h1>
        <p>
          Sua conta foi identificada, mas o perfil ainda não ficou disponível. Isso costuma levar apenas alguns segundos.
        </p>

        <div className="authStatusActions">
          <button type="button" onClick={handleRetry} disabled={retrying}>
            {retrying ? "Conferindo..." : "Tentar novamente"}
          </button>
        </div>

        <button type="button" className="linkBtn authStatusSignOut" onClick={logout}>
          Sair da conta
        </button>
      </section>
    </div>
  );
}


function Login({
  initialMode = "login",
  initialNotice = null,
  recoverySession = null,
  onRecoveryFinished,
  onRecoveryExit,
} = {}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState(() => window.location.pathname.toLowerCase() === "/cadastro" ? "signup" : initialMode);
  const [accountType, setAccountType] = useState(ACCOUNT_TYPE_ATHLETE);
  const [notice, setNotice] = useState(() => {
    if (!initialNotice) return null;
    return typeof initialNotice === "string"
      ? { type: "error", title: "Link inválido ou expirado", message: initialNotice }
      : initialNotice;
  });
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [guestScreen, setGuestScreen] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    return path === "/login" || path === "/cadastro" || initialMode !== "login" ? "auth" : "home";
  });

  useEffect(() => {
    function handleGuestPopState() {
      const path = window.location.pathname.toLowerCase();
      setGuestScreen(path === "/login" || path === "/cadastro" ? "auth" : "home");
      if (path === "/cadastro") setMode("signup");
      if (path === "/login") setMode("login");
    }

    window.addEventListener("popstate", handleGuestPopState);
    return () => window.removeEventListener("popstate", handleGuestPopState);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timer = setTimeout(() => setResendCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (mode !== "resetPassword") return undefined;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("acesso")?.scrollIntoView({ behavior: "auto", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setEmail("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function changeMode(nextMode) {
    if (mode === "resetPassword" && onRecoveryExit) {
      void onRecoveryExit();
      return;
    }

    setNotice(null);
    setMode(nextMode);
  }

  function openGuestAuth(nextMode = "login") {
    changeMode(nextMode);
    setGuestScreen("auth");
    window.history.pushState({}, "", nextMode === "signup" ? "/cadastro" : "/login");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openGuestHome(section = "inicio") {
    setGuestScreen("home");
    window.history.pushState({}, "", "/");
    if (section !== "inicio") {
      window.setTimeout(() => {
        const target = section === "arenas" ? document.querySelector(".figmaPublicArenaGrid") : document.getElementById("torneios-publicos");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  async function handleResendVerification() {
    const emailToResend = normalizeEmail(pendingVerificationEmail || email);
    if (!emailToResend || resendCooldown > 0) return;

    setSubmitting(true);
    try {
      const { error } = await resendEmailConfirmation(emailToResend);

      if (error) {
        showNotice("error", "Não foi possível reenviar", getAuthErrorMessage(error, "Tente novamente em alguns minutos."));
        return;
      }

      setResendCooldown(60);
      showNotice("success", "E-mail reenviado", "Confira sua caixa de entrada e abra o link para iniciar os 7 dias grátis.");
    } catch (error) {
      console.error(error);
      showNotice("error", "Não foi possível reenviar", "Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (submitting) return;

    const normalizedEmail = normalizeEmail(email);

    if (mode === "resetPassword") {
      if (!recoverySession?.access_token) {
        showNotice("error", "Link inválido ou expirado", "Peça um novo link de recuperação para trocar sua senha.");
        return;
      }

      if (!newPassword) {
        showNotice("warning", "Nova senha obrigatória", "Digite sua nova senha para continuar.");
        return;
      }

      if (newPassword.length < 8) {
        showNotice("warning", "Senha muito curta", "Use pelo menos 8 caracteres na nova senha.");
        return;
      }

      if (newPassword !== confirmPassword) {
        showNotice("warning", "Senhas diferentes", "Repita exatamente a nova senha para confirmar.");
        return;
      }
    } else {
      if (!normalizedEmail) {
        showNotice("warning", "E-mail obrigatório", "Informe seu e-mail para continuar.");
        return;
      }

      if (!isValidEmail(normalizedEmail)) {
        showNotice("warning", "E-mail inválido", "Informe um e-mail válido para continuar.");
        return;
      }

      if (mode !== "forgotPassword" && !password) {
        showNotice("warning", "Senha obrigatória", "Digite sua senha para continuar.");
        return;
      }

      if (mode === "signup") {
        if (!firstName.trim()) {
          showNotice("warning", "Nome obrigatório", "Informe seu nome para criar a conta.");
          return;
        }

        if (!lastName.trim()) {
          showNotice("warning", "Sobrenome obrigatório", "Informe seu sobrenome para criar a conta.");
          return;
        }

        if (!birthDate) {
          showNotice("warning", "Data de nascimento obrigatória", "Informe sua data de nascimento.");
          return;
        }

        if (birthDate > getBrazilTodayISO()) {
          showNotice("warning", "Data de nascimento inválida", "A data de nascimento não pode estar no futuro.");
          return;
        }

        if (password.length < 8) {
          showNotice("warning", "Senha muito curta", "Use uma senha com pelo menos 8 caracteres.");
          return;
        }

        if (password !== confirmPassword) {
          showNotice("warning", "Senhas diferentes", "Repita exatamente a senha para confirmar.");
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      if (mode === "forgotPassword") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: getAuthRedirectUrl("recovery"),
        });

        if (error) {
          showNotice("error", "Não foi possível enviar", getAuthErrorMessage(error, "Tente novamente em alguns minutos."));
        } else {
          showNotice(
            "success",
            "Confira seu e-mail",
            "Se existir uma conta para esse endereço, você receberá um link para criar uma nova senha."
          );
          setMode("login");
        }
        return;
      }

      if (mode === "resetPassword") {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
          showNotice("error", "Link inválido ou expirado", "Peça um novo link de recuperação para trocar sua senha.");
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
          showNotice("error", "Senha não alterada", getAuthErrorMessage(error, "Abra novamente o link recebido por e-mail e tente de novo."));
        } else {
          resetForm();
          await onRecoveryFinished?.({
            type: "success",
            title: "Senha alterada",
            message: "Sua senha foi alterada. Entre com a nova senha para continuar.",
          });
        }
        return;
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          if (isEmailNotConfirmedError(error)) {
            setPendingVerificationEmail(normalizedEmail);
            showNotice(
              "warning",
              "Confirme seu e-mail",
              "Abra o link enviado para seu e-mail antes de entrar. Se precisar, reenviamos a confirmação abaixo."
            );
          } else {
            showNotice("error", "Não foi possível entrar", "Confira o e-mail e a senha informados e tente novamente.");
          }
        }
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl("confirm"),
          data: {
            name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            birth_date: birthDate,
            account_type: accountType,
          },
        },
      });

      if (error) {
        console.error(error);
        showNotice("error", "Cadastro não concluído", getAuthErrorMessage(error, "Verifique os dados e tente novamente."));
        return;
      }

      const existingAccountResponse = Array.isArray(data?.user?.identities) && data.user.identities.length === 0;
      const confirmationRequired = !data?.session;

      setPendingVerificationEmail(normalizedEmail);
      resetForm();
      setMode("login");
      showNotice(
        "success",
        confirmationRequired || existingAccountResponse ? "Confira seu e-mail" : "Conta criada",
        confirmationRequired || existingAccountResponse
          ? accountType === ACCOUNT_TYPE_ATHLETE
            ? "Enviamos um link de confirmação. Abra-o para ativar gratuitamente seu perfil de atleta."
            : "Enviamos um link de confirmação. Abra-o para ativar sua conta de organizador e iniciar o período de avaliação."
          : accountType === ACCOUNT_TYPE_ATHLETE
            ? "Seu perfil gratuito de atleta foi criado."
            : "Sua conta de organizador foi criada e o período de avaliação já está ativo."
      );
    } catch (error) {
      console.error(error);
      showNotice("error", "Não foi possível concluir", "Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (guestScreen === "home" && mode !== "resetPassword" && mode !== "forgotPassword") {
    return <FigmaPublicHome onNavigate={openGuestHome} onLogin={() => openGuestAuth("login")} onSignup={() => openGuestAuth("signup")} />;
  }

  return (
    <div className="figmaPublicPage figmaAuthPage">
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
      <PublicPortalHeader onNavigate={openGuestHome} onLogin={() => openGuestAuth("login")} onSignup={() => openGuestAuth("signup")} />
      <main className="figmaAuthMain">
        <section className="figmaAuthCard" aria-labelledby="figma-auth-title">
          <div className="figmaAuthIcon" aria-hidden="true"><Trophy /></div>
          <h1 id="figma-auth-title">
            {mode === "login" ? "Entrar no Torneio360" : mode === "signup" ? "Escolha o seu perfil" : mode === "forgotPassword" ? "Recuperar senha" : "Criar nova senha"}
          </h1>
          <p>{mode === "login" ? "Acesse sua conta de organizador ou atleta." : mode === "signup" ? "Cada tipo de conta possui permissões próprias e seguras." : mode === "forgotPassword" ? "Informe seu e-mail para receber o link de recuperação." : "Escolha uma nova senha segura para a sua conta."}</p>

          {mode === "signup" ? (
            <div className="accountTypeChooser" role="tablist" aria-label="Tipo de perfil">
              <button type="button" role="tab" aria-selected={accountType === ACCOUNT_TYPE_ORGANIZER} className={accountType === ACCOUNT_TYPE_ORGANIZER ? "active organizer" : "organizer"} onClick={() => setAccountType(ACCOUNT_TYPE_ORGANIZER)}>
                <span className="accountTypeIcon" aria-hidden="true">{"\uD83C\uDFC6"}</span>
                <strong>Organizador</strong>
                <small>Versão paga · Gestão completa</small>
              </button>
              <button type="button" role="tab" aria-selected={accountType === ACCOUNT_TYPE_ATHLETE} className={accountType === ACCOUNT_TYPE_ATHLETE ? "active athlete" : "athlete"} onClick={() => setAccountType(ACCOUNT_TYPE_ATHLETE)}>
                <span className="accountTypeIcon" aria-hidden="true">{"\uD83C\uDFBE"}</span>
                <strong>Atleta</strong>
                <small>Gratuito · Perfil e inscrições</small>
              </button>
              <div className="accountTypeDescription">
                {accountType === ACCOUNT_TYPE_ORGANIZER
                  ? "Crie e edite torneios, organize grupos, partidas, rankings e valide conquistas dos atletas."
                  : "Monte seu perfil, escolha a privacidade, acompanhe resultados e inscreva-se em torneios publicados."}
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            {mode === "signup" ? (
              <div className="figmaAuthTwoCols">
                <label><span>NOME</span><input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Seu nome" /></label>
                <label><span>SOBRENOME</span><input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Seu sobrenome" /></label>
                <label className="full"><span>DATA DE NASCIMENTO</span><input type="date" autoComplete="bday" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
              </div>
            ) : null}

            {mode !== "resetPassword" ? (
              <label><span>E-MAIL</span><input type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label>
            ) : null}

            {mode === "resetPassword" ? (
              <>
                <label><span>NOVA SENHA</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
                <label><span>REPITA A NOVA SENHA</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita a nova senha" /></label>
              </>
            ) : mode !== "forgotPassword" ? (
              <>
                <label className="figmaPasswordLabel">
                  <span>SENHA {mode === "login" ? <button type="button" onClick={() => changeMode("forgotPassword")}>Esqueci a senha</button> : null}</span>
                  <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
                </label>
                {mode === "signup" ? <label><span>REPITA A SENHA</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repita a senha" /></label> : null}
              </>
            ) : null}

            <button type="submit" className="figmaAuthSubmit" disabled={submitting || (mode === "resetPassword" && !recoverySession?.access_token)}>
              {submitting ? "Aguarde..." : mode === "login" ? "↪  Entrar na conta" : mode === "signup" ? accountType === ACCOUNT_TYPE_ATHLETE ? "Criar perfil gratuito de atleta" : "Criar perfil de organizador" : mode === "forgotPassword" ? "Enviar link" : "Salvar nova senha"}
            </button>
            {(mode === "forgotPassword" || mode === "resetPassword") ? <button type="button" className="figmaAuthBack" onClick={() => changeMode("login")}>Voltar para o login</button> : null}
          </form>

          {mode === "login" ? (
            <div className="figmaAuthAlternate">
              <span>Ainda não tem um perfil?</span>
              <button type="button" onClick={() => openGuestAuth("signup")}>Criar perfil gratuito de atleta</button>
            </div>
          ) : mode === "signup" ? (
            <div className="figmaAuthAlternate"><span>Já possui uma conta?</span><button type="button" onClick={() => openGuestAuth("login")}>Entrar</button></div>
          ) : null}
        </section>
      </main>
      <PublicPortalFooter />
    </div>
  );

  return (
    <div className="landingPage">
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />

      <header className="landingHeader">
        <div className="landingBrand">
          <BeachLogo />
          <div className="brandTaglineOnly">
            <span>{TORNEIO360_TAGLINE}</span>
          </div>
        </div>

        <nav className="landingNav">
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <a href="#modalidades">Modalidades</a>
        </nav>

        <div className="landingHeaderActions">
          <button
            type="button"
            className="secondaryBtn"
            onClick={() => {
              changeMode("login");
              setTimeout(() => {
                document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              changeMode("signup");
              setTimeout(() => {
                document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
          >
            Criar conta
          </button>
        </div>
      </header>

      <main>
        <section className="landingHero">
          <div className="heroContent">
            <div className="heroBadge">
              🎾 Gestão de torneios com cara de arena profissional
            </div>

            <h1>Sua arena com torneios, rankings e experiência profissional</h1>

            <p>
              Monte torneios de Beach Tennis com visual moderno, controle de jogos, rankings automáticos, chamada por voz e uma área pública pronta para encantar atletas e organizadores.
            </p>

            <div className="heroActions">
              <button
                type="button"
                onClick={() => {
                  changeMode("signup");
                  document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Começar agora
              </button>

              <button
                type="button"
                className="secondaryBtn"
                onClick={() => {
                  changeMode("login");
                  document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Já tenho conta
              </button>
            </div>

            <div className="heroHighlights">
              <span>🏟️ Gestão para arenas</span>
              <span>🏆 Torneios e copas</span>
              <span>📊 Ranking em tempo real</span>
            </div>
          </div>

          <div className="heroVisual">
            <div className="sandCard">
              <div className="sandSun"></div>

              <div className="racketMark">
                <span>🎾</span>
              </div>

              <div className="mockPanel">
                <div className="mockTop">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div className="mockTitle">Arena Central · Rodada 1</div>

                <div className="mockGame">
                  <strong>Quadra 1</strong>
                  <p>João + Pedro  4 x 2  Lucas + Marcos</p>
                </div>

                <div className="mockGame">
                  <strong>Quadra 2</strong>
                  <p>Ana + Carla  3 x 4  Júlia + Fernanda</p>
                </div>

                <button type="button" className="mockVoiceBtn">
                  🔊 Anunciar próximos jogos
                </button>
              </div>
            </div>
          </div>
        </section>

                <section id="como-funciona" className="landingSection">
          <div className="sectionIntro">
            <span>Como funciona</span>
            <h2>Da inscrição ao pódio, tudo em uma plataforma</h2>
            <p>
              A plataforma foi pensada para a realidade de quem organiza torneios de Beach Tennis e precisa de agilidade, clareza e apresentação profissional.
            </p>
          </div>

          <div className="stepsGrid">
            <div className="stepCard">
              <div>1</div>
              <h3>Cadastre a arena</h3>
              <p>Use sua conta para centralizar os torneios da arena, clube ou organizador.</p>
            </div>

            <div className="stepCard">
              <div>2</div>
              <h3>Escolha o formato</h3>
              <p>
                Selecione Super 8, Super 12, Super 16, Simples 8 ou Copas conforme a realidade do evento.
              </p>
            </div>

            <div className="stepCard">
              <div>3</div>
              <h3>Gere a tabela</h3>
              <p>Informe os participantes, sorteie nomes e deixe o sistema montar os jogos.</p>
            </div>

            <div className="stepCard">
              <div>4</div>
              <h3>Entregue uma experiência premium</h3>
              <p>Preencha placares, acompanhe rankings e anuncie jogos com aparência profissional.</p>
            </div>
          </div>
        </section>

        <section className="landingSection featuresSection">
          <div className="sectionIntro">
            <span>Recursos</span>
            <h2>Tudo que sua arena precisa para rodar campeonatos</h2>
          </div>

          <div className="featuresGrid">
            <div className="featureCard">
              <span>🎲</span>
              <h3>Sorteio automático</h3>
              <p>Embaralhe nomes e duplas com animação antes de gerar a tabela.</p>
            </div>

            <div className="featureCard">
              <span>📅</span>
              <h3>Tabelas automáticas</h3>
              <p>O sistema gera rodadas conforme o formato escolhido.</p>
            </div>

            <div className="featureCard">
              <span>📊</span>
              <h3>Ranking configurável</h3>
              <p>Escolha a ordem dos critérios entre vitórias, pontos e saldo de games.</p>
            </div>

            <div className="featureCard">
              <span>🔊</span>
              <h3>Chamada de jogos</h3>
              <p>Anuncie rodada, quadra e nomes dos atletas usando voz pelo navegador.</p>
            </div>

            <div className="featureCard">
              <span>💾</span>
              <h3>Salvamento automático</h3>
              <p>Os dados ficam salvos automaticamente na conta do organizador.</p>
            </div>

            <div className="featureCard">
              <span>🏆</span>
              <h3>Copa Premium</h3>
              <p>Formatos de Copa com 12, 18 ou 24 duplas, grupos, chaves finais e disputa paralela.</p>
            </div>
          </div>
        </section>

        <section id="planos" className="landingSection">
          <div className="sectionIntro">
            <span>Planos</span>
            <h2>Escolha o plano ideal para seus torneios</h2>
          </div>

          <div className="plansGrid plansGridThree landingPlans">
            <PlanCard
              title="Basic"
              tag="Entrada"
              price="R$ 19,90"
              text="Para começar com torneios mistos e Super 8."
              items={[
                "Super 8",
                "Super 10 Mista Aleatória",
                "Super 12 Mista Aleatória",
                "Super 16 Mista Aleatória",
                "Gerencie apenas 1 campeonato por vez",
                "Sorteio automático",
              ]}
            />

            <PlanCard
              title="Pro"
              tag="Organizador"
              badge="Mais usado"
              price="R$ 39,90"
              text="Para organizadores que precisam de modalidades com duplas fixas."
              items={[
                "Super 8",
                "Super 8 (Dupla Fixa)",
                "Super 10 Mista Aleatória",
                "Super 12 Mista Aleatória",
                "Super 16 Mista Aleatória",
                "Super 12 Mista Dupla Fixa",
                "Gerencie vários campeonatos ao mesmo tempo",
              ]}
            />

            <PlanCard
              title="Premium"
              tag="Completo"
              price="R$ 59,90"
              text="Para quem quer liberar todos os formatos disponíveis."
              items={[
                "Super 8",
                "Super 8 (Dupla Fixa)",
                "Super 10 Mista Aleatória",
                "Super 12 Mista Aleatória",
                "Super 16 Mista Aleatória",
                "Super 12 Mista Dupla Fixa",
                "Simples 8",
                "Copa - 12 ou 24 duplas",
                "Copa - 18 duplas",
                "Copa - 21 duplas",
                "Copinha - grupos de 3",
                "Gerencie vários campeonatos ao mesmo tempo",
              ]}
            />
          </div>
        </section>

        <section id="modalidades" className="landingSection">
          <div className="sectionIntro">
            <span>Modalidades</span>
            <h2>Formatos disponíveis na plataforma</h2>
            <p>Clique em “Como funciona?” para ver a explicação de cada formato.</p>
          </div>

          <div className="modalitiesGrid landingModalities">
            <Info
              title="Super 8"
              text="Formato individual com 8 participantes, ideal para torneios rápidos. Cada atleta joga com parceiros diferentes ao longo das rodadas, evitando que uma dupla fixa determine todo o resultado. O sistema monta os confrontos automaticamente, organiza as quadras, registra os placares e calcula o ranking individual. No final, vence quem tiver melhor desempenho geral conforme os critérios definidos, como vitórias, pontos e saldo de games."
            />

            <Info
              title="Super 8 (Dupla Fixa)"
              text="Formato com 8 duplas fixas, indicado para torneios maiores em que cada equipe permanece igual durante toda a competição. O sistema organiza os jogos entre as duplas, distribui as rodadas e registra os resultados. A classificação é por dupla, não individual. Conforme os placares são preenchidos, o ranking geral é atualizado com vitórias, pontos e saldo de games, ajudando o organizador a acompanhar quem está avançando melhor."
            />

            <Info
              title="Super 10 Mista Aleatória"
              text="Formato com 5 homens e 5 mulheres. São 5 rodadas, 2 jogos por rodada, e em cada rodada descansam 1 homem e 1 mulher. Todos jogam 4 partidas e descansam 1 vez. O ranking é separado masculino e feminino."
            />

            <Info
              title="Super 12 Mista Aleatória"
              text="Formato misto com 12 participantes: 6 homens e 6 mulheres. Primeiro, os atletas são cadastrados e sorteados. Depois, o sistema combina os participantes para formar duplas mistas em diferentes rodadas, mantendo equilíbrio entre homens e mulheres. Cada jogador participa de jogos com combinações variadas, e o desempenho é calculado individualmente. É uma boa opção para eventos sociais e competitivos com rotação de parceiros."
            />

            <Info
              title="Super 16 Mista Aleatória"
              text="Formato misto com 16 participantes: 8 homens e 8 mulheres. Funciona como uma versão maior do Super 12, com mais atletas, mais jogos e maior movimentação de quadras. O sistema monta as duplas mistas de forma organizada, distribui as partidas e permite preencher os placares rodada por rodada. O ranking é individual, ou seja, cada atleta pontua pelo próprio desempenho, mesmo jogando com parceiros diferentes durante o torneio."
            />

            <Info
              title="Super 12 Mista Dupla Fixa"
              text="Formato com 6 duplas já definidas antes do início do campeonato. Diferente das modalidades aleatórias, aqui os parceiros permanecem juntos do começo ao fim. O sistema gera automaticamente os confrontos entre as duplas, organiza a sequência de jogos e calcula a classificação geral pelos placares lançados. É indicado quando os atletas já se inscrevem em dupla e querem disputar como equipe fixa."
            />

            <Info
              title="Simples 8"
              text="Formato individual com 8 jogadores, sem formação de duplas. Cada atleta compete por conta própria, e o sistema monta a tabela de jogos automaticamente. É ideal para torneios de simples, desafios internos ou eventos menores. Os placares alimentam um ranking geral individual, permitindo acompanhar vitórias, pontos e saldo de games até definir os melhores colocados."
            />

            <Info
              title="Copa - 12 ou 24 duplas"
              text="Formato de Copa para 12 ou 24 duplas, pensado para eventos mais completos. As duplas são organizadas em fase de grupos, jogam partidas classificatórias e depois avançam para as chaves finais conforme o desempenho. O sistema permite trabalhar com chave principal e repescagem, além de nomes editáveis para adaptar à regra do seu evento. É indicado para torneios com estrutura de campeonato, fases eliminatórias e premiação por colocação."
            />

            <Info
              title="Copa - 18 duplas"
              text="Formato de Copa com 18 duplas, dividido em 6 grupos de 3 duplas. Cada grupo joga sua fase classificatória, e o sistema calcula a classificação com base nos critérios definidos. Os melhores avançam para a chave principal; os 2 melhores gerais podem receber BYE, entrando em fase mais avançada. Também há disputa paralela para duplas específicas, como terceiros colocados, permitindo manter mais atletas em atividade. É um formato ideal para torneios grandes, com organização mais profissional e várias fases."
            />

            <Info
              title="Copinha - grupos de 3"
              text="Formato flexível para 6 a 36 duplas. As equipes são sorteadas em grupos de três e todas fazem duas partidas. Os primeiros e segundos colocados seguem para a chave principal; a partir de 3 grupos, os terceiros disputam a Consolação. Os empates respeitam vitórias, saldo, confronto direto e, se necessário, sorteio da organização."
            />
          </div>
        </section>

        <section id="acesso" className="landingAccessSection">
          <div className="accessText">
            <span>Acesso</span>
            <h2>
              {mode === "login"
                ? "Entre na sua conta"
                : mode === "signup"
                  ? "Crie sua conta"
                  : mode === "forgotPassword"
                    ? "Redefinir senha"
                    : "Criar nova senha"}
            </h2>
            <p>
              {mode === "login"
                ? "Acesse seus torneios salvos e continue de onde parou."
                : mode === "signup"
                  ? "Confirme seu e-mail e ganhe 7 dias grátis no plano Premium."
                  : mode === "forgotPassword"
                    ? "Informe seu e-mail para receber o link de redefinição."
                    : "Crie uma nova senha com pelo menos 8 caracteres para voltar a acessar sua conta."}
            </p>
          </div>

          <div className="accessCard">
            <div className="accessToggle" aria-label="Escolha entre entrar ou criar uma conta">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => changeMode("login")}
                aria-pressed={mode === "login"}
              >
                Login
              </button>

              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => changeMode("signup")}
                aria-pressed={mode === "signup"}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {mode === "signup" && (
                <>
                  <div className="twoCols formTwoCols">
                    <div>
                      <label>Nome</label>
                      <input
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>

                    <div>
                      <label>Sobrenome</label>
                      <input
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Seu sobrenome"
                      />
                    </div>
                  </div>

                  <label>Data de nascimento</label>
                  <input
                    className="clickableDateInput"
                    type="date"
                    autoComplete="bday"
                    value={birthDate}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onFocus={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </>
              )}

              {mode !== "resetPassword" && (
                <>
                  <label>E-mail</label>
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                  />
                </>
              )}

              {mode === "resetPassword" ? (
                <>
                  <p className="authFormHint">
                    {recoverySession?.access_token
                      ? "A nova senha será aplicada somente à conta vinculada ao link de recuperação."
                      : "Este link não está mais válido. Volte ao login e peça um novo link de recuperação."}
                  </p>
                  <label>Nova senha</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                  />

                  <label>Repita a nova senha</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a nova senha novamente"
                  />
                </>
              ) : (
                mode !== "forgotPassword" && (
                  <>
                    <label>Senha</label>
                    <input
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "Mínimo de 8 caracteres" : "Digite sua senha"}
                    />

                    {mode === "signup" && (
                      <>
                        <label>Repita a senha</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Digite a senha novamente"
                        />
                      </>
                    )}
                  </>
                )
              )}

              <button
                type="submit"
                disabled={submitting || (mode === "resetPassword" && !recoverySession?.access_token)}
                aria-busy={submitting}
              >
                {submitting
                  ? "Aguarde..."
                  : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta"
                    : mode === "forgotPassword"
                      ? "Enviar link"
                      : "Salvar nova senha"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => changeMode("forgotPassword")}
                >
                  Esqueci minha senha
                </button>
              )}

              {mode === "login" && pendingVerificationEmail && (
                <div className="authVerificationHint" role="status">
                  <strong>Seu e-mail ainda não foi confirmado?</strong>
                  <span>Abra o link enviado para {pendingVerificationEmail} ou peça outro abaixo.</span>
                  <button
                    type="button"
                    className="linkBtn"
                    onClick={handleResendVerification}
                    disabled={submitting || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar confirmação"}
                  </button>
                </div>
              )}

              {(mode === "forgotPassword" || mode === "resetPassword") && (
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => changeMode("login")}
                >
                  Voltar para o login
                </button>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function AccessPreparing({ onRetry }) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handleRetry();
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="accessPreparingPage">
      <div className="accessPreparingCard">
        <div className="accessPreparingSpinner" aria-hidden="true" />
        <h1>Estamos finalizando seu acesso</h1>
        <p>Estamos concluindo a criação do seu perfil. Tentamos atualizar automaticamente; se necessário, você também pode conferir o status abaixo.</p>
        <div className="accessPreparingActions">
          <button type="button" onClick={handleRetry} disabled={retrying}>
            {retrying ? "Conferindo..." : "Atualizar status"}
          </button>
          <button type="button" className="linkBtn" onClick={logout}>Sair</button>
        </div>
      </div>
    </div>
  );
}

function Blocked({ profile }) {
  return (
    <div className="center">
      <h1>Acesso encerrado</h1>
      <p>Seu teste grátis terminou. Para continuar usando o Torneio 360, regularize seu acesso.</p>

      <div className="infoBox">
        <p><strong>Plano:</strong> {profile.plan}</p>
        <p><strong>Status:</strong> {formatStatusBR(profile.status)}</p>
        <p><strong>Vencimento:</strong> {profile.expires_at ? formatDateBR(profile.expires_at) : "não definido"}</p>
      </div>

      <p>Entre em contato para liberar seu plano.</p>
      <button type="button" onClick={logout}>Sair</button>
    </div>
  );
}

function FreeTrialNotice({ details }) {
  const isLastDay = details.daysRemaining === 1;
  const dayLabel = details.daysRemaining === 1 ? "dia" : "dias";

  return (
    <section
      className={`freeTrialNotice ${isLastDay ? "freeTrialNoticeLastDay" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Período gratuito"
    >
      <div className="freeTrialNoticeIcon" aria-hidden="true"><Gift /></div>

      <div className="freeTrialNoticeCopy">
        <span>Seu período gratuito está ativo</span>
        <strong>
          {isLastDay
            ? "Hoje é o seu último dia grátis"
            : `Você ainda tem ${details.daysRemaining} dias grátis`}
        </strong>
        <p>Plano Premium liberado até {formatDateBR(details.expiresAt)}.</p>
      </div>

      <div className="freeTrialNoticeDays" aria-hidden="true">
        <strong>{details.daysRemaining}</strong>
        <span>{dayLabel}</span>
      </div>
    </section>
  );
}

function Dashboard({ profile, user, onProfileChange }) {
  const [tournaments, setTournaments] = useState([]);
  const [trashTournaments, setTrashTournaments] = useState([]);
  const [publicArenaProfiles, setPublicArenaProfiles] = useState([]);
  const [arenaProfileSearch, setArenaProfileSearch] = useState("");
  const [selectedArenaProfile, setSelectedArenaProfile] = useState(null);
  const [selectedArenaTournaments, setSelectedArenaTournaments] = useState([]);
  const [selectedArenaLoading, setSelectedArenaLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState("");
  const [newSport, setNewSport] = useState(DEFAULT_SPORT_ID);
  const [newType, setNewType] = useState("");
const [newGender, setNewGender] = useState("");
const [newMultiCategoryEvent, setNewMultiCategoryEvent] = useState("nao");
const [newCategorySchedules, setNewCategorySchedules] = useState([{ category: "", date: "", time: "" }]);
const [newDate, setNewDate] = useState("");
const [newEndDate, setNewEndDate] = useState("");
const [newRegistrationDeadline, setNewRegistrationDeadline] = useState("");
const [newEventStartTime, setNewEventStartTime] = useState("");
const [newDailyStartTimes, setNewDailyStartTimes] = useState({});
const [newDay, setNewDay] = useState("");
const [newLocation, setNewLocation] = useState("");
const [newWinningScore, setNewWinningScore] = useState(4);
const [newCupTeamCount, setNewCupTeamCount] = useState(12);
const [newRankingCriteria, setNewRankingCriteria] = useState(defaultRankingCriteria);
const [newPublicInfo, setNewPublicInfo] = useState({
  showArenaName: true,
  showOrganizerName: true,
  showWhatsapp: true,
  showWhatsappGroupLink: true,
  showInstagram: true,
  showAddress: true,
  showMapsLink: true,
  showCityState: true,
});
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const profileSaveSuccessTimerRef = useRef(null);
  const [profileVisibilitySaving, setProfileVisibilitySaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [shareTargetSaving, setShareTargetSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [draggedTournamentId, setDraggedTournamentId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [profileSubtab, setProfileSubtab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("perfil") || "publicacoes";
  });
  const [activePanel, setActivePanel] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("aba") || "inicio";
  });
  const [modalitySearch, setModalitySearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [tournamentWorkspace, setTournamentWorkspace] = useState("list");
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [tournamentFormatFilter, setTournamentFormatFilter] = useState("all");
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState("all");
  const [tournamentFiltersOpen, setTournamentFiltersOpen] = useState(false);
  const [colorMode, setColorMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem(`torneio360:color-mode:${user.id}`);
      return savedMode === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [circuits, setCircuits] = useState([]);
  const [circuitForm, setCircuitForm] = useState({ id: null, name: "", startDate: "", endDate: "", status: "draft", tournamentIds: [] });
  const [circuitEditorOpen, setCircuitEditorOpen] = useState(false);
  const [circuitSearch, setCircuitSearch] = useState("");
  const [circuitStatusFilter, setCircuitStatusFilter] = useState("all");
  const [profilePublicationSearch, setProfilePublicationSearch] = useState("");
  const [circuitRankingCriteria, setCircuitRankingCriteria] = useState(defaultRankingCriteria);
  const [expandedCircuitId, setExpandedCircuitId] = useState(null);
  const [restoredTournamentId, setRestoredTournamentId] = useState(null);
  const appStateSaveTimerRef = useRef(null);
  const restoredAppStateRef = useRef(false);
  const appStateRestoreReadyRef = useRef(false);
  const pendingScrollRestoreRef = useRef(null);
  const scrollRestoreTimersRef = useRef([]);
  const initialAppRouteRef = useRef(`${window.location.pathname}${window.location.search}${window.location.hash || ""}`);
  const initialRouteIsExplicitRef = useRef(isExplicitAppRoute(initialAppRouteRef.current));

  function getRelativeAppRoute() {
    return `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
  }

  function isExplicitAppRoute(route) {
    try {
      const url = new URL(route, window.location.origin);
      const params = url.searchParams;

      return Boolean(
        params.get("torneio") ||
        params.get("tab") ||
        params.get("partidas") ||
        params.get("perfil") ||
        (params.get("aba") && params.get("aba") !== "inicio")
      );
    } catch {
      return false;
    }
  }

  function getStateRoute(state) {
    if (!state?.last_url || typeof state.last_url !== "string") return null;

    try {
      const url = new URL(state.last_url, window.location.origin);
      if (url.origin !== window.location.origin) return null;

      if (!url.searchParams.get("aba") && state.last_panel) url.searchParams.set("aba", state.last_panel);
      if (!url.searchParams.get("torneio") && state.last_tournament_id) url.searchParams.set("torneio", state.last_tournament_id);
      if (!url.searchParams.get("tab") && state.last_tournament_tab) url.searchParams.set("tab", state.last_tournament_tab);
      if (!url.searchParams.get("partidas") && state.last_matches_tab) url.searchParams.set("partidas", state.last_matches_tab);
      if (!url.searchParams.get("perfil") && state.last_profile_subtab) url.searchParams.set("perfil", state.last_profile_subtab);

      return `${url.pathname}${url.search}${url.hash || ""}`;
    } catch {
      return null;
    }
  }

  function areAppRoutesEqual(firstRoute, secondRoute) {
    try {
      const first = new URL(firstRoute, window.location.origin);
      const second = new URL(secondRoute, window.location.origin);

      if (first.pathname !== second.pathname || first.hash !== second.hash) return false;

      return ["aba", "torneio", "tab", "partidas", "perfil"].every(
        (key) => first.searchParams.get(key) === second.searchParams.get(key)
      );
    } catch {
      return false;
    }
  }

  function clearPendingScrollRestore() {
    scrollRestoreTimersRef.current.forEach((timer) => clearTimeout(timer));
    scrollRestoreTimersRef.current = [];
    pendingScrollRestoreRef.current = null;
  }

  function applyPendingScrollRestore() {
    const pending = pendingScrollRestoreRef.current;
    if (!pending || Date.now() > pending.expiresAt) {
      pendingScrollRestoreRef.current = null;
      return;
    }

    const scrollToSavedPosition = () => {
      if (pendingScrollRestoreRef.current?.token !== pending.token) return;
      window.scrollTo({ top: pending.top, left: 0, behavior: "auto" });
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(scrollToSavedPosition);
    } else {
      scrollToSavedPosition();
    }
  }

  function queueScrollRestore(scrollY) {
    const top = Math.max(0, Math.round(Number(scrollY) || 0));
    const token = `${Date.now()}:${top}`;

    scrollRestoreTimersRef.current.forEach((timer) => clearTimeout(timer));
    scrollRestoreTimersRef.current = [];
    pendingScrollRestoreRef.current = {
      top,
      token,
      expiresAt: Date.now() + 5000,
    };

    [0, 160, 500, 1100, 2200, 4200].forEach((delay) => {
      const timer = setTimeout(applyPendingScrollRestore, delay);
      scrollRestoreTimersRef.current.push(timer);
    });
  }

  function applySavedAppState(state, { restoreRoute = false } = {}) {
    if (!state || typeof state !== "object") return false;

    const savedRoute = getStateRoute(state);
    const initialRoute = initialAppRouteRef.current;
    const routeMatchesInitial = savedRoute && areAppRoutesEqual(savedRoute, initialRoute);
    const canRestoreDetails = restoreRoute || routeMatchesInitial;

    if (restoreRoute && savedRoute) {
      window.history.replaceState(null, "", savedRoute);
    }

    if (!canRestoreDetails) return false;

    if (state.last_panel) setActivePanel(state.last_panel);
    if (state.last_profile_subtab) setProfileSubtab(state.last_profile_subtab);
    if (state.last_circuit_id) setExpandedCircuitId(state.last_circuit_id);

    const currentParams = new URLSearchParams(window.location.search);
    const tournamentId = state.last_tournament_id || currentParams.get("torneio");
    if (tournamentId) setRestoredTournamentId(tournamentId);

    if (state.scroll_y !== undefined && state.scroll_y !== null) {
      queueScrollRestore(state.scroll_y);
    }

    return true;
  }

  function updateAppUrl(next = {}) {
    const params = new URLSearchParams(window.location.search);

    if (next.activePanel) params.set("aba", next.activePanel);
    else if (!params.get("aba")) params.set("aba", activePanel || "inicio");

    if (Object.prototype.hasOwnProperty.call(next, "selectedTournamentId")) {
      if (next.selectedTournamentId) params.set("torneio", next.selectedTournamentId);
      else params.delete("torneio");
    }

    if (Object.prototype.hasOwnProperty.call(next, "profileSubtab")) {
      if (next.profileSubtab) params.set("perfil", next.profileSubtab);
      else params.delete("perfil");
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
    window.history.replaceState(null, "", nextUrl);
    scheduleUserAppStateSave({
      activePanel: params.get("aba") || activePanel || "inicio",
      selectedTournamentId: params.get("torneio"),
      profileSubtab: params.get("perfil") || profileSubtab,
      circuitId: expandedCircuitId,
    });
  }

  function goToPanel(panel) {
    setSelected(null);
    if (panel === "criar") setTournamentWorkspace("list");
    setActivePanel(panel);
    updateAppUrl({ activePanel: panel, selectedTournamentId: null });
  }

  function openTournamentCreator() {
    setSelected(null);
    setTournamentWorkspace("create");
    setActivePanel("criar");
    updateAppUrl({ activePanel: "criar", selectedTournamentId: null });
  }

  function openProfileSection(nextSubtab = "publicacoes") {
    setProfileMenuOpen(false);
    setSelected(null);
    setProfileSubtab(nextSubtab);
    setActivePanel("ajustes");
    updateAppUrl({ activePanel: "ajustes", selectedTournamentId: null, profileSubtab: nextSubtab });
  }

  function openProfileSettings() {
    openProfileSection("publicacoes");
  }

  function openOwnPublicProfile() {
    setProfileMenuOpen(false);
    setSelected(null);
    setActivePanel("inicio");
    updateAppUrl({ activePanel: "inicio", selectedTournamentId: null });
    void openArenaProfile({
      id: user.id,
      name: organizerProfile.organizerName || profile.name || user.email || "Organizador",
      arena_name: organizerProfile.arenaName || profile.arena_name || profile.name || "Minha arena",
      city: organizerProfile.city || profile.city || "",
      state: organizerProfile.state || profile.state || "",
      photo_url: organizerProfile.photoUrl || profile.photo_url || "",
      phone: organizerProfile.whatsapp || profile.phone || "",
      address: organizerProfile.address || profile.address || "",
      maps_link: organizerProfile.mapsLink || profile.maps_link || "",
      instagram_handle: organizerProfile.instagramHandle || profile.instagram_handle || "",
      instagram_link: organizerProfile.instagramLink || profile.instagram_link || "",
      whatsapp_group_link: organizerProfile.whatsappGroupLink || profile.whatsapp_group_link || "",
      is_public: organizerProfile.isPublic !== false,
    });
  }

  function toggleColorMode() {
    setColorMode((currentMode) => currentMode === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    try {
      localStorage.setItem(`torneio360:color-mode:${user.id}`, colorMode);
    } catch {
      // O tema permanece aplicado enquanto esta sessão estiver aberta.
    }

    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = colorMode;

    return () => {
      if (previousTheme) document.documentElement.dataset.theme = previousTheme;
      else delete document.documentElement.dataset.theme;
    };
  }, [colorMode, user.id]);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    updateAppUrl({ activePanel });
  }, [activePanel]);

  useEffect(() => {
    if (selected || tournaments.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const tournamentId = restoredTournamentId || params.get("torneio");
    if (!tournamentId) return;

    const savedTournament = tournaments.find((item) => item.id === tournamentId);
    if (savedTournament) {
      setSelected(savedTournament);
      if (restoredTournamentId === savedTournament.id) setRestoredTournamentId(null);
    }
  }, [tournaments, selected, restoredTournamentId]);

  useEffect(() => {
    if (restoredAppStateRef.current) return;

    let cancelled = false;

    async function restoreUserAppState() {
      const localState = readLocalUserAppState(user.id);
      const restoreRoute = !initialRouteIsExplicitRef.current;
      const restoredLocally = applySavedAppState(localState, { restoreRoute });

      try {
        const { data, error } = await supabase
          .from("user_app_state")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (cancelled || error || !data?.last_url) return;

        // A cópia local é síncrona e costuma ser a mais recente ao voltar para
        // a mesma aba. O Supabase continua como recuperação entre dispositivos.
        if (!restoredLocally) {
          applySavedAppState(data, { restoreRoute });
        }

        if (!localState || getAppStateTimestamp(data) > getAppStateTimestamp(localState)) {
          saveLocalUserAppState(user.id, data);
        }
      } catch (error) {
        console.error("Erro ao restaurar posição do usuário", error);
      } finally {
        if (!cancelled) {
          restoredAppStateRef.current = true;
          appStateRestoreReadyRef.current = true;
        }
      }
    }

    restoreUserAppState();

    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    const saveNow = () => saveUserAppState();
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const saveAfterScroll = () => scheduleUserAppStateSave();
    const interval = setInterval(saveNow, 10000);
    window.addEventListener("pagehide", saveNow);
    window.addEventListener("beforeunload", saveNow);
    window.addEventListener("blur", saveNow);
    window.addEventListener("scroll", saveAfterScroll, { passive: true });
    document.addEventListener("visibilitychange", saveWhenHidden);

    return () => {
      saveNow();
      clearInterval(interval);
      window.removeEventListener("pagehide", saveNow);
      window.removeEventListener("beforeunload", saveNow);
      window.removeEventListener("blur", saveNow);
      window.removeEventListener("scroll", saveAfterScroll);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [activePanel, selected?.id, expandedCircuitId, profileSubtab, user.id]);

  useEffect(() => {
    applyPendingScrollRestore();
  }, [activePanel, selected?.id, tournaments.length]);

  useEffect(() => () => clearPendingScrollRestore(), []);

  useEffect(() => {
    if (!appStateRestoreReadyRef.current) return;
    scheduleUserAppStateSave({
      profileSubtab,
      circuitId: expandedCircuitId,
    });
  }, [profileSubtab, expandedCircuitId]);

  async function saveUserAppState(extra = {}) {
    if (!appStateRestoreReadyRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const pendingScroll = pendingScrollRestoreRef.current;
    const scrollY = pendingScroll && Date.now() <= pendingScroll.expiresAt
      ? pendingScroll.top
      : Math.max(0, Math.round(window.scrollY || 0));
    const payload = {
      user_id: user.id,
      last_url: `${window.location.pathname}${window.location.search}${window.location.hash || ""}`,
      last_panel: extra.activePanel || activePanel || params.get("aba") || "inicio",
      last_tournament_id: extra.selectedTournamentId ?? params.get("torneio"),
      last_tournament_tab: extra.tournamentTab || params.get("tab"),
      last_matches_tab: extra.matchesTab || params.get("partidas"),
      last_circuit_id: extra.circuitId ?? expandedCircuitId,
      last_profile_subtab: extra.profileSubtab || profileSubtab,
      scroll_y: scrollY,
      updated_at: new Date().toISOString(),
    };

    saveLocalUserAppState(user.id, payload);

    try {
      const { error } = await supabase.from("user_app_state").upsert(payload, { onConflict: "user_id" });
      if (error) console.error("Erro ao salvar posição do usuário", error);
    } catch (error) {
      console.error("Erro ao salvar posição do usuário", error);
    }
  }

  function scheduleUserAppStateSave(extra = {}) {
    if (!appStateRestoreReadyRef.current) return;
    if (appStateSaveTimerRef.current) clearTimeout(appStateSaveTimerRef.current);
    appStateSaveTimerRef.current = setTimeout(() => saveUserAppState(extra), 700);
  }
  const [photoEditor, setPhotoEditor] = useState(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileEditSnapshot, setProfileEditSnapshot] = useState(null);

  const photoPointersRef = useRef(new Map());
  const photoPreviewRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const lastPhotoDragRef = useRef(null);
  const lastPhotoPinchRef = useRef(null);
  const [organizerProfile, setOrganizerProfile] = useState(() => {
    const saved = localStorage.getItem(`organizerProfile:${user.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        localStorage.removeItem(`organizerProfile:${user.id}`);
      }
    }

    return {
      photoUrl: profile.photo_url || "",
      arenaName: profile.arena_name || "",
      organizerName: profile.name || "",
      email: user.email || "",
      publicEmail: user.email || "",
      description: "",
      whatsapp: profile.phone || "",
      address: profile.address || "",
      mapsLink: profile.maps_link || "",
      city: profile.city || "",
      state: profile.state || "",
      instagramHandle: profile.instagram_handle || "",
      instagramLink: profile.instagram_link || "",
      whatsappGroupLink: profile.whatsapp_group_link || "",
      isPublic: profile.is_public !== false,
    };
  });

  const allowedTypes = allowedByPlan[profile.plan] || [];
  const selectedNewTournamentConfig = getModalityConfig(newType);
  const freeTrialDetails = getFreeTrialDetails(profile, user);
  const profileDisplayName = organizerProfile.organizerName || profile.name || user.email?.split("@")[0] || "Organizador";
  const profileInitials = profileDisplayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "T3";
  const panelMeta = {
    inicio: {
      title: "Visão geral",
      description: "Acompanhe seus torneios, circuitos e atividades em um só lugar.",
    },
    criar: {
      title: "Torneios",
      description: "Gerencie todos os torneios e eventos criados.",
    },
    circuitos: {
      title: "Circuitos",
      description: "Organize torneios em um circuito e acompanhe a classificação acumulada.",
    },
    modalidades: {
      title: "Modalidades",
      description: "Consulte as modalidades disponíveis para criação e organização dos seus torneios.",
    },
    lixeira: {
      title: "Lixeira",
      description: "Recupere torneios excluídos nos últimos 30 dias.",
    },
    ajustes: {
      title: "Perfil e preferências",
      description: "Atualize sua imagem, dados públicos e informações da arena.",
    },
  };
  const currentPanelMeta = panelMeta[activePanel] || panelMeta.inicio;
  const eventGroupKey = newName.trim().toLowerCase().replace(/\s+/g, "-") || null;
  const filteredSportCatalog = SPORT_CATALOG.filter((sport) => {
    const matchesSearch = sport.name.toLocaleLowerCase("pt-BR").includes(modalitySearch.trim().toLocaleLowerCase("pt-BR"));
    const matchesFilter = modalityFilter === "all"
      || (modalityFilter === "active" && sport.enabled)
      || (modalityFilter === "soon" && !sport.enabled);
    return matchesSearch && matchesFilter;
  });

  const filteredTournaments = tournaments.filter((tournament) => {
    const term = tournamentSearch.trim().toLocaleLowerCase("pt-BR");
    const details = tournament.data || {};
    const matchesSearch = !term || [tournament.name, details.eventName, details.gender, details.location]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(term));
    const matchesFormat = tournamentFormatFilter === "all" || normalizeModalityName(tournament.type) === tournamentFormatFilter;
    const matchesStatus = tournamentStatusFilter === "all" || getTournamentUiStatus(tournament) === tournamentStatusFilter;
    return matchesSearch && matchesFormat && matchesStatus;
  });

  const filteredArenaProfiles = publicArenaProfiles.filter((arena) => {
    const term = arenaProfileSearch.trim().toLowerCase();
    if (!term) return true;
    return [arena.arena_name, arena.name, arena.city, arena.state]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  function normalizeCircuitRow(row) {
    return {
      id: row.id,
      name: row.name || "",
      startDate: row.start_date || "",
      endDate: row.end_date || "",
      status: row.status || "draft",
      tournamentIds: Array.isArray(row.tournament_ids) ? row.tournament_ids : [],
      rankingHistory: row.rankingHistory || {},
      updatedAt: row.updated_at,
    };
  }

  async function loadCircuits() {
    const { data, error } = await supabase
      .from("circuits")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar circuitos:", error);
      showNotice("error", "Erro ao carregar circuitos", "Não foi possível carregar seus circuitos do Supabase.");
      return;
    }

    const baseCircuits = (data || []).map(normalizeCircuitRow);

    const { data: historyRows, error: historyError } = await supabase
      .from("circuit_ranking_history")
      .select("*")
      .eq("user_id", user.id);

    if (historyError) console.error("Erro ao carregar histórico dos circuitos:", historyError);

    const historyByCircuit = {};
    (historyRows || []).forEach((row) => {
      const key = `${row.tournament_id}::${row.group_key || "geral"}::${row.player_key}`;
      if (!historyByCircuit[row.circuit_id]) historyByCircuit[row.circuit_id] = {};
      historyByCircuit[row.circuit_id][key] = {
        tournamentId: row.tournament_id,
        groupKey: row.group_key || "geral",
        playerKey: row.player_key || key.split("::").pop(),
        name: row.player_name,
        pts: Number(row.pts || 0),
        w: Number(row.w || 0),
        bal: Number(row.bal || 0),
        played: Number(row.played || 0),
      };
    });

    setCircuits(baseCircuits.map((circuit) => ({
      ...circuit,
      rankingHistory: historyByCircuit[circuit.id] || {},
    })));
  }

  async function saveCircuitHistoryToSupabase(circuitId, history) {
    const rows = Object.entries(history || {}).map(([recordKey, record]) => ({
      user_id: user.id,
      circuit_id: circuitId,
      tournament_id: record.tournamentId,
      group_key: record.groupKey || "geral",
      player_key: record.playerKey || recordKey.split("::").pop(),
      player_name: record.name || "Sem nome",
      pts: Number(record.pts || 0),
      w: Number(record.w || 0),
      bal: Number(record.bal || 0),
      played: Number(record.played || 0),
      updated_at: new Date().toISOString(),
    }));

    const currentKeys = new Set(
      rows.map((row) => `${row.tournament_id}::${row.group_key}::${row.player_key}`)
    );

    const { data: savedRows, error: savedRowsError } = await supabase
      .from("circuit_ranking_history")
      .select("tournament_id, group_key, player_key")
      .eq("user_id", user.id)
      .eq("circuit_id", circuitId);

    if (savedRowsError) {
      console.error("Erro ao conferir histórico do circuito:", savedRowsError);
    } else {
      const staleRows = (savedRows || []).filter((row) => {
        const key = `${row.tournament_id}::${row.group_key || "geral"}::${row.player_key}`;
        return !currentKeys.has(key);
      });

      await Promise.all(
        staleRows.map(async (row) => {
          const { error } = await supabase
            .from("circuit_ranking_history")
            .delete()
            .eq("user_id", user.id)
            .eq("circuit_id", circuitId)
            .eq("tournament_id", row.tournament_id)
            .eq("group_key", row.group_key || "geral")
            .eq("player_key", row.player_key);

          if (error) console.error("Erro ao remover histórico antigo do circuito:", error);
        })
      );

      if (!rows.length) return;
    }

    if (!rows.length) return;

    const { error } = await supabase
      .from("circuit_ranking_history")
      .upsert(rows, { onConflict: "user_id,circuit_id,tournament_id,group_key,player_key" });

    if (error) console.error("Erro ao salvar histórico do circuito:", error);
  }

  function saveCircuits(nextCircuits) {
    setCircuits(nextCircuits);
  }

  function getCircuitSelectedTournaments(circuit) {
    const selectedIds = (circuit.tournamentIds || []).map((id) => String(id));
    return selectedIds
      .map((id) => tournaments.find((t) => String(t.id) === id))
      .filter(Boolean);
  }

  function resetCircuitForm() {
    setCircuitForm({ id: null, name: "", startDate: "", endDate: "", status: "draft", tournamentIds: [] });
  }

  function openCircuitCreator() {
    resetCircuitForm();
    setCircuitEditorOpen(true);
  }

  function closeCircuitEditor() {
    resetCircuitForm();
    setCircuitEditorOpen(false);
  }

  function toggleCircuitTournament(tournamentId) {
    setCircuitForm((prev) => {
      const selected = prev.tournamentIds.includes(tournamentId);
      return {
        ...prev,
        tournamentIds: selected
          ? prev.tournamentIds.filter((id) => id !== tournamentId)
          : [...prev.tournamentIds, tournamentId],
      };
    });
  }

  async function saveCircuit() {
    if (!circuitForm.name.trim()) {
      showNotice("warning", "Nome obrigatório", "Digite um nome para o circuito.");
      return;
    }

    if (circuitForm.startDate && circuitForm.endDate && circuitForm.endDate < circuitForm.startDate) {
      showNotice("warning", "Período inválido", "A data final não pode ser anterior à data inicial.");
      return;
    }

    const rowPayload = {
      user_id: user.id,
      name: circuitForm.name.trim(),
      start_date: circuitForm.startDate || null,
      end_date: circuitForm.endDate || null,
      status: circuitForm.status || "draft",
      tournament_ids: circuitForm.tournamentIds || [],
      updated_at: new Date().toISOString(),
    };

    const query = circuitForm.id
      ? supabase.from("circuits").update(rowPayload).eq("id", circuitForm.id).eq("user_id", user.id).select("*").single()
      : supabase.from("circuits").insert(rowPayload).select("*").single();

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao salvar circuito:", error);
      showNotice("error", "Erro ao salvar", "Não foi possível salvar o circuito no Supabase.");
      return;
    }

    const payload = normalizeCircuitRow(data);
    const previousHistory = circuits.find((item) => item.id === payload.id)?.rankingHistory || {};
    const payloadWithHistory = { ...payload, rankingHistory: previousHistory };
    const updatedHistory = buildCircuitRankingHistory(payloadWithHistory);
    const finalPayload = { ...payloadWithHistory, rankingHistory: updatedHistory };

    const nextCircuits = circuitForm.id
      ? circuits.map((item) => item.id === circuitForm.id ? finalPayload : item)
      : [finalPayload, ...circuits];

    saveCircuits(nextCircuits);
    await saveCircuitHistoryToSupabase(finalPayload.id, finalPayload.rankingHistory);
    resetCircuitForm();
    setCircuitEditorOpen(false);
    showNotice("success", circuitForm.id ? "Circuito atualizado" : "Circuito criado", "As alterações foram salvas no Supabase.");
  }

  function editCircuit(circuit) {
    setCircuitForm({
      id: circuit.id,
      name: circuit.name || "",
      startDate: circuit.startDate || "",
      endDate: circuit.endDate || "",
      status: circuit.status || "draft",
      tournamentIds: Array.isArray(circuit.tournamentIds) ? circuit.tournamentIds : [],
    });
    setCircuitEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCircuit(circuitId) {
    if (!window.confirm("Excluir este circuito? Os torneios não serão apagados.")) return;
    const { error } = await supabase
      .from("circuits")
      .delete()
      .eq("id", circuitId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao excluir circuito:", error);
      showNotice("error", "Erro ao excluir", "Não foi possível excluir o circuito no Supabase.");
      return;
    }

    saveCircuits(circuits.filter((item) => item.id !== circuitId));
    if (circuitForm.id === circuitId) resetCircuitForm();
    showNotice("success", "Circuito excluído", "O circuito foi removido do Supabase. Os torneios continuam salvos.");
  }

  function normalizeCircuitPlayerKey(value) {
    return String(value || "Sem nome")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");
  }

  function getCircuitTournamentRankingRecords(circuit) {
    const records = {};

    getCircuitSelectedTournaments(circuit).forEach((tournament) => {
      const rows = calculateRanking(
        tournament.data || {},
        tournament.type,
        tournament.data?.rankingCriteria || defaultRankingCriteria
      );
      const config = getModalityConfig(tournament.type);
      const separated = config?.type === "mixed10" || config?.type === "mixed12" || config?.type === "mixed16";
      const nameOccurrences = new Map();

      rows.forEach((row) => {
        const groupKey = separated ? (row.id < config.men ? "masculino" : "feminino") : "geral";
        const name = String(row.name || "Sem nome").trim() || "Sem nome";
        const key = `${groupKey}::${normalizeCircuitPlayerKey(name)}`;
        nameOccurrences.set(key, (nameOccurrences.get(key) || 0) + 1);
      });

      rows.forEach((row, rowIndex) => {
        const groupKey = separated ? (row.id < config.men ? "masculino" : "feminino") : "geral";
        const name = String(row.name || "Sem nome").trim() || "Sem nome";
        const normalizedName = normalizeCircuitPlayerKey(name);
        const duplicateNameKey = `${groupKey}::${normalizedName}`;
        const playerKey = nameOccurrences.get(duplicateNameKey) > 1
          ? `${normalizedName}#${row.id ?? rowIndex + 1}`
          : normalizedName;
        const recordKey = `${tournament.id}::${groupKey}::${playerKey}`;
        const record = {
          tournamentId: tournament.id,
          groupKey,
          playerKey,
          name,
          pts: Number(row.pts || 0),
          w: Number(row.w || 0),
          bal: Number(row.bal || 0),
          played: Number(row.played || 0),
        };

        records[recordKey] = record;
      });
    });

    return records;
  }

  function buildCircuitRankingHistory(circuit) {
    const selectedTournamentIds = new Set((circuit.tournamentIds || []).map((id) => String(id)));
    const loadedTournamentIds = new Set(
      getCircuitSelectedTournaments(circuit).map((tournament) => String(tournament.id))
    );
    const retainedHistory = Object.entries(circuit.rankingHistory || {}).reduce((result, [key, record]) => {
      const tournamentId = String(record?.tournamentId || key.split("::")[0] || "");

      if (selectedTournamentIds.has(tournamentId) && !loadedTournamentIds.has(tournamentId)) {
        result[key] = record;
      }

      return result;
    }, {});

    return {
      ...retainedHistory,
      ...getCircuitTournamentRankingRecords(circuit),
    };
  }

  function getCircuitRanking(circuit, criteriaValue = circuitRankingCriteria) {
    const history = buildCircuitRankingHistory(circuit);
    const groups = {
      geral: { title: "Ranking acumulado", rows: new Map() },
      masculino: { title: "Ranking Masculino", rows: new Map() },
      feminino: { title: "Ranking Feminino", rows: new Map() },
    };

    Object.values(history).forEach((record) => {
      const groupKey = record.groupKey || "geral";
      const table = groups[groupKey]?.rows || groups.geral.rows;
      const name = String(record.name || "Sem nome").trim() || "Sem nome";
      const key = normalizeCircuitPlayerKey(record.playerKey || name);
      const current = table.get(key) || {
        id: `${groupKey}:${key}`,
        name,
        pts: 0,
        w: 0,
        bal: 0,
        played: 0,
        tournaments: 0,
      };

      table.set(key, {
        ...current,
        name: current.name || name,
        pts: current.pts + Number(record.pts || 0),
        w: current.w + Number(record.w || 0),
        bal: current.bal + Number(record.bal || 0),
        played: current.played + Number(record.played || 0),
        tournaments: current.tournaments + 1,
      });
    });

    const criteria = getRankingCriteria(criteriaValue);
    const sortRows = (rows) => Array.from(rows.values()).sort((a, b) => {
      for (const key of criteria.order) {
        const diff = Number(b[key] || 0) - Number(a[key] || 0);
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name);
    });

    return [
      { key: "masculino", title: groups.masculino.title, rows: sortRows(groups.masculino.rows) },
      { key: "feminino", title: groups.feminino.title, rows: sortRows(groups.feminino.rows) },
      { key: "geral", title: groups.geral.title, rows: sortRows(groups.geral.rows) },
    ].filter((group) => group.rows.length > 0);
  }

  useEffect(() => {
    if (!circuits.length || !tournaments.length) return;

    let changed = false;
    const nextCircuits = circuits.map((circuit) => {
      const rankingHistory = buildCircuitRankingHistory(circuit);
      const before = JSON.stringify(circuit.rankingHistory || {});
      const after = JSON.stringify(rankingHistory);
      if (before !== after) changed = true;
      return { ...circuit, rankingHistory };
    });

    if (changed) {
      saveCircuits(nextCircuits);
      nextCircuits.forEach((circuit) => saveCircuitHistoryToSupabase(circuit.id, circuit.rankingHistory));
    }
  }, [tournaments, circuits]);

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  function updateOrganizerProfile(field, value) {
    setOrganizerProfile((prev) => ({ ...prev, [field]: value }));
  }

  function openOrganizerProfileEditor() {
    setProfileEditSnapshot(structuredClone(organizerProfile));
    setProfileEditing(true);
  }

  function closeOrganizerProfileEditor({ restore = true } = {}) {
    if (restore && profileEditSnapshot) setOrganizerProfile(profileEditSnapshot);
    setProfileEditing(false);
    setProfileEditSnapshot(null);
  }

  async function saveOrganizerProfileEditor() {
    const saved = await saveOrganizerProfile();
    if (saved) closeOrganizerProfileEditor({ restore: false });
  }

  function openDatePicker(e) {
    e.currentTarget.showPicker?.();
  }

  function buildOrganizerProfilePayload(nextVisibility = organizerProfile.isPublic !== false) {
    return {
      name: organizerProfile.organizerName || profile.name || user.email || "Organizador",
      arena_name: organizerProfile.arenaName || profile.arena_name || profile.name || "Minha arena",
      phone: organizerProfile.whatsapp || "",
      address: organizerProfile.address || "",
      maps_link: organizerProfile.mapsLink || "",
      city: organizerProfile.city || "",
      state: organizerProfile.state || "",
      photo_url: organizerProfile.photoUrl || "",
      instagram_handle: organizerProfile.instagramHandle || "",
      instagram_link: organizerProfile.instagramLink || "",
      whatsapp_group_link: organizerProfile.whatsappGroupLink || "",
      is_public: nextVisibility,
    };
  }

  async function saveOrganizerProfile() {
    if (!user?.id || profileSaving) return false;
    setProfileSaveSuccess(false);
    if (profileSaveSuccessTimerRef.current) clearTimeout(profileSaveSuccessTimerRef.current);
    setProfileSaving(true);

    const publicProfileData = buildOrganizerProfilePayload();

    localStorage.setItem(`organizerProfile:${user.id}`, JSON.stringify({
      ...organizerProfile,
      organizerName: publicProfileData.name,
      arenaName: publicProfileData.arena_name,
      isPublic: publicProfileData.is_public,
    }));

    const { data, error } = await supabase
      .from("profiles")
      .update(publicProfileData)
      .eq("id", user.id)
      .select("*")
      .single();

    setProfileSaving(false);

    if (error) {
      console.error("Erro ao salvar perfil no Supabase:", error);
      showNotice("error", "Perfil não salvo", `O Supabase recusou a alteração. Detalhe: ${error.message || "erro desconhecido"}`);
      return false;
    }

    if (data) {
      onProfileChange?.((prev) => ({ ...prev, ...data }));
      setOrganizerProfile((prev) => ({
        ...prev,
        photoUrl: data.photo_url || prev.photoUrl || "",
        arenaName: data.arena_name || prev.arenaName || "",
        organizerName: data.name || prev.organizerName || "",
        email: user.email || prev.email || "",
        whatsapp: data.phone || prev.whatsapp || "",
        address: data.address || prev.address || "",
        mapsLink: data.maps_link || prev.mapsLink || "",
        city: data.city || prev.city || "",
        state: data.state || prev.state || "",
        instagramHandle: data.instagram_handle || prev.instagramHandle || "",
        instagramLink: data.instagram_link || prev.instagramLink || "",
        whatsappGroupLink: data.whatsapp_group_link || prev.whatsappGroupLink || "",
        isPublic: data.is_public !== false,
      }));
    }

    await loadPublicArenaProfiles();
    setProfileSaveSuccess(true);
    profileSaveSuccessTimerRef.current = setTimeout(() => {
      setProfileSaveSuccess(false);
      profileSaveSuccessTimerRef.current = null;
    }, 2600);
    return true;
  }

  async function toggleOrganizerProfileVisibility() {
    if (!user?.id || profileVisibilitySaving) return;

    const nextVisibility = organizerProfile.isPublic === false;
    const previousProfile = organizerProfile;
    const nextProfile = { ...organizerProfile, isPublic: nextVisibility };

    setProfileVisibilitySaving(true);
    setOrganizerProfile(nextProfile);
    localStorage.setItem(`organizerProfile:${user.id}`, JSON.stringify(nextProfile));

    const { data, error } = await supabase
      .from("profiles")
      .update(buildOrganizerProfilePayload(nextVisibility))
      .eq("id", user.id)
      .select("*")
      .single();

    setProfileVisibilitySaving(false);

    if (error) {
      console.error("Erro ao alterar visibilidade do perfil:", error);
      setOrganizerProfile(previousProfile);
      localStorage.setItem(`organizerProfile:${user.id}`, JSON.stringify(previousProfile));
      showNotice("error", "Visibilidade não alterada", `Não foi possível alterar o perfil. Detalhe: ${error.message || "erro desconhecido"}`);
      return;
    }

    if (data) onProfileChange?.((prev) => ({ ...prev, ...data }));
    await loadPublicArenaProfiles();
    showNotice(
      "success",
      nextVisibility ? "Perfil público" : "Perfil privado",
      nextVisibility
        ? "Seu perfil agora aparece na aba Início dos outros usuários."
        : "Seu perfil foi ocultado da aba Início dos outros usuários."
    );
  }


  function toggleNewPublicInfo(field) {
    setNewPublicInfo((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function buildTournamentPublicInfo() {
    return {
      visibility: { ...newPublicInfo },
      organizer: {
        photoUrl: organizerProfile.photoUrl || "",
        arenaName: organizerProfile.arenaName || "",
        organizerName: organizerProfile.organizerName || "",
        whatsapp: organizerProfile.whatsapp || "",
        instagramHandle: organizerProfile.instagramHandle || "",
        instagramLink: organizerProfile.instagramLink || "",
        whatsappGroupLink: organizerProfile.whatsappGroupLink || "",
        address: organizerProfile.address || "",
        mapsLink: organizerProfile.mapsLink || "",
        city: organizerProfile.city || "",
        state: organizerProfile.state || "",
      },
    };
  }


  function handleOrganizerPhotoFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      showNotice("warning", "Arquivo inválido", "Escolha uma imagem para usar como foto de perfil.");
      return;
    }
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotice("warning", "Imagem muito grande", "Escolha uma imagem com até 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoEditor({ imageUrl: String(reader.result || ""), zoom: 1, x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }

  function clampPhotoZoom(value) {
    return Math.min(4, Math.max(1, Number(value) || 1));
  }

  function clampPhotoOffset(value) {
    return Math.min(160, Math.max(-160, Number(value) || 0));
  }

  function handlePhotoPointerDown(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    photoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (photoPointersRef.current.size === 1) {
      lastPhotoDragRef.current = { x: e.clientX, y: e.clientY };
      lastPhotoPinchRef.current = null;
    }

    if (photoPointersRef.current.size === 2) {
      const points = Array.from(photoPointersRef.current.values());
      lastPhotoPinchRef.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      lastPhotoDragRef.current = null;
    }
  }

  function handlePhotoPointerMove(e) {
    if (!photoPointersRef.current.has(e.pointerId)) return;
    e.preventDefault();
    photoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (photoPointersRef.current.size === 1 && lastPhotoDragRef.current) {
      const dx = e.clientX - lastPhotoDragRef.current.x;
      const dy = e.clientY - lastPhotoDragRef.current.y;
      lastPhotoDragRef.current = { x: e.clientX, y: e.clientY };

      setPhotoEditor((prev) => prev ? {
        ...prev,
        x: clampPhotoOffset((prev.x || 0) + dx),
        y: clampPhotoOffset((prev.y || 0) + dy),
      } : prev);
    }

    if (photoPointersRef.current.size === 2 && lastPhotoPinchRef.current) {
      const points = Array.from(photoPointersRef.current.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const ratio = distance / lastPhotoPinchRef.current;
      lastPhotoPinchRef.current = distance;

      setPhotoEditor((prev) => prev ? {
        ...prev,
        zoom: clampPhotoZoom((prev.zoom || 1) * ratio),
      } : prev);
    }
  }

  function handlePhotoPointerEnd(e) {
    photoPointersRef.current.delete(e.pointerId);
    lastPhotoDragRef.current = null;
    lastPhotoPinchRef.current = null;

    if (photoPointersRef.current.size === 1) {
      const point = Array.from(photoPointersRef.current.values())[0];
      lastPhotoDragRef.current = { x: point.x, y: point.y };
    }
  }

  function handlePhotoWheel(e) {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -0.08 : 0.08;
    setPhotoEditor((prev) => prev ? {
      ...prev,
      zoom: clampPhotoZoom((prev.zoom || 1) + direction),
    } : prev);
  }

  function nudgePhotoZoom(amount) {
    setPhotoEditor((prev) => prev ? {
      ...prev,
      zoom: clampPhotoZoom((prev.zoom || 1) + amount),
    } : prev);
  }

  function drawPhotoEditorCanvas(canvas, outputSize, onDone) {
    if (!canvas || !photoEditor?.imageUrl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.clearRect(0, 0, outputSize, outputSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();

      const baseScale = Math.max(outputSize / image.width, outputSize / image.height);
      const scale = baseScale * Number(photoEditor.zoom || 1);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const previewSize = photoPreviewRef.current?.getBoundingClientRect()?.width || outputSize;
      const offsetScale = outputSize / previewSize;
      const offsetX = Number(photoEditor.x || 0) * offsetScale;
      const offsetY = Number(photoEditor.y || 0) * offsetScale;

      ctx.drawImage(
        image,
        (outputSize - drawWidth) / 2 + offsetX,
        (outputSize - drawHeight) / 2 + offsetY,
        drawWidth,
        drawHeight
      );
      ctx.restore();

      onDone?.(canvas);
    };
    image.src = photoEditor.imageUrl;
  }

  useEffect(() => {
    if (!photoEditor?.imageUrl || !photoCanvasRef.current || !photoPreviewRef.current) return;
    const previewSize = Math.round(photoPreviewRef.current.getBoundingClientRect().width || 220);
    drawPhotoEditorCanvas(photoCanvasRef.current, previewSize);
  }, [photoEditor]);

  function applyEditedOrganizerPhoto() {
    if (!photoEditor?.imageUrl) return;

    const canvas = document.createElement("canvas");
    drawPhotoEditorCanvas(canvas, 360, (finalCanvas) => {
      const photoUrl = finalCanvas.toDataURL("image/png", 0.92);
      setOrganizerProfile((prev) => {
        const next = { ...prev, photoUrl };
        localStorage.setItem(`organizerProfile:${user.id}`, JSON.stringify(next));
        return next;
      });
      setPhotoEditor(null);
      showNotice("success", "Foto atualizada", "A foto de perfil foi ajustada e salva.");
    });
  }

  function removeOrganizerPhoto() {
    setOrganizerProfile((prev) => {
      const next = { ...prev, photoUrl: "" };
      localStorage.setItem(`organizerProfile:${user.id}`, JSON.stringify(next));
      return next;
    });
  }

  async function loadTournaments() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleteLimit = thirtyDaysAgo.toISOString();

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showNotice("error", "Erro ao carregar", "Não foi possível carregar seus torneios.");
      console.error(error);
      return;
    }

    const allTournaments = data || [];
    const expiredTrash = allTournaments.filter((item) => item.data?.deletedAt && item.data.deletedAt < deleteLimit);

    if (expiredTrash.length) {
      const { error: purgeError } = await supabase
        .from("tournaments")
        .delete()
        .eq("user_id", user.id)
        .in("id", expiredTrash.map((item) => item.id));

      if (purgeError) console.error("Erro ao excluir itens expirados da lixeira:", purgeError);
    }

    const validTournaments = allTournaments.filter((item) => !item.data?.deletedAt || item.data.deletedAt >= deleteLimit);
    setTournaments(validTournaments.filter((item) => !item.data?.deletedAt));
    setTrashTournaments(validTournaments.filter((item) => item.data?.deletedAt));
  }

  async function openArenaProfile(arena) {
    setSelectedArenaProfile(arena);
    setSelectedArenaTournaments([]);
    setSelectedArenaLoading(true);

    const result = await supabase.rpc("list_public_tournaments_by_organizer", {
      p_organizer_id: arena.id,
      p_limit: 200,
    });

    setSelectedArenaLoading(false);

    if (result.error) {
      console.error("Erro ao carregar publicações da arena:", result.error);
      showNotice("error", "Erro ao abrir arena", "Não foi possível carregar as publicações desta arena.");
      return;
    }

    const visibleTournaments = (result.data || []).filter((item) => !item.data?.deletedAt);
    setSelectedArenaTournaments(visibleTournaments);
  }

  function closeArenaProfilePage() {
    setSelectedArenaProfile(null);
    setSelectedArenaTournaments([]);
  }

  async function loadPublicArenaProfiles() {
    const currentArenaProfile = {
      id: user.id,
      name: organizerProfile.organizerName || profile.name || user.email || "Organizador",
      arena_name: organizerProfile.arenaName || profile.arena_name || profile.name || "Minha arena",
      city: organizerProfile.city || profile.city || "",
      state: organizerProfile.state || profile.state || "",
      photo_url: organizerProfile.photoUrl || profile.photo_url || "",
      phone: organizerProfile.whatsapp || profile.phone || "",
      address: organizerProfile.address || profile.address || "",
      maps_link: organizerProfile.mapsLink || profile.maps_link || "",
      instagram_handle: organizerProfile.instagramHandle || profile.instagram_handle || "",
      instagram_link: organizerProfile.instagramLink || profile.instagram_link || "",
      whatsapp_group_link: organizerProfile.whatsappGroupLink || profile.whatsapp_group_link || "",
      is_public: organizerProfile.isPublic !== false,
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, arena_name, city, state, photo_url, phone, address, maps_link, instagram_handle, instagram_link, whatsapp_group_link, is_public")
      .eq("is_public", true)
      .order("arena_name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar perfis públicos:", error);
      setPublicArenaProfiles(currentArenaProfile.is_public ? [currentArenaProfile] : []);
      return;
    }

    const profiles = (data || [])
      .filter((item) => item?.id && item.is_public === true)
      .map((item) => ({ ...item, is_public: true }));

    const withoutCurrent = profiles.filter((item) => item.id !== user.id);
    setPublicArenaProfiles(currentArenaProfile.is_public ? [currentArenaProfile, ...withoutCurrent] : withoutCurrent);
  }


  useEffect(() => {
    loadTournaments();
    loadCircuits();
    loadPublicArenaProfiles();
  }, []);

  async function confirmShareTarget() {
    if (!shareTarget || shareTargetSaving) return;

    setShareTargetSaving(true);
    const publicId = shareTarget.public_id || generatePublicId();
    const nextData = {
      ...(shareTarget.data || {}),
      publicInfo: buildTournamentPublicInfo(),
      publishedOnProfile: true,
      publishedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tournaments")
      .update({
        public_id: publicId,
        is_public: true,
        data: nextData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shareTarget.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    setShareTargetSaving(false);

    if (error) {
      console.error("Erro ao publicar torneio:", error);
      showNotice("error", "Torneio não publicado", `Não foi possível publicar esse torneio. Detalhe: ${error.message || "erro desconhecido"}`);
      return;
    }

    if (data) {
      setTournaments((prev) => prev.map((item) => item.id === data.id ? data : item));
      setSelectedArenaTournaments((prev) => prev.map((item) => item.id === data.id ? data : item));
    }

    const linkCopied = await copyToClipboard(getPublicUrl(publicId));
    setShareTarget(null);
    showNotice(
      "success",
      "Torneio publicado",
      linkCopied
        ? "O link público foi copiado. Agora é só enviar para atletas e convidados."
        : "O torneio já está público no perfil da arena."
    );
  }

  async function createTournament() {
    if (!newName.trim()) {
      showNotice("warning", "Nome obrigatório", "Digite um nome para este torneio.");
      return;
    }

    const selectedSport = getSportDefinition(newSport);
    if (!selectedSport.enabled) {
      showNotice("warning", "Modalidade em breve", `${selectedSport.name} ainda não está disponível. Nesta etapa, crie torneios de Beach Tennis.`);
      return;
    }

    if (!newType) {
  showNotice("warning", "Formato obrigatório", "Escolha o formato do torneio de Beach Tennis.");
  return;
}

    if (!allowedTypes.includes(newType)) {
      showNotice("warning", "Modalidade não liberada", "Seu plano não permite essa modalidade.");
      return;
    }

    if (profile.plan === "basic" && tournaments.length >= 1) {
      showNotice("warning", "Limite do plano básico", "O plano Basic permite apenas 1 campeonato por vez.");
      return;
    }

    if (newDate && newEndDate && newEndDate < newDate) {
      showNotice("warning", "Período inválido", "A data final do torneio não pode ser anterior à data inicial.");
      return;
    }

    if (newRegistrationDeadline && newDate && newRegistrationDeadline > newDate) {
      showNotice("warning", "Inscrições após o início", "A data de encerramento das inscrições não pode ser depois do início do torneio.");
      return;
    }

    const config = getModalityConfig(newType);
    const isMultiCategory = newMultiCategoryEvent === "sim";
    const validCategorySchedules = newCategorySchedules.filter((item) => item.category.trim());

    if (isMultiCategory && validCategorySchedules.length === 0) {
      showNotice("warning", "Categoria obrigatória", "Adicione pelo menos uma categoria para este evento.");
      return;
    }

    setSaving(true);

    const baseData = {
      sport: DEFAULT_SPORT_ID,
      eventName: newName.trim(),
      eventGroupKey,
      multiCategoryEvent: isMultiCategory,
      eventStartDate: newDate,
      eventEndDate: newEndDate || newDate,
      eventPeriodLabel: newEndDate && newEndDate !== newDate ? `${formatDateBR(newDate)} até ${formatDateBR(newEndDate)}` : formatDateBR(newDate),
      registrationDeadline: newRegistrationDeadline,
      location: newLocation.trim(),
      publicInfo: buildTournamentPublicInfo(),
      winningScore: Number(newWinningScore) || 4,
      rankingCriteria: newRankingCriteria || defaultRankingCriteria,
    };

    const rowsToInsert = isMultiCategory
      ? validCategorySchedules.map((item) => ({
          user_id: user.id,
          name: item.category.trim(),
          type: newType,
          data: {
            ...createInitialData(newType, config, newCupTeamCount),
            ...baseData,
            gender: item.category.trim(),
            eventDate: item.date || newDate,
            eventDay: getWeekdayBR(item.date || newDate),
            eventStartTime: item.time,
          },
          status: "active",
        }))
      : [{
          user_id: user.id,
          name: newName.trim(),
          type: newType,
          data: {
            ...createInitialData(newType, config, newCupTeamCount),
            ...baseData,
            gender: newGender,
            eventDate: newDate,
            eventDay: getWeekdayBR(newDate),
            eventStartTime: newEventStartTime,
          },
          status: "active",
        }];

    const { error } = await supabase.from("tournaments").insert(rowsToInsert);

    setSaving(false);

    if (error) {
      showNotice("error", "Erro ao criar torneio", "Tente novamente em alguns instantes.");
      console.error(error);
      return;
    }

    setNewName("");
    setNewSport(DEFAULT_SPORT_ID);
    setNewType("");
setNewGender("");
setNewMultiCategoryEvent("nao");
setNewCategorySchedules([{ category: "", date: "", time: "" }]);
setNewDate("");
setNewEndDate("");
setNewRegistrationDeadline("");
setNewEventStartTime("");
setNewDailyStartTimes({});
setNewDay("");
setNewLocation("");
setNewWinningScore(4);
setNewCupTeamCount(12);
setNewRankingCriteria(defaultRankingCriteria);
setNewPublicInfo({
  showArenaName: true,
  showOrganizerName: true,
  showWhatsapp: true,
  showWhatsappGroupLink: true,
  showInstagram: true,
  showAddress: true,
  showMapsLink: true,
  showCityState: true,
});
    await loadTournaments();
    setTournamentWorkspace("list");
    showNotice("success", isMultiCategory ? "Torneios criados" : "Torneio criado", isMultiCategory ? "As categorias foram criadas como torneios separados dentro do mesmo evento." : "O torneio foi criado com sucesso.");
  }

  async function confirmDeleteTournament() {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from("tournaments")
      .update({
        data: {
          ...(deleteTarget.data || {}),
          deletedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTarget.id)
      .eq("user_id", user.id);

    if (error) {
      showNotice("error", "Erro ao mover", "Não foi possível mover este torneio para a lixeira.");
      console.error(error);
      return;
    }

    setDeleteTarget(null);
    await loadTournaments();
    showNotice("success", "Torneio movido para a lixeira", "Você pode recuperar este torneio em até 30 dias.");
  }

  async function restoreTournament(tournament) {
    const restoredData = { ...(tournament.data || {}) };
    delete restoredData.deletedAt;

    const { error } = await supabase
      .from("tournaments")
      .update({
        data: restoredData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournament.id)
      .eq("user_id", user.id);

    if (error) {
      showNotice("error", "Erro ao recuperar", "Não foi possível recuperar este torneio.");
      console.error(error);
      return;
    }

    await loadTournaments();
    showNotice("success", "Torneio recuperado", "O torneio voltou para o histórico.");
  }

  function getTrashDaysLeft(tournament) {
    const baseDate = tournament.data?.deletedAt || tournament.updated_at || tournament.created_at;
    if (!baseDate) return 30;
    const deletedAt = new Date(baseDate).getTime();
    const expiresAt = deletedAt + 30 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  async function openTournament(tournament) {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournament.id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      showNotice("error", "Erro ao abrir", "Não foi possível abrir este torneio.");
      console.error(error);
      return;
    }

    updateAppUrl({ activePanel: "criar", selectedTournamentId: data.id });
    setSelected(data);
  }

  async function saveTournament(updated) {
    const { error } = await supabase
      .from("tournaments")
      .update({
        name: updated.name,
        type: updated.type,
        data: updated.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      return false;
    }

    setSelected(updated);
    setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    return true;
  }

  function openEditTournament(tournament) {
    const details = tournament.data || {};
    setEditTarget(tournament);
    setEditForm({
      name: tournament.name || "",
      sport: details.sport || DEFAULT_SPORT_ID,
      type: normalizeModalityName(tournament.type) || "",
      eventName: details.eventName || "",
      gender: details.gender || "",
      eventDate: details.eventDate || "",
      eventEndDate: details.eventEndDate || details.eventDate || "",
      registrationDeadline: details.registrationDeadline || "",
      eventStartTime: details.eventStartTime || "",
      location: details.location || "",
      winningScore: Number(details.winningScore || 4),
      rankingCriteria: details.rankingCriteria || defaultRankingCriteria,
    });
  }

  function updateEditForm(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEditedTournament() {
    if (!editTarget || !editForm) return;

    if (!editForm.name.trim()) {
      showNotice("warning", "Nome obrigatório", "Digite um nome para este torneio.");
      return;
    }

    if (editForm.eventDate && editForm.eventEndDate && editForm.eventEndDate < editForm.eventDate) {
      showNotice("warning", "Período inválido", "A data final não pode ser anterior à data inicial.");
      return;
    }

    const isGroupedCategory = Boolean(editTarget.data?.multiCategoryEvent);
    const updatedData = {
      ...(editTarget.data || {}),
      sport: DEFAULT_SPORT_ID,
      eventName: editForm.eventName.trim(),
      gender: editForm.gender,
      eventDate: editForm.eventDate,
      eventStartDate: editForm.eventDate,
      eventEndDate: isGroupedCategory ? editForm.eventDate : (editForm.eventEndDate || editForm.eventDate),
      eventPeriodLabel: isGroupedCategory
        ? formatDateBR(editForm.eventDate)
        : editForm.eventEndDate && editForm.eventEndDate !== editForm.eventDate
          ? `${formatDateBR(editForm.eventDate)} até ${formatDateBR(editForm.eventEndDate)}`
          : formatDateBR(editForm.eventDate),
      eventDay: isGroupedCategory
        ? getWeekdayBR(editForm.eventDate)
        : editForm.eventEndDate && editForm.eventEndDate !== editForm.eventDate
          ? `${getWeekdayBR(editForm.eventDate)} até ${getWeekdayBR(editForm.eventEndDate)}`
          : getWeekdayBR(editForm.eventDate),
      registrationDeadline: editForm.registrationDeadline,
      eventStartTime: editForm.eventStartTime,
      location: editForm.location.trim(),
      winningScore: Number(editForm.winningScore) || 4,
      rankingCriteria: editForm.rankingCriteria || defaultRankingCriteria,
    };

    const updated = {
      ...editTarget,
      name: editForm.name.trim(),
      type: editForm.type,
      data: updatedData,
    };

    const { error } = await supabase
      .from("tournaments")
      .update({
        name: updated.name,
        type: updated.type,
        data: updated.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      showNotice("error", "Erro ao salvar", "Não foi possível atualizar este torneio.");
      return;
    }

    setTournaments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditTarget(null);
    setEditForm(null);
    showNotice("success", "Torneio atualizado", "As informações foram atualizadas com sucesso.");
  }

  function getEventDateRange() {
    if (!newDate) return [];

    const endDate = newEndDate || newDate;
    if (endDate < newDate) return [];

    const dates = [];
    const current = new Date(`${newDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  const eventDateRange = getEventDateRange();
  const isMultiDayEvent = eventDateRange.length > 1;

  function updateDailyStartTime(date, time) {
    setNewDailyStartTimes((prev) => ({ ...prev, [date]: time }));
  }

  function updateCategorySchedule(index, field, value) {
    setNewCategorySchedules((prev) =>
      prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    );
  }

  function addCategorySchedule() {
    setNewCategorySchedules((prev) => [...prev, { category: "", date: "", time: "" }]);
  }

  function removeCategorySchedule(index) {
    setNewCategorySchedules((prev) => prev.length <= 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveTournamentByDrag(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;

    setTournaments((prev) => {
      const list = [...prev];
      const fromIndex = list.findIndex((item) => item.id === fromId);
      const toIndex = list.findIndex((item) => item.id === toId);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;

      const [item] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, item);
      return list;
    });
  }
  function closeSelectedTournament() {
    updateAppUrl({ activePanel: "criar", selectedTournamentId: null });
    saveUserAppState({ activePanel: "criar", selectedTournamentId: null });
    setSelected(null);
  }

  function rememberTournamentNavigation({ tournamentId, tournamentTab, matchesTab }) {
    saveUserAppState({
      activePanel: "criar",
      selectedTournamentId: tournamentId,
      tournamentTab,
      matchesTab,
    });
  }

  function renderAppSidebar() {
    const navItems = [
      { panel: "inicio", label: "Visão geral", Icon: LayoutDashboard },
      { panel: "criar", label: "Torneios", Icon: Trophy },
      { panel: "circuitos", label: "Circuitos", Icon: MapIcon },
      { panel: "modalidades", label: "Modalidades", Icon: Activity },
    ];

    return (
      <aside className="playSidebar proSidebar" aria-label="Navegação principal">
        <button type="button" className="sidebarLogoButton" onClick={() => goToPanel("inicio")} aria-label="Ir para a visão geral">
          <BeachLogo />
        </button>
        <span className="sidebarSectionLabel">Menu</span>
        <nav className="sidebarNav">
          {navItems.map(({ panel, label, Icon }) => (
            <button
              key={panel}
              className={`playNavItem ${activePanel === panel ? "active" : ""}`}
              type="button"
              onClick={() => goToPanel(panel)}
              aria-current={activePanel === panel ? "page" : undefined}
              title={label}
            >
              <span className="navIcon" aria-hidden="true"><Icon /></span>
              <small>{label}</small>
            </button>
          ))}
        </nav>
        <div className="sidebarBrandAccent" aria-hidden="true">TORNEIO360 • 2026</div>
      </aside>
    );
  }

  function renderAppTopbar() {
    return (
      <header className="playTopbar proTopbar">
        <div className="playTopBrand">
          <BeachLogo />
          <div className="brandTaglineOnly">
            <span>{TORNEIO360_TAGLINE}</span>
          </div>
        </div>

        <div className="playUserBox proTopActions">
          <button
            type="button"
            className="themeToggleButton"
            onClick={toggleColorMode}
            aria-label={colorMode === "dark" ? "Ativar modo claro" : "Ativar modo noturno"}
            aria-pressed={colorMode === "dark"}
            title={colorMode === "dark" ? "Modo claro" : "Modo noturno"}
          >
            {colorMode === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            <span>{colorMode === "dark" ? "Modo claro" : "Modo noturno"}</span>
          </button>

          <div className="profileMenuWrap" ref={profileMenuRef}>
            <div className={`profileControl ${activePanel === "ajustes" || activePanel === "lixeira" ? "accountAreaActive" : ""}`}>
              <button type="button" className="profileTrigger" onClick={() => setProfileMenuOpen((open) => !open)} title="Abrir menu do perfil">
                <span className="profileAvatar" aria-hidden="true">
                  {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="" /> : <span>{profileInitials}</span>}
                </span>
                <span className="profileTriggerCopy">
                  <strong>{profileDisplayName}</strong>
                  <small>Organizador</small>
                </span>
              </button>
              <button
                type="button"
                className="profileMenuToggle"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-label="Abrir menu da conta"
                aria-expanded={profileMenuOpen}
              >
                <ChevronDown aria-hidden="true" />
              </button>
            </div>

            {profileMenuOpen ? (
              <div className="profileDropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={`profileDropdownItem ${activePanel === "ajustes" && profileSubtab !== "conta" ? "profileDropdownCurrent" : ""}`}
                  onClick={openProfileSettings}
                  aria-current={activePanel === "ajustes" && profileSubtab !== "conta" ? "page" : undefined}
                >
                  <UserRound aria-hidden="true" />
                  <span><strong>Meu perfil</strong></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="profileDropdownItem"
                  onClick={openOwnPublicProfile}
                >
                  <LayoutDashboard aria-hidden="true" />
                  <span><strong>Área pública</strong></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`profileDropdownItem ${activePanel === "ajustes" && profileSubtab === "conta" ? "profileDropdownCurrent" : ""}`}
                  onClick={() => openProfileSection("conta")}
                  aria-current={activePanel === "ajustes" && profileSubtab === "conta" ? "page" : undefined}
                >
                  <HelpCircle aria-hidden="true" />
                  <span><strong>Ajuda e suporte</strong></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`profileDropdownItem ${activePanel === "lixeira" ? "profileDropdownCurrent" : ""}`}
                  onClick={() => { setProfileMenuOpen(false); goToPanel("lixeira"); }}
                  aria-current={activePanel === "lixeira" ? "page" : undefined}
                >
                  <Trash2 aria-hidden="true" />
                  <span><strong>Lixeira</strong></span>
                </button>
                <div className="profileDropdownDivider" />
                <button type="button" role="menuitem" className="profileDropdownItem profileDropdownLogout" onClick={logout}>
                  <LogOut aria-hidden="true" />
                  <span><strong>Sair</strong></span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  if (selected) {
    return (
      <div className={`playAppShell proDashboard theme-${colorMode} panel-${activePanel} tournament-selected`}>
        {renderAppSidebar()}
        <div className="playMain">
          {renderAppTopbar()}
          <main className="playContent tournamentWorkspaceContent">
            <TournamentErrorBoundary tournamentId={selected.id} onBack={closeSelectedTournament}>
              <TournamentScreen
                key={selected.id}
                tournament={selected}
                userId={user.id}
                organizerProfile={organizerProfile}
                onBack={closeSelectedTournament}
                onEdit={() => {
                  const tournamentToEdit = selected;
                  closeSelectedTournament();
                  openEditTournament(tournamentToEdit);
                }}
                onSave={saveTournament}
                onNavigationStateChange={rememberTournamentNavigation}
              />
            </TournamentErrorBoundary>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`playAppShell proDashboard theme-${colorMode} panel-${activePanel}`}>
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />

      <ConfirmModal
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTournament}
      />

      {shareTarget ? (
        <div className="editTournamentOverlay" role="dialog" aria-modal="true">
          <div className="editTournamentModal shareTournamentModal">
            <div className="editTournamentHeader">
              <div>
                <h2>Compartilhar campeonato</h2>
                <p>Confira as informações do perfil que podem aparecer na publicação pública deste torneio.</p>
              </div>
              <button type="button" className="secondaryBtn" onClick={() => setShareTarget(null)}>Fechar</button>
            </div>

            <div className="publicProfilePreview">
              {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="Foto do organizador" /> : null}
              <div>
                <strong>{organizerProfile.arenaName || "Nome da arena não informado"}</strong>
                <span>{organizerProfile.organizerName || "Organizador não informado"}</span>
              </div>
            </div>

            <div className="sharePublishSummary">
              <Share2 aria-hidden="true" />
              <div>
                <strong>Publicar no perfil da arena</strong>
                <p>O torneio ficará disponível em uma página pública. O link será copiado para você compartilhar.</p>
              </div>
            </div>

            <div className="editTournamentActions">
              <button type="button" className="cancelBtn" onClick={() => setShareTarget(null)}>Cancelar</button>
              <button type="button" onClick={confirmShareTarget} disabled={shareTargetSaving}>
                <Share2 aria-hidden="true" />
                {shareTargetSaving ? "Publicando..." : "Publicar e copiar link"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget && editForm ? (
        <div className="editTournamentOverlay" role="dialog" aria-modal="true">
          <div className="editTournamentModal">
            <div className="editTournamentHeader">
              <div>
                <h2>Editar torneio</h2>
                <p>Atualize as informações principais deste torneio.</p>
              </div>
              <button type="button" className="secondaryBtn" onClick={() => { setEditTarget(null); setEditForm(null); }}>Fechar</button>
            </div>

            <div className="editTournamentGrid">
              <div className="formField">
                <label>Nome do evento/torneio</label>
                <input value={editForm.name} onChange={(e) => updateEditForm("name", e.target.value)} />
              </div>

              <div className="formField">
                <label>Categoria/Gênero</label>
                <input value={editForm.gender} onChange={(e) => updateEditForm("gender", e.target.value)} placeholder="Ex: Masculino iniciante" />
              </div>

              <div className="formField">
                <label>Modalidade esportiva</label>
                <select value={editForm.sport || DEFAULT_SPORT_ID} onChange={(e) => updateEditForm("sport", e.target.value)}>
                  {SPORT_CATALOG.map((sport) => (
                    <option key={sport.id} value={sport.id} disabled={!sport.enabled}>
                      {sport.name}{sport.enabled ? "" : " — Em breve"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formField">
                <label>Formato do Beach Tennis</label>
                <select value={editForm.type} onChange={(e) => updateEditForm("type", e.target.value)}>
                  {allowedTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="formField">
                <label>Local</label>
                <input value={editForm.location} onChange={(e) => updateEditForm("location", e.target.value)} />
              </div>

              <div className="formField">
                <label>Início</label>
                <input className="clickableDateInput" type="date" value={editForm.eventDate} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => updateEditForm("eventDate", e.target.value)} />
              </div>

              {!editTarget.data?.multiCategoryEvent && (
              <div className="formField">
                <label>Fim</label>
                <input className="clickableDateInput" type="date" value={editForm.eventEndDate} min={editForm.eventDate || undefined} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => updateEditForm("eventEndDate", e.target.value)} />
              </div>
              )}

              <div className="formField">
                <label>Encerramento das inscrições</label>
                <input className="clickableDateInput" type="date" value={editForm.registrationDeadline} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => updateEditForm("registrationDeadline", e.target.value)} />
              </div>

              <div className="formField">
                <label>Horário de início</label>
                <input type="time" value={editForm.eventStartTime} onChange={(e) => updateEditForm("eventStartTime", e.target.value)} />
              </div>

              <div className="formField">
                <label>Set para vencer</label>
                <select value={editForm.winningScore} onChange={(e) => updateEditForm("winningScore", Number(e.target.value))}>
                  <option value={4}>4 games</option>
                  <option value={6}>6 games</option>
                </select>
              </div>

              <div className="formField fullField">
                <label>Critério do ranking</label>
                <select value={editForm.rankingCriteria} onChange={(e) => updateEditForm("rankingCriteria", e.target.value)}>
                  {rankingCriteriaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            <div className="editTournamentActions">
              <button type="button" className="cancelBtn" onClick={() => { setEditTarget(null); setEditForm(null); }}>Cancelar</button>
              <button type="button" onClick={saveEditedTournament}>Salvar alterações</button>
            </div>
          </div>
        </div>
      ) : null}

      {profileEditing ? (
        <div className="figmaProfileEditOverlay" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
          <section className="figmaProfileEditModal">
            <header>
              <h2 id="profile-edit-title"><Edit2 aria-hidden="true" /> Editar Perfil</h2>
              <button type="button" onClick={() => closeOrganizerProfileEditor()} aria-label="Fechar"><X aria-hidden="true" /></button>
            </header>
            <div className="figmaProfileEditBody">
              <label className="figmaProfilePhotoPicker" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleOrganizerPhotoFile(event.dataTransfer.files?.[0]); }}>
                <input type="file" accept="image/*" onChange={(event) => handleOrganizerPhotoFile(event.target.files?.[0])} />
                <span>{organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="Foto atual" /> : <Camera aria-hidden="true" />}<PlusCircle className="figmaProfilePhotoAdd" aria-hidden="true" /></span>
                <small>Clique para trocar a imagem (JPG ou PNG)</small>
              </label>

              <section>
                <h3>INFORMAÇÕES PÚBLICAS</h3>
                <label><span>Nome da Arena ou Organizador</span><input value={organizerProfile.arenaName} onChange={(event) => updateOrganizerProfile("arenaName", event.target.value)} /></label>
                <label><span>Descrição curta</span><textarea rows={3} value={organizerProfile.description || ""} onChange={(event) => updateOrganizerProfile("description", event.target.value)} placeholder="Conte um pouco sobre a sua arena." /></label>
              </section>

              <section>
                <h3>CONTATO E LOCALIZAÇÃO</h3>
                <div className="figmaProfileEditGrid">
                  <label><span>Cidade, UF</span><input value={[organizerProfile.city, organizerProfile.state].filter(Boolean).join(", ")} onChange={(event) => {
                    const [cityValue, stateValue = ""] = event.target.value.split(",");
                    updateOrganizerProfile("city", cityValue.trim());
                    updateOrganizerProfile("state", stateValue.trim());
                  }} /></label>
                  <label><span>WhatsApp</span><input value={organizerProfile.whatsapp} onChange={(event) => updateOrganizerProfile("whatsapp", event.target.value)} /></label>
                  <label><span>Instagram (sem @)</span><input value={String(organizerProfile.instagramHandle || "").replace(/^@/, "")} onChange={(event) => updateOrganizerProfile("instagramHandle", event.target.value.replace(/^@/, ""))} /></label>
                  <label><span>E-mail público</span><input type="email" value={organizerProfile.publicEmail || organizerProfile.email || ""} onChange={(event) => updateOrganizerProfile("publicEmail", event.target.value)} /></label>
                </div>
              </section>

              <section>
                <h3>PRIVACIDADE DO PERFIL</h3>
                <div className="figmaPrivacyOptions">
                  <label className={organizerProfile.isPublic !== false ? "selected" : ""}>
                    <input type="radio" name="profile-privacy" checked={organizerProfile.isPublic !== false} onChange={() => updateOrganizerProfile("isPublic", true)} />
                    <span><strong>Perfil Público</strong><small>Outros usuários poderão encontrar a arena nas buscas, acessar torneios abertos e as informações de contato fornecidas acima.</small></span>
                  </label>
                  <label className={organizerProfile.isPublic === false ? "selected" : ""}>
                    <input type="radio" name="profile-privacy" checked={organizerProfile.isPublic === false} onChange={() => updateOrganizerProfile("isPublic", false)} />
                    <span><strong>Perfil Privado</strong><small>O perfil não aparecerá nas buscas públicas do Torneio360. Apenas pessoas com links diretos conseguirão acessá-lo.</small></span>
                  </label>
                </div>
              </section>
            </div>
            <footer>
              <button type="button" className="cancel" onClick={() => closeOrganizerProfileEditor()}>Cancelar</button>
              <button type="button" className="save" onClick={saveOrganizerProfileEditor} disabled={profileSaving}>{profileSaving ? "Salvando..." : "Salvar alterações"}</button>
            </footer>
          </section>
        </div>
      ) : null}

      {photoEditor ? (
        <div className="photoEditorOverlay" role="dialog" aria-modal="true">
          <div className="photoEditorModal">
            <h2>Ajustar foto de perfil</h2>
            <p>Arraste a imagem para alinhar. Use o movimento de pinça no celular ou a roda do mouse para aproximar.</p>
            <div
              ref={photoPreviewRef}
              className="photoEditorPreview"
              onPointerDown={handlePhotoPointerDown}
              onPointerMove={handlePhotoPointerMove}
              onPointerUp={handlePhotoPointerEnd}
              onPointerCancel={handlePhotoPointerEnd}
              onWheel={handlePhotoWheel}
            >
              <canvas ref={photoCanvasRef} aria-label="Prévia da foto ajustada" />
            </div>
            <div className="photoEditorHint">Toque e arraste para mover • Pinça ou roda do mouse para zoom</div>
            <div className="photoZoomButtons" aria-label="Controles de zoom">
              <button type="button" className="secondaryBtn" onClick={() => nudgePhotoZoom(-0.12)}>−</button>
              <span>{Math.round((photoEditor.zoom || 1) * 100)}%</span>
              <button type="button" className="secondaryBtn" onClick={() => nudgePhotoZoom(0.12)}>+</button>
            </div>
            <div className="photoEditorActions">
              <button type="button" className="cancelBtn" onClick={() => setPhotoEditor(null)}>Cancelar</button>
              <button type="button" onClick={applyEditedOrganizerPhoto}>Aplicar foto</button>
            </div>
          </div>
        </div>
      ) : null}

      {renderAppSidebar()}

      <div className="playMain">
        {renderAppTopbar()}

        <main className="playContent">
          <section className="playTitleBlock">
            <div className="playTitleCopy">
              <span className="pageEyebrow">Painel de gestão</span>
              <div className="playTitleHeadingRow">
                <h1>{currentPanelMeta.title}</h1>
                <div className="playPlanPill">Plano {String(profile.plan || "PRO").replace(/^plano\s+/i, "")} · {formatStatusBR(profile.status)}</div>
              </div>
              <p>{currentPanelMeta.description}</p>
            </div>
            {activePanel === "inicio" ? (
              <div className="dashboardTitleActions">
                <button type="button" className="secondaryBtn" onClick={() => goToPanel("circuitos")}><MapIcon aria-hidden="true" /> Circuitos</button>
                <button type="button" className="secondaryBtn" onClick={() => goToPanel("modalidades")}><Activity aria-hidden="true" /> Modalidades</button>
                <button type="button" className="dashboardPrimaryAction" onClick={openTournamentCreator}><PlusCircle aria-hidden="true" /> Novo torneio</button>
              </div>
            ) : activePanel === "criar" && tournamentWorkspace === "list" ? (
              <div className="dashboardTitleActions">
                <button type="button" className="dashboardPrimaryAction" onClick={openTournamentCreator}><PlusCircle aria-hidden="true" /> Novo torneio</button>
              </div>
            ) : activePanel === "circuitos" && !circuitEditorOpen ? (
              <div className="dashboardTitleActions">
                <button type="button" className="dashboardPrimaryAction" onClick={openCircuitCreator}><PlusCircle aria-hidden="true" /> Criar circuito</button>
              </div>
            ) : null}
          </section>

          {freeTrialDetails ? <FreeTrialNotice details={freeTrialDetails} /> : null}

          {activePanel === "inicio" && (
            <section className="playStatsGrid">
              <div>
                <span className="dashboardStatLabel">Torneios criados <Trophy aria-hidden="true" /></span>
                <strong>{tournaments.length}</strong>
                <small>Gestão centralizada</small>
              </div>
              <div>
                <span className="dashboardStatLabel">Circuitos cadastrados <MapIcon aria-hidden="true" /></span>
                <strong>{circuits.length}</strong>
                <small>Temporada 2026</small>
              </div>
              <div>
                <span className="dashboardStatLabel">Modalidades disponíveis <Activity aria-hidden="true" /></span>
                <strong>{SPORT_CATALOG.length}</strong>
                <small>Beach Tennis ativo no seu clube</small>
              </div>
            </section>
          )}

{activePanel === "inicio" && selectedArenaProfile ? (
<section className="arenaPublicPage card">
  <button type="button" className="arenaPublicBackBtn" onClick={closeArenaProfilePage}>← Voltar para arenas</button>

  <div className="arenaPublicHero">
    <div className="arenaPublicPhoto">
      {selectedArenaProfile.photo_url ? (
        <img src={selectedArenaProfile.photo_url} alt={selectedArenaProfile.arena_name || selectedArenaProfile.name || "Arena"} />
      ) : (
        <span>{(selectedArenaProfile.arena_name || selectedArenaProfile.name || "Arena").slice(0, 2).toUpperCase()}</span>
      )}
    </div>
    <div className="arenaPublicInfo">
      <span>Arena verificada</span>
      <h2>{selectedArenaProfile.arena_name || selectedArenaProfile.name || "Arena cadastrada"}</h2>
      <p>{[selectedArenaProfile.city, selectedArenaProfile.state].filter(Boolean).join("/") || "Local não informado"}</p>
      <small>Organizador: {selectedArenaProfile.name || "Não informado"}</small>
    </div>
  </div>

  <div className="arenaPublicDetailsGrid">
    {selectedArenaProfile.address ? <div><strong>Endereço</strong><span><MapPin aria-hidden="true" /> {selectedArenaProfile.address}</span></div> : null}
    {selectedArenaProfile.phone ? <div><strong>WhatsApp</strong><span>{selectedArenaProfile.phone}</span></div> : null}
    {selectedArenaProfile.instagram_handle ? <div><strong>Instagram</strong><span>{selectedArenaProfile.instagram_handle}</span></div> : null}
  </div>

  <div className="arenaPublicLinksTitle">Links</div>

  <div className="arenaProfileLinks arenaPublicLinks">
    {selectedArenaProfile.instagram_link ? (
      <a href={selectedArenaProfile.instagram_link} target="_blank" rel="noreferrer">Instagram</a>
    ) : selectedArenaProfile.instagram_handle ? (
      <a href={"https://instagram.com/" + String(selectedArenaProfile.instagram_handle).replace("@", "")} target="_blank" rel="noreferrer">Instagram</a>
    ) : null}
    {selectedArenaProfile.whatsapp_group_link ? <a href={selectedArenaProfile.whatsapp_group_link} target="_blank" rel="noreferrer">Grupo WhatsApp</a> : null}
    {selectedArenaProfile.phone ? <a href={"https://wa.me/" + String(selectedArenaProfile.phone).replace(/\D/g, "")} target="_blank" rel="noreferrer">WhatsApp</a> : null}
    {selectedArenaProfile.maps_link ? <a href={selectedArenaProfile.maps_link} target="_blank" rel="noreferrer">Google Maps</a> : null}
  </div>

  <div className="arenaProfilePublicationsHeader arenaPublicPublicationsHeader">
    <strong>Campeonatos publicados</strong>
    <span>{selectedArenaTournaments.length} publicação(ões)</span>
  </div>

  {selectedArenaLoading ? (
    <div className="arenaProfileEmpty">Carregando publicações...</div>
  ) : selectedArenaTournaments.length === 0 ? (
    <div className="arenaProfileEmpty">Esta arena ainda não publicou torneios.</div>
  ) : (
    <div className="arenaPublicTournamentGrid">
      {selectedArenaTournaments.map((t) => {
        const details = t.data || {};
        return (
          <article className="arenaPublicTournamentCard" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <small>{normalizeModalityName(t.type)}</small>
            </div>
            <div className="tournamentMeta">
              {details.eventDate ? <span><CalendarDays aria-hidden="true" /> {formatDateBR(details.eventDate)}</span> : null}
              {details.eventStartTime ? <span><Clock3 aria-hidden="true" /> {details.eventStartTime}</span> : null}
              {details.location ? <span><MapPin aria-hidden="true" /> {details.location}</span> : null}
              {details.gender ? <span><Tag aria-hidden="true" /> {details.gender}</span> : null}
            </div>
            {selectedArenaProfile.whatsapp_group_link ? (
              <button type="button" onClick={() => window.open(selectedArenaProfile.whatsapp_group_link, "_blank", "noopener,noreferrer")}>Inscreva-se</button>
            ) : selectedArenaProfile.phone ? (
              <button type="button" onClick={() => window.open("https://wa.me/" + String(selectedArenaProfile.phone).replace(/\D/g, ""), "_blank", "noopener,noreferrer")}>Inscreva-se</button>
            ) : (
              <span className="arenaTournamentDraftBadge">Inscrições pelo organizador</span>
            )}
          </article>
        );
      })}
    </div>
  )}
</section>
) : activePanel === "inicio" && (
<section className="arenaFeedSection">
  <div className="arenaSearchRow">
    <div className="arenaSearchBox platformSearchBox">
      <input
        value={arenaProfileSearch}
        onChange={(e) => setArenaProfileSearch(e.target.value)}
        placeholder="Buscar arenas ou organizadores parceiros..."
      />
      <span><Search aria-hidden="true" /></span>
    </div>

    <button
      type="button"
      className="mapsMiniBtn"
      onClick={() => window.open("https://www.google.com/maps/search/arena+beach+tennis+perto+de+mim", "_blank", "noopener,noreferrer")}
    >
      <MapPin aria-hidden="true" /> Google Maps
    </button>
  </div>

  <h2 className="arenaFeedTitle">Arenas em destaque</h2>
  <div className="arenaFeedGrid">
    {filteredArenaProfiles.map((arena) => (
      <article className="arenaFeedCard" key={arena.id}>
        <div className="arenaFeedCover registeredArenaCover">
          {arena.photo_url ? <img src={arena.photo_url} alt={arena.arena_name || arena.name || "Arena"} /> : <span>{(arena.arena_name || arena.name || "Arena").slice(0, 2).toUpperCase()}</span>}
        </div>
        <strong>{arena.arena_name || arena.name || "Arena cadastrada"}</strong>
        <small><MapPin aria-hidden="true" /> {[arena.city, arena.state].filter(Boolean).join("/") || "Local não informado"}</small>
        {arena.courts || arena.surface ? <div className="arenaFeedChips">{arena.courts ? <span>{arena.courts} quadras</span> : null}{arena.surface ? <span>{arena.surface}</span> : null}</div> : null}
        <button type="button" onClick={() => openArenaProfile(arena)}>Acessar arena</button>
      </article>
    ))}
    {filteredArenaProfiles.length === 0 ? <div className="arenaFeedEmpty"><Search aria-hidden="true" /><strong>Nenhuma arena encontrada</strong><span>Tente outro nome ou localização.</span></div> : null}
  </div>
</section>
)}

    {activePanel === "criar" && (
    <>
    {tournamentWorkspace === "create" ? (
    <>
    <div className="tournamentWorkspaceHeading">
      <button type="button" className="secondaryBtn" onClick={() => setTournamentWorkspace("list")}>← Voltar para torneios</button>
      <div>
        <span>Criação de torneio</span>
        <h2>Novo torneio de Beach Tennis</h2>
        <p>Preencha os dados do evento. As regras e formatos existentes continuam preservados.</p>
      </div>
    </div>
    <section className="card playCreateCard">
  <h2>Criar novo torneio</h2>

  <div className="formField">
    <label>Nome do evento/torneio</label>
    <input
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      placeholder="Ex: Campeão Open"
    />
  </div>

  <div className="formField">
    <label>Modalidade esportiva</label>
    <select value={newSport} onChange={(e) => setNewSport(e.target.value)}>
      {SPORT_CATALOG.map((sport) => (
        <option key={sport.id} value={sport.id} disabled={!sport.enabled}>
          {sport.name}{sport.enabled ? "" : " — Em breve"}
        </option>
      ))}
    </select>
    <small className="fieldSupportText">Beach Tennis é a modalidade ativa nesta etapa.</small>
  </div>

  <div className="formField">
    <label>Evento com várias categorias e/ou em mais de um dia?</label>
    <select value={newMultiCategoryEvent} onChange={(e) => setNewMultiCategoryEvent(e.target.value)}>
      <option value="nao">Não</option>
      <option value="sim">Sim</option>
    </select>
  </div>

  {newMultiCategoryEvent === "nao" && (
  <div className="formField">
    <label>Categoria/Gênero</label>
    <input
      value={newGender}
      onChange={(e) => setNewGender(e.target.value)}
      placeholder="Ex: Masculino iniciante"
    />
  </div>
  )}

  {newMultiCategoryEvent === "sim" && (
  <div className="formField fullField eventScheduleBox">
    <div className="eventScheduleHeader">
      <strong><Tag aria-hidden="true" /> Categorias, datas e horários</strong>
      <span>Cadastre cada categoria do evento com sua data e horário de início.</span>
    </div>

    <div className="categoryScheduleList">
      {newCategorySchedules.map((item, index) => (
        <div className="categoryScheduleItem" key={index}>
          <div className="formField compactField">
            <label>Categoria/Gênero</label>
            <input
              value={item.category}
              onChange={(e) => updateCategorySchedule(index, "category", e.target.value)}
              placeholder="Ex: Masculino iniciante"
            />
          </div>

          <div className="formField compactField">
            <label>Data</label>
            <input
              className="clickableDateInput"
              type="date"
              value={item.date}
              onClick={openDatePicker}
              onFocus={openDatePicker}
              onChange={(e) => updateCategorySchedule(index, "date", e.target.value)}
            />
          </div>

          <div className="formField compactField">
            <label>Horário</label>
            <input
              type="time"
              value={item.time}
              onChange={(e) => updateCategorySchedule(index, "time", e.target.value)}
            />
          </div>

          <button type="button" className="deleteBtn" onClick={() => removeCategorySchedule(index)} disabled={newCategorySchedules.length <= 1}>
            Remover
          </button>
        </div>
      ))}
    </div>

    <button type="button" className="secondaryBtn" onClick={addCategorySchedule}>
      + Adicionar categoria
    </button>
  </div>
  )}

  <div className="formField fullField eventScheduleBox">
    <div className="eventScheduleHeader">
      <strong><CalendarDays aria-hidden="true" /> Datas e horários do evento</strong>
      <span>Organize o período do torneio, inscrições e início dos jogos.</span>
    </div>

    <div className="eventScheduleGrid">
      <div className="formField compactField">
        <label>Início do torneio</label>
        <input
          className="clickableDateInput"
          type="date"
          value={newDate}
          onClick={openDatePicker}
          onFocus={openDatePicker}
          onChange={(e) => {
            setNewDate(e.target.value);
            if (newEndDate && e.target.value && newEndDate < e.target.value) setNewEndDate(e.target.value);
          }}
        />
      </div>

      <div className="formField compactField">
        <label>Fim do torneio</label>
        <input
          className="clickableDateInput"
          type="date"
          value={newEndDate}
          onClick={openDatePicker}
          onFocus={openDatePicker}
          min={newDate || undefined}
          onChange={(e) => setNewEndDate(e.target.value)}
        />
      </div>

      <div className="formField compactField">
        <label>Encerramento das inscrições</label>
        <input
          className="clickableDateInput"
          type="date"
          value={newRegistrationDeadline}
          onClick={openDatePicker}
          onFocus={openDatePicker}
          max={newDate || undefined}
          onChange={(e) => setNewRegistrationDeadline(e.target.value)}
        />
      </div>

      {newMultiCategoryEvent === "nao" && (
      <div className="formField compactField">
        <label>{isMultiDayEvent ? "Horário padrão de início" : "Horário de início"}</label>
        <input
          type="time"
          value={newEventStartTime}
          onChange={(e) => setNewEventStartTime(e.target.value)}
        />
      </div>
      )}
    </div>

    {newMultiCategoryEvent === "nao" && isMultiDayEvent && (
      <div className="dailyTimesBox">
        <div className="dailyTimesIntro">
          <strong>Horário por dia</strong>
          <span>Use quando cada dia do torneio começar em um horário diferente.</span>
        </div>

        <div className="dailyTimesGrid">
          {eventDateRange.map((date) => (
            <div className="dailyTimeItem" key={date}>
              <label>{formatDateBR(date)} · {getWeekdayBR(date)}</label>
              <input
                type="time"
                value={newDailyStartTimes[date] || newEventStartTime}
                onChange={(e) => updateDailyStartTime(date, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>

  <div className="formField">
    <label>Local</label>
    <input
      value={newLocation}
      onChange={(e) => setNewLocation(e.target.value)}
      placeholder="Ex: Arena Beach Sports"
    />
  </div>

  <div className="formField fullField">
    <label>Formato do Beach Tennis</label>
    <select
      value={newType}
      onChange={(e) => {
        const nextType = e.target.value;
        const nextConfig = getModalityConfig(nextType);
        setNewType(nextType);
        if (isCupType(nextConfig)) setNewCupTeamCount(nextConfig.defaultTeams);
      }}
    >
      <option value="">Escolha o formato</option>
      {allowedTypes.map((type) => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>
  </div>

  {isCupType(selectedNewTournamentConfig) && selectedNewTournamentConfig.allowedTeamCounts?.length > 1 ? (
    <div className="formField">
      <label>Quantidade de grupos e duplas</label>
      <select value={newCupTeamCount} onChange={(e) => setNewCupTeamCount(Number(e.target.value))}>
        {selectedNewTournamentConfig.allowedTeamCounts.map((teamCount) => (
          <option key={teamCount} value={teamCount}>{formatCupGroupOption(selectedNewTournamentConfig, teamCount)}</option>
        ))}
      </select>
      <small>Quantidade de duplas: {newCupTeamCount}. Cada grupo terá {selectedNewTournamentConfig.groupSize || 3} duplas.</small>
    </div>
  ) : null}

  <div className="formField">
    <label>Set para vencer</label>
    <select value={newWinningScore} onChange={(e) => setNewWinningScore(Number(e.target.value))}>
      <option value={4}>4 games</option>
      <option value={6}>6 games</option>
    </select>
  </div>

  <div className="formField fullField">
    <label>Critério do ranking</label>
    <select value={newRankingCriteria} onChange={(e) => setNewRankingCriteria(e.target.value)}>
      {rankingCriteriaOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>

 <div className="tournamentCreateActions">
  <button type="button" className="secondaryBtn" onClick={() => setTournamentWorkspace("list")}>Cancelar</button>
  <button type="button" onClick={createTournament} disabled={saving}>
    {saving ? "Salvando..." : "Criar torneio"}
  </button>
 </div>
      </section>
    </>
    ) : (

<section id="historico-torneios" className="card tournamentManagementCard">
  <div className="tournamentFilterBar">
    <label className="tournamentSearchField">
      <Search aria-hidden="true" />
      <input value={tournamentSearch} onChange={(event) => setTournamentSearch(event.target.value)} placeholder="Buscar torneio..." />
    </label>
    <button type="button" className={`secondaryBtn tournamentFilterToggle ${tournamentFiltersOpen ? "active" : ""}`} onClick={() => setTournamentFiltersOpen((current) => !current)}><Filter aria-hidden="true" /> Filtrar</button>
    {tournamentFiltersOpen && (
      <div className="tournamentAdvancedFilters">
        <select value={tournamentFormatFilter} onChange={(event) => setTournamentFormatFilter(event.target.value)} aria-label="Filtrar por formato">
          <option value="all">Todos os formatos</option>
          {allowedTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={tournamentStatusFilter} onChange={(event) => setTournamentStatusFilter(event.target.value)} aria-label="Filtrar por status">
          <option value="all">Todos os status</option>
          <option value="Inscrições abertas">Inscrições abertas</option>
          <option value="Programado">Programado</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Encerrado">Encerrado</option>
          <option value="Rascunho">Rascunho</option>
        </select>
        <button type="button" className="secondaryBtn" onClick={() => { setTournamentSearch(""); setTournamentFormatFilter("all"); setTournamentStatusFilter("all"); }}>Limpar filtros</button>
      </div>
    )}
  </div>

  {tournaments.length === 0 ? (
    <div className="tournamentEmptyState"><Trophy aria-hidden="true" /><h3>Nenhum torneio criado</h3><p>Crie seu primeiro torneio de Beach Tennis para começar.</p><button type="button" onClick={openTournamentCreator}>Criar torneio</button></div>
  ) : filteredTournaments.length === 0 ? (
    <div className="tournamentEmptyState"><Search aria-hidden="true" /><h3>Nenhum resultado encontrado</h3><p>Ajuste a busca ou limpe os filtros.</p><button type="button" className="secondaryBtn" onClick={() => { setTournamentSearch(""); setTournamentFormatFilter("all"); setTournamentStatusFilter("all"); }}>Limpar filtros</button></div>
  ) : (
    <div className="tournamentList isolatedTournamentGrid">
      <div className="tournamentTableHeader" aria-hidden="true">
        <span>Nome do torneio</span>
        <span>Data / Local</span>
        <span>Formato</span>
        <span>Status</span>
        <span>Ação</span>
      </div>
      {filteredTournaments.map((t) => {
        const details = t.data || {};
        const formatLabel = details.gender || (String(t.type || "").toLowerCase().includes("individual") ? "Individual" : "Duplas");

        return (
          <div
            className={`tournamentItem ${draggedTournamentId === t.id ? "dragging" : ""}`}
            key={t.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              moveTournamentByDrag(draggedTournamentId, t.id);
              setDraggedTournamentId(null);
            }}
          >
            <button
              type="button"
              className="moveLineBtn"
              title="Segure e arraste para mover"
              draggable
              onDragStart={(event) => {
                setDraggedTournamentId(t.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDraggedTournamentId(null)}
            >
              <span>—</span><span>—</span><span>—</span>
            </button>

            <div className="tournamentNameCell"><strong>{t.name}</strong></div>
            <div className="tournamentDateCell">
              <span>{details.eventPeriodLabel || (details.eventDate ? formatDateBR(details.eventDate) : "Data não informada")}</span>
              <small>{details.location || "Local não informado"}</small>
            </div>
            <div className="tournamentFormatCell"><span>{formatLabel}</span></div>
            <div className="tournamentStatusCell">
              <span className={`tournamentLifecycleBadge status-${getTournamentUiStatus(t).toLowerCase().replace(/\s+/g, "-")}`}>{getTournamentUiStatus(t)}</span>
            </div>
            <div className="tournamentActions">
              <button type="button" className="tableIconAction shareTournamentBtn" title="Compartilhar" aria-label={`Compartilhar ${t.name}`} onClick={() => setShareTarget(t)}><Share2 aria-hidden="true" /></button>
              <button type="button" className="tournamentOpenAction" onClick={() => openTournament(t)}>Abrir</button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>
    )}
    </>
    )}


{activePanel === "circuitos" && !circuitEditorOpen && (() => {
  const normalizedSearch = circuitSearch.trim().toLocaleLowerCase("pt-BR");
  const visibleCircuits = circuits.filter((circuit) => {
    const matchesSearch = !normalizedSearch || circuit.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
    const matchesStatus = circuitStatusFilter === "all" || circuit.status === circuitStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const activeCircuitCount = circuits.filter((circuit) => circuit.status === "active").length;
  const linkedTournamentCount = circuits.reduce((total, circuit) => total + (circuit.tournamentIds?.length || 0), 0);
  const classifiedNames = new Set(circuits.flatMap((circuit) => getCircuitRanking(circuit).flatMap((group) => group.rows.map((row) => row.name))));

  return (
    <section className="figmaCircuitOverview">
      <div className="figmaCircuitStats">
        <div><span>Circuitos cadastrados</span><strong>{circuits.length}</strong><small>Histórico total</small></div>
        <div><span>Circuitos ativos</span><strong>{activeCircuitCount}</strong><small>Temporada atual</small></div>
        <div><span>Torneios vinculados</span><strong>{linkedTournamentCount}</strong><small>Somando os circuitos</small></div>
        <div><span>Participantes classificados</span><strong>{classifiedNames.size}</strong><small>Ranking geral</small></div>
      </div>

      <section className="figmaCircuitTableCard">
        <div className="figmaCircuitToolbar">
          <label><Search aria-hidden="true" /><input value={circuitSearch} onChange={(event) => setCircuitSearch(event.target.value)} placeholder="Buscar por nome do circuito..." /></label>
          <select value={circuitStatusFilter} onChange={(event) => setCircuitStatusFilter(event.target.value)} aria-label="Status do circuito">
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="closed">Encerrado</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        <div className="figmaCircuitTableHeader" aria-hidden="true">
          <span>Nome / Período</span><span>Modalidade / Categorias</span><span>Torneios vinc.</span><span>Progresso</span><span>Status</span><span>Ação</span>
        </div>

        <div className="figmaCircuitRows">
          {visibleCircuits.length ? visibleCircuits.map((circuit) => {
            const selectedTournaments = getCircuitSelectedTournaments(circuit);
            const finishedCount = selectedTournaments.filter((tournament) => getTournamentUiStatus(tournament) === "Encerrado").length;
            const progress = selectedTournaments.length ? Math.round((finishedCount / selectedTournaments.length) * 100) : 0;
            const rankingGroups = getCircuitRanking(circuit);
            const rankedCount = new Set(rankingGroups.flatMap((group) => group.rows.map((row) => row.name))).size;
            const categoryText = selectedTournaments.map((tournament) => tournament.data?.gender).filter(Boolean).slice(0, 2).join(", ") || "Beach Tennis";
            const statusLabel = circuit.status === "active" ? "Ativo" : circuit.status === "closed" ? "Encerrado" : circuit.status === "archived" ? "Arquivado" : "Rascunho";
            return (
              <React.Fragment key={circuit.id}>
                <article className="figmaCircuitRow">
                  <div><strong>{circuit.name}</strong><small>{circuit.startDate ? formatDateBR(circuit.startDate) : "Sem início"} a {circuit.endDate ? formatDateBR(circuit.endDate) : "sem fim"}</small></div>
                  <div><span>{categoryText}</span><small>{rankingCriteriaOptions.find((option) => option.value === circuitRankingCriteria)?.label || "Ranking configurável"}</small></div>
                  <div className="center"><strong>{selectedTournaments.length}</strong><small>{rankedCount} ranqueados</small></div>
                  <div className="progress"><span>{progress}%</span><i><b style={{ width: `${progress}%` }} /></i></div>
                  <div><span className={`figmaCircuitStatus ${circuit.status}`}>{statusLabel}</span></div>
                  <div className="actions"><button type="button" onClick={() => setExpandedCircuitId(expandedCircuitId === circuit.id ? null : circuit.id)}>Abrir</button><button type="button" className="icon" onClick={() => editCircuit(circuit)} aria-label={`Editar ${circuit.name}`}><Edit2 /></button></div>
                </article>
                {expandedCircuitId === circuit.id ? (
                  <div className="figmaCircuitRankingDrawer">
                    <div><h3>Ranking do circuito</h3><button type="button" onClick={() => editCircuit(circuit)}><Edit2 /> Editar circuito</button></div>
                    {rankingGroups.length ? rankingGroups.map((group) => <RankingTable key={group.key} title={group.title} rows={group.rows} rankingCriteria={circuitRankingCriteria} />) : <p>O ranking aparecerá quando os torneios vinculados tiverem placares.</p>}
                  </div>
                ) : null}
              </React.Fragment>
            );
          }) : <div className="figmaCircuitEmpty">Nenhum circuito encontrado.</div>}
        </div>
      </section>
    </section>
  );
})()}

{activePanel === "circuitos" && circuitEditorOpen && (
  <section className="card circuitsCard">
    <div className="circuitsHeader">
      <div>
        <h2>{circuitForm.id ? "Editar circuito" : "Novo circuito"}</h2>
        <p>Crie períodos flexíveis e escolha manualmente quais torneios entram. Isso não altera os torneios já criados.</p>
      </div>
      <button type="button" className="secondaryBtn" onClick={closeCircuitEditor}>Voltar para circuitos</button>
    </div>

    <div className="circuitsFormGrid">
      <div className="formField">
        <label>Nome do circuito</label>
        <input value={circuitForm.name} onChange={(e) => setCircuitForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Circuito Verão" />
      </div>
      <div className="formField">
        <label>Data inicial</label>
        <input className="clickableDateInput" type="date" value={circuitForm.startDate} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => setCircuitForm((prev) => ({ ...prev, startDate: e.target.value }))} />
      </div>
      <div className="formField">
        <label>Data final</label>
        <input className="clickableDateInput" type="date" value={circuitForm.endDate} min={circuitForm.startDate || undefined} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => setCircuitForm((prev) => ({ ...prev, endDate: e.target.value }))} />
      </div>
      <div className="formField">
        <label>Status</label>
        <select value={circuitForm.status} onChange={(e) => setCircuitForm((prev) => ({ ...prev, status: e.target.value }))}>
          <option value="draft">Rascunho</option>
          <option value="active">Em andamento</option>
          <option value="closed">Encerrado</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>
    </div>

    <div className="circuitTournamentPicker">
      <div className="circuitPickerTitle">
        <strong>Torneios deste circuito</strong>
        <span>{circuitForm.tournamentIds.length} selecionado(s)</span>
      </div>
      {tournaments.length === 0 ? (
        <p>Nenhum torneio criado ainda.</p>
      ) : (
        <div className="circuitTournamentList">
          {tournaments.map((t) => {
            const details = t.data || {};
            const checked = circuitForm.tournamentIds.includes(t.id);
            return (
              <label className={`circuitTournamentOption ${checked ? "selected" : ""}`} key={t.id}>
                <input type="checkbox" checked={checked} onChange={() => toggleCircuitTournament(t.id)} />
                <span className="circuitCheckVisual">{checked ? "✓" : ""}</span>
                <span className="circuitTournamentText">
                  <strong>{details.eventName || t.name}</strong>
                  <small>{[t.name, normalizeModalityName(t.type), details.eventDate ? formatDateBR(details.eventDate) : null].filter(Boolean).join(" · ")}</small>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>

    <div className="circuitFormActions">
      <button type="button" onClick={saveCircuit}>{circuitForm.id ? "Salvar alterações" : "Criar circuito"}</button>
      <button type="button" className="cancelBtn" onClick={closeCircuitEditor}>Cancelar</button>
    </div>

    <div className="circuitsList">
      <h2>Circuitos criados</h2>
      {circuits.length === 0 ? (
        <p>Nenhum circuito criado ainda.</p>
      ) : circuits.map((circuit) => {
        const selectedNames = getCircuitSelectedTournaments(circuit);
        return (
          <article className={`circuitItem ${expandedCircuitId === circuit.id ? "expanded" : ""}`} key={circuit.id}>
            <button
              type="button"
              className="circuitItemSummary"
              onClick={() => { const nextId = expandedCircuitId === circuit.id ? null : circuit.id; setExpandedCircuitId(nextId); scheduleUserAppStateSave({ circuitId: nextId, activePanel: "circuitos" }); }}
            >
              <div className="circuitItemMain">
                <span>{circuit.status === "active" ? "Em andamento" : circuit.status === "closed" ? "Encerrado" : circuit.status === "archived" ? "Arquivado" : "Rascunho"}</span>
                <h3>{circuit.name}</h3>
                <p>{circuit.startDate ? formatDateBR(circuit.startDate) : "Sem início"} até {circuit.endDate ? formatDateBR(circuit.endDate) : "sem fim definido"}</p>
                <small>{selectedNames.length} torneio(s): {selectedNames.length ? selectedNames.map((t) => t.data?.eventName || t.name).join(", ") : "nenhum selecionado"}</small>
              </div>
              <strong className="circuitExpandIcon">{expandedCircuitId === circuit.id ? "−" : "+"}</strong>
            </button>

            {expandedCircuitId === circuit.id ? (() => {
              const circuitRankingGroups = getCircuitRanking(circuit);
              return circuitRankingGroups.length ? (
                <div className="circuitRankingBox">
                  <div className="circuitRankingHeader">
                    <strong>Ranking do circuito</strong>
                    <label>
                      <span>Critério de desempate</span>
                      <select value={circuitRankingCriteria} onChange={(e) => setCircuitRankingCriteria(e.target.value)}>
                        {rankingCriteriaOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {/* Legacy card-style circuit ranking kept here only as a reference.
                  {circuitRankingGroups.map((group) => (
                    <div className="circuitRankingGroup" key={group.key}>
                      <h4>{group.title}</h4>
                      <div className="circuitRankingTable">
                        {group.rows.map((row, index) => (
                          <div className="circuitRankingRow" key={row.name}>
                            <span>{index + 1}º</span>
                            <b>{row.name}</b>
                            <em>{row.pts} pts</em>
                            <small>{row.w} vit. · saldo {row.bal} · {row.played} jogo(s)</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  */}
                  {circuitRankingGroups.length === 1 ? (
                    <RankingTable
                      title={circuitRankingGroups[0].title}
                      rows={circuitRankingGroups[0].rows}
                      rankingCriteria={circuitRankingCriteria}
                    />
                  ) : (
                    <div className="twoCols circuitRankingTables">
                      {circuitRankingGroups.map((group) => (
                        <RankingTable
                          key={group.key}
                          title={group.title}
                          rows={group.rows}
                          rankingCriteria={circuitRankingCriteria}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedNames.length ? (
                <div className="circuitRankingEmpty">Ranking aparece quando houver placares lançados nos torneios selecionados.</div>
              ) : null;
            })() : null}

            <div className="circuitItemActions">
              <button type="button" className="editBtn" onClick={() => editCircuit(circuit)}>Editar</button>
              <button type="button" className="deleteBtn" onClick={() => deleteCircuit(circuit.id)}>Excluir</button>
            </div>
          </article>
        );
      })}
    </div>
  </section>
)}

{activePanel === "modalidades" && (
<section className="card sportCatalogSection">
  <div className="sportCatalogHeader">
    <div>
      <h2>Modalidades esportivas</h2>
      <p>O Beach Tennis concentra todos os fluxos disponíveis nesta etapa. As demais modalidades já aparecem no catálogo para deixar clara a evolução da plataforma.</p>
    </div>
  </div>

  <div className="sportCatalogStats" aria-label="Resumo das modalidades">
    <div><span>Total disponíveis</span><strong>{SPORT_CATALOG.length}</strong><small>modalidades no catálogo</small></div>
    <div><span>Modalidades ativas</span><strong>1</strong><small>Beach Tennis</small></div>
    <div><span>Torneios cadastrados</span><strong>{tournaments.length}</strong><small>todos em Beach Tennis</small></div>
  </div>

  <div className="sportCatalogToolbar">
    <label className="sportSearchField">
      <Search aria-hidden="true" />
      <input value={modalitySearch} onChange={(event) => setModalitySearch(event.target.value)} placeholder="Buscar por modalidade..." />
    </label>
    <select value={modalityFilter} onChange={(event) => setModalityFilter(event.target.value)} aria-label="Filtrar modalidades">
      <option value="all">Todas as modalidades</option>
      <option value="active">Disponível agora</option>
      <option value="soon">Em breve</option>
    </select>
    <button type="button" className="secondaryBtn" onClick={() => { setModalitySearch(""); setModalityFilter("all"); }}>Limpar</button>
  </div>

  {filteredSportCatalog.length ? (
  <div className="sportCatalogGrid">
    {filteredSportCatalog.map((sport) => {
      const tournamentCount = sport.enabled
        ? tournaments.filter((tournament) => (tournament.data?.sport || DEFAULT_SPORT_ID) === sport.id).length
        : 0;

      return (
        <article className={`sportCatalogCard ${sport.enabled ? "active" : "comingSoon"}`} key={sport.id}>
          <div className="sportCatalogCardTop">
            <span className="sportCatalogIcon" aria-hidden="true">{sport.icon}</span>
            <span className={`sportStatusBadge ${sport.enabled ? "active" : "comingSoon"}`}>
              {sport.enabled ? "Ativa" : "Em breve"}
            </span>
          </div>
          <h3>{sport.name}</h3>
          <p>{sport.description}</p>
          {sport.enabled ? (
            <>
              <small>{tournamentCount} torneio(s) cadastrado(s) · {allowedTypes.length} formato(s) liberado(s) no seu plano</small>
              <button type="button" onClick={openTournamentCreator}><PlusCircle aria-hidden="true" /> Criar torneio</button>
            </>
          ) : (
            <>
              <small>A criação será habilitada quando esta modalidade estiver pronta.</small>
              <button type="button" disabled aria-disabled="true">Indisponível</button>
            </>
          )}
        </article>
      );
    })}
  </div>
  ) : (
    <div className="sportCatalogEmpty">
      <Search aria-hidden="true" />
      <h3>Nenhuma modalidade encontrada</h3>
      <p>Limpe os filtros ou faça uma nova busca.</p>
      <button type="button" className="secondaryBtn" onClick={() => { setModalitySearch(""); setModalityFilter("all"); }}>Limpar busca</button>
    </div>
  )}
</section>
)}

{activePanel === "lixeira" && (
<section className="card trashCard">
  <div className="trashHeader">
    <div>
      <h2>Lixeira</h2>
      <p>Torneios apagados ficam aqui por 30 dias antes da exclusão definitiva.</p>
    </div>
    <span>{trashTournaments.length} item(ns)</span>
  </div>

  {trashTournaments.length === 0 ? (
    <p>Nenhum torneio na lixeira.</p>
  ) : (
    <div className="tournamentList trashList">
      {trashTournaments.map((t) => {
        const details = t.data || {};
        const daysLeft = getTrashDaysLeft(t);

        return (
          <div className="tournamentItem trashTournamentItem" key={t.id}>
            <div className="tournamentInfo">
              <div className="tournamentTitleRow">
                <strong>{t.name}</strong>
                <span className="tournamentTypeBadge">{normalizeModalityName(t.type)}</span>
              </div>

              <div className="tournamentMeta">
                {details.multiCategoryEvent ? <span><Grid3X3 aria-hidden="true" /> Várias categorias</span> : null}
                {details.gender ? <span><Tag aria-hidden="true" /> {details.gender}</span> : null}
                {details.eventDate ? <span><CalendarDays aria-hidden="true" /> {formatDateBR(details.eventDate)}</span> : null}
                {details.location ? <span><MapPin aria-hidden="true" /> {details.location}</span> : null}
                <span><Trash2 aria-hidden="true" /> Exclui definitivamente em {daysLeft} dia(s)</span>
              </div>
            </div>

            <div className="tournamentActions">
              <button type="button" onClick={() => restoreTournament(t)}>Recuperar</button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>
)}

{activePanel === "ajustes" && (
<div className="figmaProfilePage">
  <section className="figmaProfileHeroCard">
    <div className="figmaProfileHeroAvatar">
      {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="Foto do perfil" /> : <UserRound aria-hidden="true" />}
    </div>
    <div className="figmaProfileHeroCopy">
      <div><h1>{organizerProfile.arenaName || profile.name || "Meu perfil"}</h1><span>PLANO {String(profile.plan || "PRO").replace(/^plano\s+/i, "")} {formatStatusBR(profile.status)}</span></div>
      <p>{organizerProfile.description || "Perfil oficial na plataforma Torneio360. Adicione mais detalhes sobre a arena para facilitar o contato com os atletas."}</p>
      <small>{organizerProfile.isPublic !== false ? <><LockOpen aria-hidden="true" /> Perfil Público</> : <><LockKeyhole aria-hidden="true" /> Perfil Privado</>}</small>
    </div>
    <button type="button" onClick={openOrganizerProfileEditor}><Edit2 aria-hidden="true" /> Editar perfil</button>
  </section>

  <nav className="figmaProfileTabs" role="tablist" aria-label="Seções do perfil">
    <button type="button" role="tab" className={profileSubtab === "publicacoes" ? "active" : ""} onClick={() => openProfileSection("publicacoes")}>Publicações</button>
    <button type="button" role="tab" className={profileSubtab === "editar" ? "active" : ""} onClick={() => openProfileSection("editar")}>Dados da arena</button>
    <button type="button" role="tab" className={profileSubtab === "conta" ? "active" : ""} onClick={() => openProfileSection("conta")}>Conta e suporte</button>
  </nav>

  {profileSubtab === "publicacoes" ? (
    <section className="figmaProfilePublications">
      <div className="figmaProfileSectionHeader">
        <div><h2>Campeonatos Criados</h2><p>Total de {tournaments.length} publicações na plataforma.</p></div>
        <label><Search aria-hidden="true" /><input value={profilePublicationSearch} onChange={(event) => setProfilePublicationSearch(event.target.value)} placeholder="Buscar publicação..." /></label>
      </div>
      <div className="figmaProfilePostGrid">
        {tournaments.filter((tournament) => !profilePublicationSearch.trim() || tournament.name.toLocaleLowerCase("pt-BR").includes(profilePublicationSearch.trim().toLocaleLowerCase("pt-BR"))).map((tournament) => {
          const details = tournament.data || {};
          return (
            <article className="figmaProfilePost" key={tournament.id}>
              <div className="figmaProfilePostTop"><span>{getTournamentUiStatus(tournament) === "Encerrado" ? "TORNEIO CONCLUÍDO" : getTournamentUiStatus(tournament).toUpperCase()}</span><button type="button" aria-label="Mais opções"><MoreVertical /></button></div>
              <h3>{details.eventName || tournament.name}</h3>
              <p>⌁ {getSportDefinition(details.sport || DEFAULT_SPORT_ID).name} • {details.gender || normalizeModalityName(tournament.type)}</p>
              <p><CalendarDays aria-hidden="true" /> {details.eventPeriodLabel || (details.eventDate ? formatDateBR(details.eventDate) : "Data não informada")}</p>
              <p><MapPin aria-hidden="true" /> {details.location || "Local não informado"}</p>
              <div className="figmaProfilePostActions">
                <button type="button" onClick={() => openTournament(tournament)}>Abrir gestão</button>
                <button type="button" onClick={() => tournament.public_id ? window.open(getPublicUrl(tournament.public_id), "_blank", "noopener,noreferrer") : setShareTarget(tournament)}>Ver página</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  ) : null}

  {profileSubtab === "editar" ? (
    <div className="figmaProfileDataGrid">
      <section>
        <h3><MapPin aria-hidden="true" /> Identidade e Localização</h3>
        <dl>
          <div className="full"><dt>Nome oficial</dt><dd>{organizerProfile.arenaName || "Não informado"}</dd></div>
          <div className="full description"><dt>Descrição pública</dt><dd>{organizerProfile.description || "Adicione uma descrição no botão Editar perfil."}</dd></div>
          <div><dt>Cidade / Estado</dt><dd>{[organizerProfile.city, organizerProfile.state].filter(Boolean).join(", ") || "Não informado"}</dd></div>
          <div><dt>Endereço completo</dt><dd>{organizerProfile.address || "Não informado"}</dd></div>
        </dl>
      </section>
      <section>
        <h3><MessageCircle aria-hidden="true" /> Contato e Redes Sociais</h3>
        <div className="figmaContactCards">
          <div className="whatsapp"><span><MessageCircle aria-hidden="true" /></span><p><small>WHATSAPP OFICIAL</small><strong>{organizerProfile.whatsapp || "Não informado"}</strong></p></div>
          <div className="instagram"><span><AtSign aria-hidden="true" /></span><p><small>INSTAGRAM</small><strong>{organizerProfile.instagramHandle ? `@${String(organizerProfile.instagramHandle).replace(/^@/, "")}` : "Não informado"}</strong></p></div>
          <div className="email"><span><Mail aria-hidden="true" /></span><p><small>E-MAIL DE CONTATO</small><strong>{organizerProfile.publicEmail || user.email}</strong></p></div>
        </div>
      </section>
    </div>
  ) : null}

  {profileSubtab === "conta" ? (
    <div className="figmaProfileAccountGrid">
      <section>
        <h3><UserRound aria-hidden="true" /> Acesso e Assinatura</h3>
        <dl>
          <div><dt>E-mail de acesso</dt><dd>{user.email}</dd></div>
          <div><dt>Status da assinatura</dt><dd><span className="active">{formatStatusBR(profile.status)}</span></dd></div>
          <div><dt>Plano atual</dt><dd className="blue">Plano {String(profile.plan || "PRO").replace(/^plano\s+/i, "")}</dd></div>
          <div><dt>Próximo vencimento</dt><dd>{profile.expires_at ? formatDateBR(profile.expires_at) : "Não definido"}</dd></div>
        </dl>
      </section>
      <section>
        <h3><HelpCircle aria-hidden="true" /> Fale com o Torneio360</h3>
        <p>Precisa de ajuda com a plataforma? Entre em contato com nosso time de suporte através dos canais oficiais abaixo.</p>
        <a href={PLATFORM_SUPPORT.find((item) => item.id === "whatsapp")?.href} target="_blank" rel="noreferrer"><i><MessageCircle aria-hidden="true" /></i><span><strong>WhatsApp Torneio360</strong><small>Suporte ágil via mensagem</small></span><b>→</b></a>
        <a href="mailto:torneio360@gmail.com"><i><Mail aria-hidden="true" /></i><span><strong>E-mail de Suporte</strong><small>torneio360@gmail.com</small></span><b>→</b></a>
      </section>
    </div>
  ) : null}
</div>
)}

{activePanel === "ajustes" && false && (
<>
  <section className="card instagramProfileCard">
    <div className="instagramProfileHeader">
      <div className="instagramProfilePhoto">
        {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="Foto do perfil" /> : <span><UserRound aria-hidden="true" /></span>}
      </div>
      <div className="instagramProfileInfo">
        <div className="instagramProfileTopline">
          <h2>{organizerProfile.arenaName || profile.name || "Meu perfil"}</h2>
          <button type="button" className="secondaryBtn profileEditShortcut" onClick={() => openProfileSection("editar")}>
            <Settings aria-hidden="true" />
            Editar perfil
          </button>
        </div>
        <p>{organizerProfile.city || organizerProfile.state ? [organizerProfile.city, organizerProfile.state].filter(Boolean).join("/") : "Complete seu perfil para receber visitas de outros usuários."}</p>
        <button
          type="button"
          className={`profileVisibilitySwitch ${organizerProfile.isPublic !== false ? "public" : "private"}`}
          onClick={toggleOrganizerProfileVisibility}
          disabled={profileVisibilitySaving}
          aria-pressed={organizerProfile.isPublic !== false}
        >
          <span className="switchTrack"><span className="switchThumb" /></span>
          <strong>{profileVisibilitySaving ? "Salvando..." : organizerProfile.isPublic !== false ? "Perfil público" : "Perfil privado"}</strong>
        </button>
      </div>
    </div>

    <div className="profileSubtabs" role="tablist" aria-label="Seções do perfil">
      <button
        type="button"
        role="tab"
        className={profileSubtab === "publicacoes" ? "active" : ""}
        onClick={() => openProfileSection("publicacoes")}
        aria-selected={profileSubtab === "publicacoes"}
      >
        <Grid3X3 aria-hidden="true" />
        Publicações
      </button>
      <button
        type="button"
        role="tab"
        className={profileSubtab === "editar" ? "active" : ""}
        onClick={() => openProfileSection("editar")}
        aria-selected={profileSubtab === "editar"}
      >
        <Settings aria-hidden="true" />
        Dados da arena
      </button>
      <button
        type="button"
        role="tab"
        className={profileSubtab === "conta" ? "active" : ""}
        onClick={() => openProfileSection("conta")}
        aria-selected={profileSubtab === "conta"}
      >
        <LifeBuoy aria-hidden="true" />
        Conta e suporte
      </button>
    </div>

    {profileSubtab === "publicacoes" ? (
      <div className="profileSubtabPanel">
    <div className="profilePublicationsHeader">
      <strong>Publicações</strong>
      <span>{tournaments.length} campeonato(s) criado(s)</span>
    </div>

    <div className="profileTournamentGrid">
      {tournaments.length === 0 ? (
        <div className="profileEmptyPost">Nenhum campeonato criado ainda.</div>
      ) : tournaments.map((t) => {
        const details = t.data || {};
        return (
          <article className="profileTournamentPost tournamentItem" key={t.id}>
            <div className="tournamentInfo">
              <div className="tournamentTitleRow">
                <strong>{t.name}</strong>
                <span className="tournamentTypeBadge">{normalizeModalityName(t.type)}</span>
              </div>
              <div className="tournamentMeta">
                {details.multiCategoryEvent ? <span><Grid3X3 aria-hidden="true" /> {details.eventName}</span> : null}
                {details.gender ? <span><Tag aria-hidden="true" /> {details.gender}</span> : null}
                {details.eventDate ? <span><CalendarDays aria-hidden="true" /> {formatDateBR(details.eventDate)}</span> : null}
                {details.eventStartTime ? <span><Clock3 aria-hidden="true" /> {details.eventStartTime}</span> : null}
                {details.location ? <span><MapPin aria-hidden="true" /> {details.location}</span> : null}
                {details.winningScore ? <span><Target aria-hidden="true" /> {details.winningScore} games</span> : null}
              </div>
            </div>
            <div className="tournamentActions">
              <button type="button" className="editBtn" onClick={() => openEditTournament(t)}>Editar</button>
              <button type="button" onClick={() => openTournament(t)}>Abrir</button>
              <button type="button" className="shareTournamentBtn" onClick={() => setShareTarget(t)}><Share2 aria-hidden="true" /> Compartilhar</button>
              <button type="button" className="deleteBtn" onClick={() => setDeleteTarget(t)}>Excluir</button>
            </div>
          </article>
        );
      })}
    </div>

      </div>
    ) : null}
  </section>

  {profileSubtab === "editar" ? (
  <section className="card organizerProfileCard profileEditSubtab">
    <div className="profileEditSubtabHeader">
      <div>
        <span>Dados públicos</span>
        <h2>Dados da arena</h2>
      </div>
    </div>
    <p className="profileSectionHint">Organize as informações que identificam sua arena e facilitam o contato com atletas.</p>

    <div className="profileFormSectionHeader">
      <span><UserRound aria-hidden="true" /></span>
      <div>
        <strong>Identidade</strong>
        <small>Foto e nomes exibidos no perfil da arena.</small>
      </div>
    </div>

    <div className="organizerPhotoArea">
      <label className="organizerPhotoDropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleOrganizerPhotoFile(e.dataTransfer.files?.[0]); }}>
        <input type="file" accept="image/*" onChange={(e) => handleOrganizerPhotoFile(e.target.files?.[0])} />
        <div className="organizerPhotoPreview">
          {organizerProfile.photoUrl ? (
            <img src={organizerProfile.photoUrl} alt="Foto de perfil" />
          ) : (
            <span><Camera aria-hidden="true" /></span>
          )}
        </div>
        <strong>Foto de perfil</strong>
        <small>Clique ou arraste uma imagem aqui</small>
      </label>
      {organizerProfile.photoUrl ? <button className="removePhotoBtn" type="button" onClick={removeOrganizerPhoto}>Remover foto</button> : null}
    </div>

    <div className="organizerProfileGrid">
      <div className="formField">
        <label>Nome da arena</label>
        <input value={organizerProfile.arenaName} onChange={(e) => updateOrganizerProfile("arenaName", e.target.value)} placeholder="Ex: Arena Beach Sports" />
      </div>

      <div className="formField">
        <label>Nome do organizador</label>
        <input value={organizerProfile.organizerName} onChange={(e) => updateOrganizerProfile("organizerName", e.target.value)} placeholder="Ex: Cristiano Sampaio" />
      </div>

      <div className="profileFormSectionHeader fullField">
        <span><MessageCircle aria-hidden="true" /></span>
        <div>
          <strong>Contato público</strong>
          <small>Dados usados pelos atletas para falar com a organização.</small>
        </div>
      </div>

      <div className="formField">
        <label>WhatsApp</label>
        <input value={organizerProfile.whatsapp} onChange={(e) => updateOrganizerProfile("whatsapp", e.target.value)} placeholder="(85) 99999-9999" />
      </div>

      <div className="formField">
        <label>@ do Instagram</label>
        <input value={organizerProfile.instagramHandle} onChange={(e) => updateOrganizerProfile("instagramHandle", e.target.value)} placeholder="@suaarena" />
      </div>

      <div className="formField">
        <label>Link do Instagram</label>
        <input value={organizerProfile.instagramLink} onChange={(e) => updateOrganizerProfile("instagramLink", e.target.value)} placeholder="https://instagram.com/suaarena" />
      </div>

      <div className="formField fullField">
        <label>Link do grupo de WhatsApp</label>
        <input value={organizerProfile.whatsappGroupLink} onChange={(e) => updateOrganizerProfile("whatsappGroupLink", e.target.value)} placeholder="https://chat.whatsapp.com/..." />
      </div>

      <div className="profileFormSectionHeader fullField">
        <span><MapPin aria-hidden="true" /></span>
        <div>
          <strong>Localização</strong>
          <small>Endereço e referência geográfica da arena.</small>
        </div>
      </div>

      <div className="formField fullField">
        <label>Endereço da arena</label>
        <input value={organizerProfile.address} onChange={(e) => updateOrganizerProfile("address", e.target.value)} placeholder="Rua, número, bairro" />
      </div>

      <div className="formField fullField">
        <label>Link do endereço da arena</label>
        <input value={organizerProfile.mapsLink || ""} onChange={(e) => updateOrganizerProfile("mapsLink", e.target.value)} placeholder="Link do Google Maps" />
      </div>

      <div className="formField">
        <label>Cidade</label>
        <input value={organizerProfile.city} onChange={(e) => updateOrganizerProfile("city", e.target.value)} placeholder="Fortaleza" />
      </div>

      <div className="formField">
        <label>Estado</label>
        <input value={organizerProfile.state} onChange={(e) => updateOrganizerProfile("state", e.target.value)} placeholder="CE" />
      </div>

    </div>

    <button className="saveProfileBtn" type="button" onClick={saveOrganizerProfile} disabled={profileSaving}>{profileSaving ? "Salvando..." : "Salvar alterações"}</button>
    {profileSaveSuccess ? (
      <div className="profileSaveMiniNotice" role="status" aria-live="polite">
        ✅ Alterado com sucesso
      </div>
    ) : null}
  </section>
  ) : null}

  {profileSubtab === "conta" ? (
    <div className="profileAccountGrid">
      <section className="card profileAccountCard">
        <div className="profileSectionHeading">
          <span>Conta</span>
          <h2>Acesso e assinatura</h2>
          <p>Informações privadas da sua conta na plataforma.</p>
        </div>

        <dl className="profileAccountDetails">
          <div>
            <dt>E-mail de acesso</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Plano</dt>
            <dd>{profile.plan}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{formatStatusBR(profile.status)}</dd>
          </div>
          <div>
            <dt>Vencimento</dt>
            <dd>{profile.expires_at ? formatDateBR(profile.expires_at) : "Não definido"}</dd>
          </div>
        </dl>
      </section>

      <section className="card profileSupportCard" id="suporte-torneio360">
        <div className="profileSectionHeading">
          <span>Atendimento</span>
          <h2>Fale com o Torneio360</h2>
          <p>Escolha o canal de sua preferência para receber suporte.</p>
        </div>

        <div className="supportContactGrid">
          {PLATFORM_SUPPORT.map(({ id, label, value, href, Icon, external }) => (
            <a
              key={id}
              className={`supportContactLink supportContactLink-${id}`}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-label={`${label}: ${value}`}
            >
              <span className="supportContactIcon"><Icon aria-hidden="true" /></span>
              <span>
                <strong>{label}</strong>
                <small>{value}</small>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  ) : null}
</>
)}



        </main>
      </div>
    </div>
  );
}

function createInitialData(type, config, requestedTeamCount = null) {
  const base = {
  rankingCriteria: defaultRankingCriteria,
  winningScore: 4,
  gender: "",
  eventDate: "",
  eventDay: "",
  location: "",
  schedule: [],
  participantMeta: { normal: [], men: [], women: [], teams: [] },
};

  if (!config) {
    return { ...base, players: [] };
  }

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return {
      ...base,
      players: {
        men: Array.from({ length: config.men }, (_, i) => `Homem ${i + 1}`),
        women: Array.from({ length: config.women }, (_, i) => `Mulher ${i + 1}`),
      },
    };
  }

  if (config.type === "fixed12" || config.type === "fixed16") {
    return {
      ...base,
      players: {
        teams: Array.from({ length: config.teams }, (_, i) => ({
          a: `Atleta 1 da dupla ${i + 1}`,
          b: `Atleta 2 da dupla ${i + 1}`,
        })),
      },
      participantMeta: {
        ...base.participantMeta,
        teams: normalizeParticipantMetaList([], config.teams, { athleteCount: 2 }),
      },
    };
  }

  if (isCupType(config)) {
    const teamCount = config.allowedTeamCounts?.includes(Number(requestedTeamCount))
      ? Number(requestedTeamCount)
      : config.defaultTeams;

    return {
      ...base,
      cupConfig: {
        format: config.cupMode || "standard",
        teamCount,
        mainBracketName: config.defaultMainBracketName,
        repechageName: config.defaultRepechageName,
        tieBreakOverrides: {},
        groupTieBreakOverrides: {},
      },
      players: {
        teams: Array.from({ length: teamCount }, (_, i) => ({
          a: `Atleta 1 da dupla ${i + 1}`,
          b: `Atleta 2 da dupla ${i + 1}`,
        })),
      },
      participantMeta: {
        ...base.participantMeta,
        teams: normalizeParticipantMetaList([], teamCount, { athleteCount: 2 }),
      },
      brackets: [],
    };
  }

  return {
    ...base,
    players: Array.from({ length: config.total }, (_, i) => `${config.label} ${i + 1}`),
  };
}

function isTournamentDataObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNameList(values, count, label) {
  const source = Array.isArray(values) ? values : [];

  return Array.from({ length: count }, (_, index) => (
    typeof source[index] === "string" ? source[index] : `${label} ${index + 1}`
  ));
}

function normalizeTeams(values, count) {
  const source = Array.isArray(values) ? values : [];

  return Array.from({ length: count }, (_, index) => {
    const team = isTournamentDataObject(source[index]) ? source[index] : {};

    return {
      a: typeof team.a === "string" ? team.a : `Atleta 1 da dupla ${index + 1}`,
      b: typeof team.b === "string" ? team.b : `Atleta 2 da dupla ${index + 1}`,
    };
  });
}

function normalizeGameNames(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => String(item));
  }

  return value === null || value === undefined ? [] : [String(value)];
}

function normalizeGameIds(value) {
  const source = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];

  return source
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0);
}

function normalizeGame(game, index) {
  const source = isTournamentDataObject(game) ? game : {};
  const court = Number(source.court);

  return {
    ...source,
    court: Number.isFinite(court) && court > 0 ? court : index + 1,
    team1: normalizeGameNames(source.team1),
    team2: normalizeGameNames(source.team2),
    ids1: normalizeGameIds(source.ids1),
    ids2: normalizeGameIds(source.ids2),
    s1: source.s1 ?? "",
    s2: source.s2 ?? "",
  };
}

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return [];

  return schedule
    .filter((round) => Array.isArray(round))
    .map((round) => round
      .filter((game) => isTournamentDataObject(game))
      .map((game, index) => normalizeGame(game, index))
    );
}

function normalizeBrackets(brackets) {
  if (!Array.isArray(brackets)) return [];

  return brackets
    .filter((game) => isTournamentDataObject(game))
    .map((game, index) => normalizeGame(game, index));
}

function normalizeTournamentData(type, rawData) {
  const config = getModalityConfig(type);

  if (!config) {
    return isTournamentDataObject(rawData) ? rawData : createInitialData(type, config);
  }

  const defaults = createInitialData(type, config);
  const source = isTournamentDataObject(rawData) ? rawData : {};
  const sourcePlayers = isTournamentDataObject(source.players) ? source.players : {};
  const sourceParticipantMeta = isTournamentDataObject(source.participantMeta) ? source.participantMeta : {};
  const validWinningScore = [4, 6].includes(Number(source.winningScore));
  const validRankingCriteria = rankingCriteriaOptions.some((item) => item.value === source.rankingCriteria);
  const normalized = {
    ...defaults,
    ...source,
    rankingCriteria: validRankingCriteria ? source.rankingCriteria : defaults.rankingCriteria,
    winningScore: validWinningScore ? Number(source.winningScore) : defaults.winningScore,
    schedule: normalizeSchedule(source.schedule),
  };

  if (isCupType(config)) {
    const sourceCupConfig = isTournamentDataObject(source.cupConfig) ? source.cupConfig : {};
    const requestedTeamCount = Number(sourceCupConfig.teamCount);
    const teamCount = config.allowedTeamCounts.includes(requestedTeamCount)
      ? requestedTeamCount
      : config.defaultTeams;

    return {
      ...normalized,
      cupConfig: {
        ...defaults.cupConfig,
        ...sourceCupConfig,
        format: typeof sourceCupConfig.format === "string"
          ? sourceCupConfig.format
          : defaults.cupConfig.format,
        teamCount,
        mainBracketName: typeof sourceCupConfig.mainBracketName === "string"
          ? sourceCupConfig.mainBracketName
          : defaults.cupConfig.mainBracketName,
        repechageName: typeof sourceCupConfig.repechageName === "string"
          ? sourceCupConfig.repechageName
          : defaults.cupConfig.repechageName,
        tieBreakOverrides: isTournamentDataObject(sourceCupConfig.tieBreakOverrides)
          ? sourceCupConfig.tieBreakOverrides
          : {},
        groupTieBreakOverrides: isTournamentDataObject(sourceCupConfig.groupTieBreakOverrides)
          ? sourceCupConfig.groupTieBreakOverrides
          : {},
      },
      players: {
        teams: normalizeTeams(sourcePlayers.teams, teamCount),
      },
      participantMeta: {
        ...defaults.participantMeta,
        teams: normalizeParticipantMetaList(sourceParticipantMeta.teams, teamCount, { athleteCount: 2 }),
      },
      brackets: normalizeBrackets(source.brackets),
      groupsShuffled: Boolean(source.groupsShuffled),
    };
  }

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return {
      ...normalized,
      players: {
        men: normalizeNameList(sourcePlayers.men, config.men, "Homem"),
        women: normalizeNameList(sourcePlayers.women, config.women, "Mulher"),
      },
      participantMeta: {
        ...defaults.participantMeta,
        men: normalizeParticipantMetaList(sourceParticipantMeta.men, config.men),
        women: normalizeParticipantMetaList(sourceParticipantMeta.women, config.women),
      },
    };
  }

  if (config.type === "fixed12" || config.type === "fixed16") {
    return {
      ...normalized,
      players: {
        teams: normalizeTeams(sourcePlayers.teams, config.teams),
      },
      participantMeta: {
        ...defaults.participantMeta,
        teams: normalizeParticipantMetaList(sourceParticipantMeta.teams, config.teams, { athleteCount: 2 }),
      },
    };
  }

  return {
    ...normalized,
    players: normalizeNameList(source.players, config.total, config.label),
    participantMeta: {
      ...defaults.participantMeta,
      normal: normalizeParticipantMetaList(sourceParticipantMeta.normal, config.total),
    },
  };
}

function needsTournamentDataRepair(type, rawData) {
  const config = getModalityConfig(type);
  if (!config || !isTournamentDataObject(rawData) || !Array.isArray(rawData.schedule)) return true;

  const players = isTournamentDataObject(rawData.players) ? rawData.players : {};
  const participantMeta = isTournamentDataObject(rawData.participantMeta) ? rawData.participantMeta : {};
  const hasStableAthleteId = (value) => isTournamentDataObject(value)
    && Boolean(String(value.memberId || value.member_id || "").trim());
  const hasStableSinglesMeta = (values, count) => Array.isArray(values)
    && values.length === count
    && values.every((value) => hasStableAthleteId(value));
  const hasStableTeamsMeta = (values, count) => Array.isArray(values)
    && values.length === count
    && values.every((value) => (
      isTournamentDataObject(value)
      && Array.isArray(value.athletes)
      && value.athletes.length >= 2
      && value.athletes.slice(0, 2).every((athlete) => hasStableAthleteId(athlete))
    ));

  if (isCupType(config)) {
    const cupConfig = isTournamentDataObject(rawData.cupConfig) ? rawData.cupConfig : {};
    const teamCount = Number(cupConfig.teamCount);

    return !Array.isArray(players.teams)
      || !config.allowedTeamCounts.includes(teamCount)
      || players.teams.length !== teamCount
      || !Array.isArray(rawData.brackets)
      || !hasStableTeamsMeta(participantMeta.teams, teamCount);
  }

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return !Array.isArray(players.men)
      || !Array.isArray(players.women)
      || players.men.length !== config.men
      || players.women.length !== config.women
      || !hasStableSinglesMeta(participantMeta.men, config.men)
      || !hasStableSinglesMeta(participantMeta.women, config.women);
  }

  if (config.type === "fixed12" || config.type === "fixed16") {
    return !Array.isArray(players.teams)
      || players.teams.length !== config.teams
      || !hasStableTeamsMeta(participantMeta.teams, config.teams);
  }

  return !Array.isArray(rawData.players)
    || rawData.players.length !== config.total
    || !hasStableSinglesMeta(participantMeta.normal, config.total);
}

function getShuffleNames(data, config) {
  if (!data?.players) return [];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return [...data.players.men, ...data.players.women];
  }

  if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    return data.players.teams.map((team, index) => `Dupla ${index + 1}: ${team.a} + ${team.b}`);
  }

  return data.players || [];
}

class TournamentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Erro ao abrir torneio", error, info);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.tournamentId !== this.props.tournamentId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="playAppShell">
          <main className="playMain">
            <section className="card">
              <h1>Não foi possível abrir este torneio</h1>
              <p>Os dados salvos dessa edição precisam ser revisados. Sua conta e os outros torneios continuam preservados.</p>
              <div className="actions">
                <button type="button" onClick={this.props.onBack}>Voltar aos torneios</button>
              </div>
            </section>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

function TournamentScreen({ tournament, userId, organizerProfile, onBack, onEdit, onSave, onNavigationStateChange }) {
  const config = getModalityConfig(tournament.type);

  if (!config) {
    return (
      <div className="playAppShell">
        <main className="playMain">
          <section className="card">
            <h1>Modalidade não reconhecida</h1>
            <p>Este torneio usa uma modalidade que não existe mais na versão atual da plataforma.</p>
            <div className="actions">
              <button type="button" onClick={onBack}>Voltar aos torneios</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const initialDataWasRepairedRef = useRef(needsTournamentDataRepair(tournament.type, tournament.data));

  const [data, setData] = useState(
    () => normalizeTournamentData(tournament.type, tournament.data)
  );

  const [savingStatus, setSavingStatus] = useState("Salvo");
  const [shuffleOverlay, setShuffleOverlay] = useState(null);
  const [notice, setNotice] = useState(null);
  const [clearScoresOpen, setClearScoresOpen] = useState(false);
  const [clearTableOpen, setClearTableOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantFilter, setParticipantFilter] = useState("all");
  const [onlineRegistrations, setOnlineRegistrations] = useState([]);
  const [onlineRegistrationsLoading, setOnlineRegistrationsLoading] = useState(true);
  const [onlineRegistrationsAvailable, setOnlineRegistrationsAvailable] = useState(true);
  const [onlineRegistrationsError, setOnlineRegistrationsError] = useState("");
  const [reviewingRegistrationId, setReviewingRegistrationId] = useState(null);
  const [rankingView, setRankingView] = useState("general");
  const [rankingSearch, setRankingSearch] = useState("");
  const [groupsConfigOpen, setGroupsConfigOpen] = useState(() => isCupType(config));

  const [shareInfo, setShareInfo] = useState({
    public_id: tournament.public_id || null,
    is_public: tournament.is_public || false,
  });

  const [voiceRepeat, setVoiceRepeat] = useState(1);
  const [activeTournamentTab, setActiveTournamentTabState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "participantes";
  });
  const [activeMatchesTab, setActiveMatchesTabState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("partidas");
    return ["grupos", "chaves", "paralela"].includes(requestedTab) ? requestedTab : "grupos";
  });

  async function updateTournamentUrl(next = {}) {
    const params = new URLSearchParams(window.location.search);
    params.set("aba", "criar");
    params.set("torneio", tournament.id);
    params.set("tab", next.activeTournamentTab || activeTournamentTab);
    params.set("partidas", next.activeMatchesTab || activeMatchesTab);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
    window.history.replaceState(null, "", nextUrl);

    if (onNavigationStateChange) {
      onNavigationStateChange({
        tournamentId: tournament.id,
        tournamentTab: params.get("tab"),
        matchesTab: params.get("partidas"),
      });
      return;
    }

    try {
      const { error } = await supabase.from("user_app_state").upsert({
        user_id: tournament.user_id,
        last_url: nextUrl,
        last_panel: "criar",
        last_tournament_id: tournament.id,
        last_tournament_tab: params.get("tab"),
        last_matches_tab: params.get("partidas"),
        scroll_y: Math.max(0, Math.round(window.scrollY || 0)),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (error) console.error("Erro ao salvar posição do torneio", error);
    } catch (error) {
      console.error("Erro ao salvar posição do torneio", error);
    }
  }

  function setActiveTournamentTab(tab) {
    setActiveTournamentTabState(tab);
    updateTournamentUrl({ activeTournamentTab: tab });
  }

  function setActiveMatchesTab(tab) {
    const normalizedTab = ["grupos", "chaves", "paralela"].includes(tab) ? tab : "grupos";
    setActiveMatchesTabState(normalizedTab);
    updateTournamentUrl({ activeMatchesTab: normalizedTab });
  }

  function isMissingOnlineRegistrationResource(error, resourceName = "tournament_registrations") {
    const code = String(error?.code || "");
    const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    return ["42P01", "PGRST202", "PGRST204", "PGRST205"].includes(code)
      || (message.includes(resourceName.toLowerCase()) && /does not exist|not found|schema cache|could not find/.test(message));
  }

  function normalizeOnlineRegistrationStatus(value) {
    const status = String(value || "pending").toLowerCase();
    return ["confirmed", "rejected"].includes(status) ? status : "pending";
  }

  async function loadOnlineRegistrations({ showLoading = true } = {}) {
    if (!tournament?.id) return;
    if (showLoading) setOnlineRegistrationsLoading(true);
    setOnlineRegistrationsError("");

    const registrationResult = await supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: false });

    if (registrationResult.error) {
      setOnlineRegistrationsLoading(false);
      setOnlineRegistrations([]);

      if (isMissingOnlineRegistrationResource(registrationResult.error)) {
        setOnlineRegistrationsAvailable(false);
        return;
      }

      console.error("Erro ao carregar inscrições online:", registrationResult.error);
      setOnlineRegistrationsAvailable(true);
      setOnlineRegistrationsError("Não foi possível atualizar as inscrições online agora.");
      return;
    }

    const rows = Array.isArray(registrationResult.data) ? registrationResult.data : [];
    const athleteIds = Array.from(new Set(rows.map((row) => row.athlete_user_id).filter(Boolean)));
    let profilesByUserId = {};

    if (athleteIds.length) {
      const profileResult = await supabase
        .from("athlete_profiles")
        .select("user_id, display_name, photo_url, bio, is_public, show_achievements")
        .in("user_id", athleteIds);

      if (!profileResult.error) {
        profilesByUserId = Object.fromEntries((profileResult.data || []).map((profileRow) => [profileRow.user_id, profileRow]));
      } else if (!isMissingOnlineRegistrationResource(profileResult.error, "athlete_profiles")) {
        console.error("Erro ao carregar perfis das inscrições online:", profileResult.error);
      }
    }

    setOnlineRegistrations(rows.map((row) => ({
      ...row,
      status: normalizeOnlineRegistrationStatus(row.status),
      athleteProfile: profilesByUserId[row.athlete_user_id] || null,
    })));
    setOnlineRegistrationsAvailable(true);
    setOnlineRegistrationsLoading(false);
  }

  useEffect(() => {
    updateTournamentUrl();
  }, []);

  useEffect(() => {
    void loadOnlineRegistrations();
  }, [tournament.id]);

  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const latestDataRef = useRef(data);
  const firstRenderRef = useRef(true);
  const shuffleAnimationTimerRef = useRef(null);
  const shuffleCountdownTimerRef = useRef(null);
  const appliedAthleteLinkRequestsRef = useRef(new Set());

  function enqueueTournamentSave(nextData) {
    const updatedTournament = { ...tournament, data: nextData };
    const queuedSave = saveQueueRef.current
      .catch(() => undefined)
      .then(() => onSave(updatedTournament));

    // Toda gravação desta tela respeita a ordem em que foi solicitada. Assim,
    // uma edição nova nunca é sobrescrita pelo retorno tardio de um save antigo.
    saveQueueRef.current = queuedSave.then(() => undefined, () => undefined);
    return queuedSave;
  }

  function clearShuffleTimers() {
    if (shuffleAnimationTimerRef.current) clearInterval(shuffleAnimationTimerRef.current);
    if (shuffleCountdownTimerRef.current) clearInterval(shuffleCountdownTimerRef.current);
    shuffleAnimationTimerRef.current = null;
    shuffleCountdownTimerRef.current = null;
  }

  const ranking = useMemo(
    () => calculateRanking(data, tournament.type, data.rankingCriteria),
    [data, tournament.type]
  );

  const participantRecords = useMemo(
    () => getTournamentParticipantRecords(tournament.type, data),
    [data, tournament.type]
  );
  const participantSummary = useMemo(() => ({
    total: participantRecords.length,
    confirmed: participantRecords.filter((record) => record.meta.registration === "confirmed").length,
    pending: participantRecords.filter((record) => record.meta.registration !== "confirmed").length,
  }), [participantRecords]);
  const plannedCupGroupCount = isCupType(config)
    ? getCupGroupCount(config, data.cupConfig?.teamCount || config.defaultTeams)
    : 0;

  const cupGroupRankings = useMemo(
    () => isCupType(config) && data.groupsShuffled
      ? calculateCupGroupRankings(data, data.rankingCriteria)
      : [],
    [data, config.type]
  );

  const scheduleGames = useMemo(() => (data.schedule || []).flat(), [data.schedule]);
  const completedScheduleGames = useMemo(() => {
    const winningScore = getWinningScore(data);
    return scheduleGames.filter((game) => getScoreWinnerSide(game, winningScore) !== null);
  }, [scheduleGames, data.winningScore]);
  const allocatedGroupParticipants = useMemo(
    () => cupGroupRankings.reduce((total, group) => total + (group.rows?.length || 0), 0),
    [cupGroupRankings]
  );
  const groupStageComplete = scheduleGames.length > 0 && completedScheduleGames.length === scheduleGames.length;

  const copinhaGroupCampaignTies = useMemo(
    () => isCopinhaData(data) && data.schedule?.length > 0
      ? getCopinhaSeededGroups(data).unresolvedGroupTies
      : [],
    [data, config.type]
  );

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => () => clearShuffleTimers(), []);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    setSavingStatus("Salvando...");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const ok = await enqueueTournamentSave(latestDataRef.current);
      setSavingStatus(ok ? "Salvo automaticamente" : "Erro ao salvar");
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data]);

  useEffect(() => {
    if (!initialDataWasRepairedRef.current) return undefined;

    let cancelled = false;

    async function persistRecoveredData() {
      setSavingStatus("Recuperando dados...");
      const ok = await enqueueTournamentSave(data);

      if (!cancelled) {
        setSavingStatus(ok ? "Dados recuperados" : "Erro ao recuperar dados");
      }
    }

    persistRecoveredData();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleBack() {
    onBack();
  }

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  async function enablePublicShare() {
    setShareLoading(true);

    const publicId = shareInfo.public_id || generatePublicId();

    const { error } = await supabase
      .from("tournaments")
      .update({
        public_id: publicId,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournament.id)
      .eq("user_id", userId);

    setShareLoading(false);

    if (error) {
      console.error(error);
      showNotice("error", "Erro ao gerar link", "Não foi possível ativar o link público.");
      return;
    }

    const nextInfo = {
      public_id: publicId,
      is_public: true,
    };

    setShareInfo(nextInfo);

    const ok = await copyToClipboard(getPublicShareMessage(publicId));

    showNotice(
      "success",
      "Link público ativado",
      ok
        ? "A mensagem com o link foi ativada e copiada para a área de transferência."
        : "O link foi ativado. Copie o link na área de compartilhamento."
    );
  }

  async function disablePublicShare() {
    if (!shareInfo.public_id) return;

    setShareLoading(true);

    const { error } = await supabase
      .from("tournaments")
      .update({
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournament.id)
      .eq("user_id", userId);

    setShareLoading(false);

    if (error) {
      console.error(error);
      showNotice("error", "Erro ao desativar", "Não foi possível desativar o link público.");
      return;
    }

    setShareInfo((prev) => ({
      ...prev,
      is_public: false,
    }));

    showNotice("success", "Link desativado", "O link público foi desativado.");
  }

  async function copyPublicLink() {
    if (!shareInfo.public_id) return;

    const ok = await copyToClipboard(getPublicUrl(shareInfo.public_id));

    showNotice(
      ok ? "success" : "error",
      ok ? "Link copiado" : "Erro ao copiar",
      ok ? "O link público foi copiado para a área de transferência." : "Não foi possível copiar o link."
    );
  }

  async function sharePublicLink() {
    if (!shareInfo.public_id) return;

    const url = getPublicUrl(shareInfo.public_id);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: tournament.name || "Torneio 360",
          text: "Acompanhe este torneio no Torneio 360.",
          url,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const ok = await copyToClipboard(url);
    showNotice(
      ok ? "success" : "error",
      ok ? "Link pronto para compartilhar" : "Erro ao compartilhar",
      ok ? "O navegador não abriu o compartilhamento, então copiamos o link para você." : "Não foi possível compartilhar o link."
    );
  }

  function confirmRankingFinal() {
    const scheduledGames = (data.schedule || []).flat();
    const hasPendingScores = scheduledGames.some((game) => !isGameFinished(game, getWinningScore(data)));

    if (!scheduledGames.length || hasPendingScores) {
      showNotice("warning", "Resultados pendentes", "Preencha todos os placares antes de confirmar o ranking final.");
      return;
    }

    if (isCupType(config) && mainCupPodium.length === 0) {
      showNotice("warning", "Chave final pendente", "Finalize a chave principal antes de confirmar o ranking oficial.");
      return;
    }

    setData((currentData) => ({ ...currentData, rankingConfirmedAt: new Date().toISOString() }));
    showNotice("success", "Ranking final confirmado", "A classificação foi marcada como resultado oficial do organizador.");
  }

  function shareTournamentRanking() {
    if (shareInfo.is_public && shareInfo.public_id) {
      sharePublicLink();
      return;
    }

    setShareOpen(true);
    showNotice("warning", "Ative o link público", "Gere a tabela pública para compartilhar o ranking com atletas e convidados.");
  }

  function updateRankingCriteria(value) {
    setData((prev) => ({ ...prev, rankingCriteria: value }));
  }

  function updateCupConfig(field, value) {
    setData((prev) => {
      const copy = structuredClone(prev);

      copy.cupConfig = {
        ...(copy.cupConfig || {}),
        [field]: value,
      };

      if (field === "teamCount") {
        const teamCount = Number(value);
        copy.cupConfig.teamCount = teamCount;

        copy.players.teams = Array.from({ length: teamCount }, (_, i) => {
          return copy.players.teams[i] || {
            a: `Atleta 1 da dupla ${i + 1}`,
            b: `Atleta 2 da dupla ${i + 1}`,
          };
        });
        copy.participantMeta = {
          ...(copy.participantMeta || {}),
          teams: normalizeParticipantMetaList(copy.participantMeta?.teams, teamCount, { athleteCount: 2 }),
        };

        copy.schedule = [];
        copy.brackets = [];
        copy.groupsShuffled = false;
        resetCopinhaTieBreaks(copy);
      }

      return copy;
    });
  }

  function resolveCopinhaTie(groupId, teamIds) {
    if (!Array.isArray(teamIds) || teamIds.length < 2) return;

    setData((prev) => {
      const copy = structuredClone(prev);
      const tieBreakOverrides = {
        ...(copy.cupConfig?.tieBreakOverrides || {}),
        [String(groupId)]: shuffleArray([...teamIds]),
      };

      copy.cupConfig = {
        ...(copy.cupConfig || {}),
        tieBreakOverrides,
      };
      copy.brackets = [];

      return copy;
    });

    showNotice("success", "Desempate sorteado", "A ordem do sorteio foi salva e as chaves finais foram atualizadas.");
  }

  function resolveCopinhaGroupTie(tieKey, groupIds) {
    if (!Array.isArray(groupIds) || groupIds.length < 2) return;

    setData((prev) => {
      const copy = structuredClone(prev);
      const groupTieBreakOverrides = {
        ...(copy.cupConfig?.groupTieBreakOverrides || {}),
        [tieKey]: shuffleArray([...groupIds]),
      };

      copy.cupConfig = {
        ...(copy.cupConfig || {}),
        groupTieBreakOverrides,
      };
      copy.brackets = [];

      return copy;
    });

    showNotice("success", "Melhor grupo sorteado", "A ordem dos grupos empatados foi salva e as chaves finais foram atualizadas.");
  }

  function refreshGameParticipantNames(nextData) {
    function getTeamNames(ids = []) {
      if (!ids.length) return ["Aguardando"];

      if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
        const allPlayers = [...(nextData.players?.men || []), ...(nextData.players?.women || [])];
        return ids.map((id) => allPlayers[id] || "");
      }

      if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
        return ids.map((id) => getTeamName(nextData.players?.teams?.[id]));
      }

      return ids.map((id) => nextData.players?.[id] || "");
    }

    function refreshGame(game) {
      return {
        ...game,
        team1: game.ids1?.length ? getTeamNames(game.ids1) : game.team1,
        team2: game.ids2?.length ? getTeamNames(game.ids2) : game.team2,
      };
    }

    nextData.schedule = (nextData.schedule || []).map((round) =>
      round.map((game) => refreshGame(game))
    );

    nextData.brackets = (nextData.brackets || []).map((game) => refreshGame(game));

    return nextData;
  }

  function updatePlayer(path, value) {
    const copy = structuredClone(data);

    if (path.kind === "normal") copy.players[path.index] = value;
    if (path.kind === "men") copy.players.men[path.index] = value;
    if (path.kind === "women") copy.players.women[path.index] = value;
    if (path.kind === "team") copy.players.teams[path.index][path.field] = value;

    setData(refreshGameParticipantNames(copy));
  }

  function updateParticipantMeta(path, field, value) {
    setData((currentData) => {
      const copy = structuredClone(currentData);
      const kind = path.kind === "team" ? "teams" : path.kind;
      copy.participantMeta = copy.participantMeta || { normal: [], men: [], women: [], teams: [] };
      copy.participantMeta[kind] = Array.isArray(copy.participantMeta[kind]) ? copy.participantMeta[kind] : [];
      const currentMeta = {
        payment: "pending",
        registration: "pending",
        profileLinked: false,
        ...(copy.participantMeta[kind][path.index] || {}),
        [field]: value,
      };
      copy.participantMeta[kind][path.index] = kind === "teams"
        ? normalizeParticipantMetaList([currentMeta], 1, { athleteCount: 2 })[0]
        : currentMeta;
      return copy;
    });
  }

  function updateAllParticipantRegistrations(registration) {
    const nextRegistration = registration === "confirmed" ? "confirmed" : "pending";

    setData((currentData) => {
      const copy = structuredClone(currentData);
      copy.participantMeta = copy.participantMeta || { normal: [], men: [], women: [], teams: [] };

      const kinds = config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16"
        ? ["men", "women"]
        : config.type === "fixed12" || config.type === "fixed16" || isCupType(config)
          ? ["teams"]
          : ["normal"];

      kinds.forEach((kind) => {
        const count = kind === "teams"
          ? (copy.players?.teams || []).length
          : kind === "men"
            ? (copy.players?.men || []).length
            : kind === "women"
              ? (copy.players?.women || []).length
              : (copy.players || []).length;
        const normalized = normalizeParticipantMetaList(
          copy.participantMeta[kind],
          count,
          kind === "teams" ? { athleteCount: 2 } : undefined
        );
        copy.participantMeta[kind] = normalized.map((item, index) => {
          const hasRealParticipant = kind === "teams"
            ? !isAvailableOnlineRegistrationSlotName(copy.players?.teams?.[index]?.a)
              || !isAvailableOnlineRegistrationSlotName(copy.players?.teams?.[index]?.b)
            : kind === "men"
              ? !isAvailableOnlineRegistrationSlotName(copy.players?.men?.[index])
              : kind === "women"
                ? !isAvailableOnlineRegistrationSlotName(copy.players?.women?.[index])
                : !isAvailableOnlineRegistrationSlotName(copy.players?.[index]);
          return hasRealParticipant ? { ...item, registration: nextRegistration } : item;
        });
      });

      return copy;
    });

    showNotice(
      "success",
      nextRegistration === "confirmed" ? "Todos confirmados" : "Todos marcados como pendentes",
      "O status de todas as inscrições foi atualizado em uma única ação."
    );
  }

  function isAvailableOnlineRegistrationSlotName(value) {
    const name = String(value || "").trim();
    if (!name) return true;
    return /^(participante|jogador|homem|mulher)\s+\d+$/i.test(name)
      || /^atleta\s+[12]\s+da\s+dupla\s+\d+$/i.test(name);
  }

  function getOnlineRegistrationAthleteMeta(registration) {
    const athleteProfile = registration.athleteProfile || {};
    const athleteProfileId = registration.athlete_user_id || "";
    const displayName = athleteProfile.display_name || registration.athlete_name || "Atleta";

    return normalizeAthleteProfileMeta({
      athleteProfileId,
      profileSlug: athleteProfileId,
      displayName,
      photoUrl: athleteProfile.photo_url || "",
      bio: athleteProfile.bio || "",
      publicConsent: athleteProfile.is_public === true,
      profileLinked: Boolean(athleteProfileId),
      linkedAt: registration.updated_at || registration.created_at || new Date().toISOString(),
      showAchievements: athleteProfile.show_achievements !== false,
    });
  }

  function syncOnlineRegistrationToParticipantList(currentData, registration) {
    const copy = structuredClone(currentData);
    const externalRegistrationId = String(registration.id || "");
    const athleteName = String(registration.athleteProfile?.display_name || registration.athlete_name || "Atleta").trim();
    const partnerName = String(registration.partner_name || "").trim();
    const athleteMeta = getOnlineRegistrationAthleteMeta(registration);
    const hasRegistrationId = (item) => String(item?.externalRegistrationId || item?.external_registration_id || "") === externalRegistrationId;

    copy.participantMeta = copy.participantMeta || { normal: [], men: [], women: [], teams: [] };

    if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
      const teams = Array.isArray(copy.players?.teams) ? copy.players.teams : [];
      copy.participantMeta.teams = normalizeParticipantMetaList(copy.participantMeta.teams, teams.length, { athleteCount: 2 });
      const existingIndex = copy.participantMeta.teams.findIndex(hasRegistrationId);

      if (existingIndex >= 0) {
        copy.participantMeta.teams[existingIndex] = {
          ...copy.participantMeta.teams[existingIndex],
          registration: "confirmed",
        };
        return { nextData: copy, synced: true, alreadySynced: true };
      }

      const slotIndex = teams.findIndex((team) => (
        isAvailableOnlineRegistrationSlotName(team?.a) && isAvailableOnlineRegistrationSlotName(team?.b)
      ));
      if (slotIndex < 0) return { nextData: currentData, synced: false, full: true };

      copy.players.teams[slotIndex] = {
        ...copy.players.teams[slotIndex],
        a: athleteName,
        b: partnerName || "Parceiro a definir",
      };
      const teamMeta = normalizeParticipantMetaList([copy.participantMeta.teams[slotIndex]], 1, { athleteCount: 2 })[0];
      teamMeta.externalRegistrationId = registration.id;
      teamMeta.registration = "confirmed";
      teamMeta.athletes[0] = normalizeAthleteProfileMeta({ ...teamMeta.athletes[0], ...athleteMeta });
      teamMeta.profileLinked = teamMeta.athletes.some((athlete) => athlete.profileLinked);
      copy.participantMeta.teams[slotIndex] = teamMeta;

      return { nextData: refreshGameParticipantNames(copy), synced: true, alreadySynced: false };
    }

    const isMixed = config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16";
    const requestedCategory = String(registration.category || "").toLocaleLowerCase("pt-BR");
    const candidateKinds = isMixed
      ? (/femin|mulher/.test(requestedCategory)
        ? ["women"]
        : /mascul|homem/.test(requestedCategory)
          ? ["men"]
          : ["men", "women"])
      : ["normal"];

    for (const kind of candidateKinds) {
      const players = kind === "normal" ? copy.players : copy.players?.[kind];
      if (!Array.isArray(players)) continue;
      copy.participantMeta[kind] = normalizeParticipantMetaList(copy.participantMeta[kind], players.length);
      const existingIndex = copy.participantMeta[kind].findIndex(hasRegistrationId);

      if (existingIndex >= 0) {
        copy.participantMeta[kind][existingIndex] = {
          ...copy.participantMeta[kind][existingIndex],
          registration: "confirmed",
        };
        return { nextData: copy, synced: true, alreadySynced: true };
      }

      const slotIndex = players.findIndex(isAvailableOnlineRegistrationSlotName);
      if (slotIndex < 0) continue;

      players[slotIndex] = athleteName;
      copy.participantMeta[kind][slotIndex] = {
        ...copy.participantMeta[kind][slotIndex],
        ...athleteMeta,
        externalRegistrationId: registration.id,
        registration: "confirmed",
      };
      return { nextData: refreshGameParticipantNames(copy), synced: true, alreadySynced: false };
    }

    return { nextData: currentData, synced: false, full: true };
  }

  function markSyncedOnlineRegistrationPending(currentData, registrationId) {
    const copy = structuredClone(currentData);
    const externalRegistrationId = String(registrationId || "");
    let changed = false;
    copy.participantMeta = copy.participantMeta || { normal: [], men: [], women: [], teams: [] };

    ["normal", "men", "women", "teams"].forEach((kind) => {
      const values = Array.isArray(copy.participantMeta[kind]) ? copy.participantMeta[kind] : [];
      copy.participantMeta[kind] = values.map((item) => {
        if (String(item?.externalRegistrationId || item?.external_registration_id || "") !== externalRegistrationId) return item;
        changed = true;
        return { ...item, registration: "pending" };
      });
    });

    return changed ? copy : currentData;
  }

  async function reviewOnlineRegistration(registration, nextStatus) {
    if (!registration?.id || reviewingRegistrationId) return;
    const status = normalizeOnlineRegistrationStatus(nextStatus);
    setReviewingRegistrationId(registration.id);

    const { data: reviewedData, error } = await supabase.rpc("review_tournament_registration", {
      p_registration_id: registration.id,
      p_status: status,
    });

    setReviewingRegistrationId(null);

    if (error) {
      console.error("Erro ao revisar inscrição online:", error);
      showNotice("error", "Inscrição não atualizada", "Não foi possível alterar o status desta inscrição online.");
      return;
    }

    const reviewedRow = Array.isArray(reviewedData) ? reviewedData[0] : reviewedData;
    const updatedRegistration = {
      ...registration,
      ...(isTournamentDataObject(reviewedRow) ? reviewedRow : {}),
      status,
      athleteProfile: registration.athleteProfile || null,
    };
    setOnlineRegistrations((current) => current.map((item) => (
      item.id === registration.id ? updatedRegistration : item
    )));

    if (status === "confirmed") {
      const syncResult = syncOnlineRegistrationToParticipantList(latestDataRef.current, updatedRegistration);

      if (!syncResult.synced) {
        showNotice(
          "warning",
          "Inscrição confirmada, mas lista lotada",
          "O status online foi confirmado, porém nenhum inscrito existente foi substituído. Libere um slot e confirme novamente para sincronizar."
        );
        return;
      }

      setData(syncResult.nextData);
      showNotice(
        "success",
        syncResult.alreadySynced ? "Inscrição já sincronizada" : "Inscrição confirmada",
        syncResult.alreadySynced
          ? "O participante já estava vinculado à lista deste torneio."
          : "O atleta foi confirmado e adicionado ao primeiro slot disponível, sem substituir outros inscritos."
      );
      return;
    }

    setData((currentData) => markSyncedOnlineRegistrationPending(currentData, registration.id));

    showNotice(
      "success",
      status === "rejected" ? "Inscrição rejeitada" : "Inscrição pendente",
      "O status da inscrição online foi atualizado."
    );
  }

  function applyAthleteLinkResult(result) {
    if (!result || String(result.tournamentId) !== String(tournament.id)) return false;
    const path = result.path || {};
    let index = Number(path.index);
    const athleteIndex = Number(result.athleteIndex || 0);
    if (!Number.isInteger(index) || index < 0 || !["normal", "men", "women", "team"].includes(path.kind)) return false;
    if (path.kind === "team" && ![0, 1].includes(athleteIndex)) return false;

    const requestedMemberId = String(path.memberId || path.member_id || "");
    if (requestedMemberId) {
      const currentMeta = latestDataRef.current?.participantMeta || {};
      let currentIndex = -1;
      if (path.kind === "team") {
        const teams = normalizeParticipantMetaList(
          currentMeta.teams,
          latestDataRef.current?.players?.teams?.length || 0,
          { athleteCount: 2 }
        );
        currentIndex = teams.findIndex((item) => String(item.athletes?.[athleteIndex]?.memberId || "") === requestedMemberId);
      } else {
        const values = Array.isArray(currentMeta[path.kind]) ? currentMeta[path.kind] : [];
        currentIndex = values.findIndex((item) => String(normalizeAthleteProfileMeta(item).memberId || "") === requestedMemberId);
      }
      if (currentIndex < 0) return false;
      index = currentIndex;
    }

    const copy = structuredClone(latestDataRef.current);
    const kind = path.kind === "team" ? "teams" : path.kind;
    copy.participantMeta = copy.participantMeta || { normal: [], men: [], women: [], teams: [] };
    copy.participantMeta[kind] = Array.isArray(copy.participantMeta[kind]) ? copy.participantMeta[kind] : [];

    if (kind === "teams") {
      const teamMeta = normalizeParticipantMetaList([copy.participantMeta.teams[index]], 1, { athleteCount: 2 })[0];
      teamMeta.athletes[athleteIndex] = normalizeAthleteProfileMeta({
        ...teamMeta.athletes[athleteIndex],
        athleteProfileId: result.athleteProfileId,
        profileSlug: result.profileSlug || result.athleteProfileId,
        displayName: result.displayName || "",
        photoUrl: result.photoUrl || "",
        bio: "",
        publicConsent: result.publicConsent === true,
        profileLinked: true,
        linkedAt: result.linkedAt || new Date().toISOString(),
        linkRequestId: result.requestId || "",
      });
      teamMeta.profileLinked = teamMeta.athletes.some((athlete) => athlete.profileLinked);
      copy.participantMeta.teams[index] = teamMeta;

      if (result.displayName && copy.players?.teams?.[index]) {
        copy.players.teams[index][athleteIndex === 0 ? "a" : "b"] = result.displayName;
      }
    } else {
      const currentMeta = copy.participantMeta[kind][index] || {};
      copy.participantMeta[kind][index] = {
        ...currentMeta,
        ...normalizeAthleteProfileMeta({
          ...currentMeta,
          athleteProfileId: result.athleteProfileId,
          profileSlug: result.profileSlug || result.athleteProfileId,
          displayName: result.displayName || "",
          photoUrl: result.photoUrl || "",
          bio: "",
          publicConsent: result.publicConsent === true,
          profileLinked: true,
          linkedAt: result.linkedAt || new Date().toISOString(),
          linkRequestId: result.requestId || "",
        }),
      };

      if (result.displayName) {
        if (kind === "normal" && Array.isArray(copy.players)) copy.players[index] = result.displayName;
        if (kind === "men" && copy.players?.men) copy.players.men[index] = result.displayName;
        if (kind === "women" && copy.players?.women) copy.players.women[index] = result.displayName;
      }
    }

    const nextData = refreshGameParticipantNames(copy);
    latestDataRef.current = nextData;
    setData(nextData);

    showNotice("success", "Perfil vinculado", `${result.displayName || "O atleta"} confirmou o perfil e a preferência de exibição.`);
    return nextData;
  }

  async function startAthleteProfileLink(path, athleteIndex, athleteName, athleteMeta = {}) {
    const linkWindow = window.open("about:blank", "_blank");
    if (!linkWindow) {
      showNotice("warning", "Nova aba bloqueada", "Permita pop-ups para abrir o login seguro do atleta.");
      return;
    }

    linkWindow.opener = null;
    const normalizedAthleteMeta = normalizeAthleteProfileMeta(athleteMeta);
    const { data: requestData, error } = await supabase.rpc("create_athlete_link_request", {
      p_tournament_id: tournament.id,
      p_path: { ...path, memberId: normalizedAthleteMeta.memberId },
      p_athlete_index: Number(athleteIndex || 0),
      p_athlete_name: String(athleteName || "Atleta"),
    });
    const requestId = Array.isArray(requestData)
      ? (requestData[0]?.requestId || requestData[0]?.id || requestData[0]?.request_id || requestData[0])
      : (requestData?.requestId || requestData?.id || requestData?.request_id || requestData);

    if (error || !requestId) {
      linkWindow.close();
      console.error("Erro ao criar convite de atleta", error);
      showNotice("error", "Vínculo indisponível", "Não foi possível criar o convite seguro. Atualize o banco e tente novamente.");
      return;
    }

    const linkUrl = new URL(window.location.origin + "/");
    linkUrl.searchParams.set("vincular-atleta", String(requestId));
    linkWindow.location.replace(linkUrl.toString());
  }

  useEffect(() => {
    let active = true;
    appliedAthleteLinkRequestsRef.current = new Set();

    async function collectPendingResults() {
      const { data: resultRows, error } = await supabase.rpc("get_my_athlete_link_results");
      if (!active) return;
      if (error) {
        if (!isMissingOnlineRegistrationResource(error, "athlete_link_requests")) {
          console.error("Não foi possível consultar os vínculos de atleta", error);
        }
        return;
      }

      for (const row of Array.isArray(resultRows) ? resultRows : []) {
        const requestId = String(row.requestId || row.request_id || row.id || "");
        if (!requestId || appliedAthleteLinkRequestsRef.current.has(requestId)) continue;
        const result = {
          requestId,
          tournamentId: row.tournamentId || row.tournament_id,
          path: row.path || row.participant_path || {},
          athleteIndex: row.athleteIndex ?? row.athlete_index ?? 0,
          athleteProfileId: row.athleteProfileId || row.athlete_profile_id || row.claimed_by || "",
          profileSlug: row.profileSlug || row.athleteProfileId || row.athlete_profile_id || row.claimed_by || "",
          displayName: row.displayName || row.display_name || row.athlete_name || "Atleta",
          photoUrl: row.photoUrl || row.photo_url || "",
          publicConsent: row.publicConsent === true || row.public_consent === true,
          linkedAt: row.linkedAt || row.claimed_at || new Date().toISOString(),
        };

        const nextData = applyAthleteLinkResult(result);
        if (!nextData) continue;
        appliedAthleteLinkRequestsRef.current.add(requestId);

        // A entrega é at-least-once: o servidor só deixa de reenviar o vínculo
        // depois que o linkRequestId já estiver persistido no JSON do torneio.
        const saved = await enqueueTournamentSave(nextData);
        if (!saved) {
          appliedAthleteLinkRequestsRef.current.delete(requestId);
          showNotice("error", "Vínculo ainda não salvo", "O perfil foi confirmado, mas será tentado novamente quando a conexão voltar.");
          continue;
        }

        const { error: acknowledgeError } = await supabase.rpc("acknowledge_athlete_link_request", {
          p_request_id: requestId,
        });
        if (acknowledgeError) {
          appliedAthleteLinkRequestsRef.current.delete(requestId);
          console.error("Não foi possível concluir o consumo do vínculo", acknowledgeError);
        }
      }
    }

    function receiveLinkSignal(event) {
      if (event.key?.startsWith(ATHLETE_LINK_RESULT_PREFIX)) void collectPendingResults();
    }

    const interval = window.setInterval(() => void collectPendingResults(), 5000);
    window.addEventListener("storage", receiveLinkSignal);
    window.addEventListener("focus", collectPendingResults);
    void collectPendingResults();

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("storage", receiveLinkSignal);
      window.removeEventListener("focus", collectPendingResults);
    };
  }, [tournament.id]);

  function finishShuffle() {
    const copy = structuredClone(data);
    copy.participantMeta = copy.participantMeta || { normal: [], men: [], women: [], teams: [] };

    if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
      const shuffledMen = shuffleParticipantsWithMeta(copy.players.men, copy.participantMeta.men);
      const shuffledWomen = shuffleParticipantsWithMeta(copy.players.women, copy.participantMeta.women);
      copy.players.men = shuffledMen.players;
      copy.players.women = shuffledWomen.players;
      copy.participantMeta.men = shuffledMen.metadata;
      copy.participantMeta.women = shuffledWomen.metadata;
    } else if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
      const shuffledTeams = shuffleParticipantsWithMeta(copy.players.teams, copy.participantMeta.teams);
      copy.players.teams = shuffledTeams.players;
      copy.participantMeta.teams = shuffledTeams.metadata;
    } else {
      const shuffledPlayers = shuffleParticipantsWithMeta(copy.players, copy.participantMeta.normal);
      copy.players = shuffledPlayers.players;
      copy.participantMeta.normal = shuffledPlayers.metadata;
    }

    if (isCupType(config)) {
      copy.brackets = [];
      copy.groupsShuffled = true;
      resetCopinhaTieBreaks(copy);
      copy.schedule = generateCupGroupSchedule(copy.players, copy.cupConfig || {}, config.courts);
    } else {
      copy.schedule = [];
    }

    setData(copy);
    setShuffleOverlay(null);

    if (isCupType(config)) {
      showNotice("success", "Grupos sorteados", "Os grupos e as partidas da fase de grupos foram gerados em uma única ação.");
    }
  }

function shuffleNames() {
  clearShuffleTimers();
  const names = getShuffleNames(data, config);

  if (!names.length) {
    showNotice("warning", "Sem participantes", "Adicione os nomes antes do sorteio.");
    return;
  }

  let seconds = 10;
  let animationNames = shuffleArray(names);

  setShuffleOverlay({ seconds, names: animationNames });

  const interval = setInterval(() => {
    animationNames = shuffleArray(names);
    setShuffleOverlay((prev) => (prev ? { ...prev, names: animationNames } : null));
  }, 250);
  shuffleAnimationTimerRef.current = interval;

  const countdown = setInterval(() => {
    seconds -= 1;
    setShuffleOverlay((prev) => (prev ? { ...prev, seconds } : null));

    if (seconds <= 0) {
      clearShuffleTimers();
      finishShuffle();
    }
  }, 1000);
  shuffleCountdownTimerRef.current = countdown;
}

function generate() {
  if (isCupType(config)) {
    const schedule = generateCupGroupSchedule(data.players, data.cupConfig || {}, config.courts);

    setData((prev) => ({
      ...prev,
      schedule,
      brackets: [],
      groupsShuffled: prev.groupsShuffled || false,
    }));

    setActiveTournamentTab("partidas");
    setActiveMatchesTab("grupos");
    showNotice("success", "Rodadas e jogos criados", "A fase de grupos da Copa foi montada com sucesso.");
    return;
  }

  const schedule = generateSchedule(tournament.type, data.players);

  setData({
    ...data,
    schedule,
  });

  setActiveTournamentTab("partidas");
  showNotice("success", "Rodadas e jogos criados", "As rodadas e os jogos foram criados com sucesso.");
}

function generateBrackets() {
  if (!isCupType(config)) return;

  const allGroupGames = (data.schedule || []).flat();
  const pendingGames = allGroupGames.some((game) => !isGameFinished(game, getWinningScore(data)));

  if (!data.schedule || data.schedule.length === 0) {
    showNotice(
      "warning",
      "Fase de grupos não gerada",
      "Gere a tabela da fase de grupos antes de montar as chaves."
    );
    return;
  }

  if (pendingGames) {
    showNotice(
      "warning",
      "Placares pendentes",
      "Preencha todos os placares da fase de grupos com um resultado válido antes de gerar as chaves."
    );
    return;
  }

  if (isCopinhaData(data)) {
    const hasUnresolvedTie = calculateCupGroupRankings(data, data.rankingCriteria)
      .some((group) => group.unresolvedTieIds?.length > 1);
    const hasUnresolvedGroupTie = getCopinhaSeededGroups(data).unresolvedGroupTies.length > 0;

    if (hasUnresolvedTie || hasUnresolvedGroupTie) {
      showNotice(
        "warning",
        "Desempate pendente",
        "Realize o sorteio de desempate indicado na aba Grupos antes de gerar as chaves."
      );
      setActiveTournamentTab("grupos");
      return;
    }
  }

  const copy = syncCupBracketScores(data);
  setData(copy);

  showNotice("success", "Chaves geradas", "As chaves finais foram montadas com sucesso.");
}

function updateScore(roundIndex, gameIndex, field, value) {
  const copy = structuredClone(data);
  const winningScore = getWinningScore(copy);

  copy.schedule[roundIndex][gameIndex][field] = normalizeScoreInput(value, winningScore);

  if (isCupType(config)) {
    copy.brackets = [];
    resetCopinhaTieBreaks(copy);
  }

  setData(copy);
}

function updateGameDetails(roundIndex, gameIndex, field, value) {
  setData((currentData) => {
    const copy = structuredClone(currentData);
    if (!copy.schedule?.[roundIndex]?.[gameIndex]) return currentData;
    copy.schedule[roundIndex][gameIndex][field] = field === "court"
      ? Math.max(1, Number(value) || 1)
      : value;
    return copy;
  });
}

function updateBracketScore(matchKey, field, value) {
  setData((prev) => {
    const copy = structuredClone(prev);

    if (!copy.brackets || copy.brackets.length === 0) {
      copy.brackets = rebuildCupBracketGames(copy);
    }

    const allResolved = copy.brackets.map((game) =>
      resolveBracketGame(game, copy.brackets, copy)
    );

    const targetGame = allResolved.find((game) => game.matchKey === matchKey);

    if (!targetGame?.ids1?.length || !targetGame?.ids2?.length) {
      return copy;
    }

  const winningScore = getWinningScore(copy);

copy.brackets = copy.brackets.map((game) =>
  game.matchKey === matchKey
    ? { ...game, [field]: normalizeScoreInput(value, winningScore) }
    : game
);

    const existingScores = {};

    copy.brackets.forEach((game) => {
      existingScores[game.matchKey] = {
        s1: game.s1,
        s2: game.s2,
      };
    });

    copy.brackets = rebuildCupBracketGames(copy, existingScores);
    return copy;
  });
}

function clearScores() {
  const copy = structuredClone(data);

  copy.schedule = (copy.schedule || []).map((round) =>
    round.map((game) => ({ ...game, s1: "", s2: "" }))
  );

  if (isCupType(config)) {
    copy.brackets = [];
    resetCopinhaTieBreaks(copy);
  }

  setData(copy);
  setClearScoresOpen(false);
  showNotice("success", "Placares apagados", "Todos os placares foram removidos.");
}

function clearTable() {
  const copy = structuredClone(data);
  copy.schedule = [];

  if (isCupType(config)) {
    copy.brackets = [];
    resetCopinhaTieBreaks(copy);
  }

  setData(copy);
  setClearTableOpen(false);
  showNotice("success", "Jogos e placares apagados", "Todos os jogos e placares foram removidos. Os participantes foram mantidos.");
}

const { currentBrackets, parallelRanking, mainCupPodium, consolationCupPodium } = getSafeCupPresentation(data, config);
const bracketGames = currentBrackets
  ? [...(currentBrackets.main || []), ...(currentBrackets.repechage || [])]
  : [];
const completedBracketGames = bracketGames.filter((game) => getScoreWinnerSide(game, getWinningScore(data)) !== null);
const totalTournamentMatches = scheduleGames.length + bracketGames.length;
const completedTournamentMatches = completedScheduleGames.length + completedBracketGames.length;

  function SavingStatusBadge() {
    return (
      <span className={`savingBadge ${savingStatus === "Salvando..." ? "saving" : savingStatus === "Erro ao salvar" ? "error" : "saved"}`}>
        💾 {savingStatus}
      </span>
    );
  }

  function isOnlineRegistrationSynced(registrationId) {
    const expectedId = String(registrationId || "");
    if (!expectedId) return false;

    const participantMeta = data.participantMeta || {};
    return ["normal", "men", "women", "teams"].some((kind) => (
      Array.isArray(participantMeta[kind])
      && participantMeta[kind].some((item) => (
        String(item?.externalRegistrationId || item?.external_registration_id || "") === expectedId
      ))
    ));
  }

  function renderOnlineRegistrationsBox() {
    if (!onlineRegistrationsAvailable) return null;

    const statusLabels = {
      pending: "Pendente",
      confirmed: "Confirmada",
      rejected: "Rejeitada",
    };
    const pendingCount = onlineRegistrations.filter((registration) => registration.status === "pending").length;

    return (
      <section className="onlineRegistrationsBox" aria-labelledby="online-registrations-title">
        <header className="onlineRegistrationsHeader">
          <div className="onlineRegistrationsHeading">
            <span className="onlineRegistrationsIcon" aria-hidden="true"><Users /></span>
            <div>
              <h3 id="online-registrations-title">Inscrições online</h3>
              <p>Revise as solicitações enviadas pelos atletas pela página pública.</p>
            </div>
          </div>
          <div className="onlineRegistrationsSummary">
            <strong>{onlineRegistrations.length}</strong>
            <span>{pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}</span>
          </div>
        </header>

        {onlineRegistrationsLoading ? (
          <div className="onlineRegistrationsState"><div className="loadingSpinner" aria-hidden="true" /><span>Carregando inscrições...</span></div>
        ) : onlineRegistrationsError ? (
          <div className="onlineRegistrationsState error"><span>{onlineRegistrationsError}</span><button type="button" onClick={() => loadOnlineRegistrations()}>Tentar novamente</button></div>
        ) : onlineRegistrations.length === 0 ? (
          <div className="onlineRegistrationsState empty"><Users aria-hidden="true" /><div><strong>Nenhuma inscrição online</strong><span>As novas solicitações aparecerão aqui.</span></div></div>
        ) : (
          <div className="onlineRegistrationsList">
            {onlineRegistrations.map((registration) => {
              const profile = registration.athleteProfile || {};
              const athleteName = profile.display_name || registration.athlete_name || "Atleta";
              const status = normalizeOnlineRegistrationStatus(registration.status);
              const isReviewing = reviewingRegistrationId === registration.id;
              const isSynced = isOnlineRegistrationSynced(registration.id);

              return (
                <article className={`onlineRegistrationRow status-${status}`} key={registration.id}>
                  <div className="onlineRegistrationAthlete">
                    <span className="onlineRegistrationAvatar">
                      {profile.photo_url ? <img src={profile.photo_url} alt="" /> : getAthleteInitials(athleteName)}
                    </span>
                    <div>
                      <strong>{athleteName}</strong>
                      <small>{registration.athlete_user_id ? "Perfil de atleta vinculado" : "Cadastro online"}</small>
                    </div>
                  </div>
                  <dl className="onlineRegistrationDetails">
                    <div><dt>Parceiro</dt><dd>{registration.partner_name || "Não informado"}</dd></div>
                    <div><dt>Categoria</dt><dd>{registration.category || data.gender || "Geral"}</dd></div>
                  </dl>
                  <span className={`onlineRegistrationStatus status-${status}`}>{statusLabels[status]}</span>
                  <div className="onlineRegistrationActions" aria-label={`Revisar inscrição de ${athleteName}`}>
                    <button type="button" className="confirm" disabled={Boolean(reviewingRegistrationId) || (status === "confirmed" && isSynced)} onClick={() => reviewOnlineRegistration(registration, "confirmed")}>{isReviewing ? "Salvando..." : "Confirmar"}</button>
                    <button type="button" className="pending" disabled={Boolean(reviewingRegistrationId) || status === "pending"} onClick={() => reviewOnlineRegistration(registration, "pending")}>Pendente</button>
                    <button type="button" className="reject" disabled={Boolean(reviewingRegistrationId) || status === "rejected"} onClick={() => reviewOnlineRegistration(registration, "rejected")}>Rejeitar</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function startParticipantRegistration() {
    const participantInputs = Array.from(document.querySelectorAll(".tournamentReferencePage .participantSlotCard input"));
    const availableInput = participantInputs.find((input) => /^(participante|homem|mulher|atleta)/i.test(input.value.trim())) || participantInputs[0];

    if (!availableInput) return;
    availableInput.scrollIntoView({ behavior: "smooth", block: "center" });
    availableInput.focus();
    availableInput.select();
  }

return (
  <>
    <NoticeModal notice={notice} onClose={() => setNotice(null)} />

    <ConfirmClearScoresModal
      open={clearScoresOpen}
      onCancel={() => setClearScoresOpen(false)}
      onConfirm={clearScores}
    />

    <ConfirmClearTableModal
      open={clearTableOpen}
      onCancel={() => setClearTableOpen(false)}
      onConfirm={clearTable}
    />

    {shuffleOverlay && (
      <div className="shuffleOverlay">
        <div className="shuffleBox">
          <div className="shuffleHeader">
            <div>
              <h2>Sorteando nomes...</h2>
              <p>Os participantes estão sendo embaralhados.</p>
            </div>

            <div className="shuffleTimer">{shuffleOverlay.seconds}s</div>
          </div>

          <div className="shuffleStage">
            {shuffleOverlay.names.map((name, index) => (
              <div
                className="floatingName"
                key={index + "-" + name}
                style={{
                  left: `${8 + ((index * 17) % 76)}%`,
                  top: `${12 + ((index * 29) % 70)}%`,
                  animationDelay: `${(index % 6) * 0.08}s`,
                }}
              >
                {name}
              </div>
            ))}
          </div>

          <div className="shuffleProgress">
            <div style={{ width: `${((10 - shuffleOverlay.seconds) / 10) * 100}%` }} />
          </div>
        </div>
      </div>
    )}

    <div className="appPage tournamentReferencePage">
      <button type="button" className="tournamentBackLink" onClick={handleBack}>‹ Voltar para torneios</button>

      <header className="tournamentReferenceHeader">
        <div className="tournamentReferenceCopy">
          <h1>{tournament.name}</h1>
          <div className="tournamentHeaderMeta tournamentHeaderMetaPrimary">
            {data.eventPeriodLabel || data.eventDate ? <span><CalendarDays aria-hidden="true" /> {data.eventPeriodLabel || formatDateBR(data.eventDate)}</span> : null}
            {data.eventDay ? <span>{data.eventDay}</span> : null}
            {data.location ? <span><MapPin aria-hidden="true" /> {data.location}</span> : null}
          </div>
          <div className="tournamentHeaderMeta tournamentHeaderMetaSecondary">
            {data.gender ? <span>{data.gender}</span> : null}
            <span>{getSportDefinition(data.sport || DEFAULT_SPORT_ID).name}</span>
            {data.registrationDeadline ? <span>Inscrições encerram {formatDateBR(data.registrationDeadline)}</span> : null}
            <span>Set único de {data.winningScore || 4} games</span>
          </div>
        </div>

        <div className="actions tournamentHeaderActions">
          <button type="button" className="tournamentShareAction" onClick={() => setShareOpen((prev) => !prev)}>
            <Share2 aria-hidden="true" /> Compartilhar tabela pública
          </button>
          <button type="button" className="tournamentEditAction" onClick={onEdit}>
            <Edit2 aria-hidden="true" /> Editar torneio
          </button>
          <button type="button" className="tournamentMoreAction" aria-label="Mais opções do torneio">
            <MoreVertical aria-hidden="true" />
          </button>
        </div>
      </header>

              {shareOpen && (
          <section className="card shareCard">
            <h2>Link público</h2>
            <p>Atletas e convidados poderão acompanhar participantes, jogos e resultados em modo somente leitura.</p>

            {!shareInfo.is_public ? (
              <button type="button" className="sharePrimaryAction" onClick={enablePublicShare} disabled={shareLoading}>
                <Link2 aria-hidden="true" />
                {shareLoading ? "Gerando..." : "Ativar link público"}
              </button>
            ) : (
              <>
                <label>Link público</label>

                <div className="shareLinkBox">
                  <input
                    readOnly
                    value={getPublicUrl(shareInfo.public_id)}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div className="shareActionRow">
                  <button type="button" className="sharePrimaryAction" onClick={sharePublicLink}>
                    <Share2 aria-hidden="true" /> Compartilhar
                  </button>
                  <button type="button" className="secondaryBtn" onClick={copyPublicLink}>
                    <Copy aria-hidden="true" /> Copiar link
                  </button>
                  <button
                    type="button"
                    className="deleteBtn"
                    onClick={disablePublicShare}
                    disabled={shareLoading}
                  >
                    {shareLoading ? "Desativando..." : "Desativar link"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <nav className="tournamentTopTabs" aria-label="Organização do torneio">
          <button type="button" className={activeTournamentTab === "participantes" ? "active" : ""} onClick={() => setActiveTournamentTab("participantes")}><span className="tournamentTabEmoji" aria-hidden="true">{"\uD83D\uDC65"}</span> Inscritos</button>
          {isCupType(config) && (
            <button type="button" className={activeTournamentTab === "grupos" ? "active" : ""} onClick={() => setActiveTournamentTab("grupos")}><span className="tournamentTabEmoji" aria-hidden="true">{"\uD83C\uDFB2"}</span> Grupos</button>
          )}
          <button type="button" className={activeTournamentTab === "partidas" ? "active" : ""} onClick={() => setActiveTournamentTab("partidas")}><span className="tournamentTabEmoji" aria-hidden="true">{"\uD83C\uDFBE"}</span> Partidas</button>
          <button type="button" className={activeTournamentTab === "ranking" ? "active" : ""} onClick={() => setActiveTournamentTab("ranking")}><span className="tournamentTabEmoji" aria-hidden="true">{"\uD83C\uDFC6"}</span> Ranking</button>
        </nav>

        <section className="card figmaTournamentSection figmaParticipantsSection" style={{ display: activeTournamentTab === "participantes" ? undefined : "none" }}>
          <div className="cardTitleRow figmaTournamentSectionHeading">
            <div>
              <h2>Inscritos</h2>
              <p>Acompanhe as inscrições, confirme os participantes e gerencie a lista.</p>
            </div>
            <div className="participantHeaderActions">
              <SavingStatusBadge />
              <button type="button" className="participantAddAction" onClick={startParticipantRegistration}>
                <PlusCircle aria-hidden="true" /> Adicionar inscrição
              </button>
            </div>
          </div>

          <div className="figmaInnerTabs" role="tablist" aria-label="Gestão de inscritos">
            <button type="button" className="active" aria-selected="true">Inscritos</button>
          </div>

          {renderOnlineRegistrationsBox()}

          <div className="participantManagementStats figmaParticipantStats">
            <div className="total"><span>Total de inscritos</span><strong>{participantSummary.total} <small>{isCupType(config) ? "duplas" : "atletas"}</small></strong></div>
            <div className="confirmed"><span>Confirmados</span><strong>{participantSummary.confirmed} <small>Confirmados</small></strong></div>
            <div className="pending"><span>Pendentes</span><strong>{participantSummary.pending} <small>Aguardando</small></strong></div>
          </div>
          <div className="participantManagementToolbar">
            <label><Search aria-hidden="true" /><input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Buscar atleta ou dupla..." /></label>
            <select value={participantFilter} onChange={(event) => setParticipantFilter(event.target.value)} aria-label="Filtrar inscritos por status">
              <option value="all">Todos os status</option>
              <option value="confirmed">Confirmados</option>
              <option value="pending">Pendentes</option>
            </select>
            <button type="button" className="secondaryBtn" onClick={() => { setParticipantSearch(""); setParticipantFilter("all"); }}><Filter aria-hidden="true" /> Limpar</button>
            <div className="participantBulkStatusActions" aria-label="Alterar o status de todas as inscrições">
              <button type="button" className="confirmAll" onClick={() => updateAllParticipantRegistrations("confirmed")}>Confirmar todos</button>
              <button type="button" className="pendingAll" onClick={() => updateAllParticipantRegistrations("pending")}>Todos pendentes</button>
            </div>
          </div>
          <PlayerInputs type={tournament.type} data={data} updatePlayer={updatePlayer} updateParticipantMeta={updateParticipantMeta} onLinkAthlete={startAthleteProfileLink} searchQuery={participantSearch} statusFilter={participantFilter} />
          {!isCupType(config) && (
            <div className="actions figmaTournamentBottomActions">
              <button type="button" className="secondaryBtn" onClick={shuffleNames}>Sortear nomes</button>
              <button type="button" onClick={generate}>Criar rodadas e jogos</button>
            </div>
          )}
        </section>

        {isCupType(config) && (
          <section className="card figmaTournamentSection figmaGroupsSection" style={{ display: activeTournamentTab === "grupos" ? undefined : "none" }}>
            <div className="cardTitleRow figmaTournamentSectionHeading">
              <div>
                <h2>Fase de Grupos</h2>
                <p>Organize os participantes, realize o sorteio e acompanhe a classificação da fase de grupos.</p>
              </div>
              <div className="figmaGroupActions">
                <SavingStatusBadge />
                <button type="button" className="figmaIconButton" onClick={() => setGroupsConfigOpen((current) => !current)} aria-label="Configurar grupos"><Filter aria-hidden="true" /></button>
                <button type="button" onClick={shuffleNames}>Sortear grupos</button>
              </div>
            </div>

            {groupsConfigOpen && (
              <CupConfigPanel data={data} config={config} updateCupConfig={updateCupConfig} />
            )}

            <div className="figmaGroupStats">
              <div><span>Total de grupos</span><strong>{data.groupsShuffled ? cupGroupRankings.length : plannedCupGroupCount}</strong></div>
              <div><span>Participantes alocados</span><strong>{allocatedGroupParticipants || participantSummary.total} <small>duplas</small></strong></div>
              <div><span>Partidas desta fase</span><strong>{scheduleGames.length}</strong></div>
              <div className={groupStageComplete ? "complete" : ""}><span>Situação atual</span><strong>{groupStageComplete ? "FASE CONCLUÍDA" : scheduleGames.length ? "EM ANDAMENTO" : "AGUARDANDO"}</strong></div>
            </div>

            {groupStageComplete && (
              <div className="figmaGroupCompleteBanner">
                <div><strong>Fase de grupos e chaves finalizadas</strong><span>Todos os resultados desta fase foram registrados no ranking.</span></div>
                <button type="button" onClick={() => setActiveTournamentTab("ranking")}><Trophy aria-hidden="true" /> Ver classificação</button>
              </div>
            )}

            {cupGroupRankings.length > 0 ? (
              <div className="groupsPreviewBox figmaGroupCards">
                <CupGroupRankingView groupRankings={cupGroupRankings} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} className="figmaCupGroupGrid" />
                {isCopinhaData(data) && (
                  <CopinhaTieBreakPanel groupRankings={cupGroupRankings} onResolveTie={resolveCopinhaTie} groupCampaignTies={copinhaGroupCampaignTies} onResolveGroupTie={resolveCopinhaGroupTie} />
                )}
              </div>
            ) : (
              <div className="figmaTournamentEmpty"><Grid3X3 aria-hidden="true" /><strong>Os grupos ainda não foram sorteados</strong><span>Configure a quantidade de grupos e use o sorteio acima.</span></div>
            )}
          </section>
        )}

        <section className="card figmaTournamentSection figmaMatchesSection" style={{ display: activeTournamentTab === "partidas" ? undefined : "none" }}>
          {isCupType(config) && (
            <div className="figmaMatchesWorkbenchNav">
              <div className="matchesSubTabs">
                <button type="button" className={activeMatchesTab === "grupos" ? "active" : ""} onClick={() => setActiveMatchesTab("grupos")}>Fase de grupos</button>
                <button type="button" className={activeMatchesTab === "chaves" ? "active" : ""} onClick={() => setActiveMatchesTab("chaves")}>Chave principal</button>
                <button type="button" className={activeMatchesTab === "paralela" ? "active" : ""} onClick={() => setActiveMatchesTab("paralela")}>Repescagem</button>
              </div>
              <div className="figmaMatchToolbarActions">
                <SavingStatusBadge />
                <button type="button" className="secondaryBtn"><Target aria-hidden="true" /> Central de chamadas</button>
              </div>
            </div>
          )}
          {!isCupType(config) && <div className="cardTitleRow figmaTournamentSectionHeading"><div><h2>Partidas</h2><p>Rodadas organizadas com até dois jogos por linha.</p></div><SavingStatusBadge /></div>}
          <div className="figmaGroupScheduleMode" style={{ display: !isCupType(config) || activeMatchesTab === "grupos" ? undefined : "none" }}>

          {!data.schedule || data.schedule.length === 0 ? (
            <p>{isCupType(config) ? "Sorteie os grupos para gerar automaticamente as partidas." : "Clique em “Criar rodadas e jogos” para montar os jogos."}</p>
          ) : (
            <>
             <ScheduleView
 schedule={data.schedule}
  updateScore={updateScore}
  updateGameDetails={updateGameDetails}
  showGroupName={isCupType(config)}
  voiceRepeat={voiceRepeat}
  setVoiceRepeat={setVoiceRepeat}
  winningScore={getWinningScore(data)}
  tournamentType={tournament.type}
  players={data.players}
  participantMeta={data.participantMeta}
/>

              <div className="actions">
                <button
                  type="button"
                  className="deleteBtn"
                  onClick={() => setClearScoresOpen(true)}
                >
                  Apagar somente os placares
                </button>

                <button
                  type="button"
                  className="deleteBtn"
                  onClick={() => setClearTableOpen(true)}
                >
                  Apagar todos os jogos e placares
                </button>
              </div>
            </>
          )}
          </div>
        </section>

        {isCupType(config) ? (
          <>
            <section className="card" style={{ display: "none" }}>
              <h2>Classificação dos grupos</h2>

              <CupGroupRankingView
                groupRankings={cupGroupRankings}
                rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
              />

              <div className="actions">
                <button type="button" onClick={generateBrackets}>
                  Gerar chaves finais
                </button>
              </div>
            </section>

            <section className="card figmaTournamentSection figmaBracketSection" style={{ display: activeTournamentTab === "partidas" && activeMatchesTab === "chaves" ? undefined : "none" }}>
              <div className="cardTitleRow figmaBracketHeading">
                <div><h2><Trophy aria-hidden="true" /> Chave principal</h2><p>Classificados da fase de grupos e progressão até a final.</p></div>
                <div className="figmaBracketActions"><SavingStatusBadge /><button type="button" className="secondaryBtn">Todas as fases</button><button type="button" className="secondaryBtn">Tela cheia</button><button type="button" className="secondaryBtn" onClick={shareTournamentRanking}><Share2 aria-hidden="true" /> Compartilhar chave</button></div>
              </div>

              {!currentBrackets ? (
                <>
                  <p>
                    Após preencher todos os placares da fase de grupos, clique em
                    “Gerar chaves finais”.
                  </p>

                  <div className="actions">
                    <button type="button" onClick={generateBrackets}>
                      Gerar chaves finais
                    </button>
                  </div>
                </>
              ) : (
            <>
  <CupBracketView
    groupedBrackets={{ main: currentBrackets.main, repechage: [] }}
    data={data}
    updateBracketScore={updateBracketScore}
    voiceRepeat={voiceRepeat}
    setVoiceRepeat={setVoiceRepeat}
    winningScore={getWinningScore(data)}
  />

</>
              )}
            </section>

            <section className="card figmaTournamentSection figmaRankingSection" style={{ display: activeTournamentTab === "ranking" ? undefined : "none" }}>
              <div className="cardTitleRow figmaTournamentSectionHeading figmaRankingHeading">
                <div><h2>Classificação Oficial</h2><p>Acompanhe a classificação, confira os critérios e confirme o resultado final.</p></div>
                <div className="rankingManagementActions">
                  <SavingStatusBadge />
                  <button type="button" className="secondaryBtn" onClick={shareTournamentRanking}><Share2 aria-hidden="true" /> Compartilhar ranking</button>
                  <button type="button" onClick={confirmRankingFinal} disabled={Boolean(data.rankingConfirmedAt)}>{data.rankingConfirmedAt ? "Ranking confirmado" : "Confirmar ranking final"}</button>
                </div>
              </div>

              <div className="figmaInnerTabs figmaRankingTabs" role="tablist" aria-label="Visualizações do ranking">
                <button type="button" className={rankingView === "general" ? "active" : ""} onClick={() => setRankingView("general")}>Classificação geral</button>
                <button type="button" className={rankingView === "groups" ? "active" : ""} onClick={() => setRankingView("groups")}>Classificação por grupos</button>
                <button type="button" className={rankingView === "final" ? "active" : ""} onClick={() => setRankingView("final")}>Ranking final</button>
                <button type="button" className={rankingView === "podium" ? "active" : ""} onClick={() => setRankingView("podium")}>Pódio</button>
              </div>

              <div className="figmaRankingStats">
                <div><span>Participantes</span><strong>{participantSummary.total} <small>duplas</small></strong></div>
                <div><span>Partidas realizadas</span><strong>{completedTournamentMatches}</strong></div>
                <div><span>Resultados pendentes</span><strong>{Math.max(0, totalTournamentMatches - completedTournamentMatches)}</strong></div>
                <div className={data.rankingConfirmedAt ? "complete" : "updating"}><span>Situação do ranking</span><strong>{data.rankingConfirmedAt ? "CONFIRMADO" : "EM ATUALIZAÇÃO"}</strong></div>
              </div>

              <div className="figmaRankingCriteriaBand">
                <div><span>CRITÉRIO DE DESEMPATE ATIVO</span><div>{getRankingCriteria(data.rankingCriteria || defaultRankingCriteria).order.map((key, index) => <React.Fragment key={key}><strong>{index + 1}. {getRankingColumnLabel(key)}</strong>{index < getRankingCriteria(data.rankingCriteria || defaultRankingCriteria).order.length - 1 ? <b>›</b> : null}</React.Fragment>)}</div></div>
                <button type="button" onClick={() => setGroupsConfigOpen(true)}>Entender regras de empate</button>
              </div>

              {rankingView === "general" && (
                <>
                  <FigmaRankingLeaders ranking={ranking} />
                  <div className="figmaRankingTableToolbar"><label><Search aria-hidden="true" /><input value={rankingSearch} onChange={(event) => setRankingSearch(event.target.value)} placeholder="Buscar participante..." /></label><span>Ranking Geral <ChevronDown aria-hidden="true" /></span></div>
                  <RankingView
                    ranking={ranking.map((row, index) => ({ ...row, figmaRankPosition: index + 1 })).filter((row) => !rankingSearch.trim() || row.name.toLocaleLowerCase("pt-BR").includes(rankingSearch.trim().toLocaleLowerCase("pt-BR")))}
                    type={tournament.type}
                    rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
                    figma
                    rankingFinalized={Boolean(data.rankingConfirmedAt)}
                  />
                </>
              )}

              {rankingView === "groups" && <CupGroupRankingView groupRankings={cupGroupRankings} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} className="figmaCupGroupGrid" />}

              {(rankingView === "final" || rankingView === "podium") && (
                <div className="cupRankingSplit figmaFinalPodiums">
                  <div className="cupRankingPanel"><h3>{data.cupConfig?.mainBracketName || "Chave Principal"}</h3>{mainCupPodium.length > 0 ? <CupPodiumView podium={mainCupPodium} title={data.cupConfig?.mainBracketName || "Principal"} /> : <p>Finalize a chave principal para ver o pódio.</p>}</div>
                  <div className="cupRankingPanel"><h3>{data.cupConfig?.repechageName || "Repescagem"}</h3>{consolationCupPodium.length > 0 ? <CupPodiumView podium={consolationCupPodium} title={data.cupConfig?.repechageName || "Consolação"} variant="parallel" /> : parallelRanking.length > 0 ? <CupPodiumView podium={parallelRanking.slice(0, 3).map((item, index) => ({ position: index === 0 ? "🏆 Campeão" : index === 1 ? "🥈 Vice" : "🥉 3º lugar", name: item.name }))} title={data.cupConfig?.repechageName || "Repescagem"} variant="parallel" /> : <p>Finalize a repescagem para ver o pódio.</p>}</div>
                </div>
              )}
            </section>

            <section className="card figmaTournamentSection figmaBracketSection" style={{ display: activeTournamentTab === "partidas" && activeMatchesTab === "paralela" ? undefined : "none" }}>
              <div className="cardTitleRow figmaBracketHeading">
                <h2>{data.cupConfig?.repechageName || "Repescagem"}</h2>
                <SavingStatusBadge />
              </div>
              {!currentBrackets ? (
                <>
                  <p>Gere as chaves finais para visualizar a disputa paralela.</p>

                  <div className="actions">
                    <button type="button" onClick={generateBrackets}>
                      Gerar chaves finais
                    </button>
                  </div>
                </>
              ) : currentBrackets.repechage?.length > 0 ? (
                <CupBracketView groupedBrackets={{ main: [], repechage: currentBrackets.repechage }} data={data} updateBracketScore={updateBracketScore} voiceRepeat={voiceRepeat} setVoiceRepeat={setVoiceRepeat} winningScore={getWinningScore(data)} />
              ) : (
                <p>Com 2 grupos, a Copinha segue o modelo da planilha e não possui chave de consolação.</p>
              )}
            </section>
          </>
        ) : (
          <section className="card figmaTournamentSection figmaRankingSection" style={{ display: activeTournamentTab === "ranking" ? undefined : "none" }}>
            <div className="cardTitleRow figmaTournamentSectionHeading figmaRankingHeading">
              <div><h2>Classificação Oficial</h2><p>Acompanhe a classificação, confira os critérios e confirme o resultado final.</p></div>
              <div className="rankingManagementActions"><SavingStatusBadge /><button type="button" className="secondaryBtn" onClick={shareTournamentRanking}><Share2 aria-hidden="true" /> Compartilhar ranking</button><button type="button" onClick={confirmRankingFinal} disabled={Boolean(data.rankingConfirmedAt)}>{data.rankingConfirmedAt ? "Ranking confirmado" : "Confirmar ranking final"}</button></div>
            </div>
            <div className="figmaInnerTabs figmaRankingTabs"><button type="button" className="active">Classificação geral</button><button type="button" disabled>Classificação por grupos</button><button type="button" disabled>Ranking final</button><button type="button" disabled>Pódio</button></div>
            <div className="figmaRankingStats"><div><span>Participantes</span><strong>{participantSummary.total}</strong></div><div><span>Partidas realizadas</span><strong>{completedTournamentMatches}</strong></div><div><span>Resultados pendentes</span><strong>{Math.max(0, totalTournamentMatches - completedTournamentMatches)}</strong></div><div className={data.rankingConfirmedAt ? "complete" : "updating"}><span>Situação do ranking</span><strong>{data.rankingConfirmedAt ? "CONFIRMADO" : "EM ATUALIZAÇÃO"}</strong></div></div>
            <div className="figmaRankingCriteriaBand"><div><span>CRITÉRIO DE DESEMPATE ATIVO</span><div>{getRankingCriteria(data.rankingCriteria || defaultRankingCriteria).order.map((key, index) => <React.Fragment key={key}><strong>{index + 1}. {getRankingColumnLabel(key)}</strong>{index < getRankingCriteria(data.rankingCriteria || defaultRankingCriteria).order.length - 1 ? <b>›</b> : null}</React.Fragment>)}</div></div></div>
            <FigmaRankingLeaders ranking={ranking} />
            <div className="figmaRankingTableToolbar"><label><Search aria-hidden="true" /><input value={rankingSearch} onChange={(event) => setRankingSearch(event.target.value)} placeholder="Buscar participante..." /></label><span>Ranking Geral <ChevronDown aria-hidden="true" /></span></div>
            <RankingView
              ranking={ranking.map((row, index) => ({ ...row, figmaRankPosition: index + 1 })).filter((row) => !rankingSearch.trim() || row.name.toLocaleLowerCase("pt-BR").includes(rankingSearch.trim().toLocaleLowerCase("pt-BR")))}
              type={tournament.type}
              rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
              figma
              rankingFinalized={Boolean(data.rankingConfirmedAt)}
            />
          </section>
        )}
      </div>
    </>
  );
}

function CupConfigPanel({ data, config, updateCupConfig, showInfo = true }) {
  const cupConfig = data.cupConfig || {};
  const isFixedCupSize = config.type === "cup18" || config.type === "cup21";
  const isCup18 = config.type === "cup18";
  const isCup21 = config.type === "cup21";
  const isCopinha = config.type === "copinha";

  return (
    <div className="cupConfigBox">
      <div className="twoCols">
        <div>
          <label>Quantidade de grupos e duplas</label>
          <select
            value={cupConfig.teamCount || config.defaultTeams}
            onChange={(e) => updateCupConfig("teamCount", Number(e.target.value))}
            disabled={isFixedCupSize}
          >
            {config.allowedTeamCounts.map((count) => (
              <option key={count} value={count}>{formatCupGroupOption(config, count)}</option>
            ))}
          </select>
          <small>Quantidade de duplas: {cupConfig.teamCount || config.defaultTeams}. Cada grupo terá {config.groupSize || 3} duplas.</small>
        </div>

        <div>
          <label>Nome da chave principal</label>
          <input
            value={cupConfig.mainBracketName || config.defaultMainBracketName}
            onChange={(e) => updateCupConfig("mainBracketName", e.target.value)}
            placeholder="Principal"
          />
        </div>

        <div>
          <label>{isCopinha ? "Nome da consolação" : isCup18 || isCup21 ? "Nome da disputa paralela" : "Nome da repescagem"}</label>
          <input
            value={cupConfig.repechageName || config.defaultRepechageName}
            onChange={(e) => updateCupConfig("repechageName", e.target.value)}
            placeholder={isCopinha ? "Consolação" : isCup18 || isCup21 ? "Disputa Paralela" : "Repescagem"}
          />
        </div>
      </div>

      {showInfo && (
        <div className="infoBox">
          {isCup18 ? (
          <>
            <p><strong>Formato:</strong> 18 duplas divididas em 6 grupos de 3.</p>
            <p><strong>Fase de grupos:</strong> cada dupla joga 2 partidas.</p>
            <p><strong>Classificação:</strong> 1º e 2º de cada grupo avançam. Os 2 melhores terceiros também entram na chave principal.</p>
            <p><strong>Chave principal:</strong> 14 duplas, com os 2 melhores gerais entrando direto nas quartas.</p>
            <p><strong>Disputa paralela:</strong> os 4 terceiros restantes jogam todos contra todos.</p>
          </>
        ) : isCup21 ? (
          <>
            <p><strong>Formato:</strong> 21 duplas divididas em 7 grupos de 3.</p>
            <p><strong>Fase de grupos:</strong> cada dupla joga 2 partidas.</p>
            <p><strong>Chave principal:</strong> passam 1º e 2º de cada grupo. As 2 melhores campanhas recebem BYE para as quartas.</p>
            <p><strong>Disputa paralela:</strong> os 7 terceiros colocados entram; o melhor terceiro recebe BYE para a semifinal.</p>
          </>
        ) : isCopinha ? (
          <>
            <p><strong>Formato:</strong> escolha de 6 a 36 duplas, sempre em grupos de 3.</p>
            <p><strong>Fase de grupos:</strong> cada dupla joga duas partidas.</p>
            <p><strong>Classificação:</strong> vitórias, saldo de games, confronto direto e, se ainda necessário, sorteio registrado pelo organizador.</p>
            <p><strong>Chaves:</strong> 1º e 2º de cada grupo entram na chave principal; a partir de 3 grupos, os 3º colocados seguem para a consolação.</p>
          </>
        ) : (
          <>
            <p><strong>Formato:</strong> grupos de 3 duplas.</p>
            <p><strong>Fase de grupos:</strong> cada dupla joga 2 partidas.</p>
            <p><strong>Classificação:</strong> 1º e 2º de cada grupo avançam para a chave principal. O 3º vai para a repescagem.</p>
          </>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerInputs({ type, data, updatePlayer, updateParticipantMeta, onLinkAthlete = () => {}, searchQuery = "", statusFilter = "all" }) {
  const config = getModalityConfig(type);
  const searchTerm = searchQuery.trim().toLocaleLowerCase("pt-BR");

  function getMeta(kind, index) {
    const metaKind = kind === "team" ? "teams" : kind;
    const meta = {
      payment: "pending",
      registration: "pending",
      profileLinked: false,
      ...(data.participantMeta?.[metaKind]?.[index] || {}),
    };

    return kind === "team"
      ? normalizeParticipantMetaList([meta], 1, { athleteCount: 2 })[0]
      : meta;
  }

  function matchesParticipant(name, meta) {
    const matchesSearch = !searchTerm || String(name || "").toLocaleLowerCase("pt-BR").includes(searchTerm);
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "confirmed" && meta.registration === "confirmed")
      || (statusFilter === "pending" && meta.registration !== "confirmed");
    return matchesSearch && matchesStatus;
  }

  let entries = [];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    entries = [
      ...data.players.men.map((name, index) => ({ key: `men-${index}`, path: { kind: "men", index }, names: [name], meta: getMeta("men", index) })),
      ...data.players.women.map((name, index) => ({ key: `women-${index}`, path: { kind: "women", index }, names: [name], meta: getMeta("women", index) })),
    ];
  } else if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    entries = data.players.teams.map((team, index) => ({ key: `team-${index}`, path: { kind: "team", index }, names: [team.a, team.b], meta: getMeta("team", index) }));
  } else {
    entries = data.players.map((name, index) => ({ key: `normal-${index}`, path: { kind: "normal", index }, names: [name], meta: getMeta("normal", index) }));
  }

  entries = entries.filter((entry) => matchesParticipant(entry.names.join(" "), entry.meta));

  if (entries.length === 0) {
    return <div className="participantEmptyState"><Search aria-hidden="true" /><strong>Nenhum participante encontrado</strong><span>Ajuste a busca ou o filtro selecionado.</span></div>;
  }

  const registrationLabel = { pending: "Pendente", confirmed: "Confirmado" };

  return (
    <div className="figmaParticipantTable participantManagementList">
      <div className="figmaParticipantTableHead" aria-hidden="true">
        <span>PARTICIPANTE / DUPLA</span>
        <span>STATUS</span>
      </div>
      {entries.map((entry, rowIndex) => {
        const registration = entry.meta.registration === "confirmed" ? "confirmed" : "pending";

        return (
        <div className="figmaParticipantRow participantSlotCard" key={entry.key}>
          <div className="figmaParticipantIdentity">
            <div className="figmaParticipantNames">
              {entry.names.map((name, nameIndex) => {
                const athleteMeta = entry.path.kind === "team"
                  ? normalizeAthleteProfileMeta(entry.meta.athletes?.[nameIndex])
                  : normalizeAthleteProfileMeta(entry.meta);
                const canOpenProfile = Boolean(athleteMeta.profileLinked && athleteMeta.athleteProfileId && athleteMeta.publicConsent);
                const visiblePhoto = canOpenProfile ? athleteMeta.photoUrl : "";
                const publicProfileUrl = canOpenProfile
                  ? `${window.location.origin}${window.location.pathname}?atleta=${encodeURIComponent(athleteMeta.profileSlug || athleteMeta.athleteProfileId)}`
                  : "";

                return (
                  <div className="figmaParticipantAthlete" key={`${entry.key}-${nameIndex}`}>
                    {canOpenProfile ? (
                      <button
                        type="button"
                        className="figmaParticipantAvatar figmaParticipantAvatarLink"
                        onClick={() => window.open(publicProfileUrl, "_blank", "noopener,noreferrer")}
                        title={`Abrir perfil de ${athleteMeta.displayName || name}`}
                      >
                        {visiblePhoto ? <img src={visiblePhoto} alt="" /> : getAthleteInitials(athleteMeta.displayName || name)}
                      </button>
                    ) : (
                      <span className="figmaParticipantAvatar">
                        {getAthleteInitials(name) || rowIndex + 1}
                      </span>
                    )}
                    <div className="figmaParticipantAthleteFields">
                      <label className="figmaParticipantNameRow">
                        <span>{entry.names.length > 1 ? `Atleta ${nameIndex + 1}` : "Atleta"}</span>
                        <input
                          value={name}
                          aria-label={entry.names.length > 1 ? `Atleta ${nameIndex + 1} da dupla ${rowIndex + 1}` : `Participante ${rowIndex + 1}`}
                          onChange={(event) => updatePlayer(entry.path.kind === "team" ? { ...entry.path, field: nameIndex === 0 ? "a" : "b" } : entry.path, event.target.value)}
                        />
                      </label>
                      <div className="figmaParticipantProfileActions">
                        <button
                          type="button"
                          className={athleteMeta.profileLinked ? "linked" : ""}
                          onClick={() => onLinkAthlete(entry.path, nameIndex, name, athleteMeta)}
                        >
                          <Link2 aria-hidden="true" /> {athleteMeta.profileLinked ? "Alterar vínculo" : "Vincular perfil"}
                        </button>
                        {canOpenProfile ? <a href={publicProfileUrl} target="_blank" rel="noreferrer">Ver perfil</a> : null}
                        {athleteMeta.profileLinked && !athleteMeta.publicConsent ? <small>Vinculado em modo privado</small> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <label className={`figmaInlineStatus registration-${registration}`}>
            <span className="srOnly">Status da inscrição</span>
            <select value={registration} onChange={(event) => updateParticipantMeta(entry.path, "registration", event.target.value)} aria-label={`Status de ${entry.names.join(" e ")}`}>
              <option value="pending">{registrationLabel.pending}</option>
              <option value="confirmed">{registrationLabel.confirmed}</option>
            </select>
          </label>
        </div>
        );
      })}
    </div>
  );
}

function buildFromPairTemplate(template, players) {
  return template.map((round) =>
    round.map((game, index) => {
      const [a, b] = game[0];
      const [c, d] = game[1];

      return {
        court: index + 1,
        team1: [players[a - 1], players[b - 1]],
        ids1: [a - 1, b - 1],
        team2: [players[c - 1], players[d - 1]],
        ids2: [c - 1, d - 1],
        s1: "",
        s2: "",
      };
    })
  );
}

function buildFromMixedTemplate(template, players) {
  const men = players.men;
  const women = players.women;
  const menCount = men.length;

  function getName(num) {
    if (num <= menCount) return men[num - 1];
    return women[num - menCount - 1];
  }

  function getId(num) {
    return num - 1;
  }

  return template.map((round) =>
    round.map((game, index) => {
      const [a, b, c, d] = game;

      return {
        court: index + 1,
        team1: [getName(a), getName(b)],
        ids1: [getId(a), getId(b)],
        team2: [getName(c), getName(d)],
        ids2: [getId(c), getId(d)],
        s1: "",
        s2: "",
      };
    })
  );
}

function generateSchedule(type, players) {
  const config = getModalityConfig(type);

  if (config.type === "super8") {
    return optimizeCourts(buildFromPairTemplate(super8Template, players));
  }

  if (config.type === "mixed10") {
    return optimizeCourts(buildFromMixedTemplate(super10MixedTemplate, players));
  }

  if (config.type === "mixed12") {
    return optimizeCourts(buildFromMixedTemplate(super12MixedTemplate, players));
  }

  if (config.type === "mixed16") {
    return optimizeCourts(buildFromMixedTemplate(super16MixedTemplate, players));
  }

  if (config.type === "fixed12") {
    const teamNames = players.teams.map((t) => `${t.a} + ${t.b}`);

    const schedule = fixed12Template.map((round) =>
      round.map((game, index) => ({
        court: index + 1,
        team1: [teamNames[game[0] - 1]],
        ids1: [game[0] - 1],
        team2: [teamNames[game[1] - 1]],
        ids2: [game[1] - 1],
        s1: "",
        s2: "",
      }))
    );

    return optimizeCourts(schedule);
  }

  if (config.type === "fixed16") {
    const teamNames = players.teams.map((t) => `${t.a} + ${t.b}`);

    const schedule = berger(8).map((round) =>
      round.map((game, index) => ({
        court: index + 1,
        team1: [teamNames[game[0]]],
        ids1: [game[0]],
        team2: [teamNames[game[1]]],
        ids2: [game[1]],
        s1: "",
        s2: "",
      }))
    );

    return optimizeCourts(schedule);
  }

  if (config.type === "simple8") {
    const schedule = berger(8).map((round) =>
      round.map((game, index) => ({
        court: index + 1,
        team1: [players[game[0]]],
        ids1: [game[0]],
        team2: [players[game[1]]],
        ids2: [game[1]],
        s1: "",
        s2: "",
      }))
    );

    return optimizeCourts(schedule);
  }

  return [];
}

function VoiceRepeatSelector({ voiceRepeat, setVoiceRepeat }) {
  return (
    <div className="voiceRepeatBox">
      <span>🔊 Chamada de Jogos</span>

      <select
        value={voiceRepeat}
        onChange={(e) => setVoiceRepeat(Number(e.target.value))}
      >
        <option value={1}>Apenas 1 vez</option>
        <option value={2}>2 vezes</option>
      </select>
    </div>
  );
}

function getAthleteInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function getScheduleAthleteNames(team) {
  const names = Array.isArray(team) ? team : [];
  return names
    .flatMap((name) => String(name || "").split(/\s+\+\s+/))
    .map((name) => name.trim())
    .filter(Boolean);
}

function buildScheduleProfileLookup(tournamentType, players, participantMeta) {
  const lookup = new Map();
  const config = getModalityConfig(tournamentType);
  const metadata = participantMeta || {};
  const register = (name, meta = {}) => {
    if (name) lookup.set(String(name).trim(), meta || {});
  };

  if (!config || !players) return lookup;

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    (players.men || []).forEach((name, index) => register(name, metadata.men?.[index]));
    (players.women || []).forEach((name, index) => register(name, metadata.women?.[index]));
  } else if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    (players.teams || []).forEach((team, index) => {
      const teamMeta = metadata.teams?.[index] || {};
      const athleteProfiles = Array.isArray(teamMeta.athletes) ? teamMeta.athletes : [];
      register(team?.a, athleteProfiles[0] || teamMeta);
      register(team?.b, athleteProfiles[1] || teamMeta);
    });
  } else {
    (players || []).forEach((name, index) => register(name, metadata.normal?.[index]));
  }

  return lookup;
}

function MatchAthlete({ name, profile = {}, outcome = "" }) {
  const photoUrl = profile.photoUrl || profile.photo_url || profile.avatarUrl || profile.avatar_url || "";

  return (
    <div className={`matchAthlete ${outcome ? `matchAthlete-${outcome}` : ""}`}>
      <span className="matchOutcomeDot" aria-hidden="true" />
      <span className="matchAthleteAvatar" aria-hidden="true">
        {photoUrl ? <img src={photoUrl} alt="" /> : getAthleteInitials(name)}
      </span>
      <strong>{name}</strong>
    </div>
  );
}

function ScheduleView({
  schedule,
  updateScore = () => {},
  updateGameDetails = () => {},
  showGroupName = false,
  voiceRepeat = 1,
  setVoiceRepeat = () => {},
  winningScore = 4,
  readOnly = false,
  tournamentType = "",
  players = null,
  participantMeta = null,
}) {
  const profileLookup = buildScheduleProfileLookup(tournamentType, players, participantMeta);

  return (
    <div className={`schedule ${readOnly ? "readOnlySchedule publicSchedule" : ""}`}>
      {!readOnly ? (
        <VoiceRepeatSelector
          voiceRepeat={voiceRepeat}
          setVoiceRepeat={setVoiceRepeat}
        />
      ) : null}

      {schedule.map((round, roundIndex) => (
        <section className={`roundCard ${readOnly ? "readOnlyRoundCard publicReadOnlyRound" : ""}`} key={roundIndex}>
          <div className="roundHeader">
            <div className={`roundTitleBlock ${showGroupName ? "cupRoundTitle" : "standardRoundTitle"}`}>
              {showGroupName ? <span>FASE DE GRUPOS</span> : null}
              <h3>Rodada {roundIndex + 1}</h3>
            </div>

            {!readOnly ? (
              <div className="voiceActions">
                <button
                  type="button"
                  className="voiceBtn"
                  onClick={() =>
                    speakRound(round, roundIndex, {
                      includeGroup: showGroupName,
                      repeat: voiceRepeat,
                    })
                  }
                >
                  Chamar rodada
                </button>

                <button
                  type="button"
                  className="secondaryBtn stopBtn"
                  onClick={stopSpeech}
                >
                  ⏹️ Parar
                </button>
              </div>
            ) : null}
          </div>

          <div className="roundGamesGrid">
          {round.map((game, gameIndex) => {
            const winnerSide = getScoreWinnerSide(game, winningScore);
            const isFinished = winnerSide !== null;
            const hasPublicScore = readOnly && game.s1 !== "" && game.s1 != null && game.s2 !== "" && game.s2 != null;
            const team1Names = getScheduleAthleteNames(game.team1);
            const team2Names = getScheduleAthleteNames(game.team2);

            return (
            <div className={`gameCard ${isFinished ? "gameFinished" : "gameWaiting"} ${readOnly ? "publicReadOnlyGame" : ""}`} key={gameIndex}>
              <div className={`gameTopLine ${readOnly ? "publicGameTopLine" : ""}`}>
                <div className="gameContextLabels">
                  {showGroupName && game.groupName ? <span className="gameGroupLabel">{game.groupName}</span> : null}
                  {readOnly ? (
                    <span className="gameCourtLabel">Quadra {game.court}</span>
                  ) : (
                    <label className="gameCourtEditor">
                      <span>Quadra</span>
                      <input type="number" min="1" value={game.court || 1} onChange={(event) => updateGameDetails(roundIndex, gameIndex, "court", event.target.value)} aria-label={`Quadra do jogo ${gameIndex + 1} da rodada ${roundIndex + 1}`} />
                    </label>
                  )}
                </div>
                <div className="gameTopStatus">
                  {readOnly && game.scheduledTime ? <span className="gameScheduledTime"><Clock3 aria-hidden="true" /> {game.scheduledTime}</span> : null}
                  <span className={`matchStatusBadge ${isFinished ? "finished" : "inProgress"}`}>
                    {isFinished ? "Finalizado" : "Em andamento"}
                  </span>
                </div>
              </div>

              <div className={`gameTeams ${readOnly ? "publicGameTeams" : "gameTeamsWithInlineScores"}`}>
                <div className={`gameTeamPanel ${winnerSide === "team1" ? "winnerTeam" : winnerSide === "team2" ? "loserTeam" : ""}`}>
                  {readOnly ? (
                    team1Names.map((name, athleteIndex) => <MatchAthlete key={`${name}-${athleteIndex}`} name={name} profile={profileLookup.get(name)} outcome={winnerSide === "team1" ? "winner" : winnerSide === "team2" ? "loser" : ""} />)
                  ) : (
                    <>
                      <div className="gameTeamRoster">
                        {team1Names.map((name, athleteIndex) => <MatchAthlete key={`${name}-${athleteIndex}`} name={name} profile={profileLookup.get(name)} outcome={winnerSide === "team1" ? "winner" : winnerSide === "team2" ? "loser" : ""} />)}
                      </div>
                      <label className="inlineTeamScore">
                        <span className="srOnly">Placar de {team1Names.join(" e ")}</span>
                        <input
                          type="number"
                          min="0"
                          max={getMaxScore(winningScore)}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={game.s1}
                          onChange={(event) => updateScore(roundIndex, gameIndex, "s1", event.target.value)}
                        />
                      </label>
                    </>
                  )}
                </div>
                <span>VS</span>
                <div className={`gameTeamPanel ${winnerSide === "team2" ? "winnerTeam" : winnerSide === "team1" ? "loserTeam" : ""}`}>
                  {readOnly ? (
                    team2Names.map((name, athleteIndex) => <MatchAthlete key={`${name}-${athleteIndex}`} name={name} profile={profileLookup.get(name)} outcome={winnerSide === "team2" ? "winner" : winnerSide === "team1" ? "loser" : ""} />)
                  ) : (
                    <>
                      <div className="gameTeamRoster">
                        {team2Names.map((name, athleteIndex) => <MatchAthlete key={`${name}-${athleteIndex}`} name={name} profile={profileLookup.get(name)} outcome={winnerSide === "team2" ? "winner" : winnerSide === "team1" ? "loser" : ""} />)}
                      </div>
                      <label className="inlineTeamScore">
                        <span className="srOnly">Placar de {team2Names.join(" e ")}</span>
                        <input
                          type="number"
                          min="0"
                          max={getMaxScore(winningScore)}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={game.s2}
                          onChange={(event) => updateScore(roundIndex, gameIndex, "s2", event.target.value)}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {readOnly ? (
                <div
                  className="scoreRow publicReadOnlyScoreRow"
                  aria-label={hasPublicScore ? `Placar: ${game.s1} a ${game.s2}` : "Placar ainda não informado"}
                >
                  {hasPublicScore ? (
                    <>
                      <output className="publicScoreValue">{game.s1}</output>
                      <span aria-hidden="true">—</span>
                      <output className="publicScoreValue">{game.s2}</output>
                    </>
                  ) : (
                    <span className="publicScorePending">Aguardando placar</span>
                  )}
                </div>
              ) : null}

              {!readOnly && !isFinished ? (
                <div className="voiceActions gameVoiceActions">
                  <button type="button" className="voiceBtn" onClick={() => speakGame(game, { roundLabel: `Rodada ${roundIndex + 1}`, includeGroup: showGroupName, repeat: voiceRepeat })}>🔊 Chamar jogo</button>
                </div>
              ) : null}
            </div>
            );
          })}
          </div>
        </section>
      ))}
    </div>
  );
}

function calculateRanking(data, type, rankingCriteriaValue = defaultRankingCriteria) {
  const config = getModalityConfig(type);
  const winningScore = getWinningScore(data);

  if (!data.players) return [];

  if (isCupType(config)) {
    const qualified = getCupQualified(data);
    return [...qualified.main, ...qualified.repechage];
  }

  let names = [];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    names = [...data.players.men, ...data.players.women];
  } else if (config.type === "fixed12" || config.type === "fixed16") {
    names = data.players.teams.map((t) => `${t.a} + ${t.b}`);
  } else {
    names = data.players;
  }

  const table = names.map((name, id) => ({
    id,
    name,
    pts: 0,
    w: 0,
    bal: 0,
    played: 0,
  }));

  (data.schedule || []).flat().forEach((game) => {
    const s1 = Number(game.s1);
    const s2 = Number(game.s2);

    if (game.s1 === "" || game.s2 === "" || Number.isNaN(s1) || Number.isNaN(s2)) return;

   const winnerSide = getScoreWinnerSide(game, winningScore);
if (!winnerSide) return;

const win1 = winnerSide === "team1";
const win2 = winnerSide === "team2";

    game.ids1.forEach((id) => {
      table[id].pts += s1;
      table[id].bal += s1 - s2;
      table[id].played += 1;
      if (win1) table[id].w += 1;
    });

    game.ids2.forEach((id) => {
      table[id].pts += s2;
      table[id].bal += s2 - s1;
      table[id].played += 1;
      if (win2) table[id].w += 1;
    });
  });

  const criteria = getRankingCriteria(rankingCriteriaValue);

  return table.sort((a, b) => {
    for (const key of criteria.order) {
      const diff = b[key] - a[key];
      if (diff !== 0) return diff;
    }

    return a.name.localeCompare(b.name);
  });
}

function podium(i) {
  if (i === 0) return "🏆";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return i + 1;
}

function FigmaRankingLeaders({ ranking }) {
  const podiumEntries = [
    { row: ranking[1], position: 2, className: "second" },
    { row: ranking[0], position: 1, className: "champion" },
    { row: ranking[2], position: 3, className: "third" },
  ].filter((entry) => entry.row);

  return (
    <div className="figmaRankingLeaders">
      <h3>Líderes atuais</h3>
      {podiumEntries.length ? (
        <div>
          {podiumEntries.map(({ row, position, className }) => (
            <article className={className} key={row.id ?? row.name}>
              <span>{position === 1 ? <Trophy aria-hidden="true" /> : `${position}º`}</span>
              <strong>{row.name}</strong>
              <small>{row.pts ?? 0} pts • {row.w ?? 0} vitórias</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="figmaRankingEmpty">Os líderes aparecerão após os primeiros resultados.</p>
      )}
    </div>
  );
}

function RankingView({ ranking, type, rankingCriteria, figma = false, rankingFinalized = false }) {
  const config = getModalityConfig(type);

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    const menLimit = config.men;
    const men = ranking.filter((p) => p.id < menLimit);
    const women = ranking.filter((p) => p.id >= menLimit);

    return (
      <div className={`twoCols ${figma ? "figmaRankingSplitTables" : ""}`.trim()}>
        <RankingTable
          title="Ranking Masculino"
          rows={men}
          rankingCriteria={rankingCriteria}
          figma={figma}
          rankingFinalized={rankingFinalized}
        />
        <RankingTable
          title="Ranking Feminino"
          rows={women}
          rankingCriteria={rankingCriteria}
          figma={figma}
          rankingFinalized={rankingFinalized}
        />
      </div>
    );
  }

  return (
    <RankingTable
      title="Ranking Geral"
      rows={ranking}
      rankingCriteria={rankingCriteria}
      figma={figma}
      rankingFinalized={rankingFinalized}
    />
  );
}

function RankingTable({ title, rows, rankingCriteria, figma = false, rankingFinalized = false }) {
  const criteria = getRankingCriteria(rankingCriteria);
  const [expandedRowId, setExpandedRowId] = useState(null);

  if (figma) {
    return (
      <div className="figmaRankingTableShell">
        {title !== "Ranking Geral" ? <h3>{title}</h3> : null}
        <div className="figmaRankingTableScroll" tabIndex="0" aria-label={`Tabela ${title}; deslize horizontalmente para ver todas as colunas`}>
          <table className="figmaRankingTable">
            <thead>
              <tr>
                <th>POS</th>
                <th>DUPLA</th>
                <th>JOGOS</th>
                <th>VITÓRIAS</th>
                <th>PONTOS</th>
                <th>SALDO G.</th>
                <th>AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowId = row.id ?? row.name;
                const displayPosition = row.figmaRankPosition ?? index + 1;
                const initials = String(row.name || "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase();
                const isExpanded = expandedRowId === rowId;

                return (
                  <React.Fragment key={rowId}>
                    <tr className={index === 0 ? "leader" : ""}>
                      <td><span className={`figmaRankingPosition position-${Math.min(displayPosition, 4)}`}>{displayPosition}</span></td>
                      <td>
                        <div className="figmaRankingTeam">
                          <span className="figmaRankingAvatar" aria-hidden="true">{initials || <UserRound />}</span>
                          <span><strong>{row.name}</strong><small>{row.groupName || title}</small></span>
                        </div>
                      </td>
                      <td>{row.played ?? 0}</td>
                      <td><strong>{row.w ?? 0}</strong></td>
                      <td className="points">{row.pts ?? 0}</td>
                      <td>{Number(row.bal) > 0 ? `+${row.bal}` : row.bal ?? 0}</td>
                      <td><button type="button" className="figmaRankingDetailsButton" onClick={() => setExpandedRowId(isExpanded ? null : rowId)} aria-expanded={isExpanded}>Ver detalhes</button></td>
                    </tr>
                    {isExpanded ? (
                      <tr className="figmaRankingDetailsRow">
                        <td colSpan="7">
                          <div><strong>{row.name}</strong><span>{row.played ?? 0} jogos</span><span>{row.w ?? 0} vitórias</span><span>{row.pts ?? 0} pontos</span><span>Saldo {Number(row.bal) > 0 ? `+${row.bal}` : row.bal ?? 0}</span><small>Desempate: {criteria.label}</small></div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? <p className="figmaRankingEmpty">Nenhum participante corresponde à busca.</p> : null}
      </div>
    );
  }

  return (
    <div>
      <h3>{title}</h3>

      <p className="rankingScrollHint" aria-hidden="true">Deslize a tabela para ver todos os dados →</p>
      <div
        className="rankingTableScroll"
        tabIndex="0"
        aria-label={`Tabela ${title}; deslize horizontalmente para ver todas as colunas`}
      >
        <table className="rankingTable">
          <thead>
            <tr>
              <th className="rankingRankCell">#</th>
              <th className="rankingNameCell">Nome</th>
              {criteria.order.map((key) => (
                <th className="rankingStatCell" key={key}>{getRankingColumnLabel(key)}</th>
              ))}
              <th className="rankingStatCell">Jogos</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td className="rankingRankCell">{podium(i)}</td>
                <td className="rankingNameCell">{p.name}</td>
                {criteria.order.map((key) => (
                  <td className="rankingStatCell" key={key}>{p[key]}</td>
                ))}
                <td className="rankingStatCell">{p.played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CopinhaTieBreakPanel({
  groupRankings,
  onResolveTie,
  groupCampaignTies = [],
  onResolveGroupTie,
}) {
  const tiedGroups = (groupRankings || []).filter((group) => group.unresolvedTieIds?.length > 1);

  if (!tiedGroups.length && !groupCampaignTies.length) return null;

  return (
    <div className="infoBox">
      <p><strong>Desempate por sorteio necessário.</strong> Há três duplas empatadas após vitórias, saldo e confronto direto.</p>
      {tiedGroups.map((group) => {
        const tiedRows = group.rows.filter((row) => group.unresolvedTieIds.includes(row.id));

        return (
          <div className="actions" key={group.id}>
            <span>{group.name}: {tiedRows.map((row) => row.name).join(" · ")}</span>
            <button
              type="button"
              onClick={() => onResolveTie(group.id, group.unresolvedTieIds)}
            >
              Sortear ordem do grupo
            </button>
          </div>
        );
      })}

      {groupCampaignTies.map((tie) => {
        const groups = groupRankings.filter((group) => tie.groupIds.includes(group.id));

        return (
          <div className="actions" key={`campaign-${tie.tieKey}`}>
            <span>Melhor campanha empatada: {groups.map((group) => group.name).join(" · ")}</span>
            <button
              type="button"
              onClick={() => onResolveGroupTie?.(tie.tieKey, tie.groupIds)}
            >
              Sortear melhor grupo
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CupGroupRankingView({ groupRankings, rankingCriteria, className = "" }) {
  const effectiveCriteria = groupRankings?.[0]?.rankingMode === "copinha"
    ? "wins_balance_points"
    : rankingCriteria;

  if (className.includes("figmaCupGroupGrid")) {
    return (
      <div className="figmaCupGroupCards">
        {groupRankings.map((group, groupIndex) => {
          const completedRows = group.rows.filter((row) => row.played > 0).length;
          const status = completedRows === group.rows.length && group.rows.length > 0 ? "CONCLUÍDO" : completedRows > 0 ? "EM ANDAMENTO" : "PROGRAMADO";
          return (
            <article className="figmaCupGroupCard" key={group.id}>
              <header><span>{String(group.name || String.fromCharCode(65 + groupIndex)).replace(/^Grupo\s*/i, "")}</span><div><strong>{group.name}</strong><small>{group.rows.length} duplas</small></div><button type="button" aria-label={`Opções do ${group.name}`}><MoreVertical aria-hidden="true" /></button></header>
              <div className="figmaCupGroupTable">
                <div className="head"><span>#</span><span>DUPLA</span><span>PTS</span><span>V</span><span>SG</span></div>
                {group.rows.map((row, index) => <div className={index < 2 ? "qualified" : ""} key={row.id}><span>{index + 1}</span><strong>{row.name}</strong><b>{row.pts}</b><span>{row.w}</span><span>{row.bal > 0 ? `+${row.bal}` : row.bal}</span></div>)}
              </div>
              <footer><span className={`status ${status === "CONCLUÍDO" ? "complete" : status === "EM ANDAMENTO" ? "active" : ""}`}>{status}</span><button type="button">Ver partidas ›</button></footer>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`twoCols ${className}`.trim()}>
      {groupRankings.map((group) => (
        <RankingTable
          key={group.id}
          title={group.name}
          rows={group.rows}
          rankingCriteria={effectiveCriteria}
        />
      ))}
    </div>
  );
}

function groupStoredBracketGames(data) {
  const cupConfig = data.cupConfig || {};
  const mainName = cupConfig.mainBracketName || "Principal";
  const repechageName = cupConfig.repechageName || "Repescagem";

  const mainGames = (data.brackets || []).filter((game) => game.phase === "main");
  const repechageGames = (data.brackets || []).filter((game) => game.phase === "repechage");

  function groupByRound(games, bracketTitle) {
    const map = {};

    games.forEach((game) => {
      if (!map[game.roundName]) {
        map[game.roundName] = [];
      }

      map[game.roundName].push(resolveBracketGame(game, data.brackets || [], data));
    });

    return Object.entries(map).map(([title, gamesList]) => ({
      title,
      bracketTitle,
      games: gamesList,
    }));
  }

  return {
    main: groupByRound(mainGames, mainName),
    repechage: groupByRound(repechageGames, repechageName),
  };
}

function getSafeCupPresentation(data, config) {
  if (!isCupType(config) || !data?.brackets?.length) {
    return { currentBrackets: null, parallelRanking: [], mainCupPodium: [], consolationCupPodium: [] };
  }

  try {
    return {
      currentBrackets: groupStoredBracketGames(data),
      parallelRanking: calculateParallelRanking(data, data.rankingCriteria || defaultRankingCriteria),
      mainCupPodium: calculateMainCupPodium(data),
      consolationCupPodium: isCopinhaData(data) ? calculateCopinhaConsolationPodium(data) : [],
    };
  } catch (error) {
    console.error("Chaves salvas inválidas; exibindo a Copa sem as chaves", error);
    return { currentBrackets: null, parallelRanking: [], mainCupPodium: [], consolationCupPodium: [] };
  }
}

function CupBracketView({
  groupedBrackets,
  data,
  updateBracketScore,
  voiceRepeat = 1,
  setVoiceRepeat,
  winningScore = 4,
}) {
  return (
    <div className="figmaBracketBoard">
      <div className="figmaBracketUtilityBar">
        <div>
          <strong>Central de chamadas</strong>
          <span>Configure quantas vezes cada chamada deve ser repetida.</span>
        </div>

        <label className="figmaBracketRepeatSelect">
          <span>Repetir chamada</span>
          <select
            value={voiceRepeat}
            onChange={(event) => setVoiceRepeat(Number(event.target.value))}
          >
            <option value={1}>1 vez</option>
            <option value={2}>2 vezes</option>
          </select>
        </label>
      </div>

      <div className="cupBrackets figmaBracketCanvas">
        {groupedBrackets.main?.length > 0 && (
          <BracketColumn
            title={data.cupConfig?.mainBracketName || "Principal"}
            rounds={groupedBrackets.main}
            updateBracketScore={updateBracketScore}
            voiceRepeat={voiceRepeat}
            winningScore={winningScore}
          />
        )}

        {groupedBrackets.repechage?.length > 0 && (
          <BracketColumn
            title={data.cupConfig?.repechageName || "Repescagem"}
            rounds={groupedBrackets.repechage}
            updateBracketScore={updateBracketScore}
            voiceRepeat={voiceRepeat}
            winningScore={winningScore}
          />
        )}
      </div>
    </div>
  );
}

function BracketColumn({
  title,
  rounds,
  updateBracketScore,
  voiceRepeat = 1,
  winningScore = 4,
}) {
  const isRepechage = rounds?.[0]?.games?.[0]?.phase === "repechage";

  return (
    <div
      className={`bracketColumn figmaBracketColumn ${isRepechage ? "repechageBracket" : "mainBracket"}`}
      aria-label={title}
    >
      <div
        className="figmaBracketRounds"
        style={{ "--figma-bracket-round-count": Math.max(rounds.length, 1) }}
      >
        {rounds.map((round, roundIndex) => (
          <section className="figmaBracketRound" key={`${round.title}-${roundIndex}`}>
            <header className="figmaBracketRoundHeader">
              <div>
                <span>FASE {roundIndex + 1}</span>
                <h3>{round.title === "Disputa Paralela" ? title : round.title}</h3>
              </div>

              <div className="figmaBracketRoundActions">
                <button
                  type="button"
                  onClick={() => speakBracketRound(round, voiceRepeat)}
                  aria-label={`Chamar ${round.title}`}
                >
                  Chamar fase
                </button>

                <button
                  type="button"
                  className="figmaBracketStopButton"
                  onClick={stopSpeech}
                  aria-label="Parar chamada"
                >
                  Parar
                </button>
              </div>
            </header>

            <div className="figmaBracketGames">
              {round.games.map((game, gameIndex) => {
                const blocked =
                  !game.ids1?.length ||
                  !game.ids2?.length ||
                  game.team1?.[0] === "Aguardando" ||
                  game.team2?.[0] === "Aguardando";

                const winnerSide = getScoreWinnerSide(game, winningScore);
                const isFinished = winnerSide !== null;
                const statusLabel = isFinished
                  ? "FINALIZADO"
                  : blocked
                    ? "AGUARDANDO"
                    : "EM ANDAMENTO";
                const teamOne = game.team1?.join(" + ") || "Aguardando vencedor";
                const teamTwo = game.team2?.join(" + ") || "Aguardando vencedor";

                return (
                  <article
                    className={`figmaBracketGame ${isFinished ? "is-finished" : "is-waiting"} ${blocked ? "is-blocked" : ""}`}
                    key={game.matchKey}
                  >
                    <header className="figmaBracketGameMeta">
                      <span>Jogo {gameIndex + 1} &bull; Quadra {game.court}</span>
                      <strong className={`figmaBracketStatus ${isFinished ? "is-finished" : blocked ? "is-blocked" : "is-live"}`}>
                        {statusLabel}
                      </strong>
                    </header>

                    <div className={`figmaBracketTeam ${winnerSide === "team1" ? "is-winner" : winnerSide === "team2" ? "is-loser" : ""}`}>
                      <span className="figmaBracketAvatar" aria-hidden="true">{blocked ? "?" : teamOne.charAt(0).toUpperCase()}</span>
                      <strong>{teamOne}</strong>
                      <input
                        type="number"
                        min="0"
                        max={getMaxScore(winningScore)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={game.s1}
                        placeholder="-"
                        aria-label={`Placar de ${teamOne}`}
                        onChange={(event) => updateBracketScore(game.matchKey, "s1", event.target.value)}
                        disabled={blocked}
                      />
                    </div>

                    <div className={`figmaBracketTeam ${winnerSide === "team2" ? "is-winner" : winnerSide === "team1" ? "is-loser" : ""}`}>
                      <span className="figmaBracketAvatar" aria-hidden="true">{blocked ? "?" : teamTwo.charAt(0).toUpperCase()}</span>
                      <strong>{teamTwo}</strong>
                      <input
                        type="number"
                        min="0"
                        max={getMaxScore(winningScore)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={game.s2}
                        placeholder="-"
                        aria-label={`Placar de ${teamTwo}`}
                        onChange={(event) => updateBracketScore(game.matchKey, "s2", event.target.value)}
                        disabled={blocked}
                      />
                    </div>

                    <footer className="figmaBracketGameActions">
                      <button
                        type="button"
                        onClick={() =>
                          speakGame(game, {
                            roundLabel: `${round.title} da chave ${title}`,
                            includeGroup: false,
                            repeat: voiceRepeat,
                          })
                        }
                        disabled={blocked}
                      >
                        Chamar
                      </button>

                      <button
                        type="button"
                        className={isFinished ? "figmaBracketEditScore" : "figmaBracketRegisterScore"}
                        onClick={(event) => event.currentTarget.closest(".figmaBracketGame")?.querySelector("input:not(:disabled)")?.focus()}
                        disabled={blocked}
                      >
                        {isFinished ? "Editar placar" : "Registrar placar"}
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PublicTournamentPage({ publicId }) {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [publicAthleteIds, setPublicAthleteIds] = useState(null);
  const [error, setError] = useState(null);

  async function loadPublicTournament({ silent = false } = {}) {
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .rpc("get_public_tournament", { p_public_id: publicId })
      .maybeSingle();

    if (error || !data) {
      console.error(error);
      setError("Link público não encontrado ou desativado.");
      setTournament(null);
    } else {
      const publicConfig = getModalityConfig(data.type);
      const normalizedPublicData = publicConfig ? normalizeTournamentData(data.type, data.data) : null;
      const linkedIds = publicConfig
        ? [...new Set(getRegisteredAthletesForPublic(normalizedPublicData, publicConfig)
          .flatMap((group) => group.names)
          .flatMap((entry) => entry.members)
          .map((member) => member.profile.athleteProfileId)
          .filter(Boolean))]
        : [];
      let verifiedPublicIds = [];

      if (linkedIds.length) {
        const athleteProfileResult = await supabase
          .from("athlete_profiles")
          .select("user_id")
          .in("user_id", linkedIds)
          .eq("is_public", true);
        const tableUnavailable = ["42P01", "PGRST205"].includes(String(athleteProfileResult.error?.code || ""));
        verifiedPublicIds = tableUnavailable ? null : (athleteProfileResult.data || []).map((profile) => String(profile.user_id));
      }

      setPublicAthleteIds(verifiedPublicIds);
      setTournament(data);
      setError(null);
    }

    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadPublicTournament();

    const interval = setInterval(() => {
      loadPublicTournament({ silent: true });
    }, 20000);

    return () => clearInterval(interval);
  }, [publicId]);

  if (loading) {
    return (
      <div className="publicPage">
        <div className="center">
          <h1>Carregando tabela...</h1>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="publicPage">
        <div className="center">
          <h1>Link indisponível</h1>
          <p>{error || "Não foi possível carregar esta tabela."}</p>
        </div>
      </div>
    );
  }

  return <PublicTournamentScreen tournament={tournament} publicAthleteIds={publicAthleteIds} />;
}

function getRegisteredAthletesForPublic(data, config, publicAthleteIds = null) {
  if (!data?.players) return [];
  const participantMeta = data.participantMeta || {};
  const member = (name, value) => {
    const profile = normalizeAthleteProfileMeta(value);
    const profileIsCurrentlyPublic = Array.isArray(publicAthleteIds)
      ? publicAthleteIds.includes(String(profile.athleteProfileId || ""))
      : profile.publicConsent;
    return {
      name,
      profile,
      canOpenProfile: Boolean(profile.profileLinked && profile.athleteProfileId && profile.publicConsent && profileIsCurrentlyPublic),
    };
  };

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return [
      {
        title: "Masculino",
        names: (data.players.men || []).filter(Boolean).map((name, index) => ({ label: name, members: [member(name, participantMeta.men?.[index])] })),
      },
      {
        title: "Feminino",
        names: (data.players.women || []).filter(Boolean).map((name, index) => ({ label: name, members: [member(name, participantMeta.women?.[index])] })),
      },
    ];
  }

  if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    return [
      {
        title: "Duplas cadastradas",
        names: (data.players.teams || [])
          .map((team, index) => {
            const teamMeta = normalizeParticipantMetaList([participantMeta.teams?.[index]], 1, { athleteCount: 2 })[0];
            return {
              label: `Dupla ${index + 1}`,
              members: [member(team.a || "Atleta 1", teamMeta.athletes[0]), member(team.b || "Atleta 2", teamMeta.athletes[1])],
            };
          })
          .filter(Boolean),
      },
    ];
  }

  return [
    {
      title: "Atletas cadastrados",
      names: (data.players || []).filter(Boolean).map((name, index) => ({ label: name, members: [member(name, participantMeta.normal?.[index])] })),
    },
  ];
}

function PublicTournamentAthleteEntry({ entry }) {
  return (
    <article className="publicTournamentAthleteEntry">
      {entry.members.length > 1 ? <strong>{entry.label}</strong> : null}
      <div>
        {entry.members.map((member, index) => {
          const profileUrl = member.canOpenProfile
            ? `/?atleta=${encodeURIComponent(member.profile.profileSlug || member.profile.athleteProfileId)}`
            : "";
          const content = (
            <>
              <span>{member.canOpenProfile && member.profile.photoUrl ? <img src={member.profile.photoUrl} alt="" /> : getAthleteInitials(member.name)}</span>
              <strong>{member.profile.displayName || member.name}</strong>
              {member.canOpenProfile ? <small>Ver perfil</small> : null}
            </>
          );

          return member.canOpenProfile
            ? <a href={profileUrl} target="_blank" rel="noreferrer" key={`${member.name}-${index}`}>{content}</a>
            : <div className="publicTournamentAthletePlain" key={`${member.name}-${index}`}>{content}</div>;
        })}
      </div>
    </article>
  );
}

function PublicTournamentScreen({ tournament, publicAthleteIds = null }) {
  const publicTabStorageKey = `publicTournamentTab:${tournament.public_id || tournament.id}`;
  const publicMatchesTabStorageKey = `publicTournamentMatchesTab:${tournament.public_id || tournament.id}`;
  const [activePublicTab, setActivePublicTabState] = useState(() => readPublicViewStorage(publicTabStorageKey, "participantes"));
  const [activePublicMatchesTab, setActivePublicMatchesTabState] = useState(() => readPublicViewStorage(publicMatchesTabStorageKey, "grupos"));

  function setActivePublicTab(tab) {
    savePublicViewStorage(publicTabStorageKey, tab);
    setActivePublicTabState(tab);
  }

  function setActivePublicMatchesTab(tab) {
    savePublicViewStorage(publicMatchesTabStorageKey, tab);
    setActivePublicMatchesTabState(tab);
  }
  const config = getModalityConfig(tournament.type);
  const data = normalizeTournamentData(tournament.type, tournament.data);

  if (!config) {
    return (
      <div className="publicPage">
        <div className="center">
          <h1>Modalidade indisponível</h1>
          <p>Esta tabela foi criada com uma modalidade que não está disponível na versão atual.</p>
        </div>
      </div>
    );
  }

  const publicInfo = data.publicInfo || {};
  const publicVisibility = publicInfo.visibility || {};
  const publicOrganizer = publicInfo.organizer || {};
  const registrationClosed = data.registrationDeadline ? new Date() > new Date(`${data.registrationDeadline}T23:59:59`) : false;
  const ranking = calculateRanking(data, tournament.type, data.rankingCriteria);

  const isCup = isCupType(config);

  const cupGroupRankings = isCup && data.groupsShuffled
    ? calculateCupGroupRankings(data, data.rankingCriteria)
    : [];

  const { currentBrackets, parallelRanking, mainCupPodium, consolationCupPodium } = getSafeCupPresentation(data, config);

  const publicAthletes = getRegisteredAthletesForPublic(data, config, publicAthleteIds);

  return (
    <div className="publicPage">
      <header className="publicHeader publicHeaderWithLogo">
        <div className="publicBrandRow">
          <BeachLogo />
          <div className="brandTaglineOnly">
            <span>{TORNEIO360_TAGLINE}</span>
          </div>
        </div>

        <div className="publicTitleBlock">
          <span>Tabela pública</span>
          <h1>{tournament.name}</h1>
          <p>
            {normalizeModalityName(tournament.type)}
            {data.gender ? ` · ${data.gender}` : ""}
            {data.eventDay ? ` · ${data.eventDay}` : ""}
            {data.eventDate ? ` · ${formatDateBR(data.eventDate)}` : ""}
            {data.location ? ` · ${data.location}` : ""}
          </p>
        </div>

        <div className="publicBadge">
          {registrationClosed ? "Inscrições encerradas" : "Somente visualização"}
        </div>
      </header>

      <main className="publicContent">
        <section className="card publicTournamentInfoCard">
          <h2>Informações do torneio</h2>
          <div className="publicInfoGrid">
            {data.registrationDeadline ? <span><CalendarDays aria-hidden="true" /> Inscrições até {formatDateBR(data.registrationDeadline)}</span> : null}
            {registrationClosed ? <span className="closedInfo"><LockKeyhole aria-hidden="true" /> Inscrições encerradas</span> : null}
            {data.eventStartTime ? <span><Clock3 aria-hidden="true" /> Início {data.eventStartTime}</span> : null}
            {data.location ? <span><MapPin aria-hidden="true" /> {data.location}</span> : null}
            {data.winningScore ? <span><Target aria-hidden="true" /> {data.winningScore} games</span> : null}
          </div>
        </section>

        {(publicVisibility.showArenaName && publicOrganizer.arenaName) ||
          (publicVisibility.showOrganizerName && publicOrganizer.organizerName) ||
          (publicVisibility.showWhatsapp && publicOrganizer.whatsapp) ||
          (publicVisibility.showWhatsappGroupLink && publicOrganizer.whatsappGroupLink) ||
          (publicVisibility.showInstagram && (publicOrganizer.instagramHandle || publicOrganizer.instagramLink)) ||
          (publicVisibility.showAddress && publicOrganizer.address) ||
          (publicVisibility.showMapsLink && publicOrganizer.mapsLink) ||
          (publicVisibility.showCityState && (publicOrganizer.city || publicOrganizer.state)) ? (
          <section className="card publicOrganizerCard">
            <h2>Organização</h2>
            <div className="publicOrganizerHeader">
              {publicOrganizer.photoUrl ? <img src={publicOrganizer.photoUrl} alt="Foto do organizador" /> : null}
              <div>
                {publicVisibility.showArenaName && publicOrganizer.arenaName ? <strong>{publicOrganizer.arenaName}</strong> : null}
                {publicVisibility.showOrganizerName && publicOrganizer.organizerName ? <span>{publicOrganizer.organizerName}</span> : null}
              </div>
            </div>
            <div className="publicOrganizerLinks">
              {publicVisibility.showWhatsapp && publicOrganizer.whatsapp ? <a href={"https://wa.me/" + String(publicOrganizer.whatsapp).replace(/\D/g, "")} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp</a> : null}
              {publicVisibility.showWhatsappGroupLink && publicOrganizer.whatsappGroupLink ? <a href={publicOrganizer.whatsappGroupLink} target="_blank" rel="noreferrer"><Users aria-hidden="true" /> Grupo do WhatsApp</a> : null}
              {publicVisibility.showInstagram && publicOrganizer.instagramLink ? <a href={publicOrganizer.instagramLink} target="_blank" rel="noreferrer"><AtSign aria-hidden="true" /> {publicOrganizer.instagramHandle || "Instagram"}</a> : null}
              {publicVisibility.showInstagram && !publicOrganizer.instagramLink && publicOrganizer.instagramHandle ? <span><AtSign aria-hidden="true" /> {publicOrganizer.instagramHandle}</span> : null}
              {publicVisibility.showAddress && publicOrganizer.address ? <span><MapPin aria-hidden="true" /> {publicOrganizer.address}</span> : null}
              {publicVisibility.showCityState && (publicOrganizer.city || publicOrganizer.state) ? <span><MapPin aria-hidden="true" /> {[publicOrganizer.city, publicOrganizer.state].filter(Boolean).join("/")}</span> : null}
              {publicVisibility.showMapsLink && publicOrganizer.mapsLink ? <a href={publicOrganizer.mapsLink} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /> Ver endereço no mapa</a> : null}
            </div>
          </section>
        ) : null}

        <nav className="tournamentTopTabs publicTournamentTabs" aria-label="Visualização pública do torneio">
          <button type="button" className={activePublicTab === "participantes" ? "active" : ""} onClick={() => setActivePublicTab("participantes")}><Users aria-hidden="true" /> Participantes</button>
          {isCup ? <button type="button" className={activePublicTab === "grupos" ? "active" : ""} onClick={() => setActivePublicTab("grupos")}><Grid3X3 aria-hidden="true" /> Grupos</button> : null}
          <button type="button" className={activePublicTab === "partidas" ? "active" : ""} onClick={() => setActivePublicTab("partidas")}><Flame aria-hidden="true" /> Partidas</button>
          <button type="button" className={activePublicTab === "ranking" ? "active" : ""} onClick={() => setActivePublicTab("ranking")}><Trophy aria-hidden="true" /> Ranking</button>
        </nav>

        <section className="card publicAthletesCard" style={{ display: activePublicTab === "participantes" ? undefined : "none" }}>
          <div className="cardTitleRow">
            <h2>Participantes</h2>
            <span className="readOnlyBadge">Somente visualização</span>
          </div>
          <div className="publicAthletesGrid organizerLikeParticipants">
            {publicAthletes.map((group) => (
              <div className="publicAthleteGroup" key={group.title}>
                <h3>{group.title}</h3>
                {group.names.length === 0 ? (
                  <p>Nenhum atleta cadastrado ainda.</p>
                ) : (
                  <div className="publicAthleteList">
                    {group.names.map((entry, index) => (
                      <PublicTournamentAthleteEntry entry={entry} key={`${group.title}-${index}`} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {isCup ? (
          <section className="card" style={{ display: activePublicTab === "grupos" ? undefined : "none" }}>
            <div className="cardTitleRow">
              <h2>Grupos</h2>
              <span className="readOnlyBadge">Somente visualização</span>
            </div>
            {cupGroupRankings.length > 0 ? (
              <div className="groupsPreviewBox">
                <h3>Classificação dos grupos</h3>
                <CupGroupRankingView
                  className="publicGroupRankings"
                  groupRankings={cupGroupRankings}
                  rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
                />
              </div>
            ) : (
              <p>Os grupos ainda não foram gerados pelo organizador.</p>
            )}
          </section>
        ) : null}

        <section className="card" style={{ display: activePublicTab === "partidas" ? undefined : "none" }}>
          <div className="cardTitleRow">
            <h2>{isCup ? "Partidas" : "Rodadas"}</h2>
            <span className="readOnlyBadge">Somente visualização</span>
          </div>
          {isCup ? (
            <div className="matchesSubTabs">
              <button type="button" className={activePublicMatchesTab === "grupos" ? "active" : ""} onClick={() => setActivePublicMatchesTab("grupos")}>Fase de grupos</button>
              <button type="button" className={activePublicMatchesTab === "chaves" ? "active" : ""} onClick={() => setActivePublicMatchesTab("chaves")}>Chaves finais</button>
              <button type="button" className={activePublicMatchesTab === "paralela" ? "active" : ""} onClick={() => setActivePublicMatchesTab("paralela")}>{data.cupConfig?.repechageName || "Disputa paralela"}</button>
            </div>
          ) : null}

          <div style={{ display: !isCup || activePublicMatchesTab === "grupos" ? undefined : "none" }}>
            {!data.schedule || data.schedule.length === 0 ? (
              <p>A tabela ainda não foi gerada pelo organizador.</p>
            ) : (
              <ScheduleView schedule={data.schedule} showGroupName={isCup} winningScore={getWinningScore(data)} readOnly />
            )}
          </div>

          {isCup ? (
            <div style={{ display: activePublicMatchesTab === "chaves" ? undefined : "none" }}>
              {!currentBrackets ? <p>As chaves finais ainda não foram geradas pelo organizador.</p> : (
                <PublicCupBracketView
                  groupedBrackets={{ main: currentBrackets.main, repechage: [] }}
                  mainTitle={data.cupConfig?.mainBracketName || "Chave principal"}
                />
              )}
            </div>
          ) : null}

          {isCup ? (
            <div style={{ display: activePublicMatchesTab === "paralela" ? undefined : "none" }}>
              {!currentBrackets
                ? <p>A disputa paralela ainda não foi gerada pelo organizador.</p>
                : currentBrackets.repechage?.length > 0
                  ? (
                    <PublicCupBracketView
                      groupedBrackets={{ main: [], repechage: currentBrackets.repechage }}
                      repechageTitle={data.cupConfig?.repechageName || "Disputa paralela"}
                    />
                  )
                  : <p>Esta Copinha de 2 grupos não possui chave de consolação.</p>}
            </div>
          ) : null}
        </section>

        <section className="card" style={{ display: activePublicTab === "ranking" ? undefined : "none" }}>
          <div className="cardTitleRow">
            <h2>Ranking</h2>
            <span className="readOnlyBadge">Somente visualização</span>
          </div>
          {isCup ? (
            <div className="cupRankingSplit">
              <div className="cupRankingPanel">
                <h3>{data.cupConfig?.mainBracketName || "Chave Principal"}</h3>
                {mainCupPodium.length > 0 ? <CupPodiumView podium={mainCupPodium} title={data.cupConfig?.mainBracketName || "Principal"} /> : <p>Finalize a chave principal para ver o ranking.</p>}
              </div>
              <div className="cupRankingPanel">
                <h3>{data.cupConfig?.repechageName || "Disputa Paralela"}</h3>
                {isCopinhaData(data)
                  ? (data.cupConfig?.teamCount === 6
                    ? <p>Com 2 grupos, não há consolação neste formato.</p>
                    : consolationCupPodium.length > 0
                    ? <CupPodiumView podium={consolationCupPodium} title={data.cupConfig?.repechageName || "Consolação"} variant="parallel" />
                    : <p>A consolação ainda não foi finalizada.</p>)
                  : (parallelRanking.length > 0
                    ? <RankingTable title="Classificação" rows={parallelRanking} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
                    : <p>A disputa paralela ainda não tem ranking.</p>)}
              </div>
            </div>
          ) : (
            <RankingView ranking={ranking} type={tournament.type} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
          )}
        </section>

      </main>
    </div>
  );
}

function PublicScheduleView({ schedule, showGroupName = false }) {
  return (
    <div className="schedule">
      {schedule.map((round, roundIndex) => (
        <div className="roundCard" key={roundIndex}>
          <h3>Rodada {roundIndex + 1}</h3>

          {round.map((game, gameIndex) => (
            <div className="gameCard" key={gameIndex}>
              <strong>
                {showGroupName && game.groupName ? `${game.groupName} · ` : ""}
                Quadra {game.court}
              </strong>

              <div className="gameTeams">
                <div>{game.team1.join(" + ")}</div>
                <span>x</span>
                <div>{game.team2.join(" + ")}</div>
              </div>

              <div className="publicScore">
                {game.s1 === "" || game.s2 === "" ? (
                  <span>Aguardando placar</span>
                ) : (
                  <strong>{game.s1} — {game.s2}</strong>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PublicCupBracketView({
  groupedBrackets,
  mainTitle = "Chave principal",
  repechageTitle = "Disputa paralela",
}) {
  const mainRounds = Array.isArray(groupedBrackets?.main) ? groupedBrackets.main : [];
  const repechageRounds = Array.isArray(groupedBrackets?.repechage) ? groupedBrackets.repechage : [];

  if (mainRounds.length === 0 && repechageRounds.length === 0) return null;

  return (
    <div className="cupBrackets publicCupBrackets">
      {mainRounds.length > 0 ? (
        <PublicBracketColumn
          rounds={mainRounds}
          title={mainRounds[0]?.bracketTitle || mainTitle}
          variant="main"
        />
      ) : null}
      {repechageRounds.length > 0 ? (
        <PublicBracketColumn
          rounds={repechageRounds}
          title={repechageRounds[0]?.bracketTitle || repechageTitle}
          variant="repechage"
        />
      ) : null}
    </div>
  );
}

function PublicBracketColumn({ rounds = [], title, variant }) {
  if (rounds.length === 0) return null;

  return (
    <section className={`bracketColumn publicBracketColumn publicBracketColumn--${variant || "main"}`}>
      {title ? <h3 className="publicBracketTitle">{title}</h3> : null}

      {rounds.map((round, roundIndex) => (
        <div className="roundCard publicBracketRound" key={roundIndex}>
          <h3>{round.title || title}</h3>

          {round.games.map((game) => (
            <div className="gameCard publicBracketGame" key={game.matchKey}>
              <strong>Quadra {game.court}</strong>

              <div className="gameTeams publicBracketTeams">
                <div>{game.team1?.join(" + ") || "Aguardando"}</div>
                <span>x</span>
                <div>{game.team2?.join(" + ") || "Aguardando"}</div>
              </div>

              <div className="publicScore publicBracketScore">
                {game.s1 === "" || game.s2 === "" ? (
                  <span>Aguardando placar</span>
                ) : (
                  <strong>{game.s1} — {game.s2}</strong>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function resizeAthletePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Escolha uma imagem JPG ou PNG."));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      reject(new Error("A foto deve ter no máximo 3 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 320;
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

function AthleteLinkPage({ requestId }) {
  const [request, setRequest] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [completed, setCompleted] = useState(false);
  const hydratedUserRef = useRef("");

  useEffect(() => {
    let active = true;

    async function prepareIsolatedSession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          await athleteLinkSupabase.auth.exchangeCodeForSession(code);
          url.searchParams.delete("code");
          window.history.replaceState(null, "", `${url.pathname}${url.search}`);
        } else if (accessToken && refreshToken) {
          await athleteLinkSupabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          url.hash = "";
          window.history.replaceState(null, "", `${url.pathname}${url.search}`);
        }
      } catch (error) {
        console.error("Erro no retorno do login do atleta", error);
      }

      const { data } = await athleteLinkSupabase.auth.getSession();
      if (!active) return;
      const { data: requestData, error: requestError } = await athleteLinkSupabase
        .rpc("get_athlete_link_request", { p_request_id: requestId });
      if (!active) return;

      if (requestError || !requestData) {
        console.error("Convite de atleta não encontrado", requestError);
        setRequest(null);
      } else {
        const nextRequest = {
          requestId: requestData.requestId || requestData.request_id || requestData.id || requestId,
          tournamentId: requestData.tournamentId || requestData.tournament_id || "",
          tournamentName: requestData.tournamentName || requestData.tournament_name || "Torneio",
          tournamentType: requestData.tournamentType || requestData.tournament_type || "",
          path: requestData.path || requestData.participant_path || {},
          athleteIndex: requestData.athleteIndex ?? requestData.athlete_index ?? 0,
          athleteName: requestData.athleteName || requestData.athlete_name || "Atleta",
          expiresAt: requestData.expiresAt || requestData.expires_at || "",
        };
        setRequest(nextRequest);
        setDisplayName((current) => current || nextRequest.athleteName);
      }
      setSession(data.session || null);
      setLoading(false);
    }

    void prepareIsolatedSession();
    const { data: listener } = athleteLinkSupabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user?.id || hydratedUserRef.current === user.id) return;
    hydratedUserRef.current = user.id;

    async function hydrateProfile() {
      const metadata = user.user_metadata || {};
      let savedProfile = null;
      try {
        savedProfile = JSON.parse(localStorage.getItem(`${ATHLETE_PROFILE_DRAFT_PREFIX}${user.id}`) || "null");
      } catch {
        savedProfile = null;
      }
      const [legacyProfileResult, athleteProfileResult] = await Promise.all([
        athleteLinkSupabase.from("profiles").select("id, name, photo_url").eq("id", user.id).maybeSingle(),
        athleteLinkSupabase.from("athlete_profiles").select("display_name, photo_url, bio, is_public").eq("user_id", user.id).maybeSingle(),
      ]);
      const profileData = legacyProfileResult.data;
      const athleteProfileData = athleteProfileResult.data;

      if (athleteProfileResult.error) {
        console.error("Erro ao carregar perfil de atleta", athleteProfileResult.error);
        setPublicConsent(false);
        setNotice({ type: "warning", message: "Não foi possível carregar suas preferências de privacidade. Tente novamente." });
        return;
      }

      if (athleteProfileData) {
        setDisplayName(athleteProfileData.display_name || request?.athleteName || "Atleta");
        setPhotoUrl(athleteProfileData.photo_url ?? "");
        setBio(athleteProfileData.bio ?? "");
        setPublicConsent(athleteProfileData.is_public === true);
        return;
      }

      setDisplayName((current) => savedProfile?.displayName || metadata.name || metadata.full_name || profileData?.name || current || request?.athleteName || "Atleta");
      setPhotoUrl((current) => savedProfile?.photoUrl || profileData?.photo_url || current || "");
      setBio((current) => savedProfile?.bio || metadata.athlete_bio || current || "");
      setPublicConsent(savedProfile?.publicConsent === true || metadata.athlete_profile_public === true);
    }

    void hydrateProfile();
  }, [session?.user?.id]);

  async function submitAuth(event) {
    event.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password) {
      setNotice({ type: "warning", message: "Informe e-mail e senha para continuar." });
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setNotice({ type: "warning", message: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      setNotice({ type: "warning", message: "Informe o nome que aparecerá no perfil." });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    const authResult = mode === "login"
      ? await athleteLinkSupabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
      : await athleteLinkSupabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          emailRedirectTo: window.location.href.split("#")[0],
          data: { name: displayName.trim(), account_type: "athlete" },
        },
      });
    setSubmitting(false);

    if (authResult.error) {
      setNotice({ type: "error", message: getAuthErrorMessage(authResult.error, "Não foi possível entrar. Confira os dados e tente novamente.") });
      return;
    }

    if (mode === "signup" && !authResult.data?.session) {
      setNotice({ type: "success", message: "Enviamos a confirmação por e-mail. Depois de confirmar, volte a esta aba e entre na conta." });
      setMode("login");
    }
  }

  async function handleAthletePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUrl(await resizeAthletePhoto(file));
      setNotice(null);
    } catch (error) {
      setNotice({ type: "warning", message: error.message });
    } finally {
      event.target.value = "";
    }
  }

  async function confirmLink() {
    if (!request || !session?.user?.id || submitting) return;
    if (!displayName.trim()) {
      setNotice({ type: "warning", message: "Informe o nome do atleta." });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    const linkedAt = new Date().toISOString();
    const userId = session.user.id;
    const result = {
      requestId,
      tournamentId: request.tournamentId,
      path: request.path,
      athleteIndex: request.athleteIndex,
      athleteProfileId: userId,
      profileSlug: userId,
      displayName: displayName.trim(),
      photoUrl,
      bio: bio.trim().slice(0, 240),
      publicConsent,
      linkedAt,
    };

    const { error: userError } = await athleteLinkSupabase.auth.updateUser({
      data: {
        name: result.displayName,
        account_type: ACCOUNT_TYPE_ATHLETE,
        athlete_bio: result.bio,
        athlete_profile_public: result.publicConsent,
      },
    });

    if (userError) {
      setSubmitting(false);
      setNotice({ type: "error", message: "Não foi possível confirmar os dados do perfil." });
      return;
    }

    const { error: profileError } = await athleteLinkSupabase.from("athlete_profiles").upsert({
      user_id: userId,
      display_name: result.displayName,
      photo_url: result.photoUrl,
      bio: result.bio,
      is_public: result.publicConsent,
      show_achievements: true,
      updated_at: linkedAt,
    }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Erro ao salvar perfil do atleta", profileError);
      setSubmitting(false);
      setNotice({ type: "error", message: "Não foi possível salvar o perfil do atleta. Tente novamente." });
      return;
    }

    const { error: claimError } = await athleteLinkSupabase.rpc("claim_athlete_link_request", {
      p_request_id: requestId,
      p_public_consent: result.publicConsent,
    });

    if (claimError) {
      console.error("Erro ao confirmar convite do atleta", claimError);
      setSubmitting(false);
      setNotice({ type: "error", message: "Este convite expirou ou já foi utilizado. Peça um novo vínculo ao organizador." });
      return;
    }

    try {
      localStorage.setItem(`${ATHLETE_PROFILE_DRAFT_PREFIX}${userId}`, JSON.stringify({
        displayName: result.displayName,
        photoUrl: result.photoUrl,
        bio: result.bio,
        publicConsent: result.publicConsent,
        updatedAt: linkedAt,
      }));
    } catch {
      // O banco continua sendo a fonte oficial do vínculo e da privacidade.
    }

    try {
      localStorage.setItem(`${ATHLETE_LINK_RESULT_PREFIX}${requestId}`, JSON.stringify({ requestId, linkedAt }));
    } catch {
      // O organizador também consulta o resultado diretamente no servidor.
    }

    setSubmitting(false);
    setCompleted(true);
  }

  async function changeAthleteAccount() {
    await athleteLinkSupabase.auth.signOut({ scope: "local" });
    hydratedUserRef.current = "";
    setSession(null);
  }

  if (loading) {
    return <div className="athleteLinkPage"><section className="athleteLinkCard"><div className="loadingSpinner" /><p>Preparando o login seguro do atleta...</p></section></div>;
  }

  if (!request) {
    return (
      <div className="athleteLinkPage"><section className="athleteLinkCard athleteLinkMissing"><BeachLogo /><h1>Vínculo não encontrado</h1><p>Este convite expirou ou já foi concluído. Peça ao organizador para abrir novamente o botão Vincular perfil.</p></section></div>
    );
  }

  if (completed) {
    return (
      <div className="athleteLinkPage">
        <section className="athleteLinkCard athleteLinkComplete">
          <div className="athleteLinkSuccessIcon"><Trophy aria-hidden="true" /></div>
          <h1>Perfil vinculado</h1>
          <p>A confirmação foi enviada para o torneio <strong>{request.tournamentName}</strong>. Você já pode fechar esta aba.</p>
          <button type="button" onClick={() => window.close()}>Fechar aba</button>
        </section>
      </div>
    );
  }

  if (session && getUserAccountType(session.user) !== ACCOUNT_TYPE_ATHLETE) {
    return (
      <div className="athleteLinkPage">
        <header className="athleteLinkHeader"><BeachLogo /></header>
        <main className="athleteLinkMain">
          <section className="athleteLinkCard athleteLinkMissing">
            <UserRound aria-hidden="true" />
            <h1>Use uma conta de atleta</h1>
            <p>Este vínculo só pode ser confirmado por um perfil gratuito de atleta. A conta de organizador permanece separada e não será alterada.</p>
            <button type="button" onClick={changeAthleteAccount}>Entrar com outra conta</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="athleteLinkPage">
      <header className="athleteLinkHeader"><BeachLogo /></header>
      <main className="athleteLinkMain">
        <section className="athleteLinkContext">
          <span>VÍNCULO DE ATLETA</span>
          <h1>{request.tournamentName}</h1>
          <p>O organizador cadastrou esta vaga como <strong>{request.athleteName}</strong>. Entre na sua própria conta para confirmar que esse participante é você.</p>
        </section>

        {!session ? (
          <section className="athleteLinkCard">
            <div className="athleteLinkMode" role="tablist">
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Já tenho conta</button>
              <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Criar perfil de atleta</button>
            </div>
            <form onSubmit={submitAuth}>
              {mode === "signup" ? <label>Nome no perfil<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Seu nome completo" /></label> : null}
              <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label>
              <label>Senha<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
              {notice ? <div className={`athleteLinkNotice ${notice.type}`}>{notice.message}</div> : null}
              <button type="submit" disabled={submitting}>{submitting ? "Aguarde..." : mode === "login" ? "Entrar e continuar" : "Criar perfil"}</button>
            </form>
            <small className="athleteLinkSecurity"><LockKeyhole aria-hidden="true" /> Este login usa uma sessão separada e não desconecta o organizador.</small>
          </section>
        ) : (
          <section className="athleteLinkCard athleteProfileConfirmCard">
            <div className="athleteProfileConfirmHeader">
              <label className="athletePhotoPicker">
                <span>{photoUrl ? <img src={photoUrl} alt="Foto do atleta" /> : getAthleteInitials(displayName || request.athleteName)}</span>
                <input type="file" accept="image/png,image/jpeg" onChange={handleAthletePhoto} />
                <small><Camera aria-hidden="true" /> Escolher foto</small>
              </label>
              <div><span>PERFIL DO ATLETA</span><h2>{displayName || request.athleteName}</h2><button type="button" onClick={changeAthleteAccount}>Usar outra conta</button></div>
            </div>
            <label>Nome público<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={90} /></label>
            <label>Bio opcional<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} placeholder="Uma frase curta que resuma você como atleta." /><small>{bio.length}/240</small></label>
            <label className="athleteConsentOption">
              <input type="checkbox" checked={publicConsent} onChange={(event) => setPublicConsent(event.target.checked)} />
              <span><strong>Exibir meu perfil nos torneios</strong><small>Minha foto e meu nome poderão ser clicados para abrir o perfil público. Posso manter o vínculo privado se preferir.</small></span>
            </label>
            {notice ? <div className={`athleteLinkNotice ${notice.type}`}>{notice.message}</div> : null}
            <button type="button" className="athleteConfirmButton" onClick={confirmLink} disabled={submitting}>{submitting ? "Confirmando..." : "Confirmar que este perfil é meu"}</button>
          </section>
        )}
      </main>
    </div>
  );
}

function normalizeAthleteLookupKey(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function findAthleteLinksInTournament(tournament, athleteKey) {
  const config = getModalityConfig(tournament.type);
  if (!config) return [];
  const data = normalizeTournamentData(tournament.type, tournament.data);
  const meta = data.participantMeta || {};
  const matchesKey = (athlete) => {
    const normalized = normalizeAthleteProfileMeta(athlete);
    return normalized.publicConsent && [normalized.athleteProfileId, normalized.profileSlug].some((value) => String(value || "") === String(athleteKey));
  };

  if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    return (data.players?.teams || []).flatMap((team, teamIndex) => {
      const teamMeta = normalizeParticipantMetaList([meta.teams?.[teamIndex]], 1, { athleteCount: 2 })[0];
      return teamMeta.athletes.flatMap((athlete, athleteIndex) => matchesKey(athlete) ? [{
        athlete: normalizeAthleteProfileMeta(athlete),
        kind: "team",
        index: teamIndex,
        athleteIndex,
        teamName: getTeamName(team),
        data,
        config,
      }] : []);
    });
  }

  const collections = config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16"
    ? [
      { kind: "men", names: data.players?.men || [], values: meta.men || [] },
      { kind: "women", names: data.players?.women || [], values: meta.women || [] },
    ]
    : [{ kind: "normal", names: data.players || [], values: meta.normal || [] }];

  return collections.flatMap((collection) => collection.names.flatMap((name, index) => {
    const athlete = normalizeAthleteProfileMeta(collection.values[index]);
    return matchesKey(athlete) ? [{ athlete, kind: collection.kind, index, athleteIndex: 0, teamName: name, data, config }] : [];
  }));
}

function getValidatedAthleteAchievement(tournament, link) {
  const { data, config, kind, index, teamName } = link;
  if (!data.rankingConfirmedAt) return null;
  let placement = 0;

  if (isCupType(config)) {
    const podium = getSafeCupPresentation(data, config).mainCupPodium;
    const target = normalizeAthleteLookupKey(teamName);
    placement = podium.findIndex((item) => normalizeAthleteLookupKey(item.name) === target) + 1;
  } else {
    const ranking = calculateRanking(data, tournament.type, data.rankingCriteria);
    const participantId = kind === "women" ? Number(config.men || 0) + index : index;
    placement = ranking.findIndex((item) => Number(item.id) === participantId) + 1;
  }

  if (placement < 1 || placement > 3) return null;
  const organizer = data.publicInfo?.organizer || {};
  return {
    id: `${tournament.id}-${placement}`,
    placement,
    tournamentName: data.eventName || tournament.name,
    modality: normalizeModalityName(tournament.type),
    date: data.eventDate || tournament.updated_at || "",
    arenaName: organizer.arenaName || organizer.organizerName || "Organizador do torneio",
    publicId: tournament.public_id,
  };
}

function PublicAthletePage({ athleteKey }) {
  const [state, setState] = useState({ loading: true, profile: null, achievements: [], showAchievements: true, error: "" });

  useEffect(() => {
    let active = true;

    async function loadAthlete() {
      const tournamentsPromise = supabase.rpc("list_public_tournaments", { p_limit: 500 });
      const canQueryProfileById = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(athleteKey || ""));
      const profilePromise = canQueryProfileById
        ? supabase.from("profiles").select("id, name, photo_url, is_public").eq("id", athleteKey).eq("is_public", true).maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const athleteProfilePromise = canQueryProfileById
        ? supabase.from("athlete_profiles").select("user_id, display_name, photo_url, bio, is_public, show_achievements").eq("user_id", athleteKey).eq("is_public", true).maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const [tournamentResult, profileResult, athleteProfileResult] = await Promise.all([tournamentsPromise, profilePromise, athleteProfilePromise]);
      if (!active) return;

      if (tournamentResult.error) {
        setState({ loading: false, profile: null, achievements: [], showAchievements: true, error: "Não foi possível carregar este perfil agora." });
        return;
      }

      const linked = [];
      (tournamentResult.data || []).forEach((tournament) => {
        findAthleteLinksInTournament(tournament, athleteKey).forEach((link) => linked.push({ tournament, link }));
      });
      const snapshot = linked.map((item) => item.link.athlete).find((athlete) => athlete.publicConsent) || null;
      const publicProfile = profileResult.data;
      const athleteProfile = athleteProfileResult.data;
      const athleteProfileTableUnavailable = ["42P01", "PGRST205"].includes(String(athleteProfileResult.error?.code || ""));
      const legacyProfile = athleteProfileTableUnavailable ? (snapshot || publicProfile) : null;
      const profile = athleteProfile
        ? {
          displayName: athleteProfile.display_name || "Atleta",
          photoUrl: athleteProfile.photo_url ?? "",
          bio: athleteProfile.bio ?? "",
        }
        : legacyProfile
          ? {
            displayName: snapshot?.displayName || publicProfile?.name || "Atleta",
            photoUrl: snapshot?.photoUrl || publicProfile?.photo_url || "",
            bio: snapshot?.bio || "",
          }
          : null;
      const showAchievements = athleteProfile?.show_achievements !== false;
      const achievements = (showAchievements ? linked : [])
        .map(({ tournament, link }) => getValidatedAthleteAchievement(tournament, link))
        .filter(Boolean)
        .filter((achievement, index, values) => values.findIndex((item) => item.id === achievement.id) === index)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

      setState({ loading: false, profile, achievements, showAchievements, error: profile ? "" : "Este atleta ainda não autorizou um perfil público." });
    }

    void loadAthlete();
    return () => { active = false; };
  }, [athleteKey]);

  if (state.loading) return <div className="publicAthletePage"><div className="publicAthleteState"><div className="loadingSpinner" /><p>Carregando perfil do atleta...</p></div></div>;
  if (!state.profile) return <div className="publicAthletePage"><div className="publicAthleteState"><BeachLogo /><h1>Perfil indisponível</h1><p>{state.error}</p><a href="/">Voltar ao Torneio360</a></div></div>;

  const podiumCount = state.achievements.length;
  const placementCounts = [1, 2, 3].map((placement) => state.achievements.filter((item) => item.placement === placement).length);

  return (
    <div className="publicAthletePage">
      <header className="publicAthleteHeader"><a href="/"><BeachLogo /></a><a href="/">Início</a></header>
      <main className="publicAthleteContent">
        <section className="publicAthleteHero">
          <div className="publicAthletePhoto">{state.profile.photoUrl ? <img src={state.profile.photoUrl} alt={`Foto de ${state.profile.displayName}`} /> : getAthleteInitials(state.profile.displayName)}</div>
          <div><span>PERFIL DE ATLETA</span><h1>{state.profile.displayName}</h1>{state.profile.bio ? <p>{state.profile.bio}</p> : <p>Atleta vinculado aos torneios do Torneio360.</p>}</div>
        </section>
        {state.showAchievements ? <section className="publicAthleteStats" aria-label="Resumo de conquistas">
          <div className="total"><Trophy aria-hidden="true" /><span>Pódios validados</span><strong>{podiumCount}</strong></div>
          <div><span>1º lugar</span><strong>{placementCounts[0]}</strong></div>
          <div><span>2º lugar</span><strong>{placementCounts[1]}</strong></div>
          <div><span>3º lugar</span><strong>{placementCounts[2]}</strong></div>
        </section> : null}
        <section className="publicAthleteAchievements">
          <div className="publicAthleteSectionTitle"><div><span>CONQUISTAS</span><h2>Resultados oficiais</h2></div><small>Somente resultados confirmados por organizadores</small></div>
          {!state.showAchievements ? (
            <div className="publicAthleteEmpty"><LockKeyhole aria-hidden="true" /><strong>Conquistas privadas</strong><p>Este atleta escolheu não exibir publicamente o histórico de resultados.</p></div>
          ) : state.achievements.length ? (
            <div className="publicAthleteAchievementList">
              {state.achievements.map((achievement) => (
                <article key={achievement.id} className={`placement-${achievement.placement}`}>
                  <div className="achievementPlace">{achievement.placement}<sup>º</sup></div>
                  <div className="achievementCopy"><strong>{achievement.tournamentName}</strong><span>{achievement.modality}</span>{achievement.date ? <small><CalendarDays aria-hidden="true" /> {formatDateBR(String(achievement.date).slice(0, 10))}</small> : null}</div>
                  <div className="achievementSignature"><span><Trophy aria-hidden="true" /> Resultado validado</span><strong>{achievement.arenaName}</strong>{achievement.publicId ? <a href={`/?public=${encodeURIComponent(achievement.publicId)}`}>Ver torneio</a> : null}</div>
                </article>
              ))}
            </div>
          ) : <div className="publicAthleteEmpty"><Trophy aria-hidden="true" /><strong>Nenhum pódio validado ainda</strong><p>As conquistas aparecerão aqui quando um organizador confirmar o ranking de um torneio público.</p></div>}
        </section>
      </main>
    </div>
  );
}

function RootApp() {
  const params = new URLSearchParams(window.location.search);
  const athleteLinkId = params.get("vincular-atleta");
  const athleteKey = params.get("atleta");

  if (athleteLinkId) return <AthleteLinkPage requestId={athleteLinkId} />;
  if (athleteKey) return <PublicAthletePage athleteKey={athleteKey} />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <>
    <RootApp />
    <InstallAppBanner />
  </>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Não foi possível registrar o atalho instalável:", error);
    });
  });
}

function createParticipantReference() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `participante-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAthleteProfileMeta(value, legacy = {}) {
  const item = isTournamentDataObject(value) ? value : {};
  const fallback = isTournamentDataObject(legacy) ? legacy : {};
  const athleteProfileId = item.athleteProfileId || item.athlete_profile_id || fallback.athleteProfileId || fallback.athlete_profile_id || "";
  const photoUrl = item.photoUrl || item.photo_url || item.avatarUrl || item.avatar_url || fallback.photoUrl || fallback.photo_url || "";

  return {
    ...item,
    memberId: item.memberId || item.member_id || createParticipantReference(),
    athleteProfileId,
    profileSlug: item.profileSlug || item.profile_slug || athleteProfileId || "",
    displayName: item.displayName || item.display_name || "",
    photoUrl,
    bio: typeof item.bio === "string" ? item.bio : "",
    publicConsent: item.publicConsent === true || item.public_consent === true,
    profileLinked: Boolean(item.profileLinked || item.profile_linked || athleteProfileId),
    linkedAt: item.linkedAt || item.linked_at || "",
  };
}

function normalizeParticipantMetaList(values, count, options = {}) {
  const source = Array.isArray(values) ? values : [];
  return Array.from({ length: count }, (_, index) => {
    const item = isTournamentDataObject(source[index]) ? source[index] : {};
    const normalized = {
      ...item,
      entryId: item.entryId || item.entry_id || createParticipantReference(),
      payment: ["pending", "paid", "exempt"].includes(item.payment) ? item.payment : "pending",
      registration: item.registration === "confirmed" ? "confirmed" : "pending",
      profileLinked: Boolean(item.profileLinked),
    };

    if (Number(options.athleteCount) === 2) {
      const sourceAthletes = Array.isArray(item.athletes) ? item.athletes : [];
      normalized.athletes = [
        normalizeAthleteProfileMeta(sourceAthletes[0], sourceAthletes.length ? {} : item),
        normalizeAthleteProfileMeta(sourceAthletes[1]),
      ];
      normalized.profileLinked = normalized.athletes.some((athlete) => athlete.profileLinked);
    }

    return normalized;
  });
}

function getTournamentParticipantRecords(type, data) {
  const config = getModalityConfig(type);
  const meta = data?.participantMeta || {};
  if (!config || !data?.players) return [];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return [
      ...data.players.men.map((name, index) => ({ key: `men-${index}`, name, meta: meta.men?.[index] || {} })),
      ...data.players.women.map((name, index) => ({ key: `women-${index}`, name, meta: meta.women?.[index] || {} })),
    ];
  }

  if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    return data.players.teams.map((team, index) => ({
      key: `team-${index}`,
      name: [team.a, team.b].filter(Boolean).join(" & "),
      meta: meta.teams?.[index] || {},
    }));
  }

  return data.players.map((name, index) => ({ key: `normal-${index}`, name, meta: meta.normal?.[index] || {} }));
}
