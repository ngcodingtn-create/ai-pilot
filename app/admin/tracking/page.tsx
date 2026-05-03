import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listRecentFacebookEvents } from "@/lib/client-pipeline-store";
import { listRecentMarketingEvents } from "@/lib/marketing-event-store";

export default async function AdminTrackingPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin?error=auth-required");
  }

  const [facebookEvents, marketingEvents] = await Promise.all([
    listRecentFacebookEvents(75),
    listRecentMarketingEvents(75),
  ]);

  const pixelId =
    process.env.FB_PIXEL_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
    "";
  const hasCapiToken = Boolean(process.env.FB_CAPI_TOKEN);
  const graphApiVersion = process.env.FB_GRAPH_API_VERSION || "v19.0";
  const leadEvents = facebookEvents.filter((event) => event.eventName === "Lead").length;
  const purchaseEvents = facebookEvents.filter((event) => event.eventName === "Purchase").length;
  const whatsappClicks = marketingEvents.filter((event) => event.eventName === "WhatsAppClick").length;

  return (
    <main className="min-h-screen bg-[#020b12] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(0,136,255,0.24),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(15,185,129,0.16),transparent_24%),linear-gradient(180deg,#04131d_0%,#020910_42%,#010509_100%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#35a6ff]">
              Meta Ads
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pixel & CAPI Tracking</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Real events stored from the funnel, admin conversions, and WhatsApp handoffs.
            </p>
          </div>
          <a
            href="/admin"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-200"
          >
            Retour admin
          </a>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Pixel ID" value={pixelId || "Absent"} tone={pixelId ? "blue" : "amber"} />
          <Metric label="CAPI token" value={hasCapiToken ? "Présent" : "Absent"} tone={hasCapiToken ? "emerald" : "amber"} />
          <Metric label="Lead CAPI" value={String(leadEvents)} tone="blue" />
          <Metric label="Purchase CAPI" value={String(purchaseEvents)} tone="emerald" />
        </div>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Configuration</h2>
              <p className="mt-1 text-sm text-slate-500">No secret value is displayed here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill tone={hasCapiToken ? "emerald" : "amber"}>
                {hasCapiToken ? "CAPI actif" : "Token manquant"}
              </Pill>
              <Pill tone="blue">{graphApiVersion}</Pill>
              <Pill tone="slate">{facebookEvents.length + marketingEvents.length} events</Pill>
              <Pill tone="emerald">{whatsappClicks} WhatsApp</Pill>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
          <Panel title="Événements Meta récents" description="Lead, Purchase, déduplication and Graph API responses.">
            {facebookEvents.length ? (
              <div className="space-y-3">
                {facebookEvents.map((event) => (
                  <article key={event.id} className="rounded-3xl border border-white/10 bg-[#06141f] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={event.eventName === "Purchase" ? "emerald" : "blue"}>
                          {event.eventName}
                        </Pill>
                        {facebookStatusPill(event.fbResponse)}
                      </div>
                      <span className="text-xs text-slate-500">{formatDateTime(event.sentAt)}</span>
                    </div>
                    <p className="mt-3 break-all font-mono text-xs text-slate-400">
                      Client: {event.clientId}
                    </p>
                    <pre className="mt-3 max-h-52 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
                      {stringifyResponse(event.fbResponse)}
                    </pre>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="Aucun événement Meta enregistré" description="Submit a lead or convert a client to paid to see Graph responses here." />
            )}
          </Panel>

          <Panel title="Handoff WhatsApp" description="Automatic redirects and manual WhatsApp sends from confirmation flows.">
            {marketingEvents.length ? (
              <div className="space-y-3">
                {marketingEvents.map((event) => (
                  <article key={event.id} className="rounded-3xl border border-white/10 bg-[#06141f] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Pill tone="blue">{event.eventName}</Pill>
                      <span className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-400">
                      <p className="break-all">Phone: {event.phone || "unknown"}</p>
                      <p className="break-all">Event ID: {event.eventId || "none"}</p>
                      <p className="break-all">Source: {event.sourceUrl || "unknown"}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="Aucun handoff WhatsApp" description="Clicks and redirects will appear here after users reach /merci." />
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const toneClass = {
    blue: "text-[#35a6ff]",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
  }[tone];

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 break-all text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "blue" | "emerald" | "amber" | "slate";
  children: ReactNode;
}) {
  const toneClass = {
    blue: "bg-[#0a84ff]/14 text-[#35a6ff]",
    emerald: "bg-emerald-500/14 text-emerald-300",
    amber: "bg-amber-500/14 text-amber-300",
    slate: "bg-white/[0.07] text-slate-300",
  }[tone];

  return <span className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function facebookStatusPill(response: unknown) {
  if (response && typeof response === "object" && "skipped" in response) {
    const skipped = (response as { skipped?: unknown }).skipped;
    if (skipped) {
      return <Pill tone="amber">Skipped</Pill>;
    }
  }

  if (response && typeof response === "object" && "ok" in response) {
    return (response as { ok?: unknown }).ok ? <Pill tone="emerald">OK</Pill> : <Pill tone="amber">Erreur</Pill>;
  }

  return <Pill tone="slate">Stocké</Pill>;
}

function stringifyResponse(response: unknown) {
  try {
    return JSON.stringify(response ?? null, null, 2).slice(0, 2200);
  } catch {
    return String(response);
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
