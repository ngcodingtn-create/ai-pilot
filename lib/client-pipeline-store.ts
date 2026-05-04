import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSql } from "./db";
import { normalizeTunisiaWhatsappNumber } from "./whatsapp";
import {
  createLicense,
  deleteLicenseById,
  disableLicenseByKey,
  findLicenseByKey,
  updateLicenseStatus,
  type LicenseEnvironment,
  type LicenseTier,
} from "./license-store";
import {
  createApimSubscription,
  deleteApimSubscription,
  setApimSubscriptionState,
  type ApimSubscriptionState,
} from "./apim";

export type ClientStatus = "lead" | "trial" | "paid" | "expired" | "cancelled" | "lost";
export type ClientLicenseType = "trial" | "paid";
export type FacebookEventName = "Lead" | "StartTrial" | "Purchase" | "InitiateCheckout";

export type PipelineClientRecord = {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
  adSource?: string;
  fbclid?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  utmTerm?: string;
  landingUrl?: string;
  referrer?: string;
  status: ClientStatus;
  leadAt: string;
  trialAt?: string;
  trialEndsAt?: string;
  paidAt?: string;
  licenseKey?: string;
  licenseType?: ClientLicenseType;
  licenseExpiresAt?: string;
  apimSubscriptionId?: string;
  apimStatus?: ApimSubscriptionState;
  apimTier?: string;
  apimKey?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type PipelineLicenseRecord = {
  id: string;
  clientId: string;
  key: string;
  type: ClientLicenseType;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  activatedAt?: string;
  revokedAt?: string;
};

export type FbEventRecord = {
  id: string;
  clientId: string;
  eventName: FacebookEventName;
  fbResponse: unknown;
  sentAt: string;
};

type ActivateTrialOptions = {
  clientId: string;
  tier?: LicenseTier;
  preferredEnvironment?: LicenseEnvironment;
  trialHours?: number;
  isActive?: boolean;
  markStatus?: ClientStatus;
};

type ClientRow = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  fbp: string | null;
  fbc: string | null;
  ip: string | null;
  user_agent: string | null;
  ad_source: string | null;
  fbclid: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_url: string | null;
  referrer: string | null;
  status: ClientStatus;
  lead_at: string | Date;
  trial_at: string | Date | null;
  trial_ends_at: string | Date | null;
  paid_at: string | Date | null;
  license_key: string | null;
  license_type: ClientLicenseType | null;
  license_expires_at: string | Date | null;
  apim_subscription_id?: string | null;
  apim_status?: ApimSubscriptionState | null;
  apim_tier?: string | null;
  apim_key?: string | null;
  payment_date?: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type PipelineLicenseRow = {
  id: string;
  client_id: string;
  key: string;
  type: ClientLicenseType;
  created_at: string | Date;
  expires_at: string | Date | null;
  is_active: boolean;
  activated_at: string | Date | null;
  revoked_at: string | Date | null;
};

type LocalPipelineFile = {
  clients: PipelineClientRecord[];
  licenses: PipelineLicenseRecord[];
  fbEvents: FbEventRecord[];
};

type TrialLeadLegacyRow = {
  id: string;
  name: string;
  whatsapp_number: string;
  created_at: string | Date;
};

type UpsertLeadInput = {
  name?: string;
  phone: string;
  email?: string;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
  adSource?: string;
  fbclid?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  utmTerm?: string;
  landingUrl?: string;
  referrer?: string;
};

const LOCAL_PIPELINE_RELATIVE_PATH = ".opencode/client-pipeline.json";
const LOCAL_PIPELINE_PATH = path.resolve(process.cwd(), LOCAL_PIPELINE_RELATIVE_PATH);
const DEFAULT_TRIAL_HOURS = 24;

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

function toIso(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString() : undefined;
}

function mapClientRow(row: ClientRow): PipelineClientRecord {
  return {
    id: row.id,
    name: row.name ?? undefined,
    phone: row.phone,
    email: row.email ?? undefined,
    fbp: row.fbp ?? undefined,
    fbc: row.fbc ?? undefined,
    ip: row.ip ?? undefined,
    userAgent: row.user_agent ?? undefined,
    adSource: row.ad_source ?? undefined,
    fbclid: row.fbclid ?? undefined,
    utmSource: row.utm_source ?? undefined,
    utmCampaign: row.utm_campaign ?? undefined,
    utmMedium: row.utm_medium ?? undefined,
    utmContent: row.utm_content ?? undefined,
    utmTerm: row.utm_term ?? undefined,
    landingUrl: row.landing_url ?? undefined,
    referrer: row.referrer ?? undefined,
    status: row.status,
    leadAt: new Date(row.lead_at).toISOString(),
    trialAt: toIso(row.trial_at),
    trialEndsAt: toIso(row.trial_ends_at),
    paidAt: toIso(row.paid_at),
    licenseKey: row.license_key ?? undefined,
    licenseType: row.license_type ?? undefined,
    licenseExpiresAt: toIso(row.license_expires_at),
    apimSubscriptionId: row.apim_subscription_id ?? undefined,
    apimStatus: row.apim_status ?? undefined,
    apimTier: row.apim_tier ?? undefined,
    apimKey: row.apim_key ?? undefined,
    paymentDate: toIso(row.payment_date),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function attachLicenseSecretToClient(client: PipelineClientRecord) {
  if (!client.licenseKey) {
    return client;
  }

  const license = await findLicenseByKey(client.licenseKey);
  return {
    ...client,
    apimKey: license?.azureApiKey,
    apimSubscriptionId: client.apimSubscriptionId ?? license?.apimSubscriptionId,
    apimStatus: client.apimStatus ?? license?.apimStatus,
  };
}

function mapLicenseRow(row: PipelineLicenseRow): PipelineLicenseRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    key: row.key,
    type: row.type,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: toIso(row.expires_at),
    isActive: row.is_active,
    activatedAt: toIso(row.activated_at),
    revokedAt: toIso(row.revoked_at),
  };
}

async function readLocalPipelineFile(): Promise<LocalPipelineFile> {
  try {
    const raw = await readFile(LOCAL_PIPELINE_PATH, "utf8");
    return JSON.parse(raw) as LocalPipelineFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { clients: [], licenses: [], fbEvents: [] };
    }

    throw error;
  }
}

