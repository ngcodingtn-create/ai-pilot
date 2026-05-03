import crypto from "node:crypto";

const PIXEL_ID =
  process.env.FB_PIXEL_ID?.trim() ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
  process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim() ||
  "";
const ACCESS_TOKEN = process.env.FB_CAPI_TOKEN?.trim() ?? "";
const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE?.trim() ?? "";
const GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION?.trim() || "v19.0";

export type CapiEventName = "Lead" | "StartTrial" | "Purchase" | "InitiateCheckout";

export type CapiEventPayload = {
  eventName: CapiEventName;
  phone?: string;
  email?: string;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
  sourceUrl?: string;
  eventId?: string;
  subscriptionId?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  testEventCode?: string;
  hashedPhone?: string;
  hashedEmail?: string;
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function buildUserData(payload: CapiEventPayload) {
  const userData: Record<string, unknown> = {};

  if (payload.hashedPhone) {
    userData.ph = [payload.hashedPhone];
  } else if (payload.phone) {
    const digits = payload.phone.replace(/[^\d]/g, "");
    if (digits) {
      userData.ph = [sha256(digits)];
    }
  }

  if (payload.hashedEmail) {
    userData.em = [payload.hashedEmail];
  } else if (payload.email) {
    userData.em = [sha256(payload.email)];
  }

  if (payload.fbp) {
    userData.fbp = payload.fbp;
  }

  if (payload.fbc) {
    userData.fbc = payload.fbc;
  }

  if (payload.ip) {
    userData.client_ip_address = payload.ip;
  }

  if (payload.userAgent) {
    userData.client_user_agent = payload.userAgent;
  }

  if (payload.subscriptionId) {
    userData.subscription_id = payload.subscriptionId;
  }

  return userData;
}

export async function sendCapiEvent(payload: CapiEventPayload) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return {
      skipped: true as const,
      reason: "missing-facebook-config",
    };
  }

  const event: Record<string, unknown> = {
    event_name: payload.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: payload.sourceUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://aipilot.tn",
    user_data: buildUserData(payload),
  };

  if (payload.eventId) {
    event.event_id = payload.eventId;
  }

  if (
    payload.eventName === "Purchase" ||
    payload.eventName === "StartTrial" ||
    payload.eventName === "InitiateCheckout"
  ) {
    event.custom_data = {
      currency: payload.currency ?? "TND",
      value: payload.value ?? 0,
      content_name: payload.contentName ?? "AIPilot",
      content_type: "product",
    };
  }

  const body: Record<string, unknown> = {
    data: [event],
  };

  const testEventCode = payload.testEventCode?.trim() || TEST_EVENT_CODE;
  if (testEventCode) {
    body.test_event_code = testEventCode;
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const json = (await response.json().catch(() => null)) as unknown;

  return {
    skipped: false as const,
    ok: response.ok,
    status: response.status,
    response: json,
  };
}
