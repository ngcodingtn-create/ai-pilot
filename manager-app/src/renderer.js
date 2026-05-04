const state = {
  defaults: null,
  manifest: null,
  busy: false,
  activeView: "configuration",
  sidebarCollapsed: false,
  projectRoot: "",
  selectedModel: "",
  updateState: null,
  lastDiagnostics: null,
  installReadiness: null,
  desktopStatus: null,
  activity: [],
  currentAction: "",
  licenseError: "",
  lastLicenseAttempt: "",
};

const UI_STORAGE_KEY = "aipilot-manager-ui";
const LAST_AUTO_CONFIG_VERSION_KEY = "aipilot-manager-last-auto-config-version";
const PRODUCTION_BACKEND_URL = "https://ai-pilot-ten.vercel.app";

const elements = {
  appShell: document.querySelector(".app-shell"),
  versionChip: document.querySelector("#version-chip"),
  globalStatusTitle: document.querySelector("#global-status-title"),
  licenseCenterDot: document.querySelector(".license-center-dot"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  helpButton: document.querySelector("#help-button"),
  notificationButton: document.querySelector("#notification-button"),
  windowMinimize: document.querySelector("#window-minimize"),
  windowMaximize: document.querySelector("#window-maximize"),
  windowClose: document.querySelector("#window-close"),
  navConfiguration: document.querySelector("#nav-configuration"),
  navTutorials: document.querySelector("#nav-tutorials"),
  navUpdates: document.querySelector("#nav-updates"),
  navSettings: document.querySelector("#nav-settings"),
  navAbout: document.querySelector("#nav-about"),
  sidebarOpenTutorials: document.querySelector("#sidebar-open-tutorials"),
  viewConfiguration: document.querySelector("#view-configuration"),
  viewTutorials: document.querySelector("#view-tutorials"),
  viewUpdates: document.querySelector("#view-updates"),
  viewSettings: document.querySelector("#view-settings"),
  viewAbout: document.querySelector("#view-about"),
  configRefresh: document.querySelector("#config-refresh"),
  configRepairAll: document.querySelector("#config-repair-all"),
  configLicenseKey: document.querySelector("#config-license-key"),
  configProjectRoot: document.querySelector("#config-project-root"),
  configChooseFolder: document.querySelector("#config-choose-folder"),
  configConnect: document.querySelector("#config-connect"),
  toolCardGrid: document.querySelector("#tool-card-grid"),
  environmentReadyIcon: document.querySelector("#environment-ready-icon"),
  environmentReadyTitle: document.querySelector("#environment-ready-title"),
  environmentReadySubtitle: document.querySelector("#environment-ready-subtitle"),
  bannerStats: document.querySelector("#banner-stats"),
  licenseSummaryGrid: document.querySelector("#license-summary-grid"),
  licenseViewDetail: document.querySelector("#license-view-detail"),
  licenseReconnect: document.querySelector("#license-reconnect"),
  prepStatusPill: document.querySelector("#prep-status-pill"),
  prepList: document.querySelector("#prep-list"),
  diagnosticsStatusPill: document.querySelector("#diagnostics-status-pill"),
  diagnosticsList: document.querySelector("#diagnostics-list"),
  activityTimeline: document.querySelector("#activity-timeline"),
  viewAllLogs: document.querySelector("#view-all-logs"),
  updateBanner: document.querySelector("#update-banner"),
  tutorialsLibrary: document.querySelector("#tutorials-library"),
  watchVideo: document.querySelector("#watch-video"),
  downloadOfficialApp: document.querySelector("#download-official-app"),
  updateSummary: document.querySelector("#update-summary"),
  checkUpdates: document.querySelector("#check-updates"),
  installUpdateSecondary: document.querySelector("#install-update-secondary"),
  settingsPreferredTool: document.querySelector("#settings-preferred-tool"),
  settingsSummary: document.querySelector("#settings-summary"),
  aboutSummary: document.querySelector("#about-summary"),
  toolIcon: document.querySelector("#tool-icon"),
  toolLabel: document.querySelector("#tool-label"),
  toolHelper: document.querySelector("#tool-helper"),
  toolStatus: document.querySelector("#tool-status"),
  dockToolSelect: document.querySelector("#dock-tool-select"),
  dockModelSelect: document.querySelector("#dock-model-select"),
  dockLaunch: document.querySelector("#dock-launch"),
  launchLabel: document.querySelector("#launch-label"),
  openConfigFolder: document.querySelector("#open-config-folder"),
  quickReinstall: document.querySelector("#quick-reinstall"),
  quickRepairConfig: document.querySelector("#quick-repair-config"),
  quickResetConfig: document.querySelector("#quick-reset-config"),
  quickClearCache: document.querySelector("#quick-clear-cache"),
  quickExportDiagnostic: document.querySelector("#quick-export-diagnostic"),
};

const toolOptions = [
  {
    environment: "t3code",
    label: "T3 Code",
    shortDescription: "GUI minimale et prête pour Azure",
    icon: "./assets/tool-t3code.png",
  },
  {
    environment: "codex",
    label: "Codex App",
    shortDescription: "App officielle OpenAI",
    icon: "./assets/tool-codex.png",
  },
  {
    environment: "vscode-codex",
    label: "VS Code + Codex",
    shortDescription: "Codex directement dans VS Code",
    icon: "./assets/tool-codex.png",
  },
  {
    environment: "opencode",
    label: "OpenCode",
    shortDescription: "CLI moderne pour le terminal",
    icon: "./assets/tool-opencode.png",
  },
];

const toolLaunchLabels = {
  t3code: "Lancer T3 Code",
  codex: "Lancer Codex App",
  "vscode-codex": "Ouvrir VS Code + Codex",
  opencode: "Lancer OpenCode",
};

const toolHelperLabels = {
  t3code: "Interface graphique prête avec la configuration AIPilot.",
  codex: "Application officielle prête à fonctionner avec Azure.",
  "vscode-codex": "VS Code et Codex sont préparés pour démarrer rapidement.",
  opencode: "Choisissez le dossier projet où OpenCode doit écrire sa configuration et se lancer.",
};

const prepDefinitions = [
  { key: "node", label: "Node.js", description: "Runtime nécessaire pour les outils et le manager." },
  { key: "npm", label: "npm", description: "Gestionnaire de paquets utilisé par les CLI." },
  { key: "git", label: "Git", description: "Requis pour les workflows de développement." },
  { key: "cli", label: "CLI", description: "CLI associée à l’outil sélectionné et à Codex si requis." },
  { key: "desktop", label: "Outil sélectionné", description: "Application ou intégration principale choisie." },
  { key: "env", label: "Variables d’environnement Azure", description: "Variables Azure appliquées sur la machine." },
  { key: "files", label: "Fichiers de configuration", description: "config.toml, auth.json ou config OpenCode écrits." },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function icon(name) {
  const icons = {
    package:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>',
    file:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>',
    zap:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>',
    cloud:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.5 19H9a5 5 0 1 1 .95-9.91A6 6 0 1 1 17.5 19Z" /></svg>',
    wrench:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m14.7 6.3 3-3" /><path d="m2 22 6-6" /><path d="m7 11 6 6" /><path d="m14 4 6 6" /></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" /><path d="m9.5 12 1.5 1.5 3-3" /></svg>',
    activity:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg>',
    play:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7z" /></svg>',
    refresh:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 2v6h-6" /><path d="M3 22v-6h6" /><path d="M20.49 9A9 9 0 0 0 5 5.64L3 8" /><path d="M3.51 15A9 9 0 0 0 19 18.36L21 16" /></svg>',
    download:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>',
  };
  return icons[name] || icons.check;
}

function normalizeLicenseKey(value) {
  const clean = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

function looksLikeNonLicenseInput(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return Boolean(
    text &&
      (text.includes("http://") ||
        text.includes("https://") ||
        text.includes("www.") ||
        text.includes(".com") ||
        text.includes(".tn") ||
        text.includes("youtube") ||
        text.includes("/") ||
        text.includes("?")),
  );
}

function getLicenseInputError(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "Saisissez d’abord votre clé de licence.";
  }

  if (looksLikeNonLicenseInput(raw)) {
    return "Ce champ attend une clé de licence AIPilot, pas un lien ou du texte.";
  }

  const normalized = normalizeLicenseKey(raw);
  if (normalized.replace(/-/g, "").length !== 16) {
    return "La clé doit contenir 16 caractères, au format XXXX-XXXX-XXXX-XXXX.";
  }

  return "";
}

function tierLabel(value) {
  const map = {
    starter: "Starter",
    pro: "Enterprise",
    max: "Enterprise",
  };
  return map[String(value ?? "").toLowerCase()] || "Enterprise";
}

function nowLabel() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function toneFromMessage(message) {
  const text = String(message ?? "").toLowerCase();
  if (text.includes("erreur") || text.includes("introuvable") || text.includes("impossible")) return "error";
  if (text.includes("termin") || text.includes("connect") || text.includes("prêt")) return "success";
  return "live";
}

function appendActivity(message, tone = toneFromMessage(message)) {
  state.activity = [
    {
      message: String(message ?? ""),
      tone,
      time: nowLabel(),
    },
    ...state.activity,
  ].slice(0, 12);
  renderActivityTimeline();
}

function loadUiState() {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.sidebarCollapsed = Boolean(parsed?.sidebarCollapsed);
  } catch {
    state.sidebarCollapsed = false;
  }
}

function persistUiState() {
  window.localStorage.setItem(
    UI_STORAGE_KEY,
    JSON.stringify({
      sidebarCollapsed: state.sidebarCollapsed,
    }),
  );
}

function applySidebarState() {
  elements.appShell?.classList.toggle("is-sidebar-collapsed", state.sidebarCollapsed);
}

function setSidebarCollapsed(nextValue) {
  state.sidebarCollapsed = Boolean(nextValue);
  applySidebarState();
  persistUiState();
}

function getSelectedEnvironment() {
  return elements.dockToolSelect.value || elements.settingsPreferredTool.value || "t3code";
}

function getToolMeta(environment = getSelectedEnvironment()) {
  return toolOptions.find((item) => item.environment === environment) || toolOptions[0];
}

function getAvailableDeployments() {
  const deployments = Array.isArray(state.manifest?.azure?.availableDeployments)
    ? state.manifest.azure.availableDeployments
    : [];

  if (!deployments.length) {
    return [
      { id: "gpt-5.4", label: "GPT-5.4 stable", deployment: "gpt-5.4-1", recommended: true },
      { id: "gpt-5.5", label: "GPT-5.5 premium", deployment: "gpt-5.5-1", recommended: false },
      { id: "gpt-5.3-codex", label: "GPT-5.3 Codex", deployment: "gpt-5.3-codex", recommended: false },
    ];
  }

  return deployments;
}

function ensureSelectedModel() {
  const deployments = getAvailableDeployments();
  const available = deployments.map((item) => item.deployment);
  const defaultModel = state.manifest?.azure?.deployment || deployments[0]?.deployment || "";
  if (!available.includes(state.selectedModel)) {
    state.selectedModel = defaultModel;
  }
}

function modelLabelFor(deployment) {
  return (
    getAvailableDeployments().find((item) => item.deployment === deployment)?.label ||
    deployment ||
    "GPT-5.4"
  );
}

function getConfigFolderPath(environment = getSelectedEnvironment()) {
  const homeDir = String(state.defaults?.homeDir ?? "");
  if (!homeDir) return "";
  const separator = String(state.defaults?.platform) === "win32" ? "\\" : "/";
  const join = (...parts) =>
    parts
      .filter(Boolean)
      .map((part, index) => {
        const value = String(part);
        if (index === 0) return value.replace(/[\\/]$/, "");
        return value.replace(/^[\\/]+|[\\/]+$/g, "");
      })
      .join(separator);

  if (environment === "opencode") {
    return join(homeDir, ".config", "opencode");
  }
  return join(homeDir, ".codex");
}

function getConfigFileLabel(environment = getSelectedEnvironment()) {
  if (environment === "opencode") return "opencode.json";
  return "config.toml";
}

function requiresProjectRoot(environment = getSelectedEnvironment()) {
  return environment === "opencode";
}

async function ensureProjectRoot(environment = getSelectedEnvironment(), reason = "continuer") {
  if (!requiresProjectRoot(environment)) {
    return state.projectRoot || "";
  }

  if (state.projectRoot) {
    return state.projectRoot;
  }

  appendActivity("OpenCode a besoin d’un dossier projet avant de continuer.", "live");
  const directory = await window.aipilotManager.pickProjectDirectory();
  if (!directory) {
    throw new Error(`Choisissez d’abord un dossier projet pour OpenCode avant de ${reason}.`);
  }

  state.projectRoot = directory;
  elements.configProjectRoot.value = directory;
  appendActivity(`Dossier projet OpenCode sélectionné : ${directory}`, "success");
  await persistState();
  renderAll();
  return directory;
}

function syncProjectRootField() {
  const environment = getSelectedEnvironment();
  const field = elements.configProjectRoot?.closest(".field");
  const label = field?.querySelector("span");
  if (label) {
    label.textContent = requiresProjectRoot(environment) ? "Dossier projet OpenCode" : "Dossier projet";
  }
  if (elements.configProjectRoot) {
    elements.configProjectRoot.placeholder = requiresProjectRoot(environment)
      ? "Choisissez le dossier où OpenCode sera lancé"
      : "Optionnel";
  }
}

function setActiveView(view) {
  state.activeView = view;
  const map = {
    configuration: elements.viewConfiguration,
    tutorials: elements.viewTutorials,
    updates: elements.viewUpdates,
    settings: elements.viewSettings,
    about: elements.viewAbout,
  };
  Object.entries(map).forEach(([key, element]) => {
    element?.classList.toggle("is-active", key === view);
  });

  const navMap = {
    configuration: elements.navConfiguration,
    tutorials: elements.navTutorials,
    updates: elements.navUpdates,
    settings: elements.navSettings,
    about: elements.navAbout,
  };

  Object.values(navMap).forEach((button) => button?.classList.remove("is-active"));
  navMap[view]?.classList.add("is-active");
}

function syncButtons() {
  const connected = Boolean(state.manifest);
  const busy = state.busy;
  const ready = Boolean(state.lastDiagnostics?.overallOk);
  const hasUpdates = Boolean(state.updateState?.downloaded);
  const selectedEnvironment = getSelectedEnvironment();
  const needsProjectRoot = requiresProjectRoot(selectedEnvironment) && !state.projectRoot;

  elements.configConnect.disabled = busy;
  elements.configChooseFolder.disabled = busy;
  elements.configRefresh.disabled = busy;
  elements.configRepairAll.disabled = !connected || busy;
  elements.licenseReconnect.disabled = !connected || busy;
  elements.licenseViewDetail.disabled = !connected;
  elements.watchVideo.disabled = !state.manifest?.manager?.supportVideoUrl;
  elements.downloadOfficialApp.disabled = !state.manifest?.tool?.officialAppUrl;
  elements.checkUpdates.disabled = busy || !state.updateState?.enabled || state.updateState?.checking;
  elements.installUpdateSecondary.disabled = busy || !hasUpdates;

  elements.dockLaunch.disabled = !connected || busy || !ready || needsProjectRoot;
  elements.openConfigFolder.disabled = !connected;
  elements.quickReinstall.disabled = !connected || busy;
  elements.quickRepairConfig.disabled = !connected || busy;
  elements.quickResetConfig.disabled = !connected || busy;
  elements.quickClearCache.disabled = busy;
  elements.quickExportDiagnostic.disabled = !connected;

  elements.configConnect.textContent =
    busy && state.currentAction === "connect" ? "Connexion..." : "Connecter la licence";
  elements.configRepairAll.textContent =
    busy && state.currentAction === "repair" ? "Réparation en cours..." : "Réparer tout";
}

function setBusy(nextValue, action = "") {
  state.busy = nextValue;
  state.currentAction = nextValue ? action : "";
  syncButtons();
}

function setEnvironment(nextEnvironment, { reconnectIfNeeded = true } = {}) {
  const target = String(nextEnvironment || "t3code");
  elements.dockToolSelect.value = target;
  elements.settingsPreferredTool.value = target;
  renderToolCards();
  renderRightPanel();
  renderLicenseSummary();

  if (reconnectIfNeeded && state.manifest && state.manifest.tool.environment !== target) {
    void reconnectForEnvironment(target);
  }
}

async function persistState() {
  if (!state.defaults) return;
  await window.aipilotManager.saveState({
    backendUrl: state.defaults.backendUrl,
    licenseKey: normalizeLicenseKey(elements.configLicenseKey.value),
    environment: getSelectedEnvironment(),
    projectRoot: state.projectRoot,
  });
}

function checkByMatch(patterns) {
  const checks = Array.isArray(state.lastDiagnostics?.checks) ? state.lastDiagnostics.checks : [];
  const loweredPatterns = patterns.map((item) => String(item).toLowerCase());
  return (
    checks.find((check) => {
      const label = String(check?.label ?? "").toLowerCase();
      const details = String(check?.details ?? "").toLowerCase();
      return loweredPatterns.some((pattern) => label.includes(pattern) || details.includes(pattern));
    }) || null
  );
}

function buildPrepRows() {
  const desktopRequired = state.desktopStatus?.required;
  const desktopInstalled = state.desktopStatus?.installed;
  const selectedTool = getToolMeta();

  return prepDefinitions.map((item) => {
    if (item.key === "node") {
      const check = checkByMatch(["node"]);
      return {
        label: item.label,
        description: item.description,
        version: check?.version || extractVersion(check?.details) || "Disponible",
        status: check?.ok ? "À jour" : "À vérifier",
        tone: check?.ok ? "success" : state.manifest ? "warning" : "neutral",
        detail: check?.details || "Runtime Node.js requis pour les outils et le manager.",
        icon: "package",
      };
    }

    if (item.key === "npm") {
      const check = checkByMatch(["npm"]);
      return {
        label: item.label,
        description: item.description,
        version: check?.version || extractVersion(check?.details) || "Disponible",
        status: check?.ok ? "À jour" : "À vérifier",
        tone: check?.ok ? "success" : state.manifest ? "warning" : "neutral",
        detail: check?.details || "Gestionnaire de paquets prêt.",
        icon: "package",
      };
    }

    if (item.key === "git") {
      const check = checkByMatch(["git"]);
      return {
        label: item.label,
        description: item.description,
        version: check?.version || extractVersion(check?.details) || "Disponible",
        status: check?.ok ? "À jour" : "À vérifier",
        tone: check?.ok ? "success" : state.manifest ? "warning" : "neutral",
        detail: check?.details || "Git requis pour les workflows de développement.",
        icon: "package",
      };
    }

    if (item.key === "cli") {
      const isOpenCode = getSelectedEnvironment() === "opencode";
      const check = isOpenCode
        ? checkByMatch(["opencode", "open code"])
        : checkByMatch(["codex cli", "commande codex", "codex binary", "codex command"]);
      return {
        label: isOpenCode ? "OpenCode CLI" : "Codex CLI",
        description: item.description,
        version: check?.version || extractVersion(check?.details) || "Installé",
        status: check?.ok ? "À jour" : "À vérifier",
        tone: check?.ok ? "success" : state.manifest ? "warning" : "neutral",
        detail:
          check?.details ||
          (isOpenCode ? "CLI OpenCode installée pour le terminal." : "CLI Codex installée pour Codex, T3 Code et VS Code."),
        icon: "package",
      };
    }

    if (item.key === "desktop") {
      const detail = desktopRequired
        ? desktopInstalled
          ? `${selectedTool.label} est installé et détecté.`
          : `${selectedTool.label} doit être installé depuis le lien officiel.`
        : `${selectedTool.label} ne nécessite pas une app desktop dédiée.`;
      return {
        label: selectedTool.label,
        description: item.description,
        version: desktopRequired ? (desktopInstalled ? "Disponible" : "Manquant") : "CLI",
        status: desktopRequired ? (desktopInstalled ? "OK" : "Attention") : "OK",
        tone: desktopRequired ? (desktopInstalled ? "success" : "warning") : "success",
        detail,
        icon: "check",
      };
    }

    if (item.key === "env") {
      const check = checkByMatch(["azure_openai_api_key", "variable", "environment variable"]);
      return {
        label: item.label,
        description: item.description,
        version: "Azure",
        status: check?.ok || state.manifest ? "OK" : "À vérifier",
        tone: check?.ok || state.manifest ? "success" : "warning",
        detail: check?.details || "Variables Azure configurées et prêtes à être relues.",
        icon: "zap",
      };
    }

    const check = checkByMatch(["config.toml", "auth.json", "fichier", "configuration"]);
    return {
      label: item.label,
      description: item.description,
      version: getConfigFileLabel(),
      status: check?.ok || state.manifest ? "OK" : "À vérifier",
      tone: check?.ok || state.manifest ? "success" : "warning",
      detail:
        check?.details ||
        `${getConfigFileLabel()} et les autres fichiers requis sont générés par AIPilot.`,
      icon: "file",
    };
  });
}

function buildDiagnosticRows() {
  const model = state.selectedModel || state.manifest?.azure?.deployment || "gpt-5.4-1";
  const selectedTool = getToolMeta().label;
  const azureCheck = checkByMatch(["azure", "deployment", "responses"]);
  const fileCheck = checkByMatch(["config.toml", "auth.json", "fichier", "configuration"]);
  const permissionCheck = checkByMatch(["permission", "trusted", "sandbox"]);

  const rows = [
    {
      label: "Connexion Azure",
      description: "Authentification et accès à Azure.",
      version: state.manifest ? state.manifest.azure.resourceName : "-",
      status: azureCheck?.ok || state.manifest ? "OK" : "En attente",
      tone: azureCheck?.ok || state.manifest ? "success" : "warning",
      detail: azureCheck?.details || "La ressource et le déploiement Azure sont prêts.",
    },
    {
      label: "Fichiers de configuration",
      description: "Présence des fichiers requis pour l’outil choisi.",
      version: getConfigFileLabel(),
      status: fileCheck?.ok || state.manifest ? "OK" : "En attente",
      tone: fileCheck?.ok || state.manifest ? "success" : "warning",
      detail: fileCheck?.details || "Les fichiers de configuration sont présents et cohérents.",
    },
    {
      label: "Permissions",
      description: "Accès aux dossiers et fichiers nécessaires.",
      version: state.defaults?.platform || "-",
      status: permissionCheck?.ok || state.manifest ? "OK" : "Optionnel",
      tone: permissionCheck?.ok || state.manifest ? "success" : "warning",
      detail: permissionCheck?.details || "Les permissions nécessaires sont disponibles pour l’outil choisi.",
    },
    {
      label: "Outil sélectionné",
      description: "Présence et disponibilité de l’outil ciblé.",
      version: selectedTool,
      status: state.desktopStatus?.required ? (state.desktopStatus?.installed ? "OK" : "Attention") : "OK",
      tone: state.desktopStatus?.required ? (state.desktopStatus?.installed ? "success" : "warning") : "success",
      detail:
        state.desktopStatus?.required && !state.desktopStatus?.installed
          ? `${selectedTool} doit encore être installé.`
          : `${selectedTool} est prêt à être lancé.`,
    },
    {
      label: "Modèle Azure",
      description: "Déploiement Azure actif et cohérent.",
      version: model,
      status: state.manifest ? "OK" : "En attente",
      tone: state.manifest ? "success" : "warning",
      detail: `Le modèle actif est ${modelLabelFor(model)} (${model}).`,
    },
    {
      label: "Intégrité du système",
      description: "Vérification générale de l’environnement.",
      version: state.lastDiagnostics?.checks?.length ? `${state.lastDiagnostics.checks.length} checks` : "-",
      status: state.lastDiagnostics?.overallOk ? "OK" : state.lastDiagnostics ? "Attention" : "En attente",
      tone: state.lastDiagnostics?.overallOk ? "success" : state.lastDiagnostics ? "warning" : "warning",
      detail:
        state.lastDiagnostics?.overallOk
          ? "Aucun problème détecté sur l’environnement."
          : state.lastDiagnostics
            ? "Des éléments nécessitent encore une vérification ou une réparation."
            : "Lancez une vérification pour confirmer l’état global.",
    },
  ];

  return rows;
}

function extractVersion(details) {
  const match = String(details || "").match(/v?\d+(?:\.\d+)+/);
  return match ? match[0] : "";
}

function renderToolCards() {
  const current = getSelectedEnvironment();
  elements.toolCardGrid.innerHTML = toolOptions
    .map(
      (tool) => `
        <button class="tool-option-card ${tool.environment === current ? "is-active" : ""}" type="button" data-tool-card="${escapeHtml(tool.environment)}">
          <div class="tool-option-left">
            <span class="tool-option-icon">
              <img src="${escapeHtml(tool.icon)}" alt="${escapeHtml(tool.label)}" />
            </span>
            <div class="tool-option-copy">
              <strong>${escapeHtml(tool.label)}</strong>
              <span>${escapeHtml(tool.shortDescription)}</span>
            </div>
          </div>
          <span class="tool-badge is-success">Prêt</span>
        </button>
      `,
    )
    .join("");

  elements.toolCardGrid.querySelectorAll("[data-tool-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextEnvironment = button.getAttribute("data-tool-card");
      setEnvironment(nextEnvironment);
    });
  });
}

