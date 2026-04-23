#!/usr/bin/env bash
set -euo pipefail

AZURE_RESOURCE_NAME="${AZURE_RESOURCE_NAME:-admin-3342-resource}"
AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY:-}"
AZURE_OPENAI_DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT:-gpt-5.4-1}"
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-0}"

step() {
  echo
  echo "==> $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT_INPUT="${PROJECT_ROOT:-}"

if [[ -n "$PROJECT_ROOT_INPUT" && -d "$PROJECT_ROOT_INPUT" ]]; then
  PROJECT_ROOT="$(cd "$PROJECT_ROOT_INPUT" && pwd)"
elif [[ -d "$(pwd)" ]]; then
  PROJECT_ROOT="$(pwd)"
else
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

EXTERNAL_SKILLS_DIR="$PROJECT_ROOT/external-skills"
ANTHROPIC_REPO="$EXTERNAL_SKILLS_DIR/anthropic-skills"
CLAUDE_SKILLS_REPO="$EXTERNAL_SKILLS_DIR/claude-skills"
OPENCODE_DIR="$PROJECT_ROOT/.opencode"

step "Project root: $PROJECT_ROOT"

step "Ensure opencode is installed"
if ! command -v opencode >/dev/null 2>&1; then
  npm install -g opencode-ai
else
  echo "opencode already installed"
fi

if [[ -z "$AZURE_OPENAI_API_KEY" ]]; then
  read -rsp "Paste your Azure OpenAI API key: " AZURE_OPENAI_API_KEY
  echo
fi

step "Export Azure environment variables"
export AZURE_RESOURCE_NAME
export AZURE_OPENAI_API_KEY
export AZURE_OPENAI_DEPLOYMENT

SHELL_RC="$HOME/.bashrc"
if [[ "${SHELL:-}" == *"zsh"* ]]; then
  SHELL_RC="$HOME/.zshrc"
fi

touch "$SHELL_RC"
grep -q "AZURE_RESOURCE_NAME=$AZURE_RESOURCE_NAME" "$SHELL_RC" || echo "export AZURE_RESOURCE_NAME=$AZURE_RESOURCE_NAME" >> "$SHELL_RC"
grep -q "AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY" "$SHELL_RC" || echo "export AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY" >> "$SHELL_RC"
grep -q "AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT" "$SHELL_RC" || echo "export AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT" >> "$SHELL_RC"

step "Clone or update skill repositories"
mkdir -p "$EXTERNAL_SKILLS_DIR"

if [[ ! -d "$ANTHROPIC_REPO/.git" ]]; then
  git clone "https://github.com/anthropics/skills.git" "$ANTHROPIC_REPO"
else
  git -C "$ANTHROPIC_REPO" pull --ff-only
fi

if [[ ! -d "$CLAUDE_SKILLS_REPO/.git" ]]; then
  git clone "https://github.com/alirezarezvani/claude-skills.git" "$CLAUDE_SKILLS_REPO"
else
  git -C "$CLAUDE_SKILLS_REPO" pull --ff-only
fi

step "Write OpenCode project config"
mkdir -p "$OPENCODE_DIR"
DOLLAR='$'

cat > "$PROJECT_ROOT/opencode.json" <<EOF
{
  "${DOLLAR}schema": "https://opencode.ai/config.json",
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
        "resourceName": "$AZURE_RESOURCE_NAME",
        "apiKey": "$AZURE_OPENAI_API_KEY"
      },
      "models": {
        "gpt-5.4-1": {
          "id": "gpt-5.4-1",
          "name": "GPT-5.4-1 (Azure deployment, xhigh)",
          "options": {
            "reasoningEffort": "xhigh"
          }
        },
        "gpt-5.3-codex": {
          "id": "gpt-5.3-codex",
          "name": "GPT-5.3-Codex (Azure deployment, xhigh)",
          "options": {
            "reasoningEffort": "xhigh"
          }
        },
        "gpt-5.4-pro": {
          "id": "gpt-5.4-pro",
          "name": "GPT-5.4-Pro (Azure deployment, xhigh)",
          "options": {
            "reasoningEffort": "xhigh"
          }
        }
      },
      "env": ["AZURE_RESOURCE_NAME", "AZURE_OPENAI_API_KEY"]
    },
    "azure-chat": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Azure OpenAI Chat Completions",
      "options": {
        "baseURL": "https://admin-3342-resource.openai.azure.com/openai/v1",
        "apiKey": "$AZURE_OPENAI_API_KEY"
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
EOF

cat > "$OPENCODE_DIR/config.json" <<EOF
{
  "providers": {
    "azure": {
      "resourceName": "$AZURE_RESOURCE_NAME",
      "apiKey": "$AZURE_OPENAI_API_KEY",
      "deployment": "$AZURE_OPENAI_DEPLOYMENT"
    }
  },
  "defaultProvider": "azure"
}
EOF

if [[ "$SKIP_SMOKE_TESTS" != "1" ]]; then
  step "Run model smoke tests"
  (
    cd "$PROJECT_ROOT"
    opencode run "Reply with exactly: OK" -m azure/gpt-5.4-1
    opencode run "Reply with exactly: OK" -m azure/gpt-5.3-codex
    opencode run "Reply with exactly: OK" -m azure/gpt-5.4-pro
    opencode run "Reply with exactly: OK" -m azure-chat/Kimi-K2.6
  )
fi

step "Done"
echo "Use one of these commands in project root:"
echo "  opencode -m azure/gpt-5.4-1"
echo "  opencode -m azure/gpt-5.3-codex"
echo "  opencode -m azure/gpt-5.4-pro"
echo "  opencode -m azure-chat/Kimi-K2.6"
echo "VS Code tip: open this folder in VS Code, open the integrated terminal, and run: opencode"
echo "The OpenCode VS Code extension installs automatically the first time you do that."
echo "Open a new terminal to load vars from $SHELL_RC"
