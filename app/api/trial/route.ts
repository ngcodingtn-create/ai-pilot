import { createTrialLead } from "@/lib/trial-leads-store";
import { sendCapiEvent } from "@/lib/capi";
import {
  ensurePendingTrialForClient,
  recordFacebookEvent,
  upsertLeadClient,
} from "@/lib/client-pipeline-store";
import { getStoredConfig } from "@/lib/config-store";
import {
  buildWhatsAppAppUrl,
  buildWhatsAppUrl,
  normalizeTunisiaWhatsappNumber,
} from "@/lib/whatsapp";

function readClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        nom?: string;
        telephone?: string;
        fbclid?: string;
        fbp?: string;
        fbc?: string;
        utm_source?: string;
        utm_campaign?: string;
        utm_medium?: string;
        timestamp?: string;
      }
    | null;

  try {
    const normalizedName = String(payload?.nom ?? "").trim();
    const normalizedLeadWhatsapp = normalizeTunisiaWhatsappNumber(
      String(payload?.telephone ?? ""),
    );
    const sourceUrl = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://aipilot.tn";
    const lead = await createTrialLead({
      name: normalizedName,
      whatsappNumber: String(payload?.telephone ?? ""),
      fbclid: String(payload?.fbclid ?? "").trim() || undefined,
      utmSource: String(payload?.utm_source ?? "").trim() || undefined,
      utmCampaign: String(payload?.utm_campaign ?? "").trim() || undefined,
      utmMedium: String(payload?.utm_medium ?? "").trim() || undefined,
    });

    const pipelineClient = normalizedLeadWhatsapp
      ? await upsertLeadClient({
          name: normalizedName,
          phone: normalizedLeadWhatsapp.waId,
          fbp: String(payload?.fbp ?? "").trim() || undefined,
          fbc: String(payload?.fbc ?? "").trim() || undefined,
          ip: readClientIp(request),
          userAgent: request.headers.get("user-agent") ?? undefined,
          adSource:
            String(payload?.utm_campaign ?? "").trim() ||
            String(payload?.utm_source ?? "").trim() ||
            undefined,
        })
      : null;

    if (pipelineClient) {
      await ensurePendingTrialForClient({
        clientId: pipelineClient.id,
        tier: "pro",
        preferredEnvironment: "codex",
      });
    }

    const config = await getStoredConfig();
    const supportWhatsapp = normalizeTunisiaWhatsappNumber(
      config.supportWhatsappNumber ?? "",
    );

    if (pipelineClient) {
      const fbResponse = await sendCapiEvent({
        eventName: "Lead",
        phone: pipelineClient.phone,
        fbp: pipelineClient.fbp,
        fbc: pipelineClient.fbc,
        ip: pipelineClient.ip,
        userAgent: pipelineClient.userAgent,
        sourceUrl,
        contentName: "AIPilot Free Trial Lead",
      });

      await recordFacebookEvent({
        clientId: pipelineClient.id,
        eventName: "Lead",
        fbResponse,
      });
    }

    const whatsappMessage = normalizedLeadWhatsapp
      ? `Aahla, je suis ${normalizedName} et je suis intéressé par l'offre Codex 100 dollar. Mon WhatsApp: ${normalizedLeadWhatsapp.display}`
      : `Aahla, je suis ${normalizedName} et je suis intéressé par l'offre Codex 100 dollar.`;

    const redirectUrl = supportWhatsapp
      ? buildWhatsAppUrl(
          supportWhatsapp.e164,
          whatsappMessage,
        )
      : null;
    const appRedirectUrl = supportWhatsapp
      ? buildWhatsAppAppUrl(
          supportWhatsapp.e164,
          whatsappMessage,
        )
      : null;

    return Response.json({
      ok: true,
      leadId: lead.id,
      appRedirectUrl,
      redirectUrl,
      message:
        "Votre demande d’essai gratuit a été enregistrée. Nous vous redirigeons vers WhatsApp.",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer la demande d’essai pour le moment.",
      },
      { status: 400 },
    );
  }
}