async function writeLocalPipelineFile(payload: LocalPipelineFile) {
  await mkdir(path.dirname(LOCAL_PIPELINE_PATH), { recursive: true });
  await writeFile(LOCAL_PIPELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function findMatchingSqlClientByPhone(phone: string) {
  const sql = getSql();
  if (!sql) {
    return null;
  }

  await ensurePipelineTables();
  const normalized = normalizePhoneKey(phone);
  const suffix = normalizePhoneSuffix(phone);
  const rows = await sql`
    SELECT
      id,
      name,
      phone,
      email,
      fbp,
      fbc,
      ip,
      user_agent,
      ad_source,
      fbclid,
      utm_source,
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      landing_url,
      referrer,
      status,
      lead_at,
      trial_at,
      trial_ends_at,
      paid_at,
      license_key,
      license_type,
      license_expires_at,
      apim_subscription_id,
      apim_status,
      apim_tier,
      payment_date,
      created_at,
      updated_at
    FROM clients
    WHERE
      regexp_replace(phone, '[^0-9]', '', 'g') = ${normalized}
      OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${suffix}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const row = (rows as Array<ClientRow>)[0];
  return row ? mapClientRow(row) : null;
}

async function syncLegacyTrialLeadsIntoPipeline() {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await ensurePipelineTables();
  await sql`
    CREATE TABLE IF NOT EXISTS trial_leads (
      id text PRIMARY KEY,
      name text NOT NULL,
      whatsapp_number text NOT NULL,
      fbclid text,
      utm_source text,
      utm_campaign text,
      utm_medium text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const rows = await sql`
    SELECT id, name, whatsapp_number, created_at
    FROM trial_leads
    ORDER BY created_at ASC
  `;

  for (const row of rows as Array<TrialLeadLegacyRow>) {
    const normalized = normalizeTunisiaWhatsappNumber(row.whatsapp_number);
    if (!normalized) {
      continue;
    }

    const existing = await findMatchingSqlClientByPhone(normalized.waId);
    if (existing) {
      continue;
    }

    const createdAt = new Date(row.created_at).toISOString();
    await sql`
      INSERT INTO clients (
        id,
        name,
        phone,
        status,
        lead_at,
        created_at,
        updated_at
      )
      VALUES (
        ${`lead_${row.id.toLowerCase()}`},
        ${row.name},
        ${normalized.waId},
        ${"lead"},
        ${createdAt},
        ${createdAt},
        ${createdAt}
      )
      ON CONFLICT (phone) DO NOTHING
    `;
  }
}

function getTrialExpiry(hours = DEFAULT_TRIAL_HOURS) {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

export async function ensurePipelineTables() {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id text PRIMARY KEY,
      name text,
      phone text UNIQUE NOT NULL,
      email text,
      fbp text,
      fbc text,
      ip text,
      user_agent text,
      ad_source text,
      fbclid text,
      utm_source text,
      utm_campaign text,
      utm_medium text,
      utm_content text,
      utm_term text,
      landing_url text,
      referrer text,
      status text NOT NULL DEFAULT 'lead',
      lead_at timestamptz NOT NULL DEFAULT now(),
      trial_at timestamptz,
      trial_ends_at timestamptz,
      paid_at timestamptz,
      license_key text,
      license_type text,
      license_expires_at timestamptz,
      apim_subscription_id text,
      apim_status text,
      apim_tier text,
      payment_date timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS fbclid text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_source text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_campaign text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_medium text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_content text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS utm_term text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS landing_url text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS referrer text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS apim_subscription_id text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS apim_status text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS apim_tier text`;
  await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_date timestamptz`;

  await sql`
    CREATE TABLE IF NOT EXISTS fb_events (
      id text PRIMARY KEY,
      client_id text REFERENCES clients(id) ON DELETE CASCADE,
      event_name text NOT NULL,
      fb_response jsonb,
      sent_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS licenses (
      id text PRIMARY KEY,
      client_id text REFERENCES clients(id) ON DELETE CASCADE,
      key text UNIQUE NOT NULL,
      type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      activated_at timestamptz,
      revoked_at timestamptz
    )
  `;
}

export async function listPipelineClients() {
  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    return Promise.all(
      [...local.clients]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(attachLicenseSecretToClient),
    );
  }

  await syncLegacyTrialLeadsIntoPipeline();
  await ensurePipelineTables();
  const rows = await sql`
    SELECT
      id,
      name,
      phone,
      email,
      fbp,
      fbc,
      ip,
      user_agent,
      ad_source,
      fbclid,
      utm_source,
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      landing_url,
      referrer,
      status,
      lead_at,
      trial_at,
      trial_ends_at,
      paid_at,
      license_key,
      license_type,
      license_expires_at,
      apim_subscription_id,
      apim_status,
      apim_tier,
      payment_date,
      created_at,
      updated_at
    FROM clients
    ORDER BY created_at DESC
  `;

  return Promise.all((rows as Array<ClientRow>).map(mapClientRow).map(attachLicenseSecretToClient));
}

export async function getPipelineClientById(id: string) {
  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    const client = local.clients.find((client) => client.id === id) ?? null;
    return client ? attachLicenseSecretToClient(client) : null;
  }

  await syncLegacyTrialLeadsIntoPipeline();
  await ensurePipelineTables();
  const rows = await sql`
    SELECT
      id,
      name,
      phone,
      email,
      fbp,
      fbc,
      ip,
      user_agent,
      ad_source,
      fbclid,
      utm_source,
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      landing_url,
      referrer,
      status,
      lead_at,
      trial_at,
      trial_ends_at,
      paid_at,
      license_key,
      license_type,
      license_expires_at,
      apim_subscription_id,
      apim_status,
      apim_tier,
      payment_date,
      created_at,
      updated_at
    FROM clients
    WHERE id = ${id}
    LIMIT 1
  `;

  const row = (rows as Array<ClientRow>)[0];
  return row ? attachLicenseSecretToClient(mapClientRow(row)) : null;
}

export async function getPipelineClientByLicenseKey(licenseKey: string) {
  const normalized = String(licenseKey ?? "").trim();
  if (!normalized) {
    return null;
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    const client = local.clients.find((client) => client.licenseKey === normalized) ?? null;
    return client ? attachLicenseSecretToClient(client) : null;
  }

  await syncLegacyTrialLeadsIntoPipeline();
  await ensurePipelineTables();
  const rows = await sql`
    SELECT
      id,
      name,
      phone,
      email,
      fbp,
      fbc,
      ip,
      user_agent,
      ad_source,
      fbclid,
      utm_source,
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      landing_url,
      referrer,
      status,
      lead_at,
      trial_at,
      trial_ends_at,
      paid_at,
      license_key,
      license_type,
      license_expires_at,
      apim_subscription_id,
      apim_status,
      apim_tier,
      payment_date,
      created_at,
      updated_at
    FROM clients
    WHERE license_key = ${normalized}
    LIMIT 1
  `;

  const row = (rows as Array<ClientRow>)[0];
  return row ? attachLicenseSecretToClient(mapClientRow(row)) : null;
}

export async function getPipelineClientByPhone(phone: string) {
  const normalized = normalizePhoneKey(phone);
  if (!normalized) {
    return null;
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    return local.clients.find((client) => samePhoneIdentity(client.phone, normalized)) ?? null;
  }

  await syncLegacyTrialLeadsIntoPipeline();
  return findMatchingSqlClientByPhone(normalized);
}

export async function upsertLeadClient(input: UpsertLeadInput) {
  const phone = normalizePhoneKey(input.phone);
  if (!phone) {
    throw new Error("Phone is required");
  }

  const name = String(input.name ?? "").trim() || undefined;
  const email = String(input.email ?? "").trim() || undefined;
  const fbp = String(input.fbp ?? "").trim() || undefined;
  const fbc = String(input.fbc ?? "").trim() || undefined;
  const ip = String(input.ip ?? "").trim() || undefined;
  const userAgent = String(input.userAgent ?? "").trim() || undefined;
  const adSource = String(input.adSource ?? "").trim() || undefined;
  const fbclid = String(input.fbclid ?? "").trim() || undefined;
  const utmSource = String(input.utmSource ?? "").trim() || undefined;
  const utmCampaign = String(input.utmCampaign ?? "").trim() || undefined;
  const utmMedium = String(input.utmMedium ?? "").trim() || undefined;
  const utmContent = String(input.utmContent ?? "").trim() || undefined;
  const utmTerm = String(input.utmTerm ?? "").trim() || undefined;
  const landingUrl = String(input.landingUrl ?? "").trim() || undefined;
  const referrer = String(input.referrer ?? "").trim() || undefined;
  const now = new Date().toISOString();

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    const existingIndex = local.clients.findIndex((client) =>
      samePhoneIdentity(client.phone, phone),
    );

    if (existingIndex >= 0) {
      const existing = local.clients[existingIndex];
      const next: PipelineClientRecord = {
        ...existing,
        name: name ?? existing.name,
        email: email ?? existing.email,
        fbp: fbp ?? existing.fbp,
        fbc: fbc ?? existing.fbc,
        ip: ip ?? existing.ip,
        userAgent: userAgent ?? existing.userAgent,
        adSource: adSource ?? existing.adSource,
        fbclid: fbclid ?? existing.fbclid,
        utmSource: utmSource ?? existing.utmSource,
        utmCampaign: utmCampaign ?? existing.utmCampaign,
        utmMedium: utmMedium ?? existing.utmMedium,
        utmContent: utmContent ?? existing.utmContent,
        utmTerm: utmTerm ?? existing.utmTerm,
        landingUrl: landingUrl ?? existing.landingUrl,
        referrer: referrer ?? existing.referrer,
        updatedAt: now,
      };
      local.clients[existingIndex] = next;
      await writeLocalPipelineFile(local);
      return next;
    }

    const record: PipelineClientRecord = {
      id: buildId(),
      name,
      phone,
      email,
      fbp,
      fbc,
      ip,
      userAgent,
      adSource,
      fbclid,
      utmSource,
      utmCampaign,
      utmMedium,
      utmContent,
      utmTerm,
      landingUrl,
      referrer,
      status: "lead",
      leadAt: now,
      createdAt: now,
      updatedAt: now,
    };

    local.clients.unshift(record);
    await writeLocalPipelineFile(local);
    return record;
  }

  await syncLegacyTrialLeadsIntoPipeline();
  await ensurePipelineTables();

  const existing = await findMatchingSqlClientByPhone(phone);
  if (!existing) {
    const recordId = buildId();
    const rows = await sql`
      INSERT INTO clients (
        id,
        name,
        phone,
        email,
        fbp,
        fbc,
        ip,
        user_agent,
        ad_source,
        fbclid,
        utm_source,
        utm_campaign,
        utm_medium,
        utm_content,
        utm_term,
        landing_url,
        referrer,
        status,
        lead_at,
        created_at,
        updated_at
      )
      VALUES (
        ${recordId},
        ${name ?? null},
        ${phone},
        ${email ?? null},
        ${fbp ?? null},
        ${fbc ?? null},
        ${ip ?? null},
        ${userAgent ?? null},
        ${adSource ?? null},
        ${fbclid ?? null},
        ${utmSource ?? null},
        ${utmCampaign ?? null},
        ${utmMedium ?? null},
        ${utmContent ?? null},
        ${utmTerm ?? null},
        ${landingUrl ?? null},
        ${referrer ?? null},
        ${"lead"},
        ${now},
        ${now},
        ${now}
      )
      RETURNING
        id,
        name,
        phone,
        email,
        fbp,
        fbc,
        ip,
        user_agent,
        ad_source,
        fbclid,
        utm_source,
        utm_campaign,
        utm_medium,
        utm_content,
        utm_term,
        landing_url,
        referrer,
        status,
        lead_at,
        trial_at,
        trial_ends_at,
        paid_at,
        license_key,
        license_type,
        license_expires_at,
        apim_subscription_id,
        apim_status,
        apim_tier,
        payment_date,
        created_at,
        updated_at
    `;

    return mapClientRow((rows as Array<ClientRow>)[0]);
  }

  const rows = await sql`
    UPDATE clients
    SET
      name = COALESCE(${name ?? null}, name),
      email = COALESCE(${email ?? null}, email),
      fbp = COALESCE(${fbp ?? null}, fbp),
      fbc = COALESCE(${fbc ?? null}, fbc),
      ip = COALESCE(${ip ?? null}, ip),
      user_agent = COALESCE(${userAgent ?? null}, user_agent),
      ad_source = COALESCE(${adSource ?? null}, ad_source),
      fbclid = COALESCE(${fbclid ?? null}, fbclid),
      utm_source = COALESCE(${utmSource ?? null}, utm_source),
      utm_campaign = COALESCE(${utmCampaign ?? null}, utm_campaign),
      utm_medium = COALESCE(${utmMedium ?? null}, utm_medium),
      utm_content = COALESCE(${utmContent ?? null}, utm_content),
      utm_term = COALESCE(${utmTerm ?? null}, utm_term),
      landing_url = COALESCE(${landingUrl ?? null}, landing_url),
      referrer = COALESCE(${referrer ?? null}, referrer),
      updated_at = now()
    WHERE id = ${existing.id}
    RETURNING
      id,
      name,
      phone,
      email,
      fbp,
      fbc,
      ip,
      user_agent,
      ad_source,
      fbclid,
      utm_source,
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      landing_url,
      referrer,
      status,
      lead_at,
      trial_at,
      trial_ends_at,
      paid_at,
      license_key,
      license_type,
      license_expires_at,
      apim_subscription_id,
      apim_status,
      apim_tier,
      payment_date,
      created_at,
      updated_at
  `;

  return mapClientRow((rows as Array<ClientRow>)[0]);
}

export async function recordFacebookEvent(input: {
  clientId: string;
  eventName: FacebookEventName;
  fbResponse: unknown;
}) {
  const sql = getSql();
  const now = new Date().toISOString();
  const record: FbEventRecord = {
    id: buildId(),
    clientId: input.clientId,
    eventName: input.eventName,
    fbResponse: input.fbResponse,
    sentAt: now,
  };

  if (!sql) {
    const local = await readLocalPipelineFile();
    local.fbEvents.unshift(record);
    await writeLocalPipelineFile(local);
    return record;
  }

  await ensurePipelineTables();
  await sql`
    INSERT INTO fb_events (id, client_id, event_name, fb_response, sent_at)
    VALUES (${record.id}, ${record.clientId}, ${record.eventName}, ${JSON.stringify(record.fbResponse ?? null)}, ${record.sentAt})
  `;
  return record;
}

export async function listRecentFacebookEvents(limit = 25) {
  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    return local.fbEvents
      .slice()
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, limit);
  }

  await ensurePipelineTables();
  const rows = await sql`
    SELECT
      id,
      client_id,
      event_name,
      fb_response,
      sent_at
    FROM fb_events
    ORDER BY sent_at DESC
    LIMIT ${limit}
  `;

  return (rows as Array<{
    id: string;
    client_id: string;
    event_name: FacebookEventName;
    fb_response: unknown;
    sent_at: string | Date;
  }>).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    eventName: row.event_name,
    fbResponse: row.fb_response,
    sentAt: new Date(row.sent_at).toISOString(),
  }));
}

