import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const SUPABASE_URL = "https://dttutybojealkvuywszt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Tr5qiUea-p42UknVoWwPKg_6K_b1EX_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    } else {
      setProfile(data);
    }
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

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="center">Carregando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="center">
        <h1>Torneio Fácil CSP</h1>
        <p>Perfil não encontrado. Tente sair e entrar novamente.</p>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const expired = profile.expires_at && profile.expires_at < today;
  const blocked = profile.status !== "active" || expired;

  if (blocked) {
    return <Blocked profile={profile} />;
  }

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

      if (error) {
        setMessage("Erro ao entrar: " + error.message);
      }
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

        <button className="linkBtn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
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
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Super 04");
  const [saving, setSaving] = useState(false);

  const allowed = {
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

  const allowedTypes = allowed[profile.plan] || [];

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
      console.error(error);
      alert("Erro ao carregar torneios.");
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

    const { error } = await supabase.from("tournaments").insert({
      user_id: user.id,
      name: newName.trim(),
      type: newType,
      data: {
        players: [],
        schedule: [],
        scores: [],
      },
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
    const ok = confirm("Tem certeza que deseja excluir este torneio?");
    if (!ok) return;

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      alert("Erro ao excluir torneio.");
      return;
    }

    await loadTournaments();
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
            <option key={type}>{type}</option>
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

                <button className="danger" onClick={() => deleteTournament(t.id)}>
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
