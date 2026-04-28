"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HomeConfig = {
  azureResourceName: string;
  azureDefaultDeployment: string;
  includeApiKeyInInstaller: boolean;
  siteUrl: string;
};

type OsKey = "windows" | "linux" | "macos";
type EnvironmentKey = "codex" | "t3code" | "opencode";
type PersistedState = {
  currentStep?: number;
  licenseKey?: string;
  selectedEnvironment?: EnvironmentKey;
  selectedOs?: OsKey;
};

type AccessRequestState =
  | { status: "idle"; message?: undefined }
  | { status: "submitting"; message?: undefined }
  | { status: "success" | "error"; message: string };

type LicenseValidation =
  | {
      status: "idle" | "checking";
      customerName?: undefined;
      message?: undefined;
      preferredEnvironment?: undefined;
      tier?: undefined;
    }
  | {
      status: "valid";
      customerName?: string;
      message?: string;
      preferredEnvironment?: EnvironmentKey;
      tier?: string;
    }
  | {
      status: "invalid" | "error";
      customerName?: undefined;
      message?: string;
      preferredEnvironment?: undefined;
      tier?: undefined;
    };

const STORAGE_KEY = "ai-pilot-home-state";
const DEFAULT_TOTAL_STEPS = 4;
const CODEX_TOTAL_STEPS = 5;
const LICENSE_KEY_LENGTH = 16;
const LICENSE_PATTERN = /^[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/;

function getTotalStepsForEnvironment(environment: EnvironmentKey) {
  return environment === "codex" ? CODEX_TOTAL_STEPS : DEFAULT_TOTAL_STEPS;
}

export default function HomeClient({ config }: { config: HomeConfig }) {
  const [selectedOs, setSelectedOs] = useState<OsKey>("windows");
  const [selectedEnvironment, setSelectedEnvironment] =
    useState<EnvironmentKey>("opencode");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseValidation, setLicenseValidation] = useState<LicenseValidation>({
    status: "idle",
  });
  const [detectedOs, setDetectedOs] = useState<OsKey | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestWhatsapp, setRequestWhatsapp] = useState("");
  const [accessRequest, setAccessRequest] = useState<AccessRequestState>({
    status: "idle",
  });
  const totalSteps = getTotalStepsForEnvironment(selectedEnvironment);

  const osOptions = getOsOptions();
  const environmentOptions = getEnvironmentOptions();
  const currentOs = osOptions[selectedOs];
  const currentEnvironment = environmentOptions[selectedEnvironment];
  const visibleStep = Math.min(currentStep, totalSteps);
  const normalizedLicenseKey = normalizeLicenseKey(licenseKey);
  const isLicenseFormatValid = LICENSE_PATTERN.test(normalizedLicenseKey);
  const isLicenseVerified = licenseValidation.status === "valid";
  const canAdvance = canAdvanceFromStep(
    visibleStep,
    isLicenseVerified,
    selectedEnvironment,
  );
  const currentDownloadHref = buildManagerDownloadHref(
    currentOs.downloadHref,
    normalizedLicenseKey,
    selectedEnvironment,
  );
  const currentDownloadCommand = buildManagerDownloadCommand(
    selectedOs,
    config.siteUrl,
    currentOs.downloadHref,
    normalizedLicenseKey,
    selectedEnvironment,
  );

  useEffect(() => {
    const fallbackOs = detectOs(window.navigator.userAgent);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.requestAnimationFrame(() => {
        setDetectedOs(fallbackOs);
        setSelectedOs(fallbackOs);
        setIsReady(true);
      });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedState;

      window.requestAnimationFrame(() => {
        setDetectedOs(fallbackOs);
        setSelectedOs(
          parsed.selectedOs === "windows" ||
            parsed.selectedOs === "linux" ||
            parsed.selectedOs === "macos"
            ? parsed.selectedOs
            : fallbackOs,
        );
        setSelectedEnvironment(
          parsed.selectedEnvironment === "codex" ||
            parsed.selectedEnvironment === "t3code" ||
            parsed.selectedEnvironment === "opencode"
            ? parsed.selectedEnvironment
            : "opencode",
        );
        setLicenseKey(normalizeLicenseKey(parsed.licenseKey ?? ""));
        if (typeof parsed.currentStep === "number") {
          setCurrentStep(
            Math.min(Math.max(parsed.currentStep, 1), CODEX_TOTAL_STEPS),
          );
        }
        setIsReady(true);
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.requestAnimationFrame(() => {
        setDetectedOs(fallbackOs);
        setSelectedOs(fallbackOs);
        setIsReady(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const state: PersistedState = {
      currentStep: visibleStep,
      licenseKey: normalizedLicenseKey,
      selectedEnvironment,
      selectedOs,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [visibleStep, isReady, normalizedLicenseKey, selectedEnvironment, selectedOs]);

  useEffect(() => {
    if (!normalizedLicenseKey || !isLicenseFormatValid) {
      window.requestAnimationFrame(() => {
        setLicenseValidation({ status: "idle" });
      });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLicenseValidation({ status: "checking" });

      try {
        const response = await fetch("/api/licenses/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ licenseKey: normalizedLicenseKey }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          customerName?: string;
          message?: string;
          preferredEnvironment?: EnvironmentKey;
          tier?: string;
          valid?: boolean;
        };

        if (!response.ok || !payload.valid) {
          setLicenseValidation({
            status: "invalid",
            message: payload.message ?? "Licence introuvable ou désactivée.",
          });
          return;
        }

        if (
          payload.preferredEnvironment === "codex" ||
          payload.preferredEnvironment === "t3code" ||
          payload.preferredEnvironment === "opencode"
        ) {
          setSelectedEnvironment(payload.preferredEnvironment);
        }

        setLicenseValidation({
          status: "valid",
          customerName: payload.customerName,
          message: "Licence reconnue avec succès.",
          preferredEnvironment: payload.preferredEnvironment,
          tier: payload.tier,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLicenseValidation({
          status: "error",
          message:
            error instanceof Error
              ? "Impossible de vérifier la licence pour le moment."
              : "Erreur de vérification de licence.",
        });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isLicenseFormatValid, normalizedLicenseKey]);

  function nextStep() {
    if (!canAdvance) return;
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  }

  function previousStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function resetSteps() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSelectedOs(detectedOs ?? "windows");
    setSelectedEnvironment("opencode");
    setLicenseKey("");
    setCurrentStep(1);
  }

  function selectEnvironment(environment: EnvironmentKey) {
    setSelectedEnvironment(environment);
    const targetMaxStep = getTotalStepsForEnvironment(environment);
    if (currentStep < 3) {
      setCurrentStep(3);
      return;
    }

    if (currentStep > targetMaxStep) {
      setCurrentStep(targetMaxStep);
    }
  }

  async function submitAccessRequest() {
    if (!requestName.trim() || !requestWhatsapp.trim()) {
      setAccessRequest({
        status: "error",
        message: "Entrez votre nom et votre numéro WhatsApp.",
      });
      return;
    }

    setAccessRequest({ status: "submitting" });

    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: requestName,
          whatsappNumber: requestWhatsapp,
          preferredEnvironment: selectedEnvironment,
          requestedOs: selectedOs,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setAccessRequest({
          status: "error",
          message:
            payload.error ?? "Impossible d’envoyer la demande pour le moment.",
        });
        return;
      }

      setRequestName("");
      setRequestWhatsapp("");
      setAccessRequest({
        status: "success",
        message:
          payload.message ??
          "Votre demande a été envoyée. Nous vous contacterons sur WhatsApp.",
      });
    } catch {
      setAccessRequest({
        status: "error",
        message: "Erreur réseau. Réessayez dans un instant.",
      });
    }
  }

  return (
    <main
      dir="ltr"
      className="mx-auto w-full max-w-7xl px-4 py-8 text-left sm:px-6 lg:px-8"
    >
      <header className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eefbf5_100%)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-sky-700">
              AIPILOT
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Portail de téléchargement AIPilot pour les développeurs en Tunisie
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
              Choisissez votre système, entrez votre clé de licence, sélectionnez
              l’environnement qui vous convient, puis téléchargez l’installateur
              adapté. L’objectif: accéder à des outils de coding IA de niveau
              mondial, payables en dinars via D17, avec une configuration Azure
              prête dès le départ.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-500">Modèle par défaut</p>
            <p className="mt-1 text-lg font-bold text-slate-950">
              {config.azureDefaultDeployment}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Préconfiguré pour Azure OpenAI
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Badge tone="blue">Paiement en dinars via D17</Badge>
          <Badge tone="emerald">Azure configuré dès le départ</Badge>
          <Badge tone="amber">Téléchargement selon votre OS</Badge>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <QuickFact
            title="Que fait ce portail ?"
            text="Le portail organise votre parcours de téléchargement selon votre système, votre licence et l'environnement choisi."
          />
          <QuickFact
            title="Quels environnements ?"
            text="Codex, T3 Code et OpenCode passent tous par AIPilot Manager, qui récupère ensuite la bonne configuration Azure côté serveur."
          />
          <QuickFact
            title="Qu'est-ce qui est prêt maintenant ?"
            text="Le repo gère maintenant le parcours licence, l'espace admin Neon, le téléchargement du manager et la configuration/réparation des outils depuis la même expérience."
          />
        </div>
      </header>

      <section
        className={`mt-6 grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
          selectedEnvironment === "codex"
            ? "grid-cols-2 xl:grid-cols-5"
            : "grid-cols-2 lg:grid-cols-4"
        }`}
      >
        <StepperItem step="1" title="Système" state={getStepState(visibleStep, 1)} />
        <StepperItem step="2" title="Licence" state={getStepState(visibleStep, 2)} />
        <StepperItem step="3" title="Environnement" state={getStepState(visibleStep, 3)} />
        <StepperItem step="4" title="Téléchargement" state={getStepState(visibleStep, 4)} />
        {selectedEnvironment === "codex" ? (
          <StepperItem step="5" title="Tutoriel final" state={getStepState(visibleStep, 5)} />
        ) : null}
      </section>

      <section className="mt-6 overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-slate-50/90 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                Étape {visibleStep} sur {totalSteps}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-4xl">
                {getWizardTitle(
                  visibleStep,
                  currentOs.label,
                  currentEnvironment.label,
                  selectedEnvironment,
                )}
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-700 sm:text-base">
                {getWizardDescription(
                  visibleStep,
                  currentOs.label,
                  currentEnvironment.label,
                  selectedEnvironment,
                )}
              </p>
            </div>

            <div className="grid min-w-[17rem] gap-2 self-start rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <SummaryRow label="Système" value={currentOs.label} />
              <SummaryRow
                label="Licence"
                value={normalizedLicenseKey || "Non renseignée"}
                dim={!normalizedLicenseKey}
              />
              <SummaryRow label="Environnement" value={currentEnvironment.label} />
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {visibleStep === 1 ? (
            <>
              <NoticeCard
                tone="blue"
                title="Le système est détecté automatiquement, mais vous pouvez le changer"
                text={
                  detectedOs
                    ? `D'après votre appareil, nous avons détecté ${osOptions[detectedOs].label}. Si ce n'est pas le bon choix, sélectionnez simplement une autre carte ci-dessous.`
                    : "Si vous hésitez, choisissez le système que vous utilisez au quotidien pour le projet où vous voulez installer l'outil."
                }
              />

              <div className="grid gap-3 sm:grid-cols-3">
                {Object.values(osOptions).map((option) => {
                  const isSelected = option.key === selectedOs;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedOs(option.key)}
                      className={`rounded-[1.75rem] border p-5 text-left transition ${
                        isSelected
                          ? "border-sky-400 bg-sky-100 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                              isSelected
                                ? "border-sky-200 bg-white/90"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <OsLogo os={option.key} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-slate-500">
                              Système
                            </p>
                            <h3 className="mt-2 text-xl font-bold text-slate-950">
                              {option.label}
                            </h3>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isSelected
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isSelected ? "Sélectionné" : option.tag}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {visibleStep === 2 ? (
            <>
              <NoticeCard
                tone="emerald"
                title="Entrez votre clé de licence telle que vous l'avez reçue"
                text="Utilisez le format habituel: XXXX-XXXX-XXXX-XXXX. Dès que le format est correct, le portail vérifie la licence côté serveur avant de vous laisser continuer."
              />

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-950">Clé de licence</span>
                    <input
                      dir="ltr"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={normalizedLicenseKey}
                      onChange={(event) => {
                        setLicenseKey(normalizeLicenseKey(event.target.value));
                      }}
                      placeholder="ABCD-1234-EFGH-5678"
                      className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-left text-base tracking-[0.18em] text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      {isLicenseFormatValid
                        ? "Le format est correct. Vérification de la licence en cours ou terminée."
                        : "Complétez les 16 caractères alphanumériques pour valider le format."}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isLicenseFormatValid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isLicenseFormatValid
                        ? "Format correct"
                        : `${countLicenseCharacters(normalizedLicenseKey)}/${LICENSE_KEY_LENGTH}`}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {getLicenseValidationTitle(licenseValidation.status)}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {getLicenseValidationDescription(
                        licenseValidation,
                        isLicenseFormatValid,
                      )}
                    </p>

                    {licenseValidation.status === "valid" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {licenseValidation.customerName ? (
                          <Badge tone="emerald">
                            Client: {licenseValidation.customerName}
                          </Badge>
                        ) : null}
                        {licenseValidation.tier ? (
                          <Badge tone="blue">
                            Tier: {licenseValidation.tier.toUpperCase()}
                          </Badge>
                        ) : null}
                        {licenseValidation.preferredEnvironment ? (
                          <Badge tone="amber">
                            Environnement recommandé: {environmentOptions[licenseValidation.preferredEnvironment].label}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                  <div className="space-y-4">
                    <InfoPanel title="Pas encore de licence ?" tone="blue">
                      <p className="text-sm leading-7 text-slate-700">
                        Envoyez une demande d’accès avec votre nom et votre numéro
                      WhatsApp. L’admin recevra la demande, générera votre clé de
                      licence, puis vous l’enverra directement sur WhatsApp.
                    </p>

                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-900">
                          Nom complet
                        </span>
                        <input
                          type="text"
                          value={requestName}
                          onChange={(event) => setRequestName(event.target.value)}
                          placeholder="Ex: Mohamed Amine"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-900">
                          Numéro WhatsApp
                        </span>
                        <input
                          type="text"
                          value={requestWhatsapp}
                          onChange={(event) => setRequestWhatsapp(event.target.value)}
                          placeholder="Ex: +21612345678"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={submitAccessRequest}
                        disabled={accessRequest.status === "submitting"}
                        className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-sky-100 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {accessRequest.status === "submitting"
                          ? "Envoi..."
                          : "Demander l’accès"}
                      </button>
                      <span className="text-xs text-slate-500">
                        Environnement demandé: {currentEnvironment.label} · OS: {currentOs.label}
                      </span>
                    </div>

                    {accessRequest.status === "success" ? (
                      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {accessRequest.message}
                      </p>
                    ) : null}
                    {accessRequest.status === "error" ? (
                      <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        {accessRequest.message}
                      </p>
                    ) : null}
                  </InfoPanel>
                </div>
              </div>
            </>
          ) : null}

          {visibleStep === 3 ? (
            <>
              <NoticeCard
                tone="amber"
                title="Choisissez l'environnement qui correspond à votre façon de travailler"
                text="Le portail montre clairement ce qui est déjà disponible dans le MVP et ce qui fait encore partie de la feuille de route."
              />

              <div className="grid gap-3 xl:grid-cols-3">
                {Object.values(environmentOptions).map((option) => {
                  const isSelected = option.key === selectedEnvironment;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedEnvironment(option.key)}
                      className={`rounded-[1.75rem] border p-5 text-left transition ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-slate-500">
                            Environnement
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-slate-950">
                            {option.label}
                          </h3>
                        </div>
                        <StatusPill status={option.status}>{option.statusLabel}</StatusPill>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-700">
                        {option.description}
                      </p>

                      <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                        <li>- {option.positioning}</li>
                        <li>- {option.compatibility}</li>
                        <li>- {option.installState}</li>
                      </ul>
                    </button>
                  );
                })}
              </div>

              <InfoPanel title="État actuel du MVP" tone="blue">
                <ul className="space-y-2 text-sm leading-7 text-slate-700">
                  <li>- OpenCode, Codex et T3 Code passent désormais tous par AIPilot Manager</li>
                  <li>- T3 Code s’appuie sur Codex CLI, donc le manager prépare et vérifie Codex avant le lancement</li>
                  <li>- OpenCode reste le parcours le plus direct pour les utilisateurs terminal-first, mais les trois chemins sont désormais câblés dans le MVP</li>
                </ul>
              </InfoPanel>
            </>
          ) : null}

          {visibleStep === 4 ? (
            <>
              <NoticeCard
                tone={currentEnvironment.status === "available" ? "emerald" : "amber"}
                title={
                  currentEnvironment.status === "available"
                    ? `AIPilot Manager est prêt pour ${currentOs.label}`
                    : `${currentEnvironment.label} arrive bientôt`
                }
                text={
                  currentEnvironment.status === "available"
                    ? "Le parcours recommandé télécharge maintenant AIPilot Manager. Cette app locale se charge ensuite d’installer, configurer, diagnostiquer et réparer OpenCode, Codex ou T3 Code avec votre licence."
                    : `Le parcours complet ${currentEnvironment.label} fait bien partie de la vision AIPilot, mais son installateur de production n’est pas encore branché dans ce repo.`
                }
              />

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-bold text-slate-950">Résumé du téléchargement</h3>
                  <div className="mt-4 space-y-3">
                    <SummaryRow label="Système" value={currentOs.label} />
                    <SummaryRow label="Environnement" value={currentEnvironment.label} />
                    <SummaryRow
                      label="Clé de licence"
                      value={normalizedLicenseKey || "Non renseignée"}
                      dim={!normalizedLicenseKey}
                    />
                    <SummaryRow
                      label="État de la licence"
                      value={getLicenseSummaryLabel(licenseValidation.status)}
                      dim={licenseValidation.status !== "valid"}
                    />
                    <SummaryRow
                      label="Modèle par défaut"
                      value={config.azureDefaultDeployment}
                    />
                  </div>

                  {currentEnvironment.status === "available" ? (
                    <>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <DownloadButton
                          href={currentDownloadHref}
                          label={`Télécharger ${currentOs.downloadLabel}`}
                        />
                        <SecondaryButton onClick={() => selectEnvironment("opencode")}>
                          Revenir sur OpenCode
                        </SecondaryButton>
                      </div>

                      <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-bold text-slate-950">
                          Commande directe
                        </p>
                        <InlineCommand>{currentDownloadCommand}</InlineCommand>
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <PrimaryButton onClick={() => selectEnvironment("opencode")}>
                        Utiliser OpenCode maintenant
                      </PrimaryButton>
                      <SecondaryButton onClick={previousStep}>
                        Revenir au choix des environnements
                      </SecondaryButton>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <InfoPanel title="Que fait l’installateur actuel ?" tone="slate">
                    <ul className="space-y-2 text-sm leading-7 text-slate-700">
                      <li>- Il télécharge AIPilot Manager dans le format adapté à votre système</li>
                      <li>- Sous Windows, l’installateur place AIPilot Manager comme une vraie app visible sur le bureau et dans le menu Démarrer</li>
                      <li>- Il ouvre ensuite l’application, préremplie avec votre licence et l’outil sélectionné</li>
                      <li>
                        -{" "}
                        {config.includeApiKeyInInstaller
                          ? "Le manager peut utiliser la clé Azure globale ou la clé spécifique de la licence côté serveur"
                          : "Le manager s’appuie sur la licence pour récupérer la bonne configuration côté serveur"}
                      </li>
                      <li>- Il sait installer, configurer et réparer OpenCode, Codex, et T3 Code via Codex CLI</li>
                    </ul>
                  </InfoPanel>

                  <InfoPanel title="Points importants" tone="blue">
                    <ul className="space-y-2 text-sm leading-7 text-slate-700">
                      <li>- Windows télécharge un fichier <InlineCode>.cmd</InlineCode> qui installe la vraie app desktop puis l’ouvre automatiquement</li>
                      <li>- Linux et macOS utilisent un script shell qui installe puis ouvre AIPilot Manager</li>
                      <li>- T3 Code est configuré à partir de Codex CLI, donc le manager traite Codex comme prérequis quand vous choisissez T3 Code</li>
                    </ul>
                  </InfoPanel>
                </div>
              </div>
            </>
          ) : null}

          {visibleStep === 5 && selectedEnvironment === "codex" ? (
            <CodexFinalTutorial />
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/80 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {visibleStep < totalSteps ? (
                <PrimaryButton onClick={nextStep} disabled={!canAdvance}>
                  {getNextLabel(visibleStep, canAdvance, selectedEnvironment)}
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={resetSteps}>Recommencer</PrimaryButton>
              )}

              {visibleStep > 1 ? (
                <SecondaryButton onClick={previousStep}>Étape précédente</SecondaryButton>
              ) : null}
            </div>

            <p className="text-sm leading-7 text-slate-600">
              {getFooterMessage(
                visibleStep,
                canAdvance,
                currentEnvironment.status,
                totalSteps,
                selectedEnvironment,
              )}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function detectOs(userAgent: string): OsKey {
  const ua = userAgent.toLowerCase();

  if (ua.includes("mac os") || ua.includes("macintosh")) {
    return "macos";
  }

  if (ua.includes("linux") || ua.includes("x11")) {
    return "linux";
  }

  return "windows";
}

function normalizeLicenseKey(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LICENSE_KEY_LENGTH);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

function countLicenseCharacters(value: string) {
  return value.replace(/-/g, "").length;
}

function canAdvanceFromStep(
  currentStep: number,
  isLicenseVerified: boolean,
  selectedEnvironment: EnvironmentKey,
) {
  if (currentStep === 1) return true;
  if (currentStep === 2) return isLicenseVerified;
  if (currentStep === 3) return Boolean(selectedEnvironment);
  return true;
}

function getStepState(currentStep: number, step: number) {
  if (currentStep > step) return "done";
  if (currentStep === step) return "active";
  return "locked";
}

function getWizardTitle(
  currentStep: number,
  selectedOsLabel: string,
  selectedEnvironmentLabel: string,
  selectedEnvironment: EnvironmentKey,
) {
  if (currentStep === 1) return "Choisissez votre système";
  if (currentStep === 2) return "Entrez votre clé de licence";
  if (currentStep === 3) return "Choisissez votre environnement de coding";
  if (currentStep === 4 && selectedEnvironment === "codex") {
    return `Téléchargez Codex pour ${selectedOsLabel}`;
  }
  if (currentStep === 5 && selectedEnvironment === "codex") {
    return "Étape finale Codex";
  }
  return `Téléchargez ${selectedEnvironmentLabel} pour ${selectedOsLabel}`;
}

function getWizardDescription(
  currentStep: number,
  selectedOsLabel: string,
  selectedEnvironmentLabel: string,
  selectedEnvironment: EnvironmentKey,
) {
  if (currentStep === 1) {
    return "On commence ici: choisissez le système sur lequel vous allez installer l'outil. Ce choix détermine le type de fichier téléchargé et la méthode d'installation.";
  }

  if (currentStep === 2) {
    return "Après le choix du système, la clé de licence est vérifiée côté serveur. Une licence valide permet ensuite au manager de récupérer automatiquement la bonne configuration client.";
  }

  if (currentStep === 3) {
    return `Décidez maintenant quel environnement vous convient le mieux: officiel, interface légère, ou approche terminal-first. Votre sélection actuelle est ${selectedEnvironmentLabel}.`;
  }

  if (currentStep === 4 && selectedEnvironment === "codex") {
    return `Téléchargez ici AIPilot Manager pour ${selectedOsLabel}. Une fois le téléchargement terminé, l’étape suivante vous montrera exactement quoi faire dans Codex et dans le manager.`;
  }

  if (currentStep === 5 && selectedEnvironment === "codex") {
    return "Suivez ce mini tutoriel final pour terminer l’installation proprement: ouvrir Codex, cliquer sur Enter API key, puis revenir dans AIPilot Manager pour connecter la licence et lancer l’installation.";
  }

  return `Sur la base de ${selectedOsLabel} et ${selectedEnvironmentLabel}, vous récupérez ici un téléchargement prérempli qui ouvre AIPilot Manager avec votre licence et le bon outil.`;
}

function getNextLabel(
  currentStep: number,
  canAdvance: boolean,
  selectedEnvironment: EnvironmentKey,
) {
  if (currentStep === 1) return "Suivant: licence";
  if (currentStep === 2) {
    return canAdvance ? "Suivant: environnement" : "Vérifiez la licence";
  }
  if (currentStep === 3) {
    return selectedEnvironment === "codex"
      ? "Suivant: téléchargement Codex"
      : "Suivant: téléchargement";
  }
  if (currentStep === 4 && selectedEnvironment === "codex") {
    return "Suivant: étape finale Codex";
  }
  return "Recommencer";
}

function getFooterMessage(
  currentStep: number,
  canAdvance: boolean,
  environmentStatus: "available" | "comingSoon",
  totalSteps: number,
  selectedEnvironment: EnvironmentKey,
) {
  if (currentStep === 2 && !canAdvance) {
    return "Il vous faut une licence active et vérifiée pour passer à l’étape suivante.";
  }

  if (currentStep === 4 && environmentStatus === "comingSoon") {
    return "Le parcours est déjà visible dans le portail, mais le téléchargement réellement opérationnel dans ce repo reste OpenCode pour l’instant.";
  }

  if (currentStep === 5 && selectedEnvironment === "codex") {
    return "Une fois ce mini tutoriel terminé, ouvrez Codex puis laissez AIPilot Manager finir la configuration Azure pour vous.";
  }

  if (currentStep < totalSteps) {
    return "Avancez étape par étape. Chaque choix est mémorisé dans le navigateur pour vous permettre de reprendre là où vous vous êtes arrêté.";
  }

  return "Une fois le téléchargement terminé, lancez le fichier récupéré: AIPilot Manager s’ouvrira avec votre licence et votre environnement déjà préchargés.";
}

function getLicenseValidationTitle(status: LicenseValidation["status"]) {
  if (status === "checking") return "Vérification en cours";
  if (status === "valid") return "Licence active";
  if (status === "invalid") return "Licence invalide";
  if (status === "error") return "Vérification indisponible";
  return "Vérification de licence";
}

function getLicenseValidationDescription(
  validation: LicenseValidation,
  isLicenseFormatValid: boolean,
) {
  if (!isLicenseFormatValid) {
    return "Commencez par saisir une clé complète au format XXXX-XXXX-XXXX-XXXX.";
  }

  if (validation.status === "checking") {
    return "AIPilot interroge actuellement la base de licences pour confirmer que la clé est active.";
  }

  if (validation.status === "valid") {
    return validation.message ?? "La licence a bien été reconnue.";
  }

  if (validation.status === "invalid" || validation.status === "error") {
    return validation.message ?? "Impossible de valider cette licence.";
  }

  return "La licence sera vérifiée automatiquement dès que son format sera complet.";
}

function getLicenseSummaryLabel(status: LicenseValidation["status"]) {
  if (status === "checking") return "Vérification...";
  if (status === "valid") return "Active";
  if (status === "invalid") return "Invalide";
  if (status === "error") return "Indisponible";
  return "En attente";
}

function getOsOptions() {
  return {
    windows: {
      key: "windows" as const,
      label: "Windows",
      tag: "Le plus courant",
      description:
        "Windows 10/11. Le téléchargement actuel fournit un fichier `.cmd` qui installe AIPilot Manager sur la machine, crée les raccourcis, puis ouvre l'app.",
      downloadHref: "/api/download/manager/windows",
      downloadLabel: "Installer AIPilot Manager pour Windows (.cmd)",
    },
    linux: {
      key: "linux" as const,
      label: "Linux",
      tag: "Dev & serveurs",
      description:
        "Ubuntu, Debian et autres distributions Linux. Le téléchargement actuel fournit un script shell qui installe puis ouvre AIPilot Manager.",
      downloadHref: "/api/download/manager/linux",
      downloadLabel: "AIPilot Manager pour Linux (.sh)",
    },
    macos: {
      key: "macos" as const,
      label: "macOS",
      tag: "MacBook / iMac",
      description:
        "macOS Intel ou Apple Silicon. Le téléchargement actuel fournit un script qui installe puis ouvre AIPilot Manager.",
      downloadHref: "/api/download/manager/macos",
      downloadLabel: "AIPilot Manager pour macOS (.sh)",
    },
  };
}

function buildManagerDownloadHref(
  routePath: string,
  licenseKey: string,
  environment: EnvironmentKey,
) {
  const params = new URLSearchParams();

  if (LICENSE_PATTERN.test(licenseKey)) {
    params.set("licenseKey", licenseKey);
  }

  params.set("environment", environment);

  const query = params.toString();
  return query ? `${routePath}?${query}` : routePath;
}

function buildManagerDownloadCommand(
  os: OsKey,
  siteUrl: string,
  routePath: string,
  licenseKey: string,
  environment: EnvironmentKey,
) {
  const downloadUrl = `${siteUrl}${buildManagerDownloadHref(
    routePath,
    licenseKey,
    environment,
  )}`;

  if (os === "windows") {
    return (
      `powershell -ExecutionPolicy Bypass -Command "$file = Join-Path $env:TEMP 'install-aipilot-manager.cmd'; ` +
      `Invoke-WebRequest -UseBasicParsing '${downloadUrl}' -OutFile $file; ` +
      `Start-Process $file"`
    );
  }

  if (os === "linux") {
    return `curl -fsSL ${downloadUrl} | bash`;
  }

  return `curl -fsSL ${downloadUrl} | bash`;
}

function getEnvironmentOptions() {
  return {
    codex: {
      key: "codex" as const,
      label: "Codex",
      status: "available" as const,
      statusLabel: "Disponible aujourd’hui",
      description:
        "L’agent officiel d’OpenAI pour lire le code, écrire des changements et exécuter des commandes.",
      positioning: "Idéal pour celles et ceux qui veulent l'outil officiel et le workflow agentique le plus fort",
      compatibility: "Totalement aligné avec la vision AIPilot et la configuration Azure documentée dans le dossier",
      installState: "AIPilot Manager sait maintenant installer et configurer le parcours Codex CLI dans ce repo",
    },
    t3code: {
      key: "t3code" as const,
      label: "T3 Code",
      status: "available" as const,
      statusLabel: "Disponible aujourd’hui",
      description:
        "Une interface légère au-dessus de Codex CLI pour les personnes qui préfèrent une expérience plus visuelle que le terminal.",
      positioning: "Très adapté à celles et ceux qui veulent une UI légère avec un ressenti proche d'une app desktop",
      compatibility: "Prévu dans la roadmap AIPilot comme option intermédiaire entre l'outil officiel et le terminal-first",
      installState: "AIPilot Manager traite Codex CLI comme prérequis, puis lance T3 Code via le chemin supporté par le manager",
    },
    opencode: {
      key: "opencode" as const,
      label: "OpenCode",
      status: "available" as const,
      statusLabel: "Disponible aujourd'hui",
      description:
        "L’agent open source sur lequel le MVP actuel est réellement branché dans ce repo, avec des téléchargements prêts pour chaque OS.",
      positioning: "Le meilleur choix si vous voulez démarrer vite avec une installation claire dès maintenant",
      compatibility: "C'est le parcours effectivement connecté aujourd'hui aux scripts de téléchargement et aux routes `/api/install`",
      installState: "Le téléchargement et les scripts sont déjà opérationnels, avec les réglages Azure issus de `/admin`",
    },
  };
}

function QuickFact({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function OsLogo({ os }: { os: OsKey }) {
  if (os === "windows") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 text-sky-600"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M3 4.5 10.4 3v8.2H3V4.5Zm8.6-1.7L21 1v10.2h-9.4V2.8ZM3 12.8h7.4V21L3 19.6v-6.8Zm8.6 0H21V23l-9.4-1.8v-8.4Z" />
      </svg>
    );
  }

  if (os === "linux") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <circle cx="12" cy="7" r="3.2" fill="#111827" />
        <ellipse cx="12" cy="13.2" rx="4.8" ry="6.1" fill="#111827" />
        <ellipse cx="10.2" cy="8.2" rx="0.7" ry="0.9" fill="#ffffff" />
        <ellipse cx="13.8" cy="8.2" rx="0.7" ry="0.9" fill="#ffffff" />
        <path d="M11 9.8h2l-.7 1.1h-.6L11 9.8Z" fill="#f59e0b" />
        <ellipse cx="9.5" cy="19.6" rx="2.1" ry="1.1" fill="#f59e0b" />
        <ellipse cx="14.5" cy="19.6" rx="2.1" ry="1.1" fill="#f59e0b" />
      </svg>
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
      M
    </div>
  );
}

function StepperItem({
  step,
  title,
  state,
}: {
  step: string;
  title: string;
  state: "done" | "active" | "locked";
}) {
  const styles = {
    done: "border-emerald-300 bg-emerald-100 text-emerald-950",
    active: "border-sky-300 bg-sky-100 text-sky-950",
    locked: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const labels = {
    done: "Terminé",
    active: "En cours",
    locked: "À venir",
  };

  return (
    <div
      className={`flex min-h-24 flex-col justify-between rounded-2xl border px-4 py-3 ${styles[state]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Étape {step}</p>
        <span className="text-[11px] font-semibold">{labels[state]}</span>
      </div>
      <p className="mt-3 text-sm font-medium leading-6">{title}</p>
    </div>
  );
}

function NoticeCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-50",
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
  };

  return (
    <div className={`rounded-[1.75rem] border p-4 ${tones[tone]}`}>
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function InfoPanel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "slate" | "blue";
  children: React.ReactNode;
}) {
  const tones = {
    slate: "border-slate-200 bg-white",
    blue: "border-sky-200 bg-sky-50/70",
  };

  return (
    <div className={`rounded-[1.75rem] border p-4 ${tones[tone]}`}>
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  dim = false,
}: {
  label: string;
  value: string;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${dim ? "text-slate-500" : "text-slate-950"}`}>
        {value}
      </span>
    </div>
  );
}

function StatusPill({
  status,
  children,
}: {
  status: "available" | "comingSoon";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        status === "available"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {children}
    </span>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "blue" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-100 text-sky-800",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
    amber: "border-amber-200 bg-amber-100 text-amber-800",
  };

  return (
    <span className={`rounded-full border px-3 py-1 font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function DownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50 sm:w-auto"
    >
      {label}
    </a>
  );
}

function CodexFinalTutorial() {
  return (
    <div className="overflow-hidden rounded-[1.9rem] border border-sky-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_38%),linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] shadow-[0_18px_50px_rgba(14,165,233,0.08)]">
      <div className="border-b border-sky-200/80 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.16em] text-sky-800">
            ÉTAPE 5
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            ÉTAPE FINALE CODEX
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">
          Après le téléchargement, suivez ce mini tutoriel pour terminer l’installation
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
          Ouvrez Codex, cliquez sur <InlineCode>Enter API key</InlineCode>, puis revenez dans <InlineCode>AIPilot Manager</InlineCode>. Le manager prépare ensuite toute la configuration Azure pour vous.
        </p>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <TutorialStepCard
            step="1"
            title="Téléchargez"
            text="Téléchargez et installez AIPilot Manager avec le bouton de l’étape précédente."
          />
          <TutorialStepCard
            step="2"
            title="Ouvrez Codex"
            text="Lancez Codex sur votre ordinateur pour afficher son écran d’accueil."
          />
          <TutorialStepCard
            step="3"
            title="Enter API key"
            text="Dans Codex, cliquez sur Enter API key."
          />
          <TutorialStepCard
            step="4"
            title="Connecter ma licence"
            text="Revenez dans AIPilot Manager et cliquez sur Connecter ma licence."
          />
          <TutorialStepCard
            step="5"
            title="Installer et configurer"
            text="Cliquez sur Installer et configurer. AIPilot termine la préparation Azure."
          />
        </div>

        <div className="rounded-[1.5rem] border border-sky-100 bg-white/95 p-5">
          <ol className="space-y-2 text-sm leading-7 text-slate-700">
            <li>1. Téléchargez AIPilot Manager puis terminez son installation.</li>
            <li>2. Ouvrez Codex sur votre machine.</li>
            <li>3. Sur l’écran d’accueil de Codex, cliquez sur <InlineCode>Enter API key</InlineCode>.</li>
            <li>4. Revenez ensuite dans <InlineCode>AIPilot Manager</InlineCode>.</li>
            <li>5. Cliquez sur <InlineCode>Connecter ma licence</InlineCode>.</li>
            <li>6. Cliquez ensuite sur <InlineCode>Installer et configurer</InlineCode>.</li>
            <li>7. AIPilot écrira la configuration Azure, réparera Codex CLI si nécessaire, puis vous pourrez ouvrir Codex et commencer.</li>
          </ol>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <GuideScreenshot
            src="/tutorials/codex-enter-api-key.png"
            alt="Écran de bienvenue Codex avec le bouton Enter API key"
            title="Capture 1 · Dans Codex"
            description="Sur le premier écran, utilisez le bouton Enter API key."
            placeholderLabel="Ajoutez la capture Codex"
            placeholderPath="public/tutorials/codex-enter-api-key.png"
          />
          <GuideScreenshot
            src="/tutorials/aipilot-manager-connect-install.png"
            alt="AIPilot Manager avec les boutons Connecter ma licence et Installer et configurer"
            title="Capture 2 · Dans AIPilot Manager"
            description="Ensuite cliquez sur Connecter ma licence, puis sur Installer et configurer."
            placeholderLabel="Ajoutez la capture AIPilot Manager"
            placeholderPath="public/tutorials/aipilot-manager-connect-install.png"
          />
        </div>
      </div>
    </div>
  );
}

function TutorialStepCard({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-sm font-bold text-sky-900">
          {step}
        </span>
        <p className="text-sm font-bold text-slate-950">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function GuideScreenshot({
  src,
  alt,
  title,
  description,
  placeholderLabel,
  placeholderPath,
}: {
  src: string;
  alt: string;
  title: string;
  description: string;
  placeholderLabel: string;
  placeholderPath: string;
}) {
  const [imageMissing, setImageMissing] = useState(false);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      {!imageMissing ? (
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={700}
          className="h-72 w-full object-cover object-top sm:h-80 xl:h-[28rem]"
          onError={() => setImageMissing(true)}
        />
      ) : (
        <div className="flex h-72 w-full flex-col items-center justify-center bg-slate-100 px-5 text-center sm:h-80 xl:h-[28rem]">
          <p className="text-sm font-semibold text-slate-900">{placeholderLabel}</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            Déposez l’image ici: <InlineCode>{placeholderPath}</InlineCode>
          </p>
        </div>
      )}

      <div className="p-4">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition sm:w-auto ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : "border-emerald-200 bg-emerald-100 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
    >
      {children}
    </button>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}

function InlineCommand({ children }: { children: React.ReactNode }) {
  return (
    <code
      dir="ltr"
      className="mt-3 block overflow-x-auto rounded-xl bg-slate-950 px-4 py-3 text-left text-[13px] leading-6 text-slate-100"
    >
      {children}
    </code>
  );
}
