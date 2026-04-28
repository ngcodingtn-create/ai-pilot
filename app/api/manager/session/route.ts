import { getStoredConfig } from "@/lib/config-store";
import { findLicenseByKey } from "@/lib/license-store";

type EnvironmentKey = "codex" | "t3code" | "opencode";

type ToolDetails = {
  label: string;
  projectRootRecommended: boolean;
  notes: string[];
  officialAppUrl?: string;
  officialCliUrl?: string;
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

function normalizeEnvironment(value: unknown): EnvironmentKey | undefined {
  if (value === "codex" || value === "t3code" || value === "opencode") {
    return value;
  }

  return undefined;
}

function buildAzureBaseUrl(resourceName: string) {
  return `https://${resourceName}.openai.azure.com/openai/v1`;
}

function buildCodexConfig(
  resourceName: string,
  deployment: string,
  availableDeployments: AvailableDeployment[],
) {
  const baseUrl = buildAzureBaseUrl(resourceName);
  const gpt55 = availableDeployments.find((item) => item.id === "gpt-5.5");

  return `model = "${deployment}"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "Azure Openai"
base_url = "${baseUrl}"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"

[profiles.azure-medium]
model_provider = "azure"
model = "${deployment}"
model_reasoning_effort = "medium"

[profiles.azure-medium.windows]
sandbox = "elevated"

[profiles.azure-high]
model_provider = "azure"
model = "${deployment}"
model_reasoning_effort = "high"

[profiles.azure-xhigh]
model_provider = "azure"
model = "${deployment}"
model_reasoning_effort = "xhigh"

${
  gpt55
    ? `[profiles.azure-55-medium]
model_provider = "azure"
model = "${gpt55.deployment}"
model_reasoning_effort = "medium"

[profiles.azure-55-high]
model_provider = "azure"
model = "${gpt55.deployment}"
model_reasoning_effort = "high"

[profiles.azure-55-xhigh]
model_provider = "azure"
model = "${gpt55.deployment}"
model_reasoning_effort = "xhigh"

`
    : ""
}
[windows]
sandbox = "elevated"
`;
}

function buildOpenCodeConfig(
  resourceName: string,
  deployment: string,
  availableDeployments: AvailableDeployment[],
) {
  return {
    $schema: "https://opencode.ai/config.json",
    provider: {
      azure: {
        npm: "@ai-sdk/azure",
        options: {
          baseURL: `https://${resourceName}.openai.azure.com/openai/deployments`,
        },
        models: Object.fromEntries(
          availableDeployments.map((item) => [item.deployment, {}]),
        ),
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

function buildAvailableDeployments(config: Awaited<ReturnType<typeof getStoredConfig>>) {
  const deployments: AvailableDeployment[] = [
    {
      id: "gpt-5.4",
      label: "GPT-5.4",
      deployment: config.azureDefaultDeployment,
      recommended: true,
    },
  ];

  const gpt55 = String(config.azureGpt55Deployment ?? "").trim();
  if (gpt55 && gpt55 !== config.azureDefaultDeployment) {
    deployments.push({
      id: "gpt-5.5",
      label: "GPT-5.5",
      deployment: gpt55,
      recommended: false,
    });
  }

  return deployments;
}

function buildManagerTutorials(config: Awaited<ReturnType<typeof getStoredConfig>>, tool: ToolDetails) {
  const tutorials = parseTutorialLinks(config.managerTutorialLinks);
  const supportVideoUrl = safeTutorialUrl(config.supportVideoUrl);

  if (supportVideoUrl) {
    tutorials.unshift({
      label: "Vidéo de démarrage AIPilot",
      url: supportVideoUrl,
    });
  }

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

  tutorials.push({
    label: "Portail AIPilot",
    url: "https://ai-pilot-ten.vercel.app",
  });

  return dedupeTutorialLinks(tutorials);
}

function buildToolDetails(environment: EnvironmentKey): ToolDetails {
  if (environment === "codex") {
    return {
      label: "Codex",
      projectRootRecommended: false,
      notes: [
        "Installez d'abord l'app desktop Codex officielle. Ensuite AIPilot vérifie sa présence, répare Codex CLI, écrit ~/.codex/config.toml et injecte la configuration Azure.",
        "Si vous voyez `404 The API deployment for this resource does not exist`, vérifiez dans l'admin AIPilot que le champ de déploiement contient le nom exact du déploiement Azure AI Foundry, pas juste un nom de modèle supposé.",
        "Sur Windows, un terminal WSL2 reste recommandé si l'utilisateur veut un workflow CLI plus stable.",
      ],
      officialAppUrl: "https://developers.openai.com/codex/app/windows",
      officialCliUrl: "https://github.com/openai/codex/releases",
    };
  }

  if (environment === "t3code") {
    return {
      label: "T3 Code",
      projectRootRecommended: false,
      notes: [
        "Installez d'abord l'app desktop T3 Code officielle depuis t3.codes. Ensuite AIPilot vérifie sa présence, prépare Codex CLI comme prérequis et injecte la configuration Azure.",
        "Si T3 Code affiche `404 The API deployment for this resource does not exist`, le problème vient presque toujours du nom de déploiement Azure configuré dans AIPilot admin.",
        "Si le binaire T3 local n'est pas disponible, le manager peut lancer le fallback officiel via npx.",
      ],
      officialAppUrl: "https://t3.codes/",
      officialCliUrl: "https://github.com/openai/codex/releases",
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

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        environment?: EnvironmentKey;
        licenseKey?: string;
      }
    | null;

  const licenseKey = String(payload?.licenseKey ?? "");
  const license = await findLicenseByKey(licenseKey);

  if (!license || license.status !== "active") {
    return Response.json(
      { error: "License not found or inactive." },
      { status: 404 },
    );
  }

  const config = await getStoredConfig();
  const selectedEnvironment =
    normalizeEnvironment(payload?.environment) ?? license.preferredEnvironment;
  const effectiveApiKey = license.azureApiKey ?? config.azureApiKey;

  if (!effectiveApiKey) {
    return Response.json(
      {
        error:
          "No Azure API key is available for this license. Configure a per-license or global key in admin.",
      },
      { status: 409 },
    );
  }

  const resourceName = config.azureResourceName;
  const availableDeployments = buildAvailableDeployments(config);
  const deployment = availableDeployments[0].deployment;
  const tool = buildToolDetails(selectedEnvironment);

  return Response.json({
    license: {
      key: license.licenseKey,
      customerName: license.customerName,
      tier: license.tier,
    },
    manager: {
      supportVideoUrl: config.supportVideoUrl ?? "",
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
    },
    azure: {
      apiKey: effectiveApiKey,
      resourceName,
      deployment,
      selectedModelLabel: availableDeployments[0].label,
      availableDeployments,
      codex: {
        baseUrl: buildAzureBaseUrl(resourceName),
        configToml: buildCodexConfig(resourceName, deployment, availableDeployments),
      },
      opencode: {
        config: buildOpenCodeConfig(resourceName, deployment, availableDeployments),
        auth: buildOpenCodeAuth(effectiveApiKey),
      },
    },
  });
}