function renderTopStatus() {
  if (state.manifest?.license?.customerName) {
    elements.globalStatusTitle.textContent = "Licence connectée";
    if (elements.licenseCenterDot) elements.licenseCenterDot.style.background = "#22c55e";
    return;
  }
  if (state.licenseError) {
    elements.globalStatusTitle.textContent = "Licence non valide";
    if (elements.licenseCenterDot) elements.licenseCenterDot.style.background = "#ef4444";
    return;
  }
  elements.globalStatusTitle.textContent = "Licence non connectée";
  if (elements.licenseCenterDot) elements.licenseCenterDot.style.background = "#94a3b8";
}

function renderBannerStats() {
  const checks = Array.isArray(state.lastDiagnostics?.checks) ? state.lastDiagnostics.checks : [];
  const total = checks.length;
  const success = checks.filter((item) => item?.ok).length;
  const warnings = checks.filter((item) => !item?.ok && item?.optional).length;
  const errors = checks.filter((item) => !item?.ok && !item?.optional).length;

  const ready = Boolean(state.manifest) && (state.lastDiagnostics?.overallOk || !total);
  const licenseError = !state.manifest && state.licenseError;
  elements.environmentReadyIcon.style.background = ready
    ? "#22c55e"
    : licenseError || errors
      ? "#ef4444"
      : warnings
        ? "#f97316"
        : "#94a3b8";
  elements.environmentReadyIcon.textContent = ready ? "✓" : licenseError || warnings || errors ? "!" : "•";
  elements.environmentReadyTitle.textContent = ready
    ? "Votre environnement est prêt"
    : state.manifest
      ? "Votre environnement demande encore une vérification"
      : licenseError
        ? "Licence non valide"
      : "Commencez par connecter votre licence";
  elements.environmentReadySubtitle.textContent = ready
    ? "Tous les composants sont installés et configurés correctement."
    : state.manifest
      ? "AIPilot a chargé la configuration, mais quelques points doivent encore être validés."
      : licenseError
        ? state.licenseError
      : "AIPilot chargera la configuration complète après la connexion de votre licence.";

  const stats = [
    { value: total || 0, label: "Vérifications", tone: "" },
    { value: success || 0, label: "Réussies", tone: "success" },
    { value: warnings || 0, label: "Avertissements", tone: "warning" },
    { value: errors || 0, label: "Erreurs", tone: "error" },
  ];

  elements.bannerStats.innerHTML = stats
    .map(
      (item) => `
        <div class="readiness-stat ${item.tone ? `is-${item.tone}` : ""}">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `,
    )
    .join("");
}

