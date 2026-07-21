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
  ],
};

const modalityConfig = {
  "Super 08": { type: "super8", total: 8, label: "Participante", courts: 2 },
  "Super 12 Mista (Dupla Aleatória)": { type: "mixed12", men: 6, women: 6, courts: 3 },
  "Super 16 Mista (Dupla Aleatória)": { type: "mixed16", men: 8, women: 8, courts: 4 },
  "Super 12 Mista (Dupla Fixa)": { type: "fixed12", teams: 6, courts: 3 },
  "Super 16 Mista (Dupla Fixa)": { type: "fixed16", teams: 8, courts: 4 },
  "Simples 8": { type: "simple8", total: 8, label: "Jogador", courts: 4 },
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
  return (
    <div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
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

function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState(null);
  const [openInfoTab, setOpenInfoTab] = useState("plans");

  function showNotice(type, title, message) {
    setNotice({ type, title, message });
  }

  async function handleSubmit(e) {
    e.preventDefault();

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
      if (!name.trim()) {
        showNotice("warning", "Nome obrigatório", "Informe seu nome para criar a conta.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
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

        setName("");
        setEmail("");
        setPassword("");
        setMode("login");
      }
    }
  }

  return (
    <div className="loginPage">
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />

      <div className="loginLayout">
        <div className="loginCard">
          <div className="logo">🏆</div>
          <h1>Torneio Fácil BT</h1>
          <p>{mode === "login" ? "Entre para acessar seus torneios." : "Crie sua conta para solicitar acesso."}</p>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label>Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </>
            )}

            <label>E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />

            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" />

            <button type="submit">{mode === "login" ? "Entrar" : "Criar conta"}</button>
          </form>

          <button
            type="button"
            className="linkBtn"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setName("");
              setEmail("");
              setPassword("");
            }}
          >
            {mode === "login" ? "Criar nova conta" : "Já tenho conta"}
          </button>
        </div>

        <div className="loginInfoPanel">
          <div className="loginHeroInfo">
            <span>Conheça os planos</span>
            <h2>Escolha o melhor formato para seus torneios</h2>
            <p>Veja os planos e modalidades disponíveis sem poluir a tela de login. Clique nas abas abaixo para expandir os detalhes.</p>
          </div>

          <div className="infoTabs">
            <button type="button" className={openInfoTab === "plans" ? "active" : ""} onClick={() => setOpenInfoTab(openInfoTab === "plans" ? null : "plans")}>
              Planos
            </button>
            <button type="button" className={openInfoTab === "modalities" ? "active" : ""} onClick={() => setOpenInfoTab(openInfoTab === "modalities" ? null : "modalities")}>
              Modalidades
            </button>
          </div>

          {openInfoTab === "plans" && (
            <div className="accordionContent">
              <div className="plansGrid">
                <PlanCard title="Basic" tag="Entrada" price="R$ 19,90" text="Para começar com torneios mistos e Super 08." items={["Super 08", "Super 12 Mista (Dupla Aleatória)", "Super 16 Mista (Dupla Aleatória)", "1 campeonato ativo por vez", "Sorteio e ranking automático"]} />
                <PlanCard title="Pro" tag="Organizador" badge="Mais usado" price="R$ 39,90" text="Para organizadores que precisam de duplas fixas." items={["Tudo do Basic", "Super 12 Mista (Dupla Fixa)", "Super 16 Mista (Dupla Fixa)", "Campeonatos ilimitados", "Histórico salvo"]} />
                <PlanCard title="Premium" tag="Completo" price="R$ 59,90" text="Libera todos os formatos disponíveis." items={["Tudo do Pro", "Simples 8", "Todos os formatos liberados", "Campeonatos ilimitados", "Ideal para clubes e arenas"]} />
              </div>
            </div>
          )}

          {openInfoTab === "modalities" && (
            <div className="accordionContent">
              <div className="modalitiesGrid">
                <Info title="Super 08" text="8 participantes, duplas variáveis e ranking individual." />
                <Info title="Super 12 Mista (Dupla Aleatória)" text="6 homens e 6 mulheres. As duplas mudam conforme a numeração sorteada." />
                <Info title="Super 16 Mista (Dupla Aleatória)" text="8 homens e 8 mulheres com duplas alternadas por rodada." />
                <Info title="Super 12 Mista (Dupla Fixa)" text="6 duplas fixas jogando entre si em 5 rodadas." />
                <Info title="Super 16 Mista (Dupla Fixa)" text="8 duplas fixas no formato todos contra todos." />
                <Info title="Simples 8" text="8 jogadores em disputa individual com ranking geral." />
              </div>
            </div>
          )}

          <div className="learnMoreBox">
            <strong>Quer saber qual plano escolher?</strong>
            <p>Para testes rápidos, use o Basic. Para torneios recorrentes e duplas fixas, escolha o Pro. Para liberar todos os formatos, use o Premium.</p>
          </div>
        </div>
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

  if (config.type === "fixed12" || config.type === "fixed16") {
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

  const saveTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  const firstRenderRef = useRef(true);

  const ranking = useMemo(
    () => calculateRanking(data, tournament.type, data.rankingCriteria),
    [data, tournament.type]
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

  function updateRankingCriteria(value) {
    setData((prev) => ({ ...prev, rankingCriteria: value }));
  }

  function updatePlayer(path, value) {
    const copy = structuredClone(data);
    if (path.kind === "normal") copy.players[path.index] = value;
    if (path.kind === "men") copy.players.men[path.index] = value;
    if (path.kind === "women") copy.players.women[path.index] = value;
    if (path.kind === "team") copy.players.teams[path.index][path.field] = value;
    setData(copy);
  }

  function finishShuffle() {
    const copy = structuredClone(data);

    if (config.type === "mixed12" || config.type === "mixed16") {
      copy.players.men = shuffleArray(copy.players.men);
      copy.players.women = shuffleArray(copy.players.women);
    } else if (config.type === "fixed12" || config.type === "fixed16") {
      copy.players.teams = shuffleArray(copy.players.teams);
    } else {
      copy.players = shuffleArray(copy.players);
    }

    copy.schedule = [];
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
    const schedule = generateSchedule(tournament.type, data.players);
    setData({ ...data, schedule });
    showNotice("success", "Tabela gerada", "A tabela foi montada com sucesso.");
  }

  function updateScore(roundIndex, gameIndex, field, value) {
    const copy = structuredClone(data);
    copy.schedule[roundIndex][gameIndex][field] = value;
    setData(copy);
  }

  function clearScores() {
    const copy = structuredClone(data);
    copy.schedule = (copy.schedule || []).map((round) =>
      round.map((game) => ({ ...game, s1: "", s2: "" }))
    );
    setData(copy);
    setClearScoresOpen(false);
    showNotice("success", "Placares apagados", "Todos os placares foram removidos.");
  }

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
            <button type="button" onClick={handleBack}>Voltar</button>
          </div>
        </header>

        <section className="card">
          <h2>Participantes</h2>

          <div className="rankingCriteriaBox">
            <label>Critério do ranking</label>
            <select value={data.rankingCriteria || defaultRankingCriteria} onChange={(e) => updateRankingCriteria(e.target.value)}>
              {rankingCriteriaOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <PlayerInputs type={tournament.type} data={data} updatePlayer={updatePlayer} />

          <div className="actions">
            <button type="button" onClick={shuffleNames}>Sortear nomes</button>
            <button type="button" onClick={generate}>Gerar tabela</button>
          </div>
        </section>

        <section className="card">
          <h2>Rodadas</h2>

          {!data.schedule || data.schedule.length === 0 ? (
            <p>Clique em “Gerar tabela” para montar os jogos.</p>
          ) : (
            <>
              <ScheduleView schedule={data.schedule} updateScore={updateScore} />
              <div className="actions">
                <button type="button" className="deleteBtn" onClick={() => setClearScoresOpen(true)}>
                  Apagar placares
                </button>
              </div>
            </>
          )}
        </section>

        <section className="card">
          <h2>Ranking</h2>
          <RankingView ranking={ranking} type={tournament.type} rankingCriteria={data.rankingCriteria || defaultRankingCriteria} />
        </section>
      </div>
    </>
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

  if (config.type === "fixed12" || config.type === "fixed16") {
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
                <input type="number" value={game.s1} onChange={(e) => updateScore(roundIndex, gameIndex, "s1", e.target.value)} />
                <span>—</span>
                <input type="number" value={game.s2} onChange={(e) => updateScore(roundIndex, gameIndex, "s2", e.target.value)} />
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

createRoot(document.getElementById("root")).render(<App />);
