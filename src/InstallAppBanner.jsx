import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Smartphone, X } from "lucide-react";

const INSTALL_APP_STORAGE_KEY = "torneio360_app_installed_v4";
const INSTALL_BANNER_SESSION_KEY = "torneio360_install_banner_dismissed_v4";
const INSTALL_RECOVERY_DELAY_MS = 10 * 60 * 1000;

function readStorageFlag(storage, key) {
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStorageFlag(storage, key) {
  try {
    storage.setItem(key, "1");
  } catch {
    // O modo privado de alguns navegadores pode bloquear o armazenamento.
  }
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function InstallAppBanner() {
  const userAgent = window.navigator.userAgent || "";
  const isIos =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installationPending, setInstallationPending] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const installRecoveryTimerRef = useRef(null);
  const [visible, setVisible] = useState(
    () =>
      !isStandaloneApp() &&
      !readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) &&
      !readStorageFlag(window.sessionStorage, INSTALL_BANNER_SESSION_KEY)
  );

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function markAsInstalled() {
      window.clearTimeout(installRecoveryTimerRef.current);
      installRecoveryTimerRef.current = null;
      writeStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY);
      setInstallPrompt(null);
      setInstallationPending(false);
      setShowInstructions(false);
      setVisible(false);
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      window.clearTimeout(installRecoveryTimerRef.current);
      installRecoveryTimerRef.current = null;
      setInstallPrompt(event);
      setInstallationPending(false);

      if (
        !readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) &&
        !readStorageFlag(window.sessionStorage, INSTALL_BANNER_SESSION_KEY)
      ) {
        setVisible(true);
      }
    }

    function handleAppInstalled() {
      if (!isAndroid) markAsInstalled();
    }

    function handleDisplayModeChange(event) {
      if (event.matches) markAsInstalled();
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayMode.addEventListener("change", handleDisplayModeChange);

    if (isStandaloneApp()) markAsInstalled();

    return () => {
      window.clearTimeout(installRecoveryTimerRef.current);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, [isAndroid]);

  function confirmManualInstallation() {
    window.clearTimeout(installRecoveryTimerRef.current);
    installRecoveryTimerRef.current = null;
    writeStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY);
    setInstallationPending(false);
    setShowInstructions(false);
    setVisible(false);
  }

  function dismissForThisVisit() {
    window.clearTimeout(installRecoveryTimerRef.current);
    installRecoveryTimerRef.current = null;
    writeStorageFlag(window.sessionStorage, INSTALL_BANNER_SESSION_KEY);
    setInstallationPending(false);
    setShowInstructions(false);
    setVisible(false);
  }

  async function requestInstallation() {
    if (isAndroid) {
      window.location.assign("/atalho.html");
      return;
    }

    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (outcome === "accepted") {
      if (readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) || isStandaloneApp()) return;

      setInstallationPending(true);
      setShowInstructions(false);
      setVisible(true);
      window.clearTimeout(installRecoveryTimerRef.current);
      installRecoveryTimerRef.current = window.setTimeout(() => {
        installRecoveryTimerRef.current = null;
        const installationConfirmed =
          readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) || isStandaloneApp();

        if (!installationConfirmed) {
          setInstallationPending(false);
          setShowInstructions(true);
          setVisible(true);
        }
      }, INSTALL_RECOVERY_DELAY_MS);
    }
  }

  if (!visible) return null;

  const manualInstructions = isIos
    ? 'No Safari, toque em Compartilhar e selecione “Adicionar à Tela de Início”.'
    : isAndroid
      ? 'No Chrome, toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. Depois confirme em “Instalar”.'
      : 'Use o ícone de instalação na barra de endereço ou abra o menu do navegador e escolha “Instalar Torneio360”.';

  const actionLabel = isAndroid
    ? "Criar atalho simples"
    : installationPending
      ? "Instalação em andamento..."
      : installPrompt
        ? "Instalar agora"
        : "Instalar atalho";

  return (
    <aside className="installAppBanner" aria-label="Instalar o Torneio360">
      <button
        type="button"
        className="installAppDismiss"
        onClick={dismissForThisVisit}
        aria-label="Lembrar de instalar depois"
        title="Lembrar depois"
      >
        <X aria-hidden="true" />
      </button>

      <img className="installAppIcon" src="/torneio360-app-icon-192.png" alt="" aria-hidden="true" />

      <div className="installAppContent">
        <strong>
          {isAndroid
            ? "Torneio360 na tela inicial"
            : installationPending
              ? "Instalação em andamento"
              : "Leve o Torneio360 com você"}
        </strong>
        <p>
          {isAndroid
            ? "Crie apenas um atalho, sem baixar aplicativo. O ícone abrirá a plataforma diretamente no Chrome."
            : installationPending
              ? "O navegador está concluindo a instalação. Isso pode levar alguns minutos; você pode continuar usando a plataforma."
              : "Abra seus torneios mais rápido, direto da tela inicial. É prático, leve e gratuito."}
        </p>

        {showInstructions ? (
          <div className="installAppInstructions" role="status">
            <span>{manualInstructions}</span>
            <div>
              <button type="button" className="installAppTextButton" onClick={() => setShowInstructions(false)}>
                Voltar
              </button>
              {isIos ? (
                <button type="button" className="installAppTextButton installAppConfirmed" onClick={confirmManualInstallation}>
                  Já adicionei
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="installAppAction"
        onClick={requestInstallation}
        disabled={installationPending}
        aria-busy={installationPending}
        aria-live="polite"
      >
        {isAndroid ? (
          <Smartphone aria-hidden="true" />
        ) : installationPending ? (
          <LoaderCircle className="installAppSpinner" aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
        {actionLabel}
      </button>
    </aside>
  );
}
