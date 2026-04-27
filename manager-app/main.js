const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const PRODUCTION_BACKEND_URL = "https://ai-pilot-ten.vercel.app";

function readCliArg(flag) {
  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  const flagIndex = args.indexOf(flag);
  if (flagIndex === -1) {
    return "";
  }

  return args[flagIndex + 1] ?? "";
}

function hasCliFlag(flag) {
  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  return args.includes(flag);
}

const DEFAULT_LICENSE_KEY =
  readCliArg("--license-key") || process.env.AIPILOT_MANAGER_DEFAULT_LICENSE_KEY || "";
const DEFAULT_ENVIRONMENT =
  readCliArg("--environment") ||
  process.env.AIPILOT_MANAGER_DEFAULT_ENVIRONMENT ||
  "opencode";
const DEFAULT_AUTO_SETUP =
  hasCliFlag("--auto-setup") || process.env.AIPILOT_MANAGER_AUTO_SETUP === "1";
const PLATFORM_KEY =
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "macos"
      : "linux";

let mainWindow = null;
let updatesConfigured = false;
let updatesAutoChecked = false;
let persistedState = null;

const updateState = {
  enabled: false,
  configured: false,
  checking: false,
  downloading: false,
  downloaded: false,
  currentVersion: app.getVersion(),
  availableVersion: "",
  updateUrl: "",
  message: "Mises à jour non configurées.",
  error: "",
};

function getStatePath() {
  return path.join(app.getPath("userData"), "manager-state.json");
}

async function loadPersistedState() {
  if (persistedState) {
    return persistedState;
  }

  try {
    const raw = await fs.readFile(getStatePath(), "utf8");
    persistedState = JSON.parse(raw);
  } catch {
    persistedState = {};
  }

  return persistedState;
}

async function savePersistedState(patch) {
  const current = await loadPersistedState();
  persistedState = { ...current, ...patch };
  await writeFileWithDirs(getStatePath(), `${JSON.stringify(persistedState, null, 2)}\n`);
  return persistedState;
}

function normalizeBackendUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

async function getEffectiveDefaults() {
  const saved = await loadPersistedState();
  const backendUrl =
    normalizeBackendUrl(readCliArg("--backend-url")) ||
    normalizeBackendUrl(process.env.AIPILOT_MANAGER_BACKEND_URL) ||
    normalizeBackendUrl(saved.backendUrl) ||
    PRODUCTION_BACKEND_URL;

  const licenseKey =
    DEFAULT_LICENSE_KEY || String(saved.licenseKey ?? "");
  const environment =
    DEFAULT_ENVIRONMENT || String(saved.environment ?? "opencode");
  const projectRoot = String(saved.projectRoot ?? "");

  return {
    backendUrl,
    licenseKey,
    environment,
    projectRoot,
    autoSetup: DEFAULT_AUTO_SETUP,
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 920,
    minHeight: 680,
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "build", "icon.png"),
    title: "AIPilot Manager",
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

function broadcastUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("manager:update-state", updateState);
  }
}

function setUpdateState(patch) {
  Object.assign(updateState, patch);
  broadcastUpdateState();
}

