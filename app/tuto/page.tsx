const codexConfig = `model = "gpt-5.4-1"
model_provider = "azure"
model_reasoning_effort = "medium"
profile = "azure-medium"

[model_providers.azure]
name = "Azure Openai"
base_url = "https://admin-3342-resource.openai.azure.com/openai/v1"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"

[profiles.azure-medium]
model_provider = "azure"
model = "gpt-5.4-1"
model_reasoning_effort = "medium"

[profiles.azure-medium.windows]
sandbox = "elevated"

[profiles.azure-high]
model_provider = "azure"
model = "gpt-5.4-1"
model_reasoning_effort = "high"

[profiles.azure-xhigh]
model_provider = "azure"
model = "gpt-5.4-1"
model_reasoning_effort = "xhigh"

[windows]
sandbox = "elevated"`;

const opencodeConfig = `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "azure": {
      "npm": "@ai-sdk/azure",
      "options": {
        "baseURL": "https://admin-3342-resource.openai.azure.com/openai/deployments"
      },
      "models": {
        "gpt-5.4-1": {},
        "gpt-5.5-1": {}
      }
    }
  }
}`;

const opencodeAuth = `{
  "azure": {
    "type": "api",
    "key": "VOTRE_CLE_AZURE"
  }
}`;

export default function TutoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] px-4 py-8 text-left sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            AIPilot
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Guide manuel complet pour Codex, T3 Code et OpenCode
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-slate-700 sm:text-base">
            Cette page explique comment installer et vérifier manuellement chaque outil si vous voulez repartir de zéro, comprendre ce que fait AIPilot Manager, ou dépanner une machine où la configuration automatique n’a pas encore été appliquée.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FactCard title="Vidéo pas à pas" text="Regardez d’abord la vidéo de démarrage AIPilot pour le parcours visuel complet." />
            <FactCard title="Codex & T3 Code" text="Reposent sur la configuration Codex Azure et sur la variable AZURE_OPENAI_API_KEY." />
            <FactCard title="OpenCode" text="Utilise sa propre configuration JSON et un fichier d’authentification Azure séparé." />
            <FactCard title="Point critique" text="Toujours utiliser openai.azure.com et le nom exact du déploiement Azure." />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Ordre recommandé" eyebrow="Étapes">
            <ol className="space-y-3 text-sm leading-7 text-slate-700">
              <li>1. Installez l’application desktop voulue: Codex ou T3 Code. Pour OpenCode, le CLI suffit.</li>
              <li>2. Installez Node.js si vous voulez que les CLI et réparations npm fonctionnent proprement.</li>
              <li>3. Définissez la variable <InlineCode>AZURE_OPENAI_API_KEY</InlineCode>.</li>
              <li>4. Écrivez la configuration Azure correspondante.</li>
              <li>5. Vérifiez que le déploiement Azure est exact, par exemple <InlineCode>gpt-5.4-1</InlineCode> ou <InlineCode>gpt-5.5-1</InlineCode>.</li>
              <li>6. En cas de doute, revenez dans AIPilot Manager puis cliquez sur <InlineCode>Réparer</InlineCode>.</li>
            </ol>
          </Panel>

          <Panel title="Liens utiles" eyebrow="Raccourcis">
            <div className="space-y-3 text-sm">
              <LinkRow href="https://youtu.be/WwDvzdM9YWw" label="Vidéo officielle AIPilot pas à pas" />
              <LinkRow href="https://developers.openai.com/codex/app" label="Télécharger Codex" />
              <LinkRow href="https://t3.codes/" label="Télécharger T3 Code" />
              <LinkRow href="https://opencode.ai/install" label="Installer OpenCode CLI" />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Codex" eyebrow="Configuration manuelle">
            <p className="text-sm leading-7 text-slate-700">
              Codex a besoin de l’application desktop officielle, du CLI Codex, puis de la configuration Azure dans <InlineCode>~/.codex/config.toml</InlineCode>.
            </p>
            <Checklist
              items={[
                "Installez l’app Codex officielle.",
                "Installez le CLI avec npm: npm install -g @openai/codex@latest.",
                "Définissez AZURE_OPENAI_API_KEY au niveau utilisateur, et si possible aussi au niveau machine sur Windows.",
                "Écrivez la configuration TOML ci-dessous.",
                "Ouvrez Codex, cliquez sur Enter API key, puis revenez dans AIPilot Manager pour Connecter et Installer.",
              ]}
            />
            <Subhead>Configuration Codex validée</Subhead>
            <CodeBlock>{codexConfig}</CodeBlock>
            <Subhead>Windows PowerShell</Subhead>
            <CodeBlock>{`[Environment]::SetEnvironmentVariable("AZURE_OPENAI_API_KEY", "VOTRE_CLE_AZURE", "User")`}</CodeBlock>
          </Panel>

          <Panel title="T3 Code" eyebrow="Configuration manuelle">
            <p className="text-sm leading-7 text-slate-700">
              T3 Code utilise le provider Codex. Donc la partie Azure passe d’abord par la même configuration Codex que ci-dessus, puis T3 Code doit voir le bon modèle Azure.
            </p>
            <Checklist
              items={[
                "Installez T3 Code depuis t3.codes.",
                "Assurez-vous que Codex CLI fonctionne localement avec npm.",
                "Gardez la même variable AZURE_OPENAI_API_KEY et le même ~/.codex/config.toml.",
                "Dans T3 Code, choisissez le modèle Azure ajouté par AIPilot, par exemple gpt-5.4-1 ou gpt-5.5-1.",
                "Si T3 plante au démarrage du provider Codex, revenez dans AIPilot Manager puis cliquez sur Réparer pour réécrire codexBinaryPath et la config T3.",
              ]}
            />
            <Subhead>Vérifications à faire</Subhead>
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>Le déploiement Azure doit exister réellement dans Azure AI Foundry.</li>
              <li>Le nom du déploiement doit être exact: <InlineCode>gpt-5.4-1</InlineCode> ou <InlineCode>gpt-5.5-1</InlineCode>.</li>
              <li>Le provider doit bien utiliser <InlineCode>https://admin-3342-resource.openai.azure.com/openai/v1</InlineCode>.</li>
            </ul>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="OpenCode" eyebrow="Configuration manuelle">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode fonctionne avec son propre fichier global et un fichier d’authentification Azure. AIPilot peut tout écrire pour vous, mais voici la version manuelle.
            </p>
            <Checklist
              items={[
                "Installez OpenCode CLI.",
                "Créez ~/.config/opencode/opencode.json.",
                "Créez ~/.local/share/opencode/auth.json.",
                "Lancez la commande opencode depuis votre terminal.",
              ]}
            />
            <Subhead>Configuration globale</Subhead>
            <CodeBlock>{opencodeConfig}</CodeBlock>
            <Subhead>Authentification Azure</Subhead>
            <CodeBlock>{opencodeAuth}</CodeBlock>
          </Panel>

          <Panel title="Checklist de vérification" eyebrow="Contrôles">
            <ul className="space-y-3 text-sm leading-7 text-slate-700">
              <li>Le site Azure doit être <InlineCode>openai.azure.com</InlineCode>, jamais <InlineCode>services.ai.azure.com</InlineCode>.</li>
              <li>Le modèle par défaut AIPilot est <InlineCode>gpt-5.4-1</InlineCode>.</li>
              <li>Le second déploiement disponible peut être <InlineCode>gpt-5.5-1</InlineCode>.</li>
              <li>La clé API Azure doit être valide et active.</li>
              <li>Sur Windows, redémarrer le PC après modification des variables reste recommandé.</li>
              <li>Si un outil semble prêt mais ne répond pas, ouvrez AIPilot Manager et utilisez <InlineCode>Vérifier maintenant</InlineCode> puis <InlineCode>Réparer</InlineCode>.</li>
            </ul>
          </Panel>
        </section>
      </div>
    </main>
  );
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
        <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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
