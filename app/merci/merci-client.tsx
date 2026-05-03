"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

const WHATSAPP_REDIRECT_STORAGE_KEY = "aipilot-whatsapp-redirect";
const PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ??
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ??
  "1254451106670901";

type RedirectPayload = {
  leadId?: string;
  clientId?: string;
  phone?: string;
  eventId?: string;
  appRedirectUrl?: string;
  redirectUrl?: string;
  sourceUrl?: string;
  referrer?: string;
};

function readRedirectPayload(): RedirectPayload {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(WHATSAPP_REDIRECT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RedirectPayload) : {};
  } catch {
    return {};
  }
}

async function recordWhatsAppClick(payload: RedirectPayload, target: "app" | "web" | "manual") {
  await fetch("/api/marketing/whatsapp-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      leadId: payload.leadId,
      clientId: payload.clientId,
      phone: payload.phone,
      eventId: payload.eventId,
      sourceUrl: payload.sourceUrl || window.location.href,
      referrer: payload.referrer || document.referrer,
      target,
    }),
  }).catch(() => null);
}

function attemptWhatsAppRedirect(payload: RedirectPayload) {
  const appUrl = payload.appRedirectUrl || "";
  const webUrl = payload.redirectUrl || "";
  if (!appUrl && !webUrl) {
    return;
  }

  let pageHidden = false;
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      pageHidden = true;
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  if (appUrl) {
    void recordWhatsAppClick(payload, "app");
    window.location.href = appUrl;
  }

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (!pageHidden && document.visibilityState === "visible" && webUrl) {
      void recordWhatsAppClick(payload, "web");
      window.location.href = webUrl;
    }
  }, appUrl ? 1400 : 200);
}

export default function MerciClient() {
  const [payload] = useState<RedirectPayload>(() => readRedirectPayload());
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const hasWhatsappUrl = Boolean(payload.redirectUrl || payload.appRedirectUrl);
  const leadId = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("leadId") ?? "";
  }, []);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      attemptWhatsAppRedirect(payload);
      setHasAutoOpened(true);
    }, 900);

    return () => window.clearTimeout(redirectTimer);
  }, [payload]);

  async function openWhatsAppManually() {
    await recordWhatsAppClick(payload, "manual");
    const targetUrl = payload.redirectUrl || payload.appRedirectUrl;
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <Script id="meta-pixel-thank-you" strategy="afterInteractive">
        {`
          !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(0,255,136,0.18),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(18,180,255,0.18),transparent_28%),linear-gradient(180deg,#050607_0%,#0A0A0A_55%,#07110d_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[#00FF88]/60 to-transparent" />

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-[var(--font-plex-mono)] text-xs font-semibold uppercase tracking-[0.22em] text-[#8BFFBF]">
              Demande reçue
            </p>
            <h1 className="mt-4 font-[var(--font-outfit)] text-4xl font-black leading-[0.98] tracking-normal text-white sm:text-6xl">
              Ton essai est enregistré.
            </h1>
            <p className="mt-5 max-w-2xl font-[var(--font-manrope)] text-base leading-8 text-white/72 sm:text-lg">
              On ouvre WhatsApp maintenant pour continuer avec un humain AIPilot. Si ton
              navigateur bloque l’ouverture automatique, utilise le bouton ci-dessous.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openWhatsAppManually}
                disabled={!hasWhatsappUrl}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#00FF88] px-6 text-sm font-black text-[#06110B] shadow-[0_14px_34px_rgba(0,255,136,0.24)] transition hover:translate-y-[-1px] hover:bg-[#8BFFBF] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
              >
                Ouvrir WhatsApp
              </button>
              <Link
                href="/funnel"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/16 bg-white/6 px-6 text-sm font-bold text-white transition hover:border-white/32 hover:bg-white/10"
              >
                Retour au funnel
              </Link>
            </div>

            <p className="mt-5 font-[var(--font-plex-mono)] text-xs text-white/42">
              {leadId || payload.leadId
                ? `Lead ${leadId || payload.leadId} synchronisé avec le pipeline.`
                : "Lead synchronisé avec le pipeline."}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/8 p-4">
              <p className="font-[var(--font-plex-mono)] text-xs font-semibold uppercase tracking-[0.18em] text-[#8BFFBF]">
                Prochaine étape
              </p>
              <p className="mt-3 font-[var(--font-outfit)] text-2xl font-bold text-white">
                Conversation WhatsApp
              </p>
              <p className="mt-2 text-sm leading-7 text-white/68">
                L’équipe confirme ton besoin, prépare ton accès, puis te guide vers
                AIPilot Manager ou les tutoriels manuels.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {[
                ["01", "WhatsApp s’ouvre", hasAutoOpened ? "Tentative envoyée" : "Dans quelques secondes"],
                ["02", "Réponse humaine", "Support AIPilot"],
                ["03", "Installation", "Manager ou guide manuel"],
              ].map(([index, title, detail]) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/24 p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/8 font-[var(--font-plex-mono)] text-xs font-semibold text-[#8BFFBF]">
                    {index}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm text-white/48">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
