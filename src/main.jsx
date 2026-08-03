import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  AtSign,
  Camera,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
  Flame,
  Gift,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  PlusCircle,
  Settings,
  Shapes,
  Share2,
  Sun,
  Tag,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import InstallAppBanner from "./InstallAppBanner.jsx";
import "./style.css";

const SUPABASE_URL = "https://dttutybojealkvuywszt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Tr5qiUea-p42UknVoWwPKg_6K_b1EX_";
const PLATFORM_WHATSAPP_NUMBER = "5585988739056";
const PLATFORM_WHATSAPP_DEFAULT_MESSAGE = "Olá! Preciso de ajuda com o Torneio360.";

function getPlatformWhatsAppUrl(message = PLATFORM_WHATSAPP_DEFAULT_MESSAGE) {
  return `https://wa.me/${PLATFORM_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const PLATFORM_SUPPORT = Object.freeze([
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: "85 9.8873-9056",
    href: getPlatformWhatsAppUrl(),
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
    detectSessionInUrl: true,
  },
});
const TORNEIO360_LOGO = "/torneio360-logo.png";
const TORNEIO360_LOGO_BLUE = "/torneio360-logo-blue.png";
const TORNEIO360_TAGLINE = "Gestão inteligente de torneios";

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
    label: "Vitórias > Total de Games > Saldo de games",
    order: ["w", "pts", "bal"],
  },
  {
    value: "wins_balance_points",
    label: "Vitórias > Saldo de games > Total de Games",
    order: ["w", "bal", "pts"],
  },
  {
    value: "points_wins_balance",
    label: "Total de Games > Vitórias > Saldo de games",
    order: ["pts", "w", "bal"],
  },
  {
    value: "points_balance_wins",
    label: "Total de Games > Saldo de games > Vitórias",
    order: ["pts", "bal", "w"],
  },
  {
    value: "balance_wins_points",
    label: "Saldo de games > Vitórias > Total de Games",
    order: ["bal", "w", "pts"],
  },
  {
    value: "balance_points_wins",
    label: "Saldo de games > Total de Games > Vitórias",
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
  return `Acompanhe os torneios e circuitos desta arena no Torneio360:
${url}`;
}

function isPublicItemFinished(item, kind = "tournament") {
  const endDate = kind === "circuit"
    ? item?.end_date || item?.endDate
    : item?.data?.eventEndDate || item?.data?.eventDate;

  if (!endDate) return kind === "circuit" && normalizeCircuitStatus(item?.status) === "closed";

  const endOfDay = new Date(`${endDate}T23:59:59`);
  return Number.isFinite(endOfDay.getTime()) && endOfDay.getTime() < Date.now();
}

function getPublicTournamentDirectoryItem(tournament) {
  const details = tournament?.data || {};

  return {
    id: tournament?.id || tournament?.public_id,
    public_id: tournament?.public_id || null,
    name: tournament?.name || "Torneio",
    type: tournament?.type || "",
    data: {
      eventDate: details.eventDate || "",
      eventEndDate: details.eventEndDate || details.eventDate || "",
      eventStartTime: details.eventStartTime || "",
      location: details.location || "",
      gender: details.gender || "",
    },
    directoryEntry: true,
  };
}

function getPublicCircuitDirectoryItem(circuit) {
  return {
    id: circuit?.id,
    name: circuit?.name || "Circuito",
    start_date: circuit?.start_date || circuit?.startDate || "",
    end_date: circuit?.end_date || circuit?.endDate || "",
    status: normalizeCircuitStatus(circuit?.status),
    tournament_ids: circuit?.tournament_ids || circuit?.tournamentIds || [],
  };
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
  return { w: "Vitórias", pts: "Total de Games", bal: "Saldo de games" }[key] || key;
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

function getBrazilianWhatsAppUrl(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const numberWithCountryCode = digits.startsWith("55") && digits.length >= 12
    ? digits
    : `55${digits}`;

  return `https://wa.me/${numberWithCountryCode}`;
}

function getPlanRegularizationWhatsAppUrl(profile, user) {
  const plan = profile?.plan ? ` Plano atual: ${profile.plan}.` : "";
  const email = user?.email ? ` E-mail da conta: ${user.email}.` : "";
  return getPlatformWhatsAppUrl(`Olá! Meu período de acesso ao Torneio360 terminou e quero regularizar o pagamento do meu plano.${plan}${email}`);
}

function isEmailNotConfirmedError(error) {
  return /email[^\n]*not[^\n]*confirm|not[^\n]*confirm[^\n]*email|email_not_confirmed/i.test(`${error?.message || ""} ${error?.code || ""}`);
}

function isUserAlreadyRegisteredError(error) {
  const code = String(error?.code || "").toLowerCase();
  if (code === "user_already_exists" || code === "email_exists") return true;

  return /user\s+already\s+registered|user[^\n]*already[^\n]*exists|email[^\n]*already[^\n]*exists/i.test(String(error?.message || ""));
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

const modalityDisplayNames = {
  "Super 08": "Super 8",
  "Super 10 Mista (Dupla Aleatória)": "Super 10 mista",
  "Super 12 Mista (Dupla Aleatória)": "Super 12 mista",
  "Super 16 Mista (Dupla Aleatória)": "Super 16 mista",
  "Super 12 Mista (Dupla Fixa)": "Super 6 (dupla fixa)",
  "Super 16 Mista (Dupla Fixa)": "Super 8 (dupla fixa)",
  "Simples 8": "Simples 8 (1 contra 1 por jogo)",
};

function getModalityDisplayName(type) {
  return modalityDisplayNames[type] || type;
}

function normalizeCircuitStatus(status) {
  return status === "closed" || status === "archived" ? "closed" : "active";
}

const allowedByPlan = {
  basic: [
    "Super 08",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
  ],
  pro: [
    "Super 12 Mista (Dupla Fixa)",
    "Super 08",
    "Super 16 Mista (Dupla Fixa)",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
  ],
  premium: [
    "Super 12 Mista (Dupla Fixa)",
    "Super 08",
    "Super 16 Mista (Dupla Fixa)",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Simples 8",
    "Copa - 12 ou 24 duplas",
    "Copa - 18 duplas",
    "Copa - 21 duplas",
    "Copinha - grupos de 3",
    "Campeonato Cearense",
  ],
};

const modalityConfig = {
  "Super 08": {
    type: "super8",
    total: 8,
    label: "Participante",
    courts: 2,
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

  "Super 16 Mista (Dupla Fixa)": {
    type: "fixed16",
    teams: 8,
    courts: 4,
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

  "Campeonato Cearense": {
    type: "cearense",
    cupMode: "cearense",
    allowedTeamCounts: Array.from({ length: 29 }, (_, index) => index + 4),
    defaultTeams: 4,
    defaultMainBracketName: "Eliminatória Principal",
    defaultRepechageName: "Disputa Paralela",
    courts: 6,
  },
};

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
  return config?.type === "cup" || config?.type === "cup18" || config?.type === "cup21" || config?.type === "copinha" || config?.type === "cearense";
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

function createCearenseGroups(teamCount) {
  const safeTeamCount = Math.max(4, Math.min(32, Number(teamCount) || 4));
  const groupSizes = [];

  if (safeTeamCount <= 5) {
    groupSizes.push(safeTeamCount);
  } else {
    const groupCount = Math.floor(safeTeamCount / 3);
    const groupsWithFour = safeTeamCount % 3;

    for (let index = 0; index < groupCount; index += 1) {
      groupSizes.push(index < groupsWithFour ? 4 : 3);
    }
  }

  let nextTeamId = 0;

  return groupSizes.map((size, index) => {
    const teamIds = Array.from({ length: size }, () => nextTeamId++);

    return {
      id: index,
      name: `Grupo ${getGroupLetter(index)}`,
      teamIds,
    };
  });
}

function createCupGroups(teamCount, format = "") {
  if (format === "cearense") {
    return createCearenseGroups(teamCount);
  }

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

function createRoundRobinPairings(teamIds) {
  const rotation = [...teamIds];

  if (rotation.length % 2 === 1) rotation.push(null);

  const rounds = [];

  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex += 1) {
    const pairs = [];

    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];

      if (first !== null && second !== null) pairs.push([first, second]);
    }

    rounds.push(pairs);
    rotation.splice(1, 0, rotation.pop());
  }

  return rounds;
}

function generateCearenseGroupSchedule(players, cupConfig) {
  const teamCount = cupConfig.teamCount || 4;
  const groups = createCearenseGroups(teamCount);
  const teamNames = players.teams.map((team) => getTeamName(team));
  const groupRounds = groups.map((group) => createRoundRobinPairings(group.teamIds));
  const roundCount = Math.max(...groupRounds.map((rounds) => rounds.length));
  const rounds = Array.from({ length: roundCount }, () => []);

  groupRounds.forEach((scheduledRounds, groupIndex) => {
    scheduledRounds.forEach((pairs, roundIndex) => {
      pairs.forEach(([id1, id2]) => {
        rounds[roundIndex].push({
          phase: "groups",
          groupId: groups[groupIndex].id,
          groupName: groups[groupIndex].name,
          team1: [teamNames[id1]],
          ids1: [id1],
          team2: [teamNames[id2]],
          ids2: [id2],
          s1: "",
          s2: "",
        });
      });
    });
  });

  return rounds.map((round) => round.map((game, index) => ({
    ...game,
    court: index + 1,
  })));
}

function generateCupGroupSchedule(players, cupConfig) {
  const teamCount = cupConfig.teamCount || 12;
  const format = cupConfig.format || cupConfig.cupMode || "";

  if (format === "cearense") {
    return generateCearenseGroupSchedule(players, cupConfig);
  }

  const groups = createCupGroups(teamCount, format);
  const teamNames = players.teams.map((t) => getTeamName(t));

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
        court: groupIndex + 1,
        team1: [teamNames[id1]],
        ids1: [id1],
        team2: [teamNames[id2]],
        ids2: [id2],
        s1: "",
        s2: "",
      });
    });
  });

  return rounds.map((round) =>
    round.map((game, index) => ({
      ...game,
      court: index + 1,
    }))
  );
}

function getCupFormat(data) {
  return data?.cupConfig?.format || data?.cupConfig?.cupMode || "";
}

function isCopinhaData(data) {
  return getCupFormat(data) === "copinha";
}

function isCearenseData(data) {
  return getCupFormat(data) === "cearense";
}

function resetCopinhaTieBreaks(data) {
  if (!isCopinhaData(data) && !isCearenseData(data)) return data;

  data.cupConfig = {
    ...(data.cupConfig || {}),
    tieBreakOverrides: {},
    groupTieBreakOverrides: {},
    campaignTieBreakOverrides: {},
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

function rankCearenseGroupRows(rows, groupGames, winningScore, criteria, storedTieOrder) {
  const baseRows = [...rows].sort((a, b) => {
    for (const key of criteria.order) {
      const diff = b[key] - a[key];
      if (diff !== 0) return diff;
    }

    return a.name.localeCompare(b.name);
  });
  const expectedGameCount = (rows.length * (rows.length - 1)) / 2;
  const allGroupGamesFinished = groupGames.length === expectedGameCount && groupGames.every((game) => (
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
      baseRows[end].bal === baseRows[start].bal &&
      baseRows[end].pts === baseRows[start].pts
    ) {
      end += 1;
    }

    const tiedRows = baseRows.slice(start, end);
    const manualOrder = getCopinhaManualTieOrder(tiedRows, storedTieOrder);

    if (tiedRows.length === 1) {
      rankedRows.push(tiedRows[0]);
    } else if (manualOrder) {
      rankedRows.push(...[...tiedRows].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id)));
    } else {
      unresolvedTieIds.push(...tiedRows.map((row) => row.id));
      rankedRows.push(...tiedRows);
    }

    start = end;
  }

  return { rows: rankedRows, unresolvedTieIds };
}