function initAutoUpdaterEvents() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({
      checking: true,
      downloading: false,
      downloaded: false,
      error: "",
      message: "Recherche d’une nouvelle version…",
    });
  });

  autoUpdater.on("update-available", (info) => {
    setUpdateState({
      checking: false,
      downloading: true,
      downloaded: false,
      availableVersion: info?.version ?? "",
      error: "",
      message: `Version ${info?.version ?? "nouvelle"} disponible. Téléchargement en cours…`,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setUpdateState({
      checking: false,
      downloading: false,
      downloaded: false,
      availableVersion: "",
      error: "",
      message: "Vous avez déjà la dernière version.",
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress?.percent ?? 0);
    setUpdateState({
      checking: false,
      downloading: true,
      downloaded: false,
      error: "",
      message: `Téléchargement de la mise à jour… ${percent}%`,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setUpdateState({
      checking: false,
      downloading: false,
      downloaded: true,
      availableVersion: info?.version ?? updateState.availableVersion,
      error: "",
      message: "Mise à jour prête. Redémarrez l’application pour l’installer.",
    });
  });

  autoUpdater.on("error", (error) => {
    setUpdateState({
      checking: false,
      downloading: false,
      error: error instanceof Error ? error.message : "Erreur de mise à jour.",
      message: "Impossible de vérifier ou télécharger la mise à jour.",
    });
  });
}

async function configureAutoUpdates(backendUrl) {
  const normalizedBackendUrl = normalizeBackendUrl(backendUrl) || PRODUCTION_BACKEND_URL;

  if (!app.isPackaged) {
    setUpdateState({
      enabled: false,
      configured: false,
      updateUrl: "",
      message: "Mises à jour désactivées en mode développement.",
      error: "",
    });
    return updateState;
  }

  let response;
  try {
    response = await fetch(`${normalizedBackendUrl}/api/manager/update-config`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    throw new Error(
      `Impossible de joindre le portail AIPilot (${normalizedBackendUrl}). Vérifiez votre connexion ou réinstallez la dernière version du manager.`,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error || "Impossible de charger la configuration des mises à jour.",
    );
  }

  const updateUrl = String(payload.updateUrl ?? "").trim();
  if (payload.enabled && updateUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: updateUrl,
    });

    updatesConfigured = true;
    setUpdateState({
      enabled: true,
      configured: true,
      updateUrl,
      error: "",
      message: "Canal de mise à jour distant prêt.",
    });

    if (!updatesAutoChecked) {
      updatesAutoChecked = true;
      void checkForUpdates().catch((error) => {
        setUpdateState({
          checking: false,
          downloading: false,
          error: error instanceof Error ? error.message : "Erreur de mise à jour.",
          message: "Impossible de vérifier les mises à jour.",
        });
      });
    }

    return updateState;
  }

  updatesConfigured = true;
  setUpdateState({
    enabled: true,
    configured: true,
    updateUrl: "GitHub Releases (canal intégré)",
    error: "",
    message: "Canal de mise à jour intégré prêt.",
  });

  if (!updatesAutoChecked) {
    updatesAutoChecked = true;
    void checkForUpdates().catch((error) => {
      setUpdateState({
        checking: false,
        downloading: false,
        error: error instanceof Error ? error.message : "Erreur de mise à jour.",
        message: "Impossible de vérifier les mises à jour.",
      });
    });
  }

  return updateState;
}

async function checkForUpdates() {
  if (!updatesConfigured) {
    throw new Error("Les mises à jour ne sont pas encore configurées.");
  }

  await autoUpdater.checkForUpdates();
  return updateState;
}

function installDownloadedUpdate() {
  if (!updateState.downloaded) {
    throw new Error("Aucune mise à jour téléchargée n’est prête à être installée.");
  }

  autoUpdater.quitAndInstall();
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeFileWithDirs(filePath, content) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

async function fileExists(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getCodexHome() {
  return path.join(os.homedir(), ".codex");
}

function getCodexConfigPath() {
  return path.join(getCodexHome(), "config.toml");
}

function getOpenCodeGlobalConfigPath() {
  return path.join(os.homedir(), ".config", "opencode", "opencode.json");
}

function getOpenCodeAuthPath() {
  return path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
}

function getOpenCodeProjectConfig(projectRoot) {
  return path.join(projectRoot, "opencode.json");
}

function getOpenCodeLocalConfig(projectRoot) {
  return path.join(projectRoot, ".opencode", "config.json");
}

function getSetupGuidance(manifest, projectRoot) {
  if (manifest.tool.environment === "opencode") {
    return {
      primaryConfigPath: getOpenCodeGlobalConfigPath(),
      configDirectoryPath: path.dirname(getOpenCodeGlobalConfigPath()),
      prompt:
        "La configuration OpenCode a déjà été préparée par AIPilot. Vérifiez votre dossier projet puis lancez OpenCode.",
      nextSteps: [
        "AIPilot écrit la configuration globale OpenCode et le fichier d'authentification Azure.",
        projectRoot
          ? `La configuration projet sera utilisée dans ${projectRoot}.`
          : "Choisissez un dossier projet si vous voulez aussi générer la configuration locale OpenCode.",
        "Si vous changez de licence ou de déploiement Azure, cliquez sur Réparer pour réécrire la configuration.",
      ],
    };
  }

  const toolLabel = manifest.tool.environment === "t3code" ? "T3 Code" : "Codex";
  return {
    primaryConfigPath: getCodexConfigPath(),
    configDirectoryPath: getCodexHome(),
    prompt: `La configuration Codex a déjà été écrite par AIPilot. Ouvrez ${toolLabel} ou Codex CLI pour commencer.`,
    nextSteps: [
      "Le fichier ~/.codex/config.toml contient déjà l'endpoint Azure AIPilot et le déploiement configuré.",
      "Si l'app desktop n'est pas encore installée sur Windows, vous pouvez lancer Codex CLI tout de suite ou ouvrir la page officielle de téléchargement.",
      "Si vous changez de licence ou de machine, cliquez sur Réparer pour réinjecter la configuration.",
    ],
  };
}

function stringifyCommand(parts) {
  return parts.map((part) => (part.includes(" ") ? `"${part}"` : part)).join(" ");
}

function resolveCommandForPlatform(command) {
  if (process.platform !== "win32") {
    return command;
  }

  if (["npm", "npx", "codex", "opencode", "t3"].includes(command)) {
    return `${command}.cmd`;
  }

  return command;
}

function quoteForWindowsCmd(value) {
  if (!value) {
    return '""';
  }

  const escaped = value.replaceAll('"', '\\"');
  return /[\s"&()^|<>]/.test(escaped) ? `"${escaped}"` : escaped;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const resolvedCommand = resolveCommandForPlatform(command);
    const childOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      windowsHide: true,
    };

    const child =
      process.platform === "win32" &&
      (resolvedCommand.endsWith(".cmd") || resolvedCommand.endsWith(".bat"))
        ? spawn(
            "cmd.exe",
            [
              "/d",
              "/s",
              "/c",
              [quoteForWindowsCmd(resolvedCommand), ...args.map(quoteForWindowsCmd)].join(
                " ",
              ),
            ],
            childOptions,
          )
        : spawn(resolvedCommand, args, childOptions);

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timeoutId = null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (timedOut) {
        return;
      }

      if (code === 0) {
        resolve({ stdout, stderr, code });
        return;
      }

      reject(
        new Error(
          stderr.trim() || stdout.trim() || `Command failed with exit code ${code}`,
        ),
      );
    });

    if (options.timeoutMs) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          child.kill();
        } catch {
          // Ignore kill errors when the process already exited.
        }
        reject(
          new Error(
            options.timeoutMessage ||
              `La commande ${command} a dépassé le délai autorisé.`,
          ),
        );
      }, options.timeoutMs);
    }
  });
}

