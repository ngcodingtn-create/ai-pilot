param(
  [string]$AzureResourceName = "admin-3342-resource",
  [string]$AzureApiKey = "",
  [string]$AzureDeployment = "gpt-5.4-1",
  [string]$ProjectRoot = "",
  [switch]$SkipSmokeTests
)

$ErrorActionPreference = "Stop"

function Step($text) {
  Write-Host "`n==> $text" -ForegroundColor Cyan
}

$ResolvedProjectRoot = $null

if ($ProjectRoot -and (Test-Path $ProjectRoot)) {
  $ResolvedProjectRoot = Resolve-Path $ProjectRoot
} elseif (Test-Path (Get-Location)) {
  $ResolvedProjectRoot = Resolve-Path (Get-Location)
} else {
  $ResolvedProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
}

$ExternalSkillsDir = Join-Path $ResolvedProjectRoot "external-skills"
$AnthropicRepo = Join-Path $ExternalSkillsDir "anthropic-skills"
$ClaudeSkillsRepo = Join-Path $ExternalSkillsDir "claude-skills"
$OpenCodeConfigPath = Join-Path $ResolvedProjectRoot "opencode.json"
$OpenCodeDir = Join-Path $ResolvedProjectRoot ".opencode"
$OpenCodeLocalConfigPath = Join-Path $OpenCodeDir "config.json"

Step "Project root: $ResolvedProjectRoot"

Step "Ensure opencode is installed"
if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  npm install -g opencode-ai
} else {
  Write-Host "opencode already installed"
}

if ([string]::IsNullOrWhiteSpace($AzureApiKey)) {
  $AzureApiKey = Read-Host "Paste your Azure OpenAI API key"
}

Step "Set Azure environment variables (current session + persistent user vars)"
$env:AZURE_RESOURCE_NAME = $AzureResourceName
$env:AZURE_OPENAI_API_KEY = $AzureApiKey
$env:AZURE_OPENAI_DEPLOYMENT = $AzureDeployment

setx AZURE_RESOURCE_NAME $AzureResourceName | Out-Null
setx AZURE_OPENAI_API_KEY $AzureApiKey | Out-Null
setx AZURE_OPENAI_DEPLOYMENT $AzureDeployment | Out-Null

Step "Clone or update skill repositories"
New-Item -ItemType Directory -Force -Path $ExternalSkillsDir | Out-Null

if (-not (Test-Path $AnthropicRepo)) {
  git clone "https://github.com/anthropics/skills.git" $AnthropicRepo
} else {
  git -C $AnthropicRepo pull --ff-only
}

if (-not (Test-Path $ClaudeSkillsRepo)) {
  git clone "https://github.com/alirezarezvani/claude-skills.git" $ClaudeSkillsRepo
} else {
  git -C $ClaudeSkillsRepo pull --ff-only
}

Step "Write OpenCode project config"
New-Item -ItemType Directory -Force -Path $OpenCodeDir | Out-Null

$ProjectConfig = @"
{
  "$schema": "https://opencode.ai/config.json",
  "model": "azure/gpt-5.4-1",
  "skills": {
    "paths": [
      "./external-skills/anthropic-skills/skills",
      "./external-skills/claude-skills/engineering-team",
      "./external-skills/claude-skills/engineering",
      "./external-skills/claude-skills/product-team",
      "./external-skills/claude-skills/marketing-skill",
      "./external-skills/claude-skills/project-management",
      "./external-skills/claude-skills/ra-qm-team",
      "./external-skills/claude-skills/c-level-advisor",
      "./external-skills/claude-skills/business-growth",
      "./external-skills/claude-skills/finance"
    ]
  },
  "provider": {
    "azure": {
      "options": {
        "resourceName": "$AzureResourceName",
        "apiKey": "$AzureApiKey"
      },
      "models": {
        "gpt-5.4-1": {
          "id": "gpt-5.4-1",
          "name": "GPT-5.4-1 (Azure deployment)"
        },
        "gpt-5.3-codex": {
          "id": "gpt-5.3-codex",
          "name": "GPT-5.3-Codex (Azure deployment)"
        },
        "gpt-5.4-pro": {
          "id": "gpt-5.4-pro",
          "name": "GPT-5.4-Pro (Azure deployment)"
        }
      },
      "env": ["AZURE_RESOURCE_NAME", "AZURE_OPENAI_API_KEY"]
    },
    "azure-chat": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Azure OpenAI Chat Completions",
      "options": {
        "baseURL": "https://admin-3342-resource.openai.azure.com/openai/v1",
        "apiKey": "$AzureApiKey"
      },
      "models": {
        "Kimi-K2.6": {
          "id": "Kimi-K2.6",
          "name": "Kimi-K2.6 (Chat Completions)"
        }
      }
    }
  }
}
"@

$LocalConfig = @"
{
  "providers": {
    "azure": {
      "resourceName": "$AzureResourceName",
      "apiKey": "$AzureApiKey",
      "deployment": "$AzureDeployment"
    }
  },
  "defaultProvider": "azure"
}
"@

Set-Content -Path $OpenCodeConfigPath -Value $ProjectConfig -Encoding UTF8
Set-Content -Path $OpenCodeLocalConfigPath -Value $LocalConfig -Encoding UTF8

if (-not $SkipSmokeTests) {
  Step "Run model smoke tests"
  Push-Location $ResolvedProjectRoot
  try {
    opencode run "Reply with exactly: OK" -m azure/gpt-5.4-1
    opencode run "Reply with exactly: OK" -m azure/gpt-5.3-codex
    opencode run "Reply with exactly: OK" -m azure/gpt-5.4-pro
    opencode run "Reply with exactly: OK" -m azure-chat/Kimi-K2.6
  }
  finally {
    Pop-Location
  }
}

Step "Done"
Write-Host "Use one of these commands in project root:" -ForegroundColor Green
Write-Host "  opencode -m azure/gpt-5.4-1"
Write-Host "  opencode -m azure/gpt-5.3-codex"
Write-Host "  opencode -m azure/gpt-5.4-pro"
Write-Host "  opencode -m azure-chat/Kimi-K2.6"
Write-Host "Note: restart terminal once to load persistent vars from setx." -ForegroundColor Yellow
