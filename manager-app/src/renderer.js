const state = {
  defaults: null,
  manifest: null,
  projectRoot: "",
  busy: false,
  autoSetupStarted: false,
  updateState: null,
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
  sessionSummary: document.querySelector("#session-summary"),
  diagnostics: document.querySelector("#diagnostics"),
  setupGuidance: document.querySelector("#setup-guidance"),
  openConfigFile: document.querySelector("#open-config-file"),
  openConfigFolder: document.querySelector("#open-config-folder"),
  downloadOfficialApp: document.querySelector("#download-official-app"),
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
  const setup = state.manifest?.setup || null;

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
  elements.openConfigFile.disabled = state.busy || !setup?.primaryConfigPath;
  elements.openConfigFolder.disabled = state.busy || !setup?.configDirectoryPath;
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
  const projectText = state.projectRoot
    ? `Le dossier projet sélectionné est ${escapeHtml(state.projectRoot)}.`
    : "Aucun dossier projet spécifique n’est encore choisi.";
  const supportEmail = state.manifest.manager?.supportEmail
    ? `Support: ${escapeHtml(state.manifest.manager.supportEmail)}`
    : "Support disponible via le portail AIPilot.";

  elements.overview.innerHTML = `
    <div class="stack-list">
      <p><strong>Étape suivante recommandée:</strong> cliquez sur <strong>Installer et configurer</strong> pour préparer ${escapeHtml(toolLabel)} automatiquement.</p>
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

function renderSessionSummary(manifest) {
  if (!manifest) {
    elements.sessionSummary.innerHTML = "<p>Connectez une licence pour voir le résumé.</p>";
    return;
  }

  const notes = Array.isArray(manifest.tool.notes) ? manifest.tool.notes : [];

  elements.sessionSummary.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Client</dt><dd>${escapeHtml(manifest.license.customerName)}</dd></div>
      <div class="summary-row"><dt>Licence</dt><dd>${escapeHtml(manifest.license.key)}</dd></div>
      <div class="summary-row"><dt>Outil choisi</dt><dd>${escapeHtml(manifest.tool.label || manifest.tool.environment)}</dd></div>
      <div class="summary-row"><dt>Ressource Azure</dt><dd>${escapeHtml(manifest.azure.resourceName)}</dd></div>
      <div class="summary-row"><dt>Déploiement Azure</dt><dd>${escapeHtml(manifest.azure.deployment)}</dd></div>
    </dl>
    ${
      notes.length
        ? `<div class="summary-section"><h3>Informations utiles</h3><div class="stack-list">${notes
            .map((note) => `<p>${escapeHtml(note)}</p>`)
            .join("")}</div></div>`
        : ""
    }
  `;
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

function renderSetupGuidance(manifest) {
  if (!manifest?.setup) {
    elements.setupGuidance.innerHTML =
      "<p>Installez ou réparez un outil pour afficher les fichiers de configuration.</p>";
    syncButtons();
    return;
  }

  const setup = manifest.setup;
  const notes = Array.isArray(setup.nextSteps) ? setup.nextSteps : [];

  elements.setupGuidance.innerHTML = `
    <dl>
      <div class="summary-row"><dt>Fichier principal</dt><dd>${escapeHtml(setup.primaryConfigPath || "Aucun")}</dd></div>
      <div class="summary-row"><dt>Dossier config</dt><dd>${escapeHtml(setup.configDirectoryPath || "Aucun")}</dd></div>
      <div class="summary-row"><dt>Ce que cela veut dire</dt><dd>${escapeHtml(setup.prompt || "")}</dd></div>
    </dl>
    ${
      notes.length
        ? `<div class="summary-section"><h3>Prochaines étapes</h3><div class="stack-list">${notes
            .map((note) => `<p>${escapeHtml(note)}</p>`)
            .join("")}</div></div>`
        : ""
    }
  `;

  syncButtons();
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
  renderSessionSummary(manifest);
  renderSetupGuidance(manifest);
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
  renderSetupGuidance(null);
  renderTutorials(null);

  const initialUpdateState = await window.aipilotManager.getUpdateState();
  renderUpdateState(initialUpdateState);
  const unsubscribe = window.aipilotManager.onUpdateState(renderUpdateState);
  const unsubscribeActionLog = window.aipilotManager.onActionLog((message) => {
    appendLog(message);
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
      await connectSession();
    } catch (error) {
      appendLog(error instanceof Error ? error.message : "Erreur de connexion.");
    } finally {
      setBusy(false);
    }
  });

  elements.installConfigure.addEventListener("click", async () => {
    setBusy(true);
    try {
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
      appendLog(error instanceof Error ? error.message : "Erreur d’installation.");
    } finally {
      setBusy(false);
    }
  });

  elements.repair.addEventListener("click", async () => {
    setBusy(true);
    try {
      await runManagerAction("repair");
    } catch (error) {
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
      await runManagerAction("diagnose");
    } catch (error) {
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

  elements.openConfigFile.addEventListener("click", async () => {
    const target = state.manifest?.setup?.primaryConfigPath;
    if (!target) {
      return;
    }
    await window.aipilotManager.openPath(target);
    appendLog(`Ouverture du fichier de configuration: ${target}`);
  });

  elements.openConfigFolder.addEventListener("click", async () => {
    const target = state.manifest?.setup?.configDirectoryPath;
    if (!target) {
      return;
    }
    await window.aipilotManager.openPath(target);
    appendLog(`Ouverture du dossier de configuration: ${target}`);
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
