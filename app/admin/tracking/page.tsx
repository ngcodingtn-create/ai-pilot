import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  listPipelineClients,
  listRecentFacebookEvents,
  type PipelineClientRecord,
} from "@/lib/client-pipeline-store";
import { listRecentMarketingEvents } from "@/lib/marketing-event-store";
import { normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

type TrackingFeedItem = {
  id: string;
  source: "capi" | "pixel";
  eventName: string;
  clientName: string;
  phone?: string;
  createdAt: string;
};

export default async function AdminTrackingPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin?error=auth-required");
  }

  const [clients, facebookEvents, marketingEvents] = await Promise.all([
    listPipelineClients(),
    listRecentFacebookEvents(40),
    listRecentMarketingEvents(40),
  ]);

  const clientById = new Map(clients.map((client) => [client.id, client]));
  const clientByPhone = new Map<string, PipelineClientRecord>();
  for (const client of clients) {
    const key = phoneKey(client.phone);
    if (key) {
      clientByPhone.set(key, client);
    }
  }

  const capiItems: TrackingFeedItem[] = facebookEvents.map((event) => {
    const client = clientById.get(event.clientId);
    return {
      id: `capi-${event.id}`,
      source: "capi",
      eventName: eventLabel(event.eventName),
      clientName: clientLabel(client, event.clientId),
      phone: client?.phone,
      createdAt: event.sentAt,
    };
  });

  const pixelItems: TrackingFeedItem[] = marketingEvents.map((event) => {
    const client =
      (event.clientId ? clientById.get(event.clientId) : undefined) ||
      (event.phone ? clientByPhone.get(phoneKey(event.phone)) : undefined);
    return {
      id: `pixel-${event.id}`,
      source: "pixel",
      eventName: eventLabel(event.eventName),
      clientName: clientLabel(client, event.phone),
      phone: client?.phone || event.phone,
      createdAt: event.createdAt,
    };
  });

  const feed = [...capiItems, ...pixelItems]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);

  return (
    <main className="min-h-screen bg-[#020b12] px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(0,136,255,0.2),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(15,185,129,0.14),transparent_24%),linear-gradient(180deg,#04131d_0%,#020910_42%,#010509_100%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto w-full max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#35a6ff]">
              Meta Ads
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Tracking events
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Recent Pixel and CAPI activity from the funnel, confirmation page, and admin.
            </p>
          </div>
          <a
            href="/admin"
            className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200"
          >
            Admin
          </a>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <Metric label="CAPI" value={String(capiItems.length)} tone="emerald" />
          <Metric label="Pixel" value={String(pixelItems.length)} tone="blue" />
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-3 shadow-[0_18px_55px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="text-base font-semibold">Recent events</h2>
            <span className="text-xs font-medium text-slate-500">{feed.length} shown</span>
          </div>

          {feed.length ? (
            <div className="space-y-2">
              {feed.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </section>
      </div>
    </main>
  );
}

function EventRow({ event }: { event: TrackingFeedItem }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#06141f] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-bold ${
              event.source === "capi"
                ? "bg-emerald-500/14 text-emerald-300"
                : "bg-[#0a84ff]/14 text-[#35a6ff]"
            }`}
          >
            {event.source === "capi" ? "CA" : "PX"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-100">{event.eventName}</p>
              <Pill tone={event.source === "capi" ? "emerald" : "blue"}>
                {event.source === "capi" ? "CAPI" : "Pixel"}
              </Pill>
            </div>
            <p className="mt-1 truncate text-sm text-slate-300">{event.clientName}</p>
            {event.phone ? (
              <p className="mt-1 text-xs text-slate-500">{formatPhone(event.phone)}</p>
            ) : null}
          </div>
        </div>
        <time className="shrink-0 text-right text-xs leading-5 text-slate-500">
          {formatDateTime(event.createdAt)}
        </time>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald";
}) {
  const toneClass = tone === "emerald" ? "text-emerald-300" : "text-[#35a6ff]";

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-center">
      <p className="font-semibold">No tracking events yet</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Submit a funnel lead or send a WhatsApp handoff to populate this feed.
      </p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "blue" | "emerald"; children: ReactNode }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/14 text-emerald-300"
      : "bg-[#0a84ff]/14 text-[#35a6ff]";

  return <span className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function clientLabel(client: PipelineClientRecord | undefined, fallback?: string) {
  if (client?.name?.trim()) {
    return client.name.trim();
  }

  if (client?.phone) {
    return formatPhone(client.phone);
  }

  if (fallback) {
    return formatPhone(fallback);
  }

  return "Unknown client";
}

function phoneKey(phone: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

function formatPhone(phone: string) {
  return normalizeTunisiaWhatsappNumber(phone)?.display ?? phone;
}

function eventLabel(eventName: string) {
  const labels: Record<string, string> = {
    FunnelSuccess: "Funnel success",
    InitiateCheckout: "Initiate checkout",
    Lead: "Lead",
    Purchase: "Purchase",
    StartTrial: "Start trial",
    WhatsAppClick: "WhatsApp click",
  };

  return labels[eventName] ?? eventName;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
