const state = {
  defaults: null,
  manifest: null,
  projectRoot: "",
  busy: false,
  autoSetupStarted: false,
  updateState: null,
  progress: null,
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
  elements.downloadOfficialApp.disabled =
    state.busy || !state.manifest?.tool?.officialAppUrl;
}

function setBusy(busy) {
  state.busy = busy;
  syncButtons();
}

async function persistState() {
  if (!state.defaults) {
    return;
  }

  await window.aipilotManager.saveState({
    backendUrl: state.defaults.backendUrl,
    licenseKey: normalizeLicenseKey(elements.licenseKey.value),
    environment: elements.environment.value,
    projectRoot: state.projectRoot,
  });
}

function badge(ok, optional) {
  if (ok) {
    return '<span class="badge badge-success">Prêt</span>';
  }

  if (optional) {
    return '<span class="badge badge-neutral">Optionnel</span>';
  }

  return '<span class="badge badge-warning">À corriger</span>';
}

function renderOverview() {
  if (!state.manifest) {
    elements.overview.innerHTML = `
      <div class="stack-list">
        <p>1. Entrez votre clé de licence pour récupérer votre configuration.</p>
        <p>2. Cliquez sur <strong>Installer et configurer</strong> pour laisser AIPilot préparer l’outil.</p>
        <p>3. En cas de souci, utilisez <strong>Réparer mon installation</strong>.</p>
      </div>
    `;
    return;
  }

  const toolLabel = state.manifest.tool.label || getSelectedToolLabel();
  const modelLabel =
    state.manifest.azure?.selectedModelLabel || state.manifest.azure?.deployment || "modèle Azure";
  const projectText = state.projectRoot
    ? `Le dossier projet sélectionné est ${escapeHtml(state.projectRoot)}.`
    : "Aucun dossier projet spécifique n’est encore choisi.";
  const supportEmail = state.manifest.manager?.supportEmail
    ? `Support: ${escapeHtml(state.manifest.manager.supportEmail)}`
    : "Support disponible via le portail AIPilot.";

  elements.overview.innerHTML = `
    <div class="stack-list">
      <p><strong>Étape suivante recommandée:</strong> cliquez sur <strong>Installer et configurer</strong> pour préparer ${escapeHtml(toolLabel)} automatiquement avec ${escapeHtml(modelLabel)}.</p>
      <p>Le modèle par défaut reste <strong>GPT-5.4</strong>, et si GPT-5.5 est configuré dans l’admin, il sera aussi disponible directement dans l’outil.</p>
      <p><strong>Réparer</strong> relance une vérification complète, remet les fichiers de configuration, la clé Azure et les réglages importants.</p>
      <p>${projectText}</p>
      <p>${supportEmail}</p>
    </div>
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
      ? '<span class="badge badge-success">Surveillance active</span>'
      : '<span class="badge badge-warning">Désactivée</span>';

  elements.updateSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Version actuelle</dt><dd>${escapeHtml(updateState.currentVersion || "-")}</dd></div>
      <div class="summary-row"><dt>Nouvelle version</dt><dd>${escapeHtml(updateState.availableVersion || "Aucune pour le moment")}</dd></div>
      <div class="summary-row"><dt>État</dt><dd>${statusBadge}<div>AIPilot Manager vérifie les mises à jour automatiquement quand la configuration est prête.</div></dd></div>
      <div class="summary-row"><dt>Source</dt><dd>${escapeHtml(updateState.updateUrl || "Non configurée")}</dd></div>
    </dl>
    ${
      updateState.error
        ? `<div class="summary-section"><h3>À vérifier</h3><div class="stack-list"><p>${escapeHtml(updateState.error)}</p></div></div>`
        : ""
    }
  `;

  syncButtons();
}