async function commandExists(command) {
  const probe =
    process.platform === "win32"
      ? ["where.exe", [command]]
      : ["bash", ["-lc", `command -v ${command}`]];

  try {
    await runCommand(probe[0], probe[1]);
    return true;
  } catch {
    return false;
  }
}

async function runPowerShell(script) {
  return runCommand("powershell", ["-NoProfile", "-Command", script]);
}

async function installWingetPackage(id, logs, options = {}) {
  ensureCommandOrThrow(
    await commandExists("winget"),
    "winget est requis sur Windows pour installer cette application.",
  );

  const args = ["install", "-e", "--id", id];
  if (options.source) {
    args.push("--source", options.source);
  }
  args.push(
    "--silent",
    "--scope",
    "user",
    "--accept-package-agreements",
    "--accept-source-agreements",
    "--disable-interactivity",
  );

  logs.push(`Installation via winget: ${id}`);
  await runCommand("winget", args, {
    timeoutMs: options.timeoutMs ?? 480000,
    timeoutMessage: `L'installation via winget (${id}) prend trop de temps. Vérifiez le Microsoft Store ou réessayez plus tard.`,
  });
}

async function getWindowsStartApps() {
  if (process.platform !== "win32") {
    return [];
  }

  try {
    const { stdout } = await runPowerShell(
      "Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress",
    );
    const parsed = JSON.parse(stdout.trim() || "[]");
    return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  } catch {
    return [];
  }
}

async function findWindowsStartApp(nameCandidates) {
  const apps = await getWindowsStartApps();
  const normalizedApps = apps.map((app) => ({
    name: String(app?.Name ?? ""),
    appId: String(app?.AppID ?? ""),
    raw: app,
  }));

  for (const candidate of nameCandidates) {
    const exact = normalizedApps.find(
      (app) => app.name.toLowerCase() === candidate.toLowerCase(),
    );
    if (exact) {
      return exact.raw;
    }
  }

  for (const candidate of nameCandidates) {
    const partial = normalizedApps.find((app) =>
      app.name.toLowerCase().includes(candidate.toLowerCase()),
    );
    if (partial) {
      return partial.raw;
    }
  }

  return null;
}

async function launchWindowsStartApp(appId) {
  await runPowerShell(`Start-Process "shell:AppsFolder\\${appId}"`);
}

async function launchMacApplication(nameCandidates) {
  for (const candidate of nameCandidates) {
    try {
      await runCommand("open", ["-a", candidate]);
      return true;
    } catch {
      // Try next candidate
    }
  }

  return false;
}

async function macApplicationExists(nameCandidates) {
  for (const candidate of nameCandidates) {
    const roots = [
      path.join("/Applications", `${candidate}.app`),
      path.join(os.homedir(), "Applications", `${candidate}.app`),
    ];

    for (const root of roots) {
      if (await fileExists(root)) {
        return true;
      }
    }
  }

  return false;
}

