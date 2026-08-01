import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

const INSTALL_APP_STORAGE_KEY = "torneio360_app_installed_v3";
const INSTALL_BANNER_SESSION_KEY = "torneio360_install_banner_dismissed_v3";

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
  const isAndroidChrome =
    isAndroid &&
    /Chrome\/\d+/i.test(userAgent) &&
    !/(EdgA|OPR|SamsungBrowser|\bwv\b)/i.test(userAgent);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [installCheckComplete, setInstallCheckComplete] = useState(!isAndroidChrome);
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
    let installCheckTimer;

    function finishInstallCheck() {
      installCheckTimer = window.setTimeout(() => setInstallCheckComplete(true), 2500);
    }

    function markAsInstalled() {
      window.clearTimeout(installRecoveryTimerRef.current);
      writeStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY);
      setInstallPrompt(null);
      setShowInstructions(false);
      setVisible(false);
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      window.clearTimeout(installCheckTimer);
      setInstallPrompt(event);
      setInstallCheckComplete(true);

      if (
        !readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) &&
        !readStorageFlag(window.sessionStorage, INSTALL_BANNER_SESSION_KEY)
      ) {
        setVisible(true);
      }
    }

    function handleDisplayModeChange(event) {
      if (event.matches) markAsInstalled();
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", markAsInstalled);
    displayMode.addEventListener("change", handleDisplayModeChange);

    if (isAndroidChrome) {
      if (document.readyState === "complete") {
        finishInstallCheck();
      } else {
        window.addEventListener("load", finishInstallCheck, { once: true });
      }
    }

    return () => {
      window.clearTimeout(installCheckTimer);
      window.clearTimeout(installRecoveryTimerRef.current);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", markAsInstalled);
      window.removeEventListener("load", finishInstallCheck);
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, [isAndroidChrome]);

  function confirmManualInstallation() {
    writeStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY);
    setShowInstructions(false);
    setVisible(false);
  }

  function dismissForThisVisit() {
    writeStorageFlag(window.sessionStorage, INSTALL_BANNER_SESSION_KEY);
    setShowInstructions(false);
    setVisible(false);
  }

  async function requestInstallation() {
    if (!installPrompt) {
      if (isAndroid && !isAndroidChrome) {
        const destination = `${window.location.host}${window.location.pathname}${window.location.search}`;
        const fallback = encodeURIComponent(window.location.href);
        window.location.href = `intent://${destination}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
        return;
      }

      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (outcome === "accepted") {
      setVisible(false);
      window.clearTimeout(installRecoveryTimerRef.current);
      installRecoveryTimerRef.current = window.setTimeout(() => {
        const installationConfirmed =
          readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) || isStandaloneApp();

        if (!installationConfirmed) {
          setInstallCheckComplete(true);
          setShowInstructions(true);
          setVisible(true);
        }
      }, 5000);
    }
  }

  if (!visible) return null;

  const manualInstructions = isIos
    ? 'No Safari, toque em Compartilhar e selecione “Adicionar à Tela de Início”.'
    : isAndroid
      ? 'No Chrome, toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. Depois confirme em “Instalar”.'
      : 'Use o ícone de instalação na barra de endereço ou abra o menu do navegador e escolha “Instalar Torneio360”.';

  const isPreparingAndroidInstall = isAndroidChrome && !installPrompt && !installCheckComplete;
  const actionLabel = installPrompt
    ? "Instalar agora"
    : isAndroid && !isAndroidChrome
      ? "Abrir no Chrome"
      : isPreparingAndroidInstall
        ? "Preparando instalação..."
        : isAndroid
          ? "Ver como instalar"
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
        <strong>Leve o Torneio360 com você</strong>
        <p>Abra seus torneios mais rápido, direto da tela inicial. É prático, leve e gratuito.</p>

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
        disabled={isPreparingAndroidInstall}
        aria-live="polite"
      >
        <Download aria-hidden="true" />
        {actionLabel}
      </button>
    </aside>
  );
}
