import { getStoredConfig } from "@/lib/config-store";
import { findLifecycleLicenseByKey } from "@/lib/client-pipeline-store";
import {
  createLicense,
  findLicenseByKey,
  updateLicenseStatus,
  type LicenseRecord,
} from "@/lib/license-store";
import {
  AIPILOT_DEPLOYMENTS,
  AIPILOT_PRIMARY_DEPLOYMENT,
  buildAipilotCodexConfig,
  getAipilotAzureOpenAiBaseUrl,
} from "@/lib/aipilot-apim-settings";

type EnvironmentKey = "codex" | "vscode-codex" | "t3code" | "opencode";

type ToolDetails = {
  label: string;
  projectRootRecommended: boolean;
  notes: string[];
  officialAppUrl?: string;
  officialCliUrl?: string;
  officialIdeUrl?: string;
};

type TutorialLink = {
  label: string;
  url: string;
};

type AvailableDeployment = {
  id: string;
  label: string;
  deployment: string;
  recommended: boolean;
};

const DEFAULT_SUPPORT_VIDEO_URL = "https://youtu.be/WwDvzdM9YWw";
const PRODUCTION_SITE_URL = "https://ai-pilot-ten.vercel.app";

function normalizeEnvironment(value: unknown): EnvironmentKey | undefined {
  if (
    value === "codex" ||
    value === "vscode-codex" ||
    value === "t3code" ||
    value === "opencode"
  ) {
    return value;
  }

  return undefined;
}

function buildOpenCodeConfig(
  baseUrl: string,
  apiKey: string,
  deployment: string,
  availableDeployments: AvailableDeployment[],
) {
  const models = Object.fromEntries(
    availableDeployments
      .map((item) => ({
        deployment: item.deployment,
        label: item.label,
      }))
      .filter(
        (item, index, list) =>
          list.findIndex((entry) => entry.deployment === item.deployment) === index,
      )
      .map((item) => [
        item.deployment,
        {
          id: item.deployment,
          name: `${item.label} (AIPilot)`,
          options: {
            reasoningEffort: "high",
          },
        },
      ]),
  );

  return {
    $schema: "https://opencode.ai/config.json",
    model: `azure/${deployment}`,
    provider: {
      azure: {
        npm: "@ai-sdk/openai",
        name: "AIPilot AI",
        options: {
          baseURL: baseUrl,
          apiKey,
        },
        models,
        env: ["AIPILOT_OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY"],
      },
    },
  };
}

function buildOpenCodeAuth(apiKey: string) {
  return {
    azure: {
      type: "api",
      key: apiKey,
    },
  };
}

function safeTutorialUrl(value: string | undefined) {
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

function parseTutorialLinks(value: string | undefined) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, urlPart] = line.split("|");
      const url = safeTutorialUrl((urlPart ?? labelPart).trim());
      if (!url) {
        return null;
      }

      const label = (urlPart ? labelPart : "Tutoriel AIPilot").trim() || "Tutoriel AIPilot";
      return { label, url };
    })
    .filter((item): item is TutorialLink => Boolean(item));
}

function dedupeTutorialLinks(items: TutorialLink[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}|${item.url}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAvailableDeployments() {
  return AIPILOT_DEPLOYMENTS.map((item) => ({ ...item })) satisfies AvailableDeployment[];
}

function buildManagerTutorials(config: Awaited<ReturnType<typeof getStoredConfig>>, tool: ToolDetails) {
  const tutorials = parseTutorialLinks(config.managerTutorialLinks);
  const supportVideoUrl =
    safeTutorialUrl(config.supportVideoUrl) || DEFAULT_SUPPORT_VIDEO_URL;
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL).replace(
    /\/$/,
    "",
  );

  if (supportVideoUrl) {
    tutorials.unshift({
      label: "Téléchargement et configuration pas à pas",
      url: supportVideoUrl,
    });
  }

  tutorials.push({
    label: "Guide manuel complet AIPilot",
    url: `${siteUrl}/tuto`,
  });

  if (tool.officialAppUrl) {
    tutorials.push({
      label: `Télécharger ${tool.label}`,
      url: tool.officialAppUrl,
    });
  }

  if (tool.officialCliUrl && tool.officialCliUrl !== tool.officialAppUrl) {
    tutorials.push({
      label: `Guide ${tool.label}`,
      url: tool.officialCliUrl,
    });
  }

  if (tool.officialIdeUrl) {
    tutorials.push({
      label: `Codex dans VS Code`,
      url: tool.officialIdeUrl,
    });
  }

  tutorials.push({
    label: "Portail AIPilot",
    url: "https://ai-pilot-ten.vercel.app",
  });

  return dedupeTutorialLinks(tutorials);
}