async function isDesktopAppInstalled(environment) {
  if (process.platform === "win32") {
    if (environment === "codex") {
      return Boolean(await findWindowsStartApp(["Codex"]));
    }
    if (environment === "t3code") {
      return Boolean(await findWindowsStartApp(["T3 Code"]));
    }
    return Boolean(await findWindowsStartApp(["OpenCode"]));
  }

  if (process.platform === "darwin") {
    if (environment === "codex") {
      return macApplicationExists(["Codex"]);
    }
    if (environment === "t3code") {
      return macApplicationExists(["T3 Code"]);
    }
    return macApplicationExists(["OpenCode"]);
  }

  return false;
}

async function updateShellFile(filePath, exportsMap) {
  let current = "";

  try {
    current = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const markerStart = "# >>> AIPILOT MANAGED >>>";
  const markerEnd = "# <<< AIPILOT MANAGED <<<";
  const blockLines = [markerStart];

  for (const [name, value] of Object.entries(exportsMap)) {
    blockLines.push(`export ${name}="${value.replaceAll('"', '\\"')}"`);
  }

  blockLines.push(markerEnd);
  const block = `${blockLines.join("\n")}\n`;
  const pattern = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}\\n?`, "g");
  const next = current.match(pattern)
    ? current.replace(pattern, block)
    : `${current}${current.endsWith("\n") || current.length === 0 ? "" : "\n"}${block}`;

  await writeFileWithDirs(filePath, next);
}

async function setUserEnvironmentVariables(vars, logs) {
  Object.assign(process.env, vars);

  if (process.platform === "win32") {
    for (const [name, value] of Object.entries(vars)) {
      logs.push(`Mise à jour de la variable utilisateur ${name}`);
      await runCommand("setx", [name, value]);
    }
    return;
  }

  const shellFiles = [
    path.join(os.homedir(), ".zshrc"),
    path.join(os.homedir(), ".bashrc"),
    path.join(os.homedir(), ".profile"),
  ];

  for (const shellFile of shellFiles) {
    logs.push(`Mise à jour des exports dans ${shellFile}`);
    await updateShellFile(shellFile, vars);
  }
}

function buildOpenCodeRuntimeConfig(manifest) {
  return {
    providers: {
      azure: {
        resourceName: manifest.azure.resourceName,
        apiKey: manifest.azure.apiKey,
        deployment: manifest.azure.deployment,
      },
    },
    defaultProvider: "azure",
  };
}

async function configureCodex(manifest, logs) {
  const configPath = getCodexConfigPath();
  logs.push(`Écriture de la configuration Codex dans ${configPath}`);
  await writeFileWithDirs(configPath, manifest.azure.codex.configToml);

  await setUserEnvironmentVariables(
    {
      AZURE_OPENAI_API_KEY: manifest.azure.apiKey,
      AZURE_RESOURCE_NAME: manifest.azure.resourceName,
      AZURE_OPENAI_DEPLOYMENT: manifest.azure.deployment,
    },
    logs,
  );
}

async function configureOpenCode(manifest, projectRoot, logs) {
  const globalConfigPath = getOpenCodeGlobalConfigPath();
  const authPath = getOpenCodeAuthPath();
  const runtimeConfig = buildOpenCodeRuntimeConfig(manifest);

  logs.push(`Écriture de la configuration globale OpenCode dans ${globalConfigPath}`);
  await writeFileWithDirs(
    globalConfigPath,
    `${JSON.stringify(manifest.azure.opencode.config, null, 2)}\n`,
  );

  logs.push(`Écriture du fichier d'authentification OpenCode dans ${authPath}`);
  await writeFileWithDirs(
    authPath,
    `${JSON.stringify(manifest.azure.opencode.auth, null, 2)}\n`,
  );

  if (projectRoot) {
    const projectConfigPath = getOpenCodeProjectConfig(projectRoot);
    const localConfigPath = getOpenCodeLocalConfig(projectRoot);

    logs.push(`Écriture de ${projectConfigPath}`);
    await writeFileWithDirs(
      projectConfigPath,
      `${JSON.stringify(manifest.azure.opencode.config, null, 2)}\n`,
    );

    logs.push(`Écriture de ${localConfigPath}`);
    await writeFileWithDirs(
      localConfigPath,
      `${JSON.stringify(runtimeConfig, null, 2)}\n`,
    );
  } else {
    logs.push(
      "Aucun dossier projet sélectionné. La configuration globale OpenCode suffit pour démarrer, mais un projet local reste recommandé.",
    );
  }

  await setUserEnvironmentVariables(
    {
      AZURE_OPENAI_API_KEY: manifest.azure.apiKey,
      AZURE_RESOURCE_NAME: manifest.azure.resourceName,
      AZURE_OPENAI_DEPLOYMENT: manifest.azure.deployment,
    },
    logs,
  );
}

