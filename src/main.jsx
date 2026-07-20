import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const SUPABASE_URL = "https://dttutybojealkvuywszt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Tr5qiUea-p42UknVoWwPKg_6K_b1EX_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const allowedByPlan = {
  basic: ["Super 04", "Super 08", "Super 12 Mista", "Super 16 Mista"],
  pro: [
    "Super 04",
    "Super 08",
    "Super 12 Mista",
    "Super 16 Mista",
    "Duplas Fixas",
  ],
  premium: [
    "Super 04",
    "Super 08",
    "Super 12 Mista",
    "Super 16 Mista",
    "Duplas Fixas",
    "Simples 8",
    "Simples 16",
  ],
};

const modalityConfig = {
  "Super 04": {
    type: "super4",
    total: 4,
    label: "Participante",
    courts: 1,
  },
  "Super 08": {
    type: "super8",
    total: 8,
    label: "Participante",
    courts: 2,
  },
  "Super 12 Mista": {
    type: "mixed12",
    men: 6,
    women: 6,
    courts: 3,
  },
  "Super 16 Mista": {
    type: "mixed16",
    men: 8,
    women: 8,
    courts: 4,
  },
  "Duplas Fixas": {
    type: "fixed",
    teams: 8,
    courts: 4,
  },
  "Simples 8": {
    type: "simple",
    total: 8,
    label: "Jogador",
    courts: 4,
  },
  "Simples 16": {
    type: "simple",
    total: 16,
    label: "Jogador",
    courts: 8,
  },
};

const mixed16Rounds = [
  [
    [0, 0, 1, 1],
    [2, 2, 3, 3],
    [4, 4, 5, 5],
    [6, 6, 7, 7],
  ],
  [
    [0, 1, 2, 3],
    [1, 2, 3, 4],
    [4, 6, 6, 0],
    [5, 7, 7, 5],
  ],
  [
    [0, 2, 3, 5],
    [1, 3, 4, 6],
    [2, 4, 5, 7],
    [6, 1, 7, 0],
  ],
  [
    [0, 3, 4, 7],
    [1, 4, 5, 0],
    [2, 5, 6, 1],
    [3, 6, 7, 2],
  ],
  [
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [3, 7, 4, 0],
  ],
  [
    [0, 5, 6, 3],
    [1, 6, 7, 4],
    [2, 7, 4, 1],
    [3, 0, 5, 2],
  ],
  [
    [0, 6, 7, 5],
    [1, 7, 4, 2],
    [2, 0, 5, 3],
    [3, 1, 6, 4],
  ],
  [
    [0, 7, 4, 3],
    [1, 0, 5, 4],
    [2, 1, 6, 5],
    [3, 2, 7, 6],
  ],
];

const mixed12Rounds = [
  [
    [0, 0, 1, 1],
    [2, 2, 3, 3],
    [4, 4, 5, 5],
  ],
  [
    [0, 1, 2, 3],
    [1, 2, 4, 5],
    [3, 4, 5, 0],
  ],
  [
    [0, 2, 3, 5],
    [1, 3, 5, 1],
    [2, 4, 4, 0],
  ],
  [
    [0, 3, 4, 1],
    [1, 4, 3, 0],
    [2, 5, 5, 2],
  ],
  [
    [0, 4, 5, 3],
    [1, 5, 2, 0],
    [3, 1, 4, 2],
  ],
  [
    [0, 5, 4, 4],
    [1, 0, 5, 2],
    [2, 1, 3, 3],
  ],
];

const super4Rounds = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
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

