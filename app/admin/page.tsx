import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listAccessRequests } from "@/lib/access-request-store";
import { getStoredConfig, LOCAL_CONFIG_RELATIVE_PATH } from "@/lib/config-store";
import { listLicenseKeys } from "@/lib/license-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sidebar,
  SidebarGroup,
  SidebarInset,
  SidebarItem,
  SidebarLayout,
  SidebarPanel,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CopyLicenseCard from "./copy-license-card";
import {
  acceptAccessRequestAction,
  createLicenseAction,
  loginAdmin,
  logoutAdmin,
  saveAdminConfig,
  updateLicenseStatusAction,
} from "./actions";

type AdminSection = "dashboard" | "subscriptions" | "requests";

type AdminSearchParams = Promise<{
  created?: string;
  customer?: string;
  error?: string;
  licenseKey?: string;
  loggedOut?: string;
  requestAccepted?: string;
  saved?: string;
  section?: string;
  updated?: string;
  whatsapp?: string;
}>;

type TutorialPreviewItem = {
  label: string;
  url: string;
};

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

  const [config, licenses, accessRequests] = await Promise.all([
    getStoredConfig(),
    listLicenseKeys(),
    listAccessRequests(),
  ]);

  const section = readSection(params.section);
  const usesDatabase = Boolean(process.env.DATABASE_URL);
  const activeCount = licenses.filter((license) => license.status === "active").length;
  const pendingRequests = accessRequests.filter((request) => request.status === "pending");
  const acceptedRequests = accessRequests.filter((request) => request.status === "accepted");
  const tutorialPreview = buildTutorialPreview(
    config.managerTutorialLinks,
    config.supportVideoUrl,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_45%,#f8fafc_100%)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <HeroHeader
          usesDatabase={usesDatabase}
          licenseCount={licenses.length}
          activeCount={activeCount}
          pendingCount={pendingRequests.length}
        />

        <FlashMessages params={params} />
        {params.requestAccepted === "1" && params.licenseKey ? (
          <CopyLicenseCard
            customer={params.customer ?? "Client"}
            licenseKey={params.licenseKey}
            whatsapp={params.whatsapp}
          />
        ) : null}

        <div className="mt-6">
          <SidebarLayout
            sidebar={
              <Sidebar>
                <SidebarPanel>
                  <SidebarGroup title="Navigation">
                    <SidebarItem
                      href="/admin?section=dashboard"
                      title="Dashboard"
                      hint="Vue d’ensemble et configuration"
                      badge={section === "dashboard" ? "Actif" : undefined}
                      active={section === "dashboard"}
                    />
                    <SidebarItem
                      href="/admin?section=subscriptions"
                      title="Subscriptions"
                      hint="Licences, statuts et clients"
                      badge={String(licenses.length)}
                      active={section === "subscriptions"}
                    />
                    <SidebarItem
                      href="/admin?section=requests"
                      title="Requests"
                      hint="Demandes WhatsApp et génération"
                      badge={String(pendingRequests.length)}
                      active={section === "requests"}
                    />
                  </SidebarGroup>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Workflow
                    </p>
                    <ol className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                      <li>1. Le client demande l’accès sur le portail.</li>
                      <li>2. Tu acceptes la demande dans `Requests`.</li>
                      <li>3. Tu copies la clé et tu l’envoies sur WhatsApp.</li>
                    </ol>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <TopLink href="/">Portail</TopLink>
                    <TopLink href="/dev">Page technique</TopLink>
                  </div>

                  <form action={logoutAdmin} className="mt-4">
                    <Button type="submit" variant="outline" className="w-full">
                      Se déconnecter
                    </Button>
                  </form>
                </SidebarPanel>
              </Sidebar>
            }
          >
            <SidebarInset>
              {section === "dashboard" ? (
                <>
                  <SectionIntro
                    eyebrow="Dashboard"
                    title="Une base admin propre et prête production"
                    description="Configuration Azure, création manuelle de licences, métriques et aperçu rapide de l’activité."
                  />

                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>Configuration Azure</CardTitle>
                        <CardDescription>
                          Les réglages principaux du portail, du manager et des installateurs
                          sont centralisés ici.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {usesDatabase ? (
                          <Notice tone="blue">
                            Les réglages Azure sont enregistrés dans Neon côté serveur. La clé
                            API peut être chiffrée si <InlineCode>CONFIG_ENCRYPTION_KEY</InlineCode>{" "}
                            est définie.
                          </Notice>
                        ) : (
                          <Notice tone="amber">
                            <InlineCode>DATABASE_URL</InlineCode> n’est pas défini, donc les
                            réglages retombent sur{" "}
                            <InlineCode>{LOCAL_CONFIG_RELATIVE_PATH}</InlineCode>.
                          </Notice>
                        )}

                        <form action={saveAdminConfig} className="mt-5 space-y-5">
                          <Field
                            label="Nom de ressource Azure"
                            name="azureResourceName"
                            defaultValue={config.azureResourceName}
                          />
                          <Field
                            label="Nom exact du déploiement Azure"
                            name="azureDefaultDeployment"
                            defaultValue={config.azureDefaultDeployment}
                            helperText="Important: utilisez le nom exact du déploiement créé dans Azure AI Foundry. Pour Codex et T3 Code, une valeur incorrecte provoque souvent l’erreur 404 `The API deployment for this resource does not exist`."
                          />
                          <Field
                            label="Déploiement GPT-5.5 optionnel"
                            name="azureGpt55Deployment"
                            defaultValue={config.azureGpt55Deployment ?? ""}
                            placeholder="Ex: gpt-5.5-1"
                            helperText="Optionnel. Si vous le renseignez, GPT-5.5 sera aussi disponible directement dans Codex, T3 Code et OpenCode, tout en gardant GPT-5.4 comme choix par défaut."
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
                          <TextAreaField
                            label="Tutoriels du manager"
                            name="managerTutorialLinks"
                            defaultValue={config.managerTutorialLinks ?? ""}
                            placeholder={"Premiers pas | https://...\nInstaller Codex | https://...\nConfigurer T3 Code | https://..."}
                            helperText="Un tutoriel par ligne. Format recommandé: Titre | https://lien. Ces liens apparaîtront directement dans la section Tutoriels de AIPilot Manager."
                          />
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Aperçu du manager
                            </p>
                            <h3 className="mt-2 text-base font-semibold text-slate-950">
                              Section Tutoriels
                            </h3>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              Voici le rendu actuel des liens que le client verra dans AIPilot Manager.
                            </p>
                            <div className="mt-4 space-y-3">
                              {tutorialPreview.length > 0 ? (
                                tutorialPreview.map((tutorial) => (
                                  <div
                                    key={`${tutorial.label}-${tutorial.url}`}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                  >
                                    <p className="font-semibold text-slate-950">
                                      {tutorial.label}
                                    </p>
                                    <p className="mt-1 break-all text-sm text-slate-500">
                                      {tutorial.url}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-7 text-slate-500">
                                  Aucun tutoriel configuré pour le moment. Ajoute une vidéo YouTube
                                  ou des liens ligne par ligne pour voir l’aperçu ici.
                                </div>
                              )}
                            </div>
                          </div>
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
                                À utiliser seulement si tu acceptes que la clé soit récupérable
                                depuis les endpoints d’installation.
                              </span>
                            </span>
                          </label>
                          <Button type="submit" className="w-full sm:w-auto">
                            Enregistrer la configuration
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Créer une licence manuellement</CardTitle>
                          <CardDescription>
                            Pour les cas où tu veux créer une clé sans passer par une demande
                            d’accès.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form action={createLicenseAction} className="space-y-5">
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
                            <Button type="submit" variant="success" className="w-full sm:w-auto">
                              Générer la licence
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Résumé opérationnel</CardTitle>
                          <CardDescription>
                            Un aperçu rapide pour savoir où tu en es.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                          <MiniMetric label="Demandes acceptées" value={String(acceptedRequests.length)} />
                          <MiniMetric label="Demandes en attente" value={String(pendingRequests.length)} />
                          <MiniMetric
                            label="Répartition outils"
                            value={`${licenses.filter((item) => item.preferredEnvironment === "codex").length}/${licenses.filter((item) => item.preferredEnvironment === "t3code").length}/${licenses.filter((item) => item.preferredEnvironment === "opencode").length}`}
                          />
                          <MiniMetric
                            label="Source de vérité"
                            value={usesDatabase ? "Neon" : "Local fallback"}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              ) : null}

              {section === "subscriptions" ? (
                <>
                  <SectionIntro
                    eyebrow="Subscriptions"
                    title="Licences et abonnements"
                    description="Une vue table propre sur desktop, et des cartes compactes sur mobile."
                  />

                  <Card>
                    <CardHeader>
                      <CardTitle>Toutes les licences</CardTitle>
                      <CardDescription>
                        Suspend ou réactive rapidement une clé, et visualise le client,
                        l’environnement et l’activité.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {licenses.length === 0 ? (
                        <EmptyState
                          title="Aucune licence pour le moment"
                          description="Les licences générées apparaîtront ici."
                        />
                      ) : (
                        <>
                          <MobileLicenseCards licenses={licenses} />
                          <div className="hidden overflow-x-auto md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Client</TableHead>
                                  <TableHead>Licence</TableHead>
                                  <TableHead>Plan</TableHead>
                                  <TableHead>Outil</TableHead>
                                  <TableHead>Statut</TableHead>
                                  <TableHead>Dernière activité</TableHead>
                                  <TableHead>Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {licenses.map((license) => (
                                  <TableRow key={license.id}>
                                    <TableCell>
                                      <p className="font-semibold text-slate-950">
                                        {license.customerName}
                                      </p>
                                      <p className="mt-1 break-words text-slate-500">
                                        {license.customerEmail || "Email non renseigné"}
                                      </p>
                                    </TableCell>
                                    <TableCell>
                                      <code className="break-all rounded bg-slate-100 px-2 py-1 font-mono text-[13px] text-slate-900">
                                        {license.licenseKey}
                                      </code>
                                      <p className="mt-2 text-xs text-slate-500">
                                        {license.azureApiKey ? "Clé Azure dédiée" : "Clé Azure globale"}
                                      </p>
                                    </TableCell>
                                    <TableCell>
                                      <Badge tone="blue">{license.tier.toUpperCase()}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge tone="slate">{license.preferredEnvironment}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge tone={license.status === "active" ? "emerald" : "amber"}>
                                        {license.status === "active" ? "Active" : "Suspendue"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="break-words text-slate-600">
                                      {license.lastValidatedAt
                                        ? formatDateTime(license.lastValidatedAt)
                                        : formatDateTime(license.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                      <form action={updateLicenseStatusAction}>
                                        <input type="hidden" name="licenseId" value={license.id} />
                                        <input
                                          type="hidden"
                                          name="status"
                                          value={license.status === "active" ? "disabled" : "active"}
                                        />
                                        <Button type="submit" variant="outline" size="sm">
                                          {license.status === "active" ? "Suspendre" : "Réactiver"}
                                        </Button>
                                      </form>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}

              {section === "requests" ? (
                <>
                  <SectionIntro
                    eyebrow="Requests"
                    title="Demandes d’accès WhatsApp"
                    description="Accepte une demande, attribue un plan, puis copie ou envoie la clé au client."
                  />

                  <Card>
                    <CardHeader>
                      <CardTitle>Demandes entrantes</CardTitle>
                      <CardDescription>
                        Le client remplit le formulaire du portail, puis tout se traite ici.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {accessRequests.length === 0 ? (
                        <EmptyState
                          title="Aucune demande reçue"
                          description="Les nouveaux prospects apparaîtront ici."
                        />
                      ) : (
                        <>
                          <MobileRequestCards requests={accessRequests} />
                          <div className="hidden overflow-x-auto md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Client</TableHead>
                                  <TableHead>WhatsApp</TableHead>
                                  <TableHead>Outil</TableHead>
                                  <TableHead>OS</TableHead>
                                  <TableHead>Statut</TableHead>
                                  <TableHead>Demandée le</TableHead>
                                  <TableHead>Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {accessRequests.map((request) => (
                                  <TableRow key={request.id}>
                                    <TableCell className="font-semibold text-slate-950">
                                      {request.customerName}
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-2">
                                        <p className="break-all text-slate-700">{request.whatsappNumber}</p>
                                        <a
                                          href={buildWhatsAppUrl(
                                            request.whatsappNumber,
                                            request.generatedLicenseKey,
                                            request.customerName,
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="break-all text-xs font-medium text-sky-700 hover:text-sky-900"
                                        >
                                          Ouvrir WhatsApp
                                        </a>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge tone="blue">{request.preferredEnvironment}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge tone="slate">{request.requestedOs}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge tone={request.status === "pending" ? "amber" : "emerald"}>
                                        {request.status === "pending" ? "En attente" : "Acceptée"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                      {formatDateTime(request.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                      {request.status === "pending" ? (
                                        <form action={acceptAccessRequestAction} className="space-y-3">
                                          <input type="hidden" name="requestId" value={request.id} />
                                          <select
                                            name="tier"
                                            defaultValue="pro"
                                            className="w-full min-w-[8rem] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                          >
                                            <option value="starter">Starter</option>
                                            <option value="pro">Pro</option>
                                            <option value="max">Max</option>
                                          </select>
                                          <Button type="submit" variant="success" size="sm">
                                            Générer la licence
                                          </Button>
                                        </form>
                                      ) : (
                                        <div className="space-y-2">
                                          <code className="block break-all rounded bg-slate-100 px-2 py-1 font-mono text-[13px] text-slate-900">
                                            {request.generatedLicenseKey ?? "Clé non disponible"}
                                          </code>
                                          <span className="text-xs text-slate-500">Déjà traitée</span>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </SidebarInset>
          </SidebarLayout>
        </div>
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
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Admin
          </p>
          <CardTitle className="mt-3">Connexion administrateur</CardTitle>
          <CardDescription>
            Entrez le mot de passe admin pour accéder au backoffice AIPilot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error === "invalid-password" ? (
            <Notice tone="rose">Mot de passe invalide.</Notice>
          ) : null}
          {params.error === "auth-required" ? (
            <Notice tone="amber">Connectez-vous pour accéder à l’espace admin.</Notice>
          ) : null}
          {params.loggedOut === "1" ? (
            <Notice tone="emerald">Vous êtes bien déconnecté.</Notice>
          ) : null}

          <form action={loginAdmin} className="mt-5 space-y-5">
            <Field
              label="Mot de passe admin"
              name="password"
              defaultValue=""
              placeholder="Mot de passe"
              type="password"
            />
            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function HeroHeader({
  usesDatabase,
  licenseCount,
  activeCount,
  pendingCount,
}: {
  usesDatabase: boolean;
  licenseCount: number;
  activeCount: number;
  pendingCount: number;
}) {
  return (
    <Card className="overflow-hidden border-white/70 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#f2fbf7_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              AIPilot Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Un backoffice plus propre pour gérer les licences et les demandes
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Interface pensée pour traiter vite les demandes WhatsApp, suivre les
              abonnements et garder la configuration Azure sous contrôle.
            </p>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:min-w-[24rem]">
            <MetricCard label="Licences" value={String(licenseCount)} />
            <MetricCard label="Actives" value={String(activeCount)} />
            <MetricCard label="En attente" value={String(pendingCount)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone="blue">UI admin production-ready</Badge>
          <Badge tone="emerald">{usesDatabase ? "Neon connecté" : "Fallback local"}</Badge>
          <Badge tone="slate">Mobile friendly</Badge>
        </div>
      </CardContent>
    </Card>
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
        <Notice tone="emerald">Configuration Azure enregistrée.</Notice>
      ) : null}
      {params.created === "1" ? (
        <Notice tone="emerald">Nouvelle licence créée avec succès.</Notice>
      ) : null}
      {params.updated === "1" ? (
        <Notice tone="emerald">Statut de licence mis à jour.</Notice>
      ) : null}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/85 p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type,
  helperText,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  helperText?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <input
        className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type ?? "text"}
      />
      {helperText ? (
        <span className="mt-2 block break-words text-xs leading-6 text-slate-500">{helperText}</span>
      ) : null}
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
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
  helperText,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  helperText?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
      {helperText ? (
        <span className="mt-2 block break-words text-xs leading-6 text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "rose" | "blue";
  children: React.ReactNode;
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
  };

  return <p className={`rounded-xl border px-3 py-2 text-sm ${tones[tone]}`}>{children}</p>;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
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

function TopLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

function MobileLicenseCards({
  licenses,
}: {
  licenses: Awaited<ReturnType<typeof listLicenseKeys>>;
}) {
  return (
    <div className="space-y-4 md:hidden">
      {licenses.map((license) => (
        <article
          key={license.id}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{license.customerName}</p>
              <p className="mt-1 break-words text-xs text-slate-500">
                {license.customerEmail || "Email non renseigné"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={license.status === "active" ? "emerald" : "amber"}>
                {license.status === "active" ? "Active" : "Suspendue"}
              </Badge>
              <Badge tone="blue">{license.tier.toUpperCase()}</Badge>
            </div>
          </div>

          <code className="mt-4 block break-all rounded-xl bg-white px-3 py-2 font-mono text-[13px] text-slate-900">
            {license.licenseKey}
          </code>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Outil: {license.preferredEnvironment}</p>
            <p>
              Dernière activité:{" "}
              {license.lastValidatedAt
                ? formatDateTime(license.lastValidatedAt)
                : formatDateTime(license.createdAt)}
            </p>
          </div>

          <form action={updateLicenseStatusAction} className="mt-4">
            <input type="hidden" name="licenseId" value={license.id} />
            <input
              type="hidden"
              name="status"
              value={license.status === "active" ? "disabled" : "active"}
            />
            <Button type="submit" variant="outline" className="w-full">
              {license.status === "active" ? "Suspendre la licence" : "Réactiver la licence"}
            </Button>
          </form>
        </article>
      ))}
    </div>
  );
}

function MobileRequestCards({
  requests,
}: {
  requests: Awaited<ReturnType<typeof listAccessRequests>>;
}) {
  return (
    <div className="space-y-4 md:hidden">
      {requests.map((request) => (
        <article
          key={request.id}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{request.customerName}</p>
              <p className="mt-1 break-all text-sm text-slate-700">{request.whatsappNumber}</p>
            </div>
            <Badge tone={request.status === "pending" ? "amber" : "emerald"}>
              {request.status === "pending" ? "En attente" : "Acceptée"}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="blue">{request.preferredEnvironment}</Badge>
            <Badge tone="slate">{request.requestedOs}</Badge>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Demandée le {formatDateTime(request.createdAt)}
          </p>

          <a
            href={buildWhatsAppUrl(
              request.whatsappNumber,
              request.generatedLicenseKey,
              request.customerName,
            )}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex break-all text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            Ouvrir WhatsApp
          </a>

          {request.status === "pending" ? (
            <form action={acceptAccessRequestAction} className="mt-4 space-y-3">
              <input type="hidden" name="requestId" value={request.id} />
              <SelectField
                label="Tier à attribuer"
                name="tier"
                defaultValue="pro"
                options={[
                  { label: "Starter", value: "starter" },
                  { label: "Pro", value: "pro" },
                  { label: "Max", value: "max" },
                ]}
              />
              <Button type="submit" variant="success" className="w-full">
                Accepter et générer la licence
              </Button>
            </form>
          ) : (
            <div className="mt-4 rounded-xl bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Clé générée
              </p>
              <code className="mt-2 block break-all font-mono text-[13px] text-slate-900">
                {request.generatedLicenseKey ?? "Clé non disponible"}
              </code>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function readSection(value: string | undefined): AdminSection {
  return value === "subscriptions" || value === "requests" ? value : "dashboard";
}

function buildTutorialPreview(
  managerTutorialLinks: string | undefined,
  supportVideoUrl: string | undefined,
) {
  const tutorials: TutorialPreviewItem[] = [];
  const videoUrl = normalizeTutorialUrl(supportVideoUrl);

  if (videoUrl) {
    tutorials.push({
      label: "Vidéo de démarrage AIPilot",
      url: videoUrl,
    });
  }

  for (const line of String(managerTutorialLinks ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const [labelPart, urlPart] = trimmed.split("|");
    const url = normalizeTutorialUrl((urlPart ?? labelPart).trim());
    if (!url) {
      continue;
    }

    tutorials.push({
      label: (urlPart ? labelPart : "Tutoriel AIPilot").trim() || "Tutoriel AIPilot",
      url,
    });
  }

  return tutorials;
}

function normalizeTutorialUrl(value: string | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function buildWhatsAppUrl(
  whatsappNumber: string,
  licenseKey: string | undefined,
  customerName: string,
) {
  const digits = whatsappNumber.replace(/[^\d]/g, "");
  const message = licenseKey
    ? `Bonjour ${customerName}, voici votre clé de licence AIPilot : ${licenseKey}`
    : `Bonjour ${customerName}, votre demande AIPilot est bien reçue.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
