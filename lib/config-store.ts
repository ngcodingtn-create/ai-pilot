import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { decryptString, encryptString } from "./crypto";
import { getSql } from "./db";

export type StoredConfig = {
  azureResourceName: string;
  azureDefaultDeployment: string;
  azureGpt55Deployment?: string;
  azureApiKey?: string;
  includeApiKeyInInstaller: boolean;
  supportEmail?: string;
  supportVideoUrl?: string;
  managerUpdateUrl?: string;
  managerTutorialLinks?: string;
};

type LocalConfigFile = {
  azureResourceName?: string;
  azureDefaultDeployment?: string;
  azureGpt55Deployment?: string;
  azureApiKey?: string;
  azureApiKeyEncrypted?: boolean;
  includeApiKeyInInstaller?: boolean;
  supportEmail?: string;
  supportVideoUrl?: string;
  managerUpdateUrl?: string;
  managerTutorialLinks?: string;
};

type LocalOpenCodeRuntimeConfig = {
  providers?: {
    azure?: {
      apiKey?: string;
      deployment?: string;
      resourceName?: string;
    };
  };
};

const DEFAULTS: StoredConfig = {
  azureResourceName: process.env.NEXT_PUBLIC_AZURE_RESOURCE_NAME ?? "admin-3342-resource",
  azureDefaultDeployment: process.env.NEXT_PUBLIC_DEFAULT_DEPLOYMENT ?? "gpt-5.4-1",
  azureGpt55Deployment: process.env.NEXT_PUBLIC_GPT55_DEPLOYMENT ?? "",
  includeApiKeyInInstaller: false,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  supportVideoUrl: process.env.NEXT_PUBLIC_SUPPORT_VIDEO_URL ?? "",
  managerUpdateUrl: process.env.MANAGER_UPDATE_URL ?? "",
  managerTutorialLinks: "",
};

export const LOCAL_CONFIG_RELATIVE_PATH = ".opencode/portal-config.json";
export const LOCAL_OPENCODE_CONFIG_RELATIVE_PATH = ".opencode/config.json";

const LOCAL_CONFIG_PATH = path.resolve(process.cwd(), LOCAL_CONFIG_RELATIVE_PATH);
const LOCAL_OPENCODE_CONFIG_PATH = path.resolve(
  process.cwd(),
  LOCAL_OPENCODE_CONFIG_RELATIVE_PATH,
);

