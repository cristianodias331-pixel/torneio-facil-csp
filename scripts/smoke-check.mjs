import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { super12IndividualTemplate } from "../src/super12Schedule.mjs";

const root = new URL("../", import.meta.url);
const mainSource = readFileSync(new URL("src/main.jsx", root), "utf8");
const styleSource = readFileSync(new URL("src/style.css", root), "utf8");
const installSource = readFileSync(new URL("src/InstallAppBanner.jsx", root), "utf8");
const indexSource = readFileSync(new URL("index.html", root), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("public/manifest.webmanifest", root), "utf8"));
const publicArenaMigrationUrl = new URL("supabase/migrations/202608030001_public_arena_platform.sql", root);
assert.ok(existsSync(fileURLToPath(publicArenaMigrationUrl)), "A migração segura da plataforma pública está ausente.");
const publicArenaMigration = readFileSync(publicArenaMigrationUrl, "utf8");

const requiredApplicationMarkers = [
  "supabase.auth.signInWithPassword",
  "supabase.auth.signUp",
  "supabase.auth.resetPasswordForEmail",
  'function Dashboard(',
  'function TournamentScreen(',
  'function PublicTournamentPage(',
  'function PublicPlatformHome(',
  'function PublicArenaPage(',
  'function calculateRanking(',
  'function calculateCircuitTournamentRanking(',
  'function buildPublicCircuitRankingGroups(',
  'function generateCupBrackets(',
  '.from("profiles")',
  '.from("tournaments")',
  '.from("circuits")',
  '.eq("user_id", user.id)',
  '.eq("is_public", true)',
  '?public=${publicId}',
  'panel: "inicio"',
  'panel: "criar"',
  'panel: "circuitos"',
  'panel: "modalidades"',
];

for (const marker of requiredApplicationMarkers) {
  assert.ok(mainSource.includes(marker), `Fluxo essencial ausente: ${marker}`);
}

const expectedModalityLabels = [
  "Super 6 (dupla fixa)",
  "Super 8",
  "Super 8 (dupla fixa)",
  "Super 12",
  "Super 10 mista",
  "Super 12 mista",
  "Super 16 mista",
  "Simples 8 (1 contra 1 por jogo)",
  "Torneio modelo Campeonato Cearense",
];

for (const label of expectedModalityLabels) {
  assert.ok(mainSource.includes(label), `Nome de modalidade ausente: ${label}`);
}

const premiumModalities = mainSource.slice(
  mainSource.indexOf("premium: ["),
  mainSource.indexOf("const modalityConfig")
);
const premiumOrder = [
  '"Super 12 Mista (Dupla Fixa)"',
  '"Super 08"',
  '"Super 16 Mista (Dupla Fixa)"',
  '"Super 12"',
  '"Super 10 Mista (Dupla Aleatória)"',
  '"Super 12 Mista (Dupla Aleatória)"',
  '"Super 16 Mista (Dupla Aleatória)"',
  '"Simples 8"',
];
const premiumPositions = premiumOrder.map((type) => premiumModalities.indexOf(type));
assert.ok(premiumPositions.every((position) => position >= 0), "A lista Premium perdeu uma modalidade obrigatória.");
assert.deepEqual([...premiumPositions].sort((a, b) => a - b), premiumPositions, "A ordem das modalidades está incorreta.");

for (const removedType of ["Copa - 12 ou 24 duplas", "Copa - 21 duplas", "Copinha - grupos de 3"]) {
  assert.ok(!premiumModalities.includes(`"${removedType}"`), `A modalidade removida ainda pode ser criada: ${removedType}`);
}

assert.equal(super12IndividualTemplate.length, 11, "O Super 12 deve possuir 11 rodadas.");
const super12Partners = new Map();
const super12Opponents = new Map();
const super12PairKey = (first, second) => [first, second].sort((a, b) => a - b).join("-");

