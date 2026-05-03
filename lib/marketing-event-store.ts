import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSql } from "./db";

export type MarketingEventName =
  | "WhatsAppClick"
  | "FunnelSuccess"
  | "InitiateCheckout";

export type MarketingEventRecord = {
  id: string;
  eventName: MarketingEventName;
  leadId?: string;
  clientId?: string;
  phone?: string;
  eventId?: string;
  sourceUrl?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type MarketingEventRow = {
  id: string;
  event_name: MarketingEventName;
  lead_id: string | null;
  client_id: string | null;
  phone: string | null;
  event_id: string | null;
  source_url: string | null;
  referrer: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
};

type LocalMarketingEventsFile = {
  events: MarketingEventRecord[];
};

const LOCAL_MARKETING_EVENTS_PATH = path.resolve(
  process.cwd(),
  ".opencode/marketing-events.json",
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

async function readLocalMarketingEvents(): Promise<LocalMarketingEventsFile> {
  try {
    const raw = await readFile(LOCAL_MARKETING_EVENTS_PATH, "utf8");
    return JSON.parse(raw) as LocalMarketingEventsFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { events: [] };
    }

    throw error;
  }
}

async function writeLocalMarketingEvents(payload: LocalMarketingEventsFile) {
  await mkdir(path.dirname(LOCAL_MARKETING_EVENTS_PATH), { recursive: true });
  await writeFile(
    LOCAL_MARKETING_EVENTS_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function mapMarketingEventRow(row: MarketingEventRow): MarketingEventRecord {
  return {
    id: row.id,
    eventName: row.event_name,
    leadId: row.lead_id ?? undefined,
    clientId: row.client_id ?? undefined,
    phone: row.phone ?? undefined,
    eventId: row.event_id ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    referrer: row.referrer ?? undefined,
    metadata: normalizeMetadata(row.metadata),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function ensureMarketingEventsTable() {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS marketing_events (
      id text PRIMARY KEY,
      event_name text NOT NULL,
      lead_id text,
      client_id text,
      phone text,
      event_id text,
      source_url text,
      referrer text,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

export async function recordMarketingEvent(input: {
  eventName: MarketingEventName;
  leadId?: string;
  clientId?: string;
  phone?: string;
  eventId?: string;
  sourceUrl?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}) {
  const record: MarketingEventRecord = {
    id: buildId(),
    eventName: input.eventName,
    leadId: String(input.leadId ?? "").trim() || undefined,
    clientId: String(input.clientId ?? "").trim() || undefined,
    phone: String(input.phone ?? "").trim() || undefined,
    eventId: String(input.eventId ?? "").trim() || undefined,
    sourceUrl: String(input.sourceUrl ?? "").trim() || undefined,
    referrer: String(input.referrer ?? "").trim() || undefined,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  const sql = getSql();
  if (!sql) {
    const local = await readLocalMarketingEvents();
    local.events.unshift(record);
    await writeLocalMarketingEvents(local);
    return record;
  }

  await ensureMarketingEventsTable();
  await sql`
    INSERT INTO marketing_events (
      id,
      event_name,
      lead_id,
      client_id,
      phone,
      event_id,
      source_url,
      referrer,
      metadata,
      created_at
    )
    VALUES (
      ${record.id},
      ${record.eventName},
      ${record.leadId ?? null},
      ${record.clientId ?? null},
      ${record.phone ?? null},
      ${record.eventId ?? null},
      ${record.sourceUrl ?? null},
      ${record.referrer ?? null},
      ${record.metadata ?? null},
      ${record.createdAt}
    )
  `;

  return record;
}

export async function listRecentMarketingEvents(limit = 25) {
  const sql = getSql();
  if (!sql) {
    const local = await readLocalMarketingEvents();
    return local.events
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  await ensureMarketingEventsTable();
  const rows = await sql`
    SELECT
      id,
      event_name,
      lead_id,
      client_id,
      phone,
      event_id,
      source_url,
      referrer,
      metadata,
      created_at
    FROM marketing_events
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return (rows as Array<MarketingEventRow>).map(mapMarketingEventRow);
}

export async function deleteMarketingEventsForIdentity(input: {
  clientId?: string;
  phone?: string;
}) {
  const clientId = String(input.clientId ?? "").trim();
  const normalized = normalizePhoneKey(input.phone ?? "");
  const suffix = normalizePhoneSuffix(input.phone ?? "");

  if (!clientId && !normalized) {
    return;
  }

  const sql = getSql();
  if (!sql) {
    const local = await readLocalMarketingEvents();
    local.events = local.events.filter((event) => {
      const sameClient = clientId && event.clientId === clientId;
      const samePhone = normalized && event.phone && samePhoneIdentity(event.phone, normalized);
      return !sameClient && !samePhone;
    });
    await writeLocalMarketingEvents(local);
    return;
  }

  await ensureMarketingEventsTable();
  if (clientId && normalized) {
    await sql`
      DELETE FROM marketing_events
      WHERE
        client_id = ${clientId}
        OR regexp_replace(phone, '[^0-9]', '', 'g') = ${normalized}
        OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${suffix}
    `;
    return;
  }

  if (clientId) {
    await sql`
      DELETE FROM marketing_events
      WHERE client_id = ${clientId}
    `;
    return;
  }

  await sql`
    DELETE FROM marketing_events
    WHERE
      regexp_replace(phone, '[^0-9]', '', 'g') = ${normalized}
      OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${suffix}
  `;
}