function calculateCupGroupRankings(data, rankingCriteriaValue = defaultRankingCriteria) {
  const cupConfig = data.cupConfig || {};
  const teamCount = cupConfig.teamCount || 12;
  const format = getCupFormat(data);
  const groups = createCupGroups(teamCount, format);
  const teamNames = data.players.teams.map((t) => getTeamName(t));
  const criteria = getRankingCriteria(rankingCriteriaValue);
  const winningScore = getWinningScore(data);
  const isCopinha = isCopinhaData(data);
  const isCearense = isCearenseData(data);
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

    if (isCearense) {
      const ranked = rankCearenseGroupRows(
        rows,
        groupGames,
        winningScore,
        criteria,
        tieBreakOverrides[String(group.id)]
      );

      return {
        ...group,
        rows: ranked.rows,
        unresolvedTieIds: ranked.unresolvedTieIds,
        rankingMode: "cearense",
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

function compareCearenseCampaignMetrics(first, second) {
  const firstPlayed = Math.max(1, Number(first.played) || 0);
  const secondPlayed = Math.max(1, Number(second.played) || 0);

  for (const key of ["w", "bal", "pts"]) {
    const difference = Number(second[key] || 0) * firstPlayed - Number(first[key] || 0) * secondPlayed;
    if (difference !== 0) return difference;
  }

  return 0;
}

function haveSameCearenseCampaign(first, second) {
  const firstPlayed = Math.max(1, Number(first.played) || 0);
  const secondPlayed = Math.max(1, Number(second.played) || 0);

  return ["w", "bal", "pts"].every((key) => (
    Number(first[key] || 0) * secondPlayed === Number(second[key] || 0) * firstPlayed
  ));
}

function greatestCommonDivisor(first, second) {
  let a = Math.abs(Number(first) || 0);
  let b = Math.abs(Number(second) || 0);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a || 1;
}

function getReducedRatio(value, divisor) {
  const safeDivisor = Math.max(1, Number(divisor) || 0);
  const commonDivisor = greatestCommonDivisor(value, safeDivisor);
  return `${Number(value || 0) / commonDivisor}/${safeDivisor / commonDivisor}`;
}

function getCearenseCampaignTieKey(scope, row) {
  return `${scope}:${getReducedRatio(row.w, row.played)}:${getReducedRatio(row.bal, row.played)}:${getReducedRatio(row.pts, row.played)}`;
}

function rankCearenseCampaignEntries(entries, storedOverrides, scope) {
  const baseEntries = [...entries].sort((a, b) => {
    const comparison = compareCearenseCampaignMetrics(a, b);
    if (comparison !== 0) return comparison;
    if (a.groupId === b.groupId) return a.groupPosition - b.groupPosition;
    return a.name.localeCompare(b.name);
  });
  const rankedEntries = [];
  const unresolvedTies = [];

  for (let start = 0; start < baseEntries.length;) {
    let end = start + 1;

    while (end < baseEntries.length && haveSameCearenseCampaign(baseEntries[start], baseEntries[end])) {
      end += 1;
    }

    const tiedEntries = baseEntries.slice(start, end);
    const distinctGroups = new Set(tiedEntries.map((entry) => entry.groupId));

    if (tiedEntries.length === 1 || distinctGroups.size === 1) {
      rankedEntries.push(...tiedEntries);
    } else {
      const tieKey = getCearenseCampaignTieKey(scope, tiedEntries[0]);
      const manualOrder = getCopinhaManualTieOrder(tiedEntries, storedOverrides[tieKey]);

      if (manualOrder) {
        rankedEntries.push(...[...tiedEntries].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id)));
      } else {
        unresolvedTies.push({
          tieKey,
          scope,
          teamIds: tiedEntries.map((entry) => entry.id),
          rows: tiedEntries,
        });
        rankedEntries.push(...tiedEntries);
      }
    }

    start = end;
  }

  return { rows: rankedEntries, unresolvedTies };
}

function getCearenseQualified(data) {
  const groupRankings = calculateCupGroupRankings(data, data.rankingCriteria);
  const storedOverrides = data.cupConfig?.campaignTieBreakOverrides || {};
  const champions = [];
  const runnersUp = [];
  const parallel = [];

  groupRankings.forEach((group) => {
    group.rows.forEach((row, index) => {
      const entry = { ...row, groupPosition: index + 1 };

      if (index === 0) champions.push(entry);
      else if (index === 1) runnersUp.push(entry);
      else parallel.push(entry);
    });
  });

  const rankedChampions = rankCearenseCampaignEntries(champions, storedOverrides, "campeoes");
  const rankedRunnersUp = rankCearenseCampaignEntries(runnersUp, storedOverrides, "segundos");
  const rankedParallel = rankCearenseCampaignEntries(parallel, storedOverrides, "paralela");

  return {
    main: [...rankedChampions.rows, ...rankedRunnersUp.rows],
    repechage: rankedParallel.rows,
    unresolvedCampaignTies: [
      ...rankedChampions.unresolvedTies,
      ...rankedRunnersUp.unresolvedTies,
      ...rankedParallel.unresolvedTies,
    ],
  };
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

  if (format === "cearense") {
    return getCearenseQualified(data);
  }

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

  if (game.isBye) {
    if (game.ids1?.length && !game.ids2?.length) return game.ids1[0];
    if (game.ids2?.length && !game.ids1?.length) return game.ids2[0];
  }

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
    : [copy.isBye ? "BYE" : "Aguardando"];

  copy.team2 = copy.ids2?.length
    ? [getCupTeamName(data, copy.ids2[0])]
    : [copy.isBye ? "BYE" : "Aguardando"];

  return copy;
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

function getNextPowerOfTwo(value) {
  let power = 1;

  while (power < value) {
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
  if (teamCount === 32) return "Fase de 32";
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

function avoidSameGroupOpeningMatches(slots) {
  const arranged = [...slots];

  for (let index = 0; index < arranged.length; index += 2) {
    const first = arranged[index];
    const second = arranged[index + 1];

    if (!first || !second || first.groupId !== second.groupId) continue;

    let swapIndex = -1;

    for (let candidateIndex = 0; candidateIndex < arranged.length; candidateIndex += 1) {
      if (candidateIndex === index || candidateIndex === index + 1) continue;
      const candidate = arranged[candidateIndex];
      if (!candidate || candidate.groupId === first.groupId) continue;
      const preserveMainSeedType = first.groupPosition <= 2 || second.groupPosition <= 2;
      if (preserveMainSeedType && candidate.groupPosition !== second.groupPosition) continue;

      const candidatePairIndex = candidateIndex % 2 === 0 ? candidateIndex + 1 : candidateIndex - 1;
      const candidateOpponent = arranged[candidatePairIndex];

      if (!candidateOpponent || candidateOpponent.groupId !== second.groupId) {
        swapIndex = candidateIndex;
        break;
      }
    }

    if (swapIndex >= 0) {
      [arranged[index + 1], arranged[swapIndex]] = [arranged[swapIndex], arranged[index + 1]];
    }
  }

  return arranged;
}

function buildCearenseEliminationRounds(entries, bracketType, bracketTitle, includeThirdPlace = false) {
  if (!Array.isArray(entries) || entries.length < 2) return [];

  const bracketSize = getNextPowerOfTwo(entries.length);
  const seedOrder = getBracketSeedOrder(bracketSize);
  const seededSlots = avoidSameGroupOpeningMatches(
    seedOrder.map((seed) => entries[seed - 1] || null)
  );
  const openingRoundName = getEliminationRoundName(bracketSize);
  const openingGames = [];

  for (let index = 0; index < seededSlots.length; index += 2) {
    const entry1 = seededSlots[index];
    const entry2 = seededSlots[index + 1];

    openingGames.push({
      ...createCopinhaBracketGame({
        bracketType,
        roundName: openingRoundName,
        matchKey: `${bracketType}_r${bracketSize}_${openingGames.length + 1}`,
        entry1,
        entry2,
        court: openingGames.length + 1,
      }),
      isBye: Boolean(entry1) !== Boolean(entry2),
    });
  }

  const rounds = [{
    title: openingRoundName,
    bracketTitle,
    games: openingGames,
  }];
  let currentGames = openingGames;
  let currentTeamCount = bracketSize;

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

function generateCearenseBrackets(data) {
  const qualified = getCearenseQualified(data);
  const cupConfig = data.cupConfig || {};
  const mainName = cupConfig.mainBracketName || "Eliminatória Principal";
  const repechageName = cupConfig.repechageName || "Disputa Paralela";
  const mainRounds = buildCearenseEliminationRounds(qualified.main, "main", mainName, true);
  const repechageRounds = buildCearenseEliminationRounds(qualified.repechage, "repechage", repechageName);
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
  if (isCearenseData(data)) {
    return generateCearenseBrackets(data);
  }

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

function ConfirmCircuitDeleteModal({ target, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div className="confirmOverlay" role="dialog" aria-modal="true" aria-labelledby="delete-circuit-title">
      <div className="confirmBox circuitDeleteConfirmBox">
        <div className="confirmIcon"><Trash2 aria-hidden="true" /></div>
        <span className="confirmEyebrow">Excluir circuito</span>
        <h2 id="delete-circuit-title">Deseja excluir “{target.name}”?</h2>
        <p>
          O circuito será removido, mas todos os torneios vinculados continuarão salvos normalmente.
        </p>

        <div className="confirmActions">
          <button type="button" className="secondaryBtn" onClick={onCancel}>Manter circuito</button>
          <button type="button" className="deleteBtn" onClick={onConfirm}>Excluir circuito</button>
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

      setSession(data.session);
      activeUserIdRef.current = data.session?.user?.id || null;

      // A recuperação tem prioridade sobre qualquer Dashboard: o token desse
      // link só pode ser usado para trocar a senha.
      if (callbackFlow === "recovery") {
        setLoading(false);
        return;
      }

      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id, { waitForAccess: true });
      }

      if (!active) return;

      if (callbackFlow === "confirm" && data.session?.user?.email_confirmed_at) {
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
          await loadProfile(nextUserId, { waitForAccess: true });

          if (getAuthFlowFromLocation() === "confirm" && newSession?.user?.email_confirmed_at) {
            clearAuthCallbackUrl();
            setAuthFlow(null);
          }
        }
        return;
      }

      setLoading(true);
      await loadProfile(nextUserId, { waitForAccess: true });

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

  if (expired || !isActive || !hasActivePeriod) {
    return (
      <Blocked
        profile={profile}
        user={session.user}
        autoRedirect={status !== "suspended"}
      />
    );
  }

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

function PlatformSupportLinks({ contacts = PLATFORM_SUPPORT, className = "", whatsappHref = "" }) {
  return (
    <div className={`supportContactGrid ${className}`.trim()}>
      {contacts.map(({ id, label, value, href, Icon, external }) => {
        const contactHref = id === "whatsapp" && whatsappHref ? whatsappHref : href;

        return (
          <a
            key={id}
            className={`supportContactLink supportContactLink-${id}`}
            href={contactHref}
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
        );
      })}
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
  const [mode, setMode] = useState(initialMode);
  const [notice, setNotice] = useState(() => {
    if (!initialNotice) return null;
    return typeof initialNotice === "string"
      ? { type: "error", title: "Link inválido ou expirado", message: initialNotice }
      : initialNotice;
  });
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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
          },
        },
      });

      if (error) {
        console.error(error);

        if (isUserAlreadyRegisteredError(error)) {
          setFirstName("");
          setLastName("");
          setBirthDate("");
          setPassword("");
          setConfirmPassword("");
          setPendingVerificationEmail("");
          setMode("login");
          showNotice(
            "warning",
            "Este e-mail já possui uma conta",
            "Digite sua senha para entrar. Se não lembrar, clique em “Esqueci minha senha?”."
          );
          return;
        }

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
          ? "Se este endereço puder receber confirmações, enviamos um link. Abra-o para ativar sua conta e iniciar os 7 dias grátis."
          : "Sua conta foi criada e os 7 dias grátis do plano Premium já estão ativos."
      );
    } catch (error) {
      console.error(error);
      showNotice("error", "Não foi possível concluir", "Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

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
          <a href="#contato">Contato</a>
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
        <section className="landingTrialBanner" aria-labelledby="landing-trial-title">
          <div className="landingTrialSeal" aria-hidden="true">
            <Gift />
            <strong>7</strong>
            <span>dias grátis</span>
          </div>

          <div className="landingTrialCopy">
            <span>Oferta para novos usuários</span>
            <h2 id="landing-trial-title">Experimente o plano Premium completo por 7 dias</h2>
            <p>Crie sua conta e confirme o e-mail para liberar seu período gratuito.</p>
            <div className="landingTrialBenefits" aria-label="Benefícios do teste grátis">
              <span>Todos os formatos Premium</span>
              <span>Rankings e tabelas automáticas</span>
              <span>Começa após confirmar o e-mail</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              changeMode("signup");
              document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Começar teste grátis
          </button>
        </section>

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
                Selecione Super 6, Super 8, Super 10 mista, Super 12 mista, Super 16 mista, Simples 8, Copas ou Campeonato Cearense conforme a realidade do evento.
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
              <p>Escolha a ordem dos critérios entre vitórias, total de games e saldo de games.</p>
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
                "Super 10 mista",
                "Super 12 mista",
                "Super 16 mista",
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
                "Super 6 (dupla fixa)",
                "Super 8",
                "Super 8 (dupla fixa)",
                "Super 10 mista",
                "Super 12 mista",
                "Super 16 mista",
                "Gerencie vários campeonatos ao mesmo tempo",
              ]}
            />

            <PlanCard
              title="Premium"
              tag="Completo"
              price="R$ 59,90"
              text="Para quem quer liberar todos os formatos disponíveis."
              items={[
                "Super 6 (dupla fixa)",
                "Super 8",
                "Super 8 (dupla fixa)",
                "Super 10 mista",
                "Super 12 mista",
                "Super 16 mista",
                "Simples 8 (1 contra 1 por jogo)",
                "Copa - 12 ou 24 duplas",
                "Copa - 18 duplas",
                "Copa - 21 duplas",
                "Copinha - grupos de 3",
                "Campeonato Cearense",
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
              title="Super 6 (dupla fixa)"
              text="Formato com 6 duplas já definidas antes do início do campeonato. Diferente das modalidades aleatórias, aqui os parceiros permanecem juntos do começo ao fim. O sistema gera automaticamente os confrontos entre as duplas, organiza a sequência de jogos e calcula a classificação geral pelos placares lançados. É indicado quando os atletas já se inscrevem em dupla e querem disputar como equipe fixa."
            />

            <Info
              title="Super 8"
              text="Formato individual com 8 participantes, ideal para torneios rápidos. Cada atleta joga com parceiros diferentes ao longo das rodadas, evitando que uma dupla fixa determine todo o resultado. O sistema monta os confrontos automaticamente, organiza as quadras, registra os placares e calcula o ranking individual. No final, vence quem tiver melhor desempenho geral conforme os critérios definidos, como vitórias, total de games e saldo de games."
            />

            <Info
              title="Super 8 (dupla fixa)"
              text="Formato com 8 duplas fixas, indicado para torneios maiores em que cada equipe permanece igual durante toda a competição. O sistema organiza os jogos entre as duplas, distribui as rodadas e registra os resultados. A classificação é por dupla, não individual. Conforme os placares são preenchidos, o ranking geral é atualizado com vitórias, total de games e saldo de games, ajudando o organizador a acompanhar quem está avançando melhor."
            />

            <Info
              title="Super 10 mista"
              text="Formato com 5 homens e 5 mulheres. São 5 rodadas, 2 jogos por rodada, e em cada rodada descansam 1 homem e 1 mulher. Todos jogam 4 partidas e descansam 1 vez. O ranking é separado masculino e feminino."
            />

            <Info
              title="Super 12 mista"
              text="Formato misto com 12 participantes: 6 homens e 6 mulheres. Primeiro, os atletas são cadastrados e sorteados. Depois, o sistema combina os participantes para formar duplas mistas em diferentes rodadas, mantendo equilíbrio entre homens e mulheres. Cada jogador participa de jogos com combinações variadas, e o desempenho é calculado individualmente. É uma boa opção para eventos sociais e competitivos com rotação de parceiros."
            />

            <Info
              title="Super 16 mista"
              text="Formato misto com 16 participantes: 8 homens e 8 mulheres. Funciona como uma versão maior do Super 12, com mais atletas, mais jogos e maior movimentação de quadras. O sistema monta as duplas mistas de forma organizada, distribui as partidas e permite preencher os placares rodada por rodada. O ranking é individual, ou seja, cada atleta pontua pelo próprio desempenho, mesmo jogando com parceiros diferentes durante o torneio."
            />

            <Info
              title="Simples 8 (1 contra 1 por jogo)"
              text="Formato individual com 8 jogadores, sem formação de duplas. Cada atleta compete por conta própria, e o sistema monta a tabela de jogos automaticamente. É ideal para torneios de simples, desafios internos ou eventos menores. Os placares alimentam um ranking geral individual, permitindo acompanhar vitórias, total de games e saldo de games até definir os melhores colocados."
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

            <Info
              title="Campeonato Cearense"
              text="Formato para 4 a 32 duplas, com fase de grupos, Eliminatória Principal para os dois primeiros de cada grupo e Disputa Paralela para os demais. As comparações entre grupos usam percentual de vitórias, saldo médio e média de games para equilibrar grupos de tamanhos diferentes."
            />
          </div>
        </section>

        <section id="contato" className="landingSection landingSupportSection">
          <div className="landingSupportShell">
            <div className="landingSupportIntro">
              <span>Atendimento</span>
              <h2>Fale diretamente com o Torneio360</h2>
              <p>Conheça os planos, regularize seu acesso ou peça ajuda pelo canal que preferir.</p>
              <div className="landingSupportHighlight">
                <MessageCircle aria-hidden="true" />
                <span><strong>Precisa falar agora?</strong> O WhatsApp é o caminho mais rápido.</span>
              </div>
            </div>

            <PlatformSupportLinks className="landingSupportContacts" />
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

            {mode === "signup" ? (
              <div className="accessTrialCallout" role="status">
                <span className="accessTrialCalloutIcon"><Gift aria-hidden="true" /></span>
                <span>
                  <strong>Seu Premium começa com 7 dias grátis</strong>
                  <small>Confirme o e-mail depois do cadastro para ativar o teste.</small>
                </span>
              </div>
            ) : null}

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

function Blocked({ profile, user, autoRedirect = false }) {
  const regularizationUrl = getPlanRegularizationWhatsAppUrl(profile, user);

  useEffect(() => {
    if (!autoRedirect) return undefined;

    const timer = window.setTimeout(() => {
      window.location.assign(regularizationUrl);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [autoRedirect, regularizationUrl]);

  return (
    <div className="blockedAccessPage">
      <main className="blockedAccessCard" aria-labelledby="blocked-access-title">
        <BeachLogo variant="blue" />

        <div className="blockedAccessIcon" aria-hidden="true"><MessageCircle /></div>
        <span className="blockedAccessEyebrow">Acesso e assinatura</span>
        <h1 id="blocked-access-title">Seu período gratuito terminou</h1>
        <p>Para continuar organizando seus torneios, fale com o Torneio360 e regularize o pagamento do seu plano.</p>

        <dl className="blockedAccessSummary">
          <div><dt>Plano</dt><dd>{profile.plan || "Não informado"}</dd></div>
          <div><dt>Status</dt><dd>{formatStatusBR(profile.status)}</dd></div>
          <div><dt>Vencimento</dt><dd>{profile.expires_at ? formatDateBR(profile.expires_at) : "Não definido"}</dd></div>
        </dl>

        {autoRedirect ? (
          <div className="blockedRedirectNotice" role="status" aria-live="polite">
            <span aria-hidden="true" />
            Abrindo o atendimento no WhatsApp...
          </div>
        ) : null}

        <a className="blockedWhatsappButton" href={regularizationUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" />
          Regularizar pelo WhatsApp
        </a>

        <p className="blockedAccessFallback">Se o WhatsApp não abrir automaticamente, toque no botão acima.</p>

        <PlatformSupportLinks
          contacts={PLATFORM_SUPPORT.filter(({ id }) => id !== "whatsapp")}
          className="blockedAlternativeContacts"
        />

        <button type="button" className="blockedSignOutButton" onClick={logout}>Sair da conta</button>
      </main>
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
  const [colorMode, setColorMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem(`torneio360:color-mode:${user.id}`);
      if (savedMode === "light" || savedMode === "dark") return savedMode;
    } catch {
      // A preferência continua funcional durante a sessão mesmo sem armazenamento local.
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [circuits, setCircuits] = useState([]);
  const [circuitForm, setCircuitForm] = useState({ id: null, name: "", startDate: "", endDate: "", status: "active", tournamentIds: [] });
  const [circuitEditForm, setCircuitEditForm] = useState(null);
  const [circuitDeleteTarget, setCircuitDeleteTarget] = useState(null);
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

    if (Object.prototype.hasOwnProperty.call(next, "tournamentTab")) {
      if (next.tournamentTab) params.set("tab", next.tournamentTab);
      else params.delete("tab");
    }

    if (Object.prototype.hasOwnProperty.call(next, "matchesTab")) {
      if (next.matchesTab) params.set("partidas", next.matchesTab);
      else params.delete("partidas");
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
    setActivePanel(panel);
    updateAppUrl({ activePanel: panel, selectedTournamentId: null });
  }

  function openProfileSection(nextSubtab = "editar") {
    setProfileMenuOpen(false);
    setSelected(null);
    setProfileSubtab(nextSubtab);
    setActivePanel("ajustes");
    updateAppUrl({ activePanel: "ajustes", selectedTournamentId: null, profileSubtab: nextSubtab });
  }

  function openProfileSettings() {
    openProfileSection("editar");
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
      description: "Crie um novo torneio ou continue gerenciando os já cadastrados.",
    },
    circuitos: {
      title: "Circuitos",
      description: "Organize temporadas e acompanhe a classificação entre torneios.",
    },
    modalidades: {
      title: "Modalidades",
      description: "Consulte os formatos disponíveis para o seu plano.",
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

  const groupedTournaments = tournaments.reduce((groups, item) => {
    const groupKey = item.data?.eventGroupKey || item.id;
    const groupName = item.data?.eventName || item.name;
    const existing = groups.find((group) => group.key === groupKey);

    if (existing) existing.items.push(item);
    else groups.push({ key: groupKey, name: groupName, items: [item] });

    return groups;
  }, []);

  const multiTournamentGroups = groupedTournaments.filter((group) => group.items.length > 1);
  const isolatedTournaments = groupedTournaments.flatMap((group) => group.items.length === 1 ? group.items : []);

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
      status: normalizeCircuitStatus(row.status),
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

    const loadedCircuits = baseCircuits.map((circuit) => ({
      ...circuit,
      rankingHistory: historyByCircuit[circuit.id] || {},
    }));

    setCircuits(loadedCircuits);
    return loadedCircuits;
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
    setCircuitForm({ id: null, name: "", startDate: "", endDate: "", status: "active", tournamentIds: [] });
  }

  function toggleCircuitTournament(tournamentId, editing = false) {
    const updateForm = editing ? setCircuitEditForm : setCircuitForm;
    updateForm((prev) => {
      if (!prev) return prev;
      const selected = prev.tournamentIds.includes(tournamentId);
      return {
        ...prev,
        tournamentIds: selected
          ? prev.tournamentIds.filter((id) => id !== tournamentId)
          : [...prev.tournamentIds, tournamentId],
      };
    });
  }

  async function saveCircuit(form = circuitForm) {
    if (!form?.name.trim()) {
      showNotice("warning", "Nome obrigatório", "Digite um nome para o circuito.");
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      showNotice("warning", "Período inválido", "A data final não pode ser anterior à data inicial.");
      return;
    }

    const isEditing = Boolean(form.id);

    const rowPayload = {
      user_id: user.id,
      name: form.name.trim(),
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      status: normalizeCircuitStatus(form.status),
      tournament_ids: form.tournamentIds || [],
      updated_at: new Date().toISOString(),
    };

    const query = isEditing
      ? supabase.from("circuits").update(rowPayload).eq("id", form.id).eq("user_id", user.id).select("*").single()
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

    const nextCircuits = isEditing
      ? circuits.map((item) => item.id === form.id ? finalPayload : item)
      : [finalPayload, ...circuits];

    saveCircuits(nextCircuits);
    await saveCircuitHistoryToSupabase(finalPayload.id, finalPayload.rankingHistory);
    await syncPublicArenaDirectory(tournaments, nextCircuits);
    if (isEditing) setCircuitEditForm(null);
    else resetCircuitForm();
    showNotice("success", isEditing ? "Circuito atualizado" : "Circuito criado", "As alterações foram salvas no Supabase.");
  }

  function editCircuit(circuit) {
    setCircuitEditForm({
      id: circuit.id,
      name: circuit.name || "",
      startDate: circuit.startDate || "",
      endDate: circuit.endDate || "",
      status: normalizeCircuitStatus(circuit.status),
      tournamentIds: Array.isArray(circuit.tournamentIds) ? circuit.tournamentIds : [],
    });
  }

  async function deleteCircuit() {
    if (!circuitDeleteTarget) return;
    const circuitId = circuitDeleteTarget.id;
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

    const nextCircuits = circuits.filter((item) => item.id !== circuitId);
    saveCircuits(nextCircuits);
    await syncPublicArenaDirectory(tournaments, nextCircuits);
    if (circuitEditForm?.id === circuitId) setCircuitEditForm(null);
    setCircuitDeleteTarget(null);
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
      const config = modalityConfig[tournament.type];
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
    if (!user?.id || profileSaving) return;
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
      return;
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

  async function syncPublicArenaDirectory(nextTournaments = tournaments, nextCircuits = circuits) {
    const activeTournaments = (nextTournaments || []).filter((item) => !item.data?.deletedAt);
    if (!activeTournaments.length) return [];

    const normalizedTournaments = activeTournaments.map((item) => ({
      ...item,
      public_id: item.public_id || generatePublicId(),
      is_public: true,
    }));
    const tournamentDirectory = normalizedTournaments.map(getPublicTournamentDirectoryItem);
    const circuitDirectory = (nextCircuits || []).map(getPublicCircuitDirectoryItem);
    const currentOrganizer = buildTournamentPublicInfo().organizer;

    const updatedTournaments = await Promise.all(normalizedTournaments.map(async (item) => {
      const existingPublicInfo = item.data?.publicInfo || {};
      const nextData = {
        ...(item.data || {}),
        publicInfo: {
          ...existingPublicInfo,
          visibility: existingPublicInfo.visibility || { ...newPublicInfo },
          organizer: currentOrganizer,
        },
        publishedOnProfile: true,
        publishedAt: item.data?.publishedAt || new Date().toISOString(),
        publicArenaDirectory: tournamentDirectory,
        publicArenaCircuits: circuitDirectory,
      };

      const { error } = await supabase
        .from("tournaments")
        .update({
          public_id: item.public_id,
          is_public: true,
          data: nextData,
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) {
        console.warn("Não foi possível atualizar o diretório público da arena:", error);
        return item;
      }

      return { ...item, data: nextData };
    }));

    setTournaments(updatedTournaments);
    return updatedTournaments;
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
    const activeTournaments = validTournaments.filter((item) => !item.data?.deletedAt);
    setTournaments(activeTournaments);
    setTrashTournaments(validTournaments.filter((item) => item.data?.deletedAt));
    return activeTournaments;
  }

  async function openArenaProfile(arena) {
    setSelectedArenaProfile(arena);
    setSelectedArenaTournaments([]);
    setSelectedArenaLoading(true);

    const result = await supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", arena.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

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
    async function loadDashboardData() {
      const [loadedTournaments, loadedCircuits] = await Promise.all([
        loadTournaments(),
        loadCircuits(),
      ]);

      if (loadedTournaments?.length) {
        await syncPublicArenaDirectory(loadedTournaments, loadedCircuits || []);
      }

      await loadPublicArenaProfiles();
    }

    void loadDashboardData();
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

    if (!newType) {
  showNotice("warning", "Modalidade obrigatória", "Escolha a modalidade do torneio.");
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

    const config = modalityConfig[newType];
    const isMultiCategory = newMultiCategoryEvent === "sim";
    const validCategorySchedules = newCategorySchedules.filter((item) => item.category.trim());

    if (isMultiCategory && validCategorySchedules.length === 0) {
      showNotice("warning", "Categoria obrigatória", "Adicione pelo menos uma categoria para este evento.");
      return;
    }

    setSaving(true);

    const baseData = {
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
      publishedOnProfile: true,
      publishedAt: new Date().toISOString(),
    };

    const rowsToInsert = isMultiCategory
      ? validCategorySchedules.map((item) => ({
          user_id: user.id,
          public_id: generatePublicId(),
          is_public: true,
          name: item.category.trim(),
          type: newType,
          data: {
            ...createInitialData(newType, config),
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
          public_id: generatePublicId(),
          is_public: true,
          name: newName.trim(),
          type: newType,
          data: {
            ...createInitialData(newType, config),
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
    const refreshedTournaments = await loadTournaments();
    await syncPublicArenaDirectory(refreshedTournaments || [], circuits);
    showNotice("success", isMultiCategory ? "Torneios criados" : "Torneio criado", isMultiCategory ? "As categorias foram criadas como torneios separados dentro do mesmo evento." : "O torneio foi criado com sucesso.");
  }

  async function confirmDeleteTournament() {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from("tournaments")
      .update({
        is_public: false,
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
    const refreshedTournaments = await loadTournaments();
    await syncPublicArenaDirectory(refreshedTournaments || [], circuits);
    showNotice("success", "Torneio movido para a lixeira", "Você pode recuperar este torneio em até 30 dias.");
  }

  async function restoreTournament(tournament) {
    const restoredData = { ...(tournament.data || {}) };
    delete restoredData.deletedAt;

    const { error } = await supabase
      .from("tournaments")
      .update({
        public_id: tournament.public_id || generatePublicId(),
        is_public: true,
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

    const refreshedTournaments = await loadTournaments();
    await syncPublicArenaDirectory(refreshedTournaments || [], circuits);
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

    updateAppUrl({
      activePanel: "criar",
      selectedTournamentId: data.id,
      tournamentTab: "participantes",
      matchesTab: "grupos",
    });
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
      type: tournament.type || "",
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

    const nextTournaments = tournaments.map((t) => (t.id === updated.id ? updated : t));
    setTournaments(nextTournaments);
    await syncPublicArenaDirectory(nextTournaments, circuits);
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
      { panel: "circuitos", label: "Circuitos", Icon: GitBranch },
      { panel: "modalidades", label: "Modalidades", Icon: Shapes },
    ];

    return (
      <aside className="playSidebar proSidebar" aria-label="Navegação principal">
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
        <div className="sidebarBrandAccent" aria-hidden="true">
          <span />
          <small>Torneio 360</small>
        </div>
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
              <button type="button" className="profileTrigger" onClick={openProfileSettings} title="Abrir configurações do perfil">
                <span className="profileAvatar" aria-hidden="true">
                  {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="" /> : <span>{profileInitials}</span>}
                </span>
                <span className="profileTriggerCopy">
                  <strong>{profileDisplayName}</strong>
                  <small>Configurações do perfil</small>
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
                  <Settings aria-hidden="true" />
                  <span><strong>Meu perfil</strong><small>Dados e foto da arena</small></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`profileDropdownItem ${activePanel === "ajustes" && profileSubtab === "conta" ? "profileDropdownCurrent" : ""}`}
                  onClick={() => openProfileSection("conta")}
                  aria-current={activePanel === "ajustes" && profileSubtab === "conta" ? "page" : undefined}
                >
                  <LifeBuoy aria-hidden="true" />
                  <span><strong>Ajuda e suporte</strong><small>WhatsApp, Instagram e e-mail</small></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`profileDropdownItem ${activePanel === "lixeira" ? "profileDropdownCurrent" : ""}`}
                  onClick={() => { setProfileMenuOpen(false); goToPanel("lixeira"); }}
                  aria-current={activePanel === "lixeira" ? "page" : undefined}
                >
                  <Trash2 aria-hidden="true" />
                  <span><strong>Lixeira</strong><small>Itens excluídos recentemente</small></span>
                </button>
                <div className="profileDropdownDivider" />
                <button type="button" role="menuitem" className="profileDropdownItem profileDropdownLogout" onClick={logout}>
                  <LogOut aria-hidden="true" />
                  <span><strong>Sair</strong><small>Encerrar esta sessão</small></span>
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
      <div className={`playAppShell proDashboard theme-${colorMode}`}>
        {renderAppSidebar()}
        <div className="playMain">
          {renderAppTopbar()}
          <main className="playContent tournamentWorkspaceContent">
            <TournamentErrorBoundary tournamentId={selected.id} onBack={closeSelectedTournament}>
              <TournamentScreen
                key={selected.id}
                tournament={selected}
                userId={user.id}
                onBack={closeSelectedTournament}
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
    <div className={`playAppShell proDashboard theme-${colorMode}`}>
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />

      <ConfirmModal
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTournament}
      />

      <ConfirmCircuitDeleteModal
        target={circuitDeleteTarget}
        onCancel={() => setCircuitDeleteTarget(null)}
        onConfirm={deleteCircuit}
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
                <p>O link abre o perfil público da arena, com seus torneios e circuitos para consulta sem login.</p>
              </div>
            </div>

            <div className="editTournamentActions">
              <button type="button" className="cancelBtn" onClick={() => setShareTarget(null)}>Cancelar</button>
              <button type="button" onClick={confirmShareTarget} disabled={shareTargetSaving}>
                <Share2 aria-hidden="true" />
                {shareTargetSaving ? "Preparando..." : "Copiar link do perfil"}
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
                <label>Modalidade</label>
                <select value={editForm.type} onChange={(e) => updateEditForm("type", e.target.value)}>
                  {allowedTypes.map((type) => <option key={type} value={type}>{getModalityDisplayName(type)}</option>)}
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

      {circuitEditForm ? (
        <div className="editTournamentOverlay" role="dialog" aria-modal="true" aria-labelledby="edit-circuit-title">
          <div className="editTournamentModal circuitEditModal">
            <div className="editTournamentHeader">
              <div>
                <span className="modalEyebrow">Circuitos</span>
                <h2 id="edit-circuit-title">Editar circuito</h2>
                <p>Atualize os dados e os torneios vinculados sem sair desta tela.</p>
              </div>
              <button type="button" className="secondaryBtn" onClick={() => setCircuitEditForm(null)}>Fechar</button>
            </div>

            <div className="editTournamentGrid circuitEditGrid">
              <div className="formField fullField">
                <label>Nome do circuito</label>
                <input value={circuitEditForm.name} onChange={(e) => setCircuitEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Circuito Verão" />
              </div>
              <div className="formField">
                <label>Data inicial</label>
                <input className="clickableDateInput" type="date" value={circuitEditForm.startDate} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => setCircuitEditForm((prev) => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div className="formField">
                <label>Data final</label>
                <input className="clickableDateInput" type="date" value={circuitEditForm.endDate} min={circuitEditForm.startDate || undefined} onClick={openDatePicker} onFocus={openDatePicker} onChange={(e) => setCircuitEditForm((prev) => ({ ...prev, endDate: e.target.value }))} />
              </div>
              <div className="formField fullField">
                <label>Status</label>
                <select value={circuitEditForm.status} onChange={(e) => setCircuitEditForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="active">Em andamento</option>
                  <option value="closed">Encerrado</option>
                </select>
              </div>
            </div>

            <div className="circuitTournamentPicker circuitEditTournamentPicker">
              <div className="circuitPickerTitle">
                <strong>Torneios deste circuito</strong>
                <span>{circuitEditForm.tournamentIds.length} selecionado(s)</span>
              </div>
              {tournaments.length === 0 ? (
                <p>Nenhum torneio criado ainda.</p>
              ) : (
                <div className="circuitTournamentList">
                  {tournaments.map((t) => {
                    const details = t.data || {};
                    const checked = circuitEditForm.tournamentIds.includes(t.id);
                    return (
                      <label className={`circuitTournamentOption ${checked ? "selected" : ""}`} key={t.id}>
                        <input type="checkbox" checked={checked} onChange={() => toggleCircuitTournament(t.id, true)} />
                        <span className="circuitCheckVisual">{checked ? "✓" : ""}</span>
                        <span className="circuitTournamentText">
                          <strong>{details.eventName || t.name}</strong>
                          <small>{[t.name, getModalityDisplayName(t.type), details.eventDate ? formatDateBR(details.eventDate) : null].filter(Boolean).join(" · ")}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="editTournamentActions">
              <button type="button" className="secondaryBtn" onClick={() => setCircuitEditForm(null)}>Cancelar</button>
              <button type="button" onClick={() => saveCircuit(circuitEditForm)}>Salvar alterações</button>
            </div>
          </div>
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
            <div>
              <span className="pageEyebrow">Painel de gestão</span>
              <h1>{currentPanelMeta.title}</h1>
              <p>{currentPanelMeta.description}</p>
            </div>
            <div className="playPlanPill">Plano {profile.plan} · {formatStatusBR(profile.status)}</div>
          </section>

          {freeTrialDetails ? <FreeTrialNotice details={freeTrialDetails} /> : null}

          {activePanel === "inicio" && (
            <>
              <section className="playTabs homeQuickActions homeQuickActionsThree" aria-label="Ações rápidas">
                <button type="button" className="primaryQuickAction" onClick={() => goToPanel("criar")}><PlusCircle aria-hidden="true" /> Novo torneio</button>
                <button type="button" onClick={() => goToPanel("circuitos")}><GitBranch aria-hidden="true" /> Circuitos</button>
                <button type="button" onClick={() => goToPanel("modalidades")}><Shapes aria-hidden="true" /> Modalidades</button>
              </section>

              <section className="playStatsGrid">
                <div><strong>{tournaments.length}</strong><span>Torneios criados</span></div>
                <div><strong>{circuits.length}</strong><span>Circuitos cadastrados</span></div>
                <div><strong>{allowedTypes.length}</strong><span>Modalidades disponíveis</span></div>
              </section>
            </>
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
    {selectedArenaProfile.phone ? <a href={getBrazilianWhatsAppUrl(selectedArenaProfile.phone)} target="_blank" rel="noreferrer">WhatsApp</a> : null}
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
              <small>{getModalityDisplayName(t.type)}</small>
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
              <button type="button" onClick={() => window.open(getBrazilianWhatsAppUrl(selectedArenaProfile.phone), "_blank", "noopener,noreferrer")}>Inscreva-se</button>
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
        placeholder="Busque perfis públicos da plataforma..."
      />
      <span>🔍</span>
    </div>

    <button
      type="button"
      className="mapsMiniBtn"
      onClick={() => window.open("https://www.google.com/maps/search/arena+beach+tennis+perto+de+mim", "_blank", "noopener,noreferrer")}
    >
      Google Maps
    </button>
  </div>

  <div className="arenaFeedGrid">
    {filteredArenaProfiles.map((arena) => (
      <article className="arenaFeedCard" key={arena.id}>
        <div className="arenaFeedCover registeredArenaCover">
          {arena.photo_url ? <img src={arena.photo_url} alt={arena.arena_name || arena.name || "Arena"} /> : <span>{(arena.arena_name || arena.name || "Arena").slice(0, 2).toUpperCase()}</span>}
        </div>
        <strong>{arena.arena_name || arena.name || "Arena cadastrada"}</strong>
        <small><MapPin aria-hidden="true" /> {[arena.city, arena.state].filter(Boolean).join("/") || "Local não informado"}</small>
        <button type="button" onClick={() => openArenaProfile(arena)}>Acessar arena</button>
      </article>
    ))}
  </div>
</section>
)}

    {activePanel === "criar" && (
    <>
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
    <label>Modalidade</label>
    <select value={newType} onChange={(e) => setNewType(e.target.value)}>
      <option value="">Escolha a modalidade</option>
      {allowedTypes.map((type) => (
        <option key={type} value={type}>{getModalityDisplayName(type)}</option>
      ))}
    </select>
  </div>

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

 <button type="button" onClick={createTournament} disabled={saving}>
  {saving ? "Salvando..." : "Criar torneio"}
</button>
      </section>

<section id="historico-torneios" className="card">
  <h2>Histórico de torneios criados</h2>

  {tournaments.length === 0 ? (
    <p>Nenhum torneio criado ainda.</p>
  ) : (false) ? (
    <p></p>
  ) : (
    <div className="eventGroupList">
      {isolatedTournaments.length > 0 && (
        <div className="tournamentList isolatedTournamentGrid">
          {isolatedTournaments.map((t) => {
            const details = t.data || {};

            return (
                <div
                  className={`tournamentItem ${draggedTournamentId === t.id ? "dragging" : ""}`}
                  key={t.id}
                  onDragOver={(e) => e.preventDefault()}
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
                    onDragStart={(e) => {
                      setDraggedTournamentId(t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggedTournamentId(null)}
                  >
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </button>

                  <div className="tournamentInfo">
                    <div className="tournamentTitleRow">
                      <strong>{t.name}</strong>
                      <span className="tournamentTypeBadge">{getModalityDisplayName(t.type)}</span>
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
                </div>
            );
          })}
        </div>
      )}

      {multiTournamentGroups.map((group) => (
        <div className="eventGroupCard" key={group.key}>
          <div className="eventGroupHeader">
            <strong>{group.name}</strong>
            <span>{group.items.length} categorias</span>
          </div>

          <div className="tournamentList eventTournamentGrid">
            {group.items.map((t) => {
              const details = t.data || {};

              return (
                <div
                  className={`tournamentItem ${draggedTournamentId === t.id ? "dragging" : ""}`}
                  key={t.id}
                  onDragOver={(e) => e.preventDefault()}
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
                    onDragStart={(e) => {
                      setDraggedTournamentId(t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggedTournamentId(null)}
                  >
                    <span>—</span>
                    <span>—</span>
                    <span>—</span>
                  </button>

                  <div className="tournamentInfo">
                    <div className="tournamentTitleRow">
                      <strong>{t.name}</strong>
                      <span className="tournamentTypeBadge">{getModalityDisplayName(t.type)}</span>
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  )}
</section>
    </>
    )}


{activePanel === "circuitos" && (
  <section className="card circuitsCard">
    <div className="circuitsHeader">
      <div>
        <h2>Novo circuito</h2>
        <p>Crie períodos flexíveis e escolha manualmente quais torneios entram. Isso não altera os torneios já criados.</p>
      </div>
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
          <option value="active">Em andamento</option>
          <option value="closed">Encerrado</option>
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
                  <small>{[t.name, getModalityDisplayName(t.type), details.eventDate ? formatDateBR(details.eventDate) : null].filter(Boolean).join(" · ")}</small>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>

    <div className="circuitFormActions">
      <button type="button" onClick={() => saveCircuit()}>Criar circuito</button>
    </div>

    <div className="circuitsList">
      <h2>Circuitos criados</h2>
      {circuits.length === 0 ? (
        <p>Nenhum circuito criado ainda.</p>
      ) : circuits.map((circuit) => {
        const selectedNames = getCircuitSelectedTournaments(circuit);
        const circuitStatus = normalizeCircuitStatus(circuit.status);
        const isExpanded = expandedCircuitId === circuit.id;
        return (
          <article className={`circuitItem ${isExpanded ? "expanded" : ""}`} key={circuit.id}>
            <button
              type="button"
              className="circuitItemSummary"
              aria-expanded={isExpanded}
              onClick={() => { const nextId = isExpanded ? null : circuit.id; setExpandedCircuitId(nextId); scheduleUserAppStateSave({ circuitId: nextId, activePanel: "circuitos" }); }}
            >
              <div className="circuitSummaryIdentity">
                <span className="circuitMonogram">CIR</span>
                <div className="circuitItemMain">
                  <div className="circuitTitleLine">
                    <h3>{circuit.name}</h3>
                    <span className={`circuitStatus circuitStatus-${circuitStatus}`}>
                      {circuitStatus === "closed" ? "Encerrado" : "Em andamento"}
                    </span>
                  </div>
                  <p><CalendarDays aria-hidden="true" /> {circuit.startDate ? formatDateBR(circuit.startDate) : "Sem início"} até {circuit.endDate ? formatDateBR(circuit.endDate) : "sem fim definido"}</p>
                  <small>{selectedNames.length} torneio(s) · {selectedNames.length ? selectedNames.map((t) => t.data?.eventName || t.name).join(", ") : "nenhum selecionado"}</small>
                </div>
              </div>
              <span className="circuitExpandIcon" aria-hidden="true"><ChevronDown /></span>
            </button>

            {isExpanded ? (() => {
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
                            <em>Total de Games: {row.pts}</em>
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

            {isExpanded ? (
              <div className="circuitItemActions">
                <button type="button" className="editBtn" onClick={() => editCircuit(circuit)}>Editar circuito</button>
                <button type="button" className="deleteBtn" onClick={() => setCircuitDeleteTarget(circuit)}>Excluir circuito</button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  </section>
)}

{activePanel === "modalidades" && (
<section className="card">
  <h2>Modalidades liberadas</h2>
  <div className="modalitiesGrid internalModalities">
    {allowedTypes.includes("Super 12 Mista (Dupla Fixa)") && (
      <Info
        title="Super 6 (dupla fixa)"
        text="Formato com 6 duplas já definidas antes do início do campeonato. Diferente das modalidades aleatórias, aqui os parceiros permanecem juntos do começo ao fim. O sistema gera automaticamente os confrontos entre as duplas, organiza a sequência de jogos e calcula a classificação geral pelos placares lançados. É indicado quando os atletas já se inscrevem em dupla e querem disputar como equipe fixa."
      />
    )}

    {allowedTypes.includes("Super 08") && (
      <Info
        title="Super 8"
        text="Formato individual com 8 participantes, ideal para torneios rápidos. Cada atleta joga com parceiros diferentes ao longo das rodadas, evitando que uma dupla fixa determine todo o resultado. O sistema monta os confrontos automaticamente, organiza as quadras, registra os placares e calcula o ranking individual. No final, vence quem tiver melhor desempenho geral conforme os critérios definidos, como vitórias, total de games e saldo de games."
      />
    )}

    {allowedTypes.includes("Super 16 Mista (Dupla Fixa)") && (
      <Info
        title="Super 8 (dupla fixa)"
        text="Formato com 8 duplas fixas, indicado para torneios maiores em que cada equipe permanece igual durante toda a competição. O sistema organiza os jogos entre as duplas, distribui as rodadas e registra os resultados. A classificação é por dupla, não individual. Conforme os placares são preenchidos, o ranking geral é atualizado com vitórias, total de games e saldo de games, ajudando o organizador a acompanhar quem está avançando melhor."
      />
    )}

    {allowedTypes.includes("Super 10 Mista (Dupla Aleatória)") && (
      <Info
        title="Super 10 mista"
        text="Formato misto com 10 participantes: 5 homens e 5 mulheres. São 5 rodadas, com 2 jogos por rodada, e em cada rodada descansam 1 homem e 1 mulher. Ao final, todos jogam 4 partidas e descansam 1 vez. O sistema monta automaticamente as duplas mistas, organiza as quadras, registra os placares e calcula rankings separados masculino e feminino. É ideal para torneios de hoje, eventos rápidos e grupos menores, mantendo equilíbrio de jogos entre todos os atletas."
      />
    )}

    {allowedTypes.includes("Super 12 Mista (Dupla Aleatória)") && (
      <Info
        title="Super 12 mista"
        text="Formato misto com 12 participantes: 6 homens e 6 mulheres. Primeiro, os atletas são cadastrados e sorteados. Depois, o sistema combina os participantes para formar duplas mistas em diferentes rodadas, mantendo equilíbrio entre homens e mulheres. Cada jogador participa de jogos com combinações variadas, e o desempenho é calculado individualmente. É uma boa opção para eventos sociais e competitivos com rotação de parceiros."
      />
    )}

    {allowedTypes.includes("Super 16 Mista (Dupla Aleatória)") && (
      <Info
        title="Super 16 mista"
        text="Formato misto com 16 participantes: 8 homens e 8 mulheres. Funciona como uma versão maior do Super 12, com mais atletas, mais jogos e maior movimentação de quadras. O sistema monta as duplas mistas de forma organizada, distribui as partidas e permite preencher os placares rodada por rodada. O ranking é individual, ou seja, cada atleta pontua pelo próprio desempenho, mesmo jogando com parceiros diferentes durante o torneio."
      />
    )}

    {allowedTypes.includes("Simples 8") && (
      <Info
        title="Simples 8 (1 contra 1 por jogo)"
        text="Formato individual com 8 jogadores, sem formação de duplas. Cada atleta compete por conta própria, e o sistema monta a tabela de jogos automaticamente. É ideal para torneios de simples, desafios internos ou eventos menores. Os placares alimentam um ranking geral individual, permitindo acompanhar vitórias, total de games e saldo de games até definir os melhores colocados."
      />
    )}

    {allowedTypes.includes("Copa - 12 ou 24 duplas") && (
      <Info
        title="Copa - 12 ou 24 duplas"
        text="Formato de Copa para 12 ou 24 duplas, pensado para eventos mais completos. As duplas são organizadas em fase de grupos, jogam partidas classificatórias e depois avançam para as chaves finais conforme o desempenho. O sistema permite trabalhar com chave principal e repescagem, além de nomes editáveis para adaptar à regra do seu evento. É indicado para torneios com estrutura de campeonato, fases eliminatórias e premiação por colocação."
      />
    )}

    {allowedTypes.includes("Copa - 18 duplas") && (
      <Info
        title="Copa - 18 duplas"
        text="Formato de Copa com 18 duplas, dividido em 6 grupos de 3 duplas. Cada grupo joga sua fase classificatória, e o sistema calcula a classificação com base nos critérios definidos. Os melhores avançam para a chave principal; os 2 melhores gerais podem receber BYE, entrando em fase mais avançada. Também há disputa paralela para duplas específicas, como terceiros colocados, permitindo manter mais atletas em atividade. É um formato ideal para torneios grandes, com organização mais profissional e várias fases."
      />
    )}

    {allowedTypes.includes("Copinha - grupos de 3") && (
      <Info
        title="Copinha - grupos de 3"
        text="Formato configurável de 6 a 36 duplas. Cada grupo tem três duplas; 1º e 2º avançam para a Chave Principal e, a partir de 3 grupos, os 3º colocados disputam a Consolação."
      />
    )}
    {allowedTypes.includes("Campeonato Cearense") && (
      <Info
        title="Campeonato Cearense"
        text="Formato de 4 a 32 duplas. Os dois primeiros de cada grupo seguem para a Eliminatória Principal e os demais para a Disputa Paralela. Entre grupos, a ordem é equilibrada por percentual de vitórias, saldo médio e média de games por partida."
      />
    )}
  </div>
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
                <span className="tournamentTypeBadge">{getModalityDisplayName(t.type)}</span>
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
                <span className="tournamentTypeBadge">{getModalityDisplayName(t.type)}</span>
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

        <PlatformSupportLinks />
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

function createInitialData(type, config) {
  const base = {
  rankingCriteria: defaultRankingCriteria,
  winningScore: 4,
  gender: "",
  eventDate: "",
  eventDay: "",
  location: "",
  schedule: [],
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
    };
  }

  if (isCupType(config)) {
    return {
      ...base,
      cupConfig: {
        format: config.cupMode || "standard",
        teamCount: config.defaultTeams,
        mainBracketName: config.defaultMainBracketName,
        repechageName: config.defaultRepechageName,
        tieBreakOverrides: {},
        groupTieBreakOverrides: {},
        campaignTieBreakOverrides: {},
      },
      players: {
        teams: Array.from({ length: config.defaultTeams }, (_, i) => ({
          a: `Atleta 1 da dupla ${i + 1}`,
          b: `Atleta 2 da dupla ${i + 1}`,
        })),
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
  const config = modalityConfig[type];

  if (!config) {
    return isTournamentDataObject(rawData) ? rawData : createInitialData(type, config);
  }

  const defaults = createInitialData(type, config);
  const source = isTournamentDataObject(rawData) ? rawData : {};
  const sourcePlayers = isTournamentDataObject(source.players) ? source.players : {};
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
        campaignTieBreakOverrides: isTournamentDataObject(sourceCupConfig.campaignTieBreakOverrides)
          ? sourceCupConfig.campaignTieBreakOverrides
          : {},
      },
      players: {
        teams: normalizeTeams(sourcePlayers.teams, teamCount),
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
    };
  }

  if (config.type === "fixed12" || config.type === "fixed16") {
    return {
      ...normalized,
      players: {
        teams: normalizeTeams(sourcePlayers.teams, config.teams),
      },
    };
  }

  return {
    ...normalized,
    players: normalizeNameList(source.players, config.total, config.label),
  };
}

function needsTournamentDataRepair(type, rawData) {
  const config = modalityConfig[type];
  if (!config || !isTournamentDataObject(rawData) || !Array.isArray(rawData.schedule)) return true;

  const players = isTournamentDataObject(rawData.players) ? rawData.players : {};

  if (isCupType(config)) {
    const cupConfig = isTournamentDataObject(rawData.cupConfig) ? rawData.cupConfig : {};
    const teamCount = Number(cupConfig.teamCount);

    return !Array.isArray(players.teams)
      || !config.allowedTeamCounts.includes(teamCount)
      || players.teams.length !== teamCount
      || !Array.isArray(rawData.brackets);
  }

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return !Array.isArray(players.men)
      || !Array.isArray(players.women)
      || players.men.length !== config.men
      || players.women.length !== config.women;
  }

  if (config.type === "fixed12" || config.type === "fixed16") {
    return !Array.isArray(players.teams) || players.teams.length !== config.teams;
  }

  return !Array.isArray(rawData.players) || rawData.players.length !== config.total;
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

function TournamentScreen({ tournament, userId, onBack, onSave, onNavigationStateChange }) {
  const config = modalityConfig[tournament.type];

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
    return params.get("partidas") || "grupos";
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
    setActiveMatchesTabState(tab);
    updateTournamentUrl({ activeMatchesTab: tab });
  }

  useEffect(() => {
    updateTournamentUrl();
  }, []);

  const saveTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  const firstRenderRef = useRef(true);
  const shuffleAnimationTimerRef = useRef(null);
  const shuffleCountdownTimerRef = useRef(null);

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

  const cupGroupRankings = useMemo(
    () => isCupType(config) && (data.groupsShuffled || data.schedule?.length > 0)
      ? calculateCupGroupRankings(data, data.rankingCriteria)
      : [],
    [data, config.type]
  );

  const copinhaGroupCampaignTies = useMemo(
    () => isCopinhaData(data) && data.schedule?.length > 0
      ? getCopinhaSeededGroups(data).unresolvedGroupTies
      : [],
    [data, config.type]
  );

  const cearenseCampaignTies = useMemo(() => {
    if (!isCearenseData(data) || !data.schedule?.length) return [];
    if (!data.schedule.flat().every((game) => isGameFinished(game, getWinningScore(data)))) return [];

    const groupRankings = calculateCupGroupRankings(data, data.rankingCriteria);
    if (groupRankings.some((group) => group.unresolvedTieIds?.length > 1)) return [];

    return getCearenseQualified(data).unresolvedCampaignTies;
  }, [data, config.type]);

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
      const ok = await onSave({ ...tournament, data: latestDataRef.current });
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
      const ok = await onSave({ ...tournament, data });

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

  function updateRankingCriteria(value) {
    setData((prev) => {
      const copy = { ...prev, rankingCriteria: value };

      if (isCearenseData(copy)) {
        copy.brackets = [];
        resetCopinhaTieBreaks(copy);
      }

      return copy;
    });
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
        ...(isCearenseData(copy) ? { campaignTieBreakOverrides: {} } : {}),
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

  function resolveCearenseCampaignTie(tieKey, teamIds) {
    if (!Array.isArray(teamIds) || teamIds.length < 2) return;

    setData((prev) => {
      const copy = structuredClone(prev);
      const campaignTieBreakOverrides = {
        ...(copy.cupConfig?.campaignTieBreakOverrides || {}),
        [tieKey]: shuffleArray([...teamIds]),
      };

      copy.cupConfig = {
        ...(copy.cupConfig || {}),
        campaignTieBreakOverrides,
      };
      copy.brackets = [];

      return copy;
    });

    showNotice("success", "Desempate entre grupos sorteado", "A ordem sorteada foi registrada para montar as duas chaves.");
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

  function finishShuffle() {
    const copy = structuredClone(data);

    if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
      copy.players.men = shuffleArray(copy.players.men);
      copy.players.women = shuffleArray(copy.players.women);
    } else if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
      copy.players.teams = shuffleArray(copy.players.teams);
    } else {
      copy.players = shuffleArray(copy.players);
    }

    copy.schedule = [];

    if (isCupType(config)) {
      copy.brackets = [];
      copy.groupsShuffled = true;
      resetCopinhaTieBreaks(copy);
    }

    setData(copy);
    setShuffleOverlay(null);
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
    const schedule = generateCupGroupSchedule(data.players, data.cupConfig || {});

    setData((prev) => ({
      ...prev,
      schedule,
      brackets: [],
      groupsShuffled: prev.groupsShuffled || false,
    }));

    setActiveTournamentTab("partidas");
    setActiveMatchesTab("grupos");
    showNotice(
      "success",
      "Rodadas e jogos criados",
      isCearenseData(data)
        ? "A fase de grupos do Campeonato Cearense foi montada com sucesso."
        : "A fase de grupos da Copa foi montada com sucesso."
    );
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

  if (isCearenseData(data)) {
    const hasUnresolvedGroupTie = calculateCupGroupRankings(data, data.rankingCriteria)
      .some((group) => group.unresolvedTieIds?.length > 1);
    const hasUnresolvedCampaignTie = getCearenseQualified(data).unresolvedCampaignTies.length > 0;

    if (hasUnresolvedGroupTie || hasUnresolvedCampaignTie) {
      showNotice(
        "warning",
        "Desempate pendente",
        "Registre os sorteios de desempate indicados na aba Grupos antes de gerar as chaves."
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

  function SavingStatusBadge() {
    return (
      <span className={`savingBadge ${savingStatus === "Salvando..." ? "saving" : savingStatus === "Erro ao salvar" ? "error" : "saved"}`}>
        💾 {savingStatus}
      </span>
    );
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

    <div className="appPage">
      <header>
        <div>
          <h1>{tournament.name}</h1>
          <div className="tournamentHeaderMeta">
            <span><Trophy aria-hidden="true" /> {getModalityDisplayName(tournament.type)}</span>
            {data.multiCategoryEvent ? <span><Grid3X3 aria-hidden="true" /> Várias categorias</span> : null}
            {data.gender ? <span><Tag aria-hidden="true" /> {data.gender}</span> : null}
            {data.eventPeriodLabel || data.eventDate ? <span><CalendarDays aria-hidden="true" /> {data.eventPeriodLabel || formatDateBR(data.eventDate)}</span> : null}
            {data.eventDay ? <span><CalendarDays aria-hidden="true" /> {data.eventDay}</span> : null}
            {data.registrationDeadline ? <span><CalendarDays aria-hidden="true" /> Inscrições até {formatDateBR(data.registrationDeadline)}</span> : null}
            {data.eventStartTime ? <span><Clock3 aria-hidden="true" /> Início {data.eventStartTime}</span> : null}
            {data.dailyStartTimes && Object.keys(data.dailyStartTimes).length > 0 ? (
              <span><Clock3 aria-hidden="true" /> Horários por dia definidos</span>
            ) : null}
            {data.location ? <span><MapPin aria-hidden="true" /> {data.location}</span> : null}
            {data.winningScore ? <span><Target aria-hidden="true" /> {data.winningScore} games</span> : null}
          </div>
        </div>

        <div className="actions tournamentHeaderActions">
          <button type="button" onClick={handleBack}>Voltar</button>
        </div>
      </header>

        <section className="shareHighlightBox">
          <div>
            <strong><Share2 aria-hidden="true" /> Compartilhar perfil da arena</strong>
            <p>Envie um único link para atletas e convidados encontrarem os torneios e circuitos da arena sem login.</p>
          </div>

          <button
            type="button"
            className="shareHighlightBtn"
            onClick={() => setShareOpen((prev) => !prev)}
          >
            <Share2 aria-hidden="true" />
            {shareOpen ? "Fechar" : "Compartilhar"}
          </button>
        </section>

              {shareOpen && (
          <section className="card shareCard">
            <h2>Link público da arena</h2>
            <p>Atletas e convidados poderão escolher um torneio no perfil e acompanhar participantes, jogos e resultados.</p>

            {!shareInfo.is_public ? (
              <button type="button" className="sharePrimaryAction" onClick={enablePublicShare} disabled={shareLoading}>
                <Link2 aria-hidden="true" />
                {shareLoading ? "Gerando..." : "Gerar link do perfil"}
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
                </div>
              </>
            )}
          </section>
        )}

        <nav className="tournamentTopTabs" aria-label="Organização do torneio">
          <button type="button" className={activeTournamentTab === "participantes" ? "active" : ""} onClick={() => setActiveTournamentTab("participantes")}><Users aria-hidden="true" /> Participantes</button>
          {isCupType(config) && (
            <button type="button" className={activeTournamentTab === "grupos" ? "active" : ""} onClick={() => setActiveTournamentTab("grupos")}><Grid3X3 aria-hidden="true" /> Grupos</button>
          )}
          <button type="button" className={activeTournamentTab === "partidas" ? "active" : ""} onClick={() => setActiveTournamentTab("partidas")}><Flame aria-hidden="true" /> Partidas</button>
          <button type="button" className={activeTournamentTab === "ranking" ? "active" : ""} onClick={() => setActiveTournamentTab("ranking")}><Trophy aria-hidden="true" /> Ranking</button>
        </nav>

        <section className="card" style={{ display: activeTournamentTab === "participantes" ? undefined : "none" }}>
          <div className="cardTitleRow">
            <h2>Participantes</h2>
            <SavingStatusBadge />
          </div>


          {isCupType(config) && (
            <CupConfigPanel
              data={data}
              config={config}
              updateCupConfig={updateCupConfig}
            />
          )}

          <PlayerInputs
            type={tournament.type}
            data={data}
            updatePlayer={updatePlayer}
          />

          {!isCupType(config) && (
            <div className="actions">
              <button type="button" onClick={shuffleNames}>Sortear nomes</button>
              <button type="button" onClick={generate}>Criar rodadas e jogos</button>
            </div>
          )}
        </section>

        {isCupType(config) && (
          <section className="card" style={{ display: activeTournamentTab === "grupos" ? undefined : "none" }}>
            <div className="cardTitleRow">
              <h2>Grupos</h2>
              <SavingStatusBadge />
            </div>
            <p>Use o sorteio para embaralhar as duplas e depois gere a fase de grupos.</p>
            <div className="actions">
              <button type="button" onClick={shuffleNames}>Sortear grupos</button>
              <button type="button" onClick={generate}>Gerar fase de grupos</button>
            </div>
            {cupGroupRankings.length > 0 && (
              <div className="groupsPreviewBox">
                <h3>Classificação dos grupos</h3>
                <CupGroupRankingView
                  groupRankings={cupGroupRankings}
                  rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
                />
                {(isCopinhaData(data) || isCearenseData(data)) && (
                  <CopinhaTieBreakPanel
                    groupRankings={cupGroupRankings}
                    onResolveTie={resolveCopinhaTie}
                    groupCampaignTies={copinhaGroupCampaignTies}
                    onResolveGroupTie={resolveCopinhaGroupTie}
                    campaignTies={cearenseCampaignTies}
                    onResolveCampaignTie={resolveCearenseCampaignTie}
                    isCearense={isCearenseData(data)}
                  />
                )}
              </div>
            )}
          </section>
        )}

        <section className="card" style={{ display: activeTournamentTab === "partidas" ? undefined : "none" }}>
          <div className="cardTitleRow">
            <h2>{isCupType(config) ? "Partidas" : "Rodadas"}</h2>
            <SavingStatusBadge />
          </div>
          {isCupType(config) && (
            <div className="matchesSubTabs">
              <button type="button" className={activeMatchesTab === "grupos" ? "active" : ""} onClick={() => setActiveMatchesTab("grupos")}>Fase de grupos</button>
              <button type="button" className={activeMatchesTab === "chaves" ? "active" : ""} onClick={() => setActiveMatchesTab("chaves")}>Chaves finais</button>
              <button type="button" className={activeMatchesTab === "paralela" ? "active" : ""} onClick={() => setActiveMatchesTab("paralela")}>{data.cupConfig?.repechageName || "Disputa paralela"}</button>
            </div>
          )}
          <div style={{ display: !isCupType(config) || activeMatchesTab === "grupos" ? undefined : "none" }}>

          {!data.schedule || data.schedule.length === 0 ? (
            <p>Clique em “Criar rodadas e jogos” para montar os jogos.</p>
          ) : (
            <>
             <ScheduleView
  schedule={data.schedule}
  updateScore={updateScore}
  showGroupName={isCupType(config)}
  voiceRepeat={voiceRepeat}
  setVoiceRepeat={setVoiceRepeat}
  winningScore={getWinningScore(data)}
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

            <section className="card" style={{ display: activeTournamentTab === "partidas" && activeMatchesTab === "chaves" ? undefined : "none" }}>
              <div className="cardTitleRow">
                <h2>Chaves finais</h2>
                <SavingStatusBadge />
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

            <section className="card" style={{ display: activeTournamentTab === "ranking" ? undefined : "none" }}>
              <div className="cardTitleRow">
                <h2>Ranking</h2>
                <SavingStatusBadge />
              </div>

              <div className="cupRankingSplit">
                <div className="cupRankingPanel">
                  <h3>{data.cupConfig?.mainBracketName || "Chave Principal"}</h3>
                  {mainCupPodium.length > 0 ? (
                    <CupPodiumView podium={mainCupPodium} title={data.cupConfig?.mainBracketName || "Principal"} />
                  ) : (
                    <p>Finalize a chave principal para ver o ranking da chave principal.</p>
                  )}
                </div>

                <div className="cupRankingPanel">
                  <h3>{data.cupConfig?.repechageName || "Disputa Paralela"}</h3>
                  {isCopinhaData(data) ? (
                    data.cupConfig?.teamCount === 6 ? (
                      <p>Com 2 grupos, não há consolação neste formato.</p>
                    ) : consolationCupPodium.length > 0 ? (
                      <CupPodiumView
                        podium={consolationCupPodium}
                        title={data.cupConfig?.repechageName || "Consolação"}
                        variant="parallel"
                      />
                    ) : (
                      <p>Finalize a consolação para ver o pódio.</p>
                    )
                  ) : parallelRanking.length > 0 ? (
                    <CupPodiumView
                      podium={parallelRanking.slice(0, 3).map((item, index) => ({
                        position: index === 0 ? "🏆 Campeão" : index === 1 ? "🥈 Vice" : "🥉 3º lugar",
                        name: item.name,
                      }))}
                      title={data.cupConfig?.repechageName || "Disputa Paralela"}
                      variant="parallel"
                    />
                  ) : (
                    <p>Gere ou finalize a disputa paralela para ver o ranking separado.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="card" style={{ display: activeTournamentTab === "partidas" && activeMatchesTab === "paralela" ? undefined : "none" }}>
              <div className="cardTitleRow">
                <h2>{data.cupConfig?.repechageName || "Disputa Paralela"}</h2>
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
          <section className="card" style={{ display: activeTournamentTab === "ranking" ? undefined : "none" }}>
            <div className="cardTitleRow">
              <h2>Ranking</h2>
              <SavingStatusBadge />
            </div>

            <RankingView
              ranking={ranking}
              type={tournament.type}
              rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
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
  const isCearense = config.type === "cearense";

  return (
    <div className="cupConfigBox">
      <div className="twoCols">
        <div>
          <label>Quantidade de duplas</label>
          <select
            value={cupConfig.teamCount || config.defaultTeams}
            onChange={(e) => updateCupConfig("teamCount", Number(e.target.value))}
            disabled={isFixedCupSize}
          >
            {config.allowedTeamCounts.map((count) => (
              <option key={count} value={count}>{count} duplas</option>
            ))}
          </select>
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
          <label>{isCopinha ? "Nome da consolação" : isCearense || isCup18 || isCup21 ? "Nome da disputa paralela" : "Nome da repescagem"}</label>
          <input
            value={cupConfig.repechageName || config.defaultRepechageName}
            onChange={(e) => updateCupConfig("repechageName", e.target.value)}
            placeholder={isCopinha ? "Consolação" : isCearense || isCup18 || isCup21 ? "Disputa Paralela" : "Repescagem"}
          />
        </div>
      </div>

      {showInfo && (
        <div className="infoBox">
          {isCearense ? (
          <>
            <p><strong>Formato:</strong> de 4 a 32 duplas, distribuídas em grupos de 3 ou 4. Com 4 ou 5 duplas, há um grupo único.</p>
            <p><strong>Dentro de cada grupo:</strong> classificação pelo critério escolhido entre Vitórias, Saldo e Total de Games.</p>
            <p><strong>Entre grupos:</strong> percentual de vitórias, saldo médio por partida e média de games vencidos por partida.</p>
            <p><strong>Eliminatória Principal:</strong> 1º e 2º de cada grupo; campeões recebem as melhores sementes e os primeiros BYEs.</p>
            <p><strong>Disputa Paralela:</strong> todas as duplas abaixo do 2º lugar, em chave independente.</p>
          </>
        ) : isCup18 ? (
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

function PlayerInputs({ type, data, updatePlayer }) {
  const config = modalityConfig[type];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return (
      <div className="twoCols">
        <div>
          <h3>Homens</h3>

          {data.players.men.map((name, i) => (
            <div className="numberedInput" key={i}>
              <span>{i + 1}</span>
              <input
                value={name}
                onChange={(e) => updatePlayer({ kind: "men", index: i }, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div>
          <h3>Mulheres</h3>

          {data.players.women.map((name, i) => (
            <div className="numberedInput" key={i}>
              <span>{config.men + i + 1}</span>
              <input
                value={name}
                onChange={(e) => updatePlayer({ kind: "women", index: i }, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    return (
      <div className="twoCols">
        {data.players.teams.map((team, i) => (
          <div key={i} className="miniCard">
            <h3>Dupla {i + 1}</h3>

            <div className="numberedInput">
              <span>{i + 1}</span>
              <input
                value={team.a}
                onChange={(e) => updatePlayer({ kind: "team", index: i, field: "a" }, e.target.value)}
              />
            </div>

            <input
              value={team.b}
              onChange={(e) => updatePlayer({ kind: "team", index: i, field: "b" }, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="twoCols">
      {data.players.map((name, i) => (
        <div className="numberedInput" key={i}>
          <span>{i + 1}</span>
          <input
            value={name}
            onChange={(e) => updatePlayer({ kind: "normal", index: i }, e.target.value)}
          />
        </div>
      ))}
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
  const config = modalityConfig[type];

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

function ScheduleView({
  schedule,
  updateScore = () => {},
  showGroupName = false,
  voiceRepeat = 1,
  setVoiceRepeat = () => {},
  winningScore = 4,
  readOnly = false,
}) {
  return (
    <div className={`schedule ${readOnly ? "readOnlySchedule publicSchedule" : ""}`}>
      {!readOnly ? (
        <VoiceRepeatSelector
          voiceRepeat={voiceRepeat}
          setVoiceRepeat={setVoiceRepeat}
        />
      ) : null}

      {schedule.map((round, roundIndex) => (
        <div className={`roundCard ${readOnly ? "readOnlyRoundCard publicReadOnlyRound" : ""}`} key={roundIndex}>
          <div className="roundHeader">
            <h3>Rodada {roundIndex + 1}</h3>

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

          {round.map((game, gameIndex) => {
            const winnerSide = getScoreWinnerSide(game, winningScore);
            const isFinished = winnerSide !== null;
            const hasPublicScore = readOnly && game.s1 !== "" && game.s1 != null && game.s2 !== "" && game.s2 != null;

            return (
            <div className={`gameCard ${isFinished ? "gameFinished" : "gameWaiting"} ${readOnly ? "publicReadOnlyGame" : ""}`} key={gameIndex}>
              <div className={`gameTopLine ${readOnly ? "publicGameTopLine" : ""}`}>
                <strong>
                  {showGroupName && game.groupName ? `${game.groupName} · ` : ""}
                  Quadra {game.court}
                </strong>
              </div>

              <div className={`gameTeams ${readOnly ? "publicGameTeams" : ""}`}>
                <div className={winnerSide === "team1" ? "winnerTeam" : winnerSide === "team2" ? "loserTeam" : ""}>{game.team1.join(" + ")}</div>
                <span>x</span>
                <div className={winnerSide === "team2" ? "winnerTeam" : winnerSide === "team1" ? "loserTeam" : ""}>{game.team2.join(" + ")}</div>
              </div>

              <div
                className={`scoreRow ${readOnly ? "publicReadOnlyScoreRow" : ""}`}
                aria-label={readOnly ? (hasPublicScore ? `Placar: ${game.s1} a ${game.s2}` : "Placar ainda não informado") : undefined}
              >
                {readOnly ? (
                  hasPublicScore ? (
                    <>
                      <output className="publicScoreValue">{game.s1}</output>
                      <span aria-hidden="true">—</span>
                      <output className="publicScoreValue">{game.s2}</output>
                    </>
                  ) : (
                    <span className="publicScorePending">Aguardando placar</span>
                  )
                ) : (
                  <>
           <input
  type="text"
  min="0"
 max={getMaxScore(winningScore)}
  inputMode="numeric"
  pattern="[0-9]*"
  value={game.s1}
  onChange={(e) => updateScore(roundIndex, gameIndex, "s1", e.target.value)}
  readOnly={readOnly}
  disabled={readOnly}
/>

                <span>—</span>

               <input
  type="text"
  min="0"
  max={getMaxScore(winningScore)}
  inputMode="numeric"
  pattern="[0-9]*"
  value={game.s2}
  onChange={(e) => updateScore(roundIndex, gameIndex, "s2", e.target.value)}
  readOnly={readOnly}
  disabled={readOnly}
/>
                  </>
                )}
              </div>

              {!readOnly ? (
                <div className="voiceActions gameVoiceActions">
                  <button
                    type="button"
                    className="voiceBtn"
                    onClick={() =>
                      speakGame(game, {
                        roundLabel: `Rodada ${roundIndex + 1}`,
                        includeGroup: showGroupName,
                        repeat: voiceRepeat,
                      })
                    }
                  >
                    🔊 Chamar jogo
                  </button>
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function calculateRanking(data, type, rankingCriteriaValue = defaultRankingCriteria) {
  const config = modalityConfig[type];
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

function RankingView({ ranking, type, rankingCriteria }) {
  const config = modalityConfig[type];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    const menLimit = config.men;
    const men = ranking.filter((p) => p.id < menLimit);
    const women = ranking.filter((p) => p.id >= menLimit);

    return (
      <div className="twoCols">
        <RankingTable
          title="Ranking Masculino"
          rows={men}
          rankingCriteria={rankingCriteria}
        />
        <RankingTable
          title="Ranking Feminino"
          rows={women}
          rankingCriteria={rankingCriteria}
        />
      </div>
    );
  }

  return (
    <RankingTable
      title="Ranking Geral"
      rows={ranking}
      rankingCriteria={rankingCriteria}
    />
  );
}

function RankingTable({ title, rows, rankingCriteria, showPodium = true }) {
  const criteria = getRankingCriteria(rankingCriteria);

  return (
    <div className="rankingTablePanel">
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
                <td className="rankingRankCell">{showPodium ? podium(i) : i + 1}</td>
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
  campaignTies = [],
  onResolveCampaignTie,
  isCearense = false,
}) {
  const tiedGroups = (groupRankings || []).filter((group) => group.unresolvedTieIds?.length > 1);

  if (!tiedGroups.length && !groupCampaignTies.length && !campaignTies.length) return null;

  return (
    <div className="infoBox">
      <p>
        <strong>Desempate por sorteio necessário.</strong>{" "}
        {isCearense
          ? "As duplas abaixo permaneceram iguais em vitórias, saldo e Total de Games. O organizador deve registrar o sorteio antes de gerar as chaves."
          : "Há três duplas empatadas após vitórias, saldo e confronto direto."}
      </p>
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

      {campaignTies.map((tie) => {
        const scopeLabel = {
          campeoes: "Campeões de grupo",
          segundos: "Segundos colocados",
          paralela: "Disputa Paralela",
        }[tie.scope] || "Campanhas entre grupos";

        return (
          <div className="actions" key={tie.tieKey}>
            <span>
              {scopeLabel}: {tie.rows.map((row) => (
                `${row.name} (${((row.w / Math.max(1, row.played)) * 100).toFixed(2)}% vit.; saldo médio ${(row.bal / Math.max(1, row.played)).toFixed(2)}; média de games ${(row.pts / Math.max(1, row.played)).toFixed(2)})`
              )).join(" · ")}
            </span>
            <button
              type="button"
              onClick={() => onResolveCampaignTie?.(tie.tieKey, tie.teamIds)}
            >
              Registrar sorteio da ordem
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

  return (
    <div className={`twoCols ${className}`.trim()}>
      {groupRankings.map((group) => (
        <RankingTable
          key={group.id}
          title={group.name}
          rows={group.rows}
          rankingCriteria={effectiveCriteria}
          showPodium={false}
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
    <div>
      <VoiceRepeatSelector
        voiceRepeat={voiceRepeat}
        setVoiceRepeat={setVoiceRepeat}
      />

      <div className="cupBrackets">
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
  return (
    <div className={`bracketColumn ${rounds?.[0]?.games?.[0]?.phase === "repechage" ? "repechageBracket" : "mainBracket"}`}>
      <h3>{title}</h3>

      {rounds.map((round, roundIndex) => (
        <div className="roundCard" key={roundIndex}>
          <div className="roundHeader">
            <h3>{round.title === "Disputa Paralela" ? title : round.title}</h3>

            <div className="voiceActions">
              <button
                type="button"
                className="voiceBtn"
                onClick={() => speakBracketRound(round, voiceRepeat)}
              >
                🔊 Chamar fase
              </button>

              <button
                type="button"
                className="secondaryBtn stopBtn"
                onClick={stopSpeech}
              >
                ⏹️ Parar
              </button>
            </div>
          </div>

          {round.games.map((game) => {
            const blocked =
              game.isBye ||
              !game.ids1?.length ||
              !game.ids2?.length ||
              game.team1?.[0] === "Aguardando" ||
              game.team2?.[0] === "Aguardando";

            const winnerSide = getScoreWinnerSide(game, winningScore);
            const isFinished = winnerSide !== null || game.isBye;

            return (
              <div className={`gameCard ${game.isBye ? "byeGameCard" : ""} ${isFinished ? "gameFinished" : "gameWaiting"}`} key={game.matchKey}>
                <div className="gameTopLine">
                  <strong>Quadra {game.court}</strong>
                </div>

                {game.isBye ? (
                  <div className="gameTeams byeGameTeams">
                    <div className="byeQualifiedTeam">
                      {game.ids1?.length
                        ? game.team1?.join(" + ")
                        : game.ids2?.length
                          ? game.team2?.join(" + ")
                          : "Aguardando"}
                    </div>
                    <strong className="byeBadge">BYE</strong>
                  </div>
                ) : (
                  <div className="gameTeams">
                    <div className={winnerSide === "team1" ? "winnerTeam" : winnerSide === "team2" ? "loserTeam" : ""}>{game.team1?.join(" + ") || "Aguardando"}</div>
                    <span>x</span>
                    <div className={winnerSide === "team2" ? "winnerTeam" : winnerSide === "team1" ? "loserTeam" : ""}>{game.team2?.join(" + ") || "Aguardando"}</div>
                  </div>
                )}

                {!game.isBye ? (
                <div className="scoreRow">
                  <input
  type="text"
  min="0"
  max={getMaxScore(winningScore)}
  inputMode="numeric"
  pattern="[0-9]*"
  value={game.s1}
  onChange={(e) => updateBracketScore(game.matchKey, "s1", e.target.value)}
  disabled={blocked}
/>

                  <span>—</span>

            <input
  type="text"
  min="0"
  max={getMaxScore(winningScore)}
  inputMode="numeric"
  pattern="[0-9]*"
  value={game.s2}
  onChange={(e) => updateBracketScore(game.matchKey, "s2", e.target.value)}
  disabled={blocked}
/>
                </div>
                ) : null}

                <div className="voiceActions gameVoiceActions">
                  <button
                    type="button"
                    className="voiceBtn"
                    onClick={() =>
                      speakGame(game, {
                        roundLabel: `${round.title} da chave ${title}`,
                        includeGroup: false,
                        repeat: voiceRepeat,
                      })
                    }
                    disabled={blocked}
                  >
                    🔊 Chamar jogo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PublicTournamentPage({ publicId }) {
  const [loading, setLoading] = useState(true);
  const [anchorTournament, setAnchorTournament] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeArenaTab, setActiveArenaTab] = useState("tournaments");
  const [activeStatusTab, setActiveStatusTab] = useState("active");
  const [openingPublicId, setOpeningPublicId] = useState(null);
  const [error, setError] = useState(null);

  async function loadPublicArena({ silent = false } = {}) {
    if (!silent) setLoading(true);

    const { data: publicTournament, error: publicTournamentError } = await supabase
      .rpc("get_public_tournament", { p_public_id: publicId })
      .maybeSingle();

    if (publicTournamentError || !publicTournament) {
      console.error(publicTournamentError);
      setError("Link público não encontrado ou desativado.");
      setAnchorTournament(null);
      setTournaments([]);
      setCircuits([]);
    } else {
      const visibleAnchor = { ...publicTournament, is_public: true };
      const ownerId = publicTournament.user_id;
      const [tournamentsResult, circuitsResult] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*")
          .eq("user_id", ownerId)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("circuits")
          .select("id, user_id, name, start_date, end_date, status, tournament_ids, updated_at")
          .eq("user_id", ownerId)
          .order("updated_at", { ascending: false }),
      ]);

      const tournamentDirectory = Array.isArray(publicTournament.data?.publicArenaDirectory)
        ? publicTournament.data.publicArenaDirectory.filter((item) => item?.public_id)
        : [];
      const publicTournaments = tournamentsResult.error
        ? tournamentDirectory
        : (tournamentsResult.data || []).filter((item) => !item.data?.deletedAt);
      const uniqueTournaments = Array.from(
        new Map([...publicTournaments, visibleAnchor].map((item) => [item.public_id || item.id, item])).values()
      );
      const circuitSnapshot = Array.isArray(publicTournament.data?.publicArenaCircuits)
        ? publicTournament.data.publicArenaCircuits
        : [];

      if (tournamentsResult.error) {
        console.warn("A listagem pública completa de torneios não está disponível; exibindo o torneio do link.", tournamentsResult.error);
      }

      if (circuitsResult.error && circuitSnapshot.length === 0) {
        console.warn("A listagem pública de circuitos ainda não está disponível.", circuitsResult.error);
      }

      setAnchorTournament(visibleAnchor);
      setTournaments(uniqueTournaments);
      setCircuits(circuitsResult.error ? circuitSnapshot : (circuitsResult.data || []));
      setSelectedTournament((current) => {
        if (!current) return null;
        return uniqueTournaments.find((item) => item.id === current.id) || current;
      });
      setError(null);
    }

    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadPublicArena();

    const interval = setInterval(() => {
      loadPublicArena({ silent: true });
    }, 20000);

    return () => clearInterval(interval);
  }, [publicId]);

  useEffect(() => {
    setActiveStatusTab("active");
  }, [activeArenaTab]);

  async function openPublicTournament(item) {
    if (!item?.directoryEntry) {
      setSelectedTournament(item);
      return;
    }

    setOpeningPublicId(item.public_id);
    const { data, error: tournamentError } = await supabase
      .rpc("get_public_tournament", { p_public_id: item.public_id })
      .maybeSingle();
    setOpeningPublicId(null);

    if (tournamentError || !data) {
      console.error(tournamentError);
      setError("Este torneio não está mais disponível no perfil da arena.");
      return;
    }

    setSelectedTournament(data);
  }

  if (loading) {
    return (
      <div className="publicPage">
        <div className="center">
          <h1>Carregando tabela...</h1>
        </div>
      </div>
    );
  }

  if (error || !anchorTournament) {
    return (
      <div className="publicPage">
        <div className="center">
          <h1>Link indisponível</h1>
          <p>{error || "Não foi possível carregar esta tabela."}</p>
        </div>
      </div>
    );
  }

  if (selectedTournament) {
    return (
      <PublicTournamentScreen
        tournament={selectedTournament}
        onBackToArena={() => setSelectedTournament(null)}
      />
    );
  }

  const anchorData = normalizeTournamentData(anchorTournament.type, anchorTournament.data);
  const publicOrganizer = anchorData.publicInfo?.organizer || {};
  const activeItems = activeArenaTab === "tournaments"
    ? tournaments.filter((item) => !isPublicItemFinished(item, "tournament"))
    : circuits.filter((item) => !isPublicItemFinished(item, "circuit"));
  const finishedItems = activeArenaTab === "tournaments"
    ? tournaments.filter((item) => isPublicItemFinished(item, "tournament"))
    : circuits.filter((item) => isPublicItemFinished(item, "circuit"));
  const visibleItems = activeStatusTab === "finished" ? finishedItems : activeItems;
  const arenaName = publicOrganizer.arenaName || anchorTournament.name || "Arena Torneio360";

  return (
    <div className="publicPage publicArenaPage">
      <header className="publicHeader publicArenaHeader">
        <div className="publicBrandRow">
          <BeachLogo />
          <div className="brandTaglineOnly"><span>{TORNEIO360_TAGLINE}</span></div>
        </div>

        <div className="publicArenaIdentity">
          {publicOrganizer.photoUrl ? (
            <img src={publicOrganizer.photoUrl} alt={`Foto de ${arenaName}`} />
          ) : (
            <span className="publicArenaInitials">{arenaName.slice(0, 2).toUpperCase()}</span>
          )}
          <div>
            <small>Perfil da arena</small>
            <h1>{arenaName}</h1>
            {publicOrganizer.organizerName ? <p>Organização: {publicOrganizer.organizerName}</p> : null}
            {publicOrganizer.city || publicOrganizer.state ? (
              <p><MapPin aria-hidden="true" /> {[publicOrganizer.city, publicOrganizer.state].filter(Boolean).join("/")}</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="publicContent publicArenaContent">
        <section className="card publicArenaContacts">
          <div>
            <h2>Eventos da arena</h2>
            <p>Escolha um torneio para acompanhar participantes, jogos, chaves e resultados sem fazer login.</p>
          </div>
          <div className="publicOrganizerLinks">
            {publicOrganizer.whatsapp ? <a href={getBrazilianWhatsAppUrl(publicOrganizer.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp</a> : null}
            {publicOrganizer.whatsappGroupLink ? <a href={publicOrganizer.whatsappGroupLink} target="_blank" rel="noreferrer"><Users aria-hidden="true" /> Grupo do WhatsApp</a> : null}
            {publicOrganizer.instagramLink ? <a href={publicOrganizer.instagramLink} target="_blank" rel="noreferrer"><AtSign aria-hidden="true" /> Instagram</a> : null}
            {publicOrganizer.mapsLink ? <a href={publicOrganizer.mapsLink} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /> Google Maps</a> : null}
          </div>
        </section>

        <nav className="publicArenaTabs" aria-label="Conteúdo público da arena">
          <button type="button" className={activeArenaTab === "tournaments" ? "active" : ""} onClick={() => setActiveArenaTab("tournaments")}>
            <Trophy aria-hidden="true" /> Torneios
          </button>
          <button type="button" className={activeArenaTab === "circuits" ? "active" : ""} onClick={() => setActiveArenaTab("circuits")}>
            <GitBranch aria-hidden="true" /> Circuitos
          </button>
        </nav>

        <nav className="publicArenaStatusTabs" aria-label="Situação dos eventos">
          <button type="button" className={activeStatusTab === "active" ? "active" : ""} onClick={() => setActiveStatusTab("active")}>Ativos <span>{activeItems.length}</span></button>
          <button type="button" className={activeStatusTab === "finished" ? "active" : ""} onClick={() => setActiveStatusTab("finished")}>Encerrados <span>{finishedItems.length}</span></button>
        </nav>

        <section className="publicArenaEventGrid" aria-live="polite">
          {visibleItems.length === 0 ? (
            <div className="card publicArenaEmpty">
              Nenhum {activeArenaTab === "tournaments" ? "torneio" : "circuito"} {activeStatusTab === "finished" ? "encerrado" : "ativo"} neste perfil.
            </div>
          ) : activeArenaTab === "tournaments" ? (
            visibleItems.map((item) => {
              const details = item.data || {};
              return (
                <article className="card publicArenaEventCard" key={item.id}>
                  <div className="publicArenaEventIcon"><Trophy aria-hidden="true" /></div>
                  <div>
                    <small>{getModalityDisplayName(item.type)}</small>
                    <h2>{item.name}</h2>
                    <p>
                      {details.eventDate ? <span><CalendarDays aria-hidden="true" /> {formatDateBR(details.eventDate)}</span> : null}
                      {details.location ? <span><MapPin aria-hidden="true" /> {details.location}</span> : null}
                    </p>
                  </div>
                  <button type="button" onClick={() => openPublicTournament(item)} disabled={openingPublicId === item.public_id}>
                    {openingPublicId === item.public_id ? "Abrindo..." : "Ver torneio"}
                  </button>
                </article>
              );
            })
          ) : (
            visibleItems.map((item) => (
              <article className="card publicArenaEventCard publicArenaCircuitCard" key={item.id}>
                <div className="publicArenaEventIcon"><GitBranch aria-hidden="true" /></div>
                <div>
                  <small>Circuito</small>
                  <h2>{item.name}</h2>
                  <p>
                    {item.start_date || item.startDate ? <span><CalendarDays aria-hidden="true" /> {formatDateBR(item.start_date || item.startDate)}</span> : null}
                    <span>{(item.tournament_ids || item.tournamentIds || []).length} torneio(s)</span>
                  </p>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function getRegisteredAthletesForPublic(data, config) {
  if (!data?.players) return [];

  if (config.type === "mixed10" || config.type === "mixed12" || config.type === "mixed16") {
    return [
      {
        title: "Masculino",
        names: (data.players.men || []).filter(Boolean),
      },
      {
        title: "Feminino",
        names: (data.players.women || []).filter(Boolean),
      },
    ];
  }

  if (config.type === "fixed12" || config.type === "fixed16" || isCupType(config)) {
    return [
      {
        title: "Duplas cadastradas",
        names: (data.players.teams || [])
          .map((team, index) => `${index + 1}. ${team.a || "Atleta 1"} + ${team.b || "Atleta 2"}`)
          .filter(Boolean),
      },
    ];
  }

  return [
    {
      title: "Atletas cadastrados",
      names: (data.players || []).filter(Boolean),
    },
  ];
}

function PublicTournamentScreen({ tournament, onBackToArena = null }) {
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
  const config = modalityConfig[tournament.type];
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

  const cupGroupRankings = isCup
    ? calculateCupGroupRankings(data, data.rankingCriteria)
    : [];

  const { currentBrackets, parallelRanking, mainCupPodium, consolationCupPodium } = getSafeCupPresentation(data, config);

  const publicAthletes = getRegisteredAthletesForPublic(data, config);

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
            {getModalityDisplayName(tournament.type)}
            {data.gender ? ` · ${data.gender}` : ""}
            {data.eventDay ? ` · ${data.eventDay}` : ""}
            {data.eventDate ? ` · ${formatDateBR(data.eventDate)}` : ""}
            {data.location ? ` · ${data.location}` : ""}
          </p>
        </div>

        <div className="publicTournamentHeaderActions">
          {onBackToArena ? <button type="button" onClick={onBackToArena}>← Voltar ao perfil da arena</button> : null}
          <div className="publicBadge">
            {registrationClosed ? "Inscrições encerradas" : "Somente visualização"}
          </div>
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
              {publicVisibility.showWhatsapp && publicOrganizer.whatsapp ? <a href={getBrazilianWhatsAppUrl(publicOrganizer.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp</a> : null}
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
                    {group.names.map((name, index) => (
                      <span key={`${group.title}-${index}`}>{name}</span>
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

createRoot(document.getElementById("root")).render(
  <>
    <App />
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
