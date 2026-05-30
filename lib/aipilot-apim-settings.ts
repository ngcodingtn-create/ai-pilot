export const AIPILOT_APIM_GATEWAY_URL = "https://nextgen.azure-api.net";
export const AIPILOT_APIM_API_SUFFIX = "api/openai/v1";
export const AIPILOT_APIM_OPENAI_BASE_URL =
  `${AIPILOT_APIM_GATEWAY_URL}/${AIPILOT_APIM_API_SUFFIX}`;

export const AIPILOT_PRIMARY_DEPLOYMENT = "gpt-5.4-1";

export const AIPILOT_DEPLOYMENTS = [
  {
    id: "gpt-5.4",
    label: "GPT-5.4 stable",
    deployment: "gpt-5.4-1",
    recommended: true,
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5 premium",
    deployment: "gpt-5.5-1",
    recommended: false,
  },
  {
    id: "gpt-5.3-codex",
    label: "GPT-5.3 Codex",
    deployment: "gpt-5.3-codex",
    recommended: false,
  },
  {
    id: "gpt-5.4-2",
    label: "GPT-5.4 secondary",
    deployment: "gpt-5.4-2",
    recommended: false,
  },
  {
    id: "gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    deployment: "gpt-5.4-pro",
    recommended: false,
  },
] as const;

const LEGACY_APIM_BASE_URLS = new Set([
  "https://nextgen.azure-api.net/openai",
  "https://nextgen.azure-api.net/openai/v1",
  "https://nextgen.azure-api.net/amine-3125-resource/openai/v1",
]);

function tomlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function normalizeWindowsUser(value?: string) {
  return String(value || "CLIENT_USERNAME")
    .replace(/['\r\n]/g, "")
    .trim() || "CLIENT_USERNAME";
}

export function normalizeApimOpenAiBaseUrl(value?: string) {
  const configured = String(value ?? "").trim().replace(/\/+$/, "");
  if (!configured || LEGACY_APIM_BASE_URLS.has(configured)) {
    return AIPILOT_APIM_OPENAI_BASE_URL;
  }

  return configured;
}

export function buildAipilotCodexConfig(input: {
  baseUrl?: string;
  model?: string;
  windowsUser?: string;
}) {
  const model = input.model || AIPILOT_PRIMARY_DEPLOYMENT;
  const baseUrl = normalizeApimOpenAiBaseUrl(input.baseUrl);
  const windowsUser = normalizeWindowsUser(input.windowsUser);

  return `model = "${tomlString(model)}"
model_provider = "azure"
model_reasoning_effort = "medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "${tomlString(baseUrl)}"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"

[windows]
sandbox = "unelevated"

[projects.'c:\\users\\${windowsUser}\\.codex']
trust_level = "trusted"
`;
}

export function buildAipilotCodexProfileConfig(input: {
  model?: string;
  reasoningEffort: "medium" | "high" | "xhigh";
}) {
  const model = input.model || AIPILOT_PRIMARY_DEPLOYMENT;

  return `model_provider = "azure"
model = "${tomlString(model)}"
model_reasoning_effort = "${input.reasoningEffort}"

[windows]
sandbox = "unelevated"
`;
}

export function buildAipilotMachineEnvOneLiner(apiKey: string) {
  const safeKey = apiKey.replace(/"/g, '`"');
  return `[System.Environment]::SetEnvironmentVariable("AZURE_OPENAI_API_KEY","${safeKey}","Machine")`;
}