async function deactivateClientLicenses(clientId: string, currentLicenseKey?: string) {
  const sql = getSql();
  const now = new Date().toISOString();

  if (!sql) {
    const local = await readLocalPipelineFile();
    local.licenses = local.licenses.map((license) =>
      license.clientId === clientId && license.isActive
        ? { ...license, isActive: false, revokedAt: now }
        : license,
    );
    await writeLocalPipelineFile(local);
  } else {
    await ensurePipelineTables();
    await sql`
      UPDATE licenses
      SET is_active = false, revoked_at = now()
      WHERE client_id = ${clientId} AND is_active = true
    `;
  }

  if (currentLicenseKey) {
    await disableLicenseByKey(currentLicenseKey);
  }
}

async function listLifecycleLicensesForClient(clientId: string) {
  const sql = getSql();

  if (!sql) {
    const local = await readLocalPipelineFile();
    return local.licenses.filter((license) => license.clientId === clientId);
  }

  await ensurePipelineTables();
  const rows = await sql`
    SELECT
      id,
      client_id,
      key,
      type,
      created_at,
      expires_at,
      is_active,
      activated_at,
      revoked_at
    FROM licenses
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC
  `;

  return (rows as Array<PipelineLicenseRow>).map(mapLicenseRow);
}

async function provisionApimForClient(client: PipelineClientRecord) {
  if (client.apimSubscriptionId && client.apimKey) {
    await setApimSubscriptionState(client.apimSubscriptionId, "active");
    return {
      subscriptionId: client.apimSubscriptionId,
      primaryKey: client.apimKey,
      state: "active" as const,
    };
  }

  return createApimSubscription({
    clientId: client.id,
    displayName: client.name?.trim() || client.phone,
  });
}