function App() {
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

  if (loading) return <div className="center">Carregando...</div>;

  if (!session) return <Login />;

  if (!profile) {
    return (
      <div className="center">
        <h1>Torneio Fácil CSP</h1>
        <p>Perfil não encontrado.</p>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const expired = profile.expires_at && profile.expires_at < today;
  const blocked = profile.status !== "active" || expired;

  if (blocked) return <Blocked profile={profile} />;

  return <Dashboard profile={profile} user={session.user} />;
}

function Login() {
  const [email, setEmail] = useState("teste@torneiofacil.com");
  const [password, setPassword] = useState("123456");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setMessage("Erro ao entrar: " + error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage("Erro ao cadastrar: " + error.message);
      } else {
        setMessage(
          "Cadastro criado. Aguarde a liberação do acesso pelo administrador."
        );
      }
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="logo">🏆</div>
        <h1>Torneio Fácil CSP</h1>
        <p>Entre para acessar seus torneios.</p>

        <form onSubmit={handleSubmit}>
          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />

          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          className="linkBtn"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Criar nova conta" : "Já tenho conta"}
        </button>

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}

function Blocked({ profile }) {
  return (
    <div className="center">
      <h1>Acesso bloqueado</h1>
      <p>Seu acesso está pendente, bloqueado ou vencido.</p>

      <div className="infoBox">
        <p>
          <strong>Plano:</strong> {profile.plan}
        </p>
        <p>
          <strong>Status:</strong> {profile.status}
        </p>
        <p>
          <strong>Vencimento:</strong> {profile.expires_at || "não definido"}
        </p>
      </div>

      <p>Entre em contato para regularizar seu acesso.</p>

      <button onClick={() => supabase.auth.signOut()}>Sair</button>
    </div>
  );
}

function Dashboard({ profile, user }) {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Super 04");
  const [saving, setSaving] = useState(false);

  const allowedTypes = allowedByPlan[profile.plan] || [];

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar torneios.");
      console.error(error);
      return;
    }

    setTournaments(data || []);
  }

  async function createTournament() {
    if (!newName.trim()) {
      alert("Digite o nome do torneio.");
      return;
    }

    if (!allowedTypes.includes(newType)) {
      alert("Seu plano não permite essa modalidade.");
      return;
    }

    if (profile.plan === "basic" && tournaments.length >= 1) {
      alert("O plano básico permite apenas 1 campeonato por vez.");
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
      console.error(error);
      alert("Erro ao criar torneio.");
      return;
    }

    setNewName("");
    await loadTournaments();
  }

  async function deleteTournament(id) {
    if (!confirm("Tem certeza que deseja excluir este torneio?")) return;

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert("Erro ao excluir torneio.");
      console.error(error);
      return;
    }

    if (selected?.id === id) setSelected(null);
    await loadTournaments();
  }

  async function openTournament(tournament) {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournament.id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      alert("Erro ao abrir torneio.");
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
      alert("Erro ao salvar torneio.");
      console.error(error);
      return false;
    }

    setSelected(updated);
    setTournaments((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
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
      <header>
        <div>
          <h1>Torneio Fácil CSP</h1>
          <p>Dashboard profissional com login real.</p>
        </div>

        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>

      <section className="card">
        <h2>Meu plano</h2>
        <p>
          <strong>Plano:</strong> {profile.plan}
        </p>
        <p>
          <strong>Status:</strong> {profile.status}
        </p>
        <p>
          <strong>Vencimento:</strong> {profile.expires_at}
        </p>
      </section>

      <section className="card">
        <h2>Modalidades liberadas</h2>
        <div className="grid">
          {allowedTypes.map((item) => (
            <div className="modality" key={item}>
              🏆 {item}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Criar novo torneio</h2>

        <label>Nome do torneio</label>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: Torneio de sábado"
        />

        <label>Modalidade</label>
        <select value={newType} onChange={(e) => setNewType(e.target.value)}>
          {allowedTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button onClick={createTournament} disabled={saving}>
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
                  <button onClick={() => openTournament(t)}>Abrir</button>

                  <button
                    className="danger"
                    onClick={() => deleteTournament(t.id)}
                  >
                    Excluir
                  </button>
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
  if (config.type === "mixed12" || config.type === "mixed16") {
    return {
      players: {
        men: Array.from({ length: config.men }, (_, i) => `Homem ${i + 1}`),
        women: Array.from(
          { length: config.women },
          (_, i) => `Mulher ${i + 1}`
        ),
      },
      schedule: [],
    };
  }

  if (config.type === "fixed") {
    return {
      players: {
        teams: Array.from({ length: config.teams }, (_, i) => ({
          a: `Atleta 1 da dupla ${i + 1}`,
          b: `Atleta 2 da dupla ${i + 1}`,
        })),
      },
      schedule: [],
    };
  }

  return {
    players: Array.from(
      { length: config.total },
      (_, i) => `${config.label} ${i + 1}`
    ),
    schedule: [],
  };
}

function TournamentScreen({ tournament, onBack, onSave }) {
  const config = modalityConfig[tournament.type];
  const [data, setData] = useState(tournament.data || createInitialData(tournament.type, config));
  const [saving, setSaving] = useState(false);

  const ranking = useMemo(() => calculateRanking(data, tournament.type), [data, tournament.type]);

  function updatePlayer(path, value) {
    const copy = structuredClone(data);

    if (path.kind === "normal") {
      copy.players[path.index] = value;
    }

    if (path.kind === "men") {
      copy.players.men[path.index] = value;
    }

    if (path.kind === "women") {
      copy.players.women[path.index] = value;
    }

    if (path.kind === "team") {
      copy.players.teams[path.index][path.field] = value;
    }

    setData(copy);
  }

  async function saveData(showAlert = true) {
    setSaving(true);
    const ok = await onSave({ ...tournament, data });
    setSaving(false);

    if (ok && showAlert) alert("Torneio salvo.");
  }

  function generate() {
    const schedule = generateSchedule(tournament.type, data.players);
    setData({ ...data, schedule });
  }

  function updateScore(roundIndex, gameIndex, field, value) {
    const copy = structuredClone(data);
    copy.schedule[roundIndex][gameIndex][field] = value;
    setData(copy);
  }

  async function saveScores() {
    await saveData(true);
  }

  return (
    <div className="appPage">
      <header>
        <div>
          <h1>{tournament.name}</h1>
          <p>{tournament.type}</p>
        </div>

        <div className="actions">
          <button onClick={onBack}>Voltar</button>
          <button onClick={() => saveData(true)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      <section className="card">
        <h2>Participantes</h2>
        <PlayerInputs type={tournament.type} data={data} updatePlayer={updatePlayer} />

        <div className="actions">
          <button onClick={generate}>Gerar tabela</button>
          <button onClick={() => saveData(true)}>Salvar participantes</button>
        </div>
      </section>

      <section className="card">
        <h2>Rodadas</h2>

        {!data.schedule || data.schedule.length === 0 ? (
          <p>Clique em “Gerar tabela” para montar os jogos.</p>
        ) : (
          <>
            <ScheduleView
              schedule={data.schedule}
              updateScore={updateScore}
            />

            <button onClick={saveScores}>Salvar placares</button>
          </>
        )}
      </section>

      <section className="card">
        <h2>Ranking</h2>
        <RankingView ranking={ranking} type={tournament.type} />
      </section>
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
            <input
              key={i}
              value={name}
              onChange={(e) =>
                updatePlayer({ kind: "men", index: i }, e.target.value)
              }
            />
          ))}
        </div>

        <div>
          <h3>Mulheres</h3>
          {data.players.women.map((name, i) => (
            <input
              key={i}
              value={name}
              onChange={(e) =>
                updatePlayer({ kind: "women", index: i }, e.target.value)
              }
            />
          ))}
        </div>
      </div>
    );
  }

  if (config.type === "fixed") {
    return (
      <div className="twoCols">
        {data.players.teams.map((team, i) => (
          <div key={i} className="miniCard">
            <h3>Dupla {i + 1}</h3>

            <input
              value={team.a}
              onChange={(e) =>
                updatePlayer(
                  { kind: "team", index: i, field: "a" },
                  e.target.value
                )
              }
            />

            <input
              value={team.b}
              onChange={(e) =>
                updatePlayer(
                  { kind: "team", index: i, field: "b" },
                  e.target.value
                )
              }
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="twoCols">
      {data.players.map((name, i) => (
        <input
          key={i}
          value={name}
          onChange={(e) =>
            updatePlayer({ kind: "normal", index: i }, e.target.value)
          }
        />
      ))}
    </div>
  );
}

function generateSchedule(type, players) {
  const config = modalityConfig[type];

  if (config.type === "super4") {
    return super4Rounds.map((round) => [
      {
        court: 1,
        team1: [players[round[0][0]], players[round[0][1]]],
        ids1: round[0],
        team2: [players[round[1][0]], players[round[1][1]]],
        ids2: round[1],
        s1: "",
        s2: "",
      },
    ]);
  }

  if (config.type === "super8") {
    return berger(8).map((round) => [
      {
        court: 1,
        team1: [players[round[0][0]], players[round[0][1]]],
        ids1: round[0],
        team2: [players[round[1][0]], players[round[1][1]]],
        ids2: round[1],
        s1: "",
        s2: "",
      },
      {
        court: 2,
        team1: [players[round[2][0]], players[round[2][1]]],
        ids1: round[2],
        team2: [players[round[3][0]], players[round[3][1]]],
        ids2: round[3],
        s1: "",
        s2: "",
      },
    ]);
  }

  if (config.type === "fixed") {
    const teamNames = players.teams.map((t) => `${t.a} + ${t.b}`);

    return berger(8).map((round) =>
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
  }

  if (config.type === "simple") {
    return berger(config.total).map((round) =>
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
  }

  if (config.type === "mixed12" || config.type === "mixed16") {
    const men = players.men;
    const women = players.women;
    const rounds = config.type === "mixed12" ? mixed12Rounds : mixed16Rounds;
    const offset = config.men;

    return rounds.map((round) =>
      round.map((game, index) => ({
        court: index + 1,
        team1: [men[game[0]], women[game[1]]],
        ids1: [game[0], offset + game[1]],
        team2: [men[game[2]], women[game[3]]],
        ids2: [game[2], offset + game[3]],
        s1: "",
        s2: "",
      }))
    );
  }

  return [];
}

function ScheduleView({ schedule, updateScore }) {
  return (
    <div className="schedule">
      {schedule.map((round, roundIndex) => (
        <div className="roundCard" key={roundIndex}>
          <h3>Rodada {roundIndex + 1}</h3>

          {round.map((game, gameIndex) => (
            <div className="gameCard" key={gameIndex}>
              <strong>Quadra {game.court}</strong>

              <div className="gameTeams">
                <div>{game.team1.join(" + ")}</div>
                <span>x</span>
                <div>{game.team2.join(" + ")}</div>
              </div>

              <div className="scoreRow">
                <input
                  type="number"
                  value={game.s1}
                  onChange={(e) =>
                    updateScore(roundIndex, gameIndex, "s1", e.target.value)
                  }
                />

                <span>—</span>

                <input
                  type="number"
                  value={game.s2}
                  onChange={(e) =>
                    updateScore(roundIndex, gameIndex, "s2", e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function calculateRanking(data, type) {
  const config = modalityConfig[type];
  if (!data.players) return [];

  let names = [];

  if (config.type === "mixed12" || config.type === "mixed16") {
    names = [...data.players.men, ...data.players.women];
  } else if (config.type === "fixed") {
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

    if (game.s1 === "" || game.s2 === "" || Number.isNaN(s1) || Number.isNaN(s2)) {
      return;
    }

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

  return table.sort((a, b) => b.w - a.w || b.pts - a.pts || b.bal - a.bal);
}

function podium(i) {
  if (i === 0) return "🏆";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return i + 1;
}

function RankingView({ ranking, type }) {
  const config = modalityConfig[type];

  if (config.type === "mixed12" || config.type === "mixed16") {
    const menLimit = config.men;
    const men = ranking.filter((p) => p.id < menLimit);
    const women = ranking.filter((p) => p.id >= menLimit);

    return (
      <div className="twoCols">
        <RankingTable title="Ranking Masculino" rows={men} />
        <RankingTable title="Ranking Feminino" rows={women} />
      </div>
    );
  }

  return <RankingTable title="Ranking Geral" rows={ranking} />;
}

function RankingTable({ title, rows }) {
  return (
    <div>
      <h3>{title}</h3>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Pontos</th>
            <th>Vitórias</th>
            <th>Saldo</th>
            <th>Jogos</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id}>
              <td>{podium(i)}</td>
              <td>{p.name}</td>
              <td>{p.pts}</td>
              <td>{p.w}</td>
              <td>{p.bal}</td>
              <td>{p.played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
