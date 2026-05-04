"use client";

import { type ButtonHTMLAttributes, type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  FileDown,
  Home,
  KeyRound,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  PackagePlus,
  Search,
  Settings,
  User,
  Users,
  Wand2,
  X,
} from "lucide-react";
import type { AccessRequestRecord } from "@/lib/access-request-store";
import type { StoredConfig } from "@/lib/config-store";
import type { LicenseRecord } from "@/lib/license-store";
import type { ClientStatus, PipelineClientRecord } from "@/lib/client-pipeline-store";
import { buildWhatsAppUrl, normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";
import {
  AIPILOT_APIM_OPENAI_BASE_URL,
  AIPILOT_DEPLOYMENTS,
  AIPILOT_PRIMARY_DEPLOYMENT,
  buildAipilotCodexConfig,
  buildAipilotMachineEnvOneLiner,
} from "@/lib/aipilot-apim-settings";
import {
  acceptAccessRequestAction,
  activatePipelineTrialAction,
  convertPipelineClientToPaidAction,
  deleteAccessRequestAction,
  deletePipelineClientAction,
  createQuickSubscriptionAction,
  deleteSubscriptionAction,
  logoutAdmin,
  markPipelineClientLostAction,
  saveAdminConfig,
  touchPipelineClientContactAction,
  updateLicenseDetailsAction,
} from "./actions";

type AdminTab = "dashboard" | "subscriptions" | "requests" | "pipeline";
type SubscriptionTab = "active" | "disabled" | "expired";
type RequestStatusFilter = "pending" | "accepted" | "all";
type PipelineStatusFilter = ClientStatus | "all";
type SheetMode = "none" | "add" | "subscription" | "client" | "more" | "settings";

const ADMIN_MODEL_BADGES = AIPILOT_DEPLOYMENTS.slice(0, 3);

type TrackingStatus = {
  pixelId: string;
  hasCapiToken: boolean;
  graphApiVersion: string;
  facebookEventCount: number;
  marketingEventCount: number;
};

export type AdminConsoleProps = {
  usesDatabase: boolean;
  config: StoredConfig;
  licenses: LicenseRecord[];
  requests: AccessRequestRecord[];
  pipelineClients: PipelineClientRecord[];
  hiddenDuplicateCount: number;
  initialTab?: AdminTab;
  tracking: TrackingStatus;
  flash?: {
    saved?: boolean;
    created?: boolean;
    deleted?: boolean;
    updated?: boolean;
    trialCreated?: boolean;
    paidConverted?: boolean;
    lost?: boolean;
    requestAccepted?: boolean;
    licenseKey?: string;
    customer?: string;
    whatsapp?: string;
  };
};

const currency = new Intl.NumberFormat("fr-FR");

const sectionMeta: Record<AdminTab, { title: string; description: string }> = {
  dashboard: {
    title: "Dashboard",
    description: "Vue d’ensemble de votre pipeline global",
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Clients uniques et clés courantes",
  },
  requests: {
    title: "Requests",
    description: "Demandes WhatsApp à traiter",
  },
  pipeline: {
    title: "Pipeline",
    description: "Leads, essais et conversions paid",
  },
};

export default function AdminConsole({
  usesDatabase,
  config,
  licenses,
  requests,
  pipelineClients,
  hiddenDuplicateCount,
  initialTab = "dashboard",
  tracking,
  flash,
}: AdminConsoleProps) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [subscriptionTab, setSubscriptionTab] = useState<SubscriptionTab>("active");
  const [requestStatus, setRequestStatus] = useState<RequestStatusFilter>("pending");
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<SheetMode>("none");
  const [selectedLicense, setSelectedLicense] = useState<LicenseRecord | null>(null);
  const [selectedClient, setSelectedClient] = useState<PipelineClientRecord | null>(null);
  const [clientPatches, setClientPatches] = useState<Record<string, Partial<PipelineClientRecord>>>({});
  const [removedClientIds, setRemovedClientIds] = useState<string[]>([]);
  const [, startClientSync] = useTransition();

  const clientRows = useMemo(
    () =>
      sortPipelineClientsForUi(
        pipelineClients
          .filter((client) => !removedClientIds.includes(client.id))
          .map((client) =>
            clientPatches[client.id]
              ? {
                  ...client,
                  ...clientPatches[client.id],
                }
              : client,
          ),
      ),
    [clientPatches, pipelineClients, removedClientIds],
  );

  const selectedClientView = useMemo(
    () => (selectedClient ? clientRows.find((client) => client.id === selectedClient.id) ?? selectedClient : null),
    [clientRows, selectedClient],
  );

  const stats = useMemo(() => buildStats(licenses, requests, clientRows), [
    licenses,
    requests,
    clientRows,
  ]);

  const filteredSubscriptions = useMemo(
    () => filterLicenses(licenses, query, subscriptionTab),
    [licenses, query, subscriptionTab],
  );

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesRequest(request, query, requestStatus)),
    [requests, query, requestStatus],
  );

  const filteredClients = useMemo(
    () => clientRows.filter((client) => matchesClient(client, query, pipelineStatus)),
    [clientRows, query, pipelineStatus],
  );

  const globalResults = useMemo(() => {
    const normalized = normalizeQuery(query);
    if (!normalized) return { clients: [], subscriptions: [] };
    return {
      clients: filteredClients.slice(0, 4),
      subscriptions: filteredSubscriptions.slice(0, 4),
    };
  }, [filteredClients, filteredSubscriptions, query]);

  function openLicense(license: LicenseRecord) {
    setSelectedLicense(license);
    setSheet("subscription");
  }

  function openClient(client: PipelineClientRecord) {
    setSelectedClient(client);
    setSheet("client");
  }

  function patchClient(clientId: string, patch: Partial<PipelineClientRecord>) {
    const updatedAt = new Date().toISOString();
    const optimisticPatch = { ...patch, updatedAt };

    setClientPatches((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        ...optimisticPatch,
      },
    }));
    setSelectedClient((current) =>
      current?.id === clientId
        ? {
            ...current,
            ...optimisticPatch,
          }
        : current,
    );
  }

  function removeClient(clientId: string) {
    setRemovedClientIds((current) => (current.includes(clientId) ? current : [...current, clientId]));
    setClientPatches((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
    setSelectedClient((current) => (current?.id === clientId ? null : current));
    setSheet("none");
  }

  function contactClient(client: PipelineClientRecord) {
    const now = new Date().toISOString();
    patchClient(client.id, { lastContactedAt: now });

    const whatsappUrl = buildPipelineWhatsAppUrl(client.phone);
    const opened = window.open(whatsappUrl, "_blank");
    if (opened) {
      opened.opener = null;
    } else {
      window.location.href = whatsappUrl;
    }

    const formData = new FormData();
    formData.set("clientId", client.id);
    startClientSync(() => {
      void touchPipelineClientContactAction(formData).catch(() => {});
    });
  }

  return (
    <main className="min-h-screen bg-[#020b12] text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(0,136,255,0.24),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(15,185,129,0.16),transparent_24%),linear-gradient(180deg,#04131d_0%,#020910_42%,#010509_100%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <TopChrome title={sectionMeta[tab].title} description={sectionMeta[tab].description} />
        <FlashRail flash={flash} />
        <LicenseReadyCard flash={flash} />

        {tab === "dashboard" ? (
          <DashboardScreen stats={stats} usesDatabase={usesDatabase} tracking={tracking} />
        ) : null}

        {tab === "subscriptions" ? (
          <SubscriptionsScreen
            query={query}
            setQuery={setQuery}
            subscriptionTab={subscriptionTab}
            setSubscriptionTab={setSubscriptionTab}
            licenses={filteredSubscriptions}
            totalCount={licenses.length}
            hiddenDuplicateCount={hiddenDuplicateCount}
            globalResults={globalResults}
            onAdd={() => setSheet("add")}
            onOpen={openLicense}
          />
        ) : null}

        {tab === "requests" ? (
          <RequestsScreen
            query={query}
            setQuery={setQuery}
            requestStatus={requestStatus}
            setRequestStatus={setRequestStatus}
            requests={filteredRequests}
            onOpenClient={openClient}
          />
        ) : null}

        {tab === "pipeline" ? (
          <PipelineScreen
            query={query}
            setQuery={setQuery}
            pipelineStatus={pipelineStatus}
            setPipelineStatus={setPipelineStatus}
            clients={filteredClients}
            stats={stats}
            onOpen={openClient}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setSheet("add")}
        className="fixed bottom-24 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a84ff] text-white shadow-[0_18px_50px_rgba(10,132,255,0.42)] transition hover:bg-[#2d97ff] active:scale-95 md:right-[calc(50%-34rem)]"
        aria-label="Ajouter une subscription"
      >
        <PackagePlus className="h-6 w-6" />
      </button>

      <BottomNav active={tab} onChange={setTab} onMore={() => setSheet("more")} />

      <AddSubscriptionSheet open={sheet === "add"} onClose={() => setSheet("none")} />

      <SubscriptionDetailSheet
        license={selectedLicense}
        open={sheet === "subscription"}
        onClose={() => setSheet("none")}
      />

      <ClientDetailSheet
        client={selectedClientView}
        open={sheet === "client"}
        onClose={() => setSheet("none")}
        onContact={contactClient}
        onPatch={patchClient}
        onRemove={removeClient}
      />

      <MoreSheet
        open={sheet === "more"}
        onClose={() => setSheet("none")}
        onSettings={() => setSheet("settings")}
        tracking={tracking}
      />

      <SettingsSheet
        open={sheet === "settings"}
        onClose={() => setSheet("none")}
        config={config}
        usesDatabase={usesDatabase}
      />
    </main>
  );
}

function TopChrome({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-7 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-4 tracking-tight text-white">AIPilot</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Admin
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#0a84ff] to-[#63e6be] shadow-[0_12px_35px_rgba(10,132,255,0.24)]">
          <Wand2 className="h-6 w-6 text-white" />
        </div>
      </div>
    </header>
  );
}

function DashboardScreen({
  stats,
  usesDatabase,
  tracking,
}: {
  stats: ReturnType<typeof buildStats>;
  usesDatabase: boolean;
  tracking: TrackingStatus;
}) {
  const pipelineMax = Math.max(stats.leads, stats.trials, stats.paid, 1);
  const stageWidth = (value: number) => `${Math.max(32, Math.round((value / pipelineMax) * 100))}%`;

  return (
    <section className="space-y-5">
      <div className="flex justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300"
        >
          <CalendarDays className="h-4 w-4" />
          Période: 30 derniers jours
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Leads" value={stats.leads} change="18.6%" tone="blue" />
        <KpiCard icon={<KeyRound className="h-5 w-5" />} label="Trials" value={stats.trials} change="22.4%" tone="violet" />
        <KpiCard icon={<CircleDollarSign className="h-5 w-5" />} label="Conversions" value={stats.paid} change="19.8%" tone="emerald" />
        <KpiCard icon={<User className="h-5 w-5" />} label="Clients payants" value={stats.activeSubscriptions} change="23.1%" tone="amber" />
      </div>

      <GlassPanel className="p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Pipeline globale</h2>
          <Pill tone={tracking.hasCapiToken ? "emerald" : "amber"}>
            {tracking.hasCapiToken ? "CAPI actif" : "CAPI absent"}
          </Pill>
        </div>
        <div className="mt-7 space-y-2">
          <FunnelBar tone="blue" width={stageWidth(stats.leads)} label={`Lead · ${stats.leads}`} />
          <FunnelBar tone="violet" width={stageWidth(stats.trials)} label={`Free trial · ${stats.trials}`} />
          <FunnelBar tone="emerald" width={stageWidth(stats.paid)} label={`Paid · ${stats.paid}`} />
        </div>
        <div className="mt-7 space-y-3 text-sm">
          <LegendItem tone="blue" label="Lead" value={currency.format(stats.leads)} />
          <LegendItem tone="violet" label="Free trial" value={currency.format(stats.trials)} />
          <LegendItem tone="emerald" label="Paid" value={currency.format(stats.paid)} />
        </div>
        <div className="mt-6 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold text-slate-200">
          Source: {usesDatabase ? "Neon connecté" : "Fallback local"} · Pixel {tracking.pixelId || "absent"}
        </div>
      </GlassPanel>

    </section>
  );
}

function SubscriptionsScreen({
  query,
  setQuery,
  subscriptionTab,
  setSubscriptionTab,
  licenses,
  totalCount,
  hiddenDuplicateCount,
  globalResults,
  onAdd,
  onOpen,
}: {
  query: string;
  setQuery: (value: string) => void;
  subscriptionTab: SubscriptionTab;
  setSubscriptionTab: (tab: SubscriptionTab) => void;
  licenses: LicenseRecord[];
  totalCount: number;
  hiddenDuplicateCount: number;
  globalResults: { clients: PipelineClientRecord[]; subscriptions: LicenseRecord[] };
  onAdd: () => void;
  onOpen: (license: LicenseRecord) => void;
}) {
  return (
    <section className="space-y-4">
      <StickySearch
        query={query}
        onQuery={setQuery}
        placeholder="Rechercher un client, plan, statut..."
        actionLabel="Ajouter"
        onAction={onAdd}
      />
      <GlobalResults query={query} results={globalResults} />

      <div className="grid grid-cols-3 rounded-2xl bg-white/[0.035] p-1">
        {[
          ["active", "Actives"],
          ["disabled", "Suspendues"],
          ["expired", "Expirées"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSubscriptionTab(value as SubscriptionTab)}
            className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
              subscriptionTab === value
                ? "bg-[#0a84ff]/20 text-[#35a6ff] shadow-[inset_0_-2px_0_#0a84ff]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <span>{licenses.length} résultats</span>
        <span className="text-slate-600">·</span>
        <span>{totalCount} clients uniques</span>
        {hiddenDuplicateCount > 0 ? (
          <>
            <span className="text-slate-600">·</span>
            <span>{hiddenDuplicateCount} doublons masqués</span>
          </>
        ) : null}
      </div>

      <div className="space-y-3">
        {licenses.length ? (
          licenses.map((license) => (
            <SubscriptionCard key={license.id} license={license} query={query} onOpen={onOpen} />
          ))
        ) : (
          <EmptyDark title="Aucun abonnement" description="Essayez un autre filtre ou ajoutez une subscription." />
        )}
      </div>
    </section>
  );
}

function RequestsScreen({
  query,
  setQuery,
  requestStatus,
  setRequestStatus,
  requests,
}: {
  query: string;
  setQuery: (value: string) => void;
  requestStatus: RequestStatusFilter;
  setRequestStatus: (status: RequestStatusFilter) => void;
  requests: AccessRequestRecord[];
  onOpenClient: (client: PipelineClientRecord) => void;
}) {
  return (
    <section className="space-y-4">
      <StickySearch
        query={query}
        onQuery={setQuery}
        placeholder="Rechercher WhatsApp, client, outil..."
      />
      <StatusTabs
        value={requestStatus}
        onChange={(value) => setRequestStatus(value as RequestStatusFilter)}
        options={[
          ["pending", "En attente"],
          ["accepted", "Acceptées"],
          ["all", "Toutes"],
        ]}
      />
      <div className="space-y-3">
        {requests.length ? (
          requests.map((request) => <RequestCard key={request.id} request={request} />)
        ) : (
          <EmptyDark
            title="Aucune demande en attente"
            description="Toutes les demandes uniques reçues sont déjà traitées."
          />
        )}
      </div>
    </section>
  );
}

function PipelineScreen({
  query,
  setQuery,
  pipelineStatus,
  setPipelineStatus,
  clients,
  stats,
  onOpen,
}: {
  query: string;
  setQuery: (value: string) => void;
  pipelineStatus: PipelineStatusFilter;
  setPipelineStatus: (status: PipelineStatusFilter) => void;
  clients: PipelineClientRecord[];
  stats: ReturnType<typeof buildStats>;
  onOpen: (client: PipelineClientRecord) => void;
}) {
  const stages: Array<{ key: ClientStatus; label: string; count: number }> = [
    { key: "lead", label: "Lead", count: stats.leads },
    { key: "trial", label: "Trial", count: stats.trials },
    { key: "paid", label: "Paid", count: stats.paid },
    { key: "lost", label: "Lost", count: stats.lost },
  ];

  return (
    <section className="space-y-4">
      <StickySearch
        query={query}
        onQuery={setQuery}
        placeholder="Rechercher lead, phone, campagne..."
      />
      <StatusTabs
        value={pipelineStatus}
        onChange={(value) => setPipelineStatus(value as PipelineStatusFilter)}
        options={[
          ["all", "Tous"],
          ["lead", "Lead"],
          ["trial", "Trial"],
          ["paid", "Paid"],
          ["expired", "Expired"],
          ["lost", "Lost"],
        ]}
      />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {stages.map((stage) => (
          <GlassPanel key={stage.key} className="min-w-[11rem] p-4">
            <p className="text-sm font-semibold text-slate-200">{stage.label}</p>
            <p className="mt-2 text-3xl font-semibold">{currency.format(stage.count)}</p>
          </GlassPanel>
        ))}
      </div>
      <div className="space-y-3">
        {clients.length ? (
          clients.map((client) => <PipelineCard key={client.id} client={client} onOpen={onOpen} />)
        ) : (
          <EmptyDark title="Aucun client" description="Aucun client ne correspond à la recherche." />
        )}
      </div>
    </section>
  );
}

function StickySearch({
  query,
  onQuery,
  placeholder,
  actionLabel,
  onAction,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 bg-[#020b12]/88 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-3 text-slate-400">
          <Search className="h-5 w-5 shrink-0" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
        </label>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="hidden rounded-2xl bg-[#0a84ff] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(10,132,255,0.28)] sm:inline-flex"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GlobalResults({
  query,
  results,
}: {
  query: string;
  results: { clients: PipelineClientRecord[]; subscriptions: LicenseRecord[] };
}) {
  if (!normalizeQuery(query)) return null;

  return (
    <GlassPanel className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Recherche globale
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ResultGroup
          title="Clients"
          items={results.clients.map((client) => client.name || client.phone)}
          query={query}
        />
        <ResultGroup
          title="Subscriptions"
          items={results.subscriptions.map((license) => license.customerName)}
          query={query}
        />
      </div>
    </GlassPanel>
  );
}

function StatusTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-2xl bg-white/[0.035] p-1">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
            value === optionValue
              ? "bg-[#0a84ff]/20 text-[#35a6ff] shadow-[inset_0_-2px_0_#0a84ff]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ResultGroup({ title, items, query }: { title: string; items: string[]; query: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-slate-400">
        {items.length ? (
          items.map((item) => <p key={item}>{highlightMatch(item, query)}</p>)
        ) : (
          <p>Aucun résultat</p>
        )}
      </div>
    </div>
  );
}

function SubscriptionCard({
  license,
  query,
  onOpen,
}: {
  license: LicenseRecord;
  query: string;
  onOpen: (license: LicenseRecord) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(license)}
      className="group flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:border-[#0a84ff]/40 hover:bg-white/[0.075]"
    >
      <LogoTile name={license.customerName} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-100">
          {highlightMatch(license.customerName, query)}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Plan {planLabel(license.tier)}
        </p>
        <p className="text-xs text-slate-500">{shortDate(license.updatedAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusPill status={license.status} />
        <span className="text-xs text-slate-500">{license.preferredEnvironment}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-500 transition group-hover:text-slate-300" />
    </button>
  );
}

function RequestCard({ request }: { request: AccessRequestRecord }) {
  const whatsappUrl = buildAdminWhatsAppUrl(
    request.whatsappNumber,
    request.generatedLicenseKey,
    request.customerName,
  );

  return (
    <GlassPanel className="p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{request.customerName}</p>
              <p className="mt-1 text-sm text-slate-400">
                {formatPhone(request.whatsappNumber)}
              </p>
            </div>
            <Pill tone={request.status === "pending" ? "amber" : "emerald"}>
              {request.status === "pending" ? "En attente" : "Acceptée"}
            </Pill>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="blue">{environmentLabel(request.preferredEnvironment)}</Pill>
            <Pill tone="slate">{request.requestedOs}</Pill>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            {request.status === "pending" ? (
              <form action={acceptAccessRequestAction} className="flex gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <select
                  name="tier"
                  defaultValue="pro"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#06141f] px-3 py-3 text-sm text-slate-100 outline-none"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="max">Max</option>
                </select>
                <PendingButton
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"
                  pendingLabel="Création..."
                >
                  Créer trial
                </PendingButton>
              </form>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#06141f] px-3 py-3">
                <p className="text-xs text-slate-500">Clé générée</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-200">
                  {request.generatedLicenseKey || "Non disponible"}
                </p>
              </div>
            )}
            <a
              href={whatsappUrl ?? buildLooseWhatsAppUrl(request.whatsappNumber, request.customerName)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200"
            >
              WhatsApp
            </a>
            <form action={deleteAccessRequestAction}>
              <input type="hidden" name="requestId" value={request.id} />
              <PendingButton
                className="h-full min-h-12 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100"
                pendingLabel="Suppression..."
              >
                Supprimer
              </PendingButton>
            </form>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function PipelineCard({
  client,
  onOpen,
}: {
  client: PipelineClientRecord;
  onOpen: (client: PipelineClientRecord) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(client)}
      className="flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-left backdrop-blur-xl transition hover:border-[#0a84ff]/40"
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.08] text-[#35a6ff]">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{client.name || "Lead sans prénom"}</p>
        <p className="mt-1 truncate text-sm text-slate-400">{formatPhone(client.phone)}</p>
        <p className="mt-1 text-xs text-slate-500">{pipelineDate(client)}</p>
      </div>
      <PipelineStatusPill status={client.status} />
      <ChevronRight className="h-5 w-5 text-slate-500" />
    </button>
  );
}

function AddSubscriptionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter une subscription" compact>
      <form action={createQuickSubscriptionAction} className="space-y-4 pb-20">
        <Stepper />
        <FormSection title="Client">
          <DarkField label="Nom" name="customerName" required placeholder="Ex: Ahmed Slim" />
          <DarkField
            label="Email"
            name="customerEmail"
            type="email"
            placeholder="Optionnel"
          />
          <DarkField
            label="WhatsApp"
            name="whatsappNumber"
            required
            placeholder="Ex: +216 29 293 037"
            inputMode="tel"
          />
        </FormSection>
        <FormSection title="Stage">
          <DarkSelect
            label="État actuel"
            name="stage"
            defaultValue="trial"
            options={[
              ["lead", "Lead seulement"],
              ["trial", "Trial - générer clé essai"],
              ["paid", "Paid - générer clé payée"],
              ["done", "Done - payé et terminé"],
            ]}
          />
          <p className="rounded-2xl border border-[#0a84ff]/20 bg-[#0a84ff]/10 px-4 py-3 text-sm leading-6 text-[#9fd0ff]">
            Le plan Pro et OpenCode sont appliqués automatiquement. Après création, la clé
            s’affiche directement avec copier + WhatsApp.
          </p>
        </FormSection>
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-xl">
          <PendingButton
            className="h-14 w-full rounded-2xl bg-[#0a84ff] text-sm font-semibold text-white shadow-[0_18px_50px_rgba(10,132,255,0.34)]"
            pendingLabel="Création..."
          >
            Créer et préparer l’envoi
          </PendingButton>
        </div>
      </form>
    </Sheet>
  );
}

function SubscriptionDetailSheet({
  license,
  open,
  onClose,
}: {
  license: LicenseRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detailTab, setDetailTab] = useState<"details" | "billing" | "history">("details");
  const [copiedLicense, setCopiedLicense] = useState(false);
  if (!license) return null;
  const apimCredential = license.azureApiKey;

  return (
    <Sheet open={open} onClose={onClose} title="Modifier subscription" compact>
      <form action={updateLicenseDetailsAction} className="space-y-4 pb-20">
        <input type="hidden" name="licenseId" value={license.id} />
        <div className="flex items-center gap-3">
          <LogoTile name={license.customerName} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{license.customerName}</p>
            <p className="text-sm text-slate-400">Plan {planLabel(license.tier)}</p>
          </div>
          <StatusPill status={license.status} />
        </div>
        <div className="grid grid-cols-3 rounded-2xl bg-white/[0.035] p-1">
          {[
            ["details", "Détails"],
            ["billing", "Facturation"],
            ["history", "Historique"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDetailTab(value as "details" | "billing" | "history")}
              className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                detailTab === value ? "bg-[#0a84ff]/20 text-[#35a6ff]" : "text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {detailTab === "details" ? (
          <>
            <FormSection title="Informations client">
              <InlineEditField label="Nom du client" name="customerName" defaultValue={license.customerName} />
              <InlineEditField label="Email" name="customerEmail" defaultValue={license.customerEmail ?? ""} />
              <InlineEditField label="Notes" name="notes" defaultValue={license.notes ?? ""} />
            </FormSection>
            <FormSection title="Abonnement">
              <DarkSelect
                label="Plan"
                name="tier"
                defaultValue={license.tier}
                options={[
                  ["starter", "Starter"],
                  ["pro", "Plan Pro"],
                  ["max", "Max"],
                ]}
              />
              <DarkSelect
                label="Statut"
                name="status"
                defaultValue={license.status}
                options={[
                  ["active", "Active"],
                  ["disabled", "Suspendue"],
                ]}
              />
              <DarkSelect
                label="Outil"
                name="preferredEnvironment"
                defaultValue={license.preferredEnvironment}
                options={[
                  ["opencode", "OpenCode"],
                  ["codex", "Codex app"],
                  ["vscode-codex", "VS Code Codex"],
                  ["t3code", "T3 Code"],
                ]}
              />
              <div className="rounded-2xl border border-white/10 bg-[#06141f] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Licence client</p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-200">{license.licenseKey}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(license.licenseKey);
                      setCopiedLicense(true);
                      window.setTimeout(() => setCopiedLicense(false), 900);
                    }}
                    className="h-10 shrink-0 rounded-xl border border-[#0a84ff]/30 bg-[#0a84ff]/10 px-3 text-xs font-semibold text-[#9fd0ff]"
                  >
                    {copiedLicense ? "Copiée" : "Copier"}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Envoyez uniquement cette licence au client. Le manager récupère l’accès IA automatiquement.
                </p>
              </div>
              {apimCredential ? <AdminInstallerPanel apiKey={apimCredential} /> : null}
            </FormSection>
          </>
        ) : null}
        {detailTab === "billing" ? (
          <FormSection title="Facturation">
            <ReadOnlyRow label="Date de début" value={shortDate(license.createdAt)} />
            <ReadOnlyRow label="Prochaine facture" value={shortDate(license.updatedAt)} />
            <ReadOnlyRow label="Montant" value="60 DT" />
          </FormSection>
        ) : null}
        {detailTab === "history" ? (
          <FormSection title="Historique">
            <ReadOnlyRow label="Créée" value={formatDateTime(license.createdAt)} />
            <ReadOnlyRow label="Mise à jour" value={formatDateTime(license.updatedAt)} />
            <ReadOnlyRow label="Dernière validation" value={license.lastValidatedAt ? formatDateTime(license.lastValidatedAt) : "Aucune"} />
          </FormSection>
        ) : null}
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto grid max-w-xl grid-cols-[0.8fr_1.2fr] gap-2">
          <PendingButton
            formAction={deleteSubscriptionAction}
            className="h-14 rounded-2xl border border-rose-400/35 bg-rose-500/10 text-sm font-semibold text-rose-100"
            pendingLabel="Suppression..."
          >
            Supprimer
          </PendingButton>
          <PendingButton
            className="h-14 rounded-2xl bg-[#0a84ff] text-sm font-semibold text-white shadow-[0_18px_50px_rgba(10,132,255,0.34)]"
            pendingLabel="Enregistrement..."
          >
            Enregistrer
          </PendingButton>
        </div>
      </form>
    </Sheet>
  );
}

function AdminInstallerPanel({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState("");
  const configToml = buildAipilotCodexConfig({
    baseUrl: AIPILOT_APIM_OPENAI_BASE_URL,
    model: AIPILOT_PRIMARY_DEPLOYMENT,
  });
  const powerShell = buildAipilotMachineEnvOneLiner(apiKey);
  const previewPowerShell = buildAipilotMachineEnvOneLiner("CLE_IA_CLIENT");

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1000);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Configuration IA
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-100/80">
            À copier seulement pour une réparation manuelle. Le client reçoit la licence.
          </p>
        </div>
        <Pill tone="emerald">Prêt</Pill>
      </div>
      <div className="flex flex-wrap gap-2">
        {ADMIN_MODEL_BADGES.map((model) => (
          <span
            key={model.deployment}
            className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-50"
          >
            {model.deployment}
          </span>
        ))}
      </div>
      <InstallerSnippet
        title="Variables IA Windows"
        value={powerShell}
        displayValue={previewPowerShell}
        copied={copied === "powershell"}
        onCopy={() => copyValue("powershell", powerShell)}
      />
      <InstallerSnippet
        title="config.toml"
        value={configToml}
        copied={copied === "config"}
        onCopy={() => copyValue("config", configToml)}
        tall
      />
    </div>
  );
}

function InstallerSnippet({
  title,
  value,
  displayValue,
  copied,
  onCopy,
  tall = false,
}: {
  title: string;
  value: string;
  displayValue?: string;
  copied: boolean;
  onCopy: () => void;
  tall?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#020b12] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-300">{title}</p>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-xl border border-[#0a84ff]/30 bg-[#0a84ff]/10 px-3 py-1.5 text-xs font-semibold text-[#9fd0ff]"
        >
          {copied ? "Copié" : "Copy"}
        </button>
      </div>
      <pre
        className={`overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/25 p-3 font-mono text-[11px] leading-5 text-slate-200 ${
          tall ? "max-h-72" : "max-h-28"
        }`}
      >
        {displayValue ?? value}
      </pre>
    </div>
  );
}

function ClientDetailSheet({
  client,
  open,
  onClose,
  onContact,
  onPatch,
  onRemove,
}: {
  client: PipelineClientRecord | null;
  open: boolean;
  onClose: () => void;
  onContact: (client: PipelineClientRecord) => void;
  onPatch: (clientId: string, patch: Partial<PipelineClientRecord>) => void;
  onRemove: (clientId: string) => void;
}) {
  if (!client) return null;

  const markTrialOptimistic = () => {
    const now = new Date().toISOString();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    onPatch(client.id, {
      status: "trial",
      trialAt: now,
      trialEndsAt,
      licenseType: "trial",
      licenseKey: client.licenseKey ?? "Création...",
      licenseExpiresAt: trialEndsAt,
    });
  };

  const markPaidOptimistic = () => {
    const now = new Date().toISOString();
    onPatch(client.id, {
      status: "paid",
      paidAt: now,
      paymentDate: now,
      licenseType: "paid",
      licenseExpiresAt: undefined,
      apimStatus: "active",
    });
  };

  const markLostOptimistic = () => {
    onPatch(client.id, {
      status: "lost",
      trialAt: undefined,
      trialEndsAt: undefined,
      paidAt: undefined,
      licenseKey: undefined,
      licenseType: undefined,
      licenseExpiresAt: undefined,
      apimKey: undefined,
      apimStatus: "cancelled",
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Client pipeline">
      <div className="space-y-4 pb-10">
        <FormSection title={client.name || "Lead sans prénom"}>
          <ReadOnlyRow label="WhatsApp" value={formatPhone(client.phone)} />
          <ReadOnlyRow label="Email" value={client.email || "Non renseigné"} />
          <ReadOnlyRow label="Statut" value={client.status} />
          <ReadOnlyRow label="Source" value={client.utmSource || client.adSource || "—"} />
          <ReadOnlyRow label="Campagne" value={client.utmCampaign || "—"} />
          <ReadOnlyRow label="Licence" value={client.licenseKey || "Aucune"} />
          <ReadOnlyRow
            label="Dernier contact"
            value={client.lastContactedAt ? formatDateTime(client.lastContactedAt) : "Jamais"}
          />
        </FormSection>
        <button
          type="button"
          onClick={() => onContact(client)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15 active:scale-[0.99]"
        >
          <MessageCircle className="h-4 w-4" />
          Go WhatsApp
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          {client.status === "lead" || client.status === "expired" ? (
            <form action={activatePipelineTrialAction} onSubmit={markTrialOptimistic}>
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="preferredEnvironment" value="opencode" />
              <input type="hidden" name="tier" value="pro" />
              <PendingButton
                className="h-12 w-full rounded-2xl bg-[#0a84ff] text-sm font-semibold text-white"
                pendingLabel="Création..."
              >
                Créer free trial
              </PendingButton>
            </form>
          ) : null}
          {client.status === "trial" ? (
            <form action={convertPipelineClientToPaidAction} onSubmit={markPaidOptimistic}>
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="preferredEnvironment" value="opencode" />
              <input type="hidden" name="tier" value="pro" />
              <PendingButton
                className="h-12 w-full rounded-2xl bg-emerald-500 text-sm font-semibold text-white"
                pendingLabel="Conversion..."
              >
                Passer en paid
              </PendingButton>
            </form>
          ) : null}
          {client.status === "trial" ? (
            <form action={markPipelineClientLostAction} onSubmit={markLostOptimistic}>
              <input type="hidden" name="clientId" value={client.id} />
              <PendingButton
                className="h-12 w-full rounded-2xl border border-rose-400/35 bg-rose-500/10 text-sm font-semibold text-rose-100"
                pendingLabel="Mise à jour..."
              >
                Lost
              </PendingButton>
            </form>
          ) : null}
          {client.status === "paid" ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
              Client paid
            </div>
          ) : null}
          {client.status === "lost" || client.status === "cancelled" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-300">
              Client marqué lost
            </div>
          ) : null}
        </div>
        <form action={deletePipelineClientAction} onSubmit={() => onRemove(client.id)}>
          <input type="hidden" name="clientId" value={client.id} />
          <PendingButton
            className="h-12 w-full rounded-2xl border border-rose-400/35 bg-rose-500/10 text-sm font-semibold text-rose-100"
            pendingLabel="Suppression..."
          >
            Supprimer du pipeline
          </PendingButton>
        </form>
      </div>
    </Sheet>
  );
}

function MoreSheet({
  open,
  onClose,
  onSettings,
  tracking,
}: {
  open: boolean;
  onClose: () => void;
  onSettings: () => void;
  tracking: TrackingStatus;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Plus">
      <ActionLink
        icon={<Activity />}
        title="Meta Ads"
        description={`Pixel ${tracking.pixelId || "absent"} · ${tracking.hasCapiToken ? "CAPI actif" : "CAPI absent"}`}
        href="/admin/tracking"
      />
      <ActionButton icon={<Settings />} title="Paramètres" description="Azure, manager, support" onClick={onSettings} />
      <ActionButton icon={<FileDown />} title="Exporter" description="Préparer un export CSV" />
      <form action={logoutAdmin}>
        <button className="mt-4 h-12 w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 text-sm font-semibold text-rose-200">
          Se déconnecter
        </button>
      </form>
    </Sheet>
  );
}

function SettingsSheet({
  open,
  onClose,
  config,
  usesDatabase,
}: {
  open: boolean;
  onClose: () => void;
  config: StoredConfig;
  usesDatabase: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Paramètres">
      <form action={saveAdminConfig} className="space-y-4 pb-20">
        <Pill tone={usesDatabase ? "emerald" : "amber"}>
          {usesDatabase ? "Neon connecté" : "Fallback local"}
        </Pill>
        <DarkField label="Ressource Azure" name="azureResourceName" defaultValue={config.azureResourceName} />
        <DarkField label="Déploiement par défaut" name="azureDefaultDeployment" defaultValue={config.azureDefaultDeployment} />
        <DarkField label="Déploiement GPT-5.5" name="azureGpt55Deployment" defaultValue={config.azureGpt55Deployment ?? ""} />
        <DarkField label="Nouvelle clé API Azure" name="azureApiKey" type="password" />
        <DarkField label="Email support" name="supportEmail" defaultValue={config.supportEmail ?? ""} />
        <DarkField label="WhatsApp AIPilot" name="supportWhatsappNumber" defaultValue={config.supportWhatsappNumber ?? ""} />
        <DarkField label="Vidéo YouTube" name="supportVideoUrl" defaultValue={config.supportVideoUrl ?? ""} />
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-300">
          <input
            className="mt-1"
            type="checkbox"
            name="includeApiKeyInInstaller"
            defaultChecked={config.includeApiKeyInInstaller}
            disabled
          />
          Injection de clé dans les installateurs publics désactivée. Les clients reçoivent uniquement leur clé de licence; le manager récupère l’accès IA automatiquement.
        </label>
        <textarea
          name="managerTutorialLinks"
          defaultValue={config.managerTutorialLinks ?? ""}
          rows={4}
          placeholder="Tutoriel | https://..."
          className="w-full rounded-2xl border border-white/10 bg-[#06141f] px-4 py-3 text-sm text-slate-100 outline-none"
        />
        <DarkField label="URL updates manager" name="managerUpdateUrl" defaultValue={config.managerUpdateUrl ?? ""} />
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-xl">
          <button className="h-14 w-full rounded-2xl bg-[#0a84ff] text-sm font-semibold text-white">
            Enregistrer la configuration
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function BottomNav({
  active,
  onChange,
  onMore,
}: {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
  onMore: () => void;
}) {
  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "subscriptions", label: "Subscriptions", icon: BriefcaseBusiness },
    { key: "requests", label: "Requests", icon: ClipboardList },
    { key: "pipeline", label: "Pipeline", icon: LayoutGrid },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020b12]/90 px-2 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                selected ? "bg-[#0a84ff]/14 text-[#20a0ff]" : "text-slate-500 hover:text-slate-200"
              }`}
            >
              <Icon className="mx-auto mb-1 h-5 w-5" />
              <span className="block truncate">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="rounded-2xl px-2 py-2 text-[11px] font-medium text-slate-500 transition hover:text-slate-200"
        >
          <MoreHorizontal className="mx-auto mb-1 h-5 w-5" />
          <span className="block truncate">Plus</span>
        </button>
      </div>
    </nav>
  );
}

function Sheet({
  open,
  onClose,
  title,
  children,
  compact,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/62 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />
      <section
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-[2rem] border border-white/10 bg-[#071622] shadow-[0_-30px_90px_rgba(0,0,0,0.42)] ${
          compact ? "max-h-[88vh]" : "max-h-[82vh]"
        } overflow-y-auto p-5 text-slate-100`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl text-slate-400 hover:bg-white/[0.06]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ActionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.05]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#64aaff]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-100">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
    </button>
  );
}

function ActionLink({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.05]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#64aaff]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-100">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
    </a>
  );
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.055] shadow-[0_18px_55px_rgba(0,0,0,0.2)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  change,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  change: string;
  tone: "blue" | "violet" | "emerald" | "amber";
}) {
  const color = {
    blue: "bg-[#0a84ff] text-white",
    violet: "bg-violet-600 text-white",
    emerald: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-white",
  }[tone];

  return (
    <GlassPanel className="p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}>{icon}</div>
      <p className="mt-4 text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{currency.format(value)}</p>
      <p className="mt-3 text-sm font-semibold text-emerald-400">↗ {change}</p>
      <p className="mt-1 text-[10px] text-slate-500">vs 30 jours précédents</p>
    </GlassPanel>
  );
}

