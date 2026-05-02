"use client";

import Image from "next/image";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

type RevealMap = Record<string, boolean>;

type TrialFormState =
  | { status: "idle"; message?: undefined }
  | { status: "submitting"; message?: undefined }
  | { status: "success" | "error"; message: string };

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "TON_PIXEL_ID";

const features = [
  ["🤖", "Codex Officiel OpenAI", "L’app desktop officielle d’OpenAI, pas une copie."],
  ["⚡", "GPT-5.5 & GPT-5.4", "Choisis ton modèle selon ta mission de coding."],
  ["♾️", "Aucune limite de sessions", "Code autant que tu veux, 24h/24."],
  ["💳", "Paiement 100% Tunisien", "D17, virement, Wafa Cash ou IZI Payment."],
  ["⚙️", "Installation en 5 minutes", "Un installateur configure tout automatiquement."],
  ["🎁", "Essai gratuit 1 jour", "Teste d’abord, puis décide en toute tranquillité."],
];

const trustSignals = [
  "Codex officiel OpenAI",
  "Paiement en dinars tunisiens",
  "Support WhatsApp humain",
  "Installation guidée pas à pas",
];

const toolGallery = [
  {
    title: "Codex App",
    image: "/funnel/tools/tool-codex-app.webp",
    text: "Le vrai agent OpenAI avec GPT-5.5 ou GPT-5.4, prêt pour le multi-fichiers et les gros chantiers.",
  },
  {
    title: "T3 Code",
    image: "/funnel/tools/tool-t3code.jpg",
    text: "Une interface rapide, plus légère, idéale pour les devs qui veulent une UX clean et immédiate.",
  },
  {
    title: "OpenCode",
    image: "/funnel/tools/tool-opencode.webp",
    text: "Mode terminal puissant, parfait pour automatiser, itérer vite et rester sans limite toute la journée.",
  },
];

const proofSlides = [
  {
    type: "video" as const,
    title: "Vidéo WhatsApp AIPilot",
    src: "/funnel/whatsapp-proof/whatsapp-proof-video.mp4",
    poster: "/funnel/whatsapp-proof/whatsapp-proof-1.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 1",
    src: "/funnel/whatsapp-proof/whatsapp-proof-1.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 2",
    src: "/funnel/whatsapp-proof/whatsapp-proof-2.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 3",
    src: "/funnel/whatsapp-proof/whatsapp-proof-3.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 4",
    src: "/funnel/whatsapp-proof/whatsapp-proof-4.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 5",
    src: "/funnel/whatsapp-proof/whatsapp-proof-5.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 6",
    src: "/funnel/whatsapp-proof/whatsapp-proof-6.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 7",
    src: "/funnel/whatsapp-proof/whatsapp-proof-7.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 8",
    src: "/funnel/whatsapp-proof/whatsapp-proof-8.jpg",
  },
  {
    type: "image" as const,
    title: "Preuve WhatsApp 9",
    src: "/funnel/whatsapp-proof/whatsapp-proof-9.jpg",
  },
];

const PROOF_VIDEO_STORAGE_KEY = "aipilot-funnel-proof-video-state";

type ProofStoredState = {
  slideIndex: number;
  currentTime: number;
  pausedByUser: boolean;
};

function readStoredProofState(): ProofStoredState {
  if (typeof window === "undefined") {
    return { slideIndex: 0, currentTime: 0, pausedByUser: false };
  }

  try {
    const raw = window.sessionStorage.getItem(PROOF_VIDEO_STORAGE_KEY);
    if (!raw) {
      return { slideIndex: 0, currentTime: 0, pausedByUser: false };
    }

    const parsed = JSON.parse(raw) as Partial<ProofStoredState>;
    const slideIndex =
      typeof parsed.slideIndex === "number" && parsed.slideIndex >= 0 && parsed.slideIndex < proofSlides.length
        ? parsed.slideIndex
        : 0;
    const currentTime =
      typeof parsed.currentTime === "number" && Number.isFinite(parsed.currentTime) && parsed.currentTime >= 0
        ? parsed.currentTime
        : 0;

    return {
      slideIndex,
      currentTime,
      pausedByUser: Boolean(parsed.pausedByUser),
    };
  } catch {
    return { slideIndex: 0, currentTime: 0, pausedByUser: false };
  }
}

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
    a: "Après l’essai gratuit d’une journée, on te contacte sur WhatsApp pour finaliser la suite via D17, virement, Wafa Cash ou IZI Payment.",
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