for (const round of super12IndividualTemplate) {
  assert.equal(round.length, 3, "Cada rodada do Super 12 deve usar 3 quadras.");
  assert.deepEqual(
    round.flat(2).sort((a, b) => a - b),
    Array.from({ length: 12 }, (_, index) => index + 1),
    "Todos os 12 participantes devem jogar exatamente uma vez por rodada."
  );

  for (const [firstTeam, secondTeam] of round) {
    for (const team of [firstTeam, secondTeam]) {
      const key = super12PairKey(...team);
      super12Partners.set(key, (super12Partners.get(key) || 0) + 1);
    }

    for (const first of firstTeam) {
      for (const second of secondTeam) {
        const key = super12PairKey(first, second);
        super12Opponents.set(key, (super12Opponents.get(key) || 0) + 1);
      }
    }
  }
}

for (let first = 1; first <= 12; first += 1) {
  for (let second = first + 1; second <= 12; second += 1) {
    const key = super12PairKey(first, second);
    assert.equal(super12Partners.get(key), 1, `A parceria ${key} deve acontecer uma vez.`);
    assert.equal(super12Opponents.get(key), 2, `O confronto ${key} deve acontecer duas vezes.`);
  }
}

assert.ok(mainSource.includes('type: "super12"'), "A modalidade Super 12 individual não está cadastrada.");
assert.ok(mainSource.includes('config.type === "super12"'), "A geração da tabela fixa do Super 12 está ausente.");

