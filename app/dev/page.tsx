import { getStoredConfig } from "@/lib/config-store";
import { normalizeSiteUrl } from "@/lib/site-url";

const SKILL_GROUPS = [
  "anthropic-skills/skills",
  "claude-skills/engineering-team",
  "claude-skills/engineering",
  "claude-skills/product-team",
  "claude-skills/marketing-skill",
  "claude-skills/project-management",
  "claude-skills/ra-qm-team",
  "claude-skills/c-level-advisor",
  "claude-skills/business-growth",
  "claude-skills/finance",
];

export default async function DevPage() {
  const config = await getStoredConfig();
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app",
  );

  return (
    <main dir="ltr" className="mx-auto w-full max-w-6xl px-4 py-8 text-left sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-3">
          <NavLink href="/">Retour au portail</NavLink>
          <NavLink href="/admin">Ouvrir l’admin</NavLink>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Notes techniques</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
          Détails techniques de l’installation
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-700">
          Cette page explique l’implémentation actuelle de l’installateur, les
          déploiements Azure qu’il relie, ce que le parcours OpenCode télécharge
          aujourd’hui, et où la vision produit AIPilot va plus loin que les scripts
          déjà livrés.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-6">
          <Panel title="Périmètre actuel du MVP">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- La page publique présente maintenant le vrai parcours AIPilot: OS, clé de licence, environnement, puis téléchargement</li>
              <li>- Les routes d’installation réellement branchées dans ce repo provisionnent encore uniquement le parcours OpenCode</li>
              <li>- Codex et T3 Code sont déjà visibles dans l’UI comme options roadmap, mais ne sont pas encore câblés côté installateur</li>
            </ul>
          </Panel>

          <Panel title="Commandes d’installation">
            <CodeBlock>{`powershell -ExecutionPolicy Bypass -Command "irm ${siteUrl}/api/install/windows | iex"`}</CodeBlock>
            <CodeBlock>{`curl -fsSL ${siteUrl}/api/install/linux | bash`}</CodeBlock>
            <CodeBlock>{`curl -fsSL ${siteUrl}/api/install/macos | bash`}</CodeBlock>
          </Panel>

          <Panel title="Ce que l’installateur télécharge et configure">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- Installe OpenCode CLI s’il n’est pas déjà disponible</li>
              <li>- Crée <InlineCode>opencode.json</InlineCode> dans le projet courant</li>
              <li>- Crée <InlineCode>.opencode/config.json</InlineCode></li>
              <li>- Clone les bibliothèques de skills partagées dans <InlineCode>external-skills/</InlineCode></li>
              <li>- Définit les variables d’environnement Azure pour la session en cours et les suivantes</li>
              <li>- Lance des smoke tests de modèles sauf si on les désactive explicitement</li>
            </ul>
          </Panel>

          <Panel title="Déploiements Azure inclus">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - Ressource Azure: <InlineCode>{config.azureResourceName}</InlineCode>
              </li>
              <li>
                - Déploiement par défaut: <InlineCode>{config.azureDefaultDeployment}</InlineCode>
              </li>
              <li>
                - Déploiements additionnels: <InlineCode>gpt-5.3-codex</InlineCode> et <InlineCode>gpt-5.4-pro</InlineCode>
              </li>
              <li>
                - Niveau de raisonnement pour tous les déploiements Azure GPT: <InlineCode>xhigh</InlineCode>
              </li>
              <li>
                - Chemin Kimi: <InlineCode>azure-chat/Kimi-K2.6</InlineCode>
              </li>
            </ul>
          </Panel>

          <Panel title="Skills OpenCode inclus">
            <p className="text-sm leading-7 text-slate-700">
              L’installation récupère à la fois les skills Anthropic et la
              bibliothèque Claude-skills, puis les relie à la configuration
              générée du projet.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {SKILL_GROUPS.map((group) => (
                <li
                  key={group}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  ./external-skills/{group}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Support VS Code">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode dispose d’un support IDE. Dans VS Code, l’extension
              s’installe automatiquement la première fois que vous lancez{" "}
              <InlineCode>opencode</InlineCode> dans le terminal intégré.
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              <li>1. Ouvrez votre dossier projet dans VS Code</li>
              <li>2. Ouvrez le terminal intégré</li>
              <li>3. Lancez <InlineCode>opencode</InlineCode></li>
              <li>4. Si besoin, installez l’extension OpenCode manuellement depuis le Marketplace VS Code</li>
            </ol>
          </Panel>
        </section>

        <aside className="space-y-6">
          <Panel title="Vue d’ensemble d’OpenCode">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- OpenCode est un agent de coding IA pensé pour les workflows terminal et IDE</li>
              <li>- Il fonctionne avec plusieurs modèles et fournisseurs</li>
              <li>- Dans cette installation, il est préconfiguré pour vos déploiements Azure</li>
              <li>- La configuration projet générée pointe déjà vers la bibliothèque de skills partagés</li>
            </ul>
          </Panel>

          <Panel title="Budget de tokens">
            <p className="text-sm leading-7 text-slate-700">
              L’expérience AIPilot évolue vers des plans par palier, mais
              l’implémentation actuelle n’applique pas encore de budget de tokens
              par licence directement dans ces routes d’installation. Cette partie
              doit encore être gérée hors de ce repo ou ajoutée dans une phase
              backend ultérieure.
            </p>
          </Panel>

          <Panel title="MCP et intégrations avancées">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode supporte les serveurs MCP et les intégrations avancées,
              mais cet installateur n’installe pas automatiquement de serveurs MCP
              personnalisés. Il prépare surtout le socle OpenCode, les modèles
              Azure et les skills partagés.
            </p>
          </Panel>

          <Panel title="Liens rapides">
            <div className="flex flex-wrap gap-3 text-sm">
              <NavLink href="/">Retour au portail</NavLink>
              <NavLink href="/admin">Admin</NavLink>
              <NavLink href="https://opencode.ai/docs/ide/">Docs IDE OpenCode</NavLink>
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mb-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 last:mb-0">
      <code>{children}</code>
    </pre>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}
