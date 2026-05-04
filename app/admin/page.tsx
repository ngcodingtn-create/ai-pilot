import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listAccessRequests, type AccessRequestRecord } from "@/lib/access-request-store";
import {
  listPipelineClients,
  listRecentFacebookEvents,
  type PipelineClientRecord,
} from "@/lib/client-pipeline-store";
import { getStoredConfig } from "@/lib/config-store";
import { listLicenseKeys, type LicenseRecord } from "@/lib/license-store";
import { listRecentMarketingEvents } from "@/lib/marketing-event-store";
import { normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";
import AdminConsole from "./admin-console-client";
import { loginAdmin } from "./actions";

type AdminSearchParams = Promise<{
  created?: string;
  customer?: string;
  deleted?: string;
  error?: string;
  licenseKey?: string;
  loggedOut?: string;
  lost?: string;
  paidConverted?: string;
  requestAccepted?: string;
  saved?: string;
  section?: string;
  trialCreated?: string;
  updated?: string;
  whatsapp?: string;
}>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const params = await searchParams;
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return <AdminLoginPage params={params} />;
  }

  const [config, licenses, accessRequests, pipelineClients, facebookEvents, marketingEvents] =
    await Promise.all([
      getStoredConfig(),
      listLicenseKeys(),
      listAccessRequests(),
      listPipelineClients(),
      listRecentFacebookEvents(25),
      listRecentMarketingEvents(25),
    ]);

  const uniqueLicenses = dedupeLicenses(licenses);
  const canonicalLicenses = buildCanonicalLicenses(uniqueLicenses, pipelineClients);
  const uniqueAccessRequests = dedupeAccessRequestsByWhatsapp(accessRequests);
  const flashClient = params.licenseKey
    ? pipelineClients.find((client) => client.licenseKey === params.licenseKey)
    : undefined;
  const flashLicense =
    params.licenseKey && !flashClient
      ? uniqueLicenses.find((license) => license.licenseKey === params.licenseKey)
      : undefined;

  return (
    <AdminConsole
      usesDatabase={Boolean(process.env.DATABASE_URL)}
      config={config}
      licenses={canonicalLicenses}
      requests={uniqueAccessRequests}
      pipelineClients={pipelineClients}
      hiddenDuplicateCount={Math.max(0, licenses.length - canonicalLicenses.length)}
      initialTab={readAdminTab(params.section)}
      tracking={{
        pixelId:
          process.env.FB_PIXEL_ID ||
          process.env.NEXT_PUBLIC_META_PIXEL_ID ||
          process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
          "",
        hasCapiToken: Boolean(process.env.FB_CAPI_TOKEN),
        graphApiVersion: process.env.FB_GRAPH_API_VERSION || "v19.0",
        facebookEventCount: facebookEvents.length,
        marketingEventCount: marketingEvents.length,
      }}
      flash={{
        saved: params.saved === "1",
        created: params.created === "1",
        deleted: params.deleted === "1",
        updated: params.updated === "1",
        trialCreated: params.trialCreated === "1",
        paidConverted: params.paidConverted === "1",
        lost: params.lost === "1",
        requestAccepted: params.requestAccepted === "1",
        licenseKey: params.paidConverted === "1" ? undefined : params.licenseKey,
        customer:
          params.customer ||
          flashClient?.name ||
          flashLicense?.customerName,
        whatsapp: params.whatsapp || flashClient?.phone,
      }}
    />
  );
}

function readAdminTab(value?: string) {
  return value === "subscriptions" || value === "requests" || value === "pipeline"
    ? value
    : "dashboard";
}

function AdminLoginPage({
  params,
}: {
  params: Awaited<AdminSearchParams>;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#020b12] px-4 text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(0,136,255,0.24),transparent_28%),radial-gradient(circle_at_92%_4%,rgba(15,185,129,0.16),transparent_24%),linear-gradient(180deg,#04131d_0%,#020910_42%,#010509_100%)]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#35a6ff]">
          AIPilot Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Connexion administrateur</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Entrez le mot de passe admin pour accéder au backoffice.
        </p>

        {params.error === "invalid-password" ? (
          <Notice>Mot de passe invalide.</Notice>
        ) : null}
        {params.error === "auth-required" ? (
          <Notice>Connectez-vous pour accéder à l’espace admin.</Notice>
        ) : null}
        {params.loggedOut === "1" ? (
          <Notice tone="emerald">Vous êtes bien déconnecté.</Notice>
        ) : null}

        <form action={loginAdmin} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Mot de passe admin
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#06141f] px-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#0a84ff]/70"
              name="password"
              placeholder="Mot de passe"
              type="password"
            />
          </label>
          <button className="h-12 w-full rounded-2xl bg-[#0a84ff] text-sm font-semibold text-white shadow-[0_18px_50px_rgba(10,132,255,0.32)]">
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}

function Notice({
  children,
  tone = "amber",
}: {
  children: React.ReactNode;
  tone?: "amber" | "emerald";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : "border-amber-400/20 bg-amber-500/10 text-amber-200";

  return <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{children}</p>;
}

function dedupeLicenses(licenses: LicenseRecord[]) {
  const seen = new Set<string>();

  return licenses.filter((license) => {
    if (seen.has(license.licenseKey)) {
      return false;
    }

    seen.add(license.licenseKey);
    return true;
  });
}

function buildCanonicalLicenses(
  licenses: LicenseRecord[],
  clients: PipelineClientRecord[],
) {
  const byKey = new Map(licenses.map((license) => [license.licenseKey, license]));
  const canonical = clients
    .map((client) => (client.licenseKey ? byKey.get(client.licenseKey) : undefined))
    .filter((license): license is LicenseRecord => Boolean(license));

  return canonical.length > 0 ? dedupeLicenses(canonical) : dedupeLicenses(licenses);
}

function dedupeAccessRequestsByWhatsapp(requests: AccessRequestRecord[]) {
  const byPhone = new Map<string, AccessRequestRecord>();

  for (const request of requests) {
    const normalized =
      normalizeTunisiaWhatsappNumber(request.whatsappNumber)?.waId ??
      request.whatsappNumber.replace(/[^\d]/g, "");
    const key = normalized || request.id;
    const existing = byPhone.get(key);
    if (!existing || request.updatedAt.localeCompare(existing.updatedAt) > 0) {
      byPhone.set(key, request);
    }
  }

  return Array.from(byPhone.values()).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