function renderLicenseSummary() {
  if (!state.manifest) {
    const hasError = Boolean(state.licenseError);
    elements.licenseSummaryGrid.innerHTML = `
      <div class="summary-metric">
        <span class="summary-metric-label">Statut</span>
        <div class="summary-metric-value"><span class="summary-badge ${hasError ? "is-error" : "is-warning"}">${
          hasError ? "Licence invalide" : "En attente"
        }</span></div>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Client</span>
        <div class="summary-metric-value">${escapeHtml(hasError ? state.licenseError : "Connectez votre licence")}</div>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Tier</span>
        <div class="summary-metric-value">-</div>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Ressource Azure</span>
        <div class="summary-metric-value">-</div>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Déploiement par défaut</span>
        <div class="summary-metric-value">-</div>
      </div>
    `;
    return;
  }

  const azure = state.manifest.azure || {};
  elements.licenseSummaryGrid.innerHTML = `
    <div class="summary-metric">
      <span class="summary-metric-label">Statut</span>
      <div class="summary-metric-value"><span class="summary-badge is-success">Active</span></div>
    </div>
    <div class="summary-metric">
      <span class="summary-metric-label">Client</span>
      <div class="summary-metric-value">${escapeHtml(state.manifest.license.customerName || "Entreprise ABC")}</div>
    </div>
    <div class="summary-metric">
      <span class="summary-metric-label">Tier</span>
      <div class="summary-metric-value">${escapeHtml(tierLabel(state.manifest.license.tier))}</div>
    </div>
    <div class="summary-metric">
      <span class="summary-metric-label">Ressource Azure</span>
      <div class="summary-metric-value">${escapeHtml(azure.resourceName || "AIPilot-ABC")}</div>
    </div>
    <div class="summary-metric">
      <span class="summary-metric-label">Déploiement par défaut</span>
      <div class="summary-metric-value">${escapeHtml(state.selectedModel || azure.deployment || "gpt-5.4-1")}</div>
    </div>
  `;
}

