"use client";

import Image from "next/image";
import Script from "next/script";
import { useEffect, useState } from "react";
import { normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

type RevealMap = Record<string, boolean>;

type TrialFormState =
  | { status: "idle"; message?: undefined }
  | { status: "submitting"; message?: undefined }
  | { status: "success" | "error"; message: string };

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "TON_PIXEL_ID";

const stats = [
  { label: "Plus rapide qu’un dev humain", value: 10, suffix: "x" },
  { label: "Limite de sessions", value: 0, suffix: "" },
  { label: "Disponible par jour", value: 24, suffix: "h" },
];

const features = [
  ["🤖", "Codex Officiel OpenAI", "L’app desktop officielle d’OpenAI, pas une copie."],
  ["⚡", "GPT-5.5 & GPT-5.4", "Choisis ton modèle selon ta mission de coding."],
  ["♾️", "Aucune limite de sessions", "Code autant que tu veux, 24h/24."],
  ["💳", "Paiement 100% Tunisien", "D17, virement, Wafa Cash ou IWI Payment."],
  ["⚙️", "Installation en 5 minutes", "Un installateur configure tout automatiquement."],
  ["🎁", "Essai gratuit 1 jour", "Teste d’abord, puis décide en toute tranquillité."],
];

const trustSignals = [
  "Codex officiel OpenAI",
  "Paiement en dinars tunisiens",
  "Support WhatsApp humain",
  "Installation guidée pas à pas",
];

const quickProof = [
  ["5 min", "Activation moyenne"],
  ["1 jour", "Essai gratuit complet"],
  ["DT", "Paiement tunisien"],
];

const toolFreedom = [
  [
    "Codex App",
    "Le vrai agent OpenAI, prêt pour les gros projets, le refactor et le debugging profond.",
  ],
  [
    "T3 Code",
    "Une interface plus légère pour coder vite, rester concentré et enchaîner sans friction.",
  ],
  [
    "OpenCode",
    "Parfait si tu veux terminal + vitesse + contrôle, sans limite de sessions ni blocage.",
  ],
];

const faqs = [
  {
    q: "C’est quoi exactement AIPilot ?",
    a: "AIPilot te donne accès à Codex — l’agent IA officiel d’OpenAI — avec GPT-5.5 et GPT-5.4, sans carte étrangère et avec une installation guidée en Tunisie.",
  },
  {
    q: "Pourquoi c’est moins cher que chez OpenAI ?",
    a: "On optimise l’accès via notre infrastructure Azure et on s’occupe de l’onboarding, ce qui nous permet de proposer une offre plus accessible pour le marché tunisien.",
  },
  {
    q: "Est-ce que c’est le vrai Codex d’OpenAI ?",
    a: "Oui. Le funnel vend le parcours AIPilot autour du vrai Codex, avec la configuration Azure et l’assistance qui te permettent de le lancer rapidement.",
  },
  {
    q: "Comment je paie après l’essai ?",
    a: "Après l’essai gratuit d’une journée, on te contacte sur WhatsApp pour finaliser la suite via D17, virement, Wafa Cash ou IWI Payment.",
  },
  {
    q: "Qu’est-ce qui se passe après le formulaire ?",
    a: "Tu reçois un code d’essai, puis tu es redirigé vers WhatsApp avec un message prérempli pour lancer immédiatement la conversation avec AIPilot.",
  },
];

function formatWhatsappInput(value: string) {
  const trimmed = String(value ?? "");
  const keepPlus = trimmed.trim().startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return keepPlus ? `+${digits}` : digits;
}

function useReveal(ids: string[]) {
  const [visible, setVisible] = useState<RevealMap>({});

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible((current) => ({ ...current, [entry.target.id]: true }));
          }
        }
      },
      { threshold: 0.16 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return visible;
}

function useCountUp(target: number, isVisible: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const duration = 900;
    const start = performance.now();
    let frame = 0;

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const next = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      setValue(next);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, target]);

  return value;
}

