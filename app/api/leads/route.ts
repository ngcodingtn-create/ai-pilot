import { recordFacebookEvent, upsertLeadClient } from "@/lib/client-pipeline-store";
import { sendCapiEvent } from "@/lib/capi";
import { normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

function readClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        name?: string;
        phone?: string;
        email?: string;
        fbp?: string;
        fbc?: string;
        adSource?: string;
        sourceUrl?: string;
      }
    | null;

  const normalizedPhone = normalizeTunisiaWhatsappNumber(String(payload?.phone ?? ""));
  if (!normalizedPhone) {
    return Response.json(
      { success: false, error: "Numéro WhatsApp invalide." },
      { status: 400 },
    );
  }

  const client = await upsertLeadClient({
    name: String(payload?.name ?? "").trim() || undefined,
    phone: normalizedPhone.waId,
    email: String(payload?.email ?? "").trim() || undefined,
    fbp: String(payload?.fbp ?? "").trim() || undefined,
    fbc: String(payload?.fbc ?? "").trim() || undefined,
    ip: readClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
    adSource: String(payload?.adSource ?? "").trim() || undefined,
  });

  const fbResponse = await sendCapiEvent({
    eventName: "Lead",
    phone: client.phone,
    email: client.email,
    fbp: client.fbp,
    fbc: client.fbc,
    ip: client.ip,
    userAgent: client.userAgent,
    sourceUrl:
      String(payload?.sourceUrl ?? "").trim() ||
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://aipilot.tn",
    contentName: "AIPilot WhatsApp Lead",
  });

  await recordFacebookEvent({
    clientId: client.id,
    eventName: "Lead",
    fbResponse,
  });

  return Response.json({ success: true, clientId: client.id });
}
