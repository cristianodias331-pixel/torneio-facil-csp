import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const INSTALL_APP_STORAGE_KEY = "torneio360_app_installed";
const INSTALL_BANNER_SESSION_KEY = "torneio360_install_banner_dismissed";

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
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [visible, setVisible] = useState(
    () =>
      !isStandaloneApp() &&
      !readStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY) &&
      !readStorageFlag(window.sessionStorage, INSTALL_BANNER_SESSION_KEY)
  );

  const userAgent = window.navigator.userAgent || "";
  const isIos =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function markAsInstalled() {
      writeStorageFlag(window.localStorage, INSTALL_APP_STORAGE_KEY);
      setInstallPrompt(null);
      setShowInstructions(false);
      setVisible(false);
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);

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

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", markAsInstalled);
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

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
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (outcome === "accepted") confirmManualInstallation();
  }

  if (!visible) return null;

  const manualInstructions = isIos
    ? 'No Safari, toque em Compartilhar e selecione “Adicionar à Tela de Início”.'
    : isAndroid
      ? 'Abra o menu ⋮ do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.'
      : 'Use o ícone de instalação na barra de endereço ou abra o menu do navegador e escolha “Instalar Torneio360”.';

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
              <button type="button" className="installAppTextButton installAppConfirmed" onClick={confirmManualInstallation}>
                Já instalei
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <button type="button" className="installAppAction" onClick={requestInstallation}>
        <Download aria-hidden="true" />
        Instalar atalho
      </button>
    </aside>
  );
}