export default function FunnelClient() {
  const sectionIds = [
    "hero",
    "problem",
    "solution",
    "comparison",
    "features",
    "steps",
    "scarcity",
    "form",
    "faq",
  ];
  const visible = useReveal(sectionIds);
  const [formState, setFormState] = useState<TrialFormState>({ status: "idle" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [spotsLeft] = useState(4);
  const normalizedPhone = normalizeTunisiaWhatsappNumber(phone);

  const statValue0 = useCountUp(stats[0].value, Boolean(visible.comparison));
  const statValue1 = useCountUp(stats[1].value, Boolean(visible.comparison));
  const statValue2 = useCountUp(stats[2].value, Boolean(visible.comparison));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid") ?? "";
    const utmSource = params.get("utm_source") ?? "";
    const utmCampaign = params.get("utm_campaign") ?? "";
    const utmMedium = params.get("utm_medium") ?? "";

    if (fbclid) {
      window.localStorage.setItem("aipilot-fbclid", fbclid);
    }
    if (utmSource) {
      window.localStorage.setItem("aipilot-utm_source", utmSource);
    }
    if (utmCampaign) {
      window.localStorage.setItem("aipilot-utm_campaign", utmCampaign);
    }
    if (utmMedium) {
      window.localStorage.setItem("aipilot-utm_medium", utmMedium);
    }
  }, []);

  async function submitTrial() {
    if (!name.trim() || !phone.trim()) {
      setFormState({
        status: "error",
        message: "Entre ton prénom et ton numéro WhatsApp pour recevoir l’essai.",
      });
      return;
    }

    if (!normalizedPhone) {
      setFormState({
        status: "error",
        message:
          "Le numéro WhatsApp n’est pas valide. Corrige-le au format tunisien, par exemple +216 29 293 038.",
      });
      return;
    }

    setFormState({ status: "submitting" });

    const fbclid = window.localStorage.getItem("aipilot-fbclid") ?? "";
    const utmSource = window.localStorage.getItem("aipilot-utm_source") ?? "";
    const utmCampaign = window.localStorage.getItem("aipilot-utm_campaign") ?? "";
    const utmMedium = window.localStorage.getItem("aipilot-utm_medium") ?? "";

    try {
      const response = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: name,
          telephone: normalizedPhone.e164,
          fbclid,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          utm_medium: utmMedium,
          timestamp: new Date().toISOString(),
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        redirectUrl?: string | null;
      };

      if (!response.ok || !payload.ok) {
        setFormState({
          status: "error",
          message: payload.error ?? "Impossible d’envoyer la demande pour le moment.",
        });
        return;
      }

      if (typeof window !== "undefined" && typeof (window as Window & { fbq?: (...args: unknown[]) => void }).fbq === "function") {
        (window as Window & { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Lead", {
          content_name: "AIPilot Trial",
        });
      }

      setFormState({
        status: "success",
        message: "Essai gratuit demandé. Redirection vers WhatsApp...",
      });

      window.setTimeout(() => {
        if (payload.redirectUrl) {
          window.location.href = payload.redirectUrl;
        }
      }, 900);
    } catch {
      setFormState({
        status: "error",
        message: "Erreur réseau. Réessaie dans quelques secondes.",
      });
    }
  }

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
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

      <div className="relative min-h-screen overflow-x-hidden bg-[#050607] text-white">
        <div className="sticky top-0 z-50 border-b border-white/10 bg-[#FF3D3D] px-2 py-2 text-center text-[11px] font-semibold text-white shadow-[0_0_24px_rgba(255,61,61,0.32)] sm:px-4 sm:text-sm">
          <span className="inline-flex max-w-full items-center justify-center gap-2 whitespace-nowrap">
            <span className="animate-pulse">⚡</span>
            <span className="sm:hidden">
              Plus que <span className="font-black">{spotsLeft}</span> places — essai gratuit
            </span>
            <span className="hidden sm:inline">
              Plus que <span className="font-black">{spotsLeft}</span> places disponibles — Essai gratuit 1 jour • Offre limitée
            </span>
          </span>
        </div>

        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,225,255,0.22)_0%,_rgba(5,6,7,0)_42%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-0 sm:px-6 sm:py-6 lg:px-8">
          <section
            id="hero"
            className={`section-reveal relative min-h-[calc(100vh-5rem)] pb-4 pt-3 sm:py-10 ${visible.hero ? "visible" : ""}`}
          >
            <div className="pointer-events-none absolute inset-x-[-1rem] top-0 z-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(23,232,255,0.24)_0%,rgba(5,6,7,0.96)_58%,rgba(5,6,7,1)_84%)] sm:hidden" />
            <div className="relative z-10 mx-auto max-w-6xl">
              <div className="mx-auto max-w-5xl text-center">
              <h1
                className="mx-auto mt-4 max-w-[11ch] text-[2.45rem] font-extrabold leading-[0.9] tracking-[-0.055em] text-white sm:mt-5 sm:max-w-none sm:text-[4.4rem] lg:text-[5.9rem]"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                <span className="block whitespace-nowrap">Codex OpenAI</span>
                <span className="block whitespace-nowrap">avec GPT-5.5,</span>
                <span className="block whitespace-nowrap text-[#17E8FF] drop-shadow-[0_0_24px_rgba(23,232,255,0.4)]">
                  Pour 60 DT/mois
                </span>
              </h1>

              <div className="mt-4 text-sm font-semibold text-[#FF7070]">
                <span className="line-through opacity-80">310 DT/mois</span>
                <span className="mx-2 text-white/40">→</span>
                <span className="text-[#FFF06A]">60 DT/mois avec AIPilot</span>
              </div>

              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#C6C6C6] sm:text-lg">
                AIPilot donne aux développeurs tunisiens un accès simple, crédible et guidé à
                Codex avec GPT-5.5 et GPT-5.4, sans carte étrangère et avec paiement local.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-[#D7D7D7]">
                {["Sans limite de sessions", "Paiement D17 / Virement / Wafa Cash", "Essai gratuit 1 jour complet"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <a
                  href="#form"
                  className="cta-pulse cta-yellow inline-flex min-h-[56px] w-full max-w-xl items-center justify-center rounded-full px-5 py-4 text-[0.98rem] font-black leading-none shadow-[0_14px_34px_rgba(255,240,106,0.18)] transition hover:scale-[1.01] hover:brightness-[0.98] sm:px-6 sm:text-lg"
                >
                  <span className="sm:hidden">🎁 Obtenir mon essai gratuit</span>
                  <span className="hidden sm:inline">🎁 Obtenir mon essai gratuit — 1 jour</span>
                </a>
                <p className="text-sm font-semibold text-[#FF6B6B]">
                  ⚠️ Seulement {spotsLeft} places disponibles
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {trustSignals.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#17E8FF]/15 bg-[#0C1014] px-4 py-3 text-left text-sm text-[#E2E8F0]"
                  >
                    <span className="mr-2 text-[#17E8FF]">✓</span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-[#B5B5B5]">
                <span>Basé sur des outils utilisés par des devs orientés</span>
                {["Azure", "OpenAI", "GitHub"].map((logo) => (
                  <span
                    key={logo}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white"
                  >
                    {logo}
                  </span>
                ))}
              </div>

              <div className="hero-stage relative left-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden bg-transparent sm:left-auto sm:mt-10 sm:w-auto sm:translate-x-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-[#17E8FF]/14 sm:bg-[#05090D] sm:shadow-[0_35px_100px_rgba(0,0,0,0.55)]">
                <div className="relative aspect-[16/9]">
                  <div className="hero-grid absolute inset-0 z-0" />
                  <Image
                    src="/tutorials/aipilot-manager-connect-install.png"
                    alt="Démo AIPilot"
                    fill
                    className="object-cover object-top opacity-78"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.68))]" />
                  <div className="absolute left-4 top-4 h-24 w-32 overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:left-8 sm:top-8 sm:h-36 sm:w-48">
                    <Image
                      src="/tutorials/codex-enter-api-key.png"
                      alt="Codex setup"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="absolute bottom-4 right-4 max-w-[78%] rounded-full border border-[#17E8FF]/30 bg-black/55 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B7F7FF] backdrop-blur-sm sm:bottom-8 sm:right-8 sm:max-w-[72%] sm:px-4 sm:text-sm">
                    GPT-5.5 • Codex officiel • Paiement tunisien
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/55 text-3xl text-white shadow-[0_0_40px_rgba(23,232,255,0.12)]">
                      ▶
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {quickProof.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4 text-center"
                  >
                    <div
                      className="text-3xl font-extrabold text-[#FFF06A]"
                      style={{ fontFamily: "var(--font-outfit)" }}
                    >
                      {value}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9FB0BF]">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </section>

          <section id="problem" className={`section-reveal py-16 ${visible.problem ? "visible" : ""}`}>
            <div className="mx-auto max-w-6xl">
              <h2
                className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                Tu codes encore sans IA en 2026 ?
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  ["❌ Codex coûte 310 DT/mois", "Inaccessible avec une carte tunisienne"],
                  ["❌ Les limites te bloquent", "Reset toutes les 5h — tu perds ta concentration au pire moment"],
                  ["❌ Tes concurrents codent 10x plus vite", "Pendant que tu cherches sur Google, eux utilisent GPT-5.5"],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-[24px] border border-[#17E8FF]/12 bg-[linear-gradient(180deg,#0D1014,#0A0D11)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                  >
                    <p className="text-xl font-bold text-white">{title}</p>
                    <p className="mt-3 text-sm leading-7 text-[#9F9F9F]">{text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-xl font-semibold text-[#17E8FF]">
                Il existe une solution. Et elle coûte 60 DT/mois.
              </p>
            </div>
          </section>

          <section id="solution" className={`section-reveal py-16 ${visible.solution ? "visible" : ""}`}>
            <div className="mx-auto max-w-6xl">
              <span className="inline-flex rounded-full border border-[#00FF88]/30 bg-[#00FF88]/6 px-4 py-2 text-xs font-bold tracking-[0.18em] text-[#9DFBCB]">
                ✦ LA SOLUTION
              </span>
              <h2
                className="mt-5 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                AIPilot — Le Même Codex,
                <br />
                5x Moins Cher
              </h2>

              <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
                <ComparisonPanel
                  title="Sans AIPilot"
                  items={[
                    "310 DT/mois",
                    "Carte USD obligatoire",
                    "Sessions limitées",
                    "Reset toutes les 5h",
                    "Disponible que dans certains pays",
                  ]}
                  tone="red"
                />
                <div className="flex items-center justify-center text-4xl font-black text-[#17E8FF] lg:text-6xl">
                  VS
                </div>
                <ComparisonPanel
                  title="Avec AIPilot"
                  items={[
                    "60 DT/mois",
                    "D17 / Virement / Wafa Cash / IWI",
                    "Aucune limite de sessions",
                    "Code à 3h du matin si tu veux",
                    "100% disponible en Tunisie",
                  ]}
                  tone="green"
                />
              </div>

              <div className="mt-8 rounded-[24px] border border-[#17E8FF]/14 bg-[linear-gradient(180deg,#0B1116,#080C10)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#17E8FF]">
                    Un seul abonnement, plusieurs façons de coder
                  </p>
                  <h3
                    className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl"
                    style={{ fontFamily: "var(--font-outfit)" }}
                  >
                    Utilise Codex, T3 Code ou OpenCode sans limite et gagne du temps sans payer 310 DT/mois.
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#AFC0CE] sm:text-base">
                    Tu choisis l’outil qui te convient le mieux, AIPilot s’occupe du setup, de la configuration Azure, et tu gardes le même niveau de productivité pour beaucoup moins cher.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {toolFreedom.map(([title, text]) => (
                    <div
                      key={title}
                      className="rounded-[20px] border border-white/8 bg-white/[0.03] p-5"
                    >
                      <p className="text-lg font-bold text-white">{title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#B3C0CB]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="comparison" className={`section-reveal py-16 ${visible.comparison ? "visible" : ""}`}>
            <div className="mx-auto max-w-6xl">
              <h2
                className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                GPT-5.5 — Numéro 1 Mondial du Coding
              </h2>
              <p className="mt-4 text-lg text-[#A4A4A4]">
                Meilleur que Claude Opus 4.6, meilleur que Gemini 2.5 Pro.
              </p>

              <div className="mt-8 overflow-x-auto rounded-[24px] border border-white/10 bg-[#111111]">
                <table className="min-w-[720px] w-full text-left">
                  <thead className="border-b border-white/10 text-sm text-[#8B8B8B]">
                    <tr>
                      <th className="px-5 py-4">Critère</th>
                      <th className="px-5 py-4 text-[#00FF88]">GPT-5.5</th>
                      <th className="px-5 py-4">Claude 4.6</th>
                      <th className="px-5 py-4">Gemini 2.5</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      ["Coding benchmark", "🥇 #1", "#2", "#3"],
                      ["Résolution de bugs", "⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"],
                      ["Multi-fichiers", "⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐"],
                      ["Disponible en DT", "✅ Via AIPilot", "❌", "❌"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-b border-white/6 last:border-b-0">
                        {row.map((cell, index) => (
                          <td
                            key={`${row[0]}-${index}`}
                            className={`px-5 py-4 ${index === 1 ? "font-bold text-white" : "text-[#D2D2D2]"}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {stats.map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-[#111111] p-6 text-center"
                  >
                    <div
                      className="text-5xl font-black text-[#17E8FF] sm:text-6xl"
                      style={{ fontFamily: "var(--font-outfit)" }}
                    >
                      {index === 0 ? statValue0 : index === 1 ? statValue1 : statValue2}
                      {item.suffix}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#A3A3A3]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="features" className={`section-reveal py-16 ${visible.features ? "visible" : ""}`}>
            <div className="mx-auto max-w-6xl">
              <h2
                className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                Tout ce qui est inclus
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {features.map(([icon, title, text]) => (
                  <div
                    key={title}
                    className="group rounded-[24px] border border-[#17E8FF]/12 bg-[linear-gradient(180deg,#0D1014,#0A0D11)] p-6 transition hover:border-[#17E8FF]/50 hover:shadow-[0_0_40px_rgba(23,232,255,0.08)]"
                  >
                    <div className="text-3xl">{icon}</div>
                    <p className="mt-4 text-xl font-bold text-white">{title}</p>
                    <p className="mt-3 text-sm leading-7 text-[#999999]">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="steps" className={`section-reveal py-16 ${visible.steps ? "visible" : ""}`}>
            <div className="mx-auto max-w-5xl">
              <h2
                className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                Prêt à coder avec GPT-5.5 en 5 min
              </h2>
              <div className="relative mt-10 space-y-10 before:absolute before:left-5 before:top-0 before:h-full before:w-px before:bg-gradient-to-b before:from-[#00FF88] before:to-transparent md:before:left-8">
                {[
                  ["①", "Remplis le formulaire", "Ton prénom + ton WhatsApp → reçois ton essai gratuit immédiatement"],
                  ["②", "Télécharge l’installateur", "Un seul fichier, installe et configure tout en 5 min"],
                  ["③", "Code avec GPT-5.5", "Ouvre Codex — ton IA numéro 1 mondiale t’attend"],
                ].map(([number, title, text]) => (
                  <div key={title} className="relative flex gap-5 pl-14 md:pl-20">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-[#17E8FF]/50 bg-[#17E8FF]/10 text-sm font-black text-[#17E8FF] md:h-16 md:w-16 md:text-lg">
                      {number}
                    </div>
                    <div className="rounded-[24px] border border-[#17E8FF]/12 bg-[#0D1014] p-6">
                      <p className="text-2xl font-bold text-white">{title}</p>
                      <p className="mt-3 text-sm leading-7 text-[#A5A5A5]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="scarcity" className={`section-reveal py-16 ${visible.scarcity ? "visible" : ""}`}>
            <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-[#111111] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <p className="text-4xl font-black text-[#FF4B4B] sm:text-6xl" style={{ fontFamily: "var(--font-outfit)" }}>
                ⚠️ Seulement {spotsLeft} Places Disponibles
              </p>
              <div className="mt-6 inline-flex items-center justify-center rounded-full border border-[#FF4B4B]/40 bg-[#FF3D3D]/10 px-6 py-3 text-xl font-black text-[#FF5E5E]">
                {spotsLeft} places restantes
              </div>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#CFCFCF]">
                L’essai gratuit 1 jour est disponible uniquement pour les prochains développeurs qui s’inscrivent. Après ? Liste d’attente. Mouch wa9t el taswif.
              </p>
              <a
                href="#form"
                className="cta-pulse cta-yellow mt-8 inline-flex min-h-12 w-full max-w-2xl items-center justify-center rounded-full px-5 py-4 text-base font-black leading-none shadow-[0_14px_34px_rgba(255,240,106,0.18)] transition hover:scale-[1.01] sm:px-6 sm:text-lg"
              >
                <span className="sm:hidden whitespace-nowrap">🚀 Je veux ma place</span>
                <span className="hidden whitespace-nowrap sm:inline">🚀 Je veux ma place — Essai gratuit</span>
              </a>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-[#D0D0D0]">
                <span>✓ Aucun paiement maintenant</span>
                <span>✓ 1 jour d’essai complet</span>
                <span>✓ Activation en 5 minutes</span>
              </div>
            </div>
          </section>

          <section id="form" className={`section-reveal py-16 ${visible.form ? "visible" : ""}`}>
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#00FF88]">
                  Réserve ta place maintenant
                </p>
                <h2
                  className="mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  Formulaire d’essai gratuit
                </h2>
                <p className="mt-4 text-base leading-8 text-[#ADADAD]">
                  Remplis juste ton prénom et ton WhatsApp. On garde ça simple, rapide, et orienté conversion.
                </p>
              </div>

              <div className="rounded-[28px] border border-[#17E8FF]/12 bg-[linear-gradient(180deg,#111111,#0C0F13)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-white">Ton prénom</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex: Mohamed"
                      className="min-h-14 w-full rounded-2xl border border-[#2B3846] bg-[#0B0E11] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#748190] focus:border-[#17E8FF]/60 focus:shadow-[0_0_0_4px_rgba(23,232,255,0.12)]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-white">Ton numéro WhatsApp</span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(event) => setPhone(formatWhatsappInput(event.target.value))}
                      placeholder="Ex: +216 29 293 038"
                      className="min-h-14 w-full rounded-2xl border border-[#2B3846] bg-[#0B0E11] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#748190] focus:border-[#17E8FF]/60 focus:shadow-[0_0_0_4px_rgba(23,232,255,0.12)]"
                    />
                    {phone.trim() ? (
                      normalizedPhone ? (
                        <span className="mt-2 block text-sm text-[#8BFFBF]">
                          Numéro détecté: {normalizedPhone.display}
                        </span>
                      ) : (
                        <span className="mt-2 block text-sm text-[#FF7B7B]">
                          Corrige ton numéro pour continuer.
                        </span>
                      )
                    ) : null}
                  </label>

                  <button
                    type="button"
                    onClick={submitTrial}
                    disabled={formState.status === "submitting"}
                    className="cta-pulse cta-yellow min-h-14 w-full rounded-full px-5 py-4 text-base font-black leading-none shadow-[0_14px_34px_rgba(255,240,106,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg"
                  >
                    {formState.status === "submitting"
                      ? "Activation en cours..."
                      : (
                        <>
                          <span className="sm:hidden whitespace-nowrap">→ Obtenir mon essai</span>
                          <span className="hidden whitespace-nowrap sm:inline">→ Obtenir mon essai gratuit 1 jour</span>
                        </>
                      )}
                  </button>

                  {formState.status === "success" ? (
                    <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-3 text-sm text-[#B5FFD4]">
                      ✅ {formState.message}
                    </div>
                  ) : null}
                  {formState.status === "error" ? (
                    <div className="rounded-2xl border border-[#FF4B4B]/20 bg-[#FF3D3D]/10 px-4 py-3 text-sm text-[#FFC0C0]">
                      {formState.message}
                    </div>
                  ) : null}

                  <p className="text-sm leading-7 text-[#A9A9A9]">
                    🔒 Tes informations sont 100% privées. Tu recevras uniquement ton lien de téléchargement sur WhatsApp.
                  </p>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[#D5DEE7]">
                    <span className="font-semibold text-white">Confiance:</span> un humain AIPilot te répond sur WhatsApp après ton essai, pas un bot anonyme.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="faq" className={`section-reveal py-16 ${visible.faq ? "visible" : ""}`}>
            <div className="mx-auto max-w-5xl">
              <h2
                className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                Questions Fréquentes
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#AEB8C2]">
                Réponses simples, sans jargon. Le but est que n’importe quel développeur comprenne rapidement comment AIPilot fonctionne et ce qu’il reçoit exactement.
              </p>
              <div className="mt-8 space-y-4">
                {faqs.map((item, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={item.q}
                      className={`overflow-hidden rounded-[24px] border transition ${
                        isOpen
                          ? "border-[#17E8FF]/35 bg-[linear-gradient(180deg,#11151A,#0C1015)] shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                          : "border-white/10 bg-[#0D1014]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                            isOpen
                              ? "border-[#17E8FF]/40 bg-[#17E8FF]/10 text-[#BDF7FF]"
                              : "border-white/12 bg-white/[0.04] text-[#D8E1EA]"
                          }`}>
                            ?
                          </div>
                          <span className="text-base font-bold leading-7 text-white">{item.q}</span>
                        </div>
                        <span className={`text-xl ${isOpen ? "text-[#17E8FF]" : "text-[#96A5B3]"}`}>{isOpen ? "−" : "+"}</span>
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-white/8 px-5 pb-6 pt-1">
                            <p className="pl-12 text-sm leading-8 text-[#CFD6DE]">{item.a}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        body {
          background: #0a0a0a;
          color: #ffffff;
          font-family: var(--font-manrope), sans-serif;
          line-height: 1.6;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.03;
          z-index: 9999;
          background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0 1px, transparent 1px),
            radial-gradient(circle at 80% 30%, rgba(255,255,255,0.35) 0 1px, transparent 1px),
            radial-gradient(circle at 40% 70%, rgba(255,255,255,0.5) 0 1px, transparent 1px);
          background-size: 18px 18px, 24px 24px, 20px 20px;
        }

        h1,
        h2,
        h3 {
          text-wrap: balance;
        }

        p,
        li {
          text-wrap: pretty;
        }

        .hero-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 34%),
            linear-gradient(180deg, rgba(14, 153, 201, 0.12), rgba(0,0,0,0) 34%);
          z-index: 1;
          pointer-events: none;
        }

        .hero-grid {
          background:
            linear-gradient(rgba(18, 232, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(18, 232, 255, 0.08) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.1));
          opacity: 0.35;
        }

        .section-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .section-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .cta-pulse {
          animation: pulse 2s infinite;
        }

        .cta-yellow {
          background: linear-gradient(180deg, #fff38a 0%, #fff06a 48%, #f2dc46 100%);
          color: #131313 !important;
        }

        .cta-yellow * {
          color: #131313 !important;
        }

        input,
        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        ::selection {
          background: rgba(0, 255, 136, 0.28);
          color: #ffffff;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 240, 106, 0.28);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(255, 240, 106, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 240, 106, 0);
          }
        }
      `}</style>
    </>
  );
}

function ComparisonPanel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "red" | "green";
}) {
  return (
    <div
      className={`rounded-[24px] border p-6 ${
        tone === "green"
          ? "border-[#17E8FF]/30 bg-[#08141A]"
          : "border-[#FF3D3D]/20 bg-[#171010]"
      }`}
    >
      <p className={`text-2xl font-bold ${tone === "green" ? "text-[#17E8FF]" : "text-[#FF6B6B]"}`}>
        {title}
      </p>
      <ul className="mt-5 space-y-3 text-sm leading-7 text-[#D0D0D0]">
        {items.map((item) => (
          <li key={item}>{tone === "green" ? "✅" : "❌"} {item}</li>
        ))}
      </ul>
    </div>
  );
}