async function readLocalConfigFile(): Promise<LocalConfigFile> {
  try {
    const raw = await readFile(LOCAL_CONFIG_PATH, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as LocalConfigFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function readLocalOpenCodeConfigFile(): Promise<LocalOpenCodeRuntimeConfig> {
  try {
    const raw = await readFile(LOCAL_OPENCODE_CONFIG_PATH, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as LocalOpenCodeRuntimeConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function writeLocalConfigFile(config: LocalConfigFile) {
  await mkdir(path.dirname(LOCAL_CONFIG_PATH), { recursive: true });
  await writeFile(LOCAL_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function readStoredSecret(value: string | undefined, encrypted = false) {
  if (!value) {
    return undefined;
  }

  if (!encrypted) {
    return value;
  }

  try {
    return decryptString(value);
  } catch {
    return undefined;
  }
}

async function saveLocalConfig(config: StoredConfig) {
  const current = await readLocalConfigFile();
  const next: LocalConfigFile = {
    azureResourceName: config.azureResourceName,
    azureDefaultDeployment: config.azureDefaultDeployment,
    azureGpt55Deployment: config.azureGpt55Deployment,
    includeApiKeyInInstaller: config.includeApiKeyInInstaller,
    supportEmail: config.supportEmail,
    supportVideoUrl: config.supportVideoUrl,
    managerUpdateUrl: config.managerUpdateUrl,
    managerTutorialLinks: config.managerTutorialLinks,
    azureApiKey: current.azureApiKey,
    azureApiKeyEncrypted: current.azureApiKeyEncrypted,
  };

  if (config.azureApiKey) {
    if (process.env.CONFIG_ENCRYPTION_KEY) {
      next.azureApiKey = encryptString(config.azureApiKey);
      next.azureApiKeyEncrypted = true;
    } else {
      next.azureApiKey = config.azureApiKey;
      next.azureApiKeyEncrypted = false;
    }
  }

  await writeLocalConfigFile(next);
}

export async function ensureConfigTable() {
  const sql = getSql();
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS app_config (
      key text PRIMARY KEY,
      value text NOT NULL,
      encrypted boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function setValue(key: string, value: string, encrypted = false) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");

  const stored = encrypted ? encryptString(value) : value;

  await sql`
    INSERT INTO app_config (key, value, encrypted, updated_at)
    VALUES (${key}, ${stored}, ${encrypted}, now())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, encrypted = EXCLUDED.encrypted, updated_at = now()
  `;
}

export async function saveStoredConfig(config: StoredConfig) {
  const sql = getSql();

  if (!sql) {
    await saveLocalConfig(config);
    return;
  }

  await ensureConfigTable();
  await setValue("azureResourceName", config.azureResourceName);
  await setValue("azureDefaultDeployment", config.azureDefaultDeployment);
  await setValue("azureGpt55Deployment", config.azureGpt55Deployment ?? "");
  await setValue(
    "includeApiKeyInInstaller",
    String(config.includeApiKeyInInstaller),
  );
  await setValue("supportEmail", config.supportEmail ?? "");
  await setValue("supportVideoUrl", config.supportVideoUrl ?? "");
  await setValue("managerUpdateUrl", config.managerUpdateUrl ?? "");
  await setValue("managerTutorialLinks", config.managerTutorialLinks ?? "");

  if (config.azureApiKey) {
    await setValue("azureApiKey", config.azureApiKey, true);
  }
}

export async function getStoredConfig(): Promise<StoredConfig> {
  const sql = getSql();

  if (!sql) {
    const [local, opencodeRuntime] = await Promise.all([
      readLocalConfigFile(),
      readLocalOpenCodeConfigFile(),
    ]);
    const runtimeAzure = opencodeRuntime.providers?.azure;

    return {
      azureResourceName:
        local.azureResourceName ??
        runtimeAzure?.resourceName ??
        DEFAULTS.azureResourceName,
      azureDefaultDeployment:
        local.azureDefaultDeployment ??
        runtimeAzure?.deployment ??
        DEFAULTS.azureDefaultDeployment,
      azureGpt55Deployment:
        local.azureGpt55Deployment ?? DEFAULTS.azureGpt55Deployment,
      azureApiKey: readStoredSecret(
        local.azureApiKey ?? runtimeAzure?.apiKey,
        local.azureApiKeyEncrypted ?? false,
      ),
      includeApiKeyInInstaller:
        local.includeApiKeyInInstaller ?? DEFAULTS.includeApiKeyInInstaller,
      supportEmail: local.supportEmail ?? DEFAULTS.supportEmail,
      supportVideoUrl: local.supportVideoUrl ?? DEFAULTS.supportVideoUrl,
      managerUpdateUrl: local.managerUpdateUrl ?? DEFAULTS.managerUpdateUrl,
      managerTutorialLinks:
        local.managerTutorialLinks ?? DEFAULTS.managerTutorialLinks,
    };
  }

  await ensureConfigTable();
  const rows = await sql`
    SELECT key, value, encrypted
    FROM app_config
  `;
  const opencodeRuntime = await readLocalOpenCodeConfigFile();
  const runtimeAzure = opencodeRuntime.providers?.azure;

  const config: StoredConfig = { ...DEFAULTS };

  for (const row of rows as Array<{ key: string; value: string; encrypted: boolean }>) {
    const value = readStoredSecret(row.value, row.encrypted);

    if (!value) {
      continue;
    }

    if (row.key === "azureResourceName") config.azureResourceName = value;
    if (row.key === "azureDefaultDeployment") config.azureDefaultDeployment = value;
    if (row.key === "azureGpt55Deployment") config.azureGpt55Deployment = value;
    if (row.key === "azureApiKey") config.azureApiKey = value;
    if (row.key === "includeApiKeyInInstaller") {
      config.includeApiKeyInInstaller = value === "true";
    }
    if (row.key === "supportEmail") config.supportEmail = value;
    if (row.key === "supportVideoUrl") config.supportVideoUrl = value;
    if (row.key === "managerUpdateUrl") config.managerUpdateUrl = value;
    if (row.key === "managerTutorialLinks") config.managerTutorialLinks = value;
  }

  config.azureResourceName =
    config.azureResourceName || runtimeAzure?.resourceName || DEFAULTS.azureResourceName;
  config.azureDefaultDeployment =
    config.azureDefaultDeployment ||
    runtimeAzure?.deployment ||
    DEFAULTS.azureDefaultDeployment;
  config.azureApiKey = config.azureApiKey || runtimeAzure?.apiKey;

  return config;
}