async function findClientApimSubscriptionId(client: PipelineClientRecord) {
  if (client.apimSubscriptionId) {
    return client.apimSubscriptionId;
  }

  if (!client.licenseKey) {
    return undefined;
  }

  const license = await findLicenseByKey(client.licenseKey);
  return license?.apimSubscriptionId;
}

export async function activateTrialForClient(input: ActivateTrialOptions) {
  const client = await getPipelineClientById(input.clientId);
  if (!client) {
    throw new Error("Client introuvable");
  }

  const trialIsActive = input.isActive ?? true;
  const nextStatus = input.markStatus ?? "trial";
  const existingLicenses = await listLifecycleLicensesForClient(client.id);
  const existingPendingTrial = existingLicenses.find(
    (license) => license.type === "trial" && !license.isActive && !license.activatedAt,
  );

  if (!trialIsActive && existingPendingTrial) {
    const existingInstallLicense = await findLicenseByKey(existingPendingTrial.key);

    if (existingInstallLicense?.status === "disabled") {
      const now = new Date().toISOString();
      const sql = getSql();

      if (!sql) {
        const local = await readLocalPipelineFile();
        local.clients = local.clients.map((record) =>
          record.id === client.id
            ? {
                ...record,
                status: nextStatus,
                licenseKey: existingPendingTrial.key,
                licenseType: "trial",
                trialAt: undefined,
                trialEndsAt: undefined,
                licenseExpiresAt: undefined,
                updatedAt: now,
              }
            : record,
        );
        await writeLocalPipelineFile(local);
      } else {
        await ensurePipelineTables();
        await sql`
          UPDATE clients
          SET
            status = ${nextStatus},
            license_key = ${existingPendingTrial.key},
            license_type = ${"trial"},
            trial_at = ${null},
            trial_ends_at = ${null},
            license_expires_at = ${null},
            updated_at = now()
          WHERE id = ${client.id}
        `;
      }

      return {
        clientId: client.id,
        licenseId: existingInstallLicense.id,
        licenseKey: existingPendingTrial.key,
        expiresAt: undefined,
        preferredEnvironment: input.preferredEnvironment ?? "codex",
        tier: input.tier ?? "pro",
        isActive: false,
      };
    }
  }

  await deactivateClientLicenses(client.id, client.licenseKey);

  const preferredEnvironment = input.preferredEnvironment ?? "codex";
  const tier = input.tier ?? "pro";
  const now = new Date().toISOString();
  const expiresAt = trialIsActive
    ? getTrialExpiry(input.trialHours ?? DEFAULT_TRIAL_HOURS).toISOString()
    : undefined;
  const apimSubscription = await provisionApimForClient(client);

  const installLicense = await createLicense({
    customerName: client.name?.trim() || client.phone,
    customerEmail: client.email,
    azureApiKey: apimSubscription.primaryKey,
    apimSubscriptionId: apimSubscription.subscriptionId,
    apimStatus: apimSubscription.state,
    tier,
    preferredEnvironment,
    status: trialIsActive ? "active" : "disabled",
    notes: trialIsActive
      ? `Lifecycle client ${client.id} — 24h trial`
      : `Lifecycle client ${client.id} — pending trial`,
  });

  const lifecycleLicense: PipelineLicenseRecord = {
    id: buildId(),
    clientId: client.id,
    key: installLicense.licenseKey,
    type: "trial",
    createdAt: now,
    expiresAt,
    isActive: trialIsActive,
    activatedAt: trialIsActive ? now : undefined,
  };

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    local.licenses.unshift(lifecycleLicense);
    local.clients = local.clients.map((record) =>
      record.id === client.id
        ? {
            ...record,
            status: nextStatus,
            trialAt: trialIsActive ? now : undefined,
            trialEndsAt: expiresAt,
            licenseKey: installLicense.licenseKey,
            licenseType: "trial",
            licenseExpiresAt: expiresAt,
            apimSubscriptionId: apimSubscription.subscriptionId,
            apimStatus: trialIsActive ? "active" : "suspended",
            apimTier: "aipilot-pro",
            updatedAt: now,
          }
        : record,
    );
    await writeLocalPipelineFile(local);
  } else {
    await ensurePipelineTables();
    await sql`
      INSERT INTO licenses (
        id,
        client_id,
        key,
        type,
        created_at,
        expires_at,
        is_active,
        activated_at
      )
      VALUES (
        ${lifecycleLicense.id},
        ${lifecycleLicense.clientId},
        ${lifecycleLicense.key},
        ${lifecycleLicense.type},
        ${lifecycleLicense.createdAt},
        ${expiresAt ?? null},
        ${trialIsActive},
        ${trialIsActive ? now : null}
      )
    `;

    await sql`
      UPDATE clients
      SET
        status = ${nextStatus},
        trial_at = ${trialIsActive ? now : null},
        trial_ends_at = ${expiresAt ?? null},
        license_key = ${installLicense.licenseKey},
        license_type = ${"trial"},
        license_expires_at = ${expiresAt ?? null},
        apim_subscription_id = ${apimSubscription.subscriptionId},
        apim_status = ${trialIsActive ? "active" : "suspended"},
        apim_tier = ${"aipilot-pro"},
        updated_at = now()
      WHERE id = ${client.id}
    `;
  }

  if (!trialIsActive) {
    await setApimSubscriptionState(apimSubscription.subscriptionId, "suspended");
    await updateLicenseStatus(installLicense.id, "disabled");
  }

  return {
    clientId: client.id,
    licenseId: installLicense.id,
    licenseKey: installLicense.licenseKey,
    apimSubscriptionId: apimSubscription.subscriptionId,
    apimKey: apimSubscription.primaryKey,
    expiresAt,
    preferredEnvironment,
    tier,
    isActive: trialIsActive,
  };
}