assert.ok(indexSource.includes('src/main.jsx'), "A entrada React não está ligada ao index.html.");
assert.ok(indexSource.includes('torneio360-favicon-96.png'), "O novo favicon do Torneio360 não está configurado.");
assert.ok(indexSource.includes('manifest.webmanifest'), "O manifesto instalável não está ligado ao site.");
assert.ok(indexSource.includes('torneio360-apple-touch-icon.png'), "O ícone para atalhos Apple não está configurado.");
assert.equal(manifest.display, "standalone", "O atalho não está configurado para abrir como app.");
assert.ok(installSource.includes('beforeinstallprompt'), "O convite de instalação não captura o evento do navegador.");
assert.ok(installSource.includes('appinstalled'), "A confirmação de instalação não está sendo monitorada.");
assert.ok(installSource.includes('Instalar agora'), "O botão não oferece a instalação nativa quando ela está disponível.");
assert.ok(installSource.includes('Abrir no Chrome'), "O Android não possui alternativa para navegadores internos.");
assert.ok(!installSource.includes('Já instalei'), "O Android ainda pode ocultar o aviso sem concluir a instalação.");
assert.ok(installSource.includes('torneio360_app_installed_v3'), "A mensagem corrigida não será reexibida para testes anteriores.");
assert.ok(installSource.includes('Instalação em andamento...'), "A instalação lenta não possui retorno visual para o usuário.");
assert.ok(installSource.includes('INSTALL_RECOVERY_DELAY_MS = 10 * 60 * 1000'), "A ajuda de instalação reaparece cedo demais.");
assert.ok(
  !installSource.includes('if (outcome === "accepted") confirmManualInstallation()'),
  "O aceite do prompt ainda oculta a mensagem antes da confirmação real do navegador."
);
assert.ok(
  mainSource.includes('document.getElementById("acesso")?.scrollIntoView({ behavior: "auto", block: "start" })'),
  "A recuperação de senha não leva o usuário diretamente ao formulário de nova senha."
);
assert.ok(
  mainSource.includes('.rpc("get_public_tournament", { p_public_id: publicId })'),
  "O link público voltou a consultar uma tabela protegida em vez da função segura."
);
assert.ok(
  mainSource.includes('.rpc("get_public_arena_bundle",'),
  "O perfil público não consulta o pacote seguro e atualizado da arena."
);
assert.ok(mainSource.includes('title="Ranking do dia"'), "O ranking do torneio não usa o título Ranking do dia.");
assert.ok(mainSource.includes('<h2>Ranking geral acumulado</h2>'), "O ranking público do circuito não usa o título acumulado correto.");
assert.ok(mainSource.includes('tournaments={tournaments}'), "O ranking público do circuito não recebe os torneios para cálculo imediato.");
assert.ok(mainSource.includes('className="publicCircuitName"'), "O nome do circuito não recebe destaque no ranking público.");
assert.ok(mainSource.includes('pts: "Total de Games"'), "A coluna de games ainda usa a nomenclatura antiga.");
assert.ok(!/\bpontos\b/i.test(mainSource), "A nomenclatura Pontos ainda aparece na interface.");
assert.ok(mainSource.includes('allowedTeamCounts: Array.from({ length: 29 }, (_, index) => index + 4)'), "O Campeonato Cearense não aceita todas as quantidades de 4 a 32 duplas.");
assert.ok(mainSource.includes('function createCearenseGroups(teamCount)'), "A distribuição própria de grupos do Campeonato Cearense está ausente.");
assert.ok(mainSource.includes('function compareCearenseCampaignMetrics(first, second)'), "A comparação normalizada entre grupos está ausente.");
assert.ok(mainSource.includes('function generateCearenseBrackets(data)'), "As chaves Principal e Paralela do Campeonato Cearense estão ausentes.");
assert.ok(mainSource.includes('campaignTieBreakOverrides'), "O sorteio de empate absoluto entre grupos não é persistido.");
assert.ok(mainSource.includes('className="byeBadge">BYE</strong>'), "Os BYEs do Campeonato Cearense não são identificados na chave.");
assert.ok(!mainSource.includes('Classificação automática (BYE)'), "O texto longo de classificação automática ainda aparece no BYE.");
assert.ok(mainSource.includes('buildCearenseEliminationRounds(qualified.main, "main", mainName, true)'), "A chave principal do Campeonato Cearense não cria a disputa de 3º lugar.");
assert.ok(mainSource.includes('showPodium={false}'), "A classificação da fase de grupos ainda exibe troféus de pódio.");
assert.ok(mainSource.includes('tournamentTab: "participantes"'), "Abrir um torneio não direciona para Participantes.");
assert.ok(mainSource.includes('public_id: generatePublicId()'), "Novos torneios não recebem link público automaticamente.");
assert.ok(mainSource.includes('className="publicArenaTabs"'), "O link público não abre o perfil com abas de Torneios e Circuitos.");
assert.ok(mainSource.includes('navigator.serviceWorker.register("/sw.js")'), "O service worker do app não está registrado.");
assert.ok(!mainSource.includes("@torenio360"), "O usuário do Instagram continua escrito incorretamente.");
assert.ok(!mainSource.includes("data:image/png;base64"), "Ainda existem imagens PNG Base64 no JavaScript.");
assert.ok(mainSource.includes("function ConfirmCircuitDeleteModal"), "A exclusão do circuito não possui confirmação própria.");
assert.ok(!mainSource.includes('window.confirm("Excluir este circuito?'), "A exclusão do circuito ainda usa a confirmação simples do navegador.");
assert.ok(mainSource.includes('const [circuitEditForm, setCircuitEditForm]'), "A edição do circuito não abre em um formulário separado.");
assert.ok(mainSource.includes("function getAutomaticEventStatus"), "O status de torneios e circuitos não é calculado automaticamente pelas datas.");
assert.ok(
  mainSource.includes('return String(endDate) < getBrazilTodayISO() ? "finished" : "active"')
    && publicArenaMigration.includes("then 'finished'"),
  "O status automático não respeita os valores permitidos pelo banco de produção."
);
assert.ok(mainSource.includes('<ChevronDown />'), "O circuito não usa a seta para abrir e fechar.");
assert.ok(styleSource.includes("CONTRASTE ENTRE TEMAS E CIRCUITOS"), "A camada final de contraste dos temas está ausente.");
assert.ok(styleSource.includes(".gameWaiting .gameTeams > div"), "Os jogadores sem placar continuam sem correção de contraste.");
assert.ok(styleSource.includes(".arenaPublicDetailsGrid span"), "Os dados públicos da arena continuam sem correção de contraste.");
assert.ok(
  /button\.circuitItemSummary::before\s*\{[^}]*content:\s*none\s*!important;[^}]*display:\s*none\s*!important;/s.test(styleSource),
  "O cabeçalho do circuito ainda pode exibir o monograma duplicado."
);
assert.ok(styleSource.includes(".rankingTableScroll > .rankingTable"), "Os rankings internos não possuem rolagem horizontal responsiva.");
assert.ok(mainSource.includes('className="rankingTablePanel"'), "O painel do ranking não isola a largura mínima da tabela.");
assert.ok(
  /\.rankingTablePanel\s*\{[^}]*min-width:\s*0\s*!important;/s.test(styleSource),
  "A largura da tabela ainda pode expandir a página inteira."
);
assert.ok(
  /\.rankingTableScroll\s*\{[^}]*overflow-x:\s*auto\s*!important;/s.test(styleSource),
  "A rolagem horizontal deixou de ficar disponível somente na tabela."
);
assert.ok(
  /\.circuitTournamentOption\s*\{[^}]*position:\s*relative\s*!important;[^}]*min-width:\s*0\s*!important;/s.test(styleSource),
  "O cartão de seleção do circuito não contém o checkbox invisível."
);
assert.ok(
  /\.circuitTournamentOption\s*>\s*input\[type="checkbox"\]\s*\{[^}]*inset:\s*0\s*!important;[^}]*width:\s*100%\s*!important;[^}]*height:\s*100%\s*!important;[^}]*margin:\s*0\s*!important;[^}]*padding:\s*0\s*!important;/s.test(styleSource),
  "O checkbox invisível ainda pode criar rolagem horizontal na página."
);
assert.ok(styleSource.includes(".gameFinished .gameTeams > div.winnerTeam"), "O vencedor não possui contraste próprio após o placar.");
assert.ok(styleSource.includes(".gameFinished .gameTeams > div.loserTeam"), "O perdedor não possui contraste próprio após o placar.");
assert.ok(styleSource.includes('"team1 score1"'), "No celular, cada placar não está alinhado ao respectivo atleta.");
assert.ok(mainSource.includes("function getBrazilianWhatsAppUrl"), "Os links de WhatsApp não possuem normalização brasileira.");
assert.ok(mainSource.includes('digits.startsWith("55") && digits.length >= 12'), "O código do país não é preservado quando já foi informado.");
assert.ok((mainSource.match(/getBrazilianWhatsAppUrl\(/g) || []).length >= 4, "Nem todos os links de WhatsApp usam o código +55 automático.");
assert.ok(mainSource.includes("function isUserAlreadyRegisteredError"), "O cadastro não reconhece e-mails que já possuem conta.");
assert.ok(mainSource.includes("Este e-mail já possui uma conta"), "O cadastro não orienta o usuário a entrar com a conta existente.");
assert.ok(mainSource.includes('id="contato"'), "Os contatos da plataforma não estão visíveis antes do login.");
assert.ok(mainSource.includes("landingTrialBanner"), "O destaque público dos 7 dias grátis está ausente.");
assert.ok(mainSource.includes("function getPlanRegularizationWhatsAppUrl"), "A regularização do plano não possui mensagem própria no WhatsApp.");
assert.ok(mainSource.includes("window.location.assign(regularizationUrl)"), "O acesso vencido não direciona o usuário para o WhatsApp.");
assert.ok(mainSource.includes("Regularizar pelo WhatsApp"), "A tela de acesso vencido não possui alternativa manual para abrir o WhatsApp.");
assert.ok(styleSource.includes("CONTATOS PÚBLICOS, TESTE GRÁTIS E ACESSO VENCIDO"), "Os novos destaques públicos estão sem estilos.");

assert.ok(
  mainSource.includes("const circuitPersistence = await persistCircuitRankings(")
    && mainSource.includes("persistedTournament.id"),
  "O placar pode ser marcado como salvo antes de atualizar o ranking dos circuitos."
);
assert.ok(
  mainSource.includes("const rankingHistorySaved = await saveCircuitHistoryToSupabase("),
  "O salvamento do circuito ainda ignora falhas no histórico do ranking."
);
assert.ok(
  mainSource.includes("if (Number(row.played || 0) <= 0) return;"),
  "Participantes sem jogo válido ainda podem entrar no ranking do circuito."
);
assert.ok(
  mainSource.includes("const games = [...(data.schedule || []).flat(), ...bracketGames];"),
  "O ranking do circuito não soma a fase de grupos e o mata-mata das Copas."
);
assert.ok(
  publicArenaMigration.includes("selected_tournament.value = history.tournament_id::text"),
  "O ranking público ainda pode somar um torneio removido do circuito."
);
assert.ok(
  publicArenaMigration.includes("create table if not exists public.circuit_ranking_history")
    && publicArenaMigration.includes("primary key (user_id, circuit_id, tournament_id, group_key, player_key)"),
  "A persistência do ranking acumulado não cria sua tabela de histórico no Supabase."
);
assert.ok(
  publicArenaMigration.includes("circuit_ranking_history_owner_update")
    && publicArenaMigration.includes("user_id = auth.uid()"),
  "O histórico do ranking do circuito não está protegido por organizador."
);
assert.ok(
  publicArenaMigration.includes("where circuit.ranking_criteria_mode = 'automatic'"),
  "Circuitos automáticos antigos não recebem o critério do torneio vinculado."
);
assert.ok(
  publicArenaMigration.includes("coalesce(linked_tournament.data ->> 'deletedAt', '') = ''"),
  "O ranking público ainda pode somar torneios enviados à lixeira."
);
assert.ok(
  publicArenaMigration.includes("as restrictive")
    && publicArenaMigration.includes("lower(coalesce(status, '')) = 'active'")
    && publicArenaMigration.includes("auth.jwt() -> 'app_metadata' ->> 'role'"),
  "Visitantes ou contas sem acesso ainda podem alterar o perfil da arena."
);
assert.ok(
  publicArenaMigration.includes("profiles_no_direct_insert_guard")
    && publicArenaMigration.includes("with check (false)"),
  "Um visitante autenticado ainda pode criar um perfil diretamente pelo cliente."
);
assert.ok(
  mainSource.includes('["athlete", "visitor", "spectator"].includes(sessionRole)'),
  "Uma conta visitante ainda pode abrir o painel administrativo."
);
assert.ok(
  mainSource.includes("organizer={organizer}"),
  "O torneio público ainda usa somente a cópia antiga dos dados da arena."
);
assert.ok(
  mainSource.includes('className="circuitIdentityHint"'),
  "O circuito não orienta sobre a identidade dos participantes pelo nome."
);
assert.ok(
  publicArenaMigration.includes("'athlete', 'visitor', 'spectator', 'organizer_pending'"),
  "Contas visitantes ou ainda pendentes podem aparecer no diretório público."
);
assert.ok(
  mainSource.includes('.rpc("set_tournament_order", {')
    && mainSource.includes("sortTournamentsByStoredOrder"),
  "A ordem escolhida ao arrastar os torneios não é persistida e recarregada."
);
assert.ok(
  publicArenaMigration.includes("create or replace function public.set_tournament_order"),
  "A ordenação dos torneios não possui uma operação transacional segura."
);
assert.ok(
  mainSource.includes('dragOverTournamentId === t.id')
    && styleSource.includes('content: "Solte aqui"'),
  "O arraste não apresenta um destino visual claro para o organizador."
);
assert.ok(
  styleSource.includes("Ordenação persistente dos cartões de torneio")
    && styleSource.includes(".proDashboard.playAppShell .moveLineBtn span"),
  "A alça de três traços não recebeu o novo contraste visual."
);
assert.ok(
  mainSource.includes('preparedLine.split(/\\s*(?:\\+|&|\\/|-|\\s+[xX]\\s+|\\s+[eE]\\s+)\\s*/u)')
    && mainSource.includes("Espaços dentro do nome continuam sendo nome e sobrenome."),
  "A importação de duplas não reconhece todos os separadores sem preservar nomes compostos."
);
const fixedPairSeparator = /\s*(?:\+|&|\/|-|\s+[xX]\s+|\s+[eE]\s+)\s*/u;
[
  ["Ana + Carla", ["Ana", "Carla"]],
  ["Ana / Carla", ["Ana", "Carla"]],
  ["Ana - Carla", ["Ana", "Carla"]],
  ["Ana e Carla", ["Ana", "Carla"]],
  ["Ana & Carla", ["Ana", "Carla"]],
  ["Ana Maria da Silva", ["Ana Maria da Silva"]],
].forEach(([line, expected]) => {
  assert.deepEqual(
    line.split(fixedPairSeparator),
    expected,
    `A importação interpretou incorretamente a linha: ${line}`
  );
});
assert.ok(
  styleSource.includes("PERFIS E TORNEIOS PÚBLICOS — COMPOSIÇÃO FINAL NO CELULAR")
    && styleSource.includes('grid-template-areas: "back logo access"'),
  "O cabeçalho público móvel não separa navegação, logo e acesso do organizador."
);
assert.ok(
  mainSource.includes("function isRegistrationDeadlineOpen(deadline)")
    && (mainSource.match(/<PublicRegistrationStatus open=\{registrationOpen\}/g) || []).length === 2
    && !mainSource.includes("isCircuitRegistrationOpen")
    && (mainSource.match(/className=\{`publicCircuitStatus \$\{circuitStatus\}`\}/g) || []).length === 2,
  "Torneios devem mostrar inscrições; circuitos devem mostrar somente andamento ou encerramento."
);
assert.ok(
  styleSource.includes(".proDashboard .circuitStatus-closed")
    && styleSource.includes(".publicCircuitStatus.closed")
    && styleSource.includes("#f97316"),
  "O status encerrado dos circuitos não recebeu a identificação laranja."
);
assert.ok(
  mainSource.includes("Quero me inscrever em")
    && mainSource.includes("registrationDeadline: details.registrationDeadline || \"\"")
    && styleSource.includes("PERFIL PÚBLICO DA ARENA — INSCRIÇÕES E MOBILE FINAL"),
  "A inscrição pública não preserva a data limite ou não encaminha ao WhatsApp da arena."
);
assert.ok(
  styleSource.includes(".publicPage.publicArenaPage .publicArenaHeader")
    && styleSource.includes("grid-template-columns: minmax(0, 1fr) !important;")
    && styleSource.includes("overflow-wrap: break-word !important;"),
  "O perfil público ainda pode comprimir o nome da arena no celular."
);
assert.ok(
  mainSource.includes("const saveQueueRef = useRef(Promise.resolve(true))")
    && mainSource.includes("queueTournamentSave(latestDataRef.current"),
  "As gravações do torneio podem terminar fora de ordem e sobrescrever dados mais novos."
);
assert.ok(
  mainSource.includes("saveTournamentDraft(userId, tournament.id, data)")
    && mainSource.includes("readTournamentDraft(userId, tournament)"),
  "Placares e confrontos ainda não possuem backup local durante uma falha de conexão."
);
assert.ok(
  mainSource.includes("Salvando antes de sair...")
    && mainSource.includes("A tela foi mantida aberta para proteger placares, confrontos e rankings"),
  "O torneio pode ser fechado antes de concluir o último salvamento."
);
assert.ok(
  publicArenaMigration.includes("jsonb_set(")
    && publicArenaMigration.includes("'{displayOrder}'"),
  "A reordenação pode substituir o objeto do torneio em vez de preservar placares e confrontos."
);

for (const logoPath of ["public/torneio360-logo.png", "public/torneio360-logo-blue.png"]) {
  assert.ok(existsSync(fileURLToPath(new URL(logoPath, root))), `Asset obrigatório ausente: ${logoPath}`);
}

for (const iconPath of [
  "public/torneio360-profile.png",
  "public/torneio360-favicon-96.png",
  "public/torneio360-apple-touch-icon.png",
  "public/torneio360-app-icon-192.png",
  "public/torneio360-app-icon-512.png",
  "public/sw.js",
]) {
  assert.ok(existsSync(fileURLToPath(new URL(iconPath, root))), `Asset instalável ausente: ${iconPath}`);
}

for (const [name, version] of Object.entries(packageJson.dependencies ?? {})) {
  assert.notEqual(version, "latest", `A dependência ${name} ainda usa latest.`);
  assert.ok(!/[xX*]/.test(version), `A dependência ${name} não está fixada: ${version}`);
}

console.log("Smoke check concluído: autenticação, torneios, circuitos, ranking, compartilhamento e entrada visual estão presentes.");
