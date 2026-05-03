import { createTrialLead } from "@/lib/trial-leads-store";
import { sendCapiEvent } from "@/lib/capi";
import { upsertPendingAccessRequest } from "@/lib/access-request-store";
import {
  buildMetaParameterContext,
  serializeMetaCookie,
} from "@/lib/meta-param-builder";
import {
  recordFacebookEvent,
  upsertLeadClient,
} from "@/lib/client-pipeline-store";
import { getStoredConfig } from "@/lib/config-store";
import {
  buildWhatsAppAppUrl,
  buildWhatsAppUrl,
  normalizeTunisiaWhatsappNumber,
} from "@/lib/whatsapp";

function readMetaTestEventCode(value: unknown) {
  const code = String(value ?? "").trim();
  return /^TEST\d+$/i.test(code) ? code.toUpperCase() : undefined;
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
        utm_content?: string;
        utm_term?: string;
        landing_url?: string;
        referrer?: string;
        event_id?: string;
        initiate_checkout_event_id?: string;
        test_event_code?: string;
        timestamp?: string;
      }
    | null;

  try {
    const normalizedName = String(payload?.nom ?? "").trim();
    const normalizedLeadWhatsapp = normalizeTunisiaWhatsappNumber(
      String(payload?.telephone ?? ""),
    );
    const sourceUrl =
      String(payload?.landing_url ?? "").trim() ||
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://aipilot.tn";
    const metaParams = buildMetaParameterContext({
      request,
      sourceUrl,
      fbp: String(payload?.fbp ?? "").trim() || undefined,
      fbc: String(payload?.fbc ?? "").trim() || undefined,
      phone: normalizedLeadWhatsapp?.e164,
    });
    const lead = await createTrialLead({
      name: normalizedName,
      whatsappNumber: String(payload?.telephone ?? ""),
      fbclid: String(payload?.fbclid ?? "").trim() || undefined,
      fbp: metaParams.fbp || String(payload?.fbp ?? "").trim() || undefined,
      fbc: metaParams.fbc || String(payload?.fbc ?? "").trim() || undefined,
      utmSource: String(payload?.utm_source ?? "").trim() || undefined,
      utmCampaign: String(payload?.utm_campaign ?? "").trim() || undefined,
      utmMedium: String(payload?.utm_medium ?? "").trim() || undefined,
      utmContent: String(payload?.utm_content ?? "").trim() || undefined,
      utmTerm: String(payload?.utm_term ?? "").trim() || undefined,
      landingUrl: String(payload?.landing_url ?? "").trim() || undefined,
      referrer: String(payload?.referrer ?? "").trim() || undefined,
      eventId: String(payload?.event_id ?? "").trim() || undefined,
    });
    const accessRequest = await upsertPendingAccessRequest({
      customerName: normalizedName,
      whatsappNumber: String(payload?.telephone ?? ""),
      preferredEnvironment: "codex",
      requestedOs: "windows",
    });

    const pipelineClient = normalizedLeadWhatsapp
      ? await upsertLeadClient({
          name: normalizedName,
          phone: normalizedLeadWhatsapp.waId,
          fbp: metaParams.fbp || String(payload?.fbp ?? "").trim() || undefined,
          fbc: metaParams.fbc || String(payload?.fbc ?? "").trim() || undefined,
          ip: metaParams.clientIpAddress,
          userAgent: request.headers.get("user-agent") ?? undefined,
          adSource:
            String(payload?.utm_campaign ?? "").trim() ||
            String(payload?.utm_source ?? "").trim() ||
            undefined,
          fbclid: String(payload?.fbclid ?? "").trim() || undefined,
          utmSource: String(payload?.utm_source ?? "").trim() || undefined,
          utmCampaign: String(payload?.utm_campaign ?? "").trim() || undefined,
          utmMedium: String(payload?.utm_medium ?? "").trim() || undefined,
          utmContent: String(payload?.utm_content ?? "").trim() || undefined,
          utmTerm: String(payload?.utm_term ?? "").trim() || undefined,
          landingUrl: String(payload?.landing_url ?? "").trim() || undefined,
          referrer: String(payload?.referrer ?? "").trim() || undefined,
        })
      : null;

    const config = await getStoredConfig();
    const supportWhatsapp = normalizeTunisiaWhatsappNumber(
      config.supportWhatsappNumber ?? "",
    );

    if (pipelineClient) {
      const leadEventId = String(payload?.event_id ?? "").trim() || undefined;
      const initiateCheckoutEventId =
        String(payload?.initiate_checkout_event_id ?? "").trim() || undefined;
      const testEventCode = readMetaTestEventCode(payload?.test_event_code);
      const leadFbResponse = await sendCapiEvent({
        eventName: "Lead",
        phone: pipelineClient.phone,
        hashedPhone: metaParams.hashedPhone,
        fbp: pipelineClient.fbp,
        fbc: pipelineClient.fbc,
        ip: pipelineClient.ip,
        userAgent: pipelineClient.userAgent,
        sourceUrl,
        eventId: leadEventId,
        subscriptionId: pipelineClient.id,
        contentName: "AIPilot Free Trial Lead",
        testEventCode,
      });

      await recordFacebookEvent({
        clientId: pipelineClient.id,
        eventName: "Lead",
        fbResponse: leadFbResponse,
      });

      const initiateCheckoutFbResponse = await sendCapiEvent({
        eventName: "InitiateCheckout",
        phone: pipelineClient.phone,
        hashedPhone: metaParams.hashedPhone,
        fbp: pipelineClient.fbp,
        fbc: pipelineClient.fbc,
        ip: pipelineClient.ip,
        userAgent: pipelineClient.userAgent,
        sourceUrl,
        eventId: initiateCheckoutEventId,
        subscriptionId: pipelineClient.id,
        value: 0,
        currency: "TND",
        contentName: "AIPilot Free Trial Request",
        testEventCode,
      });

      await recordFacebookEvent({
        clientId: pipelineClient.id,
        eventName: "InitiateCheckout",
        fbResponse: initiateCheckoutFbResponse,
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

    const response = Response.json({
      ok: true,
      leadId: lead.id,
      requestId: accessRequest.id,
      clientId: pipelineClient?.id ?? null,
      phone: normalizedLeadWhatsapp?.e164 ?? null,
      eventId: String(payload?.event_id ?? "").trim() || null,
      initiateCheckoutEventId:
        String(payload?.initiate_checkout_event_id ?? "").trim() || null,
      appRedirectUrl,
      redirectUrl,
      message:
        "Votre demande d’essai gratuit a été enregistrée. Nous vous redirigeons vers WhatsApp.",
    });

    const secureCookies = sourceUrl.startsWith("https://") || request.url.startsWith("https://");
    for (const cookie of metaParams.cookiesToSet) {
      response.headers.append("Set-Cookie", serializeMetaCookie(cookie, secureCookies));
    }

    return response;
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