export async function ensurePendingTrialForClient(input: {
  clientId: string;
  tier?: LicenseTier;
  preferredEnvironment?: LicenseEnvironment;
}) {
  const client = await getPipelineClientById(input.clientId);
  if (!client) {
    throw new Error("Client introuvable");
  }

  if (client.status === "paid") {
    return null;
  }

  return activateTrialForClient({
    clientId: input.clientId,
    tier: input.tier,
    preferredEnvironment: input.preferredEnvironment,
    isActive: false,
    markStatus: "lead",
  });
}

export async function markClientPaid(input: { clientId: string }) {
  const client = await getPipelineClientById(input.clientId);
  if (!client) {
    throw new Error("Client introuvable");
  }

  const now = new Date().toISOString();
  const sql = getSql();
  const apimSubscriptionId = await findClientApimSubscriptionId(client);
  if (apimSubscriptionId) {
    await setApimSubscriptionState(apimSubscriptionId, "active");
  }
  if (client.licenseKey) {
    const linkedLicense = await findLicenseByKey(client.licenseKey);
    if (linkedLicense) {
      await updateLicenseStatus(linkedLicense.id, "active");
    }
  }

  if (!sql) {
    const local = await readLocalPipelineFile();
    local.licenses = local.licenses.map((license) =>
      license.clientId === client.id && license.key === client.licenseKey
        ? { ...license, type: "paid", isActive: true, expiresAt: undefined, revokedAt: undefined }
        : license,
    );
    local.clients = local.clients.map((record) =>
      record.id === client.id
        ? {
            ...record,
            status: "paid",
            paidAt: now,
            paymentDate: now,
            apimStatus: "active",
            apimSubscriptionId: apimSubscriptionId ?? record.apimSubscriptionId,
            licenseType: record.licenseKey ? "paid" : record.licenseType,
            licenseExpiresAt: undefined,
            updatedAt: now,
          }
        : record,
    );
    await writeLocalPipelineFile(local);
    return { clientId: client.id, licenseKey: client.licenseKey };
  }

  await ensurePipelineTables();
  if (client.licenseKey) {
    await sql`
      UPDATE licenses
      SET type = ${"paid"}, is_active = true, expires_at = ${null}, revoked_at = ${null}
      WHERE client_id = ${client.id} AND key = ${client.licenseKey}
    `;
  }

  await sql`
    UPDATE clients
    SET
        status = ${"paid"},
        paid_at = ${now},
        payment_date = ${now},
        apim_status = ${"active"},
        apim_subscription_id = COALESCE(${apimSubscriptionId ?? null}, apim_subscription_id),
        license_type = CASE WHEN license_key IS NULL THEN license_type ELSE ${"paid"} END,
      license_expires_at = ${null},
      updated_at = now()
    WHERE id = ${client.id}
  `;

  return { clientId: client.id, licenseKey: client.licenseKey };
}