function renderPrepRows() {
  const rows = buildPrepRows();
  const allReady = rows.every((item) => item.tone === "success");
  elements.prepStatusPill.textContent = allReady ? "Tout est à jour" : "À surveiller";
  elements.prepStatusPill.className = `section-status-pill ${allReady ? "is-success" : "is-warning"}`;
  elements.prepList.innerHTML = rows
    .map(
      (row) => `
        <div class="prep-row">
          <span class="prep-row-icon ${row.tone !== "success" ? `is-${row.tone}` : ""}">${icon(
            row.icon,
          )}</span>
          <div class="prep-row-copy">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(row.detail)}</span>
          </div>
          <span class="prep-row-version">${escapeHtml(row.version || "")}</span>
          <span class="tool-badge ${row.tone === "success" ? "is-success" : row.tone === "error" ? "is-error" : "is-warning"}">${escapeHtml(row.status)}</span>
        </div>
      `,
    )
    .join("");
}

function renderDiagnosticRows() {
  const rows = buildDiagnosticRows();
  const allReady = rows.every((item) => item.tone === "success");
  elements.diagnosticsStatusPill.textContent = allReady ? "Aucun problème détecté" : "Points à vérifier";
  elements.diagnosticsStatusPill.className = `section-status-pill ${allReady ? "is-success" : "is-warning"}`;
  elements.diagnosticsList.innerHTML = rows
    .map(
      (row) => `
        <div class="diagnostic-row">
          <span class="diagnostic-row-icon ${row.tone !== "success" ? `is-${row.tone}` : ""}">${icon(
            row.tone === "success" ? "shield" : row.tone === "error" ? "warning" : "activity",
          )}</span>
          <div class="diagnostic-row-copy">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(row.detail)}</span>
          </div>
          <span class="diagnostic-row-version">${escapeHtml(row.version || "")}</span>
          <span class="tool-badge ${row.tone === "success" ? "is-success" : row.tone === "error" ? "is-error" : "is-warning"}">${escapeHtml(row.status)}</span>
        </div>
      `,
    )
    .join("");
}

