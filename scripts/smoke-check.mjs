import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const mainSource = readFileSync(new URL("src/main.jsx", root), "utf8");
const styleSource = readFileSync(new URL("src/style.css", root), "utf8");
const figmaStyleSource = readFileSync(new URL("src/figma-complete.css", root), "utf8");
const athleteDashboardSource = readFileSync(new URL("src/AthleteDashboard.jsx", root), "utf8");
const athleteMigrationSource = readFileSync(new URL("supabase/migrations/202608020001_athlete_accounts.sql", root), "utf8");
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
  'const DEFAULT_SPORT_ID = "beach-tennis"',
  'const SPORT_CATALOG = Object.freeze([',
  'name: "Futevôlei"',
  'name: "Vôlei de Praia"',
  'disabled={!sport.enabled}',
  'sport: DEFAULT_SPORT_ID',
  'function getTournamentUiStatus(',
  'tournamentWorkspace === "create"',
  'placeholder="Buscar torneio..."',
  'function normalizeParticipantMetaList(',
  'function updateParticipantMeta(',
  'Quantidade de duplas',
  'Todos os status',
  'matchOutcomeDot',
  'roundGamesGrid',
  'function updateGameDetails(',
  'scheduledTime',
  'function confirmRankingFinal(',
  'function shareTournamentRanking(',
  'Ranking final confirmado',
  'dashboardTitleActions',
  'tournamentReferenceHeader',
  'tournamentTableHeader',
  'function getUserAccountType(',
  'function isUserAlreadyRegisteredError(',
  'user_already_exists',
  'email_exists',
  'Este e-mail já está cadastrado',
  'ACCOUNT_TYPE_ATHLETE',
  'ACCOUNT_TYPE_ORGANIZER_PENDING',
  '<AthleteDashboard user={session.user}',
  'className="accountTypeChooser"',
  'function updateAllParticipantRegistrations(',
  'Confirmar todos',
  'Todos pendentes',
  'function AthleteLinkPage(',
  'function PublicAthletePage(',
  'function RootApp(',
  'formatCupGroupOption(',
  'generateCupGroupSchedule(copy.players, copy.cupConfig || {}, config.courts)',
  'create_athlete_link_request',
  'get_my_athlete_link_results',
  'list_public_tournaments_by_organizer',
  'function enqueueTournamentSave(',
];

for (const marker of requiredApplicationMarkers) {
  assert.ok(mainSource.includes(marker), `Fluxo essencial ausente: ${marker}`);
}

for (const marker of [
  'supabase.auth.updateUser',
  '.from("athlete_profiles").upsert',
  'submit_tournament_registration',
  'show_achievements',
  'list_public_tournaments',
  'THEME_STORAGE_PREFIX',
  'Minhas inscrições',
  'Você edita somente os seus próprios dados.',
]) {
  assert.ok(athleteDashboardSource.includes(marker), `Fluxo do atleta ausente: ${marker}`);
}

assert.ok(!athleteDashboardSource.includes('from("tournaments").insert'), "O atleta ainda consegue criar torneios pelo próprio painel.");
assert.ok(!athleteDashboardSource.includes('from("tournaments").update'), "O atleta ainda consegue editar torneios pelo próprio painel.");

for (const marker of [
  'assign_account_role_on_signup',
  'organizer_pending',
  'athlete_profiles',
  'athlete_link_requests',
  'tournament_registrations',
  'submit_tournament_registration',
  'review_tournament_registration',
  'reconcile_my_profile',
  'protect_profile_access_fields',
  'sanitize_public_tournament_data',
  'list_public_tournaments_by_organizer',
  'revoke select on table public.tournaments from public, anon',
  'as restrictive for insert',
  "public.current_account_role() = 'organizer'",
]) {
  assert.ok(athleteMigrationSource.includes(marker), `Proteção de banco ausente: ${marker}`);
}

for (const marker of ['accountTypeChooser', 'tournamentTabEmoji', 'matchStatusBadge', 'figmaParticipantAthlete']) {
  assert.ok(figmaStyleSource.includes(marker), `Detalhe visual novo ausente: ${marker}`);
}

for (const marker of [
  "FIGMA MAKE — REPRODUÇÃO FIEL DO MODELO TORNEIO360",
  "--ui-bg: #030b1f",
  "--ui-surface: #081a33",
  "--ui-surface-raised: #0d2344",
  "--brand-cyan: #14a0ff",
  "--brand-highlight: #ff7a00",
  "font-family: Rajdhani, Inter",
]) {
  assert.ok(styleSource.includes(marker), `Detalhe visual do Figma ausente: ${marker}`);
}

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
assert.ok(mainSource.includes('navigator.serviceWorker.register("/sw.js")'), "O service worker do app não está registrado.");
assert.ok(!mainSource.includes("@torenio360"), "O usuário do Instagram continua escrito incorretamente.");
assert.ok(!mainSource.includes("data:image/png;base64"), "Ainda existem imagens PNG Base64 no JavaScript.");

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