export async function markClientLostById(clientId: string) {
  const client = await getPipelineClientById(clientId);
  if (!client) {
    throw new Error("Client introuvable");
  }

  await deleteApimSubscription(await findClientApimSubscriptionId(client));
  await deactivateClientLicenses(client.id, client.licenseKey);

  const now = new Date().toISOString();
  const sql = getSql();

  if (!sql) {
    const local = await readLocalPipelineFile();
    local.licenses = local.licenses.map((license) =>
      license.clientId === client.id
        ? { ...license, isActive: false, revokedAt: now }
        : license,
    );
    local.clients = local.clients.map((record) =>
      record.id === client.id
        ? {
            ...record,
            status: "lost",
            trialAt: undefined,
            trialEndsAt: undefined,
            paidAt: undefined,
            licenseKey: undefined,
            licenseType: undefined,
            licenseExpiresAt: undefined,
            apimSubscriptionId: undefined,
            apimStatus: "cancelled",
            apimKey: undefined,
            updatedAt: now,
          }
        : record,
    );
    await writeLocalPipelineFile(local);
    return;
  }

  await ensurePipelineTables();
  await sql`
    UPDATE licenses
    SET is_active = false, revoked_at = now()
    WHERE client_id = ${client.id}
  `;
  await sql`
    UPDATE clients
    SET
      status = ${"lost"},
      trial_at = ${null},
      trial_ends_at = ${null},
      paid_at = ${null},
      license_key = ${null},
      license_type = ${null},
      license_expires_at = ${null},
      apim_subscription_id = ${null},
      apim_status = ${"cancelled"},
      updated_at = now()
    WHERE id = ${client.id}
  `;
}