function renderActivityTimeline() {
  const activity =
    state.activity.length > 0
      ? [...state.activity].slice(0, 5).reverse()
      : [
          { message: "Licence validée", time: "--:--", tone: "live" },
          { message: "Configuration appliquée", time: "--:--", tone: "live" },
          { message: "Composants vérifiés", time: "--:--", tone: "live" },
          { message: "Fichiers générés", time: "--:--", tone: "live" },
          { message: "Vérifications terminées", time: "--:--", tone: "live" },
        ];

  elements.activityTimeline.innerHTML = activity
    .map(
      (item) => `
        <article class="activity-pill">
          <div class="activity-pill-head">
            <span class="activity-pill-dot is-${escapeHtml(item.tone)}">${item.tone === "success" ? "✓" : item.tone === "error" ? "!" : "•"}</span>
            <span>${escapeHtml(item.message)}</span>
          </div>
          <span class="activity-pill-time">${escapeHtml(item.time)}</span>
        </article>
      `,
    )
    .join("");
}

function renderUpdateBanner() {
  const update = state.updateState;
  const available = Boolean(update?.availableVersion);
  const downloaded = Boolean(update?.downloaded);
  const message = downloaded
    ? "La mise à jour a été téléchargée et peut être installée maintenant."
    : available
      ? "Une nouvelle version d’AIPilot Manager est disponible."
      : "Le manager vérifie régulièrement les nouvelles versions pour vous garder à jour.";

  elements.updateBanner.innerHTML = `
    <div class="update-banner-inner">
      <span class="update-banner-icon">${icon("download")}</span>
      <div class="update-banner-copy">
        <strong>Mises à jour disponibles ${available || downloaded ? '<span class="new-badge">Nouveau</span>' : ""}</strong>
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="update-banner-actions">
        <a class="update-link" href="#" id="update-banner-open-updates">Voir les nouveautés</a>
        <button id="install-update" class="install-update-button" type="button" ${downloaded ? "" : "disabled"}>
          <span class="icon-wrap icon-14">${icon("download")}</span>
          <span>Installer maintenant</span>
        </button>
      </div>
    </div>
  `;

  const openUpdates = document.querySelector("#update-banner-open-updates");
  const installButton = document.querySelector("#install-update");
  openUpdates?.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView("updates");
  });
  installButton?.addEventListener("click", async () => {
    if (!state.updateState?.downloaded) return;
    await window.aipilotManager.installUpdate();
  });
}

