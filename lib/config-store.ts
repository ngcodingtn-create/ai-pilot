import { neon } from "@neondatabase/serverless";
import { decryptString, encryptString } from "./crypto";

export type StoredConfig = {
  azureResourceName: string;
  azureDefaultDeployment: string;
  azureApiKey?: string;
  includeApiKeyInInstaller: boolean;
};

const DEFAULTS: StoredConfig = {
  azureResourceName: process.env.NEXT_PUBLIC_AZURE_RESOURCE_NAME ?? "admin-3342-resource",
  azureDefaultDeployment: process.env.NEXT_PUBLIC_DEFAULT_DEPLOYMENT ?? "gpt-5.4-1",
  includeApiKeyInInstaller: false,
};

function getSql() {
  const url = process.env.DATABASE_URL;

  if (!url) return null;

  return neon(url);
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
  await ensureConfigTable();
  await setValue("azureResourceName", config.azureResourceName);
  await setValue("azureDefaultDeployment", config.azureDefaultDeployment);
  await setValue(
    "includeApiKeyInInstaller",
    String(config.includeApiKeyInInstaller),
  );

  if (config.azureApiKey) {
    await setValue("azureApiKey", config.azureApiKey, true);
  }
}

export async function getStoredConfig(): Promise<StoredConfig> {
  const sql = getSql();
  if (!sql) return DEFAULTS;

  await ensureConfigTable();
  const rows = await sql`
    SELECT key, value, encrypted
    FROM app_config
  `;

  const config: StoredConfig = { ...DEFAULTS };

  for (const row of rows as Array<{ key: string; value: string; encrypted: boolean }>) {
    const value = row.encrypted ? decryptString(row.value) : row.value;

    if (row.key === "azureResourceName") config.azureResourceName = value;
    if (row.key === "azureDefaultDeployment") config.azureDefaultDeployment = value;
    if (row.key === "azureApiKey") config.azureApiKey = value;
    if (row.key === "includeApiKeyInInstaller") {
      config.includeApiKeyInInstaller = value === "true";
    }
  }

  return config;
}