export async function markClientLostByLicenseKey(licenseKey: string) {
  const normalized = String(licenseKey ?? "").trim();
  if (!normalized) {
    return false;
  }

  const sql = getSql();

  if (!sql) {
    const local = await readLocalPipelineFile();
    const client = local.clients.find((record) => record.licenseKey === normalized);
    if (!client) {
      return false;
    }
    await markClientLostById(client.id);
    return true;
  }

  await ensurePipelineTables();
  const rows = await sql`
    SELECT id
    FROM clients
    WHERE license_key = ${normalized}
    LIMIT 1
  `;
  const row = (rows as Array<{ id: string }>)[0];
  if (!row) {
    return false;
  }
  await markClientLostById(row.id);
  return true;
}

export async function deletePipelineClientById(clientId: string) {
  const client = await getPipelineClientById(clientId);
  if (!client) {
    return;
  }

  const linkedLicense = client.licenseKey ? await findLicenseByKey(client.licenseKey) : null;
  await deleteApimSubscription(
    client.apimSubscriptionId ?? linkedLicense?.apimSubscriptionId,
  );
  if (linkedLicense) {
    await deleteLicenseById(linkedLicense.id);
  } else if (client.licenseKey) {
    await disableLicenseByKey(client.licenseKey);
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    local.clients = local.clients.filter((record) => record.id !== client.id);
    local.licenses = local.licenses.filter((license) => license.clientId !== client.id);
    local.fbEvents = local.fbEvents.filter((event) => event.clientId !== client.id);
    await writeLocalPipelineFile(local);
    return;
  }

  await ensurePipelineTables();
  await sql`
    DELETE FROM clients
    WHERE id = ${client.id}
  `;
}

export async function deletePipelineClientByLicenseKey(licenseKey: string) {
  const client = await getPipelineClientByLicenseKey(licenseKey);
  if (client) {
    await deletePipelineClientById(client.id);
    return client;
  }

  const license = await findLicenseByKey(licenseKey);
  if (license) {
    await deleteLicenseById(license.id);
  }
  return null;
}

export async function deletePipelineClientByPhone(phone: string) {
  const client = await getPipelineClientByPhone(phone);
  if (!client) {
    return null;
  }

  await deletePipelineClientById(client.id);
  return client;
}

