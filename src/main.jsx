import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const SUPABASE_URL = "https://dttutybojealkvuywszt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Tr5qiUea-p42UknVoWwPKg_6K_b1EX_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  return `Sua plataforma para gestão de competições de Beach Tennis:
${url}`;
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
    "Super 08",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
  ],
  pro: [
    "Super 08",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Fixa)",
    "Super 16 Mista (Dupla Fixa)",
  ],
  premium: [
    "Super 08",
    "Super 10 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Fixa)",
    "Super 16 Mista (Dupla Fixa)",
    "Simples 8",
    "Copa - 12 ou 24 duplas",
    "Copa - 18 duplas",
    "Copa - 21 duplas",
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
    if (s1 === 6 && s2 <= 4) return "team1";
    if (s2 === 6 && s1 <= 4) return "team2";
    if (s1 === 7 && (s2 === 5 || s2 === 6)) return "team1";
    if (s2 === 7 && (s1 === 5 || s1 === 6)) return "team2";
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
  return config?.type === "cup" || config?.type === "cup18" || config?.type === "cup21";
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

function generateCupGroupSchedule(players, cupConfig) {
  const teamCount = cupConfig.teamCount || 12;
  const groups = createCupGroups(teamCount);
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

function calculateCupGroupRankings(data, rankingCriteriaValue = defaultRankingCriteria) {
  const cupConfig = data.cupConfig || {};
  const teamCount = cupConfig.teamCount || 12;
  const groups = createCupGroups(teamCount);
  const teamNames = data.players.teams.map((t) => getTeamName(t));
  const criteria = getRankingCriteria(rankingCriteriaValue);
  const winningScore = getWinningScore(data);

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

    (data.schedule || [])
      .flat()
      .filter((game) => game.phase === "groups" && game.groupId === group.id)
      .forEach((game) => {
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

function getCupQualified(data) {
  if ((data.cupConfig?.teamCount || 12) === 18) {
    return getCup18Qualified(data);
  }

  if ((data.cupConfig?.teamCount || 12) === 21) {
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

function buildThirdPlaceGame(semifinals) {
  if (!semifinals || semifinals.length < 2) return [];

  return [
    {
      phase: "main",
      roundName: "3º lugar",
      matchKey: "main_third_1",
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

function generateCupBrackets(data) {
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

function syncCupBracketScores(currentData) {
  const copy = structuredClone(currentData);
  const existingScores = {};

  (copy.brackets || []).forEach((game) => {
    existingScores[game.matchKey] = {
      s1: game.s1,
      s2: game.s2,
    };
  });

  const freshGames = getCupAllBracketGames(copy).map((game) => ({
    ...game,
    s1: existingScores[game.matchKey]?.s1 ?? game.s1 ?? "",
    s2: existingScores[game.matchKey]?.s2 ?? game.s2 ?? "",
  }));

  copy.brackets = freshGames;
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
          <button type="button" className="deleteBtn" onClick={onCancel}>Cancelar</button>
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
          <button type="button" className="deleteBtn" onClick={onCancel}>Cancelar</button>
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
          <button type="button" className="deleteBtn" onClick={onCancel}>Cancelar</button>
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

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error(error);
      setProfile(null);
      return;
    }

    setProfile(data);
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id);
      }

      setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user?.id) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (publicId) return <PublicTournamentPage publicId={publicId} />;

  if (loading) return <div className="center">Carregando...</div>;
  if (!session) return <Login />;

  if (!profile) {
    return (
      <div className="center">
        <h1>Torneio Fácil BT</h1>
        <p>Perfil não encontrado.</p>
        <button type="button" onClick={logout}>Sair</button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const expired = profile.expires_at && profile.expires_at < today;
  const blocked = profile.status !== "active" || expired;

  if (blocked) return <Blocked profile={profile} />;

  return <Dashboard profile={profile} user={session.user} />;
}

function BeachLogo() {
  return (
    <div className="beachLogo" aria-label="Torneio Fácil BT">
      <div className="beachLogoSand"></div>
      <div className="beachLogoBall">●</div>
      <div className="beachLogoRacket racketOne"></div>
      <div className="beachLogoRacket racketTwo"></div>
    </div>
  );
}

function Login() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState(null);

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setEmail("");
    setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

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
        showNotice("warning", "Data de nascimento obrigat    ria", "Informe sua data de nascimento.");
        return;
      }
    }

    if (!email.trim()) {
      showNotice("warning", "E-mail obrigatório", "Informe seu e-mail para continuar.");
      return;
    }

    if (!password.trim()) {
      showNotice("warning", "Senha obrigatória", "Digite sua senha para continuar.");
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        showNotice(
          "error",
          "Não foi possível entrar",
          "Confira o e-mail e a senha informados e tente novamente."
        );
      }
    } else {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            birth_date: birthDate,
          },
        },
      });

      if (error) {
        showNotice(
          "error",
          "Cadastro não concluído",
          "Não foi possível criar sua conta agora. Verifique os dados e tente novamente."
        );
      } else {
        showNotice(
          "success",
          "Cadastro criado",
          "Sua conta foi criada. Aguarde a liberação do acesso pelo administrador."
        );

        resetForm();
        setMode("login");
      }
    }
  }

  return (
    <div className="landingPage">
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />

      <header className="landingHeader">
        <div className="landingBrand">
          <BeachLogo />
          <div>
            <strong>Torneio Fácil BT</strong>
            <span>Sua plataforma para gestão de competições de Beach Tennis</span>
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
              setMode("login");
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
              setMode("signup");
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
                  setMode("signup");
                  document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Começar agora
              </button>

              <button
                type="button"
                className="secondaryBtn"
                onClick={() => {
                  setMode("login");
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
                Selecione Super 08, Super 12, Super 16, Simples 8 ou Copas conforme a realidade do evento.
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
              text="Para começar com torneios mistos e Super 08."
              items={[
                "Super 08",
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
                "Super 08",
                "Super 10 Mista Aleatória",
                "Super 12 Mista Aleatória",
                "Super 16 Mista Aleatória",
                "Super 12 Mista Dupla Fixa",
                "Super 16 Mista Dupla Fixa",
                "Gerencie vários campeonatos ao mesmo tempo",
              ]}
            />

            <PlanCard
              title="Premium"
              tag="Completo"
              price="R$ 59,90"
              text="Para quem quer liberar todos os formatos disponíveis."
              items={[
                "Super 08",
                "Super 10 Mista Aleatória",
                "Super 12 Mista Aleatória",
                "Super 16 Mista Aleatória",
                "Super 12 Mista Dupla Fixa",
                "Super 16 Mista Dupla Fixa",
                "Simples 8",
                "Copa - 12 ou 24 duplas",
                "Copa - 18 duplas",
                "Copa - 21 duplas",
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
              title="Super 08"
              text="Formato individual com 8 participantes, ideal para torneios rápidos. Cada atleta joga com parceiros diferentes ao longo das rodadas, evitando que uma dupla fixa determine todo o resultado. O sistema monta os confrontos automaticamente, organiza as quadras, registra os placares e calcula o ranking individual. No final, vence quem tiver melhor desempenho geral conforme os critérios definidos, como vitórias, pontos e saldo de games."
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
              title="Super 16 Mista Dupla Fixa"
              text="Formato com 8 duplas fixas, indicado para torneios maiores em que cada equipe permanece igual durante toda a competição. O sistema organiza os jogos entre as duplas, distribui as rodadas e registra os resultados. A classificação é por dupla, não individual. Conforme os placares são preenchidos, o ranking geral é atualizado com vitórias, pontos e saldo de games, ajudando o organizador a acompanhar quem está avançando melhor."
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
          </div>
        </section>

        <section id="acesso" className="landingAccessSection">
          <div className="accessText">
            <span>Acesso</span>
            <h2>{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h2>
            <p>
              {mode === "login"
                ? "Acesse seus torneios salvos e continue de onde parou."
                : "Preencha seus dados para solicitar acesso à plataforma."}
            </p>
          </div>

          <div className="accessCard">
            <div className="accessToggle">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Login
              </button>

              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => setMode("signup")}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <>
                  <div className="twoCols formTwoCols">
                    <div>
                      <label>Nome</label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>

                    <div>
                      <label>Sobrenome</label>
                      <input
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
                    value={birthDate}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onFocus={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </>
              )}

              <label>E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
              />

              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
              />

              <button type="submit">
                {mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function Blocked({ profile }) {
  return (
    <div className="center">
      <h1>Acesso bloqueado</h1>
      <p>Seu acesso está pendente, bloqueado ou vencido.</p>

      <div className="infoBox">
        <p><strong>Plano:</strong> {profile.plan}</p>
        <p><strong>Status:</strong> {formatStatusBR(profile.status)}</p>
        <p><strong>Vencimento:</strong> {profile.expires_at ? formatDateBR(profile.expires_at) : "não definido"}</p>
      </div>

      <p>Entre em contato para regularizar seu acesso.</p>
      <button type="button" onClick={logout}>Sair</button>
    </div>
  );
}

function Dashboard({ profile, user }) {
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
  const [profileVisibilitySaving, setProfileVisibilitySaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [shareTargetSaving, setShareTargetSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [draggedTournamentId, setDraggedTournamentId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [activePanel, setActivePanel] = useState("inicio");
  const [photoEditor, setPhotoEditor] = useState(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSubtab, setProfileSubtab] = useState("publicacoes");
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
      id: user.id,
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
      .upsert(publicProfileData, { onConflict: "id" })
      .select("*")
      .single();

    setProfileSaving(false);

    if (error) {
      console.error("Erro ao salvar perfil no Supabase:", error);
      showNotice("error", "Perfil não salvo", `O Supabase recusou a alteração. Detalhe: ${error.message || "erro desconhecido"}`);
      return;
    }

    if (data) {
      setProfile((prev) => ({ ...prev, ...data }));
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
    showNotice("success", "Perfil salvo", "As alterações do perfil foram salvas com sucesso.");
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
      .upsert(buildOrganizerProfilePayload(nextVisibility), { onConflict: "id" })
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

    if (data) setProfile((prev) => ({ ...prev, ...data }));
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
      await supabase
        .from("tournaments")
        .delete()
        .eq("user_id", user.id)
        .in("id", expiredTrash.map((item) => item.id));
    }

    const validTournaments = allTournaments.filter((item) => !item.data?.deletedAt || item.data.deletedAt >= deleteLimit);
    setTournaments(validTournaments.filter((item) => !item.data?.deletedAt));
    setTrashTournaments(validTournaments.filter((item) => item.data?.deletedAt));
  }

  async function openArenaProfile(arena) {
    setSelectedArenaProfile(arena);
    setSelectedArenaTournaments([]);
    setSelectedArenaLoading(true);

    let result = await supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", arena.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (result.error || !result.data?.length) {
      const fallback = await supabase
        .from("tournaments")
        .select("*")
        .eq("user_id", arena.id)
        .order("created_at", { ascending: false });

      if (!fallback.error && fallback.data?.length) result = fallback;
    }

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

    setShareTarget(null);
    showNotice("success", "Torneio publicado", "O campeonato foi publicado no perfil da arena com chamada para inscrição pelo WhatsApp.");
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
    };

    const rowsToInsert = isMultiCategory
      ? validCategorySchedules.map((item) => ({
          user_id: user.id,
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
    await loadTournaments();
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



  if (selected) {
    return (
      <TournamentScreen
        tournament={selected}
        onBack={() => setSelected(null)}
        onSave={saveTournament}
      />
    );
  }

  return (
    <div className="playAppShell">
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
              <button type="button" className="deleteBtn" onClick={() => setShareTarget(null)}>Fechar</button>
            </div>

            <div className="publicProfilePreview">
              {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="Foto do organizador" /> : null}
              <div>
                <strong>{organizerProfile.arenaName || "Nome da arena não informado"}</strong>
                <span>{organizerProfile.organizerName || "Organizador não informado"}</span>
              </div>
            </div>

            <div className="publicInfoOptions shareInfoOptions">
              <label><input type="checkbox" defaultChecked /> Nome da arena: {organizerProfile.arenaName || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> Nome do organizador: {organizerProfile.organizerName || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> WhatsApp: {organizerProfile.whatsapp || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> Grupo do WhatsApp: {organizerProfile.whatsappGroupLink || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> Instagram: {organizerProfile.instagramHandle || organizerProfile.instagramLink || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> Endereço: {organizerProfile.address || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> Link do mapa: {organizerProfile.mapsLink || "não informado"}</label>
              <label><input type="checkbox" defaultChecked /> Cidade/Estado: {[organizerProfile.city, organizerProfile.state].filter(Boolean).join("/") || "não informado"}</label>
            </div>

            <div className="shareChoiceBox">
              <label><input type="radio" name="shareMode" defaultChecked /> Publicar no meu perfil e compartilhar torneio</label>
              <label><input type="radio" name="shareMode" /> Somente compartilhar torneio</label>
            </div>

            <div className="editTournamentActions">
              <button type="button" className="deleteBtn" onClick={() => setShareTarget(null)}>Cancelar</button>
              <button type="button" onClick={confirmShareTarget} disabled={shareTargetSaving}>{shareTargetSaving ? "Publicando..." : "Confirmar compartilhamento"}</button>
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
              <button type="button" className="deleteBtn" onClick={() => { setEditTarget(null); setEditForm(null); }}>Fechar</button>
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
              <button type="button" className="deleteBtn" onClick={() => { setEditTarget(null); setEditForm(null); }}>Cancelar</button>
              <button type="button" onClick={saveEditedTournament}>Salvar alterações</button>
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
              <button type="button" className="deleteBtn" onClick={() => setPhotoEditor(null)}>Cancelar</button>
              <button type="button" onClick={applyEditedOrganizerPhoto}>Aplicar foto</button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="playSidebar">
        <div className="playSideLogo"><BeachLogo /><strong>Torneio<br/>Fácil BT</strong></div>
        <button className={`playNavItem ${activePanel === "inicio" ? "active" : ""}`} type="button" onClick={() => setActivePanel("inicio")}><span>🏠</span><small>Início</small></button>
        <button className={`playNavItem ${activePanel === "criar" ? "active" : ""}`} type="button" onClick={() => setActivePanel("criar")}><span>➕</span><small>Criar</small></button>
        <button className={`playNavItem ${activePanel === "modalidades" ? "active" : ""}`} type="button" onClick={() => setActivePanel("modalidades")}><span>🎾</span><small>Modalidades</small></button>
        <button className={`playNavItem ${activePanel === "ajustes" ? "active" : ""}`} type="button" onClick={() => setActivePanel("ajustes")}><span>👤</span><small>Perfil</small></button>
        <button className={`playNavItem ${activePanel === "lixeira" ? "active" : ""}`} type="button" onClick={() => setActivePanel("lixeira")}><span>🗑️</span><small>Lixeira</small></button>
      </aside>

      <div className="playMain">
        <header className="playTopbar">
          <div className="playBrandText">
            <strong>Torneio Fácil BT</strong>
            <span>Sua plataforma para gestão de competições de Beach Tennis</span>
          </div>
          <div className="playUserBox">
            <span>E aí, {profile.name || user.email?.split("@")[0] || "organizador"}!</span>
            <button type="button" onClick={logout}>Sair</button>
          </div>
        </header>

        <main className="playContent">
          <section className="playTitleBlock">
            <div>
              <h1>{activePanel === "inicio" ? "Início" : activePanel === "criar" ? "Criar torneio" : activePanel === "modalidades" ? "Modalidades" : activePanel === "lixeira" ? "Lixeira" : "Perfil"}</h1>
              <p>{activePanel === "inicio" ? "Veja um resumo da sua plataforma e acompanhe seus principais indicadores." : activePanel === "criar" ? "Cadastre um novo torneio e acompanhe o histórico de torneios criados." : activePanel === "modalidades" ? "Veja os formatos liberados para o seu plano." : activePanel === "lixeira" ? "Recupere torneios apagados nos últimos 30 dias." : "Gerencie os dados públicos do organizador e da arena."}</p>
            </div>
            <div className="playPlanPill">Plano {profile.plan} · {formatStatusBR(profile.status)}</div>
          </section>

          {activePanel === "inicio" && (
            <>
              <section className="playTabs homeQuickActions homeQuickActionsFour">
                <button type="button" onClick={() => setActivePanel("criar")}>➕ Criar torneio</button>
                <button type="button" onClick={() => {
                  setActivePanel("criar");
                  setTimeout(() => document.getElementById("historico-torneios")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}>🏆 Ver histórico</button>
                <button type="button" onClick={() => setActivePanel("modalidades")}>🎾 Ver modalidades</button>
                <button type="button" onClick={() => setActivePanel("ajustes")}>💳 Ver assinatura</button>
              </section>

              <section className="playStatsGrid">
                <div><strong>{tournaments.length}</strong><span>Torneios criados</span></div>
                <div><strong>{allowedTypes.length}</strong><span>Modalidades liberadas</span></div>
                <div><strong>{profile.expires_at ? formatDateBR(profile.expires_at) : "—"}</strong><span>Vencimento</span></div>
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
    {selectedArenaProfile.address ? <div><strong>Endereço</strong><span>📍 {selectedArenaProfile.address}</span></div> : null}
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
              <small>{t.type}</small>
            </div>
            <div className="tournamentMeta">
              {details.eventDate ? <span>📅 {formatDateBR(details.eventDate)}</span> : null}
              {details.eventStartTime ? <span>⏰ {details.eventStartTime}</span> : null}
              {details.location ? <span>📍 {details.location}</span> : null}
              {details.gender ? <span>🏷️ {details.gender}</span> : null}
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
        <small>📍 {[arena.city, arena.state].filter(Boolean).join("/") || "Local não informado"}</small>
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
      <strong>🏷️ Categorias, datas e horários</strong>
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
      <strong>📅 Datas e horários do evento</strong>
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
        <option key={type} value={type}>{type}</option>
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
                      <span className="tournamentTypeBadge">{t.type}</span>
                    </div>

                    <div className="tournamentMeta">
                      {details.multiCategoryEvent ? <span>🧩 {details.eventName}</span> : null}
                      {details.gender ? <span>🏷️ {details.gender}</span> : null}
                      {details.eventDate ? <span>📅 {formatDateBR(details.eventDate)}</span> : null}
                      {details.eventStartTime ? <span>⏰ {details.eventStartTime}</span> : null}
                      {details.location ? <span>📍 {details.location}</span> : null}
                      {details.winningScore ? <span>🎯 {details.winningScore} games</span> : null}
                    </div>
                  </div>

                  <div className="tournamentActions">
                    <button type="button" className="editBtn" onClick={() => openEditTournament(t)}>Editar</button>
                    <button type="button" onClick={() => openTournament(t)}>Abrir</button>
                    <button type="button" className="shareTournamentBtn" onClick={() => setShareTarget(t)}>Compartilhar</button>
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
                      <span className="tournamentTypeBadge">{t.type}</span>
                    </div>

                    <div className="tournamentMeta">
                      {details.multiCategoryEvent ? <span>🧩 {details.eventName}</span> : null}
                      {details.gender ? <span>🏷️ {details.gender}</span> : null}
                      {details.eventDate ? <span>📅 {formatDateBR(details.eventDate)}</span> : null}
                      {details.eventStartTime ? <span>⏰ {details.eventStartTime}</span> : null}
                      {details.location ? <span>📍 {details.location}</span> : null}
                      {details.winningScore ? <span>🎯 {details.winningScore} games</span> : null}
                    </div>
                  </div>

                  <div className="tournamentActions">
                    <button type="button" className="editBtn" onClick={() => openEditTournament(t)}>Editar</button>
                    <button type="button" onClick={() => openTournament(t)}>Abrir</button>
                    <button type="button" className="shareTournamentBtn" onClick={() => setShareTarget(t)}>Compartilhar</button>
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

{activePanel === "modalidades" && (
<section className="card">
  <h2>Modalidades liberadas</h2>
  <div className="modalitiesGrid internalModalities">
    {allowedTypes.includes("Super 08") && (
      <Info
        title="Super 08"
        text="Formato individual com 8 participantes, ideal para torneios rápidos. Cada atleta joga com parceiros diferentes ao longo das rodadas, evitando que uma dupla fixa determine todo o resultado. O sistema monta os confrontos automaticamente, organiza as quadras, registra os placares e calcula o ranking individual. No final, vence quem tiver melhor desempenho geral conforme os critérios definidos, como vitórias, pontos e saldo de games."
      />
    )}

    {allowedTypes.includes("Super 10 Mista (Dupla Aleatória)") && (
      <Info
        title="Super 10 Mista Aleatória"
        text="Formato misto com 10 participantes: 5 homens e 5 mulheres. São 5 rodadas, com 2 jogos por rodada, e em cada rodada descansam 1 homem e 1 mulher. Ao final, todos jogam 4 partidas e descansam 1 vez. O sistema monta automaticamente as duplas mistas, organiza as quadras, registra os placares e calcula rankings separados masculino e feminino. É ideal para torneios de hoje, eventos rápidos e grupos menores, mantendo equilíbrio de jogos entre todos os atletas."
      />
    )}

    {allowedTypes.includes("Super 12 Mista (Dupla Aleatória)") && (
      <Info
        title="Super 12 Mista Aleatória"
        text="Formato misto com 12 participantes: 6 homens e 6 mulheres. Primeiro, os atletas são cadastrados e sorteados. Depois, o sistema combina os participantes para formar duplas mistas em diferentes rodadas, mantendo equilíbrio entre homens e mulheres. Cada jogador participa de jogos com combinações variadas, e o desempenho é calculado individualmente. É uma boa opção para eventos sociais e competitivos com rotação de parceiros."
      />
    )}

    {allowedTypes.includes("Super 16 Mista (Dupla Aleatória)") && (
      <Info
        title="Super 16 Mista Aleatória"
        text="Formato misto com 16 participantes: 8 homens e 8 mulheres. Funciona como uma versão maior do Super 12, com mais atletas, mais jogos e maior movimentação de quadras. O sistema monta as duplas mistas de forma organizada, distribui as partidas e permite preencher os placares rodada por rodada. O ranking é individual, ou seja, cada atleta pontua pelo próprio desempenho, mesmo jogando com parceiros diferentes durante o torneio."
      />
    )}

    {allowedTypes.includes("Super 12 Mista (Dupla Fixa)") && (
      <Info
        title="Super 12 Mista Dupla Fixa"
        text="Formato com 6 duplas já definidas antes do início do campeonato. Diferente das modalidades aleatórias, aqui os parceiros permanecem juntos do começo ao fim. O sistema gera automaticamente os confrontos entre as duplas, organiza a sequência de jogos e calcula a classificação geral pelos placares lançados. É indicado quando os atletas já se inscrevem em dupla e querem disputar como equipe fixa."
      />
    )}

    {allowedTypes.includes("Super 16 Mista (Dupla Fixa)") && (
      <Info
        title="Super 16 Mista Dupla Fixa"
        text="Formato com 8 duplas fixas, indicado para torneios maiores em que cada equipe permanece igual durante toda a competição. O sistema organiza os jogos entre as duplas, distribui as rodadas e registra os resultados. A classificação é por dupla, não individual. Conforme os placares são preenchidos, o ranking geral é atualizado com vitórias, pontos e saldo de games, ajudando o organizador a acompanhar quem está avançando melhor."
      />
    )}

    {allowedTypes.includes("Simples 8") && (
      <Info
        title="Simples 8"
        text="Formato individual com 8 jogadores, sem formação de duplas. Cada atleta compete por conta própria, e o sistema monta a tabela de jogos automaticamente. É ideal para torneios de simples, desafios internos ou eventos menores. Os placares alimentam um ranking geral individual, permitindo acompanhar vitórias, pontos e saldo de games até definir os melhores colocados."
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
                <span className="tournamentTypeBadge">{t.type}</span>
              </div>

              <div className="tournamentMeta">
                {details.multiCategoryEvent ? <span>🧩 Várias categorias</span> : null}
                {details.gender ? <span>🏷️ {details.gender}</span> : null}
                {details.eventDate ? <span>📅 {formatDateBR(details.eventDate)}</span> : null}
                {details.location ? <span>📍 {details.location}</span> : null}
                <span>🗑️ Exclui definitivamente em {daysLeft} dia(s)</span>
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
        {organizerProfile.photoUrl ? <img src={organizerProfile.photoUrl} alt="Foto do perfil" /> : <span>📷</span>}
      </div>
      <div className="instagramProfileInfo">
        <div className="instagramProfileTopline">
          <h2>{organizerProfile.arenaName || profile.name || "Meu perfil"}</h2>
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

    <div className="profileSubtabs">
      <button type="button" className={profileSubtab === "publicacoes" ? "active" : ""} onClick={() => setProfileSubtab("publicacoes")}>Publicações</button>
      <button type="button" className={profileSubtab === "editar" ? "active" : ""} onClick={() => setProfileSubtab("editar")}>Editar perfil</button>
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
                <span className="tournamentTypeBadge">{t.type}</span>
              </div>
              <div className="tournamentMeta">
                {details.multiCategoryEvent ? <span>🧩 {details.eventName}</span> : null}
                {details.gender ? <span>🏷️ {details.gender}</span> : null}
                {details.eventDate ? <span>📅 {formatDateBR(details.eventDate)}</span> : null}
                {details.eventStartTime ? <span>⏰ {details.eventStartTime}</span> : null}
                {details.location ? <span>📍 {details.location}</span> : null}
                {details.winningScore ? <span>🎯 {details.winningScore} games</span> : null}
              </div>
            </div>
            <div className="tournamentActions">
              <button type="button" className="editBtn" onClick={() => openEditTournament(t)}>Editar</button>
              <button type="button" onClick={() => openTournament(t)}>Abrir</button>
              <button type="button" className="shareTournamentBtn" onClick={() => setShareTarget(t)}>Compartilhar</button>
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
        <span>Informações do usuário</span>
        <h2>Editar perfil</h2>
      </div>
      <button type="button" className="secondaryBtn" onClick={() => setProfileSubtab("publicacoes")}>Voltar às publicações</button>
    </div>
    <p className="profileSectionHint">Essas informações podem ser usadas como dados públicos da arena e do organizador.</p>

    <div className="organizerPhotoArea">
      <label className="organizerPhotoDropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleOrganizerPhotoFile(e.dataTransfer.files?.[0]); }}>
        <input type="file" accept="image/*" onChange={(e) => handleOrganizerPhotoFile(e.target.files?.[0])} />
        <div className="organizerPhotoPreview">
          {organizerProfile.photoUrl ? (
            <img src={organizerProfile.photoUrl} alt="Foto de perfil" />
          ) : (
            <span>📷</span>
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

      <div className="formField">
        <label>E-mail</label>
        <input type="email" value={organizerProfile.email} onChange={(e) => updateOrganizerProfile("email", e.target.value)} placeholder="contato@arena.com" />
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
  </section>
  ) : null}

  <section className="card subscriptionSummaryCard">
    <h2>Assinatura</h2>
    <div className="subscriptionSummaryGrid">
      <p><strong>Plano:</strong> {profile.plan}</p>
      <p><strong>Status:</strong> {formatStatusBR(profile.status)}</p>
      <p><strong>Vencimento:</strong> {profile.expires_at ? formatDateBR(profile.expires_at) : "não definido"}</p>
      <p><strong>E-mail da conta:</strong> {user.email}</p>
    </div>
  </section>
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
        teamCount: config.defaultTeams,
        mainBracketName: config.defaultMainBracketName,
        repechageName: config.defaultRepechageName,
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

function TournamentScreen({ tournament, onBack, onSave }) {
  const config = modalityConfig[tournament.type];

  const [data, setData] = useState(
    tournament.data || createInitialData(tournament.type, config)
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
  const [activeTournamentTab, setActiveTournamentTab] = useState("participantes");
  const [activeMatchesTab, setActiveMatchesTab] = useState("grupos");

  const saveTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  const firstRenderRef = useRef(true);

  const ranking = useMemo(
    () => calculateRanking(data, tournament.type, data.rankingCriteria),
    [data, tournament.type]
  );

  const cupGroupRankings = useMemo(
    () => isCupType(config) && data.groupsShuffled ? calculateCupGroupRankings(data, data.rankingCriteria) : [],
    [data, config.type]
  );

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

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
      .eq("id", tournament.id);

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
      .eq("id", tournament.id);

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

    const ok = await copyToClipboard(getPublicShareMessage(shareInfo.public_id));

    showNotice(
      ok ? "success" : "error",
      ok ? "Mensagem copiada" : "Erro ao copiar",
      ok ? "A mensagem com o link público foi copiada." : "Não foi possível copiar a mensagem."
    );
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

        copy.schedule = [];
        copy.brackets = [];
        copy.groupsShuffled = false;
      }

      return copy;
    });
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
    }

    setData(copy);
    setShuffleOverlay(null);
  }

function shuffleNames() {
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

  const countdown = setInterval(() => {
    seconds -= 1;
    setShuffleOverlay((prev) => (prev ? { ...prev, seconds } : null));

    if (seconds <= 0) {
      clearInterval(interval);
      clearInterval(countdown);
      finishShuffle();
    }
  }, 1000);
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
  const pendingGames = allGroupGames.some((game) => game.s1 === "" || game.s2 === "");

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
      "Preencha todos os placares da fase de grupos antes de gerar as chaves."
    );
    return;
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
  }

  setData(copy);
}

function updateBracketScore(matchKey, field, value) {
  setData((prev) => {
    const copy = structuredClone(prev);

    if (!copy.brackets || copy.brackets.length === 0) {
      copy.brackets = getCupAllBracketGames(copy);
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

    const fresh = getCupAllBracketGames(copy).map((game) => ({
      ...game,
      s1: existingScores[game.matchKey]?.s1 ?? game.s1 ?? "",
      s2: existingScores[game.matchKey]?.s2 ?? game.s2 ?? "",
    }));

    copy.brackets = fresh;
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
  }

  setData(copy);
  setClearTableOpen(false);
  showNotice("success", "Jogos e placares apagados", "Todos os jogos e placares foram removidos. Os participantes foram mantidos.");
}

const currentBrackets = isCupType(config) && data.brackets?.length
  ? groupStoredBracketGames(data)
  : null;

const parallelRanking =
  isCupType(config) && data.brackets?.length
    ? calculateParallelRanking(data, data.rankingCriteria || defaultRankingCriteria)
    : [];

const mainCupPodium = isCupType(config) && data.brackets?.length
  ? calculateMainCupPodium(data)
  : [];

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
            <span>🏆 {tournament.type}</span>
            {data.multiCategoryEvent ? <span>🧩 Várias categorias</span> : null}
            {data.gender ? <span>🏷️ {data.gender}</span> : null}
            {data.eventPeriodLabel || data.eventDate ? <span>🗓️ {data.eventPeriodLabel || formatDateBR(data.eventDate)}</span> : null}
            {data.eventDay ? <span>📅 {data.eventDay}</span> : null}
            {data.registrationDeadline ? <span>📝 Inscrições até {formatDateBR(data.registrationDeadline)}</span> : null}
            {data.eventStartTime ? <span>⏰ Início {data.eventStartTime}</span> : null}
            {data.dailyStartTimes && Object.keys(data.dailyStartTimes).length > 0 ? (
              <span>🕒 Horários por dia definidos</span>
            ) : null}
            {data.location ? <span>📍 {data.location}</span> : null}
            {data.winningScore ? <span>🎯 {data.winningScore} games</span> : null}
          </div>
        </div>

        <div className="actions tournamentHeaderActions">
          <button type="button" onClick={handleBack}>Voltar</button>
        </div>
      </header>

        <section className="shareHighlightBox">
          <div>
            <strong>🔗 Compartilhar tabela pública</strong>
            <p>Envie um link para atletas e convidados acompanharem o torneio sem acessar sua área de edição.</p>
          </div>

          <button
            type="button"
            className="shareHighlightBtn"
            onClick={() => setShareOpen((prev) => !prev)}
          >
            {shareOpen ? "Ocultar compartilhamento" : "Compartilhar tabela"}
          </button>
        </section>

              {shareOpen && (
          <section className="card shareCard">
            <h2>Como funciona o compartilhamento?</h2>

            <p>
              Ao ativar o link público, você gera uma página de visualização para atletas,
              convidados e organização acompanharem o torneio em tempo real.
            </p>

            <ul className="shareExplanationList">
              <li>Quem receber o link poderá ver participantes, jogos, placares, chaves e ranking.</li>
              <li>O acesso é somente para visualização: ninguém consegue editar nomes, placares ou configurações.</li>
              <li>Quando você alterar algo no torneio, a tabela pública acompanha as atualizações salvas.</li>
              <li>Se não quiser mais compartilhar, basta desativar o link público.</li>
            </ul>

            {!shareInfo.is_public ? (
              <button type="button" onClick={enablePublicShare} disabled={shareLoading}>
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

                  <button type="button" onClick={copyPublicLink}>
                    Compartilhar link
                  </button>
                </div>


                <div className="actions">
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
          <button type="button" className={activeTournamentTab === "participantes" ? "active" : ""} onClick={() => setActiveTournamentTab("participantes")}>👥 Participantes</button>
          {isCupType(config) && (
            <button type="button" className={activeTournamentTab === "grupos" ? "active" : ""} onClick={() => setActiveTournamentTab("grupos")}>🧩 Grupos</button>
          )}
          <button type="button" className={activeTournamentTab === "partidas" ? "active" : ""} onClick={() => setActiveTournamentTab("partidas")}>🔥 Partidas</button>
          <button type="button" className={activeTournamentTab === "ranking" ? "active" : ""} onClick={() => setActiveTournamentTab("ranking")}>🏆 Ranking</button>
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
                <CupGroupRankingView groupRankings={cupGroupRankings} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
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
              <button type="button" className={activeMatchesTab === "paralela" ? "active" : ""} onClick={() => setActiveMatchesTab("paralela")}>Disputa paralela</button>
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
                  {parallelRanking.length > 0 ? (
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
              ) : (
                <CupBracketView groupedBrackets={{ main: [], repechage: currentBrackets.repechage }} data={data} updateBracketScore={updateBracketScore} voiceRepeat={voiceRepeat} setVoiceRepeat={setVoiceRepeat} winningScore={getWinningScore(data)} />
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
          <label>{isCup18 || isCup21 ? "Nome da disputa paralela" : "Nome da repescagem"}</label>
          <input
            value={cupConfig.repechageName || config.defaultRepechageName}
            onChange={(e) => updateCupConfig("repechageName", e.target.value)}
            placeholder={isCup18 || isCup21 ? "Disputa Paralela" : "Repescagem"}
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
    <div className={`schedule ${readOnly ? "readOnlySchedule" : ""}`}>
      {!readOnly ? (
        <VoiceRepeatSelector
          voiceRepeat={voiceRepeat}
          setVoiceRepeat={setVoiceRepeat}
        />
      ) : null}

      {schedule.map((round, roundIndex) => (
        <div className={`roundCard ${readOnly ? "readOnlyRoundCard" : ""}`} key={roundIndex}>
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
                  className="secondaryBtn"
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

            return (
            <div className={`gameCard ${isFinished ? "gameFinished" : "gameWaiting"}`} key={gameIndex}>
              <div className="gameTopLine">
                <strong>
                  {showGroupName && game.groupName ? `${game.groupName} · ` : ""}
                  Quadra {game.court}
                </strong>
              </div>

              <div className="gameTeams">
                <div className={winnerSide === "team1" ? "winnerTeam" : winnerSide === "team2" ? "loserTeam" : ""}>{game.team1.join(" + ")}</div>
                <span>x</span>
                <div className={winnerSide === "team2" ? "winnerTeam" : winnerSide === "team1" ? "loserTeam" : ""}>{game.team2.join(" + ")}</div>
              </div>

              <div className="scoreRow">
           <input
  type="number"
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
  type="number"
  min="0"
  max={getMaxScore(winningScore)}
  inputMode="numeric"
  pattern="[0-9]*"
  value={game.s2}
  onChange={(e) => updateScore(roundIndex, gameIndex, "s2", e.target.value)}
  readOnly={readOnly}
  disabled={readOnly}
/>
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

function RankingTable({ title, rows, rankingCriteria }) {
  const criteria = getRankingCriteria(rankingCriteria);

  return (
    <div>
      <h3>{title}</h3>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            {criteria.order.map((key) => (
              <th key={key}>{getRankingColumnLabel(key)}</th>
            ))}
            <th>Jogos</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id}>
              <td>{podium(i)}</td>
              <td>{p.name}</td>
              {criteria.order.map((key) => (
                <td key={key}>{p[key]}</td>
              ))}
              <td>{p.played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CupGroupRankingView({ groupRankings, rankingCriteria }) {
  return (
    <div className="twoCols">
      {groupRankings.map((group) => (
        <RankingTable
          key={group.id}
          title={group.name}
          rows={group.rows}
          rankingCriteria={rankingCriteria}
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
                className="secondaryBtn"
                onClick={stopSpeech}
              >
                ⏹️ Parar
              </button>
            </div>
          </div>

          {round.games.map((game) => {
            const blocked =
              !game.ids1?.length ||
              !game.ids2?.length ||
              game.team1?.[0] === "Aguardando" ||
              game.team2?.[0] === "Aguardando";

            const winnerSide = getScoreWinnerSide(game, winningScore);
            const isFinished = winnerSide !== null;

            return (
              <div className={`gameCard ${isFinished ? "gameFinished" : "gameWaiting"}`} key={game.matchKey}>
                <div className="gameTopLine">
                  <strong>Quadra {game.court}</strong>
                </div>

                <div className="gameTeams">
                  <div className={winnerSide === "team1" ? "winnerTeam" : winnerSide === "team2" ? "loserTeam" : ""}>{game.team1?.join(" + ") || "Aguardando"}</div>
                  <span>x</span>
                  <div className={winnerSide === "team2" ? "winnerTeam" : winnerSide === "team1" ? "loserTeam" : ""}>{game.team2?.join(" + ") || "Aguardando"}</div>
                </div>

                <div className="scoreRow">
                  <input
  type="number"
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
  type="number"
  min="0"
  max={getMaxScore(winningScore)}
  inputMode="numeric"
  pattern="[0-9]*"
  value={game.s2}
  onChange={(e) => updateBracketScore(game.matchKey, "s2", e.target.value)}
  disabled={blocked}
/>
                </div>

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
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState(null);

  async function loadPublicTournament({ silent = false } = {}) {
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("public_id", publicId)
      .eq("is_public", true)
      .single();

    if (error) {
      console.error(error);
      setError("Link público não encontrado ou desativado.");
      setTournament(null);
    } else {
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

  return <PublicTournamentScreen tournament={tournament} />;
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

function PublicTournamentScreen({ tournament }) {
  const [activePublicTab, setActivePublicTab] = useState("participantes");
  const [activePublicMatchesTab, setActivePublicMatchesTab] = useState("grupos");
  const config = modalityConfig[tournament.type];
  const data = tournament.data || createInitialData(tournament.type, config);
  const publicInfo = data.publicInfo || {};
  const publicVisibility = publicInfo.visibility || {};
  const publicOrganizer = publicInfo.organizer || {};
  const registrationClosed = data.registrationDeadline ? new Date() > new Date(`${data.registrationDeadline}T23:59:59`) : false;
  const ranking = calculateRanking(data, tournament.type, data.rankingCriteria);

  const isCup = isCupType(config);

  const cupGroupRankings = isCup
    ? calculateCupGroupRankings(data, data.rankingCriteria)
    : [];

  const currentBrackets = isCup && data.brackets?.length
    ? groupStoredBracketGames(data)
    : null;

  const parallelRanking =
    isCup && data.brackets?.length
      ? calculateParallelRanking(data, data.rankingCriteria || defaultRankingCriteria)
      : [];

  const mainCupPodium = isCup && data.brackets?.length
    ? calculateMainCupPodium(data)
    : [];

  const publicAthletes = getRegisteredAthletesForPublic(data, config);

  return (
    <div className="publicPage">
      <header className="publicHeader publicHeaderWithLogo">
        <div className="publicBrandRow">
          <BeachLogo />
          <div>
            <strong>Torneio Fácil BT</strong>
            <span>Sua plataforma para gestão de competições de Beach Tennis</span>
          </div>
        </div>

        <div className="publicTitleBlock">
          <span>Tabela pública</span>
          <h1>{tournament.name}</h1>
          <p>
            {tournament.type}
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
            {data.registrationDeadline ? <span>📝 Inscrições até {formatDateBR(data.registrationDeadline)}</span> : null}
            {registrationClosed ? <span className="closedInfo">🔒 Inscrições encerradas</span> : null}
            {data.eventStartTime ? <span>⏰ Início {data.eventStartTime}</span> : null}
            {data.location ? <span>📍 {data.location}</span> : null}
            {data.winningScore ? <span>🎯 {data.winningScore} games</span> : null}
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
              {publicVisibility.showWhatsapp && publicOrganizer.whatsapp ? <a href={"https://wa.me/" + String(publicOrganizer.whatsapp).replace(/\D/g, "")} target="_blank" rel="noreferrer">💬 WhatsApp</a> : null}
              {publicVisibility.showWhatsappGroupLink && publicOrganizer.whatsappGroupLink ? <a href={publicOrganizer.whatsappGroupLink} target="_blank" rel="noreferrer">👥 Grupo do WhatsApp</a> : null}
              {publicVisibility.showInstagram && publicOrganizer.instagramLink ? <a href={publicOrganizer.instagramLink} target="_blank" rel="noreferrer">📸 {publicOrganizer.instagramHandle || "Instagram"}</a> : null}
              {publicVisibility.showInstagram && !publicOrganizer.instagramLink && publicOrganizer.instagramHandle ? <span>📸 {publicOrganizer.instagramHandle}</span> : null}
              {publicVisibility.showAddress && publicOrganizer.address ? <span>📍 {publicOrganizer.address}</span> : null}
              {publicVisibility.showCityState && (publicOrganizer.city || publicOrganizer.state) ? <span>🏙️ {[publicOrganizer.city, publicOrganizer.state].filter(Boolean).join("/")}</span> : null}
              {publicVisibility.showMapsLink && publicOrganizer.mapsLink ? <a href={publicOrganizer.mapsLink} target="_blank" rel="noreferrer">🗺️ Ver endereço no mapa</a> : null}
            </div>
          </section>
        ) : null}

        <nav className="tournamentTopTabs publicTournamentTabs" aria-label="Visualização pública do torneio">
          <button type="button" className={activePublicTab === "participantes" ? "active" : ""} onClick={() => setActivePublicTab("participantes")}>👥 Participantes</button>
          {isCup ? <button type="button" className={activePublicTab === "grupos" ? "active" : ""} onClick={() => setActivePublicTab("grupos")}>🧩 Grupos</button> : null}
          <button type="button" className={activePublicTab === "partidas" ? "active" : ""} onClick={() => setActivePublicTab("partidas")}>🔥 Partidas</button>
          <button type="button" className={activePublicTab === "ranking" ? "active" : ""} onClick={() => setActivePublicTab("ranking")}>🏆 Ranking</button>
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
                <CupGroupRankingView groupRankings={cupGroupRankings} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
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
              <button type="button" className={activePublicMatchesTab === "paralela" ? "active" : ""} onClick={() => setActivePublicMatchesTab("paralela")}>Disputa paralela</button>
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
              {!currentBrackets ? <p>As chaves finais ainda não foram geradas pelo organizador.</p> : <PublicCupBracketView groupedBrackets={{ main: currentBrackets.main, repechage: [] }} />}
            </div>
          ) : null}

          {isCup ? (
            <div style={{ display: activePublicMatchesTab === "paralela" ? undefined : "none" }}>
              {!currentBrackets ? <p>A disputa paralela ainda não foi gerada pelo organizador.</p> : <PublicCupBracketView groupedBrackets={{ main: [], repechage: currentBrackets.repechage }} />}
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
                {parallelRanking.length > 0 ? <RankingTable title="Classificação" rows={parallelRanking} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} /> : <p>A disputa paralela ainda não tem ranking.</p>}
              </div>
            </div>
          ) : (
            <RankingView ranking={ranking} type={tournament.type} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
          )}
        </section>

        {isCup ? (
          <>
            <section className="card">
              <h2>Classificação dos grupos</h2>

              <CupGroupRankingView
                groupRankings={cupGroupRankings}
                rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
              />
            </section>

            <section className="card">
              <h2>Chaves finais</h2>

              {!currentBrackets ? (
                <p>As chaves finais ainda não foram geradas pelo organizador.</p>
              ) : (
                <>
                  <PublicCupBracketView groupedBrackets={currentBrackets} />

                  <CupPodiumView podium={mainCupPodium} title={data.cupConfig?.mainBracketName || "Principal"} />

                  {parallelRanking.length > 0 && (
                    <div className="parallelRankingBox">
                      <h3>Ranking da {data.cupConfig?.repechageName || "Disputa Paralela"}</h3>

                      <RankingTable
                        title="Classificação"
                        rows={parallelRanking}
                        rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        ) : null}
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

function PublicCupBracketView({ groupedBrackets }) {
  return (
    <div className="cupBrackets">
      <PublicBracketColumn rounds={groupedBrackets.main} />
      <PublicBracketColumn rounds={groupedBrackets.repechage} />
    </div>
  );
}

function PublicBracketColumn({ rounds }) {
  return (
    <div className="bracketColumn">
      {rounds.map((round, roundIndex) => (
        <div className="roundCard" key={roundIndex}>
          <h3>
            {round.title === "Disputa Paralela"
              ? round.bracketTitle
              : `${round.bracketTitle} · ${round.title}`}
          </h3>

          {round.games.map((game) => (
            <div className="gameCard" key={game.matchKey}>
              <strong>Quadra {game.court}</strong>

              <div className="gameTeams">
                <div>{game.team1?.join(" + ") || "Aguardando"}</div>
                <span>x</span>
                <div>{game.team2?.join(" + ") || "Aguardando"}</div>
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

createRoot(document.getElementById("root")).render(<App />);
