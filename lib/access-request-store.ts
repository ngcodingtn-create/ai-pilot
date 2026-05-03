import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSql } from "./db";
import { normalizeTunisiaWhatsappNumber } from "./whatsapp";

export type AccessRequestEnvironment = "codex" | "vscode-codex" | "t3code" | "opencode";
export type AccessRequestOs = "windows" | "linux" | "macos";
export type AccessRequestStatus = "pending" | "accepted";

export type AccessRequestRecord = {
  id: string;
  customerName: string;
  whatsappNumber: string;
  preferredEnvironment: AccessRequestEnvironment;
  requestedOs: AccessRequestOs;
  status: AccessRequestStatus;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  generatedLicenseKey?: string;
  generatedLicenseId?: string;
};

type LocalAccessRequestFile = {
  requests: AccessRequestRecord[];
};

type AccessRequestRow = {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  preferred_environment: AccessRequestEnvironment;
  requested_os: AccessRequestOs;
  status: AccessRequestStatus;
  created_at: string | Date;
  updated_at: string | Date;
  accepted_at: string | Date | null;
  generated_license_key: string | null;
  generated_license_id: string | null;
};

const LOCAL_ACCESS_REQUEST_RELATIVE_PATH = ".opencode/access-requests.json";
const LOCAL_ACCESS_REQUEST_PATH = path.resolve(
  process.cwd(),
  LOCAL_ACCESS_REQUEST_RELATIVE_PATH,
);

function buildId() {
  return randomBytes(12).toString("hex");
}

function normalizePhoneKey(phone: string) {
  return String(phone ?? "").replace(/[^\d]/g, "");
}

function normalizePhoneSuffix(phone: string) {
  const normalized = normalizePhoneKey(phone);
  return normalized.length >= 8 ? normalized.slice(-8) : normalized;
}

function samePhoneIdentity(left: string, right: string) {
  const leftNormalized = normalizePhoneKey(left);
  const rightNormalized = normalizePhoneKey(right);

  if (!leftNormalized || !rightNormalized) {
    return false;
  }

  return (
    leftNormalized === rightNormalized ||
    normalizePhoneSuffix(leftNormalized) === normalizePhoneSuffix(rightNormalized)
  );
}

function mapRowToAccessRequest(row: AccessRequestRow): AccessRequestRecord {
  return {
    id: row.id,
    customerName: row.customer_name,
    whatsappNumber: row.whatsapp_number,
    preferredEnvironment: row.preferred_environment,
    requestedOs: row.requested_os,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : undefined,
    generatedLicenseKey: row.generated_license_key ?? undefined,
    generatedLicenseId: row.generated_license_id ?? undefined,
  };
}

async function readLocalAccessRequestFile(): Promise<LocalAccessRequestFile> {
  try {
    const raw = await readFile(LOCAL_ACCESS_REQUEST_PATH, "utf8");
    return JSON.parse(raw) as LocalAccessRequestFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { requests: [] };
    }

    throw error;
  }
}