function renderTutorials(manifest) {
  const tutorials = Array.isArray(manifest?.manager?.tutorials) ? manifest.manager.tutorials : [];
  const fallbackVideo = manifest?.manager?.supportVideoUrl || "https://youtu.be/WwDvzdM9YWw";
  const fallbackManualGuide = `${state.defaults?.backendUrl || PRODUCTION_BACKEND_URL}/tuto`;
  const merged = [
    { label: "Téléchargement et configuration pas à pas", url: fallbackVideo },
    { label: "Guide manuel AIPilot", url: fallbackManualGuide },
    ...tutorials,
  ]
    .filter((item) => item?.url)
    .filter((item, index, list) => list.findIndex((entry) => entry.url === item.url) === index)
    .slice(0, 6);

  elements.tutorialsLibrary.innerHTML = merged.length
    ? merged
        .map((item) => {
          const subtitle = item.url.includes("youtu")
            ? "Tutoriel vidéo pas à pas"
            : item.url.includes("/tuto")
              ? "Guide manuel complet"
              : "Ressource utile pour terminer la configuration";
          return `
            <article class="tutorial-row">
              <div class="tutorial-thumb">${icon("play")}</div>
              <div class="tutorial-copy">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(subtitle)}</span>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">Aucun tutoriel disponible pour le moment.</div>`;

  elements.watchVideo.dataset.url = fallbackVideo;
  elements.downloadOfficialApp.dataset.url = manifest?.tool?.officialAppUrl || "";
}

function renderUpdatesView() {
  const update = state.updateState;
  elements.updateSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Version actuelle</dt><dd>${escapeHtml(update?.currentVersion || state.defaults?.version || "-")}</dd></div>
      <div class="summary-row"><dt>Version dispo</dt><dd>${escapeHtml(update?.availableVersion || "Aucune")}</dd></div>
      <div class="summary-row"><dt>Canal</dt><dd>${escapeHtml(update?.enabled ? "Actif" : "Désactivé")}</dd></div>
      <div class="summary-row"><dt>Source</dt><dd>${escapeHtml(update?.updateUrl || "GitHub Releases")}</dd></div>
    </dl>
  `;
}

function renderSettingsSummary() {
  elements.settingsSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Portail</dt><dd>${escapeHtml(state.defaults?.backendUrl || "-")}</dd></div>
      <div class="summary-row"><dt>Plateforme</dt><dd>${escapeHtml(state.defaults?.platform || "-")}</dd></div>
      <div class="summary-row"><dt>Version</dt><dd>${escapeHtml(state.defaults?.version || "-")}</dd></div>
      <div class="summary-row"><dt>Outil préféré</dt><dd>${escapeHtml(getToolMeta().label)}</dd></div>
    </dl>
  `;
}

function renderAboutSummary() {
  elements.aboutSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Produit</dt><dd>AIPilot Manager</dd></div>
      <div class="summary-row"><dt>Mission</dt><dd>Installer, réparer et lancer vos outils IA avec un parcours simple.</dd></div>
      <div class="summary-row"><dt>Version</dt><dd>${escapeHtml(state.defaults?.version || "-")}</dd></div>
    </dl>
  `;
}

function renderRightPanel() {
  const tool = getToolMeta();
  ensureSelectedModel();
  elements.toolLabel.textContent = tool.label;
  elements.toolHelper.textContent = toolHelperLabels[tool.environment] || "Prêt à être lancé avec la configuration AIPilot.";
  elements.toolIcon.src = tool.icon;
  elements.toolIcon.alt = `Icône ${tool.label}`;
  elements.dockToolSelect.value = tool.environment;
  elements.settingsPreferredTool.value = tool.environment;
  elements.launchLabel.textContent = toolLaunchLabels[tool.environment] || `Lancer ${tool.label}`;

  const ready = Boolean(state.lastDiagnostics?.overallOk);
  elements.toolStatus.textContent = state.manifest ? (ready ? "Prêt" : "À vérifier") : "À connecter";
  elements.toolStatus.className = `tool-ready-badge ${ready || !state.manifest ? "" : "tool-ready-badge-warn"}`.trim();

  const options = getAvailableDeployments();
  elements.dockModelSelect.innerHTML = options
    .map(
      (item) => `
        <option value="${escapeHtml(item.deployment)}">${escapeHtml(item.label)}</option>
      `,
    )
    .join("");
  elements.dockModelSelect.value = state.selectedModel || options[0]?.deployment || "";

  elements.openConfigFolder.textContent =
    tool.environment === "opencode"
      ? state.projectRoot
        ? "Ouvrir le dossier projet"
        : "Choisir le dossier projet"
      : "Ouvrir le dossier de config";

  syncProjectRootField();
}

function renderAll() {
  renderTopStatus();
  renderToolCards();
  renderBannerStats();
  renderLicenseSummary();
  renderPrepRows();
  renderDiagnosticRows();
  renderActivityTimeline();
  renderTutorials(state.manifest);
  renderUpdatesView();
  renderSettingsSummary();
  renderAboutSummary();
  renderRightPanel();
  renderUpdateBanner();
  syncButtons();
}

async function refreshInstallSignals() {
  const env = getSelectedEnvironment();
  state.installReadiness = await window.aipilotManager.getInstallReadiness(env);
  state.desktopStatus = await window.aipilotManager.getDesktopAppStatus(env);
}

async function runManagerAction(action) {
  if (!state.manifest) return;
  setBusy(true, action);
  appendActivity(`Action lancée : ${action}`, "live");
  try {
    const result = await window.aipilotManager.runAction({
      action,
      manifest: state.manifest,
      projectRoot: state.projectRoot,
      selectedModel: state.selectedModel,
    });
    state.lastDiagnostics = result?.diagnostics || null;
    await refreshInstallSignals();
    appendActivity(`Action terminée : ${action}`, "success");
  } catch (error) {
    appendActivity(error instanceof Error ? error.message : "Une erreur est survenue.", "error");
    throw error;
  } finally {
    setBusy(false);
    renderAll();
  }
}

async function autoRefreshConfigForCurrentVersion() {
  if (!state.manifest || !state.defaults?.version) return;

  const currentVersion = state.defaults.version;
  const lastVersion = localStorage.getItem(LAST_AUTO_CONFIG_VERSION_KEY);
  if (lastVersion === currentVersion) {
    return;
  }

  appendActivity(
    "Nouvelle version détectée: synchronisation de la clé APIM individuelle...",
    "live",
  );
  await runManagerAction("refresh-config");
  localStorage.setItem(LAST_AUTO_CONFIG_VERSION_KEY, currentVersion);
  appendActivity(
    "Clé APIM individuelle appliquée. Redémarrage du manager...",
    "success",
  );

  if (state.defaults?.packaged) {
    await window.aipilotManager.restartApp();
  }
}

async function connectSession({ autoDiagnose = true } = {}) {
  const backendUrl = state.defaults.backendUrl;
  const inputError = getLicenseInputError(elements.configLicenseKey.value);
  if (inputError) {
    state.manifest = null;
    state.lastDiagnostics = null;
    state.licenseError = inputError;
    state.lastLicenseAttempt = normalizeLicenseKey(elements.configLicenseKey.value);
    renderAll();
    throw new Error(inputError);
  }

  const licenseKey = normalizeLicenseKey(elements.configLicenseKey.value);
  const environment = getSelectedEnvironment();

  elements.configLicenseKey.value = licenseKey;
  state.licenseError = "";
  state.lastLicenseAttempt = licenseKey;
  renderAll();
  appendActivity(`Connexion de la licence ${licenseKey}...`, "live");

  let manifest;
  try {
    manifest = await window.aipilotManager.createSession({
      backendUrl,
      licenseKey,
      environment,
      projectRoot: state.projectRoot,
    });
  } catch (error) {
    state.manifest = null;
    state.lastDiagnostics = null;
    state.licenseError =
      error instanceof Error ? error.message.replace(/^Error invoking remote method 'manager:create-session': Error:\s*/, "") : "Licence introuvable ou inactive.";
    renderAll();
    throw error;
  }

  state.manifest = manifest;
  state.licenseError = "";
  state.selectedModel = manifest?.azure?.deployment || getAvailableDeployments()[0]?.deployment || "";
  await persistState();
  await refreshInstallSignals();
  appendActivity(`Licence connectée pour ${manifest.license.customerName}.`, "success");
  renderAll();

  if (autoDiagnose) {
    await runManagerAction("diagnose");
  }
}

async function reconnectForEnvironment() {
  if (!state.manifest) return;
  setBusy(true, "connect");
  try {
    await connectSession({ autoDiagnose: true });
  } catch (error) {
    appendActivity(error instanceof Error ? error.message : "Impossible de recharger la session.", "error");
  } finally {
    setBusy(false);
    renderAll();
  }
}

async function handleInstall() {
  await ensureProjectRoot(getSelectedEnvironment(), "installer et configurer OpenCode");
  await runManagerAction("install-configure");
}

async function handleRepair() {
  await ensureProjectRoot(getSelectedEnvironment(), "réparer OpenCode");
  await runManagerAction("repair");
}

async function handleLaunch() {
  await ensureProjectRoot(getSelectedEnvironment(), "lancer OpenCode");
  await runManagerAction("launch");
}

function downloadDiagnostic() {
  const payload = {
    generatedAt: new Date().toISOString(),
    defaults: state.defaults,
    tool: getToolMeta(),
    selectedModel: state.selectedModel,
    manifest: state.manifest,
    diagnostics: state.lastDiagnostics,
    activity: state.activity,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aipilot-diagnostic-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  appendActivity("Diagnostic exporté localement.", "success");
}

async function openConfigFolder() {
  const environment = getSelectedEnvironment();

  if (environment === "opencode") {
    const directory = await ensureProjectRoot(environment, "ouvrir le dossier projet OpenCode");
    if (!directory) return;
    await window.aipilotManager.openPath(directory);
    return;
  }

  const configFolder = getConfigFolderPath(environment);
  if (!configFolder) return;
  await window.aipilotManager.openPath(configFolder);
}

async function resetConfiguration() {
  if (!state.manifest) return;
  elements.dockModelSelect.value = state.manifest.azure.deployment;
  state.selectedModel = state.manifest.azure.deployment;
  appendActivity("Réinitialisation de la configuration demandée.", "live");
  await runManagerAction("repair");
}

function clearCache() {
  window.localStorage.removeItem(UI_STORAGE_KEY);
  state.sidebarCollapsed = false;
  applySidebarState();
  appendActivity("Cache local de l’interface vidé.", "success");
}

function bindBasicEvents() {
  elements.windowMinimize.addEventListener("click", () => window.aipilotManager.minimizeWindow());
  elements.windowMaximize.addEventListener("click", () => window.aipilotManager.toggleMaximizeWindow());
  elements.windowClose.addEventListener("click", () => window.aipilotManager.closeWindow());
  elements.helpButton.addEventListener("click", () => setActiveView("tutorials"));
  elements.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(!state.sidebarCollapsed));

  elements.navConfiguration.addEventListener("click", () => setActiveView("configuration"));
  elements.navTutorials.addEventListener("click", () => setActiveView("tutorials"));
  elements.navUpdates.addEventListener("click", () => setActiveView("updates"));
  elements.navSettings.addEventListener("click", () => setActiveView("settings"));
  elements.navAbout.addEventListener("click", () => setActiveView("about"));
  elements.sidebarOpenTutorials.addEventListener("click", () => setActiveView("tutorials"));

  elements.configLicenseKey.addEventListener("input", (event) => {
    if (looksLikeNonLicenseInput(event.target.value)) {
      event.target.value = "";
      state.manifest = null;
      state.lastDiagnostics = null;
      state.licenseError = "Ce champ attend une clé de licence AIPilot, pas un lien ou du texte.";
      renderAll();
      return;
    }

    event.target.value = normalizeLicenseKey(event.target.value);
    if (state.licenseError) {
      state.licenseError = "";
      renderAll();
    }
  });

  elements.configChooseFolder.addEventListener("click", async () => {
    const directory = await window.aipilotManager.pickProjectDirectory();
    if (!directory) return;
    state.projectRoot = directory;
    elements.configProjectRoot.value = directory;
    appendActivity(`Dossier projet sélectionné : ${directory}`, "success");
    await persistState();
  });

  elements.configConnect.addEventListener("click", async () => {
    setBusy(true, "connect");
    try {
      await connectSession({ autoDiagnose: true });
      setActiveView("configuration");
    } catch (error) {
      appendActivity(error instanceof Error ? error.message : "Erreur de connexion.", "error");
    } finally {
      setBusy(false);
      renderAll();
    }
  });

  elements.configRefresh.addEventListener("click", async () => {
    if (!state.manifest) {
      renderAll();
      return;
    }
    setBusy(true, "refresh");
    try {
      await connectSession({ autoDiagnose: true });
      appendActivity("Configuration actualisée depuis le portail.", "success");
    } catch (error) {
      appendActivity(error instanceof Error ? error.message : "Impossible d’actualiser.", "error");
    } finally {
      setBusy(false);
      renderAll();
    }
  });

  elements.configRepairAll.addEventListener("click", handleRepair);
  elements.licenseReconnect.addEventListener("click", async () => {
    if (!state.manifest) return;
    setBusy(true, "connect");
    try {
      await connectSession({ autoDiagnose: true });
    } catch (error) {
      appendActivity(error instanceof Error ? error.message : "Impossible de reconnecter la licence.", "error");
    } finally {
      setBusy(false);
      renderAll();
    }
  });
  elements.licenseViewDetail.addEventListener("click", openConfigFolder);
  elements.viewAllLogs.addEventListener("click", downloadDiagnostic);
  elements.watchVideo.addEventListener("click", async () => {
    if (elements.watchVideo.dataset.url) {
      await window.aipilotManager.openExternal(elements.watchVideo.dataset.url);
    }
  });
  elements.downloadOfficialApp.addEventListener("click", async () => {
    if (elements.downloadOfficialApp.dataset.url) {
      await window.aipilotManager.openExternal(elements.downloadOfficialApp.dataset.url);
    }
  });
  elements.checkUpdates.addEventListener("click", async () => {
    const updateState = await window.aipilotManager.checkForUpdates();
    state.updateState = updateState;
    renderAll();
  });
  elements.installUpdateSecondary.addEventListener("click", async () => {
    await window.aipilotManager.installUpdate();
  });

  function onToolChange(nextEnvironment, reconnect = true) {
    setEnvironment(nextEnvironment, { reconnectIfNeeded: reconnect });
    syncProjectRootField();
    persistState().catch(() => {});
  }

  elements.dockToolSelect.addEventListener("change", (event) => onToolChange(event.target.value));
  elements.settingsPreferredTool.addEventListener("change", (event) => onToolChange(event.target.value));
  elements.dockModelSelect.addEventListener("change", (event) => {
    state.selectedModel = event.target.value;
    renderLicenseSummary();
    renderRightPanel();
  });

  elements.dockLaunch.addEventListener("click", handleLaunch);
  elements.openConfigFolder.addEventListener("click", openConfigFolder);
  elements.quickReinstall.addEventListener("click", handleInstall);
  elements.quickRepairConfig.addEventListener("click", handleRepair);
  elements.quickResetConfig.addEventListener("click", resetConfiguration);
  elements.quickClearCache.addEventListener("click", clearCache);
  elements.quickExportDiagnostic.addEventListener("click", downloadDiagnostic);
}

async function setupUpdates() {
  state.updateState = await window.aipilotManager.configureUpdates({
    backendUrl: state.defaults.backendUrl,
  });
}

async function bootstrap() {
  loadUiState();
  applySidebarState();
  state.defaults = await window.aipilotManager.getDefaults();
  elements.versionChip.textContent = `v${state.defaults.version}`;
  elements.configLicenseKey.value = normalizeLicenseKey(state.defaults.licenseKey || "");
  elements.configProjectRoot.value = state.defaults.projectRoot || "";
  state.projectRoot = state.defaults.projectRoot || "";
  elements.dockToolSelect.value = state.defaults.environment || "t3code";
  elements.settingsPreferredTool.value = state.defaults.environment || "t3code";
  syncProjectRootField();

  bindBasicEvents();

  state.updateState = await window.aipilotManager.getUpdateState();
  await setupUpdates();
  await refreshInstallSignals();
  renderAll();
  setActiveView("configuration");

  const unsubscribeUpdateState = window.aipilotManager.onUpdateState((payload) => {
    state.updateState = payload;
    renderAll();
  });

  const unsubscribeActionLog = window.aipilotManager.onActionLog((message) => {
    appendActivity(message);
    renderAll();
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeUpdateState();
    unsubscribeActionLog();
  });

  if (elements.configLicenseKey.value) {
    setBusy(true, "connect");
    try {
      await connectSession({ autoDiagnose: true });
      await autoRefreshConfigForCurrentVersion();
    } catch (error) {
      appendActivity(error instanceof Error ? error.message : "Impossible de restaurer la session.", "error");
    } finally {
      setBusy(false);
      renderAll();
    }
  } else {
    appendActivity("AIPilot Manager est prêt. Connectez votre licence pour commencer.", "live");
  }
}

bootstrap().catch((error) => {
  console.error(error);
  appendActivity(error instanceof Error ? error.message : "Erreur inattendue au démarrage.", "error");
  renderAll();
});
