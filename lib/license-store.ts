import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSql } from "./db";
import { decryptString, encryptString } from "./crypto";
import { buildApimSubscriptionId, deleteApimSubscription } from "./apim";

export type LicenseTier = "starter" | "pro" | "max";
export type LicenseEnvironment = "codex" | "vscode-codex" | "t3code" | "opencode";
export type LicenseStatus = "active" | "disabled";

export type LicenseRecord = {
  id: string;
  licenseKey: string;
  customerName: string;
  customerEmail?: string;
  azureApiKey?: string;
  apimSubscriptionId?: string;
  apimStatus?: "active" | "suspended" | "cancelled";
  tier: LicenseTier;
  preferredEnvironment: LicenseEnvironment;
  status: LicenseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastValidatedAt?: string;
};

export type CreateLicenseInput = {
  customerName: string;
  customerEmail?: string;
  azureApiKey?: string;
  apimSubscriptionId?: string;
  apimStatus?: "active" | "suspended" | "cancelled";
  tier: LicenseTier;
  preferredEnvironment: LicenseEnvironment;
  status?: LicenseStatus;
  notes?: string;
  licenseKey?: string;
};

export type UpdateLicenseInput = {
  customerName: string;
  customerEmail?: string;
  tier: LicenseTier;
  preferredEnvironment: LicenseEnvironment;
  status: LicenseStatus;
  notes?: string;
};

type LocalLicenseFile = {
  licenses: LicenseRecord[];
};

type LicenseRow = {
  id: string;
  license_key: string;
  customer_name: string;
  customer_email: string | null;
  azure_api_key: string | null;
  azure_api_key_encrypted: boolean | null;
  apim_subscription_id: string | null;
  apim_status: "active" | "suspended" | "cancelled" | null;
  tier: LicenseTier;
  preferred_environment: LicenseEnvironment;
  status: LicenseStatus;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  last_validated_at: string | Date | null;
};

const LICENSE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LOCAL_LICENSE_RELATIVE_PATH = ".opencode/license-keys.json";
const LOCAL_LICENSE_PATH = path.resolve(process.cwd(), LOCAL_LICENSE_RELATIVE_PATH);

function normalizeLicenseKey(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

function buildLicenseKey() {
  const bytes = randomBytes(16);
  let output = "";

  for (let index = 0; index < 16; index += 1) {
    output += LICENSE_ALPHABET[bytes[index] % LICENSE_ALPHABET.length];
  }

  const groups = output.match(/.{1,4}/g);
  return groups ? groups.join("-") : output;
}

function buildId() {
  return randomBytes(12).toString("hex");
}

async function readLocalLicenseFile(): Promise<LocalLicenseFile> {
  try {
    const raw = await readFile(LOCAL_LICENSE_PATH, "utf8");
    return JSON.parse(raw) as LocalLicenseFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { licenses: [] };
    }

    throw error;
  }
}