async function writeLocalAccessRequestFile(payload: LocalAccessRequestFile) {
  await mkdir(path.dirname(LOCAL_ACCESS_REQUEST_PATH), { recursive: true });
  await writeFile(
    LOCAL_ACCESS_REQUEST_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

export async function ensureAccessRequestTable() {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS access_requests (
      id text PRIMARY KEY,
      customer_name text NOT NULL,
      whatsapp_number text NOT NULL,
      preferred_environment text NOT NULL,
      requested_os text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      accepted_at timestamptz,
      generated_license_key text,
      generated_license_id text
    )
  `;
}

export async function createAccessRequest(input: {
  customerName: string;
  whatsappNumber: string;
  preferredEnvironment: AccessRequestEnvironment;
  requestedOs: AccessRequestOs;
}) {
  const customerName = String(input.customerName ?? "").trim();
  const normalizedWhatsapp = normalizeTunisiaWhatsappNumber(
    String(input.whatsappNumber ?? ""),
  );

  if (!customerName) {
    throw new Error("Le nom est requis.");
  }

  if (!normalizedWhatsapp) {
    throw new Error(
      "Le numéro WhatsApp est invalide. Entrez un numéro tunisien valide, par exemple +216 29 293 038.",
    );
  }

  const record: AccessRequestRecord = {
    id: buildId(),
    customerName,
    whatsappNumber: normalizedWhatsapp.e164,
    preferredEnvironment: input.preferredEnvironment,
    requestedOs: input.requestedOs,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sql = getSql();
  if (!sql) {
    const local = await readLocalAccessRequestFile();
    local.requests.unshift(record);
    await writeLocalAccessRequestFile(local);
    return record;
  }

  await ensureAccessRequestTable();
  await sql`
    INSERT INTO access_requests (
      id,
      customer_name,
      whatsapp_number,
      preferred_environment,
      requested_os,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${record.id},
      ${record.customerName},
      ${record.whatsappNumber},
      ${record.preferredEnvironment},
      ${record.requestedOs},
      ${record.status},
      ${record.createdAt},
      ${record.updatedAt}
    )
  `;

  return record;
}

export async function upsertPendingAccessRequest(input: {
  customerName: string;
  whatsappNumber: string;
  preferredEnvironment: AccessRequestEnvironment;
  requestedOs: AccessRequestOs;
}) {
  const customerName = String(input.customerName ?? "").trim();
  const normalizedWhatsapp = normalizeTunisiaWhatsappNumber(
    String(input.whatsappNumber ?? ""),
  );

  if (!customerName) {
    throw new Error("Le nom est requis.");
  }

  if (!normalizedWhatsapp) {
    throw new Error(
      "Le numéro WhatsApp est invalide. Entrez un numéro tunisien valide, par exemple +216 29 293 038.",
    );
  }

  const now = new Date().toISOString();
  const sql = getSql();

  if (!sql) {
    const local = await readLocalAccessRequestFile();
    const existingIndex = local.requests.findIndex(
      (request) =>
        request.status === "pending" &&
        samePhoneIdentity(request.whatsappNumber, normalizedWhatsapp.waId),
    );

    if (existingIndex >= 0) {
      const existing = local.requests[existingIndex];
      const updated: AccessRequestRecord = {
        ...existing,
        customerName,
        whatsappNumber: normalizedWhatsapp.e164,
        preferredEnvironment: input.preferredEnvironment,
        requestedOs: input.requestedOs,
        updatedAt: now,
      };
      local.requests.splice(existingIndex, 1);
      local.requests.unshift(updated);
      await writeLocalAccessRequestFile(local);
      return updated;
    }

    const record: AccessRequestRecord = {
      id: buildId(),
      customerName,
      whatsappNumber: normalizedWhatsapp.e164,
      preferredEnvironment: input.preferredEnvironment,
      requestedOs: input.requestedOs,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    local.requests.unshift(record);
    await writeLocalAccessRequestFile(local);
    return record;
  }

  await ensureAccessRequestTable();
  const normalized = normalizePhoneKey(normalizedWhatsapp.waId);
  const suffix = normalizePhoneSuffix(normalizedWhatsapp.waId);
  const existingRows = await sql`
    SELECT
      id,
      customer_name,
      whatsapp_number,
      preferred_environment,
      requested_os,
      status,
      created_at,
      updated_at,
      accepted_at,
      generated_license_key,
      generated_license_id
    FROM access_requests
    WHERE
      status = 'pending'
      AND (
        regexp_replace(whatsapp_number, '[^0-9]', '', 'g') = ${normalized}
        OR right(regexp_replace(whatsapp_number, '[^0-9]', '', 'g'), 8) = ${suffix}
      )
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const existing = (existingRows as Array<AccessRequestRow>)[0];
  if (existing) {
    const rows = await sql`
      UPDATE access_requests
      SET
        customer_name = ${customerName},
        whatsapp_number = ${normalizedWhatsapp.e164},
        preferred_environment = ${input.preferredEnvironment},
        requested_os = ${input.requestedOs},
        updated_at = now()
      WHERE id = ${existing.id}
      RETURNING
        id,
        customer_name,
        whatsapp_number,
        preferred_environment,
        requested_os,
        status,
        created_at,
        updated_at,
        accepted_at,
        generated_license_key,
        generated_license_id
    `;

    return mapRowToAccessRequest((rows as Array<AccessRequestRow>)[0]);
  }

  return createAccessRequest({
    customerName,
    whatsappNumber: normalizedWhatsapp.e164,
    preferredEnvironment: input.preferredEnvironment,
    requestedOs: input.requestedOs,
  });
}

export async function listAccessRequests() {
  const sql = getSql();
  if (!sql) {
    const local = await readLocalAccessRequestFile();
    return local.requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  await ensureAccessRequestTable();
  const rows = await sql`
    SELECT
      id,
      customer_name,
      whatsapp_number,
      preferred_environment,
      requested_os,
      status,
      created_at,
      updated_at,
      accepted_at,
      generated_license_key,
      generated_license_id
    FROM access_requests
    ORDER BY created_at DESC
  `;

  return (rows as Array<AccessRequestRow>).map(mapRowToAccessRequest);
}

export async function findAccessRequestById(id: string) {
  const requestId = String(id ?? "").trim();
  if (!requestId) {
    return null;
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalAccessRequestFile();
    return local.requests.find((request) => request.id === requestId) ?? null;
  }

  await ensureAccessRequestTable();
  const rows = await sql`
    SELECT
      id,
      customer_name,
      whatsapp_number,
      preferred_environment,
      requested_os,
      status,
      created_at,
      updated_at,
      accepted_at,
      generated_license_key,
      generated_license_id
    FROM access_requests
    WHERE id = ${requestId}
    LIMIT 1
  `;

  const row = (rows as Array<AccessRequestRow>)[0];
  return row ? mapRowToAccessRequest(row) : null;
}

export async function deleteAccessRequestById(id: string) {
  const requestId = String(id ?? "").trim();
  if (!requestId) {
    throw new Error("Missing access request id");
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalAccessRequestFile();
    local.requests = local.requests.filter((request) => request.id !== requestId);
    await writeLocalAccessRequestFile(local);
    return;
  }

  await ensureAccessRequestTable();
  await sql`
    DELETE FROM access_requests
    WHERE id = ${requestId}
  `;
}

export async function deleteAccessRequestsByPhone(phone: string) {
  const normalized = normalizePhoneKey(phone);
  const suffix = normalizePhoneSuffix(phone);
  if (!normalized) {
    return;
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalAccessRequestFile();
    local.requests = local.requests.filter(
      (request) => !samePhoneIdentity(request.whatsappNumber, normalized),
    );
    await writeLocalAccessRequestFile(local);
    return;
  }

  await ensureAccessRequestTable();
  await sql`
    DELETE FROM access_requests
    WHERE
      regexp_replace(whatsapp_number, '[^0-9]', '', 'g') = ${normalized}
      OR right(regexp_replace(whatsapp_number, '[^0-9]', '', 'g'), 8) = ${suffix}
  `;
}

export async function acceptAccessRequest(input: {
  requestId: string;
  generatedLicenseKey: string;
  generatedLicenseId: string;
}) {
  const requestId = String(input.requestId ?? "").trim();
  if (!requestId) {
    throw new Error("Missing access request id");
  }

  const acceptedAt = new Date().toISOString();
  const sql = getSql();
  if (!sql) {
    const local = await readLocalAccessRequestFile();
    local.requests = local.requests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            status: "accepted",
            acceptedAt,
            generatedLicenseKey: input.generatedLicenseKey,
            generatedLicenseId: input.generatedLicenseId,
            updatedAt: acceptedAt,
          }
        : request,
    );
    await writeLocalAccessRequestFile(local);
    return;
  }

  await ensureAccessRequestTable();
  await sql`
    UPDATE access_requests
    SET
      status = 'accepted',
      accepted_at = ${acceptedAt},
      generated_license_key = ${input.generatedLicenseKey},
      generated_license_id = ${input.generatedLicenseId},
      updated_at = now()
    WHERE id = ${requestId}
  `;
}
