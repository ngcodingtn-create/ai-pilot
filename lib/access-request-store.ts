import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSql } from "./db";

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

function normalizeWhatsappNumber(value: string) {
  return value.replace(/[^\d+]/g, "").slice(0, 24);
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
  const whatsappNumber = normalizeWhatsappNumber(String(input.whatsappNumber ?? ""));

  if (!customerName) {
    throw new Error("Le nom est requis.");
  }

  if (whatsappNumber.length < 8) {
    throw new Error("Le numéro WhatsApp est invalide.");
  }

  const record: AccessRequestRecord = {
    id: buildId(),
    customerName,
    whatsappNumber,
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
