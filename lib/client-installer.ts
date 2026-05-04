import { getApimOpenAiBaseUrl } from "./apim";
import {
  AIPILOT_PRIMARY_DEPLOYMENT,
  buildAipilotCodexConfig,
  buildAipilotMachineEnvOneLiner,
} from "./aipilot-apim-settings";

function psQuote(value: string) {
  return value.replace(/`/g, "``").replace(/"/g, '`"');
}

export function buildClientPowerShellInstaller(input: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}) {
  const apiKey = psQuote(input.apiKey);
  const model = psQuote(input.model || AIPILOT_PRIMARY_DEPLOYMENT);
  const baseUrl = psQuote(input.baseUrl || getApimOpenAiBaseUrl());
  const configToml = buildAipilotCodexConfig({
    baseUrl: input.baseUrl || getApimOpenAiBaseUrl(),
    model: input.model || AIPILOT_PRIMARY_DEPLOYMENT,
  });

  return `$ApiKey = "${apiKey}"
$BaseUrl = "${baseUrl}"
$Model = "${model}"

[System.Environment]::SetEnvironmentVariable(
  "AZURE_OPENAI_API_KEY", $ApiKey, "Machine"
)

$configDir = "$env:USERPROFILE\\.codex"
New-Item -Force -Path $configDir -ItemType Directory | Out-Null

$ConfigToml = @'
${configToml}
'@
$ConfigToml = $ConfigToml.Replace("CLIENT_USERNAME", $env:USERNAME)
$ConfigToml | Out-File "$configDir\\config.toml" -Encoding UTF8

Write-Host "AIPilot configured with APIM. Restart your terminal or PC before using Codex."
Write-Host "New APIM keys can take 15-20 seconds to work on the first Codex call."
Write-Host "Machine env one-liner:"
Write-Host '${buildAipilotMachineEnvOneLiner(input.apiKey).replace(/'/g, "''")}'
`;
}
