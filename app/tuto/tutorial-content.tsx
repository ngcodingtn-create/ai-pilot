type TutorialPlatform = "windows" | "macos" | "linux";

type TutorialContentProps = {
  platform: TutorialPlatform;
  azureResourceName: string;
};

const defaultDeployment = "gpt-5.4-1";
const alternativeDeployment = "gpt-5.5-1";

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
              title="Clé API via WhatsApp"
              text="La clé API Azure AIPilot et, si nécessaire, les consignes de licence vous seront envoyées sur WhatsApp par l’équipe AIPilot."
            />
            <FactCard
              title="Vidéo pas à pas"
              text="Commencez par la vidéo de démarrage AIPilot pour voir le parcours complet avant de suivre la version manuelle."
            />
            <FactCard
              title="Prompt pour une IA"
              text="Chaque page contient un prompt prêt à copier-coller dans une IA afin qu’elle applique la configuration manuellement sur la bonne machine."
            />
            <FactCard
              title="Déploiements supportés"
              text={`GPT-5.4 correspond exactement à ${defaultDeployment}. GPT-5.5 correspond exactement à ${alternativeDeployment}.`}
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

          <Panel title="Ce que vous recevez sur WhatsApp" eyebrow="AIPilot">
            <Checklist
              items={[
                "La clé API Azure à utiliser dans les fichiers de configuration.",
                "Le nom exact de la ressource Azure AIPilot.",
                "Le ou les déploiements disponibles pour votre plan.",
                "Votre clé de licence si vous passez par le portail et AIPilot Manager.",
              ]}
            />
            <Subhead>Valeurs à remplacer dans les fichiers</Subhead>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - <InlineCode>VOTRE_CLE_API_RECUE_SUR_WHATSAPP</InlineCode>
              </li>
              <li>
                - <InlineCode>{azureResourceName}</InlineCode> pour la ressource Azure
              </li>
              <li>
                - <InlineCode>GPT-5.4</InlineCode> ={" "}
                <InlineCode>{defaultDeployment}</InlineCode>
              </li>
              <li>
                - <InlineCode>GPT-5.5</InlineCode> ={" "}
                <InlineCode>{alternativeDeployment}</InlineCode>
              </li>
            </ul>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Codex App & T3 Code" eyebrow="Même base Codex">
            <p className="text-sm leading-7 text-slate-700">
              Codex App et T3 Code reposent sur le même fichier{" "}
              <InlineCode>{content.codexConfigPath}</InlineCode>. Pour changer de
              modèle, modifiez uniquement les lignes <InlineCode>model</InlineCode>{" "}
              et les profils associés, puis relancez l’application.
            </p>
            <Checklist
              items={content.codexChecklist}
            />
            <Subhead>Mapping exact des modèles</Subhead>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - <InlineCode>GPT-5.4</InlineCode> doit toujours écrire{" "}
                <InlineCode>{`model = "${defaultDeployment}"`}</InlineCode>
              </li>
              <li>
                - <InlineCode>GPT-5.5</InlineCode> doit toujours écrire{" "}
                <InlineCode>{`model = "${alternativeDeployment}"`}</InlineCode>
              </li>
            </ul>
            <Subhead>config.toml — GPT-5.4</Subhead>
            <CodeBlock>{buildCodexConfig(azureResourceName, defaultDeployment)}</CodeBlock>
            <Subhead>config.toml — GPT-5.5</Subhead>
            <CodeBlock>{buildCodexConfig(azureResourceName, alternativeDeployment)}</CodeBlock>
          </Panel>

          <Panel title="VS Code + Codex" eyebrow="Extension officielle">
            <p className="text-sm leading-7 text-slate-700">
              Codex dans VS Code réutilise la même base{" "}
              <InlineCode>{content.codexConfigPath}</InlineCode>, mais a aussi
              besoin d’un fichier <InlineCode>{content.authJsonPath}</InlineCode>{" "}
              pour l’authentification API key.
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
              OpenCode utilise son propre fichier global et un fichier
              d’authentification Azure. Si vous changez de modèle dans l’UI,
              assurez-vous que le champ racine <InlineCode>model</InlineCode>{" "}
              pointe bien vers le déploiement voulu.
            </p>
            <Checklist items={content.opencodeChecklist} />
            <Subhead>Mapping exact des modèles</Subhead>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - <InlineCode>GPT-5.4</InlineCode> ={" "}
                <InlineCode>azure/{defaultDeployment}</InlineCode>
              </li>
              <li>
                - <InlineCode>GPT-5.5</InlineCode> ={" "}
                <InlineCode>azure/{alternativeDeployment}</InlineCode>
              </li>
            </ul>
            <Subhead>{content.opencodeConfigPath}</Subhead>
            <CodeBlock>{buildOpenCodeConfig(azureResourceName)}</CodeBlock>
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
        "1. Demandez d’abord votre clé API AIPilot sur WhatsApp.",
        "2. Installez l’outil voulu: Codex App, VS Code, T3 Code ou OpenCode.",
        "3. Définissez AZURE_OPENAI_API_KEY dans votre session shell et, si nécessaire, dans vos profils.",
        "4. Écrivez les fichiers config.toml, auth.json et opencode.json indiqués ci-dessous.",
        "5. Lancez l’outil puis vérifiez qu’il utilise bien le bon déploiement Azure.",
      ],
      codexConfigPath: "~/.codex/config.toml",
      authJsonPath: "~/.codex/auth.json",
      opencodeConfigPath: "~/.config/opencode/opencode.json",
      opencodeAuthPath: "~/.local/share/opencode/auth.json",
      codexChecklist: [
        "Installez l’application Codex officielle si vous voulez Codex App.",
        "Installez le CLI Codex avec npm si vous utilisez T3 Code ou Codex dans VS Code.",
        "Ajoutez la variable AZURE_OPENAI_API_KEY dans ~/.zshrc, ~/.bashrc ou ~/.profile.",
        `Utilisez ${defaultDeployment} pour GPT-5.4, ou ${alternativeDeployment} pour GPT-5.5.`,
        "Relancez complètement Codex ou T3 Code après chaque changement de config.toml.",
      ],
      vscodeChecklist: [
        "Installez l’extension officielle Codex dans VS Code.",
        "Créez ~/.codex/auth.json avec auth_mode=apikey et la clé Azure reçue sur WhatsApp.",
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
        `La ressource Azure doit être ${azureResourceName}.`,
        "Le domaine doit être openai.azure.com pour Codex et resourceName pour OpenCode.",
        "La clé API collée dans les fichiers doit être celle reçue sur WhatsApp.",
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
        "1. Récupérez votre clé API AIPilot envoyée sur WhatsApp.",
        "2. Installez Node.js, npm, Git et les outils choisis.",
        "3. Exportez AZURE_OPENAI_API_KEY dans votre shell et vos profils.",
        "4. Écrivez les fichiers de configuration affichés ci-dessous.",
        "5. Lancez l’outil, vérifiez le modèle actif et corrigez si nécessaire.",
      ],
      codexConfigPath: "~/.codex/config.toml",
      authJsonPath: "~/.codex/auth.json",
      opencodeConfigPath: "~/.config/opencode/opencode.json",
      opencodeAuthPath: "~/.local/share/opencode/auth.json",
      codexChecklist: [
        "Sous Linux, utilisez surtout Codex CLI et VS Code Codex. Codex App n’est pas le parcours recommandé.",
        "Installez Codex CLI avec npm pour T3 Code et VS Code Codex.",
        "Exportez AZURE_OPENAI_API_KEY dans ~/.bashrc, ~/.zshrc ou ~/.profile.",
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
        `La ressource Azure doit être ${azureResourceName}.`,
        "Le modèle OpenCode doit être azure/gpt-5.4-1 pour GPT-5.4, ou azure/gpt-5.5-1 pour GPT-5.5.",
        "Le provider OpenCode doit déclarer les 3 modèles AIPilot si vous voulez aussi gpt-5.3-codex.",
        "La clé API doit être la valeur reçue sur WhatsApp.",
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
      "1. Demandez la clé API AIPilot sur WhatsApp.",
      "2. Installez l’outil voulu ou laissez l’IA le faire quand c’est possible.",
      "3. Définissez AZURE_OPENAI_API_KEY dans les variables utilisateur et, si possible, machine.",
      "4. Écrivez les fichiers config.toml, auth.json et opencode.json indiqués plus bas.",
      "5. Relancez l’outil pour vérifier que le bon déploiement Azure est pris en compte.",
    ],
    codexConfigPath: "C:\\Users\\<USER>\\.codex\\config.toml",
    authJsonPath: "C:\\Users\\<USER>\\.codex\\auth.json",
    opencodeConfigPath: "C:\\Users\\<USER>\\.config\\opencode\\opencode.json",
    opencodeAuthPath: "C:\\Users\\<USER>\\.local\\share\\opencode\\auth.json",
    codexChecklist: [
      "Installez l’application Codex officielle si vous utilisez Codex App.",
      "Installez Codex CLI avec npm si vous utilisez T3 Code ou VS Code Codex.",
      "Définissez AZURE_OPENAI_API_KEY au niveau utilisateur, puis machine si possible.",
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
      `La ressource Azure doit être ${azureResourceName}.`,
      "Le domaine Codex doit être https://<resource>.openai.azure.com/openai/v1.",
      "La clé API doit être celle reçue sur WhatsApp.",
      "OpenCode doit pointer vers model = azure/gpt-5.4-1 pour GPT-5.4, ou azure/gpt-5.5-1 pour GPT-5.5.",
      "Après changement de variables machine sur Windows, un redémarrage complet reste recommandé.",
    ],
    aiPrompt: buildAiPrompt("Windows", azureResourceName),
  };
}