function buildToolDetails(environment: EnvironmentKey): ToolDetails {
  if (environment === "codex") {
    return {
      label: "Codex app",
      projectRootRecommended: false,
      notes: [
        "Installez d'abord l'app desktop Codex officielle. Ensuite AIPilot vérifie sa présence, répare Codex CLI, écrit ~/.codex/config.toml et injecte la configuration Azure.",
        "Si vous voyez `404 The API deployment for this resource does not exist`, vérifiez dans l'admin AIPilot que le champ de déploiement contient le nom exact du déploiement Azure AI Foundry, pas juste un nom de modèle supposé.",
        "Le changement de modèle se fait ici dans AIPilot Manager: le bon déploiement Azure est écrit dans ~/.codex/config.toml, puis Codex app est relancée.",
        "Pour Codex dans VS Code, installez l'extension officielle, vérifiez ~/.codex/auth.json, puis ouvrez votre projet avec `code .`.",
        "Sur Windows, un terminal WSL2 reste recommandé si l'utilisateur veut un workflow CLI plus stable.",
      ],
      officialAppUrl: "https://developers.openai.com/codex/app",
      officialCliUrl: "https://github.com/openai/codex/releases",
      officialIdeUrl: "https://developers.openai.com/codex/ide/features",
    };
  }

  if (environment === "vscode-codex") {
    return {
      label: "VS Code Codex",
      projectRootRecommended: true,
      notes: [
        "AIPilot prépare Codex CLI, écrit ~/.codex/config.toml, crée ~/.codex/auth.json pour Azure API Key, puis ouvre Visual Studio Code sur votre dossier projet.",
        "L’extension officielle Codex dans VS Code est installée ou réparée automatiquement si la commande `code` est disponible sur cette machine.",
        "Le modèle Azure actif est piloté par AIPilot Manager: GPT-5.6 (gpt-5.6-sol) est écrit dans la configuration avant l’ouverture de VS Code.",
        "Si VS Code n’est pas encore installé, téléchargez-le d’abord depuis le site officiel puis relancez AIPilot Manager.",
      ],
      officialAppUrl: "https://code.visualstudio.com/download",
      officialCliUrl: "https://github.com/openai/codex/releases",
      officialIdeUrl: "https://developers.openai.com/codex/ide/features",
    };
  }

  if (environment === "t3code") {
    return {
      label: "T3 Code",
      projectRootRecommended: false,
      notes: [
        "Installez d'abord l'app desktop T3 Code officielle depuis t3.codes. Ensuite AIPilot vérifie sa présence, prépare Codex CLI comme prérequis et injecte la configuration Azure.",
        "Si T3 Code affiche `404 The API deployment for this resource does not exist`, le problème vient presque toujours du nom de déploiement Azure configuré dans AIPilot admin.",
        "Si vous utilisez aussi Codex dans VS Code, gardez la même config ~/.codex/config.toml et le même auth.json côté utilisateur.",
        "Si le binaire T3 local n'est pas disponible, le manager peut lancer le fallback officiel via npx.",
      ],
      officialAppUrl: "https://t3.codes/",
      officialCliUrl: "https://github.com/openai/codex/releases",
      officialIdeUrl: "https://developers.openai.com/codex/ide/features",
    };
  }

  return {
      label: "OpenCode",
      projectRootRecommended: true,
      notes: [
      "AIPilot installe et configure uniquement OpenCode CLI, puis écrit la configuration Azure globale et optionnellement la configuration projet.",
      "Sous Windows, WSL reste recommandé pour la meilleure expérience OpenCode CLI.",
      ],
    officialAppUrl: "https://opencode.ai/install",
    officialCliUrl: "https://opencode.ai/install",
  };
}

function lifecycleIsInactive(
  lifecycle: Awaited<ReturnType<typeof findLifecycleLicenseByKey>>,
) {
  if (!lifecycle?.license) {
    return false;
  }

  const expired =
    lifecycle.license.expiresAt &&
    new Date(lifecycle.license.expiresAt).getTime() <= Date.now();
  const revoked = !lifecycle.license.isActive;
  const inactiveClient =
    lifecycle.client?.status === "expired" ||
    lifecycle.client?.status === "lost" ||
    lifecycle.client?.status === "cancelled";

  return Boolean(expired || revoked || inactiveClient);
}

function inactiveLifecycleMessage(
  lifecycle: Awaited<ReturnType<typeof findLifecycleLicenseByKey>>,
) {
  return lifecycle?.license?.type === "trial"
    ? "Trial license expired or inactive."
    : "Paid license inactive.";
}

