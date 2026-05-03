# 08 - Working Configs and Tool Behavior

This file captures the practical "known-good" behavior for each supported tool.

It is intentionally opinionated. If a future developer tries to simplify or unify
all tool setups into one abstract config model, they should read this first.

## Supported tools

- Codex App
- VS Code + Codex
- T3 Code
- OpenCode

## Core rule

The user should **not** need to understand Azure internals.

Internally we still have to respect the fact that each tool behaves differently:

- Codex App can mutate `config.toml`
- VS Code Codex relies on Codex config plus auth state
- T3 Code is effectively Codex-adjacent
- OpenCode has its own provider/auth/config model

## Codex App

### Source of truth

Codex App is currently expected to work from:

- `C:\Users\<user>\.codex\config.toml`

### Known-good minimal config pattern

The user explicitly validated that the working Codex App config should stay minimal.

For GPT-5.4:

```toml
model = "gpt-5.4-1"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "https://admin-3342-resource.openai.azure.com/openai/v1"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"

[profiles.azure-medium]
model_provider = "azure"
model = "gpt-5.4-1"
model_reasoning_effort = "medium"

[profiles.azure-high]
model_provider = "azure"
model = "gpt-5.4-1"
model_reasoning_effort = "high"

[profiles.azure-xhigh]
model_provider = "azure"
model = "gpt-5.4-1"
model_reasoning_effort = "xhigh"
```

For GPT-5.5, the same structure is used, replacing `gpt-5.4-1` with `gpt-5.5-1`.

### Important caveat

Codex App can add extra sections on its own when it starts, such as:

- marketplace metadata
- plugin metadata
- windows-specific metadata

The manager has been adjusted around this, but anyone debugging Codex App should
remember that Codex itself may rewrite the file.

### Model selection rule

The user confirmed a critical product rule:

- do not rely on the visual model picker in Codex App for Azure deployments
- the manager should set the exact Azure deployment in `config.toml`
- then close/reopen Codex App when needed

Why:

- Azure deployment names are not always the same as public OpenAI model names
- UI-based selection can send the wrong model name and cause 404s

## VS Code + Codex

### Main files

- `C:\Users\<user>\.codex\config.toml`
- `C:\Users\<user>\.codex\auth.json`

### Why this is separate from Codex App

The project now distinguishes:

- `Codex App`
- `VS Code + Codex`

because the UX and activation path are different even though they share Codex-related config.

### Current expectation

The manager can prepare:

- the Codex config
- the VS Code-oriented auth file
- the preferred model / deployment

The product docs and guides explain that the extension path is different from Codex App,
even if the underlying Azure credentials are related.

## T3 Code

### Practical rule

T3 Code should be thought of as a Codex-adjacent interface, not as a completely separate model system.

### Implication

If Codex config is wrong, T3 Code often inherits the same failure.

Relevant manager behavior:

- configure Codex-compatible settings
- set the right tool in the manager session manifest
- keep the T3 experience simple in the UI while the actual setup remains Codex-driven

## OpenCode

### Main files

- `C:\Users\<user>\.config\opencode\opencode.json`
- `C:\Users\<user>\.local\share\opencode\auth.json`

### Current config direction

The latest validated OpenCode direction in the project is resource-name based Azure configuration,
not a manually assembled `baseURL` path.

The working shape now looks like:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "azure/gpt-5.4-1",
  "provider": {
    "azure": {
      "options": {
        "resourceName": "admin-3342-resource",
        "apiKey": "..."
      },
      "models": {
        "gpt-5.4-1": {
          "id": "gpt-5.4-1",
          "name": "GPT-5.4 (AIPilot)",
          "options": {
            "reasoningEffort": "high"
          }
        },
        "gpt-5.5-1": {
          "id": "gpt-5.5-1",
          "name": "GPT-5.5 (AIPilot)",
          "options": {
            "reasoningEffort": "high"
          }
        },
        "gpt-5.3-codex": {
          "id": "gpt-5.3-codex",
          "name": "GPT-5.3 Codex (AIPilot)",
          "options": {
            "reasoningEffort": "high"
          }
        }
      },
      "env": ["AZURE_RESOURCE_NAME", "AZURE_OPENAI_API_KEY"]
    }
  }
}
```

### Important behavior

For OpenCode, the manager must do more than just write global auth/config:

- ask for the target project folder
- write the selected model into the OpenCode config
- launch OpenCode in that folder

### Known UX rule

The selected model in the manager must be pushed back into `opencode.json`
before launch, otherwise OpenCode can keep using the last stored model.

## Model names and deployments

The project currently uses these Azure deployment names:

- `gpt-5.4-1`
- `gpt-5.5-1`
- `gpt-5.3-codex`

Product copy may say "GPT-5.4" or "GPT-5.5", but the actual config and manager
must respect the full deployment identifiers when the target tool requires them.

## Manual docs

The current manual setup references live here:

- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\tutorial-content.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\tutorial-content.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-mac\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-mac\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-linux\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-linux\page.tsx)

Any future change to tool config should be reflected both in:

- the manager runtime logic
- the manual guides

## Decision log for future maintainers

- Keep Codex App config minimal unless a new validated fix is confirmed.
- Keep the Azure deployment names explicit when needed.
- Treat OpenCode as its own system with its own model storage rules.
- Do not assume all tools can use the same config abstraction safely.