function buildAiPrompt(platformLabel: string, azureResourceName: string) {
  return `Tu es une IA d'assistance technique. Configure manuellement ${platformLabel} pour AIPilot avec Azure OpenAI.

Contexte obligatoire :
- ressource Azure : ${azureResourceName}
- clé API : VOTRE_CLE_API_RECUE_SUR_WHATSAPP
- GPT-5.4 = ${defaultDeployment}
- GPT-5.5 = ${alternativeDeployment}

Ce que tu dois faire :
1. Installer ou vérifier Codex App, VS Code + Codex, T3 Code et OpenCode selon l'outil demandé.
2. Définir AZURE_OPENAI_API_KEY avec la clé reçue sur WhatsApp.
3. Écrire exactement les fichiers de configuration AIPilot montrés sur cette page.
4. Vérifier les chemins, les permissions et le modèle actif.
5. Expliquer chaque étape brièvement en français, sans exposer d'autres options inutiles.

Contraintes :
- utiliser exactement les noms de déploiement Azure donnés plus haut
- ne jamais confondre GPT-5.4 avec ${defaultDeployment}, ni GPT-5.5 avec ${alternativeDeployment}
- ne jamais remplacer le domaine Azure par services.ai.azure.com
- garder le format config.toml minimal pour Codex
- garder le format JSON validé pour OpenCode
- demander confirmation avant toute suppression ou réinitialisation`;
}

function buildCodexConfig(resourceName: string, deployment: string) {
  return `model = "${deployment}"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "AIPilot AI"
base_url = "https://${resourceName}.openai.azure.com/openai/v1"
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
model_reasoning_effort = "xhigh"`;
}

function buildCodexVsCodeAuth() {
  return `{
  "auth_mode": "apikey",
  "AZURE_OPENAI_API_KEY": "VOTRE_CLE_API_RECUE_SUR_WHATSAPP"
}`;
}

function buildOpenCodeConfig(resourceName: string) {
  return `{
  "$schema": "https://opencode.ai/config.json",
  "model": "azure/${defaultDeployment}",
  "provider": {
    "azure": {
      "options": {
        "resourceName": "${resourceName}",
        "apiKey": "VOTRE_CLE_API_RECUE_SUR_WHATSAPP"
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
      "env": ["AZURE_RESOURCE_NAME", "AZURE_OPENAI_API_KEY"]
    }
  }
}`;
}

function buildOpenCodeAuth() {
  return `{
  "azure": {
    "type": "api",
    "key": "VOTRE_CLE_API_RECUE_SUR_WHATSAPP"
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