export default function FunnelClient() {
  const initialProofState = readStoredProofState();
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
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [activeProofSlide, setActiveProofSlide] = useState(() => initialProofState.slideIndex);
  const [proofTouchStart, setProofTouchStart] = useState<number | null>(null);
  const [hasProofInteraction, setHasProofInteraction] = useState(false);
  const [proofVideoPausedByUser, setProofVideoPausedByUser] = useState(
    () => initialProofState.pausedByUser,
  );
  const [isProofVideoPlaying, setIsProofVideoPlaying] = useState(
    () => !initialProofState.pausedByUser && proofSlides[initialProofState.slideIndex]?.type === "video",
  );
  const proofVideoRef = useRef<HTMLVideoElement | null>(null);
  const proofMediaRef = useRef<HTMLDivElement | null>(null);
  const [isProofMediaVisible, setIsProofMediaVisible] = useState(false);
  const proofVideoProgressRef = useRef(initialProofState.currentTime);
  const normalizedPhone = normalizeTunisiaWhatsappNumber(phone);

  const persistProofState = useCallback((next: {
    slideIndex?: number;
    currentTime?: number;
    pausedByUser?: boolean;
  }) => {
    if (typeof window === "undefined") return;

    const current = {
      slideIndex: activeProofSlide,
      currentTime: proofVideoProgressRef.current,
      pausedByUser: proofVideoPausedByUser,
    };

    const payload = {
      ...current,
      ...next,
    };

    window.sessionStorage.setItem(PROOF_VIDEO_STORAGE_KEY, JSON.stringify(payload));
  }, [activeProofSlide, proofVideoPausedByUser]);

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

  useEffect(() => {
    const currentSlide = proofSlides[activeProofSlide];
    const video = proofVideoRef.current;

    if (!video) return;

    if (currentSlide?.type === "video" && isProofMediaVisible && !proofVideoPausedByUser) {
      if (Math.abs(video.currentTime - proofVideoProgressRef.current) > 0.35) {
        video.currentTime = proofVideoProgressRef.current;
      }
      video.muted = !hasProofInteraction;
      void video
        .play()
        .catch(() => {
          video.muted = true;
          void video.play().catch(() => {
            setIsProofVideoPlaying(false);
          });
        });
    } else {
      video.pause();
    }
  }, [activeProofSlide, hasProofInteraction, isProofMediaVisible, proofVideoPausedByUser]);

  useEffect(() => {
    const markInteraction = () => setHasProofInteraction(true);

    window.addEventListener("pointerdown", markInteraction, { passive: true, once: true });
    window.addEventListener("keydown", markInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
    };
  }, []);

  useEffect(() => {
    const element = proofMediaRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsProofMediaVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.4));
      },
      { threshold: [0, 0.4, 0.7] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScrollPause = () => {
      if (proofSlides[activeProofSlide]?.type !== "video") return;
      const video = proofVideoRef.current;
      if (!video || video.paused) return;
      if (!isProofMediaVisible) {
        proofVideoProgressRef.current = video.currentTime;
        persistProofState({ currentTime: video.currentTime });
        video.pause();
      }
    };

    window.addEventListener("scroll", handleScrollPause, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollPause);
  }, [activeProofSlide, isProofMediaVisible, persistProofState]);

  useEffect(() => {
    const updateFloatingCta = () => {
      const problemSection = document.getElementById("problem");
      const formSection = document.getElementById("form");
      if (!problemSection || !formSection) {
        setShowFloatingCta(false);
        return;
      }

      const scrollAnchor = window.scrollY + window.innerHeight * 0.28;
      const problemTop = problemSection.offsetTop;
      const formTop = formSection.offsetTop;

      setShowFloatingCta(scrollAnchor >= problemTop && scrollAnchor < formTop);
    };

    updateFloatingCta();
    window.addEventListener("scroll", updateFloatingCta, { passive: true });
    window.addEventListener("resize", updateFloatingCta);

    return () => {
      window.removeEventListener("scroll", updateFloatingCta);
      window.removeEventListener("resize", updateFloatingCta);
    };
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

  function setProofSlideIndex(nextIndex: number) {
    const normalizedIndex = (nextIndex + proofSlides.length) % proofSlides.length;
    const currentVideo = proofVideoRef.current;
    if (currentVideo) {
      proofVideoProgressRef.current = currentVideo.currentTime;
    }
    const nextIsVideo = proofSlides[normalizedIndex]?.type === "video";
    setIsProofVideoPlaying(nextIsVideo && !proofVideoPausedByUser);
    setActiveProofSlide(normalizedIndex);
    persistProofState({ slideIndex: normalizedIndex, currentTime: proofVideoProgressRef.current });
  }

  function goToPreviousProofSlide() {
    setProofSlideIndex(activeProofSlide - 1);
  }

  function goToNextProofSlide() {
    setProofSlideIndex(activeProofSlide + 1);
  }

  function toggleProofVideoPlayback() {
    const video = proofVideoRef.current;
    if (!video || proofSlides[activeProofSlide]?.type !== "video") return;

    setHasProofInteraction(true);

    if (video.paused) {
      setProofVideoPausedByUser(false);
      persistProofState({ pausedByUser: false, currentTime: video.currentTime });
      video.muted = false;
      void video.play().then(() => setIsProofVideoPlaying(true)).catch(() => setIsProofVideoPlaying(false));
    } else {
      setProofVideoPausedByUser(true);
      proofVideoProgressRef.current = video.currentTime;
      persistProofState({ pausedByUser: true, currentTime: video.currentTime });
      video.pause();
      setIsProofVideoPlaying(false);
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

      <div className="relative min-h-screen overflow-x-hidden bg-[#050607] pb-28 text-white sm:pb-32">
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
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300 sm:px-6 ${
            showFloatingCta
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0"
          }`}
        >
          <a
            href="#form"
            className="pointer-events-auto inline-flex w-full max-w-xl items-center gap-3 rounded-full border border-[#FFF06A]/40 bg-[#0C1014]/92 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:-translate-y-0.5"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF06A] text-xl shadow-[0_8px_24px_rgba(255,240,106,0.28)]">
              🎁
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-black text-white sm:text-base">
                Obtenir mon essai gratuit
              </span>
              <span className="block truncate text-[11px] font-medium text-[#C7D1DA] sm:text-xs">
                Aller directement au formulaire
              </span>
            </span>
            <span className="cta-yellow inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-black text-[#1A1600] shadow-[0_12px_24px_rgba(255,240,106,0.22)]">
              C’est gratuit
            </span>
          </a>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-0 sm:px-6 sm:py-6 lg:px-8">
          <section
            id="hero"
            className={`section-reveal relative min-h-[calc(100vh-5rem)] pb-4 pt-3 sm:py-10 ${visible.hero ? "visible" : ""}`}
          >
            <div className="pointer-events-none absolute inset-x-[-1rem] top-0 z-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(23,232,255,0.24)_0%,rgba(5,6,7,0.96)_58%,rgba(5,6,7,1)_84%)] sm:hidden" />
            <div className="relative z-10 mx-auto max-w-6xl">
              <div className="mx-auto max-w-5xl text-center">
              <h1
                className="mx-auto mt-4 max-w-[11ch] text-[2.45rem] font-extrabold leading-[1.01] tracking-[-0.055em] text-white sm:mt-5 sm:max-w-none sm:text-[4.4rem] sm:leading-[0.96] lg:text-[5.9rem]"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                <span className="block whitespace-nowrap">Codex OpenAI</span>
                <span className="block whitespace-nowrap">avec GPT-5.5,</span>
                <span className="block whitespace-nowrap text-[#17E8FF] drop-shadow-[0_0_24px_rgba(23,232,255,0.4)]">
                  Pour 60 DT/mois
                </span>
              </h1>

              <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-[#FFF06A] sm:text-base">
                Offre Codex 100 dollar
              </p>

              <div className="mt-4 text-sm font-semibold text-[#FF7070]">
                <span className="line-through opacity-80">310 DT/mois</span>
                <span className="mx-2 text-white/40">→</span>
                <span className="text-[#FFF06A]">60 DT/mois avec AIPilot</span>
              </div>

              <div className="hero-stage relative left-1/2 mt-6 w-screen -translate-x-1/2 overflow-hidden bg-transparent sm:left-auto sm:mt-10 sm:w-auto sm:translate-x-0 sm:rounded-[32px] sm:border sm:border-[#17E8FF]/14 sm:bg-[#05090D] sm:shadow-[0_35px_100px_rgba(0,0,0,0.55)]">
                <div className="relative aspect-[16/10.8] sm:aspect-[16/9]">
                  <div className="hero-grid absolute inset-0 z-0" />
                  <Image
                    src="/funnel/aipilot-hero-desk.png"
                    alt="AIPilot Manager, Codex et support WhatsApp"
                    fill
                    className="object-cover object-center opacity-92"
                    priority
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,11,0.06),rgba(4,7,11,0.12)_42%,rgba(4,7,11,0.32)_100%)]" />
                </div>
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
                    "D17 / Virement / Wafa Cash / IZI",
                    "Aucune limite de sessions (VIA API)",
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
                    Utilise Codex, T3 Code ou OpenCode sans limite, avec le même niveau de puissance pour beaucoup moins cher.
                  </h3>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {toolGallery.map((item) => (
                    <div
                      key={item.title}
                      className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#10161C,#0A0E12)] shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                    >
                      <div className="relative h-40 border-b border-white/8 bg-[radial-gradient(circle_at_top,rgba(23,232,255,0.16),transparent_60%)]">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover object-top"
                        />
                      </div>
                      <div className="p-5">
                        <p className="text-lg font-bold text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-[#B7C3CD]">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="section-reveal py-16 visible">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-end justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#17E8FF]">
                    Preuves clients
                  </p>
                  <h2
                    className="mt-3 text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
                    style={{ fontFamily: "var(--font-outfit)" }}
                  >
                    Captures réelles + retours WhatsApp
                  </h2>
                  <p className="mt-4 text-base leading-8 text-[#AEB8C2]">
                    Des échanges, des captures et une vidéo courte pour voir concrètement comment AIPilot est reçu, installé et utilisé.
                  </p>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-[28px] border border-[#17E8FF]/12 bg-[linear-gradient(180deg,#10161C,#0A0E12)] shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
                <div
                  className="relative bg-[radial-gradient(circle_at_top,rgba(23,232,255,0.18),transparent_58%)]"
                  onTouchStart={(event) => setProofTouchStart(event.touches[0]?.clientX ?? null)}
                  onTouchEnd={(event) => {
                    if (proofTouchStart === null) return;
                    const touchEnd = event.changedTouches[0]?.clientX ?? proofTouchStart;
                    const delta = touchEnd - proofTouchStart;
                    if (Math.abs(delta) > 45) {
                      if (delta > 0) {
                        goToPreviousProofSlide();
                      } else {
                        goToNextProofSlide();
                      }
                    }
                    setProofTouchStart(null);
                  }}
                >
                  <div
                    ref={proofMediaRef}
                    className="relative aspect-[9/16] w-full min-h-[34rem] overflow-hidden bg-[#070B0F] sm:aspect-[4/3] sm:min-h-[28rem] lg:min-h-[36rem] xl:min-h-[42rem]"
                  >
                    {proofSlides.map((slide, index) => (
                      <div
                        key={slide.title}
                        className={`absolute inset-0 transition-all duration-500 ${
                          index === activeProofSlide
                            ? "pointer-events-auto translate-x-0 opacity-100"
                            : "pointer-events-none translate-x-4 opacity-0"
                        }`}
                      >
                        {slide.type === "video" ? (
                          <button
                            type="button"
                            onClick={toggleProofVideoPlayback}
                            className="absolute inset-0 block"
                            aria-label={isProofVideoPlaying ? "Mettre la vidéo en pause" : "Lire la vidéo"}
                          >
                            <video
                              ref={proofVideoRef}
                              src={slide.src}
                              poster={slide.poster}
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              controls={false}
                              onLoadedMetadata={(event) => {
                                const target = event.currentTarget;
                                if (proofVideoProgressRef.current > 0 && proofVideoProgressRef.current < target.duration) {
                                  target.currentTime = proofVideoProgressRef.current;
                                }
                              }}
                              onTimeUpdate={(event) => {
                                const target = event.currentTarget;
                                proofVideoProgressRef.current = target.currentTime;
                                persistProofState({ currentTime: target.currentTime });
                              }}
                              onPlay={() => setIsProofVideoPlaying(true)}
                              onPause={(event) => {
                                proofVideoProgressRef.current = event.currentTarget.currentTime;
                                persistProofState({ currentTime: event.currentTarget.currentTime });
                                setIsProofVideoPlaying(false);
                              }}
                              className="h-full w-full object-contain p-3 sm:p-5"
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,11,0.02),rgba(7,9,11,0.04)_42%,rgba(7,9,11,0.16)_100%)]" />
                            <span className={`absolute inset-x-0 bottom-5 flex justify-center transition-opacity ${isProofVideoPlaying ? "opacity-0" : "opacity-100"}`}>
                              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/60 text-2xl text-white shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur">
                                ▶
                              </span>
                            </span>
                          </button>
                        ) : (
                          <>
                            <Image
                              src={slide.src}
                              alt={slide.title}
                              fill
                              className="object-contain p-3 sm:p-5"
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,11,0.04),rgba(7,9,11,0.08)_42%,rgba(7,9,11,0.18)_100%)]" />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3 border-t border-white/8 bg-[#0B0F13]/98 px-4 py-4 backdrop-blur sm:gap-4 sm:px-6">
                    <button
                      type="button"
                      onClick={goToPreviousProofSlide}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:bg-white/16"
                      aria-label="Slide précédent"
                    >
                      ←
                    </button>
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      {proofSlides.map((slide, index) => (
                        <button
                          key={slide.title}
                          type="button"
                          onClick={() => setProofSlideIndex(index)}
                          className={`h-2.5 rounded-full transition ${
                            index === activeProofSlide
                              ? "w-9 bg-[#17E8FF] shadow-[0_0_18px_rgba(23,232,255,0.36)]"
                              : "w-2.5 bg-white/35 hover:bg-white/55"
                          }`}
                          aria-label={`Aller au slide ${index + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={goToNextProofSlide}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:bg-white/16"
                      aria-label="Slide suivant"
                    >
                      →
                    </button>
                  </div>
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

              <div className="mt-8 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#10161C,#0A0E12)] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="relative bg-[radial-gradient(circle_at_top,rgba(23,232,255,0.14),transparent_60%)]">
                  <Image
                    src="/funnel/gpt55-benchmark.png"
                    alt="Benchmark GPT-5.5 versus autres modèles"
                    width={1390}
                    height={900}
                    className="h-auto w-full object-cover"
                  />
                </div>
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
                  {
                    number: "①",
                    title: "Remplis le formulaire",
                    text: "Ton prénom + ton WhatsApp → reçois ton essai gratuit immédiatement",
                    image: "/funnel/step-form.png",
                    imageClass: "object-cover object-[center_44%] scale-[1.18] sm:scale-[1.12]",
                    imageWrapperClass: "bg-[radial-gradient(circle_at_top,rgba(23,232,255,0.1),transparent_60%)]",
                  },
                  {
                    number: "②",
                    title: "Télécharge l’installateur",
                    text: "Un seul fichier, installe et configure tout en 5 min",
                    image: "/funnel/step-manager.png",
                    imageClass: "object-cover object-top",
                    imageWrapperClass: "bg-[radial-gradient(circle_at_top,rgba(23,232,255,0.16),transparent_60%)]",
                  },
                  {
                    number: "③",
                    title: "Code avec GPT-5.5",
                    text: "Ouvre Codex — ton IA numéro 1 mondiale t’attend",
                    image: "/funnel/step-codex-vscode.webp",
                    imageClass: "object-cover object-top",
                    imageWrapperClass: "bg-[radial-gradient(circle_at_top,rgba(23,232,255,0.16),transparent_60%)]",
                  },
                ].map((step) => (
                  <div key={step.title} className="relative flex gap-5 pl-14 md:pl-20">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-[#17E8FF]/50 bg-[#17E8FF]/10 text-sm font-black text-[#17E8FF] md:h-16 md:w-16 md:text-lg">
                      {step.number}
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-[#17E8FF]/12 bg-[#0D1014]">
                      <div className={`relative aspect-[16/9] overflow-hidden border-b border-white/8 ${step.imageWrapperClass}`}>
                        <Image
                          src={step.image}
                          alt={step.title}
                          fill
                          className={step.imageClass}
                        />
                      </div>
                      <div className="p-6">
                        <p className="text-2xl font-bold text-white">{step.title}</p>
                        <p className="mt-3 text-sm leading-7 text-[#A5A5A5]">{step.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="scarcity" className={`section-reveal py-16 ${visible.scarcity ? "visible" : ""}`}>
            <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-[#111111] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <p className="text-4xl font-black text-[#FF4B4B] sm:text-6xl" style={{ fontFamily: "var(--font-outfit)" }}>
                ⚠️ Seulement
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
