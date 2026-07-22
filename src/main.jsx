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
  { value: "wins_points_balance", label: "Vitórias > Pontos > Saldo", order: ["w", "pts", "bal"] },
  { value: "wins_balance_points", label: "Vitórias > Saldo > Pontos", order: ["w", "bal", "pts"] },
  { value: "points_wins_balance", label: "Pontos > Vitórias > Saldo", order: ["pts", "w", "bal"] },
  { value: "points_balance_wins", label: "Pontos > Saldo > Vitórias", order: ["pts", "bal", "w"] },
  { value: "balance_wins_points", label: "Saldo > Vitórias > Pontos", order: ["bal", "w", "pts"] },
  { value: "balance_points_wins", label: "Saldo > Pontos > Vitórias", order: ["bal", "pts", "w"] },
];

const defaultRankingCriteria = "wins_points_balance";

function generatePublicId() {
  return `tfbt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPublicUrl(publicId) {
  return `${window.location.origin}${window.location.pathname}?public=${publicId}`;
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
  return { w: "Vitórias", pts: "Pontos", bal: "Saldo" }[key] || key;
}

const allowedByPlan = {
  basic: [
    "Super 08",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
  ],
  pro: [
    "Super 08",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Fixa)",
    "Super 16 Mista (Dupla Fixa)",
  ],
  premium: [
    "Super 08",
    "Super 12 Mista (Dupla Aleatória)",
    "Super 16 Mista (Dupla Aleatória)",
    "Super 12 Mista (Dupla Fixa)",
    "Super 16 Mista (Dupla Fixa)",
    "Simples 8",
    "Copa",
  ],
};

const modalityConfig = {
  "Super 08": { type: "super8", total: 8, label: "Participante", courts: 2 },
  "Super 12 Mista (Dupla Aleatória)": { type: "mixed12", men: 6, women: 6, courts: 3 },
  "Super 16 Mista (Dupla Aleatória)": { type: "mixed16", men: 8, women: 8, courts: 4 },
  "Super 12 Mista (Dupla Fixa)": { type: "fixed12", teams: 6, courts: 3 },
  "Super 16 Mista (Dupla Fixa)": { type: "fixed16", teams: 8, courts: 4 },
  "Simples 8": { type: "simple8", total: 8, label: "Jogador", courts: 4 },
  "Copa": {
    type: "cup",
    allowedTeamCounts: [12, 24],
    defaultTeams: 12,
    groupSize: 3,
    defaultMainBracketName: "Principal",
    defaultRepechageName: "Repescagem",
    courts: 4,
  },
};

const super8Template = [
  [[[1, 2], [3, 4]], [[5, 6], [7, 8]]],
  [[[1, 3], [6, 8]], [[2, 4], [5, 7]]],
  [[[1, 4], [5, 8]], [[2, 3], [6, 7]]],
  [[[1, 5], [2, 6]], [[3, 7], [4, 8]]],
  [[[1, 6], [4, 7]], [[2, 5], [3, 8]]],
  [[[1, 7], [3, 5]], [[2, 8], [4, 6]]],
  [[[1, 8], [2, 7]], [[3, 6], [4, 5]]],
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

  return rounds.map((round) => round.map((game, index) => ({ ...game, court: index + 1 })));
}

function calculateCupGroupRankings(data, rankingCriteriaValue = defaultRankingCriteria) {
  const cupConfig = data.cupConfig || {};
  const teamCount = cupConfig.teamCount || 12;
  const groups = createCupGroups(teamCount);
  const teamNames = data.players.teams.map((t) => getTeamName(t));
  const criteria = getRankingCriteria(rankingCriteriaValue);

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

        const win1 = s1 > s2;
        const win2 = s2 > s1;

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

function getCupQualified(data) {
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

function getGameWinnerId(game) {
  const s1 = Number(game.s1);
  const s2 = Number(game.s2);

  if (game.s1 === "" || game.s2 === "" || Number.isNaN(s1) || Number.isNaN(s2)) return null;
  if (s1 === s2) return null;

  return s1 > s2 ? game.ids1?.[0] : game.ids2?.[0];
}

function resolveBracketGame(game, allGames, data) {
  const copy = { ...game };

  if (copy.source1) {
    const sourceGame = allGames.find((item) => item.matchKey === copy.source1);
    const winnerId = sourceGame ? getGameWinnerId(sourceGame) : null;
    copy.ids1 = winnerId === null ? [] : [winnerId];
  }

  if (copy.source2) {
    const sourceGame = allGames.find((item) => item.matchKey === copy.source2);
    const winnerId = sourceGame ? getGameWinnerId(sourceGame) : null;
    copy.ids2 = winnerId === null ? [] : [winnerId];
  }

  copy.team1 = copy.ids1?.length ? [getCupTeamName(data, copy.ids1[0])] : ["Aguardando"];
  copy.team2 = copy.ids2?.length ? [getCupTeamName(data, copy.ids2[0])] : ["Aguardando"];

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

function generateCupBrackets(data) {
  const qualified = getCupQualified(data);
  const cupConfig = data.cupConfig || {};
  const mainName = cupConfig.mainBracketName || "Principal";
  const repechageName = cupConfig.repechageName || "Repescagem";

  const mainIds = qualified.main.map((item) => item.id);
  const repechageIds = qualified.repechage.map((item) => item.id);

  const mainFirstRound = seedBracket(mainIds, "main");
  const repechageFirstRound = seedBracket(repechageIds, "repechage");

  const mainRounds = [];
  const repechageRounds = [];

  if (mainFirstRound.length) {
    mainRounds.push({
      title: mainFirstRound[0].roundName,
      bracketTitle: mainName,
      games: mainFirstRound,
    });

    if (mainIds.length === 8) {
      const semifinals = buildNextRound(mainFirstRound, "main", "Semifinal", "sf");
      const final = buildNextRound(semifinals, "main", "Final", "final");

      mainRounds.push({ title: "Semifinal", bracketTitle: mainName, games: semifinals });
      mainRounds.push({ title: "Final", bracketTitle: mainName, games: final });
    }

    if (mainIds.length === 16) {
      const quarterfinals = buildNextRound(mainFirstRound, "main", "Quartas de final", "qf");
      const semifinals = buildNextRound(quarterfinals, "main", "Semifinal", "sf");
      const final = buildNextRound(semifinals, "main", "Final", "final");

      mainRounds.push({ title: "Quartas de final", bracketTitle: mainName, games: quarterfinals });
      mainRounds.push({ title: "Semifinal", bracketTitle: mainName, games: semifinals });
      mainRounds.push({ title: "Final", bracketTitle: mainName, games: final });
    }
  }

  if (repechageFirstRound.length) {
    repechageRounds.push({
      title: repechageFirstRound[0].roundName,
      bracketTitle: repechageName,
      games: repechageFirstRound,
    });

    if (repechageIds.length === 4) {
      const final = buildNextRound(repechageFirstRound, "repechage", "Final", "final");
      repechageRounds.push({ title: "Final", bracketTitle: repechageName, games: final });
    }

    if (repechageIds.length === 8) {
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
        <h2>Excluir torneio?</h2>
        <p>
          Você está prestes a excluir <strong>{target.name}</strong>. Essa ação
          removerá o torneio e seus dados salvos.
        </p>
        <div className="confirmActions">
          <button type="button" className="secondaryBtn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="deleteBtn" onClick={onConfirm}>Sim, excluir</button>
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
        <h2>Apagar placares?</h2>
        <p>
          Todos os placares preenchidos deste campeonato serão apagados. A tabela
          e os participantes serão mantidos.
        </p>
        <div className="confirmActions">
          <button type="button" className="secondaryBtn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="deleteBtn" onClick={onConfirm}>Sim, apagar</button>
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
        {items.map((item) => <li key={item}>{item}</li>)}
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
  const [openInfoTab, setOpenInfoTab] = useState("plans");

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
        showNotice("warning", "Data de nascimento obrigatória", "Informe sua data de nascimento.");
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
            <span>Gestão simples para torneios de Beach Tennis</span>
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
              setTimeout(() => document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setTimeout(() => document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" }), 50);
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
              🔊 Agora com chamada de jogos por voz
            </div>

            <h1>
              Organize torneios de Beach Tennis com mais facilidade
            </h1>

            <p>
              Crie campeonatos, sorteie participantes, gere tabelas, acompanhe rankings,
              chame jogos por voz e salve tudo automaticamente em uma plataforma simples
              para organizadores, arenas e clubes.
            </p>

            <div className="heroActions">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  document.getElementById("acesso")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Criar minha conta
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
              <span>🏆 Tabelas automáticas</span>
              <span>🎾 Duplas fixas e aleatórias</span>
              <span>📊 Ranking configurável</span>
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

                <div className="mockTitle">Rodada 1</div>

                <div className="mockGame">
                  <strong>Quadra 1</strong>
                  <p>João + Pedro x Lucas + Marcos</p>
                </div>

                <div className="mockGame">
                  <strong>Quadra 2</strong>
                  <p>Ana + Carla x Júlia + Fernanda</p>
                </div>

                <button type="button" className="mockVoiceBtn">
                  🔊 Chamar rodada
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="landingSection">
          <div className="sectionIntro">
            <span>Como funciona</span>
            <h2>Do cadastro à chamada dos jogos em poucos passos</h2>
            <p>
              O Torneio Fácil BT foi pensado para reduzir o trabalho manual do organizador
              e deixar o torneio mais profissional.
            </p>
          </div>

          <div className="stepsGrid">
            <div className="stepCard">
              <div>1</div>
              <h3>Crie sua conta</h3>
              <p>Cadastre-se com seus dados e aguarde a liberação do acesso pelo administrador.</p>
            </div>

            <div className="stepCard">
              <div>2</div>
              <h3>Escolha a modalidade</h3>
              <p>Selecione Super 08, Super 12, Super 16, Simples 8 ou Copa, conforme seu plano.</p>
            </div>

            <div className="stepCard">
              <div>3</div>
              <h3>Gere a tabela</h3>
              <p>Informe os participantes, sorteie nomes e deixe o sistema montar os jogos.</p>
            </div>

            <div className="stepCard">
              <div>4</div>
              <h3>Acompanhe o torneio</h3>
              <p>Preencha placares, veja rankings e use a chamada por voz para anunciar os jogos.</p>
            </div>
          </div>
        </section>

        <section className="landingSection featuresSection">
          <div className="sectionIntro">
            <span>Recursos</span>
            <h2>Ferramentas para organizar melhor</h2>
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
              <p>Escolha a ordem dos critérios entre vitórias, pontos e saldo.</p>
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
              <p>Formato com grupos, chave principal e repescagem com nomes editáveis.</p>
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
                "Super 12 Mista Aleatória",
                "Super 16 Mista Aleatória",
                "Super 12 Mista Dupla Fixa",
                "Super 16 Mista Dupla Fixa",
                "Simples 8",
                "Copa",
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
              text="Formato com 8 participantes. O sistema gera duplas variáveis, monta as rodadas e calcula o ranking individual conforme os placares."
            />

            <Info
              title="Super 12 Mista Aleatória"
              text="Formato com 6 homens e 6 mulheres. As duplas são montadas de forma alternada conforme a numeração sorteada, mantendo jogos mistos durante o torneio."
            />

            <Info
              title="Super 16 Mista Aleatória"
              text="Formato com 8 homens e 8 mulheres. O sistema organiza rodadas com duplas mistas alternadas e ranking individual por desempenho."
            />

            <Info
              title="Super 12 Mista Dupla Fixa"
              text="Formato com 6 duplas fixas. As duplas permanecem as mesmas durante todo o campeonato e jogam entre si em rodadas automáticas."
            />

            <Info
              title="Super 16 Mista Dupla Fixa"
              text="Formato com 8 duplas fixas. O sistema gera os confrontos entre as duplas, registra placares e monta o ranking geral."
            />

            <Info
              title="Simples 8"
              text="Formato individual com 8 jogadores. Cada atleta joga individualmente, com tabela automática e ranking geral por desempenho."
            />

            <Info
              title="Copa"
              text="Formato exclusivo do plano Premium. Pode ser jogado com 12 ou 24 duplas, com fase de grupos, chave principal e repescagem com nomes editáveis."
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
                    type="date"
                    value={birthDate}
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
        <p><strong>Status:</strong> {profile.status}</p>
        <p><strong>Vencimento:</strong> {profile.expires_at || "não definido"}</p>
      </div>

      <p>Entre em contato para regularizar seu acesso.</p>
      <button type="button" onClick={logout}>Sair</button>
    </div>
  );
}

function Dashboard({ profile, user }) {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Super 08");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  const allowedTypes = allowedByPlan[profile.plan] || [];

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  async function loadTournaments() {
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

    setTournaments(data || []);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  async function createTournament() {
    if (!newName.trim()) {
      showNotice("warning", "Nome obrigatório", "Digite um nome para este torneio.");
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

    setSaving(true);

    const config = modalityConfig[newType];
    const initialData = createInitialData(newType, config);

    const { error } = await supabase.from("tournaments").insert({
      user_id: user.id,
      name: newName.trim(),
      type: newType,
      data: initialData,
      status: "active",
    });

    setSaving(false);

    if (error) {
      showNotice("error", "Erro ao criar torneio", "Tente novamente em alguns instantes.");
      console.error(error);
      return;
    }

    setNewName("");
    await loadTournaments();
    showNotice("success", "Torneio criado", "O torneio foi criado com sucesso.");
  }

  async function confirmDeleteTournament() {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("user_id", user.id);

    if (error) {
      showNotice("error", "Erro ao excluir", "Não foi possível excluir este torneio.");
      console.error(error);
      return;
    }

    setDeleteTarget(null);
    await loadTournaments();
    showNotice("success", "Torneio excluído", "O torneio foi removido.");
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
    <div className="appPage">
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
      <ConfirmModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDeleteTournament} />

      <header>
        <div>
          <h1>Torneio Fácil BT</h1>
          <p>Dashboard profissional com login real.</p>
        </div>
        <button type="button" onClick={logout}>Sair</button>
      </header>

      <section className="card">
        <h2>Meu plano</h2>
        <p><strong>Plano:</strong> {profile.plan}</p>
        <p><strong>Status:</strong> {profile.status}</p>
        <p><strong>Vencimento:</strong> {profile.expires_at}</p>
      </section>

      <section className="card">
        <h2>Modalidades liberadas</h2>
        <div className="grid">
          {allowedTypes.map((item) => <div className="modality" key={item}>🏆 {item}</div>)}
        </div>
      </section>

      <section className="card">
        <h2>Criar novo torneio</h2>
        <label>Nome do torneio</label>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Torneio de sábado" />

        <label>Modalidade</label>
        <select value={newType} onChange={(e) => setNewType(e.target.value)}>
          {allowedTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>

        <button type="button" onClick={createTournament} disabled={saving}>
          {saving ? "Salvando..." : "Criar torneio"}
        </button>
      </section>

      <section className="card">
        <h2>Meus torneios</h2>
        {tournaments.length === 0 ? (
          <p>Nenhum torneio criado ainda.</p>
        ) : (
          <div className="tournamentList">
            {tournaments.map((t) => (
              <div className="tournamentItem" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.type}</span>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => openTournament(t)}>Abrir</button>
                  <button type="button" className="deleteBtn" onClick={() => setDeleteTarget(t)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function createInitialData(type, config) {
  const base = { rankingCriteria: defaultRankingCriteria, schedule: [] };

  if (config.type === "mixed12" || config.type === "mixed16") {
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

  if (config.type === "cup") {
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

  if (config.type === "mixed12" || config.type === "mixed16") {
    return [...data.players.men, ...data.players.women];
  }

  if (config.type === "fixed12" || config.type === "fixed16" || config.type === "cup") {
    return data.players.teams.map((team, index) => `Dupla ${index + 1}: ${team.a} + ${team.b}`);
  }

  return data.players || [];
}

function TournamentScreen({ tournament, onBack, onSave }) {
  const config = modalityConfig[tournament.type];
  const [data, setData] = useState(tournament.data || createInitialData(tournament.type, config));
  const [savingStatus, setSavingStatus] = useState("Salvo");
  const [shuffleOverlay, setShuffleOverlay] = useState(null);
  const [notice, setNotice] = useState(null);
const [clearScoresOpen, setClearScoresOpen] = useState(false);
const [shareOpen, setShareOpen] = useState(false);
const [shareLoading, setShareLoading] = useState(false);
const [shareInfo, setShareInfo] = useState({
  public_id: tournament.public_id || null,
  is_public: tournament.is_public || false,
});
const [voiceRepeat, setVoiceRepeat] = useState(1);

  const saveTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  const firstRenderRef = useRef(true);

  const ranking = useMemo(
    () => calculateRanking(data, tournament.type, data.rankingCriteria),
    [data, tournament.type]
  );

  const cupGroupRankings = useMemo(
    () => config.type === "cup" ? calculateCupGroupRankings(data, data.rankingCriteria) : [],
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

  const ok = await copyToClipboard(getPublicUrl(publicId));

  showNotice(
    "success",
    "Link público ativado",
    ok
      ? "O link foi ativado e copiado para a área de transferência."
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

  const ok = await copyToClipboard(getPublicUrl(shareInfo.public_id));

  showNotice(
    ok ? "success" : "error",
    ok ? "Link copiado" : "Erro ao copiar",
    ok ? "O link público foi copiado." : "Não foi possível copiar o link."
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
      }

      return copy;
    });
  }

  function updatePlayer(path, value) {
    const copy = structuredClone(data);

    if (path.kind === "normal") copy.players[path.index] = value;
    if (path.kind === "men") copy.players.men[path.index] = value;
    if (path.kind === "women") copy.players.women[path.index] = value;
    if (path.kind === "team") copy.players.teams[path.index][path.field] = value;

    if (config.type === "cup") {
      copy.brackets = [];
    }

    setData(copy);
  }

  function finishShuffle() {
    const copy = structuredClone(data);

    if (config.type === "mixed12" || config.type === "mixed16") {
      copy.players.men = shuffleArray(copy.players.men);
      copy.players.women = shuffleArray(copy.players.women);
    } else if (config.type === "fixed12" || config.type === "fixed16" || config.type === "cup") {
      copy.players.teams = shuffleArray(copy.players.teams);
    } else {
      copy.players = shuffleArray(copy.players);
    }

    copy.schedule = [];
    if (config.type === "cup") copy.brackets = [];

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
    if (config.type === "cup") {
      const schedule = generateCupGroupSchedule(data.players, data.cupConfig || {});
      setData((prev) => ({
        ...prev,
        schedule,
        brackets: [],
      }));
      showNotice("success", "Tabela gerada", "A fase de grupos da Copa foi montada com sucesso.");
      return;
    }

    const schedule = generateSchedule(tournament.type, data.players);
    setData({ ...data, schedule });
    showNotice("success", "Tabela gerada", "A tabela foi montada com sucesso.");
  }

  function generateBrackets() {
    if (config.type !== "cup") return;

    const allGroupGames = (data.schedule || []).flat();
    const pendingGames = allGroupGames.some((game) => game.s1 === "" || game.s2 === "");

    if (!data.schedule || data.schedule.length === 0) {
      showNotice("warning", "Fase de grupos não gerada", "Gere a tabela da fase de grupos antes de montar as chaves.");
      return;
    }

    if (pendingGames) {
      showNotice("warning", "Placares pendentes", "Preencha todos os placares da fase de grupos antes de gerar as chaves.");
      return;
    }

    const copy = syncCupBracketScores(data);
    setData(copy);
    showNotice("success", "Chaves geradas", "A chave principal e a repescagem foram montadas.");
  }

  function updateScore(roundIndex, gameIndex, field, value) {
    const copy = structuredClone(data);
    copy.schedule[roundIndex][gameIndex][field] = value;

    if (config.type === "cup") {
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

      copy.brackets = copy.brackets.map((game) => (
        game.matchKey === matchKey ? { ...game, [field]: value } : game
      ));

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

    if (config.type === "cup") {
      copy.brackets = [];
    }

    setData(copy);
    setClearScoresOpen(false);
    showNotice("success", "Placares apagados", "Todos os placares foram removidos.");
  }

  const currentBrackets = config.type === "cup" && data.brackets?.length
    ? groupStoredBracketGames(data)
    : null;

  return (
    <>
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
      <ConfirmClearScoresModal open={clearScoresOpen} onCancel={() => setClearScoresOpen(false)} onConfirm={clearScores} />

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
    <p>{tournament.type} · {savingStatus}</p>
  </div>

  <div className="actions">
    <button
      type="button"
      className="secondaryBtn"
      onClick={() => setShareOpen((prev) => !prev)}
    >
      🔗 Compartilhar tabela
    </button>

    <button type="button" onClick={handleBack}>Voltar</button>
  </div>
</header>

              {shareOpen && (
  <section className="card shareCard">
    <h2>Compartilhar tabela</h2>

    <p>
      Gere um link público para os participantes acompanharem jogos, placares e ranking
      sem poder editar nada.
    </p>

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
            Copiar
          </button>
        </div>

        <div className="actions">
          <button type="button" className="deleteBtn" onClick={disablePublicShare} disabled={shareLoading}>
            {shareLoading ? "Desativando..." : "Desativar link"}
          </button>
        </div>
      </>
    )}
  </section>
)}

        <section className="card">
          <h2>{config.type === "cup" ? "Configuração da Copa" : "Participantes"}</h2>

          <div className="rankingCriteriaBox">
            <label>Critério do ranking</label>
            <select value={data.rankingCriteria || defaultRankingCriteria} onChange={(e) => updateRankingCriteria(e.target.value)}>
              {rankingCriteriaOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {config.type === "cup" && (
            <CupConfigPanel
              data={data}
              config={config}
              updateCupConfig={updateCupConfig}
            />
          )}

          <PlayerInputs type={tournament.type} data={data} updatePlayer={updatePlayer} />

          <div className="actions">
            <button type="button" onClick={shuffleNames}>Sortear nomes</button>
            <button type="button" onClick={generate}>Gerar tabela</button>
          </div>
        </section>

        <section className="card">
          <h2>{config.type === "cup" ? "Fase de grupos" : "Rodadas"}</h2>

          {!data.schedule || data.schedule.length === 0 ? (
            <p> Clique em “Gerar tabela” para montar os jogos.</p>
          ) : (
            <>
              <ScheduleView
  schedule={data.schedule}
  updateScore={updateScore}
  showGroupName={config.type === "cup"}
  voiceRepeat={voiceRepeat}
  setVoiceRepeat={setVoiceRepeat}
/>
              <div className="actions">
                <button type="button" className="deleteBtn" onClick={() => setClearScoresOpen(true)}>
                  Apagar placares
                </button>
              </div>
            </>
          )}
        </section>

        {config.type === "cup" ? (
          <>
            <section className="card">
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

            <section className="card">
              <h2>Chaves finais</h2>

              {!currentBrackets ? (
                <p>Após preencher todos os placares da fase de grupos, clique em “Gerar chaves finais”.</p>
              ) : (
                <CupBracketView
  groupedBrackets={currentBrackets}
  data={data}
  updateBracketScore={updateBracketScore}
  voiceRepeat={voiceRepeat}
  setVoiceRepeat={setVoiceRepeat}
/>
              )}
            </section>
          </>
        ) : (
          <section className="card">
            <h2>Ranking</h2>
            <RankingView ranking={ranking} type={tournament.type} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
          </section>
        )}
      </div>
    </>
  );
}

function CupConfigPanel({ data, config, updateCupConfig }) {
  const cupConfig = data.cupConfig || {};

  return (
    <div className="cupConfigBox">
      <div className="twoCols">
        <div>
          <label>Quantidade de duplas</label>
          <select
            value={cupConfig.teamCount || config.defaultTeams}
            onChange={(e) => updateCupConfig("teamCount", Number(e.target.value))}
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
          <label>Nome da repescagem</label>
          <input
            value={cupConfig.repechageName || config.defaultRepechageName}
            onChange={(e) => updateCupConfig("repechageName", e.target.value)}
            placeholder="Repescagem"
          />
        </div>
      </div>

      <div className="infoBox">
        <p><strong>Formato:</strong> grupos de 3 duplas.</p>
        <p><strong>Fase de grupos:</strong> cada dupla joga 2 partidas.</p>
        <p><strong>Classificação:</strong> 1º e 2º de cada grupo avançam para a chave principal. O 3º vai para a repescagem.</p>
      </div>
    </div>
  );
}

function PlayerInputs({ type, data, updatePlayer }) {
  const config = modalityConfig[type];

  if (config.type === "mixed12" || config.type === "mixed16") {
    return (
      <div className="twoCols">
        <div>
          <h3>Homens</h3>
          {data.players.men.map((name, i) => (
            <div className="numberedInput" key={i}>
              <span>{i + 1}</span>
              <input value={name} onChange={(e) => updatePlayer({ kind: "men", index: i }, e.target.value)} />
            </div>
          ))}
        </div>

        <div>
          <h3>Mulheres</h3>
          {data.players.women.map((name, i) => (
            <div className="numberedInput" key={i}>
              <span>{config.men + i + 1}</span>
              <input value={name} onChange={(e) => updatePlayer({ kind: "women", index: i }, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.type === "fixed12" || config.type === "fixed16" || config.type === "cup") {
    return (
      <div className="twoCols">
        {data.players.teams.map((team, i) => (
          <div key={i} className="miniCard">
            <h3>Dupla {i + 1}</h3>
            <div className="numberedInput">
              <span>{i + 1}</span>
              <input value={team.a} onChange={(e) => updatePlayer({ kind: "team", index: i, field: "a" }, e.target.value)} />
            </div>
            <input value={team.b} onChange={(e) => updatePlayer({ kind: "team", index: i, field: "b" }, e.target.value)} />
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
          <input value={name} onChange={(e) => updatePlayer({ kind: "normal", index: i }, e.target.value)} />
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
  updateScore,
  showGroupName = false,
  voiceRepeat = 1,
  setVoiceRepeat,
}) {
  return (
    <div className="schedule">
      <VoiceRepeatSelector
        voiceRepeat={voiceRepeat}
        setVoiceRepeat={setVoiceRepeat}
      />

      {schedule.map((round, roundIndex) => (
        <div className="roundCard" key={roundIndex}>
          <div className="roundHeader">
            <h3>Rodada {roundIndex + 1}</h3>

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
                🔊 Chamar rodada
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

              <div className="scoreRow">
                <input
                  type="number"
                  value={game.s1}
                  onChange={(e) => updateScore(roundIndex, gameIndex, "s1", e.target.value)}
                />
                <span>—</span>
                <input
                  type="number"
                  value={game.s2}
                  onChange={(e) => updateScore(roundIndex, gameIndex, "s2", e.target.value)}
                />
              </div>

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
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function calculateRanking(data, type, rankingCriteriaValue = defaultRankingCriteria) {
  const config = modalityConfig[type];

  if (!data.players) return [];

  if (config.type === "cup") {
    const qualified = getCupQualified(data);
    return [...qualified.main, ...qualified.repechage];
  }

  let names = [];

  if (config.type === "mixed12" || config.type === "mixed16") {
    names = [...data.players.men, ...data.players.women];
  } else if (config.type === "fixed12" || config.type === "fixed16") {
    names = data.players.teams.map((t) => `${t.a} + ${t.b}`);
  } else {
    names = data.players;
  }

  const table = names.map((name, id) => ({ id, name, pts: 0, w: 0, bal: 0, played: 0 }));

  (data.schedule || []).flat().forEach((game) => {
    const s1 = Number(game.s1);
    const s2 = Number(game.s2);

    if (game.s1 === "" || game.s2 === "" || Number.isNaN(s1) || Number.isNaN(s2)) return;

    const win1 = s1 > s2;
    const win2 = s2 > s1;

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

  if (config.type === "mixed12" || config.type === "mixed16") {
    const menLimit = config.men;
    const men = ranking.filter((p) => p.id < menLimit);
    const women = ranking.filter((p) => p.id >= menLimit);

    return (
      <div className="twoCols">
        <RankingTable title="Ranking Masculino" rows={men} rankingCriteria={rankingCriteria} />
        <RankingTable title="Ranking Feminino" rows={women} rankingCriteria={rankingCriteria} />
      </div>
    );
  }

  return <RankingTable title="Ranking Geral" rows={ranking} rankingCriteria={rankingCriteria} />;
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
            {criteria.order.map((key) => <th key={key}>{getRankingColumnLabel(key)}</th>)}
            <th>Jogos</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id}>
              <td>{podium(i)}</td>
              <td>{p.name}</td>
              {criteria.order.map((key) => <td key={key}>{p[key]}</td>)}
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
}) {
  return (
    <div>
      <VoiceRepeatSelector
        voiceRepeat={voiceRepeat}
        setVoiceRepeat={setVoiceRepeat}
      />

      <div className="cupBrackets">
        <BracketColumn
          title={(data.cupConfig?.mainBracketName || "Principal")}
          rounds={groupedBrackets.main}
          updateBracketScore={updateBracketScore}
          voiceRepeat={voiceRepeat}
        />

        <BracketColumn
          title={(data.cupConfig?.repechageName || "Repescagem")}
          rounds={groupedBrackets.repechage}
          updateBracketScore={updateBracketScore}
          voiceRepeat={voiceRepeat}
        />
      </div>
    </div>
  );
}

function BracketColumn({
  title,
  rounds,
  updateBracketScore,
  voiceRepeat = 1,
}) {
  return (
    <div className="bracketColumn">
      <h3>{title}</h3>

      {rounds.map((round, roundIndex) => (
        <div className="roundCard" key={roundIndex}>
          <div className="roundHeader">
            <h3>{round.title}</h3>

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

          {round.games.map((game) => (
            <div className="gameCard" key={game.matchKey}>
              <strong>Quadra {game.court}</strong>

              <div className="gameTeams">
                <div>{game.team1?.join(" + ") || "Aguardando"}</div>
                <span>x</span>
                <div>{game.team2?.join(" + ") || "Aguardando"}</div>
              </div>

              <div className="scoreRow">
                <input
                  type="number"
                  value={game.s1}
                  onChange={(e) => updateBracketScore(game.matchKey, "s1", e.target.value)}
                  disabled={!game.ids1?.length || !game.ids2?.length}
                />
                <span>—</span>
                <input
                  type="number"
                  value={game.s2}
                  onChange={(e) => updateBracketScore(game.matchKey, "s2", e.target.value)}
                  disabled={!game.ids1?.length || !game.ids2?.length}
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
                  disabled={!game.ids1?.length || !game.ids2?.length}
                >
                  🔊 Chamar jogo
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PublicTournamentPage({ publicId }) {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState(null);

  async function loadPublicTournament() {
    setLoading(true);

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

    setLoading(false);
  }

  useEffect(() => {
    loadPublicTournament();

    const interval = setInterval(() => {
      loadPublicTournament();
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

function PublicTournamentScreen({ tournament }) {
  const config = modalityConfig[tournament.type];
  const data = tournament.data || createInitialData(tournament.type, config);
  const ranking = calculateRanking(data, tournament.type, data.rankingCriteria);

  const isCup = config.type === "cup";
  const cupGroupRankings = isCup
    ? calculateCupGroupRankings(data, data.rankingCriteria)
    : [];

  const currentBrackets = isCup && data.brackets?.length
    ? groupStoredBracketGames(data)
    : null;

  return (
    <div className="publicPage">
      <header className="publicHeader">
        <div>
          <span>Tabela pública</span>
          <h1>{tournament.name}</h1>
          <p>{tournament.type}</p>
        </div>

        <div className="publicBadge">
          Somente visualização
        </div>
      </header>

      <main className="publicContent">
        <section className="card">
          <h2>{isCup ? "Fase de grupos" : "Rodadas"}</h2>

          {!data.schedule || data.schedule.length === 0 ? (
            <p>A tabela ainda não foi gerada pelo organizador.</p>
          ) : (
            <PublicScheduleView
              schedule={data.schedule}
              showGroupName={isCup}
            />
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
                <PublicCupBracketView groupedBrackets={currentBrackets} />
              )}
            </section>
          </>
        ) : (
          <section className="card">
            <h2>Ranking</h2>
            <RankingView
              ranking={ranking}
              type={tournament.type}
              rankingCriteria={data.rankingCriteria || defaultRankingCriteria}
            />
          </section>
        )}
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
          <h3>{round.bracketTitle} · {round.title}</h3>

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
