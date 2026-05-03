import { recordMarketingEvent } from "@/lib/marketing-event-store";

function readClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        leadId?: string;
        clientId?: string;
        phone?: string;
        eventId?: string;
        sourceUrl?: string;
        referrer?: string;
        target?: "app" | "web" | "manual";
      }
    | null;

  const event = await recordMarketingEvent({
    eventName: "WhatsAppClick",
    leadId: String(payload?.leadId ?? "").trim() || undefined,
    clientId: String(payload?.clientId ?? "").trim() || undefined,
    phone: String(payload?.phone ?? "").trim() || undefined,
    eventId: String(payload?.eventId ?? "").trim() || undefined,
    sourceUrl: String(payload?.sourceUrl ?? "").trim() || undefined,
    referrer: String(payload?.referrer ?? "").trim() || undefined,
    metadata: {
      target: payload?.target ?? "manual",
      ip: readClientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
    },
  });

  return Response.json({ ok: true, eventId: event.id });
}