export async function convertClientToPaid(input: {
  clientId: string;
  tier?: LicenseTier;
  preferredEnvironment?: LicenseEnvironment;
}) {
  const client = await getPipelineClientById(input.clientId);
  if (!client) {
    throw new Error("Client introuvable");
  }

  await deactivateClientLicenses(client.id, client.licenseKey);

  const preferredEnvironment = input.preferredEnvironment ?? "codex";
  const tier = input.tier ?? "pro";
  const now = new Date().toISOString();
  const apimSubscription = await provisionApimForClient(client);

  const installLicense = await createLicense({
    customerName: client.name?.trim() || client.phone,
    customerEmail: client.email,
    azureApiKey: apimSubscription.primaryKey,
    apimSubscriptionId: apimSubscription.subscriptionId,
    apimStatus: apimSubscription.state,
    tier,
    preferredEnvironment,
    notes: `Lifecycle client ${client.id} — paid`,
  });

  const lifecycleLicense: PipelineLicenseRecord = {
    id: buildId(),
    clientId: client.id,
    key: installLicense.licenseKey,
    type: "paid",
    createdAt: now,
    isActive: true,
    activatedAt: now,
  };

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    local.licenses.unshift(lifecycleLicense);
    local.clients = local.clients.map((record) =>
      record.id === client.id
        ? {
            ...record,
            status: "paid",
            paidAt: now,
            licenseKey: installLicense.licenseKey,
            licenseType: "paid",
            licenseExpiresAt: undefined,
            apimSubscriptionId: apimSubscription.subscriptionId,
            apimStatus: "active",
            apimTier: "aipilot-pro",
            paymentDate: now,
            updatedAt: now,
          }
        : record,
    );
    await writeLocalPipelineFile(local);
  } else {
    await ensurePipelineTables();
    await sql`
      INSERT INTO licenses (
        id,
        client_id,
        key,
        type,
        created_at,
        expires_at,
        is_active,
        activated_at
      )
      VALUES (
        ${lifecycleLicense.id},
        ${lifecycleLicense.clientId},
        ${lifecycleLicense.key},
        ${lifecycleLicense.type},
        ${lifecycleLicense.createdAt},
        ${null},
        true,
        ${now}
      )
    `;

    await sql`
      UPDATE clients
      SET
        status = ${"paid"},
        paid_at = ${now},
        license_key = ${installLicense.licenseKey},
        license_type = ${"paid"},
        license_expires_at = ${null},
        apim_subscription_id = ${apimSubscription.subscriptionId},
        apim_status = ${"active"},
        apim_tier = ${"aipilot-pro"},
        payment_date = ${now},
        updated_at = now()
      WHERE id = ${client.id}
    `;
  }

  return {
    clientId: client.id,
    licenseKey: installLicense.licenseKey,
    apimSubscriptionId: apimSubscription.subscriptionId,
    apimKey: apimSubscription.primaryKey,
    preferredEnvironment,
    tier,
  };
}

export async function findLifecycleLicenseByKey(key: string) {
  const normalized = String(key ?? "").trim();
  if (!normalized) {
    return null;
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalPipelineFile();
    const license = local.licenses.find((record) => record.key === normalized) ?? null;
    if (!license) {
      return null;
    }
    const client = local.clients.find((record) => record.id === license.clientId) ?? null;
    return { license, client };
  }

  await ensurePipelineTables();
  const licenseRows = await sql`
    SELECT
      id,
      client_id,
      key,
      type,
      created_at,
      expires_at,
      is_active,
      activated_at,
      revoked_at
    FROM licenses
    WHERE key = ${normalized}
    LIMIT 1
  `;
  const licenseRow = (licenseRows as Array<PipelineLicenseRow>)[0];
  if (!licenseRow) {
    return null;
  }

  const client = await getPipelineClientById(licenseRow.client_id);
  return {
    license: mapLicenseRow(licenseRow),
    client,
  };
}

export async function expireTrialClients() {
  const now = new Date().toISOString();
  const sql = getSql();

  if (!sql) {
    const local = await readLocalPipelineFile();
    const expiredKeys = new Set<string>();
    let count = 0;

    local.licenses = local.licenses.map((license) => {
      if (license.type === "trial" && license.isActive && license.expiresAt && new Date(license.expiresAt) < new Date(now)) {
        count += 1;
        expiredKeys.add(license.key);
        return {
          ...license,
          isActive: false,
          revokedAt: now,
        };
      }

      return license;
    });

    local.clients = local.clients.map((client) => {
      if (client.status === "trial" && client.trialEndsAt && new Date(client.trialEndsAt) < new Date(now)) {
        return {
          ...client,
          status: "expired",
          updatedAt: now,
        };
      }

      return client;
    });

    await writeLocalPipelineFile(local);

    for (const key of expiredKeys) {
      await disableLicenseByKey(key);
    }

    return { expired: count };
  }

  await ensurePipelineTables();
  const rows = await sql`
    SELECT
      clients.license_key
    FROM clients
    WHERE clients.status = ${"trial"}
      AND clients.trial_ends_at IS NOT NULL
      AND clients.trial_ends_at < now()
  `;

  const expiredKeys = (rows as Array<{ license_key: string | null }>).map((row) => row.license_key).filter(Boolean) as string[];

  const clientsResult = await sql`
    UPDATE clients
    SET status = ${"expired"}, updated_at = now()
    WHERE status = ${"trial"}
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at < now()
  `;

  await sql`
    UPDATE licenses
    SET is_active = false, revoked_at = now()
    WHERE type = ${"trial"} AND is_active = true AND expires_at IS NOT NULL AND expires_at < now()
  `;

  for (const key of expiredKeys) {
    await disableLicenseByKey(key);
  }

  const expired =
    !Array.isArray(clientsResult) &&
    typeof (clientsResult as { count?: unknown }).count === "number"
      ? ((clientsResult as { count: number }).count ?? 0)
      : Array.isArray(clientsResult)
        ? clientsResult.length
        : 0;

  return { expired };
}
