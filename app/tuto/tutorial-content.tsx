import {
  AIPILOT_APIM_OPENAI_BASE_URL,
  AIPILOT_DEPLOYMENTS,
  AIPILOT_PRIMARY_DEPLOYMENT,
} from "@/lib/aipilot-apim-settings";

type TutorialPlatform = "windows" | "macos" | "linux";

type TutorialContentProps = {
  platform: TutorialPlatform;
  azureResourceName: string;
};

const defaultDeployment = AIPILOT_PRIMARY_DEPLOYMENT;
const alternativeDeployment = "gpt-5.5-1";
const codexDeployment = "gpt-5.3-codex";

export function TutorialContent({
  platform,
  azureResourceName,
}: TutorialContentProps) {
  const content = getPlatformContent(platform, azureResourceName);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] px-4 py-8 text-left sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            AIPilot · Guide manuel
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-slate-700 sm:text-base">
            {content.intro}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FactCard
              title="Licence d’abord"
              text="AIPilot Manager valide votre licence, puis récupère automatiquement la clé APIM individuelle liée à cette licence."
            />
            <FactCard
              title="APIM production"
              text={`Tous les outils doivent passer par ${AIPILOT_APIM_OPENAI_BASE_URL}, pas par un endpoint Azure direct ni localhost.`}
            />
            <FactCard
              title="Prompt pour une IA"
              text="Le prompt ci-dessous explique le nouveau flux APIM/licence si vous devez réparer une machine manuellement."
            />
            <FactCard
              title="Déploiements supportés"
              text={`Par défaut: ${defaultDeployment}. Premium: ${alternativeDeployment}. Codex: ${codexDeployment}.`}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Ordre recommandé" eyebrow="Étapes">
            <ol className="space-y-3 text-sm leading-7 text-slate-700">
              {content.recommendedSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Panel>

          <Panel title="Liens utiles" eyebrow="Raccourcis">
            <div className="space-y-3 text-sm">
              <LinkRow
                href="https://youtu.be/WwDvzdM9YWw"
                label="Vidéo officielle AIPilot pas à pas"
              />
              <LinkRow
                href="https://developers.openai.com/codex/app"
                label="Télécharger Codex App"
              />
              <LinkRow
                href="https://developers.openai.com/codex/ide/features"
                label="Codex dans VS Code"
              />
              <LinkRow href="https://t3.codes/" label="Télécharger T3 Code" />
              <LinkRow
                href="https://opencode.ai/install"
                label="Installer OpenCode CLI"
              />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel title="Prompt à donner à une IA" eyebrow="Copier / coller">
            <p className="text-sm leading-7 text-slate-700">
              Copiez ce prompt dans l’IA de votre choix si vous voulez qu’elle
              configure manuellement votre machine en suivant exactement les bons
              chemins, commandes et fichiers pour {content.platformLabel}.
            </p>
            <CodeBlock>{content.aiPrompt}</CodeBlock>
          </Panel>

          <Panel title="Ce que vous recevez avec AIPilot" eyebrow="AIPilot">
            <Checklist
              items={[
                "Votre clé de licence AIPilot au format XXXX-XXXX-XXXX-XXXX.",
                "Le lien ou fichier d’installation AIPilot Manager adapté à votre système.",
                "Les consignes de support si une réparation manuelle est nécessaire.",
                "La clé APIM individuelle n’est pas copiée à la main: le manager la récupère depuis le backend après validation de la licence.",
              ]}
            />
            <Subhead>Valeurs de production attendues</Subhead>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - <InlineCode>AIPILOT_LICENSE_KEY</InlineCode> = votre licence
              </li>
              <li>
                - <InlineCode>AIPILOT_OPENAI_BASE_URL</InlineCode> ={" "}
                <InlineCode>{AIPILOT_APIM_OPENAI_BASE_URL}</InlineCode>
              </li>
              <li>
                - <InlineCode>AZURE_OPENAI_DEPLOYMENT</InlineCode> ={" "}
                <InlineCode>{defaultDeployment}</InlineCode> par défaut
              </li>
              <li>
                - <InlineCode>AZURE_OPENAI_API_KEY</InlineCode> = clé APIM récupérée par AIPilot Manager
              </li>
            </ul>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Codex App & T3 Code" eyebrow="Même base Codex">
            <p className="text-sm leading-7 text-slate-700">
              Codex App et T3 Code reposent sur le même fichier{" "}
              <InlineCode>{content.codexConfigPath}</InlineCode>. En production,
              AIPilot Manager doit écrire ce fichier avec l’endpoint APIM, la clé
              APIM de la licence et <InlineCode>{'wire_api = "responses"'}</InlineCode>.
            </p>
            <Checklist
              items={content.codexChecklist}
            />
            <Subhead>Mapping exact des modèles</Subhead>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              {AIPILOT_DEPLOYMENTS.map((deployment) => (
                <li key={deployment.deployment}>
                  - <InlineCode>{deployment.label}</InlineCode> ={" "}
                  <InlineCode>{deployment.deployment}</InlineCode>
                </li>
              ))}
            </ul>
            <Subhead>config.toml — production APIM</Subhead>
            <CodeBlock>{buildCodexConfig(content, defaultDeployment)}</CodeBlock>
          </Panel>

          <Panel title="VS Code + Codex" eyebrow="Extension officielle">
            <p className="text-sm leading-7 text-slate-700">
              Codex dans VS Code réutilise le même{" "}
              <InlineCode>{content.codexConfigPath}</InlineCode>. AIPilot Manager
              écrit aussi <InlineCode>{content.authJsonPath}</InlineCode> pour que
              l’extension lise la clé APIM comme API key.
            </p>
            <Checklist items={content.vscodeChecklist} />
            <Subhead>auth.json</Subhead>
            <CodeBlock>{buildCodexVsCodeAuth()}</CodeBlock>
            <Subhead>Ouverture de VS Code</Subhead>
            <CodeBlock>{content.openVsCodeCommand}</CodeBlock>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="OpenCode" eyebrow="Configuration manuelle">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode utilise l’API APIM via le provider compatible OpenAI. Le
              fichier global et le fichier d’authentification doivent utiliser la
              même clé APIM récupérée pour la licence.
            </p>
            <Checklist items={content.opencodeChecklist} />
            <Subhead>Mapping exact des modèles</Subhead>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - <InlineCode>GPT-5.4</InlineCode> doit toujours écrire{" "}
                <InlineCode>azure/{defaultDeployment}</InlineCode>
              </li>
              <li>
                - <InlineCode>GPT-5.5</InlineCode> doit toujours écrire{" "}
                <InlineCode>azure/{alternativeDeployment}</InlineCode>
              </li>
            </ul>
            <Subhead>{content.opencodeConfigPath}</Subhead>
            <CodeBlock>{buildOpenCodeConfig()}</CodeBlock>
            <Subhead>{content.opencodeAuthPath}</Subhead>
            <CodeBlock>{buildOpenCodeAuth()}</CodeBlock>
          </Panel>

          <Panel title="Vérifications finales" eyebrow="Checklist">
            <ul className="space-y-3 text-sm leading-7 text-slate-700">
              {content.finalChecks.map((check) => (
                <li key={check}>- {check}</li>
              ))}
            </ul>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function getPlatformContent(platform: TutorialPlatform, azureResourceName: string) {
  if (platform === "macos") {
    return {
      platformLabel: "macOS",
      title: "Guide manuel AIPilot pour macOS",
      intro:
        "Ce guide explique quoi donner à une IA pour qu’elle installe, configure et vérifie manuellement Codex App, Codex dans VS Code, T3 Code et OpenCode sur un Mac Intel ou Apple Silicon.",
      recommendedSteps: [
        "1. Récupérez votre licence AIPilot, puis installez AIPilot Manager.",
        "2. Connectez la licence dans AIPilot Manager pour récupérer la clé APIM individuelle.",
        "3. Cliquez sur Réparer ou Installer/configurer pour écrire config.toml, auth.json et les variables d’environnement.",
        "4. Installez l’outil voulu: Codex App, VS Code, T3 Code ou OpenCode.",
        "5. Lancez l’outil puis vérifiez qu’il utilise bien l’endpoint APIM et le bon déploiement.",
      ],
      codexConfigPath: "~/.codex/config.toml",
      authJsonPath: "~/.codex/auth.json",
      opencodeConfigPath: "~/.config/opencode/opencode.json",
      opencodeAuthPath: "~/.local/share/opencode/auth.json",
      codexChecklist: [
        "Installez l’application Codex officielle si vous voulez Codex App.",
        "Installez le CLI Codex avec npm si vous utilisez T3 Code ou Codex dans VS Code.",
        "Laissez AIPilot Manager écrire AZURE_OPENAI_API_KEY, AIPILOT_OPENAI_BASE_URL et AZURE_OPENAI_DEPLOYMENT.",
        `Utilisez ${defaultDeployment} pour GPT-5.4, ou ${alternativeDeployment} pour GPT-5.5.`,
        "Relancez complètement Codex ou T3 Code après chaque changement de config.toml.",
      ],
      vscodeChecklist: [
        "Installez l’extension officielle Codex dans VS Code.",
        "Créez ~/.codex/auth.json avec auth_mode=apikey et la clé APIM de la licence.",
        "Gardez le même ~/.codex/config.toml que pour Codex App.",
        "Ouvrez VS Code depuis le terminal du projet pour garder la bonne session d’environnement.",
      ],
      openVsCodeCommand: "code .",
      opencodeChecklist: [
        "Installez OpenCode CLI.",
        "Créez ~/.config/opencode/opencode.json.",
        "Créez ~/.local/share/opencode/auth.json.",
        `Gardez model = "azure/${defaultDeployment}" pour GPT-5.4 puis passez à azure/${alternativeDeployment} pour GPT-5.5 si besoin.`,
      ],
      finalChecks: [
        `Le backend peut afficher la ressource historique ${azureResourceName}, mais les outils doivent appeler l’endpoint APIM.`,
        `Le base_url doit être ${AIPILOT_APIM_OPENAI_BASE_URL}.`,
        "La clé API utilisée par les outils doit être la clé APIM individuelle de la licence.",
        "Le déploiement doit être exactement gpt-5.4-1 pour GPT-5.4, ou gpt-5.5-1 pour GPT-5.5, sans faute de frappe.",
        "Si un outil démarre mal, relancez AIPilot Manager puis utilisez Réparer.",
      ],
      aiPrompt: buildAiPrompt("macOS", azureResourceName),
    };
  }

  if (platform === "linux") {
    return {
      platformLabel: "Linux",
      title: "Guide manuel AIPilot pour Linux",
      intro:
        "Ce guide permet à une IA de configurer manuellement OpenCode, T3 Code et Codex dans VS Code sur Linux, en gardant la bonne ressource Azure et les bons déploiements AIPilot.",
      recommendedSteps: [
        "1. Récupérez votre licence AIPilot et installez AIPilot Manager.",
        "2. Connectez la licence pour que le backend fournisse la clé APIM individuelle.",
        "3. Installez Node.js, npm et les outils choisis. Git n’est pas obligatoire.",
        "4. Laissez le manager écrire les variables et fichiers, ou recopiez les blocs APIM ci-dessous.",
        "5. Lancez l’outil, vérifiez le modèle actif et corrigez si nécessaire.",
      ],
      codexConfigPath: "~/.codex/config.toml",
      authJsonPath: "~/.codex/auth.json",
      opencodeConfigPath: "~/.config/opencode/opencode.json",
      opencodeAuthPath: "~/.local/share/opencode/auth.json",
      codexChecklist: [
        "Sous Linux, utilisez surtout Codex CLI et VS Code Codex. Codex App n’est pas le parcours recommandé.",
        "Installez Codex CLI avec npm pour T3 Code et VS Code Codex.",
        "Exportez AZURE_OPENAI_API_KEY, AIPILOT_OPENAI_BASE_URL et AZURE_OPENAI_DEPLOYMENT si vous réparez sans manager.",
        `Commencez avec ${defaultDeployment} pour GPT-5.4, puis passez à ${alternativeDeployment} pour GPT-5.5 si besoin.`,
        "Relancez complètement l’outil après chaque changement de config.toml.",
      ],
      vscodeChecklist: [
        "Installez VS Code ou un fork compatible.",
        "Ajoutez l’extension officielle Codex.",
        "Créez ~/.codex/auth.json avec auth_mode=apikey.",
        "Ouvrez le projet avec code . depuis le terminal.",
      ],
      openVsCodeCommand: "code .",
      opencodeChecklist: [
        "Installez OpenCode CLI.",
        "Créez ~/.config/opencode/opencode.json.",
        "Créez ~/.local/share/opencode/auth.json.",
        "Lancez OpenCode dans le dossier projet voulu pour écrire la config locale si nécessaire.",
      ],
      finalChecks: [
        `Le backend peut afficher la ressource historique ${azureResourceName}, mais la configuration outil doit utiliser APIM.`,
        `Le base_url doit être ${AIPILOT_APIM_OPENAI_BASE_URL}.`,
        "Le modèle OpenCode doit être azure/gpt-5.4-1 pour GPT-5.4, ou azure/gpt-5.5-1 pour GPT-5.5.",
        "Le provider OpenCode doit déclarer les 3 modèles AIPilot si vous voulez aussi gpt-5.3-codex.",
        "La clé API doit être la clé APIM individuelle de la licence.",
        "Si vous changez le modèle, redémarrez l’outil ou repassez par AIPilot Manager.",
      ],
      aiPrompt: buildAiPrompt("Linux", azureResourceName),
    };
  }

  return {
    platformLabel: "Windows",
    title: "Guide manuel AIPilot pour Windows",
    intro:
      "Ce guide sert de référence complète pour donner à une IA toutes les étapes Windows afin qu’elle configure manuellement Codex App, Codex dans VS Code, T3 Code et OpenCode avec Azure AIPilot.",
    recommendedSteps: [
      "1. Collez la licence dans AIPilot Manager.",
      "2. Le manager valide la licence et récupère automatiquement la clé APIM liée au client.",
      "3. Cliquez sur Réparer tout pour réécrire config.toml, auth.json et les variables utilisateur Windows.",
      "4. Installez ou ouvrez Codex App, VS Code + Codex, T3 Code ou OpenCode.",
      "5. Relancez l’outil pour vérifier que l’endpoint APIM et le bon déploiement sont pris en compte.",
    ],
    codexConfigPath: "C:\\Users\\<USER>\\.codex\\config.toml",
    authJsonPath: "C:\\Users\\<USER>\\.codex\\auth.json",
    opencodeConfigPath: "C:\\Users\\<USER>\\.config\\opencode\\opencode.json",
    opencodeAuthPath: "C:\\Users\\<USER>\\.local\\share\\opencode\\auth.json",
    codexChecklist: [
      "Installez l’application Codex officielle si vous utilisez Codex App.",
      "Installez Codex CLI avec npm si vous utilisez T3 Code ou VS Code Codex.",
      "Laissez AIPilot Manager définir AZURE_OPENAI_API_KEY, AIPILOT_OPENAI_BASE_URL et AZURE_OPENAI_DEPLOYMENT au niveau utilisateur.",
      `Utilisez ${defaultDeployment} pour GPT-5.4. Passez à ${alternativeDeployment} si vous voulez GPT-5.5.`,
      "Relancez complètement Codex ou T3 Code après modification de config.toml.",
    ],
    vscodeChecklist: [
      "Installez Visual Studio Code.",
      "Ajoutez l’extension officielle Codex.",
      "Créez C:\\Users\\<USER>\\.codex\\auth.json avec auth_mode=apikey.",
      "Ouvrez le projet avec code . depuis PowerShell si possible.",
    ],
    openVsCodeCommand: "code .",
    opencodeChecklist: [
      "Installez OpenCode CLI.",
      "Créez C:\\Users\\<USER>\\.config\\opencode\\opencode.json.",
      "Créez C:\\Users\\<USER>\\.local\\share\\opencode\\auth.json.",
      `Gardez model = "azure/${defaultDeployment}" pour GPT-5.4 puis passez à azure/${alternativeDeployment} pour GPT-5.5 si besoin.`,
    ],
    finalChecks: [
      `Le backend peut afficher la ressource historique ${azureResourceName}, mais Codex doit utiliser l’endpoint APIM.`,
      `Le domaine Codex doit être ${AIPILOT_APIM_OPENAI_BASE_URL}.`,
      "La clé API doit être la clé APIM individuelle récupérée après validation de licence.",
      "OpenCode doit pointer vers model = azure/gpt-5.4-1 pour GPT-5.4, ou azure/gpt-5.5-1 pour GPT-5.5.",
      "Après changement de variables machine sur Windows, un redémarrage complet reste recommandé.",
    ],
    aiPrompt: buildAiPrompt("Windows", azureResourceName),
  };
}

function buildAiPrompt(platformLabel: string, azureResourceName: string) {
  return `Tu es une IA d'assistance technique. Configure manuellement ${platformLabel} pour AIPilot avec APIM Azure OpenAI.

Contexte obligatoire :
- licence AIPilot : AIPILOT_LICENSE_KEY
- endpoint APIM : ${AIPILOT_APIM_OPENAI_BASE_URL}
- clé API : CLE_APIM_INDIVIDUELLE_RECUPEREE_PAR_AIPILOT_MANAGER
- ressource historique affichée par le portail : ${azureResourceName}
- GPT-5.4 = ${defaultDeployment}
- GPT-5.5 = ${alternativeDeployment}

Ce que tu dois faire :
1. Installer ou vérifier Codex App, VS Code + Codex, T3 Code et OpenCode selon l'outil demandé.
2. Valider la licence dans AIPilot Manager pour obtenir la clé APIM individuelle.
3. Définir AZURE_OPENAI_API_KEY, AIPILOT_OPENAI_BASE_URL et AZURE_OPENAI_DEPLOYMENT avec les valeurs APIM.
4. Écrire exactement les fichiers de configuration AIPilot montrés sur cette page.
5. Vérifier les chemins, les permissions et le modèle actif.
6. Expliquer chaque étape brièvement en français, sans exposer d'autres options inutiles.

Contraintes :
- utiliser exactement les noms de déploiement Azure donnés plus haut
- ne jamais confondre GPT-5.4 avec ${defaultDeployment}, ni GPT-5.5 avec ${alternativeDeployment}
- ne jamais remplacer l’endpoint APIM par services.ai.azure.com ni par un endpoint openai.azure.com direct
- ne jamais utiliser localhost en production
- garder le format config.toml minimal pour Codex
- garder le format JSON validé pour OpenCode
- demander confirmation avant toute suppression ou réinitialisation`;
}

function buildCodexConfig(
  content: ReturnType<typeof getPlatformContent>,
  deployment: string,
) {
  const windowsTrust =
    content.platformLabel === "Windows"
      ? `
[profiles.azure-medium.windows]
sandbox = "elevated"

[windows]
sandbox = "elevated"

[projects.'c:\\users\\<USER>\\.codex']
trust_level = "trusted"

[projects.'c:\\']
trust_level = "trusted"`
      : "";

  return `model = "${deployment}"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "${AIPILOT_APIM_OPENAI_BASE_URL}"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"

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
model_reasoning_effort = "xhigh"${windowsTrust}`;
}

function buildCodexVsCodeAuth() {
  return `{
  "auth_mode": "apikey",
  "AZURE_OPENAI_API_KEY": "CLE_APIM_INDIVIDUELLE_RECUPEREE_PAR_AIPILOT_MANAGER"
}`;
}

function buildOpenCodeConfig() {
  return `{
  "$schema": "https://opencode.ai/config.json",
  "model": "azure/${defaultDeployment}",
  "provider": {
    "azure": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "AIPilot AI",
      "options": {
        "baseURL": "${AIPILOT_APIM_OPENAI_BASE_URL}",
        "apiKey": "CLE_APIM_INDIVIDUELLE_RECUPEREE_PAR_AIPILOT_MANAGER"
      },
      "models": {
        "${defaultDeployment}": {
          "id": "${defaultDeployment}",
          "name": "GPT-5.4 (AIPilot)",
          "options": {
            "reasoningEffort": "high"
          }
        },
        "${alternativeDeployment}": {
          "id": "${alternativeDeployment}",
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
      "env": ["AIPILOT_OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY"]
    }
  }
}`;
}

function buildOpenCodeAuth() {
  return `{
  "azure": {
    "type": "api",
    "key": "CLE_APIM_INDIVIDUELLE_RECUPEREE_PAR_AIPILOT_MANAGER"
  }
}`;
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FactCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 text-base font-semibold text-slate-950">{children}</h3>;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-[13px] leading-6 text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
    >
      <span>{label}</span>
      <span className="text-sky-700">Ouvrir</span>
    </a>
  );
}
