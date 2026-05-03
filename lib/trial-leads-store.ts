import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSql } from "./db";
import { normalizeTunisiaWhatsappNumber } from "./whatsapp";

export type TrialLeadRecord = {
  id: string;
  name: string;
  whatsappNumber: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  utmTerm?: string;
  landingUrl?: string;
  referrer?: string;
  eventId?: string;
  createdAt: string;
};

type TrialLeadRow = {
  id: string;
  name: string;
  whatsapp_number: string;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_url: string | null;
  referrer: string | null;
  event_id: string | null;
  created_at: string | Date;
};

type LocalTrialLeadsFile = {
  leads: TrialLeadRecord[];
};

const LOCAL_TRIAL_LEADS_PATH = path.resolve(
  process.cwd(),
  ".opencode/trial-leads.json",
);

function buildId() {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function readLocalTrialLeads(): Promise<LocalTrialLeadsFile> {
  try {
    const raw = await readFile(LOCAL_TRIAL_LEADS_PATH, "utf8");
    return JSON.parse(raw) as LocalTrialLeadsFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { leads: [] };
    }

    throw error;
  }
}

async function writeLocalTrialLeads(payload: LocalTrialLeadsFile) {
  await mkdir(path.dirname(LOCAL_TRIAL_LEADS_PATH), { recursive: true });
  await writeFile(LOCAL_TRIAL_LEADS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function ensureTrialLeadsTable() {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS trial_leads (
      id text PRIMARY KEY,
      name text NOT NULL,
      whatsapp_number text NOT NULL,
      fbclid text,
      fbp text,
      fbc text,
      utm_source text,
      utm_campaign text,
      utm_medium text,
      utm_content text,
      utm_term text,
      landing_url text,
      referrer text,
      event_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS fbp text`;
  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS fbc text`;
  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS utm_content text`;
  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS utm_term text`;
  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS landing_url text`;
  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS referrer text`;
  await sql`ALTER TABLE trial_leads ADD COLUMN IF NOT EXISTS event_id text`;
}

export async function createTrialLead(input: {
  name: string;
  whatsappNumber: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  utmTerm?: string;
  landingUrl?: string;
  referrer?: string;
  eventId?: string;
}) {
  const name = String(input.name ?? "").trim();
  const normalizedWhatsapp = normalizeTunisiaWhatsappNumber(
    String(input.whatsappNumber ?? ""),
  );

  if (!name) {
    throw new Error("Le prénom est requis.");
  }

  if (!normalizedWhatsapp) {
    throw new Error(
      "Le numéro WhatsApp est invalide. Utilisez un numéro tunisien valide, par exemple +216 29 293 038.",
    );
  }

  const record: TrialLeadRecord = {
    id: buildId(),
    name,
    whatsappNumber: normalizedWhatsapp.e164,
    fbclid: String(input.fbclid ?? "").trim() || undefined,
    fbp: String(input.fbp ?? "").trim() || undefined,
    fbc: String(input.fbc ?? "").trim() || undefined,
    utmSource: String(input.utmSource ?? "").trim() || undefined,
    utmCampaign: String(input.utmCampaign ?? "").trim() || undefined,
    utmMedium: String(input.utmMedium ?? "").trim() || undefined,
    utmContent: String(input.utmContent ?? "").trim() || undefined,
    utmTerm: String(input.utmTerm ?? "").trim() || undefined,
    landingUrl: String(input.landingUrl ?? "").trim() || undefined,
    referrer: String(input.referrer ?? "").trim() || undefined,
    eventId: String(input.eventId ?? "").trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const sql = getSql();
  if (!sql) {
    const local = await readLocalTrialLeads();
    local.leads.unshift(record);
    await writeLocalTrialLeads(local);
    return record;
  }

  await ensureTrialLeadsTable();
  await sql`
    INSERT INTO trial_leads (
      id,
      name,
      whatsapp_number,
      fbclid,
      fbp,
      fbc,
      utm_source,
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      landing_url,
      referrer,
      event_id,
      created_at
    )
    VALUES (
      ${record.id},
      ${record.name},
      ${record.whatsappNumber},
      ${record.fbclid ?? null},
      ${record.fbp ?? null},
      ${record.fbc ?? null},
      ${record.utmSource ?? null},
      ${record.utmCampaign ?? null},
      ${record.utmMedium ?? null},
      ${record.utmContent ?? null},
      ${record.utmTerm ?? null},
      ${record.landingUrl ?? null},
      ${record.referrer ?? null},
      ${record.eventId ?? null},
      ${record.createdAt}
    )
  `;

  return record;
}

export function mapTrialLeadRow(row: TrialLeadRow): TrialLeadRecord {
  return {
    id: row.id,
    name: row.name,
    whatsappNumber: row.whatsapp_number,
    fbclid: row.fbclid ?? undefined,
    fbp: row.fbp ?? undefined,
    fbc: row.fbc ?? undefined,
    utmSource: row.utm_source ?? undefined,
    utmCampaign: row.utm_campaign ?? undefined,
    utmMedium: row.utm_medium ?? undefined,
    utmContent: row.utm_content ?? undefined,
    utmTerm: row.utm_term ?? undefined,
    landingUrl: row.landing_url ?? undefined,
    referrer: row.referrer ?? undefined,
    eventId: row.event_id ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