function renderDiagnostics(diagnostics) {
  if (!diagnostics) {
    elements.diagnostics.innerHTML = "<p>Aucune vérification exécutée pour le moment.</p>";
    return;
  }

  const checks = Array.isArray(diagnostics.checks) ? diagnostics.checks : [];
  const notes = Array.isArray(diagnostics.notes) ? diagnostics.notes : [];

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
        ? `<div class="summary-section"><h3>Conseils simples</h3><div class="stack-list">${notes
            .map((note) => `<p>${escapeHtml(note)}</p>`)
            .join("")}</div></div>`
        : ""
    }
  `;
}

function setProgress(progress) {
  state.progress = progress;

  if (!elements.progressStatus || !elements.progressDetail || !elements.progressBar || !elements.progressSteps) {
    return;
  }

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
      detail: "AIPilot vérifie l’état réel de votre machine et des composants nécessaires.",
      percent: 25,
      tone: "active",
      steps: [
        { label: "Préparation", text: "Lecture de la configuration", state: "done" },
        { label: "Vérification", text: "Analyse des composants", state: "active" },
        { label: "Résultat", text: "En attente", state: "pending" },
      ],
    };
  }

  return {
    status: action === "repair" ? "Réparation en cours" : "Installation en cours",
    detail: "AIPilot effectue chaque étape et vous montre exactement où il en est.",
    percent: 10,
    tone: "active",
    steps: [
      { label: "Connexion", text: "Licence et paramètres chargés", state: "done" },
      { label: "Installation", text: "Préparation des composants", state: "active" },
      { label: "Configuration", text: "En attente", state: "pending" },
      { label: "Vérification", text: "En attente", state: "pending" },
      { label: "Terminé", text: "En attente", state: "pending" },
    ],
  };
}

function updateProgressFromLog(message) {
  if (!state.progress) {
    return;
  }

  const next = JSON.parse(JSON.stringify(state.progress));
  const text = String(message || "");

  if (text.includes("Connexion de la licence") || text.includes("Licence connectée")) {
    if (next.steps[0]) {
      next.steps[0].state = "done";
      next.steps[0].text = "Licence connectée";
    }
    next.percent = Math.max(next.percent, 18);
  }

  if (text.includes("Étape 1/2") || text.includes("Préparation de l'installation") || text.includes("Installation de")) {
    if (next.steps[1]) {
      next.steps[1].state = "active";
      next.steps[1].text = "Installation des composants en cours";
    }
    next.percent = Math.max(next.percent, 38);
  }

  if (text.includes("Étape 2/2") || text.includes("Écriture de la configuration") || text.includes("Mise à jour de la variable")) {
    if (next.steps[1]) {
      next.steps[1].state = "done";
      next.steps[1].text = "Composants prêts";
    }
    if (next.steps[2]) {
      next.steps[2].state = "active";
      next.steps[2].text = "Configuration Azure en cours";
    }
    next.percent = Math.max(next.percent, 68);
  }

  if (text.includes("Vérification finale") || text.includes("Configuration prête") || text.includes("Vérification de")) {
    if (next.steps[2]) {
      next.steps[2].state = "done";
      next.steps[2].text = "Configuration écrite";
    }
    if (next.steps[3]) {
      next.steps[3].state = "active";
      next.steps[3].text = "Contrôle final en cours";
    }
    next.percent = Math.max(next.percent, 84);
  }

  if (
    text.includes("Installation et configuration terminées.") ||
    text.includes("Réparation terminée.") ||
    text.includes("Node.js et npm sont prêts.")
  ) {
    next.status = "Terminé";
    next.detail = "Votre outil est prêt. Vous pouvez maintenant l’ouvrir ou lancer une vérification.";
    next.tone = "success";
    next.percent = 100;
    next.steps = next.steps.map((step) => ({
      ...step,
      state: "done",
      text:
        step.label === "Terminé" ? "Prêt à être utilisé" : step.text === "En attente" ? "Terminé" : step.text,
    }));
  }

  if (text.includes("Erreur") || text.includes("introuvable") || text.includes("Installez d'abord")) {
    next.status = "Action interrompue";
    next.detail = text;
    next.tone = "error";
    const activeStep = next.steps.find((step) => step.state === "active");
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
    detail:
      "Le manager vous montrera ici chaque étape pendant l’installation, la vérification ou la réparation.",
    percent: 0,
    tone: "idle",
    steps: [
      { label: "Connexion", text: "En attente", state: "pending" },
      { label: "Installation", text: "En attente", state: "pending" },
      { label: "Configuration", text: "En attente", state: "pending" },
      { label: "Vérification", text: "En attente", state: "pending" },
    ],
  });
}

function renderTutorials(manifest) {
  const tutorials = Array.isArray(manifest?.manager?.tutorials)
    ? manifest.manager.tutorials
    : [];

  if (!tutorials.length) {
    elements.tutorials.innerHTML =
      "<p>Ajoutez des liens dans l’admin AIPilot pour afficher les tutoriels ici.</p>";
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
      if (!url) {
        return;
      }

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
  if (!state.manifest) {
    return;
  }

  if (logAction) {
    appendLog(`Action: ${action}`);
  }

  const result = await window.aipilotManager.runAction({
    action,
    manifest: state.manifest,
    projectRoot: state.projectRoot,
  });

  renderDiagnostics(result.diagnostics);
  renderOverview();
  if (action === "diagnose" && state.progress?.tone !== "error") {
    setProgress({
      status: "Vérification terminée",
      detail: "Le diagnostic est terminé. Consultez les éléments prêts et ceux à corriger.",
      percent: 100,
      tone: "success",
      steps: [
        { label: "Préparation", text: "Terminé", state: "done" },
        { label: "Vérification", text: "Terminé", state: "done" },
        { label: "Résultat", text: "Diagnostic disponible", state: "done" },
      ],
    });
  }
}

async function ensureNodeRuntimeReadyBeforeInstall() {
  if (!state.manifest) {
    return false;
  }

  const readiness = await window.aipilotManager.getInstallReadiness(
    state.manifest.tool.environment,
  );

  if (readiness.nodeInstalled && readiness.npmInstalled) {
    return true;
  }

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
  }

  if (!result.readiness?.nodeInstalled || !result.readiness?.npmInstalled) {
    throw new Error(
      "Node.js et npm ne sont toujours pas disponibles après l'installation automatique.",
    );
  }

  appendLog("Node.js et npm sont prêts.");
  return true;
}

async function ensureDesktopAppReadyBeforeInstall() {
  if (!state.manifest) {
    return false;
  }

  const environment = state.manifest.tool.environment;
  const desktopStatus = await window.aipilotManager.getDesktopAppStatus(environment);

  if (!desktopStatus.required || desktopStatus.installed) {
    return true;
  }

  const label = state.manifest.tool.label || environment;
  const wantsOpen = window.confirm(
    `${label} doit d'abord être installé comme application officielle avant que AIPilot ne termine la configuration.\n\nCliquez sur OK pour ouvrir la page officielle, installez l'application, puis revenez ici et cliquez à nouveau sur Installer et configurer.`,
  );

  appendLog(
    `${label} n'est pas encore installé. Installez l'application officielle puis relancez l'installation AIPilot.`,
  );

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
  renderIdleProgress();

  const initialUpdateState = await window.aipilotManager.getUpdateState();
  renderUpdateState(initialUpdateState);
  const unsubscribe = window.aipilotManager.onUpdateState(renderUpdateState);
  const unsubscribeActionLog = window.aipilotManager.onActionLog((message) => {
    appendLog(message);
    updateProgressFromLog(message);
  });
  window.addEventListener("beforeunload", () => {
    unsubscribe();
    unsubscribeActionLog();
  });

  elements.licenseKey.addEventListener("input", (event) => {
    event.target.value = normalizeLicenseKey(event.target.value);
  });

  elements.chooseFolder.addEventListener("click", async () => {
    const directory = await window.aipilotManager.pickProjectDirectory();
    if (!directory) {
      return;
    }

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
          { label: "Vérification", text: "En attente", state: "pending" },
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
      setProgress(createProgressModel("install-configure"));
      const nodeReady = await ensureNodeRuntimeReadyBeforeInstall();
      if (!nodeReady) {
        return;
      }
      const canProceed = await ensureDesktopAppReadyBeforeInstall();
      if (!canProceed) {
        return;
      }
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
    if (!target) {
      return;
    }
    await window.aipilotManager.openExternal(target);
    appendLog("Ouverture de la page officielle de téléchargement.");
  });

  elements.checkUpdates.addEventListener("click", async () => {
    setBusy(true);
    try {
      await window.aipilotManager.checkForUpdates();
      appendLog("Vérification de mise à jour lancée.");
    } catch (error) {
      appendLog(
        error instanceof Error
          ? error.message
          : "Erreur de vérification des mises à jour.",
      );
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
      appendLog(
        error instanceof Error
          ? error.message
          : "Erreur d’installation de la mise à jour.",
      );
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
    appendLog(
      error instanceof Error
        ? error.message
        : "Impossible de charger la configuration de mise à jour.",
    );
  }

  if (state.defaults.licenseKey) {
    setBusy(true);
    appendLog("Connexion automatique de la licence reçue depuis le portail...");
    try {
      await connectSession();
      if (state.defaults.autoSetup && !state.autoSetupStarted) {
        state.autoSetupStarted = true;
        setProgress(createProgressModel("install-configure"));
        const nodeReady = await ensureNodeRuntimeReadyBeforeInstall();
        const canProceed = nodeReady
          ? await ensureDesktopAppReadyBeforeInstall()
          : false;
        if (canProceed) {
          appendLog("Mode automatique: installation, configuration, puis ouverture...");
          await runManagerAction("install-configure");
          await runManagerAction("launch");
        }
      }
    } catch (error) {
      appendLog(
        error instanceof Error
          ? error.message
          : "La connexion automatique a échoué.",
      );
    } finally {
      setBusy(false);
    }
  }
}

bootstrap().catch((error) => {
  appendLog(error instanceof Error ? error.message : "Erreur de démarrage du manager.");
});
