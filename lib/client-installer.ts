import { getApimOpenAiBaseUrl } from "./apim";

function psQuote(value: string) {
  return value.replace(/`/g, "``").replace(/"/g, '`"');
}

export function buildClientPowerShellInstaller(input: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}) {
  const apiKey = psQuote(input.apiKey);
  const model = psQuote(input.model || "gpt-5.4-1");
  const baseUrl = psQuote(input.baseUrl || getApimOpenAiBaseUrl());

  return `$ApiKey = "${apiKey}"
$BaseUrl = "${baseUrl}"
$Model = "${model}"

[System.Environment]::SetEnvironmentVariable(
  "AZURE_OPENAI_API_KEY", $ApiKey, "Machine"
)

$configDir = "$env:USERPROFILE\\.codex"
New-Item -Force -Path $configDir -ItemType Directory | Out-Null

@"
model = "$Model"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "$BaseUrl"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"

[profiles.azure-medium]
model_provider = "azure"
model = "$Model"
model_reasoning_effort = "medium"

[profiles.azure-high]
model_provider = "azure"
model = "$Model"
model_reasoning_effort = "high"

[profiles.azure-xhigh]
model_provider = "azure"
model = "$Model"
model_reasoning_effort = "xhigh"
"@ | Out-File "$configDir\\config.toml" -Encoding UTF8

Write-Host "AIPilot configured with APIM. Restart your terminal or PC before using Codex."
Write-Host "New APIM keys can take 15-20 seconds to work on the first Codex call."
`;
}