async function writeLocalLicenseFile(payload: LocalLicenseFile) {
  await mkdir(path.dirname(LOCAL_LICENSE_PATH), { recursive: true });
  await writeFile(LOCAL_LICENSE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function mapRowToLicenseRecord(
  row: LicenseRow,
): LicenseRecord {
  return {
    id: row.id,
    licenseKey: row.license_key,
    customerName: row.customer_name,
    customerEmail: row.customer_email ?? undefined,
    azureApiKey: row.azure_api_key
      ? row.azure_api_key_encrypted
        ? decryptString(row.azure_api_key)
        : row.azure_api_key
      : undefined,
    apimSubscriptionId: row.apim_subscription_id ?? undefined,
    apimStatus: row.apim_status ?? undefined,
    tier: row.tier,
    preferredEnvironment: row.preferred_environment,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    lastValidatedAt: row.last_validated_at
      ? new Date(row.last_validated_at).toISOString()
      : undefined,
  };
}

export async function ensureLicenseTable() {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS license_keys (
      id text PRIMARY KEY,
      license_key text NOT NULL UNIQUE,
      customer_name text NOT NULL,
      customer_email text,
      azure_api_key text,
      azure_api_key_encrypted boolean NOT NULL DEFAULT false,
      apim_subscription_id text,
      apim_status text,
      tier text NOT NULL,
      preferred_environment text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_validated_at timestamptz
    )
  `;

  await sql`
    ALTER TABLE license_keys
    ADD COLUMN IF NOT EXISTS azure_api_key text
  `;

  await sql`
    ALTER TABLE license_keys
    ADD COLUMN IF NOT EXISTS azure_api_key_encrypted boolean NOT NULL DEFAULT false
  `;

  await sql`
    ALTER TABLE license_keys
    ADD COLUMN IF NOT EXISTS apim_subscription_id text
  `;

  await sql`
    ALTER TABLE license_keys
    ADD COLUMN IF NOT EXISTS apim_status text
  `;
}

export async function listLicenseKeys() {
  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    return local.licenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  await ensureLicenseTable();
  const rows = await sql`
    SELECT
      id,
      license_key,
      customer_name,
      customer_email,
      azure_api_key,
      azure_api_key_encrypted,
      apim_subscription_id,
      apim_status,
      tier,
      preferred_environment,
      status,
      notes,
      created_at,
      updated_at,
      last_validated_at
    FROM license_keys
    ORDER BY created_at DESC
  `;

  return (rows as Array<LicenseRow>).map(mapRowToLicenseRecord);
}

async function ensureUniqueLicenseKey(candidate: string) {
  const normalized = normalizeLicenseKey(candidate);
  if (!normalized || normalized.length !== 19) {
    throw new Error("Invalid license key format");
  }

  const existing = await findLicenseByKey(normalized);
  if (existing) {
    throw new Error("This license key already exists");
  }

  return normalized;
}

export async function createLicense(input: CreateLicenseInput) {
  const customerName = input.customerName.trim();
  if (!customerName) {
    throw new Error("Customer name is required");
  }

  const desiredKey = input.licenseKey?.trim();
  let licenseKey = "";

  if (desiredKey) {
    licenseKey = await ensureUniqueLicenseKey(desiredKey);
  } else {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const generated = buildLicenseKey();
      if (!(await findLicenseByKey(generated))) {
        licenseKey = generated;
        break;
      }
    }
  }

  if (!licenseKey) {
    throw new Error("Unable to generate a unique license key");
  }

  const record: LicenseRecord = {
    id: buildId(),
    licenseKey,
    customerName,
    customerEmail: input.customerEmail?.trim() || undefined,
    azureApiKey: input.azureApiKey?.trim() || undefined,
    apimSubscriptionId: input.apimSubscriptionId?.trim() || undefined,
    apimStatus: input.apimStatus,
    tier: input.tier,
    preferredEnvironment: input.preferredEnvironment,
    status: input.status ?? "active",
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    local.licenses.unshift(record);
    await writeLocalLicenseFile(local);
    return record;
  }

  await ensureLicenseTable();
  await sql`
    INSERT INTO license_keys (
      id,
      license_key,
      customer_name,
      customer_email,
      azure_api_key,
      azure_api_key_encrypted,
      apim_subscription_id,
      apim_status,
      tier,
      preferred_environment,
      status,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      ${record.id},
      ${record.licenseKey},
      ${record.customerName},
      ${record.customerEmail ?? null},
      ${
        record.azureApiKey
          ? process.env.CONFIG_ENCRYPTION_KEY
            ? encryptString(record.azureApiKey)
            : record.azureApiKey
          : null
      },
      ${Boolean(record.azureApiKey && process.env.CONFIG_ENCRYPTION_KEY)},
      ${record.apimSubscriptionId ?? null},
      ${record.apimStatus ?? null},
      ${record.tier},
      ${record.preferredEnvironment},
      ${record.status},
      ${record.notes ?? null},
      ${record.createdAt},
      ${record.updatedAt}
    )
  `;

  return record;
}

export async function updateLicenseStatus(id: string, status: LicenseStatus) {
  const licenseId = String(id ?? "").trim();
  if (!licenseId) {
    throw new Error("Missing license id");
  }

  if (status === "disabled") {
    const existing = await findLicenseById(licenseId);
    await deleteApimSubscription(existing?.apimSubscriptionId);
    await deleteApimSubscription(buildApimSubscriptionId(licenseId));
  }

  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    local.licenses = local.licenses.map((license) =>
      license.id === licenseId
        ? {
            ...license,
            status,
            azureApiKey: status === "active" ? license.azureApiKey : undefined,
            apimSubscriptionId: status === "active" ? license.apimSubscriptionId : undefined,
            apimStatus: status === "active" ? "active" : "cancelled",
            updatedAt: new Date().toISOString(),
          }
        : license,
    );
    await writeLocalLicenseFile(local);
    return;
  }

  await ensureLicenseTable();
  if (status === "active") {
    await sql`
      UPDATE license_keys
      SET
        status = ${status},
        apim_status = ${"active"},
        updated_at = now()
      WHERE id = ${licenseId}
    `;
    return;
  }

  await sql`
    UPDATE license_keys
    SET
      status = ${status},
      azure_api_key = ${null},
      azure_api_key_encrypted = false,
      apim_subscription_id = ${null},
      apim_status = ${"cancelled"},
      updated_at = now()
    WHERE id = ${licenseId}
  `;
}

export async function setLicenseApimCredentials(input: {
  id: string;
  apimKey: string;
  apimSubscriptionId: string;
  apimStatus?: "active" | "suspended" | "cancelled";
}) {
  const licenseId = String(input.id ?? "").trim();
  const apimKey = String(input.apimKey ?? "").trim();
  const apimSubscriptionId = String(input.apimSubscriptionId ?? "").trim();
  const apimStatus = input.apimStatus ?? "active";

  if (!licenseId || !apimKey || !apimSubscriptionId) {
    throw new Error("Missing APIM license credentials");
  }

  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    local.licenses = local.licenses.map((license) =>
      license.id === licenseId
        ? {
            ...license,
            azureApiKey: apimKey,
            apimSubscriptionId,
            apimStatus,
            updatedAt: new Date().toISOString(),
          }
        : license,
    );
    await writeLocalLicenseFile(local);
    return;
  }

  await ensureLicenseTable();
  await sql`
    UPDATE license_keys
    SET
      azure_api_key = ${
        process.env.CONFIG_ENCRYPTION_KEY ? encryptString(apimKey) : apimKey
      },
      azure_api_key_encrypted = ${Boolean(process.env.CONFIG_ENCRYPTION_KEY)},
      apim_subscription_id = ${apimSubscriptionId},
      apim_status = ${apimStatus},
      updated_at = now()
    WHERE id = ${licenseId}
  `;
}

export async function findLicenseById(id: string) {
  const licenseId = String(id ?? "").trim();
  if (!licenseId) {
    return null;
  }

  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    return local.licenses.find((license) => license.id === licenseId) ?? null;
  }

  await ensureLicenseTable();
  const rows = await sql`
    SELECT
      id,
      license_key,
      customer_name,
      customer_email,
      azure_api_key,
      azure_api_key_encrypted,
      apim_subscription_id,
      apim_status,
      tier,
      preferred_environment,
      status,
      notes,
      created_at,
      updated_at,
      last_validated_at
    FROM license_keys
    WHERE id = ${licenseId}
    LIMIT 1
  `;

  const row = (rows as Array<LicenseRow>)[0];
  return row ? mapRowToLicenseRecord(row) : null;
}

export async function deleteLicenseById(id: string) {
  const licenseId = String(id ?? "").trim();
  if (!licenseId) {
    throw new Error("Missing license id");
  }

  const existing = await findLicenseById(licenseId);
  await deleteApimSubscription(existing?.apimSubscriptionId);
  await deleteApimSubscription(buildApimSubscriptionId(licenseId));

  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    local.licenses = local.licenses.filter((license) => license.id !== licenseId);
    await writeLocalLicenseFile(local);
    return;
  }

  await ensureLicenseTable();
  await sql`
    DELETE FROM license_keys
    WHERE id = ${licenseId}
  `;
}

export async function updateLicenseDetails(id: string, input: UpdateLicenseInput) {
  const licenseId = String(id ?? "").trim();
  const customerName = input.customerName.trim();

  if (!licenseId) {
    throw new Error("Missing license id");
  }

  if (!customerName) {
    throw new Error("Customer name is required");
  }

  if (input.status === "disabled") {
    const existing = await findLicenseById(licenseId);
    await deleteApimSubscription(existing?.apimSubscriptionId);
    await deleteApimSubscription(buildApimSubscriptionId(licenseId));
  }

  const updatedAt = new Date().toISOString();
  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    local.licenses = local.licenses.map((license) =>
      license.id === licenseId
        ? {
            ...license,
            customerName,
            customerEmail: input.customerEmail?.trim() || undefined,
            tier: input.tier,
            preferredEnvironment: input.preferredEnvironment,
            status: input.status,
            azureApiKey: input.status === "active" ? license.azureApiKey : undefined,
            apimSubscriptionId:
              input.status === "active" ? license.apimSubscriptionId : undefined,
            apimStatus: input.status === "active" ? "active" : "cancelled",
            notes: input.notes?.trim() || undefined,
            updatedAt,
          }
        : license,
    );
    await writeLocalLicenseFile(local);
    return;
  }

  await ensureLicenseTable();
  if (input.status === "active") {
    await sql`
      UPDATE license_keys
      SET
        customer_name = ${customerName},
        customer_email = ${input.customerEmail?.trim() || null},
        tier = ${input.tier},
        preferred_environment = ${input.preferredEnvironment},
        status = ${input.status},
        apim_status = ${"active"},
        notes = ${input.notes?.trim() || null},
        updated_at = now()
      WHERE id = ${licenseId}
    `;
    return;
  }

  await sql`
    UPDATE license_keys
    SET
      customer_name = ${customerName},
      customer_email = ${input.customerEmail?.trim() || null},
      tier = ${input.tier},
      preferred_environment = ${input.preferredEnvironment},
      status = ${input.status},
      azure_api_key = ${null},
      azure_api_key_encrypted = false,
      apim_subscription_id = ${null},
      apim_status = ${"cancelled"},
      notes = ${input.notes?.trim() || null},
      updated_at = now()
    WHERE id = ${licenseId}
  `;
}

export async function findLicenseByKey(licenseKey: string) {
  const normalized = normalizeLicenseKey(licenseKey);
  if (!normalized) {
    return null;
  }

  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    return local.licenses.find((license) => license.licenseKey === normalized) ?? null;
  }

  await ensureLicenseTable();
  const rows = await sql`
    SELECT
      id,
      license_key,
      customer_name,
      customer_email,
      azure_api_key,
      azure_api_key_encrypted,
      apim_subscription_id,
      apim_status,
      tier,
      preferred_environment,
      status,
      notes,
      created_at,
      updated_at,
      last_validated_at
    FROM license_keys
    WHERE license_key = ${normalized}
    LIMIT 1
  `;

  const row = (rows as Array<LicenseRow>)[0];
  return row ? mapRowToLicenseRecord(row) : null;
}

export async function disableLicenseByKey(licenseKey: string) {
  const existing = await findLicenseByKey(licenseKey);
  if (!existing) {
    return false;
  }

  await updateLicenseStatus(existing.id, "disabled");
  return true;
}

export async function validateLicenseKey(licenseKey: string) {
  const normalized = normalizeLicenseKey(licenseKey);
  if (!normalized || normalized.length !== 19) {
    return { valid: false as const, reason: "invalid-format" as const };
  }

  const record = await findLicenseByKey(normalized);
  if (!record) {
    return { valid: false as const, reason: "not-found" as const };
  }

  if (record.status !== "active") {
    await updateLicenseStatus(record.id, "disabled");
    return { valid: false as const, reason: "not-found" as const };
  }

  const validatedAt = new Date().toISOString();
  const sql = getSql();

  if (!sql) {
    const local = await readLocalLicenseFile();
    local.licenses = local.licenses.map((license) =>
      license.id === record.id ? { ...license, lastValidatedAt: validatedAt } : license,
    );
    await writeLocalLicenseFile(local);
  } else {
    await ensureLicenseTable();
    await sql`
      UPDATE license_keys
      SET last_validated_at = ${validatedAt}, updated_at = now()
      WHERE id = ${record.id}
    `;
  }

  return {
    valid: true as const,
    customerName: record.customerName,
    licenseKey: record.licenseKey,
    azureApiKey: record.azureApiKey,
    preferredEnvironment: record.preferredEnvironment,
    tier: record.tier,
  };
}
