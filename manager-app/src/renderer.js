const state = {
  defaults: null,
  manifest: null,
  projectRoot: "",
  busy: false,
  autoSetupStarted: false,
  updateState: null,
  progress: null,
  activeView: "home",
  lastDiagnostics: null,
  activity: [],
  currentAction: "",
  sidebarCollapsed: false,
};

const UI_STORAGE_KEY = "aipilot-manager-ui";

const elements = {
  appShell: document.querySelector(".app-shell"),
  versionChip: document.querySelector("#version-chip"),
  globalStatusTitle: document.querySelector("#global-status-title"),
  licenseKey: document.querySelector("#license-key"),
  environment: document.querySelector("#environment"),
  projectRoot: document.querySelector("#project-root"),
  configLicenseKey: document.querySelector("#config-license-key"),
  configEnvironment: document.querySelector("#config-environment"),
  configProjectRoot: document.querySelector("#config-project-root"),
  settingsPreferredTool: document.querySelector("#settings-preferred-tool"),
  machineList: document.querySelector("#machine-list"),
  configList: document.querySelector("#config-list"),
  configFormWrap: document.querySelector("#config-form-wrap"),
  configDetailList: document.querySelector("#config-detail-list"),
  prepList: document.querySelector("#prep-list"),
  prepDetailList: document.querySelector("#prep-detail-list"),
  prepGuidance: document.querySelector("#prep-guidance"),
  prepOperationBanner: document.querySelector("#prep-operation-banner"),
  prepOperationStatus: document.querySelector("#prep-operation-status"),
  prepOperationTitle: document.querySelector("#prep-operation-title"),
  prepOperationDetail: document.querySelector("#prep-operation-detail"),
  prepActivityFeed: document.querySelector("#prep-activity-feed"),
  issuesList: document.querySelector("#issues-list"),
  issuesCount: document.querySelector("#issues-count"),
  tutorialsList: document.querySelector("#tutorials-list"),
  tutorialsLibrary: document.querySelector("#tutorials-library"),
  updateMessage: document.querySelector("#update-message"),
  updateBannerTitle: document.querySelector("#update-banner-title"),
  updateSummary: document.querySelector("#update-summary"),
  settingsSummary: document.querySelector("#settings-summary"),
  aboutSummary: document.querySelector("#about-summary"),
  connect: document.querySelector("#connect"),
  configConnect: document.querySelector("#config-connect"),
  chooseFolder: document.querySelector("#choose-folder"),
  configChooseFolder: document.querySelector("#config-choose-folder"),
  diagnose: document.querySelector("#diagnose"),
  prepDiagnose: document.querySelector("#prep-diagnose"),
  repair: document.querySelector("#repair"),
  prepRepair: document.querySelector("#prep-repair"),
  watchVideo: document.querySelector("#watch-video"),
  downloadOfficialApp: document.querySelector("#download-official-app"),
  checkUpdates: document.querySelector("#check-updates"),
  installUpdate: document.querySelector("#install-update"),
  installUpdateSecondary: document.querySelector("#install-update-secondary"),
  dockLaunch: document.querySelector("#dock-launch"),
  prepLaunch: document.querySelector("#prep-launch"),
  dockInstall: document.querySelector("#dock-install"),
  prepInstall: document.querySelector("#prep-install"),
  dockRepair: document.querySelector("#dock-repair"),
  dockChangeTool: document.querySelector("#dock-change-tool"),
  dockToolSelect: document.querySelector("#dock-tool-select"),
  toolIcon: document.querySelector("#tool-icon"),
  toolLabel: document.querySelector("#tool-label"),
  toolStatus: document.querySelector("#tool-status"),
  launchLabel: document.querySelector("#launch-label"),
  flowLicense: document.querySelector("#flow-license"),
  flowAzure: document.querySelector("#flow-azure"),
  flowTools: document.querySelector("#flow-tools"),
  flowReady: document.querySelector("#flow-ready"),
  homeOpenDiagnostics: document.querySelector("#home-open-diagnostics"),
  homeOpenConfiguration: document.querySelector("#home-open-configuration"),
  homeRunPreparation: document.querySelector("#home-run-preparation"),
  homeOpenProblems: document.querySelector("#home-open-problems"),
  homeOpenTutorials: document.querySelector("#home-open-tutorials"),
  homeOpenUpdates: document.querySelector("#home-open-updates"),
  sidebarOpenTutorials: document.querySelector("#sidebar-open-tutorials"),
  navHome: document.querySelector("#nav-home"),
  navConfiguration: document.querySelector("#nav-configuration"),
  navPreparation: document.querySelector("#nav-preparation"),
  navDiagnostics: document.querySelector("#nav-diagnostics"),
  navTutorials: document.querySelector("#nav-tutorials"),
  navUpdates: document.querySelector("#nav-updates"),
  navSettings: document.querySelector("#nav-settings"),
  navAbout: document.querySelector("#nav-about"),
  viewHome: document.querySelector("#view-home"),
  viewConfiguration: document.querySelector("#view-configuration"),
  viewPreparation: document.querySelector("#view-preparation"),
  viewDiagnostics: document.querySelector("#view-diagnostics"),
  viewTutorials: document.querySelector("#view-tutorials"),
  viewUpdates: document.querySelector("#view-updates"),
  viewSettings: document.querySelector("#view-settings"),
  viewAbout: document.querySelector("#view-about"),
  systemHealth: document.querySelector("#system-health"),
  systemIssues: document.querySelector("#system-issues"),
  verificationChecklist: document.querySelector("#verification-checklist"),
  diagnosticsOperationBanner: document.querySelector("#diagnostics-operation-banner"),
  diagnosticsOperationStatus: document.querySelector("#diagnostics-operation-status"),
  diagnosticsOperationTitle: document.querySelector("#diagnostics-operation-title"),
  diagnosticsOperationDetail: document.querySelector("#diagnostics-operation-detail"),
  diagnosticsActivityFeed: document.querySelector("#diagnostics-activity-feed"),
  diagnostics: document.querySelector("#diagnostics"),
  windowMinimize: document.querySelector("#window-minimize"),
  windowMaximize: document.querySelector("#window-maximize"),
  windowClose: document.querySelector("#window-close"),
  helpButton: document.querySelector("#help-button"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
};

const toolLaunchLabels = {
  codex: "Lancer Codex",
  t3code: "Lancer T3 Code",
  opencode: "Lancer OpenCode",
};

const toolNameMap = {
  codex: "Codex",
  t3code: "T3 Code",
  opencode: "OpenCode",
};

const toolIconMap = {
  codex: "./assets/tool-codex.png",
  t3code: "./assets/tool-t3code.png",
  opencode: "./assets/tool-opencode.png",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendLog(message) {
  const entry = {
    time: new Date().toLocaleTimeString("fr-FR"),
    message: String(message || ""),
    tone:
      String(message || "").includes("Erreur") || String(message || "").includes("introuvable")
        ? "error"
        : String(message || "").includes("terminée") || String(message || "").includes("connectée")
          ? "success"
          : "live",
  };
  state.activity = [entry, ...state.activity].slice(0, 10);
  renderActivityFeed();
}

function loadUiState() {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) {
      return;
    }

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

function normalizeLicenseKey(value) {
  const clean = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

function getSelectedToolLabel() {
  const env = elements.environment.value || elements.configEnvironment.value;
  return toolNameMap[env] || "OpenCode";
}

function icon(name) {
  const icons = {
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m14.7 6.3 3-3" /><path d="m2 22 6-6" /><path d="m7 11 6 6" /><path d="m14 4 6 6" /></svg>',
    package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>',
  };
  return icons[name] || "";
}

function setActiveView(view) {
  state.activeView = view;
  const map = {
    home: elements.viewHome,
    configuration: elements.viewConfiguration,
    preparation: elements.viewPreparation,
    diagnostics: elements.viewDiagnostics,
    tutorials: elements.viewTutorials,
    updates: elements.viewUpdates,
    settings: elements.viewSettings,
    about: elements.viewAbout,
  };

  Object.entries(map).forEach(([key, el]) => {
    el.classList.toggle("is-active", key === view);
  });

  const navMap = {
    home: elements.navHome,
    configuration: elements.navConfiguration,
    preparation: elements.navPreparation,
    diagnostics: elements.navDiagnostics,
    tutorials: elements.navTutorials,
    updates: elements.navUpdates,
    settings: elements.navSettings,
    about: elements.navAbout,
  };

  Object.values(navMap).forEach((el) => el.classList.remove("is-active"));
  if (navMap[view]) {
    navMap[view].classList.add("is-active");
  }
}

function setFlowState(element, status) {
  element.dataset.status = status;
  const check = element.querySelector(".step-check");
  if (check) {
    check.style.display = status === "done" ? "grid" : "none";
  }
}

function syncButtons() {
  const connected = Boolean(state.manifest);
  const disabled = !connected || state.busy;

  elements.connect.disabled = state.busy;
  elements.configConnect.disabled = state.busy;
  elements.chooseFolder.disabled = state.busy;
  elements.configChooseFolder.disabled = state.busy;
  elements.diagnose.disabled = disabled;
  elements.prepDiagnose.disabled = disabled;
  elements.repair.disabled = disabled;
  elements.prepRepair.disabled = disabled;
  elements.watchVideo.disabled = disabled || !state.manifest?.manager?.supportVideoUrl;
  elements.downloadOfficialApp.disabled = state.busy || !state.manifest?.tool?.officialAppUrl;
  elements.checkUpdates.disabled = state.busy || !state.updateState?.enabled || state.updateState?.checking;
  elements.installUpdate.disabled = !state.updateState?.downloaded || state.busy;
  elements.installUpdateSecondary.disabled = !state.updateState?.downloaded || state.busy;
  elements.dockLaunch.disabled = disabled;
  elements.prepLaunch.disabled = disabled;
  elements.dockInstall.disabled = disabled;
  elements.prepInstall.disabled = disabled;
  elements.dockRepair.disabled = disabled;
  elements.homeRunPreparation.disabled = disabled;

  elements.diagnose.textContent =
    state.busy && state.currentAction === "diagnose" ? "Vérification en cours..." : "Vérifier mon installation";
  elements.prepDiagnose.textContent =
    state.busy && state.currentAction === "diagnose" ? "Vérification en cours..." : "Vérifier maintenant";
  elements.repair.textContent =
    state.busy && state.currentAction === "repair" ? "Réparation en cours..." : "Réparer automatiquement";
  elements.prepRepair.textContent =
    state.busy && state.currentAction === "repair" ? "Réparation en cours..." : "Réparer automatiquement";
  elements.dockInstall.textContent =
    state.busy && state.currentAction === "install-configure" ? "Installation en cours..." : "Installer et configurer";
  elements.prepInstall.textContent =
    state.busy && state.currentAction === "install-configure" ? "Installation en cours..." : "Installer et configurer";
}

function setBusy(busy) {
  state.busy = busy;
  syncButtons();
}

async function persistState() {
  if (!state.defaults) return;
  await window.aipilotManager.saveState({
    backendUrl: state.defaults.backendUrl,
    licenseKey: normalizeLicenseKey(elements.licenseKey.value),
    environment: elements.environment.value,
    projectRoot: state.projectRoot,
  });
}

function syncFieldMirrors(source = "main") {
  const license =
    source === "config"
      ? normalizeLicenseKey(elements.configLicenseKey.value || elements.licenseKey.value)
      : normalizeLicenseKey(elements.licenseKey.value || elements.configLicenseKey.value);
  const environment =
    source === "config"
      ? elements.configEnvironment.value || elements.environment.value || "codex"
      : elements.environment.value || elements.configEnvironment.value || "codex";
  const projectRoot = state.projectRoot || elements.projectRoot.value || elements.configProjectRoot.value || "";

  elements.licenseKey.value = license;
  elements.configLicenseKey.value = license;
  elements.environment.value = environment;
  elements.configEnvironment.value = environment;
  elements.dockToolSelect.value = environment;
  elements.settingsPreferredTool.value = environment;
  elements.projectRoot.value = projectRoot;
  elements.configProjectRoot.value = projectRoot;
}

function renderWindowStatus() {
  const connected = Boolean(state.manifest);
  elements.globalStatusTitle.textContent = connected ? "Licence connectée" : "Licence non connectée";
  const dot = document.querySelector(".license-center-dot");
  if (dot) dot.style.background = connected ? "#22C55E" : "#9CA3AF";
}

function renderActivityFeed() {
  const rows = state.activity.length
    ? state.activity
        .map(
          (item) => `
            <article class="activity-item is-${escapeHtml(item.tone)}">
              <div class="activity-item-head">
                <strong>${escapeHtml(item.tone === "error" ? "Attention" : item.tone === "success" ? "Terminé" : "En cours")}</strong>
                <span>${escapeHtml(item.time)}</span>
              </div>
              <p>${escapeHtml(item.message)}</p>
            </article>
          `,
        )
        .join("")
    : `
      <article class="activity-item">
        <div class="activity-item-head">
          <strong>Prêt</strong>
          <span>Maintenant</span>
        </div>
        <p>AIPilot Manager attend votre prochaine action.</p>
      </article>
    `;

  elements.prepActivityFeed.innerHTML = rows;
  elements.diagnosticsActivityFeed.innerHTML = rows;
}

function renderOperationState() {
  const progress = state.progress;
  const statusText =
    state.currentAction === "diagnose"
      ? "Vérification"
      : state.currentAction === "repair"
        ? "Réparation"
        : state.currentAction === "install-configure"
          ? "Installation"
          : "En attente";
  const title =
    progress?.steps?.find((step) => step.state === "active")?.label ||
    (state.currentAction ? `${statusText} en cours` : "Aucune action en cours");
  const detail =
    progress?.steps?.find((step) => step.state === "active")?.text ||
    (state.currentAction ? "Le manager est en train d'exécuter cette étape." : "AIPilot attend votre prochaine action.");
  const tone =
    state.currentAction === "diagnose" || state.currentAction === "repair" || state.currentAction === "install-configure"
      ? "live"
      : "idle";

  const badgeClass = tone === "live" ? "verification-status" : "verification-status";
  elements.prepOperationStatus.className = badgeClass;
  elements.diagnosticsOperationStatus.className = badgeClass;
  elements.prepOperationStatus.textContent = state.currentAction ? "En cours" : "En attente";
  elements.diagnosticsOperationStatus.textContent = state.currentAction ? "En cours" : "En attente";
  elements.prepOperationTitle.textContent = title;
  elements.diagnosticsOperationTitle.textContent = title;
  elements.prepOperationDetail.textContent = detail;
  elements.diagnosticsOperationDetail.textContent = detail;
}

function renderToolDock() {
  const env = elements.environment.value || state.manifest?.tool?.environment || "codex";
  const manifestMatchesSelection = state.manifest?.tool?.environment === env;
  const label = manifestMatchesSelection
    ? state.manifest?.tool?.label || toolNameMap[env]
    : toolNameMap[env];
  const iconSrc = toolIconMap[env] || toolIconMap.codex;
  elements.toolLabel.textContent = label;
  elements.toolIcon.src = iconSrc;
  elements.toolIcon.alt = `Icône ${label}`;
  elements.dockToolSelect.value = env;
  elements.launchLabel.textContent = toolLaunchLabels[env] || `Lancer ${label}`;
  const ready = manifestMatchesSelection && Boolean(state.lastDiagnostics?.overallOk);
  const status = !state.manifest
    ? "En attente"
    : manifestMatchesSelection
      ? ready
        ? "Prêt"
        : "À vérifier"
      : "À connecter";
  elements.toolStatus.textContent = status;
  elements.toolStatus.className =
    status === "Prêt" ? "tool-ready-badge" : "tool-ready-badge tool-ready-badge-warn";
}

function getRecommendationForCheck(check) {
  const label = String(check?.label || "").toLowerCase();
  if (check?.ok) return "Aucune action requise.";
  if (label.includes("node")) return "Installez ou réparez Node.js pour permettre les installations CLI.";
  if (label.includes("npm")) return "Réparer va remettre npm dans l’environnement utilisateur.";
  if (label.includes("git")) return "Configurez Git ou laissez AIPilot vous guider pour corriger ce point.";
  if (label.includes("codex")) return "Installez l’application officielle si nécessaire, puis relancez Réparer.";
  if (label.includes("opencode")) return "Réinstallez OpenCode CLI ou relancez Installer et configurer.";
  if (label.includes("azure")) return "Réécrivez les variables Azure puis relancez la vérification.";
  return "Lancez Réparer pour que le manager tente une correction automatique.";
}

function renderMachineList(diagnostics) {
  if (!diagnostics?.checks?.length) {
    elements.machineList.innerHTML = `
      <div class="machine-row">
        <div class="machine-left"><span class="machine-check">•</span><span class="machine-name">Vérification système</span></div>
        <span class="machine-version">--</span>
        <span class="status-badge-ok">En attente</span>
      </div>
    `;
    return;
  }

  const rows = diagnostics.checks.slice(0, 5).map((check) => {
    const versionMatch = String(check.details || "").match(/v?(\d+[\w.\-]*)/i);
    const version = versionMatch ? `v${versionMatch[1]}` : "--";
    return `
      <div class="machine-row">
        <div class="machine-left">
          <span class="machine-check">${check.ok ? "✓" : "!"}</span>
          <span class="machine-name">${escapeHtml(check.label)}</span>
        </div>
        <span class="machine-version">${escapeHtml(version)}</span>
        <span class="status-badge-ok">${check.ok ? "À jour" : check.optional ? "Optionnel" : "À corriger"}</span>
      </div>
    `;
  });

  elements.machineList.innerHTML = rows.join("");
}

function renderConfigList() {
  if (!state.manifest) {
    elements.configList.innerHTML = `
      <div class="config-pair">
        <span class="config-label">Portail</span>
        <span class="config-value">${escapeHtml(state.defaults?.backendUrl || "-")}</span>
      </div>
      <div class="config-pair">
        <span class="config-label">Statut</span>
        <span class="config-value">Connectez votre licence pour charger la configuration.</span>
      </div>
    `;
    elements.configFormWrap.style.display = "flex";
    elements.configDetailList.innerHTML = `
      <dl>
        <div class="summary-row"><dt>Client</dt><dd>Aucun client connecté</dd></div>
        <div class="summary-row"><dt>Licence</dt><dd>Saisissez la clé reçue après paiement</dd></div>
        <div class="summary-row"><dt>Ressource Azure</dt><dd>Chargée automatiquement après connexion</dd></div>
      </dl>
    `;
    return;
  }

  const azure = state.manifest.azure || {};
  elements.configList.innerHTML = `
    <div class="config-pair">
      <span class="config-label">Azure Tenant</span>
      <span class="config-value">${escapeHtml(`${azure.resourceName || "admin-3342-resource"}.onmicrosoft.com`)}</span>
    </div>
    <div class="config-pair">
      <span class="config-label">Subscription</span>
      <span class="config-value">Visual Studio Enterprise</span>
    </div>
    <div class="config-pair">
      <span class="config-label">Région</span>
      <span class="config-value">France Central</span>
    </div>
    <div class="config-pair">
      <span class="config-label">Modèle de configuration</span>
      <span class="config-value">
        ${escapeHtml(azure.selectedModelLabel || "AIPilot Standard")}
        <span class="active-badge">Actif</span>
      </span>
    </div>
  `;
  elements.configFormWrap.style.display = "none";

  elements.configDetailList.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Client</dt><dd>${escapeHtml(state.manifest.license?.customerName || "-")}</dd></div>
      <div class="summary-row"><dt>Licence</dt><dd>${escapeHtml(state.manifest.license?.licenseKey || elements.licenseKey.value)}</dd></div>
      <div class="summary-row"><dt>Ressource Azure</dt><dd>${escapeHtml(azure.resourceName || "-")}</dd></div>
      <div class="summary-row"><dt>Déploiement</dt><dd>${escapeHtml(azure.deployment || "-")}</dd></div>
      <div class="summary-row"><dt>Modèles disponibles</dt><dd>${escapeHtml((azure.availableModelLabels || [azure.selectedModelLabel || "GPT-5.4"]).join(", "))}</dd></div>
    </dl>
  `;
}

function renderPrepList(progress) {
  const steps = progress?.steps || [
    { label: "Installation des composants", text: "Tous les composants sont à jour", state: "pending" },
    { label: "Fichiers de configuration", text: "config.toml et autres fichiers générés", state: "pending" },
    { label: "Variables d'environnement", text: "Variables Azure configurées", state: "pending" },
    { label: "Vérifications finales", text: "Tous les contrôles sont passés", state: "pending" },
  ];

  const iconMap = ["package", "file", "zap", "checkCircle"];
  const normalized = [
    {
      label: "Installation des composants",
      text: steps[1]?.text || "Tous les composants sont à jour",
      state: steps[1]?.state || "pending",
    },
    {
      label: "Fichiers de configuration",
      text: steps[2]?.text || "config.toml et autres fichiers générés",
      state: steps[2]?.state || "pending",
    },
    {
      label: "Variables d'environnement",
      text: state.manifest ? "Variables Azure configurées" : "Variables Azure en attente",
      state: state.manifest ? "done" : "pending",
    },
    {
      label: "Vérifications finales",
      text: steps[3]?.text || "Tous les contrôles sont passés",
      state: steps[3]?.state || "pending",
    },
  ];

  elements.prepList.innerHTML = normalized
    .map(
      (step, index) => `
        <div class="prep-row">
          <span class="prep-icon">${icon(iconMap[index])}</span>
          <div class="prep-copy">
            <strong>${escapeHtml(step.label)}</strong>
            <span>${escapeHtml(step.text)}</span>
          </div>
          <span class="prep-check" style="opacity:${step.state === "done" ? "1" : step.state === "active" ? "0.7" : "0.35"}">✓</span>
        </div>
      `,
    )
    .join("");

  elements.prepDetailList.innerHTML = elements.prepList.innerHTML;
  elements.prepGuidance.innerHTML = `
    <article class="prep-guidance-card">
      <h4>Étape suivante</h4>
      <p>${state.manifest ? "Cliquez sur Installer et configurer pour préparer complètement l’outil choisi." : "Connectez d’abord votre licence pour charger le bon plan d’installation."}</p>
    </article>
    <article class="prep-guidance-card">
      <h4>Ce que fait AIPilot</h4>
      <p>Installation des composants, écriture des fichiers, configuration Azure puis vérification finale, sans vous forcer à manipuler les fichiers à la main.</p>
    </article>
    <article class="prep-guidance-card">
      <h4>Quand utiliser Réparer</h4>
      <p>Après un changement de machine, de licence, de déploiement Azure, ou si un outil semble cassé et doit être réinitialisé proprement.</p>
    </article>
  `;
  renderOperationState();
}

function getIssueAction(check) {
  const label = String(check?.label || "").toLowerCase();
  if (label.includes("git")) {
    return {
      kind: "repair",
      text: "Réparer automatiquement",
      icon: icon("wrench"),
      chevron: true,
    };
  }
  return {
    kind: "official",
    text: "Ouvrir le lien officiel",
    icon: icon("external"),
    chevron: false,
  };
}

function renderIssues(diagnostics) {
  const issues = (diagnostics?.checks || []).filter((check) => !check.ok && !check.optional);
  elements.issuesCount.textContent = String(issues.length);

  if (!issues.length) {
    elements.issuesList.innerHTML = `
      <div class="issue-row">
        <span class="issue-warning-icon">${icon("alert")}</span>
        <div class="issue-copy">
          <strong>Aucun problème critique</strong>
          <span>Votre environnement semble prêt.</span>
        </div>
      </div>
    `;
    return;
  }

  elements.issuesList.innerHTML = issues
    .slice(0, 3)
    .map((check) => {
      const action = getIssueAction(check);
      return `
        <div class="issue-row">
          <span class="issue-warning-icon">${icon("alert")}</span>
          <div class="issue-copy">
            <strong>${escapeHtml(check.label)}</strong>
            <span>${escapeHtml(check.details || "Problème détecté.")}</span>
          </div>
          <button class="issue-action" type="button" data-issue-action="${action.kind}">
            ${action.icon}
            <span>${escapeHtml(action.text)}</span>
            ${action.chevron ? icon("chevronDown") : ""}
          </button>
        </div>
      `;
    })
    .join("");

  elements.issuesList.querySelectorAll("[data-issue-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.getAttribute("data-issue-action");
      if (action === "repair") {
        await handleRepair();
        return;
      }
      if (state.manifest?.tool?.officialAppUrl) {
        await window.aipilotManager.openExternal(state.manifest.tool.officialAppUrl);
      }
    });
  });
}

function inferTutorialMeta(label, url) {
  const lowerLabel = String(label || "").toLowerCase();
  const lowerUrl = String(url || "").toLowerCase();

  if (lowerUrl.includes("youtu") || lowerLabel.includes("vidéo")) {
    return {
      tag: "Vidéo",
      subtitle: "Tutoriel pas à pas pour l’installation et la configuration.",
    };
  }

  if (lowerLabel.includes("manuel") || lowerLabel.includes("guide")) {
    return {
      tag: "Guide complet",
      subtitle: "Procédure détaillée avec configuration manuelle et vérifications.",
    };
  }

  if (lowerLabel.includes("télécharger")) {
    return {
      tag: "Téléchargement",
      subtitle: "Lien officiel vers l’outil ou l’application associée.",
    };
  }

  return {
    tag: "Tutoriel",
    subtitle: "Aide complémentaire pour finaliser l’installation.",
  };
}

function tutorialRow(label, metaLabel, subtitle) {
  return `
    <div class="tutorial-item">
      <div class="tutorial-thumb">${icon("play")}</div>
      <div class="tutorial-meta">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(metaLabel)}</span>
        <small>${escapeHtml(subtitle)}</small>
      </div>
    </div>
  `;
}

function attachTutorialOpeners(container, tutorials) {
  container.querySelectorAll("[data-tutorial-index]").forEach((node) => {
    node.addEventListener("click", async () => {
      const index = Number(node.getAttribute("data-tutorial-index"));
      const tutorial = tutorials[index];
      if (tutorial?.url) {
        await window.aipilotManager.openExternal(tutorial.url);
        appendLog(`Ouverture du tutoriel: ${tutorial.url}`);
      }
    });
  });
}

function renderTutorials(manifest) {
  const tutorials = Array.isArray(manifest?.manager?.tutorials)
    ? manifest.manager.tutorials
    : [];
  const fallbackVideo =
    manifest?.manager?.supportVideoUrl || "https://youtu.be/WwDvzdM9YWw";
  const fallbackManualGuide = `${state.defaults?.backendUrl || "http://localhost:3000"}/tuto`;
  const merged = [
    {
      label: "Téléchargement et configuration pas à pas",
      url: fallbackVideo,
    },
    {
      label: "Guide manuel AIPilot",
      url: fallbackManualGuide,
    },
    {
      label: `Télécharger ${manifest?.tool?.label || getSelectedToolLabel()}`,
      url: manifest?.tool?.officialAppUrl || "",
    },
    ...tutorials,
  ]
    .filter((item) => item.url)
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.url === item.url) === index,
    );

  elements.tutorialsList.innerHTML = merged
    .map((item, index) => {
      const meta = inferTutorialMeta(item.label, item.url);
      const row = tutorialRow(item.label, meta.tag, meta.subtitle);
      return item.url ? `<button class="tutorial-open-button" type="button" data-tutorial-index="${index}">${row}</button>` : row;
    })
    .join("");

  elements.tutorialsLibrary.innerHTML = merged.length
    ? merged
        .map(
          (tutorial, index) => `
            <button class="tutorial-open-button" type="button" data-tutorial-index="${index}">
              ${tutorialRow(
                tutorial.label || "Tutoriel",
                inferTutorialMeta(tutorial.label, tutorial.url).tag,
                inferTutorialMeta(tutorial.label, tutorial.url).subtitle,
              )}
            </button>
          `,
        )
        .join("")
    : "<p>Aucun tutoriel supplémentaire configuré pour le moment.</p>";

  attachTutorialOpeners(elements.tutorialsList, merged);
  attachTutorialOpeners(elements.tutorialsLibrary, merged);
}

function renderDiagnostics(diagnostics) {
  state.lastDiagnostics = diagnostics;
  renderMachineList(diagnostics);
  renderIssues(diagnostics);

  if (!diagnostics) {
    elements.systemHealth.innerHTML = `
      <div class="diag-health-card">
        <span>État global</span>
        <strong>En attente</strong>
        <small>Lancez une vérification pour voir le diagnostic.</small>
      </div>
    `;
    elements.systemIssues.innerHTML = "";
    elements.verificationChecklist.innerHTML = "<p>Aucune vérification exécutée pour le moment.</p>";
    elements.diagnostics.innerHTML = "<p>Aucune vérification exécutée pour le moment.</p>";
    renderOperationState();
    return;
  }

  const checks = Array.isArray(diagnostics.checks) ? diagnostics.checks : [];
  const blockingIssues = checks.filter((check) => !check.ok && !check.optional);
  const readyCount = checks.filter((check) => check.ok).length;
  const optionalCount = checks.filter((check) => !check.ok && check.optional).length;

  elements.systemHealth.innerHTML = `
    <div class="diag-health-card">
      <span>État global</span>
      <strong>${escapeHtml(diagnostics.overallOk ? "Machine prête" : "Action requise")}</strong>
      <small>${diagnostics.overallOk ? "Tous les points obligatoires sont prêts." : "Au moins un point doit être corrigé."}</small>
    </div>
    <div class="diag-health-card">
      <span>Composants prêts</span>
      <strong>${readyCount}</strong>
      <small>Éléments déjà détectés comme fonctionnels.</small>
    </div>
    <div class="diag-health-card">
      <span>Points à corriger</span>
      <strong>${blockingIssues.length}</strong>
      <small>${optionalCount ? `${optionalCount} point(s) optionnel(s) en plus.` : "Aucun point optionnel bloquant."}</small>
    </div>
  `;

  elements.systemIssues.innerHTML = blockingIssues.length
    ? blockingIssues
        .map(
          (check) => `
            <div class="issue-row">
              <span class="issue-warning-icon">${icon("alert")}</span>
              <div class="issue-copy">
                <strong>${escapeHtml(check.label)}</strong>
                <span>${escapeHtml(check.details || "Problème détecté.")}</span>
              </div>
            </div>
          `,
        )
        .join("")
    : `
        <div class="issue-row">
          <span class="issue-warning-icon">${icon("alert")}</span>
          <div class="issue-copy">
            <strong>Aucun problème critique</strong>
            <span>Tous les points obligatoires sont prêts.</span>
          </div>
        </div>
      `;

  elements.verificationChecklist.innerHTML = checks
    .map(
      (check) => `
        <article class="verification-item ${check.ok ? "is-ok" : check.optional ? "is-optional" : "is-missing"}">
          <div class="verification-item-head">
            <strong>${escapeHtml(check.label)}</strong>
            <span class="verification-status">${check.ok ? "Prêt" : check.optional ? "Optionnel" : "Manquant / À corriger"}</span>
          </div>
          <p>${escapeHtml(check.details || "Aucun détail supplémentaire.")}</p>
          <div class="verification-reco">${escapeHtml(getRecommendationForCheck(check))}</div>
        </article>
      `,
    )
    .join("");

  elements.diagnostics.innerHTML = `
    <dl>
      ${checks
        .map(
          (check) => `
            <div class="summary-row">
              <dt>${escapeHtml(check.label)}</dt>
              <dd>${check.ok ? "Prêt" : check.optional ? "Optionnel" : "À corriger"}<div>${escapeHtml(check.details || "")}</div></dd>
            </div>
          `,
        )
        .join("")}
    </dl>
  `;
  renderOperationState();
}

function renderSettingsSummary() {
  elements.settingsSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Portail</dt><dd>${escapeHtml(state.defaults?.backendUrl || "-")}</dd></div>
      <div class="summary-row"><dt>Plateforme</dt><dd>${escapeHtml(state.defaults?.platform || "-")}</dd></div>
      <div class="summary-row"><dt>Version</dt><dd>${escapeHtml(state.defaults?.version || "-")}</dd></div>
      <div class="summary-row"><dt>Outil préféré</dt><dd>${escapeHtml(getSelectedToolLabel())}</dd></div>
    </dl>
  `;
}

function renderAboutSummary() {
  elements.aboutSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Produit</dt><dd>AIPilot Manager</dd></div>
      <div class="summary-row"><dt>Mission</dt><dd>Installer, réparer et lancer les outils IA AIPilot avec un parcours simple.</dd></div>
      <div class="summary-row"><dt>Version</dt><dd>${escapeHtml(state.defaults?.version || "-")}</dd></div>
    </dl>
  `;
}

function renderOverview() {
  syncFieldMirrors();
  renderWindowStatus();
  renderToolDock();
  renderConfigList();
  renderSettingsSummary();
  renderAboutSummary();
  renderPrepList(state.progress);

  if (!state.manifest) {
    setFlowState(elements.flowLicense, "pending");
    setFlowState(elements.flowAzure, "pending");
    setFlowState(elements.flowTools, "pending");
    setFlowState(elements.flowReady, "pending");
    return;
  }

  setFlowState(elements.flowLicense, "done");
  setFlowState(elements.flowAzure, "done");
  setFlowState(elements.flowTools, state.lastDiagnostics?.overallOk ? "done" : "pending");
  setFlowState(elements.flowReady, state.lastDiagnostics?.overallOk ? "active" : "pending");
}

function renderUpdateState(updateState) {
  state.updateState = updateState;
  elements.updateMessage.textContent =
    updateState?.message || "Une nouvelle version d'AIPilot Manager est disponible.";
  elements.updateBannerTitle.textContent = updateState?.downloaded || updateState?.availableVersion ? "Mises à jour disponibles" : "Mises à jour du manager";

  if (!updateState) {
    elements.updateSummary.innerHTML = "<p>Aucune information de mise à jour.</p>";
    syncButtons();
    return;
  }

  elements.updateSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Version actuelle</dt><dd>${escapeHtml(updateState.currentVersion || "-")}</dd></div>
      <div class="summary-row"><dt>Version dispo</dt><dd>${escapeHtml(updateState.availableVersion || "Aucune")}</dd></div>
      <div class="summary-row"><dt>Canal</dt><dd>${escapeHtml(updateState.enabled ? "Actif" : "Désactivé")}</dd></div>
      <div class="summary-row"><dt>Source</dt><dd>${escapeHtml(updateState.updateUrl || "Non configurée")}</dd></div>
      ${updateState.error ? `<div class="summary-row"><dt>Erreur</dt><dd>${escapeHtml(updateState.error)}</dd></div>` : ""}
    </dl>
  `;

  syncButtons();
}

function setProgress(progress) {
  state.progress = progress;
  renderPrepList(progress);
  renderOperationState();
}

function createProgressModel(action) {
  if (action === "diagnose") {
    return {
      steps: [
        { label: "Connexion", text: "Configuration chargée", state: "done" },
        { label: "Installation des composants", text: "Aucune action", state: "pending" },
        { label: "Fichiers de configuration", text: "Aucune action", state: "pending" },
        { label: "Vérifications finales", text: "Analyse système en cours", state: "active" },
      ],
    };
  }

  return {
    steps: [
      { label: "Connexion", text: "Licence chargée", state: "done" },
      { label: "Installation des composants", text: "En attente", state: "active" },
      { label: "Fichiers de configuration", text: "En attente", state: "pending" },
      { label: "Vérifications finales", text: "En attente", state: "pending" },
    ],
  };
}

function updateProgressFromLog(message) {
  if (!state.progress) return;
  const next = JSON.parse(JSON.stringify(state.progress));
  const text = String(message || "");

  if (text.includes("Étape 1/2") || text.includes("Installation de")) {
    next.steps[1].state = "active";
    next.steps[1].text = "Composants en cours d'installation";
  }
  if (text.includes("Étape 2/2") || text.includes("Écriture de la configuration") || text.includes("Mise à jour de la variable")) {
    next.steps[1].state = "done";
    next.steps[1].text = "Tous les composants sont à jour";
    next.steps[2].state = "active";
    next.steps[2].text = "Configuration en cours d'écriture";
  }
  if (text.includes("Vérification")) {
    next.steps[3].state = "active";
    next.steps[3].text = "Contrôles finaux en cours";
  }
  if (text.includes("terminées.") || text.includes("Réparation terminée.") || text.includes("Vérification terminée")) {
    next.steps = next.steps.map((step) => ({ ...step, state: "done" }));
    next.steps[1].text = "Tous les composants sont à jour";
    next.steps[2].text = "config.toml et autres fichiers générés";
    next.steps[3].text = "Tous les contrôles sont passés";
  }
  if (text.includes("Erreur") || text.includes("introuvable") || text.includes("Installez d'abord")) {
    const active = next.steps.find((step) => step.state === "active");
    if (active) {
      active.state = "pending";
      active.text = text;
    }
  }

  setProgress(next);
}

async function connectSession({ autoDiagnose = true } = {}) {
  const backendUrl = state.defaults.backendUrl;
  const licenseKey = normalizeLicenseKey(elements.licenseKey.value);
  const environment = elements.environment.value;
  if (!licenseKey) throw new Error("Saisissez d’abord votre clé de licence.");

  elements.licenseKey.value = licenseKey;
  appendLog(`Connexion de la licence ${licenseKey}...`);

  const manifest = await window.aipilotManager.createSession({
    backendUrl,
    licenseKey,
    environment,
    projectRoot: state.projectRoot,
  });

  state.manifest = manifest;
  if (manifest.tool.environment) {
    elements.environment.value = manifest.tool.environment;
  }

  renderOverview();
  renderTutorials(manifest);
  appendLog(`Licence connectée pour ${manifest.license.customerName}.`);
  await persistState();
  syncButtons();

  if (autoDiagnose) {
    await runManagerAction("diagnose", false);
  }
}

async function applyEnvironmentPreference(nextEnvironment) {
  elements.environment.value = nextEnvironment;
  syncFieldMirrors("main");
  renderOverview();
  await persistState();

  const hasLicense = normalizeLicenseKey(elements.licenseKey.value);
  if (!hasLicense) {
    return;
  }

  setBusy(true);
  try {
    appendLog(`Changement d’outil préféré vers ${toolNameMap[nextEnvironment] || nextEnvironment}...`);
    await connectSession({ autoDiagnose: false });
    await runManagerAction("diagnose", false);
  } catch (error) {
    appendLog(error instanceof Error ? error.message : "Impossible de changer d’outil.");
  } finally {
    setBusy(false);
  }
}

async function runManagerAction(action, logAction = true) {
  if (!state.manifest) return;
  if (logAction) appendLog(`Action: ${action}`);

  const result = await window.aipilotManager.runAction({
    action,
    manifest: state.manifest,
    projectRoot: state.projectRoot,
  });

  renderDiagnostics(result.diagnostics);
  renderOverview();

  if (action === "diagnose") {
    setActiveView("diagnostics");
  }
}

async function ensureNodeRuntimeReadyBeforeInstall() {
  if (!state.manifest) return false;
  const readiness = await window.aipilotManager.getInstallReadiness(state.manifest.tool.environment);
  if (readiness.nodeInstalled && readiness.npmInstalled) return true;

  const wantsInstall = window.confirm(
    "Node.js et npm sont nécessaires pour continuer. Voulez-vous laisser AIPilot Manager les installer automatiquement maintenant ?",
  );
  if (!wantsInstall) {
    appendLog("Installation annulée: Node.js et npm sont requis.");
    return false;
  }

  appendLog("Installation automatique de Node.js et npm en cours...");
  const result = await window.aipilotManager.installNodeRuntime();
  for (const line of result.logs || []) {
    appendLog(line);
    updateProgressFromLog(line);
  }
  if (!result.readiness?.nodeInstalled || !result.readiness?.npmInstalled) {
    throw new Error("Node.js et npm ne sont toujours pas disponibles après l'installation automatique.");
  }
  appendLog("Node.js et npm sont prêts.");
  return true;
}

async function ensureDesktopAppReadyBeforeInstall() {
  if (!state.manifest) return false;
  const environment = state.manifest.tool.environment;
  const desktopStatus = await window.aipilotManager.getDesktopAppStatus(environment);
  if (!desktopStatus.required || desktopStatus.installed) return true;

  const label = state.manifest.tool.label || environment;
  const wantsOpen = window.confirm(
    `${label} doit d'abord être installé comme application officielle avant que AIPilot termine la configuration.\n\nCliquez sur OK pour ouvrir la page officielle, installez l'application, puis revenez ici et cliquez à nouveau sur Installer et configurer.`,
  );

  appendLog(`${label} n'est pas encore installé. Installez l'application officielle puis relancez l'installation AIPilot.`);
  if (wantsOpen && state.manifest.tool.officialAppUrl) {
    await window.aipilotManager.openExternal(state.manifest.tool.officialAppUrl);
    appendLog(`Ouverture de la page officielle ${label}.`);
  }

  await runManagerAction("diagnose", false);
  return false;
}

async function setupUpdates() {
  const updateState = await window.aipilotManager.configureUpdates({
    backendUrl: state.defaults.backendUrl,
  });
  renderUpdateState(updateState);
}

async function handleInstall() {
  setBusy(true);
  state.currentAction = "install-configure";
  try {
    setActiveView("preparation");
    setProgress(createProgressModel("install-configure"));
    const nodeReady = await ensureNodeRuntimeReadyBeforeInstall();
    if (!nodeReady) return;
    const canProceed = await ensureDesktopAppReadyBeforeInstall();
    if (!canProceed) return;
    await runManagerAction("install-configure");
  } catch (error) {
    updateProgressFromLog(error instanceof Error ? error.message : "Erreur d’installation.");
    appendLog(error instanceof Error ? error.message : "Erreur d’installation.");
  } finally {
    state.currentAction = "";
    renderOperationState();
    setBusy(false);
  }
}

async function handleRepair() {
  setBusy(true);
  state.currentAction = "repair";
  try {
    setActiveView("diagnostics");
    setProgress(createProgressModel("repair"));
    await runManagerAction("repair");
  } catch (error) {
    updateProgressFromLog(error instanceof Error ? error.message : "Erreur de réparation.");
    appendLog(error instanceof Error ? error.message : "Erreur de réparation.");
  } finally {
    state.currentAction = "";
    renderOperationState();
    setBusy(false);
  }
}

async function handleLaunch() {
  setBusy(true);
  try {
    await runManagerAction("launch");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : "Erreur de lancement.");
  } finally {
    setBusy(false);
  }
}

async function bootstrap() {
  loadUiState();
  applySidebarState();
  state.defaults = await window.aipilotManager.getDefaults();
  elements.versionChip.textContent = `v${state.defaults.version}`;

  if (state.defaults.licenseKey) {
    elements.licenseKey.value = normalizeLicenseKey(state.defaults.licenseKey);
    elements.configLicenseKey.value = normalizeLicenseKey(state.defaults.licenseKey);
  }
  if (state.defaults.environment) {
    elements.environment.value = state.defaults.environment;
    elements.configEnvironment.value = state.defaults.environment;
    elements.dockToolSelect.value = state.defaults.environment;
    elements.settingsPreferredTool.value = state.defaults.environment;
  }
  if (state.defaults.projectRoot) {
    state.projectRoot = state.defaults.projectRoot;
    elements.projectRoot.value = state.defaults.projectRoot;
    elements.configProjectRoot.value = state.defaults.projectRoot;
  }

  renderOverview();
  renderTutorials(null);
  renderDiagnostics(null);
  renderActivityFeed();
  renderOperationState();
  renderUpdateState(await window.aipilotManager.getUpdateState());

  const unsubscribeUpdates = window.aipilotManager.onUpdateState(renderUpdateState);
  const unsubscribeActionLog = window.aipilotManager.onActionLog((message) => {
    appendLog(message);
    updateProgressFromLog(message);
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeUpdates();
    unsubscribeActionLog();
  });

  elements.windowMinimize.addEventListener("click", () => window.aipilotManager.minimizeWindow());
  elements.windowMaximize.addEventListener("click", () => window.aipilotManager.toggleMaximizeWindow());
  elements.windowClose.addEventListener("click", () => window.aipilotManager.closeWindow());
  elements.helpButton.addEventListener("click", () => setActiveView("tutorials"));
  elements.sidebarToggle.addEventListener("click", () =>
    setSidebarCollapsed(!state.sidebarCollapsed),
  );

  elements.navHome.addEventListener("click", () => setActiveView("home"));
  elements.navConfiguration.addEventListener("click", () => setActiveView("configuration"));
  elements.navPreparation.addEventListener("click", () => setActiveView("preparation"));
  elements.navDiagnostics.addEventListener("click", () => setActiveView("diagnostics"));
  elements.navTutorials.addEventListener("click", () => setActiveView("tutorials"));
  elements.navUpdates.addEventListener("click", () => setActiveView("updates"));
  elements.navSettings.addEventListener("click", () => setActiveView("settings"));
  elements.navAbout.addEventListener("click", () => setActiveView("about"));

  elements.sidebarOpenTutorials.addEventListener("click", () => setActiveView("tutorials"));
  elements.homeOpenDiagnostics.addEventListener("click", () => setActiveView("diagnostics"));
  elements.homeOpenConfiguration.addEventListener("click", () => setActiveView("configuration"));
  elements.homeRunPreparation.addEventListener("click", handleInstall);
  elements.homeOpenProblems.addEventListener("click", () => setActiveView("diagnostics"));
  elements.homeOpenTutorials.addEventListener("click", () => setActiveView("tutorials"));
  elements.homeOpenUpdates.addEventListener("click", () => setActiveView("updates"));
  elements.dockChangeTool.addEventListener("click", () => setActiveView("configuration"));

  elements.licenseKey.addEventListener("input", (event) => {
    event.target.value = normalizeLicenseKey(event.target.value);
    syncFieldMirrors("main");
  });
  elements.configLicenseKey.addEventListener("input", (event) => {
    event.target.value = normalizeLicenseKey(event.target.value);
    syncFieldMirrors("config");
  });

  async function chooseFolderHandler() {
    const directory = await window.aipilotManager.pickProjectDirectory();
    if (!directory) return;
    state.projectRoot = directory;
    elements.projectRoot.value = directory;
    elements.configProjectRoot.value = directory;
    appendLog(`Dossier projet: ${directory}`);
    await persistState();
  }

  elements.chooseFolder.addEventListener("click", chooseFolderHandler);
  elements.configChooseFolder.addEventListener("click", chooseFolderHandler);

  async function connectHandler() {
    setBusy(true);
    try {
      setProgress(createProgressModel("install-configure"));
      await connectSession();
      setActiveView("home");
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  }

  elements.connect.addEventListener("click", connectHandler);
  elements.configConnect.addEventListener("click", connectHandler);

  elements.dockInstall.addEventListener("click", handleInstall);
  elements.prepInstall.addEventListener("click", handleInstall);
  elements.dockRepair.addEventListener("click", handleRepair);
  elements.prepRepair.addEventListener("click", handleRepair);
  elements.dockLaunch.addEventListener("click", handleLaunch);
  elements.prepLaunch.addEventListener("click", handleLaunch);
  elements.diagnose.addEventListener("click", async () => {
    setBusy(true);
    state.currentAction = "diagnose";
    renderOperationState();
    try {
      setProgress(createProgressModel("diagnose"));
      await runManagerAction("diagnose");
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de vérification.");
    } finally {
      state.currentAction = "";
      renderOperationState();
      setBusy(false);
    }
  });
  elements.prepDiagnose.addEventListener("click", async () => {
    setBusy(true);
    state.currentAction = "diagnose";
    renderOperationState();
    try {
      setProgress(createProgressModel("diagnose"));
      await runManagerAction("diagnose");
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de vérification.");
    } finally {
      state.currentAction = "";
      renderOperationState();
      setBusy(false);
    }
  });
  elements.repair.addEventListener("click", handleRepair);

  elements.watchVideo.addEventListener("click", async () => {
    if (!state.manifest?.manager?.supportVideoUrl) return;
    await window.aipilotManager.openExternal(state.manifest.manager.supportVideoUrl);
  });

  elements.downloadOfficialApp.addEventListener("click", async () => {
    if (!state.manifest?.tool?.officialAppUrl) return;
    await window.aipilotManager.openExternal(state.manifest.tool.officialAppUrl);
  });

  elements.checkUpdates.addEventListener("click", async () => {
    setBusy(true);
    try {
      await window.aipilotManager.checkForUpdates();
      appendLog("Vérification de mise à jour lancée.");
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de vérification des mises à jour.");
    } finally {
      setBusy(false);
    }
  });

  async function installPendingUpdate() {
    setBusy(true);
    try {
      appendLog("Installation de la mise à jour au redémarrage…");
      await window.aipilotManager.installUpdate();
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur d’installation de la mise à jour.");
      setBusy(false);
    }
  }

  elements.installUpdate.addEventListener("click", installPendingUpdate);
  elements.installUpdateSecondary.addEventListener("click", installPendingUpdate);

  elements.licenseKey.addEventListener("change", persistState);
  elements.environment.addEventListener("change", async (event) => {
    await applyEnvironmentPreference(event.target.value);
  });
  elements.configEnvironment.addEventListener("change", async (event) => {
    await applyEnvironmentPreference(event.target.value);
  });
  elements.dockToolSelect.addEventListener("change", async (event) => {
    await applyEnvironmentPreference(event.target.value);
  });
  elements.settingsPreferredTool.addEventListener("change", async (event) => {
    await applyEnvironmentPreference(event.target.value);
  });

  syncButtons();

  try {
    await setupUpdates();
  } catch (error) {
    appendLog(error instanceof Error ? error.message : "Impossible de charger la configuration de mise à jour.");
  }

  if (state.defaults.licenseKey) {
    setBusy(true);
    appendLog("Connexion automatique de la licence reçue depuis le portail...");
    try {
      await connectSession();
      if (state.defaults.autoSetup && !state.autoSetupStarted) {
        state.autoSetupStarted = true;
        setActiveView("preparation");
        setProgress(createProgressModel("install-configure"));
        const nodeReady = await ensureNodeRuntimeReadyBeforeInstall();
        const canProceed = nodeReady ? await ensureDesktopAppReadyBeforeInstall() : false;
        if (canProceed) {
          appendLog("Mode automatique: installation, configuration, puis ouverture...");
          await runManagerAction("install-configure");
          await runManagerAction("launch");
        }
      }
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "La connexion automatique a échoué.");
    } finally {
      setBusy(false);
    }
  }
}

bootstrap().catch((error) => {
  appendLog(error instanceof Error ? error.message : "Erreur de démarrage du manager.");
});
