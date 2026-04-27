import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getStoredConfig, LOCAL_CONFIG_RELATIVE_PATH } from "@/lib/config-store";
import { listLicenseKeys } from "@/lib/license-store";
import {
  createLicenseAction,
  loginAdmin,
  logoutAdmin,
  saveAdminConfig,
  updateLicenseStatusAction,
} from "./actions";

type AdminSearchParams = Promise<{
  created?: string;
  error?: string;
  loggedOut?: string;
  saved?: string;
  updated?: string;
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

  const [config, licenses] = await Promise.all([getStoredConfig(), listLicenseKeys()]);
  const usesDatabase = Boolean(process.env.DATABASE_URL);
  const activeCount = licenses.filter((license) => license.status === "active").length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <NavLink href="/">Retour au portail</NavLink>
            <NavLink href="/dev">Page technique</NavLink>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Tableau de bord AIPilot
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Cet espace admin protège la configuration Azure et la gestion des clés de
          licence. Les données Neon restent strictement côté serveur et ne sont pas
          exposées au client.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Licences totales" value={String(licenses.length)} />
          <MetricCard label="Licences actives" value={String(activeCount)} />
          <MetricCard label="Stockage" value={usesDatabase ? "Neon" : "Local fallback"} />
        </div>

        <FlashMessages params={params} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <Panel title="Configuration Azure">
            {usesDatabase ? (
              <p className="text-sm leading-7 text-slate-600">
                Les réglages Azure sont enregistrés dans Neon côté serveur. La clé
                API peut être chiffrée avant stockage si{" "}
                <InlineCode>CONFIG_ENCRYPTION_KEY</InlineCode> est définie.
              </p>
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                <InlineCode>DATABASE_URL</InlineCode> n’est pas définie, donc les
                réglages retombent sur{" "}
                <InlineCode>{LOCAL_CONFIG_RELATIVE_PATH}</InlineCode> sur cette
                machine.
              </p>
            )}

            <form action={saveAdminConfig} className="mt-5 space-y-5">
              <Field
                label="Nom de ressource Azure"
                name="azureResourceName"
                defaultValue={config.azureResourceName}
              />
              <Field
                label="Déploiement par défaut"
                name="azureDefaultDeployment"
                defaultValue={config.azureDefaultDeployment}
              />
              <Field
                label="Clé API Azure"
                name="azureApiKey"
                defaultValue=""
                placeholder="Collez une nouvelle clé pour remplacer celle déjà stockée"
                type="password"
              />
              <Field
                label="Email support"
                name="supportEmail"
                defaultValue={config.supportEmail ?? ""}
                placeholder="Optionnel"
                type="email"
              />
              <Field
                label="URL de la vidéo YouTube"
                name="supportVideoUrl"
                defaultValue={config.supportVideoUrl ?? ""}
                placeholder="https://..."
                type="url"
              />
              <Field
                label="URL des mises à jour du manager"
                name="managerUpdateUrl"
                defaultValue={config.managerUpdateUrl ?? ""}
                placeholder="https://downloads.aipilot.tn/manager/stable"
                type="url"
              />
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  className="mt-1"
                  type="checkbox"
                  name="includeApiKeyInInstaller"
                  defaultChecked={config.includeApiKeyInInstaller}
                />
                <span>
                  Inclure la clé API stockée dans les scripts d’installation générés.
                  <span className="mt-1 block text-xs text-amber-700">
                    Attention: si cette option est activée, toute personne ayant accès
                    aux endpoints d’installation peut potentiellement récupérer la clé.
                  </span>
                </span>
              </label>
              <button
                className="rounded-xl border border-sky-200 bg-sky-100 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
                type="submit"
              >
                Enregistrer la configuration
              </button>
            </form>
          </Panel>

          <Panel title="Créer une clé de licence">
            <p className="text-sm leading-7 text-slate-600">
              Générez une clé pour un client, choisissez son plan et son
              environnement préféré. Si vous laissez le champ licence vide, AIPilot
              génère une clé unique automatiquement.
            </p>

            <form action={createLicenseAction} className="mt-5 space-y-5">
              <Field
                label="Nom du client"
                name="customerName"
                defaultValue=""
                placeholder="Ex: Mohamed Amine"
              />
              <Field
                label="Email client"
                name="customerEmail"
                defaultValue=""
                placeholder="Optionnel"
                type="email"
              />
              <Field
                label="Clé API Azure du client"
                name="azureApiKey"
                defaultValue=""
                placeholder="Optionnel, sinon fallback sur la clé globale"
                type="password"
              />
              <Field
                label="Clé de licence personnalisée"
                name="licenseKey"
                defaultValue=""
                placeholder="Optionnel, format XXXX-XXXX-XXXX-XXXX"
              />

              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  label="Tier"
                  name="tier"
                  defaultValue="pro"
                  options={[
                    { label: "Starter", value: "starter" },
                    { label: "Pro", value: "pro" },
                    { label: "Max", value: "max" },
                  ]}
                />
                <SelectField
                  label="Environnement préféré"
                  name="preferredEnvironment"
                  defaultValue="opencode"
                  options={[
                    { label: "OpenCode", value: "opencode" },
                    { label: "Codex", value: "codex" },
                    { label: "T3 Code", value: "t3code" },
                  ]}
                />
              </div>

              <TextAreaField
                label="Notes internes"
                name="notes"
                defaultValue=""
                placeholder="Ex: client beta, payé via D17, installer Windows demandé"
              />

              <button
                className="rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50"
                type="submit"
              >
                Générer la licence
              </button>
            </form>
          </Panel>
        </section>

        <section className="space-y-6">
          <Panel title="Licences existantes">
            {licenses.length === 0 ? (
              <p className="text-sm leading-7 text-slate-600">
                Aucune licence enregistrée pour le moment.
              </p>
            ) : (
              <div className="space-y-4">
                {licenses.map((license) => (
                  <article
                    key={license.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {license.customerName}
                        </p>
                        <p className="mt-2 font-mono text-sm text-slate-700">
                          {license.licenseKey}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={license.status === "active" ? "emerald" : "amber"}>
                          {license.status === "active" ? "Active" : "Suspendue"}
                        </Badge>
                        <Badge tone="blue">{license.tier.toUpperCase()}</Badge>
                        <Badge tone="slate">{license.preferredEnvironment}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <DetailRow
                        label="Email"
                        value={license.customerEmail || "Non renseigné"}
                      />
                      <DetailRow
                        label="Clé client dédiée"
                        value={license.azureApiKey ? "Oui" : "Non"}
                      />
                      <DetailRow
                        label="Créée le"
                        value={formatDateTime(license.createdAt)}
                      />
                      <DetailRow
                        label="Dernière validation"
                        value={
                          license.lastValidatedAt
                            ? formatDateTime(license.lastValidatedAt)
                            : "Jamais"
                        }
                      />
                      <DetailRow
                        label="Notes"
                        value={license.notes || "Aucune note"}
                      />
                    </div>

                    <form action={updateLicenseStatusAction} className="mt-4">
                      <input type="hidden" name="licenseId" value={license.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={license.status === "active" ? "disabled" : "active"}
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
                      >
                        {license.status === "active"
                          ? "Suspendre la licence"
                          : "Réactiver la licence"}
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function AdminLoginPage({
  params,
}: {
  params: Awaited<AdminSearchParams>;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Connexion administrateur
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Entrez le mot de passe admin pour accéder à la configuration Azure et à la
          gestion des licences AIPilot.
        </p>

        {params.error === "invalid-password" ? (
          <Alert tone="rose">Mot de passe invalide.</Alert>
        ) : null}
        {params.error === "auth-required" ? (
          <Alert tone="amber">Connectez-vous pour accéder à l’espace admin.</Alert>
        ) : null}
        {params.loggedOut === "1" ? (
          <Alert tone="emerald">Vous êtes bien déconnecté.</Alert>
        ) : null}

        <form action={loginAdmin} className="mt-5 space-y-5">
          <Field
            label="Mot de passe admin"
            name="password"
            defaultValue=""
            placeholder="Mot de passe"
            type="password"
          />
          <button
            type="submit"
            className="w-full rounded-xl border border-sky-200 bg-sky-100 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}

function FlashMessages({
  params,
}: {
  params: Awaited<AdminSearchParams>;
}) {
  return (
    <div className="mt-4 space-y-3">
      {params.saved === "1" ? (
        <Alert tone="emerald">Configuration Azure enregistrée.</Alert>
      ) : null}
      {params.created === "1" ? (
        <Alert tone="emerald">Nouvelle licence créée avec succès.</Alert>
      ) : null}
      {params.updated === "1" ? (
        <Alert tone="emerald">Statut de licence mis à jour.</Alert>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type ?? "text"}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "blue" | "emerald" | "amber" | "slate";
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-100 text-sky-800",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
    amber: "border-amber-200 bg-amber-100 text-amber-800",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 rounded-xl bg-white px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
