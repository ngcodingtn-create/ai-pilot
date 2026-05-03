import { createTrialLead } from "@/lib/trial-leads-store";
import { getStoredConfig } from "@/lib/config-store";
import {
  buildWhatsAppAppUrl,
  buildWhatsAppUrl,
  normalizeTunisiaWhatsappNumber,
} from "@/lib/whatsapp";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        nom?: string;
        telephone?: string;
        fbclid?: string;
        utm_source?: string;
        utm_campaign?: string;
        utm_medium?: string;
        timestamp?: string;
      }
    | null;

  try {
    const normalizedName = String(payload?.nom ?? "").trim();
    const lead = await createTrialLead({
      name: normalizedName,
      whatsappNumber: String(payload?.telephone ?? ""),
      fbclid: String(payload?.fbclid ?? "").trim() || undefined,
      utmSource: String(payload?.utm_source ?? "").trim() || undefined,
      utmCampaign: String(payload?.utm_campaign ?? "").trim() || undefined,
      utmMedium: String(payload?.utm_medium ?? "").trim() || undefined,
    });

    const config = await getStoredConfig();
    const supportWhatsapp = normalizeTunisiaWhatsappNumber(
      config.supportWhatsappNumber ?? "",
    );

    const whatsappMessage = `Aahla, je suis ${normalizedName} et je suis intéressé par l'offre Codex 100 dollar. Code: TRIAL-${lead.id}`;

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
