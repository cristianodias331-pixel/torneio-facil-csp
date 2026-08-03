import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const mainSource = readFileSync(new URL("src/main.jsx", root), "utf8");
const styleSource = readFileSync(new URL("src/style.css", root), "utf8");
const installSource = readFileSync(new URL("src/InstallAppBanner.jsx", root), "utf8");
const indexSource = readFileSync(new URL("index.html", root), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("public/manifest.webmanifest", root), "utf8"));

const requiredApplicationMarkers = [
  "supabase.auth.signInWithPassword",
  "supabase.auth.signUp",
  "supabase.auth.resetPasswordForEmail",
  'function Dashboard(',
  'function TournamentScreen(',
  'function PublicTournamentPage(',
  'function calculateRanking(',
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
  "Super 10 mista",
  "Super 12 mista",
  "Super 16 mista",
  "Simples 8 (1 contra 1 por jogo)",
  "Campeonato Cearense",
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
  '"Super 10 Mista (Dupla Aleatória)"',
  '"Super 12 Mista (Dupla Aleatória)"',
  '"Super 16 Mista (Dupla Aleatória)"',
  '"Simples 8"',
];
const premiumPositions = premiumOrder.map((type) => premiumModalities.indexOf(type));
assert.ok(premiumPositions.every((position) => position >= 0), "A lista Premium perdeu uma modalidade obrigatória.");
assert.deepEqual([...premiumPositions].sort((a, b) => a - b), premiumPositions, "A ordem das modalidades está incorreta.");

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
assert.ok(mainSource.includes('pts: "Total de Games"'), "A coluna de games ainda usa a nomenclatura antiga.");
assert.ok(!/\bpontos\b/i.test(mainSource), "A nomenclatura Pontos ainda aparece na interface.");
assert.ok(mainSource.includes('allowedTeamCounts: Array.from({ length: 29 }, (_, index) => index + 4)'), "O Campeonato Cearense não aceita todas as quantidades de 4 a 32 duplas.");
assert.ok(mainSource.includes('function createCearenseGroups(teamCount)'), "A distribuição própria de grupos do Campeonato Cearense está ausente.");
assert.ok(mainSource.includes('function compareCearenseCampaignMetrics(first, second)'), "A comparação normalizada entre grupos está ausente.");
assert.ok(mainSource.includes('function generateCearenseBrackets(data)'), "As chaves Principal e Paralela do Campeonato Cearense estão ausentes.");
assert.ok(mainSource.includes('campaignTieBreakOverrides'), "O sorteio de empate absoluto entre grupos não é persistido.");
assert.ok(mainSource.includes('Classificação automática (BYE)'), "Os BYEs do Campeonato Cearense não são identificados na chave.");
assert.ok(mainSource.includes('navigator.serviceWorker.register("/sw.js")'), "O service worker do app não está registrado.");
assert.ok(!mainSource.includes("@torenio360"), "O usuário do Instagram continua escrito incorretamente.");
assert.ok(!mainSource.includes("data:image/png;base64"), "Ainda existem imagens PNG Base64 no JavaScript.");
assert.ok(mainSource.includes("function ConfirmCircuitDeleteModal"), "A exclusão do circuito não possui confirmação própria.");
assert.ok(!mainSource.includes('window.confirm("Excluir este circuito?'), "A exclusão do circuito ainda usa a confirmação simples do navegador.");
assert.ok(mainSource.includes('const [circuitEditForm, setCircuitEditForm]'), "A edição do circuito não abre em um formulário separado.");
assert.ok(mainSource.includes('<option value="active">Em andamento</option>'), "O status Em andamento não está disponível para circuitos.");
assert.ok(mainSource.includes('<option value="closed">Encerrado</option>'), "O status Encerrado não está disponível para circuitos.");
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
