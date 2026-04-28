const state = {
  defaults: null,
  manifest: null,
  projectRoot: "",
  busy: false,
  autoSetupStarted: false,
  updateState: null,
  progress: null,
  activeTab: "main",
};

const elements = {
  licenseKey: document.querySelector("#license-key"),
  environment: document.querySelector("#environment"),
  projectRoot: document.querySelector("#project-root"),
  platformChip: document.querySelector("#platform-chip"),
  versionChip: document.querySelector("#version-chip"),
  portalText: document.querySelector("#portal-text"),
  overview: document.querySelector("#overview"),
  tutorials: document.querySelector("#tutorials"),
  updateMessage: document.querySelector("#update-message"),
  updateSummary: document.querySelector("#update-summary"),
  connect: document.querySelector("#connect"),
  chooseFolder: document.querySelector("#choose-folder"),
  diagnose: document.querySelector("#diagnose"),
  installConfigure: document.querySelector("#install-configure"),
  repair: document.querySelector("#repair"),
  launch: document.querySelector("#launch"),
  watchVideo: document.querySelector("#watch-video"),
  checkUpdates: document.querySelector("#check-updates"),
  installUpdate: document.querySelector("#install-update"),
  diagnostics: document.querySelector("#diagnostics"),
  downloadOfficialApp: document.querySelector("#download-official-app"),
  progressStatus: document.querySelector("#progress-status"),
  progressDetail: document.querySelector("#progress-detail"),
  progressBar: document.querySelector("#progress-bar"),
  progressSteps: document.querySelector("#progress-steps"),
  systemHealth: document.querySelector("#system-health"),
  systemIssues: document.querySelector("#system-issues"),
  tabMain: document.querySelector("#tab-main"),
  tabSystem: document.querySelector("#tab-system"),
  panelMain: document.querySelector("#panel-main"),
  panelSystem: document.querySelector("#panel-system"),
  logs: document.querySelector("#logs"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString("fr-FR");
  elements.logs.textContent += `\n[${timestamp}] ${message}`;
  elements.logs.scrollTop = elements.logs.scrollHeight;
}

function normalizeLicenseKey(value) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

function getSelectedToolLabel() {
  const value = elements.environment.value;
  if (value === "codex") return "Codex";
  if (value === "t3code") return "T3 Code";
  return "OpenCode";
}

function badge(ok, optional) {
  if (ok) return '<span class="badge badge-success">Prêt</span>';
  if (optional) return '<span class="badge badge-neutral">Optionnel</span>';
  return '<span class="badge badge-warning">À corriger</span>';
}

function setActiveTab(tab) {
  state.activeTab = tab;
  const isMain = tab === "main";
  elements.tabMain.classList.toggle("is-active", isMain);
  elements.tabSystem.classList.toggle("is-active", !isMain);
  elements.panelMain.classList.toggle("is-active", isMain);
  elements.panelSystem.classList.toggle("is-active", !isMain);
}

function syncButtons() {
  const connected = Boolean(state.manifest);
  const disabled = !connected || state.busy;

  elements.connect.disabled = state.busy;
  elements.chooseFolder.disabled = state.busy;
  elements.diagnose.disabled = disabled;
  elements.installConfigure.disabled = disabled;
  elements.repair.disabled = disabled;
  elements.launch.disabled = disabled;
  elements.watchVideo.disabled = disabled || !state.manifest?.manager?.supportVideoUrl;
  elements.checkUpdates.disabled =
    state.busy || !state.updateState?.enabled || state.updateState?.checking;
  elements.installUpdate.disabled = !state.updateState?.downloaded || state.busy;
  elements.downloadOfficialApp.disabled = state.busy || !state.manifest?.tool?.officialAppUrl;
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

function renderOverview() {
  if (!state.manifest) {
    elements.overview.innerHTML = `
      <p><strong>Commencez ici :</strong> connectez votre licence pour charger votre configuration AIPilot.</p>
      <p>Ensuite, cliquez sur <strong>Installer et configurer</strong>. Si quelque chose bloque, passez à l’onglet <strong>Vérification système</strong>.</p>
    `;
    return;
  }

  const toolLabel = state.manifest.tool.label || getSelectedToolLabel();
  const deployment = state.manifest.azure?.deployment || "-";
  const modelLabel = state.manifest.azure?.selectedModelLabel || "GPT-5.4";
  const customerName = state.manifest.license?.customerName || "client";
  const projectText = state.projectRoot
    ? `Le dossier projet sélectionné est <strong>${escapeHtml(state.projectRoot)}</strong>.`
    : "Aucun dossier projet spécifique n’est encore choisi.";

  elements.overview.innerHTML = `
    <p><strong>${escapeHtml(customerName)}</strong>, votre configuration AIPilot est prête pour <strong>${escapeHtml(toolLabel)}</strong>.</p>
    <p>Le déploiement Azure actif est <strong>${escapeHtml(deployment)}</strong> et le modèle par défaut reste <strong>${escapeHtml(modelLabel)}</strong>.</p>
    <p>${projectText}</p>
    <p>Le bouton <strong>Installer et configurer</strong> prépare automatiquement l’outil. Si un élément manque sur votre machine, l’onglet <strong>Vérification système</strong> vous dira exactement quoi corriger.</p>
  `;
}

function renderUpdateState(updateState) {
  state.updateState = updateState;
  elements.updateMessage.textContent =
    updateState?.message || "Les mises à jour automatiques ne sont pas encore prêtes.";

  if (!updateState) {
    elements.updateSummary.innerHTML = "<p>Aucune information de mise à jour.</p>";
    syncButtons();
    return;
  }

  const statusBadge = updateState.downloaded
    ? '<span class="badge badge-success">Prête à installer</span>'
    : updateState.enabled
      ? '<span class="badge badge-success">Active</span>'
      : '<span class="badge badge-warning">Désactivée</span>';

  elements.updateSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Version actuelle</dt><dd>${escapeHtml(updateState.currentVersion || "-")}</dd></div>
      <div class="summary-row"><dt>Nouvelle version</dt><dd>${escapeHtml(updateState.availableVersion || "Aucune")}</dd></div>
      <div class="summary-row"><dt>État</dt><dd>${statusBadge}<div>Le manager vérifie les nouvelles versions automatiquement.</div></dd></div>
      <div class="summary-row"><dt>Source</dt><dd>${escapeHtml(updateState.updateUrl || "Non configurée")}</dd></div>
    </dl>
    ${
      updateState.error
        ? `<div class="summary-row" style="margin-top:10px;"><dt>Problème</dt><dd>${escapeHtml(updateState.error)}</dd></div>`
        : ""
    }
  `;

  syncButtons();
}

function getFixHint(check) {
  const label = String(check?.label || "").toLowerCase();
  const details = String(check?.details || "");

  if (label.includes("node")) {
    return "Node.js doit être présent pour installer ou réparer le CLI. Cliquez sur Réparer pour laisser AIPilot tenter l’installation automatique.";
  }

  if (label.includes("npm")) {
    return "npm manque ou n’est pas visible dans le PATH. Réparer va revérifier Node.js et remettre l’environnement en place.";
  }

  if (label.includes("app codex")) {
    return "Installez d’abord l’application Codex officielle, ouvrez-la une première fois, puis revenez dans AIPilot Manager.";
  }

  if (label.includes("app t3")) {
    return "Installez d’abord T3 Code depuis son site officiel, ouvrez-le une première fois, puis revenez dans AIPilot Manager.";
  }

  if (label.includes("commande codex")) {
    return "Le CLI Codex n’est pas prêt. Réparer va tenter de l’installer puis de réécrire la configuration Azure.";
  }

  if (label.includes("configuration codex")) {
    return `Le fichier config.toml n’est pas prêt. Réparer va tenter de le recréer dans ${escapeHtml(details)}.`;
  }

  if (label.includes("opencode")) {
    return "Réparer va réinstaller le CLI OpenCode si nécessaire et réécrire les fichiers de configuration Azure.";
  }

  if (label.includes("variables azure")) {
    return "Les variables Azure sont absentes ou incomplètes. Réparer va les remettre pour l’utilisateur, puis tenter aussi le niveau machine sur Windows.";
  }

  if (label.includes("t3")) {
    return "Réparer va revérifier T3 Code, Codex CLI et réinjecter le modèle Azure dans les réglages T3.";
  }

  return "Lancez Réparer pour que le manager revérifie ce point et applique la correction automatiquement si possible.";
}

function renderDiagnostics(diagnostics) {
  if (!diagnostics) {
    elements.systemHealth.innerHTML = `
      <article class="health-card">
        <span>État global</span>
        <strong>En attente</strong>
        <small>Lancez une vérification pour afficher le diagnostic.</small>
      </article>
    `;
    elements.systemIssues.innerHTML = `
      <article class="issue-card issue-card-muted">
        <div>
          <strong>Aucun diagnostic exécuté</strong>
          <p>Lancez “Vérifier mon installation” pour voir les problèmes et les corrections recommandées.</p>
        </div>
      </article>
    `;
    elements.diagnostics.innerHTML = "<p>Aucune vérification exécutée pour le moment.</p>";
    return;
  }

  const checks = Array.isArray(diagnostics.checks) ? diagnostics.checks : [];
  const notes = Array.isArray(diagnostics.notes) ? diagnostics.notes : [];
  const blockingIssues = checks.filter((check) => !check.ok && !check.optional);
  const readyCount = checks.filter((check) => check.ok).length;
  const optionalCount = checks.filter((check) => !check.ok && check.optional).length;
  const overallLabel = diagnostics.overallOk ? "Machine prête" : "Action requise";

  elements.systemHealth.innerHTML = `
    <article class="health-card">
      <span>État global</span>
      <strong>${escapeHtml(overallLabel)}</strong>
      <small>${diagnostics.overallOk ? "Tous les points obligatoires sont prêts." : "Au moins un point doit être réparé."}</small>
    </article>
    <article class="health-card">
      <span>Composants prêts</span>
      <strong>${readyCount}</strong>
      <small>Éléments déjà détectés comme fonctionnels.</small>
    </article>
    <article class="health-card">
      <span>Points à corriger</span>
      <strong>${blockingIssues.length}</strong>
      <small>${optionalCount ? `${optionalCount} point(s) optionnel(s) en plus.` : "Aucun point optionnel bloquant."}</small>
    </article>
  `;

  if (!blockingIssues.length) {
    elements.systemIssues.innerHTML = `
      <article class="issue-card issue-card-ok">
        <div>
          <strong>Votre installation semble correcte</strong>
          <p>Tous les points obligatoires sont prêts. Vous pouvez lancer l’outil ou relancer Réparer si vous avez changé de licence ou de déploiement Azure.</p>
        </div>
      </article>
    `;
  } else {
    elements.systemIssues.innerHTML = blockingIssues
      .map(
        (check) => `
          <article class="issue-card">
            <div>
              <strong>${escapeHtml(check.label)}</strong>
              <p>${escapeHtml(check.details || "Problème détecté")}</p>
            </div>
            <p>${getFixHint(check)}</p>
          </article>
        `,
      )
      .join("");
  }

  elements.diagnostics.innerHTML = `
    <dl>
      ${checks
        .map(
          (check) => `
            <div class="summary-row">
              <dt>${escapeHtml(check.label)}</dt>
              <dd>${badge(check.ok, check.optional)}<div>${escapeHtml(check.details || "")}</div></dd>
            </div>
          `,
        )
        .join("")}
    </dl>
    ${
      notes.length
        ? `<div class="summary-block">${notes
            .map((note) => `<p>${escapeHtml(note)}</p>`)
            .join("")}</div>`
        : ""
    }
  `;
}

function setProgress(progress) {
  state.progress = progress;

  const toneClass =
    progress.tone === "success"
      ? "badge badge-success"
      : progress.tone === "error"
        ? "badge badge-warning"
        : progress.tone === "active"
          ? "badge badge-success"
          : "badge badge-neutral";

  elements.progressStatus.className = toneClass;
  elements.progressStatus.textContent = progress.status;
  elements.progressDetail.textContent = progress.detail;
  elements.progressBar.style.width = `${Math.max(0, Math.min(progress.percent || 0, 100))}%`;
  elements.progressSteps.innerHTML = (progress.steps || [])
    .map((step) => {
      const className =
        step.state === "done"
          ? "progress-step is-done"
          : step.state === "active"
            ? "progress-step is-active"
            : step.state === "error"
              ? "progress-step is-error"
              : "progress-step";

      return `
        <div class="${className}">
          <strong>${escapeHtml(step.label)}</strong>
          <span>${escapeHtml(step.text)}</span>
        </div>
      `;
    })
    .join("");
}

function createProgressModel(action) {
  if (action === "diagnose") {
    return {
      status: "Vérification en cours",
      detail: "AIPilot contrôle votre machine et repère les composants à réparer.",
      percent: 22,
      tone: "active",
      steps: [
        { label: "Connexion", text: "Configuration chargée", state: "done" },
        { label: "Installation", text: "Aucune action", state: "pending" },
        { label: "Configuration", text: "Aucune action", state: "pending" },
        { label: "Diagnostic", text: "Analyse système en cours", state: "active" },
      ],
    };
  }

  return {
    status: action === "repair" ? "Réparation en cours" : "Installation en cours",
    detail: "AIPilot exécute les étapes une par une et vous affiche sa progression.",
    percent: 10,
    tone: "active",
    steps: [
      { label: "Connexion", text: "Licence chargée", state: "done" },
      { label: "Installation", text: "En attente", state: "active" },
      { label: "Configuration", text: "En attente", state: "pending" },
      { label: "Diagnostic", text: "En attente", state: "pending" },
    ],
  };
}

function updateProgressFromLog(message) {
  if (!state.progress) return;

  const next = JSON.parse(JSON.stringify(state.progress));
  const text = String(message || "");

  if (text.includes("Connexion de la licence") || text.includes("Licence connectée")) {
    next.steps[0].state = "done";
    next.steps[0].text = "Licence connectée";
    next.percent = Math.max(next.percent, 18);
  }

  if (text.includes("Étape 1/2") || text.includes("Préparation de l'installation") || text.includes("Installation de")) {
    next.steps[1].state = "active";
    next.steps[1].text = "Installation des composants";
    next.percent = Math.max(next.percent, 40);
  }

  if (text.includes("Étape 2/2") || text.includes("Écriture de la configuration") || text.includes("Mise à jour de la variable")) {
    next.steps[1].state = "done";
    next.steps[1].text = "Composants prêts";
    next.steps[2].state = "active";
    next.steps[2].text = "Configuration Azure en cours";
    next.percent = Math.max(next.percent, 72);
  }

  if (text.includes("Vérification finale") || text.includes("Configuration prête") || text.includes("Vérification de")) {
    next.steps[2].state = "done";
    next.steps[2].text = "Configuration écrite";
    next.steps[3].state = "active";
    next.steps[3].text = "Contrôle final";
    next.percent = Math.max(next.percent, 88);
  }

  if (text.includes("Installation et configuration terminées.") || text.includes("Réparation terminée.") || text.includes("Vérification terminée")) {
    next.status = "Terminé";
    next.detail = "L’action est terminée. Consultez la vérification système si vous voulez voir le détail.";
    next.tone = "success";
    next.percent = 100;
    next.steps = next.steps.map((step) => ({
      ...step,
      state: "done",
      text: step.text === "En attente" ? "Terminé" : step.text,
    }));
  }

  if (text.includes("Erreur") || text.includes("introuvable") || text.includes("Installez d'abord")) {
    next.status = "Action interrompue";
    next.detail = text;
    next.tone = "error";
    const activeStep = next.steps.find((step) => step.state === "active") || next.steps[next.steps.length - 1];
    if (activeStep) {
      activeStep.state = "error";
      activeStep.text = text;
    }
  }

  setProgress(next);
}

function renderIdleProgress() {
  setProgress({
    status: "En attente",
    detail: "Aucune action en cours pour le moment.",
    percent: 0,
    tone: "idle",
    steps: [
      { label: "Connexion", text: "En attente", state: "pending" },
      { label: "Installation", text: "En attente", state: "pending" },
      { label: "Configuration", text: "En attente", state: "pending" },
      { label: "Diagnostic", text: "En attente", state: "pending" },
    ],
  });
}

function renderTutorials(manifest) {
  const tutorials = Array.isArray(manifest?.manager?.tutorials) ? manifest.manager.tutorials : [];

  if (!tutorials.length) {
    elements.tutorials.innerHTML = "<p>Ajoutez des liens dans l’admin AIPilot pour afficher les tutoriels ici.</p>";
    return;
  }

  elements.tutorials.innerHTML = `
    <div class="tutorial-grid">
      ${tutorials
        .map(
          (tutorial) => `
            <article class="tutorial-card">
              <div class="tutorial-copy">
                <strong>${escapeHtml(tutorial.label || "Tutoriel")}</strong>
                <span>${escapeHtml(tutorial.url || "")}</span>
              </div>
              <a class="tutorial-link" href="${escapeHtml(tutorial.url || "#")}" data-open-external="${escapeHtml(tutorial.url || "")}">
                Ouvrir
              </a>
            </article>
          `,
        )
        .join("")}
    </div>
  `;

  elements.tutorials.querySelectorAll("[data-open-external]").forEach((anchor) => {
    anchor.addEventListener("click", async (event) => {
      event.preventDefault();
      const url = anchor.getAttribute("data-open-external");
      if (!url) return;
      await window.aipilotManager.openExternal(url);
      appendLog(`Ouverture du tutoriel: ${url}`);
    });
  });
}

async function connectSession({ autoDiagnose = true } = {}) {
  const backendUrl = state.defaults.backendUrl;
  const licenseKey = normalizeLicenseKey(elements.licenseKey.value);
  const environment = elements.environment.value;

  if (!licenseKey) {
    throw new Error("Saisissez d’abord votre clé de licence.");
  }

  elements.licenseKey.value = licenseKey;
  appendLog(`Connexion de la licence ${licenseKey || "(vide)"}...`);

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
    setActiveTab("system");
    if (state.progress?.tone !== "error") {
      setProgress({
        status: "Vérification terminée",
        detail: "Le diagnostic est prêt. Consultez les points à corriger ci-dessous.",
        percent: 100,
        tone: "success",
        steps: [
          { label: "Connexion", text: "Terminé", state: "done" },
          { label: "Installation", text: "Aucune action", state: "done" },
          { label: "Configuration", text: "Aucune action", state: "done" },
          { label: "Diagnostic", text: "Diagnostic disponible", state: "done" },
        ],
      });
    }
  }

  if (action === "repair") {
    setActiveTab("system");
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

  if (!desktopStatus.required || desktopStatus.installed) {
    return true;
  }

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

async function bootstrap() {
  state.defaults = await window.aipilotManager.getDefaults();
  elements.platformChip.textContent = `Plateforme ${state.defaults.platform}`;
  elements.versionChip.textContent = `v${state.defaults.version}`;
  elements.portalText.textContent = `Portail: ${state.defaults.backendUrl}`;

  if (state.defaults.licenseKey) {
    elements.licenseKey.value = normalizeLicenseKey(state.defaults.licenseKey);
  }
  if (state.defaults.environment) {
    elements.environment.value = state.defaults.environment;
  }
  if (state.defaults.projectRoot) {
    state.projectRoot = state.defaults.projectRoot;
    elements.projectRoot.value = state.defaults.projectRoot;
  }

  renderOverview();
  renderTutorials(null);
  renderDiagnostics(null);
  renderIdleProgress();

  const initialUpdateState = await window.aipilotManager.getUpdateState();
  renderUpdateState(initialUpdateState);

  const unsubscribeUpdates = window.aipilotManager.onUpdateState(renderUpdateState);
  const unsubscribeActionLog = window.aipilotManager.onActionLog((message) => {
    appendLog(message);
    updateProgressFromLog(message);
  });

  window.addEventListener("beforeunload", () => {
    unsubscribeUpdates();
    unsubscribeActionLog();
  });

  elements.tabMain.addEventListener("click", () => setActiveTab("main"));
  elements.tabSystem.addEventListener("click", () => setActiveTab("system"));

  elements.licenseKey.addEventListener("input", (event) => {
    event.target.value = normalizeLicenseKey(event.target.value);
  });

  elements.chooseFolder.addEventListener("click", async () => {
    const directory = await window.aipilotManager.pickProjectDirectory();
    if (!directory) return;
    state.projectRoot = directory;
    elements.projectRoot.value = directory;
    appendLog(`Dossier projet: ${directory}`);
    renderOverview();
    await persistState();
  });

  elements.connect.addEventListener("click", async () => {
    setBusy(true);
    try {
      setProgress({
        status: "Connexion en cours",
        detail: "AIPilot vérifie votre licence et charge la configuration recommandée.",
        percent: 12,
        tone: "active",
        steps: [
          { label: "Connexion", text: "Vérification de la licence", state: "active" },
          { label: "Installation", text: "En attente", state: "pending" },
          { label: "Configuration", text: "En attente", state: "pending" },
          { label: "Diagnostic", text: "En attente", state: "pending" },
        ],
      });
      await connectSession();
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de connexion.");
      updateProgressFromLog(error instanceof Error ? error.message : "Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  });

  elements.installConfigure.addEventListener("click", async () => {
    setBusy(true);
    try {
      setActiveTab("main");
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
      setBusy(false);
    }
  });

  elements.repair.addEventListener("click", async () => {
    setBusy(true);
    try {
      setActiveTab("system");
      setProgress(createProgressModel("repair"));
      await runManagerAction("repair");
    } catch (error) {
      updateProgressFromLog(error instanceof Error ? error.message : "Erreur de réparation.");
      appendLog(error instanceof Error ? error.message : "Erreur de réparation.");
    } finally {
      setBusy(false);
    }
  });

  elements.launch.addEventListener("click", async () => {
    setBusy(true);
    try {
      await runManagerAction("launch");
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de lancement.");
    } finally {
      setBusy(false);
    }
  });

  elements.diagnose.addEventListener("click", async () => {
    setBusy(true);
    try {
      setActiveTab("system");
      setProgress(createProgressModel("diagnose"));
      await runManagerAction("diagnose");
    } catch (error) {
      updateProgressFromLog(error instanceof Error ? error.message : "Erreur de vérification.");
      appendLog(error instanceof Error ? error.message : "Erreur de vérification.");
    } finally {
      setBusy(false);
    }
  });

  elements.watchVideo.addEventListener("click", async () => {
    if (!state.manifest?.manager.supportVideoUrl) {
      appendLog("Aucune vidéo principale n'est configurée.");
      return;
    }
    await window.aipilotManager.openExternal(state.manifest.manager.supportVideoUrl);
    appendLog("Ouverture de la vidéo d’aide.");
  });

  elements.downloadOfficialApp.addEventListener("click", async () => {
    const target = state.manifest?.tool?.officialAppUrl;
    if (!target) return;
    await window.aipilotManager.openExternal(target);
    appendLog("Ouverture de la page officielle de téléchargement.");
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

  elements.installUpdate.addEventListener("click", async () => {
    setBusy(true);
    try {
      appendLog("Installation de la mise à jour au redémarrage…");
      await window.aipilotManager.installUpdate();
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur d’installation de la mise à jour.");
      setBusy(false);
    }
  });

  elements.licenseKey.addEventListener("change", persistState);
  elements.environment.addEventListener("change", async () => {
    renderOverview();
    await persistState();
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
        setActiveTab("main");
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
