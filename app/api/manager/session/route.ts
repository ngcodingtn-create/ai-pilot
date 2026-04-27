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

function normalizeEnvironment(value: unknown): EnvironmentKey | undefined {
  if (value === "codex" || value === "t3code" || value === "opencode") {
    return value;
  }

  return undefined;
}

function buildAzureBaseUrl(resourceName: string) {
  return `https://${resourceName}.openai.azure.com/openai/v1`;
}

function buildCodexConfig(resourceName: string, deployment: string) {
  const baseUrl = buildAzureBaseUrl(resourceName);

  return `model = "${deployment}"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "${baseUrl}"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"
query_params = { api-version = "2025-04-01-preview" }

[profiles.azure-medium]
model_provider = "azure"
model = "${deployment}"
model_reasoning_effort = "medium"

[profiles.azure-high]
model_provider = "azure"
model = "${deployment}"
model_reasoning_effort = "high"

[profiles.azure-xhigh]
model_provider = "azure"
model = "${deployment}"
model_reasoning_effort = "xhigh"
`;
}

function buildOpenCodeConfig(resourceName: string, deployment: string) {
  return {
    $schema: "https://opencode.ai/config.json",
    provider: {
      azure: {
        npm: "@ai-sdk/azure",
        options: {
          baseURL: `https://${resourceName}.openai.azure.com/openai/deployments`,
        },
        models: {
          [deployment]: {},
        },
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

function buildToolDetails(environment: EnvironmentKey): ToolDetails {
  if (environment === "codex") {
    return {
      label: "Codex",
      projectRootRecommended: false,
      notes: [
        "Installez d'abord l'app desktop Codex officielle. Ensuite AIPilot vérifie sa présence, répare Codex CLI, écrit ~/.codex/config.toml et injecte la configuration Azure.",
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
        "Installez d'abord l'app desktop T3 Code officielle. Ensuite AIPilot vérifie sa présence, prépare Codex CLI comme prérequis et injecte la configuration Azure.",
        "Si le binaire T3 local n'est pas disponible, le manager peut lancer le fallback officiel via npx.",
      ],
      officialAppUrl: "https://github.com/pingdotgg/t3code/releases",
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
  const deployment = config.azureDefaultDeployment;
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
      codex: {
        baseUrl: buildAzureBaseUrl(resourceName),
        configToml: buildCodexConfig(resourceName, deployment),
      },
      opencode: {
        config: buildOpenCodeConfig(resourceName, deployment),
        auth: buildOpenCodeAuth(effectiveApiKey),
      },
    },
  });
}