async function repairInstallLicenseFromLifecycle(
  licenseKey: string,
  lifecycle: Awaited<ReturnType<typeof findLifecycleLicenseByKey>>,
  environment: EnvironmentKey | undefined,
) {
  if (!lifecycle?.license || !lifecycle.client || lifecycleIsInactive(lifecycle)) {
    return null;
  }

  return createLicense({
    customerName: lifecycle.client.name?.trim() || lifecycle.client.phone || "AIPilot Client",
    customerEmail: lifecycle.client.email,
    tier: "pro",
    preferredEnvironment: environment ?? "codex",
    status: "active",
    licenseKey,
    notes: `Repaired from lifecycle client ${lifecycle.client.id} — ${lifecycle.license.type}`,
  });
}

async function resolveManagerLicense(
  licenseKey: string,
  environment: EnvironmentKey | undefined,
) {
  let license = await findLicenseByKey(licenseKey);
  const lifecycle = await findLifecycleLicenseByKey(license?.licenseKey ?? licenseKey);

  if (license && license.status !== "active") {
    await updateLicenseStatus(license.id, "disabled");
    return {
      license: null,
      lifecycle,
      error: "License not found or inactive.",
      status: 404,
    };
  }

  if (lifecycleIsInactive(lifecycle)) {
    return {
      license: null,
      lifecycle,
      error: inactiveLifecycleMessage(lifecycle),
      status: 403,
    };
  }

  if (!license && lifecycle?.license?.isActive) {
    license = await repairInstallLicenseFromLifecycle(
      lifecycle.license.key,
      lifecycle,
      environment,
    );
  }

  if (!license || license.status !== "active") {
    return {
      license: null,
      lifecycle,
      error: "License not found or inactive.",
      status: 404,
    };
  }

  return { license, lifecycle, error: "", status: 200 };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        environment?: EnvironmentKey;
        licenseKey?: string;
      }
    | null;

  const licenseKey = String(payload?.licenseKey ?? "");
  const requestedEnvironment = normalizeEnvironment(payload?.environment);
  const resolved = await resolveManagerLicense(licenseKey, requestedEnvironment);

  if (!resolved.license) {
    return Response.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const license: LicenseRecord = resolved.license;

  const config = await getStoredConfig();
  const selectedEnvironment =
    requestedEnvironment ?? license.preferredEnvironment;

  const effectiveApiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  if (!effectiveApiKey) {
    return Response.json(
      { error: "AZURE_OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const baseUrl = getAipilotAzureOpenAiBaseUrl();
  if (!baseUrl) {
    return Response.json(
      { error: "AZURE_OPENAI_BASE_URL is not configured on the server." },
      { status: 500 },
    );
  }

  const resourceName = (() => {
    try {
      return new URL(baseUrl).hostname.split(".")[0] || "aipilot";
    } catch {
      return "aipilot";
    }
  })();
  const availableDeployments = buildAvailableDeployments();
  const deployment =
    availableDeployments.find((item) => item.deployment === AIPILOT_PRIMARY_DEPLOYMENT)
      ?.deployment || availableDeployments[0].deployment;
  const tool = buildToolDetails(selectedEnvironment);

  return Response.json({
    license: {
      key: license.licenseKey,
      customerName: license.customerName,
      tier: license.tier,
    },
    manager: {
      supportVideoUrl:
        safeTutorialUrl(config.supportVideoUrl) || DEFAULT_SUPPORT_VIDEO_URL,
      supportEmail: config.supportEmail ?? "",
      tutorials: buildManagerTutorials(config, tool),
    },
    tool: {
      environment: selectedEnvironment,
      label: tool.label,
      projectRootRecommended: tool.projectRootRecommended,
      notes: tool.notes,
      officialAppUrl: tool.officialAppUrl ?? "",
      officialCliUrl: tool.officialCliUrl ?? "",
      officialIdeUrl: tool.officialIdeUrl ?? "",
    },
    azure: {
      apiKey: effectiveApiKey,
      resourceName,
      baseUrl,
      deployment,
      selectedModelLabel: availableDeployments[0].label,
      availableDeployments,
      codex: {
        baseUrl,
        configToml: buildAipilotCodexConfig({ baseUrl, model: deployment }),
      },
      opencode: {
        config: buildOpenCodeConfig(
          baseUrl,
          effectiveApiKey,
          deployment,
          availableDeployments,
        ),
        auth: buildOpenCodeAuth(effectiveApiKey),
      },
    },
  });
}
