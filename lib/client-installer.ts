import {
  AIPILOT_PRIMARY_DEPLOYMENT,
  buildAipilotCodexConfig,
  buildAipilotCodexProfileConfig,
  buildAipilotMachineEnvOneLiner,
  getAipilotAzureOpenAiBaseUrl,
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
  const baseUrl = psQuote(input.baseUrl || getAipilotAzureOpenAiBaseUrl());
  const configToml = buildAipilotCodexConfig({
    baseUrl: input.baseUrl || getAipilotAzureOpenAiBaseUrl(),
    model: input.model || AIPILOT_PRIMARY_DEPLOYMENT,
  });
  const mediumProfileToml = buildAipilotCodexProfileConfig({
    model: input.model || AIPILOT_PRIMARY_DEPLOYMENT,
    reasoningEffort: "medium",
  });
  const highProfileToml = buildAipilotCodexProfileConfig({
    model: input.model || AIPILOT_PRIMARY_DEPLOYMENT,
    reasoningEffort: "high",
  });
  const xhighProfileToml = buildAipilotCodexProfileConfig({
    model: input.model || AIPILOT_PRIMARY_DEPLOYMENT,
    reasoningEffort: "xhigh",
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

@'
${mediumProfileToml}
'@ | Out-File "$configDir\\azure-medium.config.toml" -Encoding UTF8
@'
${highProfileToml}
'@ | Out-File "$configDir\\azure-high.config.toml" -Encoding UTF8
@'
${xhighProfileToml}
'@ | Out-File "$configDir\\azure-xhigh.config.toml" -Encoding UTF8

Write-Host "AIPilot configured. Restart your terminal or PC before using Codex."
Write-Host "Machine env one-liner:"
Write-Host '${buildAipilotMachineEnvOneLiner(input.apiKey).replace(/'/g, "''")}'
`;
}
