import { createTrialLead } from "@/lib/trial-leads-store";
import { getStoredConfig } from "@/lib/config-store";
import { buildWhatsAppUrl, normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

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
    const lead = await createTrialLead({
      name: String(payload?.nom ?? ""),
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

    const redirectUrl = supportWhatsapp
      ? buildWhatsAppUrl(
          supportWhatsapp.e164,
          `Salam AIPilot! Code: TRIAL-${lead.id}`,
        )
      : null;

    return Response.json({
      ok: true,
      leadId: lead.id,
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