function ensureCommandOrThrow(available, message) {
  if (!available) {
    throw new Error(message);
  }
}

async function installCodex(logs) {
  logs.push("Préparation de l'installation Codex...");
  if (process.platform === "win32") {
    if (!(await isDesktopAppInstalled("codex"))) {
      try {
        await installWingetPackage("9PLM9XGG6VKS", logs, { source: "msstore" });
      } catch (error) {
        logs.push(
          `L'app Codex Windows n'a pas pu être installée automatiquement. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
      }
    } else {
      logs.push("L'app Codex Windows est déjà disponible.");
    }

    if (await commandExists("codex")) {
      logs.push("Codex CLI est déjà disponible.");
      return;
    }

    try {
      await installWingetPackage("OpenAI.Codex", logs);
      if (await commandExists("codex")) {
        return;
      }
    } catch (error) {
      logs.push(
        `winget n'a pas terminé l'installation de Codex CLI. Fallback npm: ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
    }
  } else if (await commandExists("codex")) {
    logs.push("Codex CLI est déjà disponible.");
    return;
  }

  if (process.platform === "darwin" && (await commandExists("brew"))) {
    try {
      logs.push("Installation de Codex via Homebrew...");
      await runCommand("brew", ["install", "--cask", "codex"], {
        cwd: os.homedir(),
      });
      if (await commandExists("codex")) {
        return;
      }
    } catch (error) {
      logs.push(
        `Homebrew n'a pas terminé l'installation de Codex. Fallback npm: ${
          error instanceof Error ? error.message : "erreur inconnue"
        }`,
      );
    }
  }

  ensureCommandOrThrow(
    await commandExists("npm"),
    "Node.js et npm sont requis pour installer Codex CLI.",
  );

  logs.push("Installation de Codex CLI via npm...");
  await runCommand("npm", ["install", "-g", "@openai/codex@latest"], {
    cwd: os.homedir(),
    timeoutMs: 600000,
    timeoutMessage:
      "L'installation npm de Codex prend trop de temps. Vérifiez votre connexion puis réessayez.",
  });
}

async function installT3Code(logs) {
  logs.push("Préparation de l'installation T3 Code...");
  await installCodex(logs);

  if (process.platform === "win32" && (await commandExists("winget"))) {
    if (!(await isDesktopAppInstalled("t3code"))) {
      try {
        logs.push("Installation de l'app T3 Code via winget...");
        await runCommand("winget", [
          "install",
          "-e",
          "--id",
          "T3Tools.T3Code",
          "--silent",
          "--scope",
          "user",
          "--accept-package-agreements",
          "--accept-source-agreements",
          "--disable-interactivity",
        ], {
          timeoutMs: 480000,
          timeoutMessage:
            "L'installation winget de l'app T3 Code prend trop de temps. Le manager va continuer avec les alternatives disponibles.",
        });
      } catch (error) {
        logs.push(
          `winget n'a pas terminé l'installation de l'app T3 Code. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
      }
    } else {
      logs.push("L'app T3 Code Windows est déjà disponible.");
    }

    if (await commandExists("t3")) {
      logs.push("La commande t3 est déjà disponible.");
      return;
    }

    try {
      logs.push("Installation de T3 Code via winget...");
      await runCommand("winget", [
        "install",
        "-e",
        "--id",
        "T3Tools.T3Code",
        "--silent",
        "--scope",
        "user",
        "--accept-package-agreements",
        "--accept-source-agreements",
        "--disable-interactivity",
      ], {
        timeoutMs: 480000,
        timeoutMessage:
          "L'installation winget de T3 Code prend trop de temps. Le fallback npx restera disponible.",
      });
    } catch (error) {
      logs.push(
        `winget n'a pas terminé l'installation de T3 Code. Le fallback npx restera disponible. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
    }
  }

  if (process.platform === "darwin" && (await commandExists("brew"))) {
    try {
      logs.push("Installation de T3 Code via Homebrew...");
      await runCommand("brew", ["install", "--cask", "t3-code"], {
        cwd: os.homedir(),
        });
    } catch (error) {
      logs.push(
        `Homebrew n'a pas terminé l'installation de T3 Code. Le fallback npx restera disponible. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
    }
  }

  if (await commandExists("t3")) {
    logs.push("La commande t3 est déjà disponible.");
    return;
  }

  ensureCommandOrThrow(
    (await commandExists("t3")) || (await commandExists("npx")),
    "T3 Code nécessite soit une commande t3 locale, soit npx.",
  );
}

async function installOpenCode(logs) {
  logs.push("Préparation de l'installation OpenCode...");
  if (process.platform === "win32") {
    if (!(await isDesktopAppInstalled("opencode"))) {
      try {
        await installWingetPackage("SST.OpenCodeDesktop", logs);
      } catch (error) {
        logs.push(
          `L'app OpenCode Windows n'a pas pu être installée automatiquement. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
      }
    } else {
      logs.push("L'app OpenCode Windows est déjà disponible.");
    }

    if (await commandExists("opencode")) {
      logs.push("La commande OpenCode est déjà disponible.");
      return;
    }

    try {
      await installWingetPackage("SST.opencode", logs);
      if (await commandExists("opencode")) {
        return;
      }
    } catch (error) {
      logs.push(
        `winget n'a pas terminé l'installation d'OpenCode CLI. Fallback npm: ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
    }
  } else if (await commandExists("opencode")) {
    logs.push("OpenCode est déjà disponible.");
    return;
  }

  if (process.platform === "darwin" && (await commandExists("brew"))) {
    try {
      logs.push("Tentative d'installation de l'app OpenCode via Homebrew...");
      await runCommand("brew", ["install", "--cask", "opencode"], {
        cwd: os.homedir(),
      });
    } catch (error) {
      logs.push(
        `Le cask OpenCode n'a pas été installé automatiquement. Le CLI sera quand même configuré. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
    }
  }

  ensureCommandOrThrow(
    await commandExists("npm"),
    "Node.js et npm sont requis pour installer OpenCode.",
  );

  logs.push("Installation d'OpenCode via npm...");
  await runCommand("npm", ["install", "-g", "opencode-ai"], {
    cwd: os.homedir(),
    timeoutMs: 600000,
    timeoutMessage:
      "L'installation npm d'OpenCode prend trop de temps. Vérifiez votre connexion puis réessayez.",
  });
}

async function installTool(manifest, logs) {
  if (manifest.tool.environment === "codex") {
    logs.push("Étape 1/2: installation des composants Codex...");
    await installCodex(logs);
    return;
  }

  if (manifest.tool.environment === "t3code") {
    logs.push("Étape 1/2: installation des composants T3 Code et Codex...");
    await installT3Code(logs);
    return;
  }

  logs.push("Étape 1/2: installation des composants OpenCode...");
  await installOpenCode(logs);
}

async function tryLaunchDesktopApp(environment, logs) {
  if (process.platform === "win32") {
    const startApp =
      environment === "codex"
        ? await findWindowsStartApp(["Codex"])
        : environment === "t3code"
          ? await findWindowsStartApp(["T3 Code"])
          : await findWindowsStartApp(["OpenCode"]);

    if (startApp?.AppID) {
      logs.push(`Ouverture de l'app desktop ${startApp.Name}...`);
      await launchWindowsStartApp(startApp.AppID);
      return true;
    }
  }

  if (process.platform === "darwin") {
    const names =
      environment === "codex"
        ? ["Codex"]
        : environment === "t3code"
          ? ["T3 Code"]
          : ["OpenCode"];

    if (await launchMacApplication(names)) {
      logs.push(`Ouverture de l'app desktop ${names[0]}...`);
      return true;
    }
  }

  return false;
}

async function getLaunchCommand(environment) {
  if (environment === "codex") {
    ensureCommandOrThrow(
      await commandExists("codex"),
      "Codex CLI est introuvable. Lancez d'abord l'installation.",
    );
    return ["codex"];
  }

  if (environment === "t3code") {
    if (await commandExists("t3")) {
      return ["t3"];
    }

    ensureCommandOrThrow(
      await commandExists("npx"),
      "T3 Code est introuvable et npx n'est pas disponible.",
    );
    return ["npx", "-y", "t3@latest"];
  }

  ensureCommandOrThrow(
    await commandExists("opencode"),
    "OpenCode est introuvable. Lancez d'abord l'installation.",
  );
  return ["opencode"];
}

async function buildDiagnostics(manifest, projectRoot) {
  const nodeAvailable = await commandExists("node");
  const npmAvailable = await commandExists("npm");
  const codexAvailable = await commandExists("codex");
  const t3Available = await commandExists("t3");
  const npxAvailable = await commandExists("npx");
  const opencodeAvailable = await commandExists("opencode");
  const desktopAppAvailable = await isDesktopAppInstalled(manifest.tool.environment);
  const codexConfigPath = getCodexConfigPath();
  const openCodeGlobalConfigPath = getOpenCodeGlobalConfigPath();
  const openCodeAuthPath = getOpenCodeAuthPath();

  const checks = [
    {
      label: "Node.js",
      ok: nodeAvailable,
      optional: false,
      details: nodeAvailable ? "Disponible" : "Manquant",
    },
    {
      label: "npm",
      ok: npmAvailable,
      optional: false,
      details: npmAvailable ? "Disponible" : "Manquant",
    },
  ];

  if (manifest.tool.environment === "opencode") {
    const globalConfigExists = await fileExists(openCodeGlobalConfigPath);
    const authExists = await fileExists(openCodeAuthPath);
    const projectConfigPath = projectRoot ? getOpenCodeProjectConfig(projectRoot) : "";
    const localConfigPath = projectRoot ? getOpenCodeLocalConfig(projectRoot) : "";
    const projectConfigExists = projectRoot ? await fileExists(projectConfigPath) : false;
    const localConfigExists = projectRoot ? await fileExists(localConfigPath) : false;

    checks.push(
      {
        label: "App OpenCode",
        ok: desktopAppAvailable,
        optional: true,
        details: desktopAppAvailable ? "Installée" : "CLI uniquement pour l'instant",
      },
      {
        label: "Commande OpenCode",
        ok: opencodeAvailable,
        optional: false,
        details: opencodeAvailable ? "Prête" : "Manquante",
      },
      {
        label: "Configuration globale",
        ok: globalConfigExists && authExists,
        optional: false,
        details: `${openCodeGlobalConfigPath} / ${openCodeAuthPath}`,
      },
      {
        label: "Configuration projet",
        ok: projectRoot ? projectConfigExists && localConfigExists : false,
        optional: true,
        details: projectRoot
          ? `${projectConfigPath} / ${localConfigPath}`
          : "Aucun dossier projet",
      },
    );
  } else {
    checks.push(
      {
        label: manifest.tool.environment === "codex" ? "App Codex" : "App T3 Code",
        ok: desktopAppAvailable,
        optional: true,
        details: desktopAppAvailable ? "Installée" : "CLI uniquement pour l'instant",
      },
      {
        label: "Commande Codex",
        ok: codexAvailable,
        optional: false,
        details: codexAvailable ? "Prête" : "Manquante",
      },
      {
        label: "Configuration Codex",
        ok: await fileExists(codexConfigPath),
        optional: false,
        details: codexConfigPath,
      },
    );

    if (manifest.tool.environment === "t3code") {
      checks.push({
        label: "Accès T3 Code",
        ok: t3Available || npxAvailable,
        optional: false,
        details: t3Available
          ? "Commande locale détectée"
          : npxAvailable
            ? "Fallback npx disponible"
            : "Ni t3 ni npx",
      });
    }
  }

  checks.push({
    label: "Variables Azure",
    ok:
      Boolean(process.env.AZURE_OPENAI_API_KEY) &&
      Boolean(process.env.AZURE_RESOURCE_NAME) &&
      Boolean(process.env.AZURE_OPENAI_DEPLOYMENT),
    optional: false,
    details: process.env.AZURE_OPENAI_API_KEY ? "Présentes" : "Absentes",
  });

  const notes = [...(manifest.tool.notes || [])];

  if (manifest.tool.environment === "opencode" && !projectRoot) {
    notes.push("Choisir un dossier projet permet aussi d’écrire la config locale OpenCode.");
  }

  return {
    overallOk: checks.every((check) => check.ok || check.optional),
    checks,
    notes,
  };
}

async function configureTool(manifest, projectRoot, logs) {
  logs.push("Étape 2/2: écriture de la configuration AIPilot...");
  if (manifest.tool.environment === "opencode") {
    await configureOpenCode(manifest, projectRoot, logs);
    return;
  }

  await configureCodex(manifest, logs);
}

async function launchTool(manifest, projectRoot, logs) {
  if (await tryLaunchDesktopApp(manifest.tool.environment, logs)) {
    return;
  }

  const launchCommand = await getLaunchCommand(manifest.tool.environment);
  const [command, ...args] = launchCommand;
  const cwd = projectRoot || os.homedir();

  logs.push(`Lancement: ${stringifyCommand(launchCommand)}`);

  if (process.platform === "win32") {
    const commandLine = stringifyCommand([command, ...args]);
    await runCommand("cmd.exe", ["/c", "start", "", "cmd.exe", "/k", commandLine], {
      cwd,
    });
    return;
  }

  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function executeManagerAction(action, payload, event) {
  const logs = [];
  const logSink = {
    push(message) {
      const text = String(message);
      logs.push(text);
      if (event?.sender && !event.sender.isDestroyed()) {
        event.sender.send("manager:action-log", text);
      }
    },
  };
  const manifest = payload.manifest;
  const projectRoot = payload.projectRoot || "";

  if (!manifest) {
    throw new Error("Manifest manquant.");
  }

  if (action === "diagnose") {
    return {
      logs,
      diagnostics: await buildDiagnostics(manifest, projectRoot),
    };
  }

  if (action === "install-configure") {
    logSink.push("Installation et configuration démarrées. Cela peut prendre quelques minutes selon votre connexion.");
    await installTool(manifest, logSink);
    await configureTool(manifest, projectRoot, logSink);
    logSink.push("Installation et configuration terminées.");
    logSink.push(`Configuration prête: ${getSetupGuidance(manifest, projectRoot).primaryConfigPath}`);
    logSink.push("Vous pouvez ouvrir le fichier de configuration ou le dossier associé directement depuis le manager.");
    return {
      logs,
      diagnostics: await buildDiagnostics(manifest, projectRoot),
    };
  }

  if (action === "repair") {
    logSink.push("Réparation de la configuration en cours...");
    await configureTool(manifest, projectRoot, logSink);
    logSink.push("Réparation terminée.");
    logSink.push(`Configuration prête: ${getSetupGuidance(manifest, projectRoot).primaryConfigPath}`);
    return {
      logs,
      diagnostics: await buildDiagnostics(manifest, projectRoot),
    };
  }

  if (action === "launch") {
    logSink.push("Lancement de l'outil...");
    await launchTool(manifest, projectRoot, logSink);
    return {
      logs,
      diagnostics: await buildDiagnostics(manifest, projectRoot),
    };
  }

  throw new Error(`Action inconnue: ${action}`);
}

ipcMain.handle("manager:get-defaults", async () => {
  const defaults = await getEffectiveDefaults();
  return {
    backendUrl: defaults.backendUrl,
    platform: PLATFORM_KEY,
    licenseKey: defaults.licenseKey,
    environment: defaults.environment,
    projectRoot: defaults.projectRoot,
    autoSetup: defaults.autoSetup,
    version: app.getVersion(),
    packaged: app.isPackaged,
  };
});

ipcMain.handle("manager:get-update-state", async () => updateState);

ipcMain.handle("manager:configure-updates", async (_event, payload) => {
  const defaults = await getEffectiveDefaults();
  return configureAutoUpdates(String(payload?.backendUrl ?? defaults.backendUrl));
});

ipcMain.handle("manager:check-for-updates", async () => {
  return checkForUpdates();
});

ipcMain.handle("manager:install-update", async () => {
  installDownloadedUpdate();
  return { ok: true };
});

ipcMain.handle("manager:pick-project-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  return result.canceled ? "" : result.filePaths[0] || "";
});

ipcMain.handle("manager:create-session", async (_event, payload) => {
  const defaults = await getEffectiveDefaults();
  const backendUrl = normalizeBackendUrl(payload?.backendUrl) || defaults.backendUrl;
  let response;

  try {
    response = await fetch(`${backendUrl}/api/manager/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licenseKey: payload.licenseKey,
        environment: payload.environment,
      }),
    });
  } catch {
    throw new Error(
      `Impossible de joindre le portail AIPilot (${backendUrl}). Vérifiez votre connexion internet ou mettez à jour le manager.`,
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Impossible de récupérer la session manager.");
  }

  await savePersistedState({
    backendUrl,
    licenseKey: String(payload.licenseKey ?? ""),
    environment: String(payload.environment ?? "opencode"),
  });

  return {
    ...data,
    setup: getSetupGuidance(data, String(payload?.projectRoot ?? "")),
  };
});

ipcMain.handle("manager:save-state", async (_event, payload) => {
  await savePersistedState({
    backendUrl: normalizeBackendUrl(payload?.backendUrl),
    licenseKey: String(payload?.licenseKey ?? ""),
    environment: String(payload?.environment ?? "opencode"),
    projectRoot: String(payload?.projectRoot ?? ""),
  });

  return { ok: true };
});

ipcMain.handle("manager:run-action", async (event, payload) => {
  return executeManagerAction(payload.action, payload, event);
});

ipcMain.handle("manager:open-external", async (_event, url) => {
  if (url) {
    await shell.openExternal(url);
  }
});

ipcMain.handle("manager:open-path", async (_event, targetPath) => {
  const value = String(targetPath ?? "").trim();
  if (!value) {
    return { ok: false };
  }

  const existing = await fileExists(value);
  if (!existing) {
    throw new Error(`Chemin introuvable: ${value}`);
  }

  if (process.platform === "win32") {
    await runCommand("explorer.exe", [value]);
    return { ok: true };
  }

  const result = await shell.openPath(value);
  if (result) {
    throw new Error(result);
  }

  return { ok: true };
});

app.whenReady().then(() => {
  app.setName("AIPilot Manager");
  if (process.platform === "win32") {
    app.setAppUserModelId("tn.aipilot.manager");
  }

  initAutoUpdaterEvents();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