function FunnelBar({
  tone,
  width,
  label,
}: {
  tone: "blue" | "violet" | "emerald" | "amber";
  width: string;
  label: string;
}) {
  const toneClass = {
    blue: "from-[#0a84ff] to-[#0065d8] border-[#168dff]",
    violet: "from-violet-600 to-violet-900 border-violet-500",
    emerald: "from-emerald-500 to-emerald-800 border-emerald-400",
    amber: "from-amber-500 to-orange-800 border-amber-400",
  }[tone];

  return (
    <div className="mx-auto h-14 max-w-md" style={{ width }}>
      <div
        className={`grid h-full place-items-center rounded-xl border bg-gradient-to-r ${toneClass} font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] [clip-path:polygon(0_0,100%_0,88%_100%,12%_100%)]`}
      >
        {label}
      </div>
    </div>
  );
}

function LegendItem({
  tone,
  label,
  value,
}: {
  tone: "blue" | "violet" | "emerald" | "amber";
  label: string;
  value: string;
}) {
  const color = {
    blue: "bg-[#0a84ff]",
    violet: "bg-violet-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-3 text-slate-300">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function LogoTile({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-sm font-bold text-[#0a84ff]">
      {letters || "AI"}
    </div>
  );
}

function StatusPill({ status }: { status: LicenseRecord["status"] }) {
  return (
    <Pill tone={status === "active" ? "emerald" : "amber"}>
      {status === "active" ? "Active" : "Suspendue"}
    </Pill>
  );
}

function PipelineStatusPill({ status }: { status: ClientStatus }) {
  if (status === "paid") return <Pill tone="emerald">Paid</Pill>;
  if (status === "trial") return <Pill tone="amber">Trial</Pill>;
  if (status === "expired") return <Pill tone="amber">Expired</Pill>;
  if (status === "lost" || status === "cancelled") return <Pill tone="slate">Lost</Pill>;
  return <Pill tone="blue">Lead</Pill>;
}

function Pill({
  tone,
  children,
}: {
  tone: "blue" | "emerald" | "amber" | "slate";
  children: React.ReactNode;
}) {
  const toneClass = {
    blue: "bg-[#0a84ff]/14 text-[#35a6ff]",
    emerald: "bg-emerald-500/14 text-emerald-300",
    amber: "bg-amber-500/14 text-amber-300",
    slate: "bg-white/[0.07] text-slate-300",
  }[tone];
  return (
    <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DarkField({
  label,
  name,
  defaultValue = "",
  type = "text",
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-400">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        type={type}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-white/10 bg-[#06141f] px-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#0a84ff]/70"
      />
    </label>
  );
}

function InlineEditField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#06141f] px-4 py-3">
      <span className="w-28 shrink-0 text-xs text-slate-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
      />
      <Edit3 className="h-4 w-4 text-[#0a84ff]" />
    </label>
  );
}

function DarkSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-400">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-2xl border border-white/10 bg-[#06141f] px-4 text-sm text-slate-100 outline-none focus:border-[#0a84ff]/70"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#06141f] px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right text-slate-200">{value}</span>
    </div>
  );
}

function Stepper() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <span
            className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
              step === 1 ? "bg-[#0a84ff] text-white" : "bg-white/[0.08] text-slate-500"
            }`}
          >
            {step === 1 ? <Check className="h-4 w-4" /> : step}
          </span>
          {step < 3 ? <span className="h-px w-12 bg-white/10" /> : null}
        </div>
      ))}
    </div>
  );
}

function FlashRail({ flash }: { flash?: AdminConsoleProps["flash"] }) {
  const messages = [
    flash?.saved ? "Configuration enregistrée." : "",
    flash?.created ? "Nouvelle licence créée." : "",
    flash?.deleted ? "Élément supprimé." : "",
    flash?.updated ? "Subscription mise à jour." : "",
    flash?.trialCreated ? "Trial créé." : "",
    flash?.paidConverted ? "Client converti paid." : "",
    flash?.lost ? "Client marqué lost." : "",
    flash?.requestAccepted ? `Licence générée${flash.licenseKey ? `: ${flash.licenseKey}` : "."}` : "",
  ].filter(Boolean);

  useEffect(() => {
    if (!messages.length || flash?.licenseKey) return;
    const timer = window.setTimeout(() => {
      cleanAdminFlashParams();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [flash?.licenseKey, messages.length]);

  if (!messages.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {messages.map((message) => (
        <div
          key={message}
          className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200"
        >
          {message}
        </div>
      ))}
    </div>
  );
}

function PendingButton({
  children,
  className,
  pendingLabel = "Chargement...",
  ...props
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={`${className ?? ""} inline-flex items-center justify-center gap-2 transition disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function LicenseReadyCard({ flash }: { flash?: AdminConsoleProps["flash"] }) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const licenseKey = flash?.licenseKey;
  const customer = flash?.customer || "Client";
  const whatsapp = flash?.whatsapp;
  const canShowLicenseReady = Boolean(
    licenseKey && !flash?.paidConverted && (flash?.trialCreated || flash?.requestAccepted),
  );
  const whatsappUrl =
    whatsapp && licenseKey
      ? buildWhatsAppUrl(
          whatsapp,
          buildInstallMessage(customer, licenseKey),
        )
      : null;

  if (!canShowLicenseReady || !licenseKey || dismissed) return null;
  const readyLicenseKey = licenseKey;

  function dismissAndCleanUrl() {
    setDismissed(true);
    cleanAdminFlashParams();
  }

  async function copyLicense() {
    await navigator.clipboard.writeText(readyLicenseKey);
    setCopied(true);
    window.setTimeout(dismissAndCleanUrl, 550);
  }

  return (
    <div className="mb-5 rounded-[1.75rem] border border-emerald-400/25 bg-emerald-500/10 p-4 shadow-[0_18px_55px_rgba(16,185,129,0.12)]">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/18 text-emerald-200">
          <Check className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-100">Licence prête à envoyer</p>
          <p className="mt-1 text-sm text-emerald-100/75">{customer}</p>
          {whatsapp ? (
            <p className="mt-1 text-sm text-emerald-100/75">{formatPhone(whatsapp)}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-[#02150f] p-3">
        <p className="break-all font-mono text-sm font-semibold text-emerald-100">
          {readyLicenseKey}
        </p>
      </div>
      <p className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs font-medium leading-relaxed text-emerald-100/85">
        Envoyez uniquement cette licence. AIPilot Manager configure automatiquement l’accès IA après validation.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyLicense}
          className="h-12 rounded-2xl bg-emerald-400 text-sm font-semibold text-emerald-950"
        >
          {copied ? "Copiée" : "Copier la clé"}
        </button>
        <a
          href={whatsappUrl ?? buildLooseWhatsAppUrl(whatsapp ?? "", customer, readyLicenseKey)}
          target="_blank"
          rel="noreferrer"
          onClick={dismissAndCleanUrl}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-emerald-300/25 text-sm font-semibold text-emerald-100"
        >
          Envoyer WhatsApp
        </a>
      </div>
    </div>
  );
}

function cleanAdminFlashParams() {
  const url = new URL(window.location.href);
  [
    "created",
    "customer",
    "deleted",
    "licenseKey",
    "lost",
    "paidConverted",
    "requestAccepted",
    "trialCreated",
    "updated",
    "whatsapp",
  ].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function EmptyDark({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-8 text-center">
      <p className="font-semibold text-slate-100">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function buildStats(
  licenses: LicenseRecord[],
  requests: AccessRequestRecord[],
  clients: PipelineClientRecord[],
) {
  const leads = clients.filter((client) => client.status === "lead").length;
  const trials = clients.filter((client) => client.status === "trial").length;
  const paid = clients.filter((client) => client.status === "paid").length;
  const expired = clients.filter((client) => client.status === "expired").length;
  const lost = clients.filter((client) => client.status === "lost" || client.status === "cancelled").length;
  const activeSubscriptions = licenses.filter((license) => license.status === "active").length;
  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const total = Math.max(clients.length, 1);
  return {
    leads,
    trials,
    paid,
    expired,
    lost,
    activeSubscriptions,
    pendingRequests,
    leadRate: percent(leads, total),
    trialRate: percent(trials, total),
    paidRate: percent(paid, total),
    finalRate: percent(activeSubscriptions, Math.max(licenses.length, 1)),
  };
}

function sortPipelineClientsForUi(clients: PipelineClientRecord[]) {
  return [...clients].sort((left, right) => {
    const leftContact = timestamp(left.lastContactedAt);
    const rightContact = timestamp(right.lastContactedAt);
    if (leftContact !== rightContact) return rightContact - leftContact;
    return (
      timestamp(right.updatedAt || right.createdAt || right.leadAt) -
      timestamp(left.updatedAt || left.createdAt || left.leadAt)
    );
  });
}

function filterLicenses(
  licenses: LicenseRecord[],
  query: string,
  tab: SubscriptionTab,
) {
  const normalized = normalizeQuery(query);
  return licenses.filter((license) => {
    const matchesTab =
      tab === "expired"
        ? false
        : tab === "active"
          ? license.status === "active"
          : license.status === "disabled";
    const matchesQuery =
      !normalized ||
      [
        license.customerName,
        license.customerEmail ?? "",
        license.licenseKey,
        license.tier,
        license.status,
        license.preferredEnvironment,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    return matchesTab && matchesQuery;
  });
}

function matchesRequest(
  request: AccessRequestRecord,
  query: string,
  status: RequestStatusFilter,
) {
  const normalized = normalizeQuery(query);
  const matchesStatus = status === "all" || request.status === status;
  if (!matchesStatus) return false;
  if (!normalized) return true;
  return (
    [
      request.customerName,
      request.whatsappNumber,
      request.preferredEnvironment,
      request.requestedOs,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

function matchesClient(
  client: PipelineClientRecord,
  query: string,
  status: PipelineStatusFilter,
) {
  const normalized = normalizeQuery(query);
  const matchesStatus = status === "all" || client.status === status;
  if (!matchesStatus) return false;
  if (!normalized) return true;
  return [
    client.name ?? "",
    client.phone,
    client.email ?? "",
    client.status,
    client.licenseKey ?? "",
    client.utmCampaign ?? "",
    client.utmContent ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function highlightMatch(value: string, query: string) {
  const normalized = normalizeQuery(query);
  if (!normalized) return value;
  const index = value.toLowerCase().indexOf(normalized);
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className="rounded bg-[#0a84ff]/25 px-0.5 text-[#77c3ff]">
        {value.slice(index, index + normalized.length)}
      </mark>
      {value.slice(index + normalized.length)}
    </>
  );
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function percent(value: number, total: number) {
  return Number(((value / total) * 100).toFixed(1));
}

function timestamp(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function planLabel(tier: LicenseRecord["tier"]) {
  if (tier === "starter") return "Starter";
  if (tier === "max") return "Max";
  return "Pro";
}

function environmentLabel(value: string) {
  if (value === "codex") return "Codex app";
  if (value === "vscode-codex") return "VS Code Codex";
  if (value === "t3code") return "T3 Code";
  return "OpenCode";
}

function formatPhone(phone: string) {
  return normalizeTunisiaWhatsappNumber(phone)?.display ?? phone;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function pipelineDate(client: PipelineClientRecord) {
  if (client.status === "paid" && client.paidAt) return `Paid le ${shortDate(client.paidAt)}`;
  if (client.status === "trial" && client.trialEndsAt) {
    return `Trial jusqu’au ${shortDate(client.trialEndsAt)}`;
  }
  if (client.status === "expired" && client.trialEndsAt) {
    return `Expiré le ${shortDate(client.trialEndsAt)}`;
  }
  if (client.status === "lost" || client.status === "cancelled") {
    return `Lost depuis ${shortDate(client.updatedAt)}`;
  }
  return `Lead du ${shortDate(client.leadAt)}`;
}

function buildAdminWhatsAppUrl(
  whatsappNumber: string,
  licenseKey: string | undefined,
  customerName: string,
) {
  const message = licenseKey
    ? buildInstallMessage(customerName, licenseKey)
    : `Bonjour ${customerName}, votre demande AIPilot est bien reçue.`;
  return buildWhatsAppUrl(whatsappNumber, message);
}

function buildLooseWhatsAppUrl(
  whatsappNumber: string,
  customerName: string,
  licenseKey?: string,
) {
  const message = licenseKey
    ? buildInstallMessage(customerName, licenseKey)
    : `Bonjour ${customerName}, votre demande AIPilot est bien reçue.`;
  const normalized = normalizeTunisiaWhatsappNumber(whatsappNumber);
  const digits = String(whatsappNumber ?? "").replace(/[^\d]/g, "");
  const phone = normalized?.waId || digits || "";

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function buildPipelineWhatsAppUrl(whatsappNumber: string) {
  const message = "hey";
  const normalized = normalizeTunisiaWhatsappNumber(whatsappNumber);
  const digits = String(whatsappNumber ?? "").replace(/[^\d]/g, "");
  const phone = normalized?.waId || digits || "";

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function buildInstallMessage(customerName: string, licenseKey: string) {
  return [
    `Bonjour ${customerName}, voici votre clé de licence AIPilot.`,
    "",
    licenseKey,
    "",
    "Ouvrez AIPilot Manager, collez cette licence, puis le manager configure automatiquement votre accès.",
  ].join("\n");
}
