# AIPilot — Notes de configuration

## Bugs Connus et Solutions

### ✅ Bug #7 — invalid_payload — RÉSOLU — Mauvais Endpoint

**Symptôme :**

```json
{
  "error": {
    "code": "invalid_payload",
    "message": "The provided data does not match the expected schema"
  }
}
```

**Cause :**

Azure AI Foundry affiche deux types d'endpoints sur la page d'aperçu du projet.
Par défaut il montre l'endpoint Foundry qui est cassé avec Codex.

**Endpoint cassé (onglet Microsoft Foundry) ❌ :**

```toml
base_url = "https://NOM-resource.services.ai.azure.com/api/projects/NOM/openai/v1"
```

**Endpoint correct (onglet Azure OpenAI) ✅ :**

```toml
base_url = "https://NOM-resource.openai.azure.com/openai/v1"
```

**Règle simple :**

```text
services.ai.azure.com  -> ❌ CASSÉ
openai.azure.com       -> ✅ CORRECT
```

**Où trouver le bon endpoint dans Azure Portal :**

```text
portal.azure.com -> AI Foundry -> Votre projet
↓
Page d'aperçu du projet (Project Overview)
↓
Section Libraries
↓
Cliquer sur l'onglet : "Azure OpenAI"
(PAS "Microsoft Foundry" qui est l'onglet par défaut)
↓
Copier l'URL affichée ✅
Format : https://NOM-resource.openai.azure.com/
```

**Exemple concret (cas réel AIPilot) :**

```text
❌ Avant (cassé) :
base_url = "https://admin-3342-resource.services.ai.azure.com/api/projects/admin-3342/openai/v1"

✅ Après (correct) :
base_url = "https://admin-3342-resource.openai.azure.com/openai/v1"
```

**Statut :** ✅ Fix confirmé et testé — résout complètement le bug `invalid_payload`

## Configuration Confirmée qui Fonctionne

### ✅ Config Codex Windows — Confirmée et Validée

```toml
model = "gpt-5.4-1"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "https://NOM-resource.openai.azure.com/openai/v1"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"
query_params = { api-version = "2025-04-01-preview" }

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

⚠️ Toujours utiliser `openai.azure.com` et jamais `services.ai.azure.com`
