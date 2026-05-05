#!/usr/bin/env bash
set -euo pipefail

AZURE_RESOURCE_NAME="${AZURE_RESOURCE_NAME:-admin-3342-resource}"
AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY:-}"
AZURE_OPENAI_DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT:-gpt-5.4-1}"
AIPILOT_OPENAI_BASE_URL="${AIPILOT_OPENAI_BASE_URL:-https://nextgen.azure-api.net/api/openai/v1}"
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

sync_skill_repo() {
  local url="$1"
  local target="$2"
  local tarball_url="$3"
  local temp_dir
  temp_dir="$(mktemp -d)"

  if command -v git >/dev/null 2>&1; then
    if [[ ! -d "$target/.git" ]]; then
      rm -rf "$target"
      git clone "$url" "$target"
    else
      git -C "$target" pull --ff-only
    fi
    rm -rf "$temp_dir"
    return
  fi

  echo "Git non détecté; téléchargement direct des skills."
  rm -rf "$target"
  mkdir -p "$target"
  curl -fsSL "$tarball_url" -o "$temp_dir/skills.tar.gz"
  tar -xzf "$temp_dir/skills.tar.gz" -C "$temp_dir"
  local extracted
  extracted="$(find "$temp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [[ -z "$extracted" ]]; then
    rm -rf "$temp_dir"
    echo "Impossible d'extraire les skills depuis $tarball_url" >&2
    exit 1
  fi
  cp -R "$extracted"/. "$target"/
  rm -rf "$temp_dir"
}

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
export AIPILOT_OPENAI_BASE_URL

SHELL_RC="$HOME/.bashrc"
if [[ "${SHELL:-}" == *"zsh"* ]]; then
  SHELL_RC="$HOME/.zshrc"
fi

touch "$SHELL_RC"
grep -q "AZURE_RESOURCE_NAME=$AZURE_RESOURCE_NAME" "$SHELL_RC" || echo "export AZURE_RESOURCE_NAME=$AZURE_RESOURCE_NAME" >> "$SHELL_RC"
grep -q "AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY" "$SHELL_RC" || echo "export AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY" >> "$SHELL_RC"
grep -q "AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT" "$SHELL_RC" || echo "export AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT" >> "$SHELL_RC"
grep -q "AIPILOT_OPENAI_BASE_URL=$AIPILOT_OPENAI_BASE_URL" "$SHELL_RC" || echo "export AIPILOT_OPENAI_BASE_URL=$AIPILOT_OPENAI_BASE_URL" >> "$SHELL_RC"

step "Install or update skill repositories"
mkdir -p "$EXTERNAL_SKILLS_DIR"

sync_skill_repo "https://github.com/anthropics/skills.git" "$ANTHROPIC_REPO" "https://codeload.github.com/anthropics/skills/tar.gz/refs/heads/main"
sync_skill_repo "https://github.com/alirezarezvani/claude-skills.git" "$CLAUDE_SKILLS_REPO" "https://codeload.github.com/alirezarezvani/claude-skills/tar.gz/refs/heads/main"

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
      "npm": "@ai-sdk/openai",
      "name": "AIPilot AI",
      "options": {
        "baseURL": "$AIPILOT_OPENAI_BASE_URL",
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
      "env": ["AIPILOT_OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY"]
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
  )
fi

step "Done"
echo "Use one of these commands in project root:"
echo "  opencode -m azure/gpt-5.4-1"
echo "  opencode -m azure/gpt-5.3-codex"
echo "  opencode -m azure/gpt-5.4-pro"
echo "VS Code tip: open this folder in VS Code, open the integrated terminal, and run: opencode"
echo "The OpenCode VS Code extension installs automatically the first time you do that."
echo "Open a new terminal to load vars from $SHELL_RC"
