import { getStoredConfig } from "@/lib/config-store";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app";

  return (
    <main dir="ltr" className="mx-auto w-full max-w-6xl px-4 py-8 text-left sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-3">
          <NavLink href="/">Back to setup</NavLink>
          <NavLink href="/admin">Open admin</NavLink>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Developer notes</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
          Technical setup details
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-700">
          This page explains exactly what the installer configures, which Azure
          deployments are wired, what OpenCode downloads, and how VS Code support
          works.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-6">
          <Panel title="Install commands">
            <CodeBlock>{`powershell -ExecutionPolicy Bypass -Command "irm ${siteUrl}/api/install/windows | iex"`}</CodeBlock>
            <CodeBlock>{`curl -fsSL ${siteUrl}/api/install/linux | bash`}</CodeBlock>
            <CodeBlock>{`curl -fsSL ${siteUrl}/api/install/macos | bash`}</CodeBlock>
          </Panel>

          <Panel title="What the installer downloads and configures">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- Installs the OpenCode CLI if it is not already available</li>
              <li>- Creates <InlineCode>opencode.json</InlineCode> in the current project</li>
              <li>- Creates <InlineCode>.opencode/config.json</InlineCode></li>
              <li>- Clones the shared skills repositories into <InlineCode>external-skills/</InlineCode></li>
              <li>- Sets Azure environment variables for the current session and future sessions</li>
              <li>- Runs model smoke tests unless they are explicitly skipped</li>
            </ul>
          </Panel>

          <Panel title="Azure deployments included">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - Azure resource: <InlineCode>{config.azureResourceName}</InlineCode>
              </li>
              <li>
                - Default deployment: <InlineCode>{config.azureDefaultDeployment}</InlineCode>
              </li>
              <li>
                - Additional deployments: <InlineCode>gpt-5.3-codex</InlineCode> and <InlineCode>gpt-5.4-pro</InlineCode>
              </li>
              <li>
                - Kimi path: <InlineCode>azure-chat/Kimi-K2.6</InlineCode>
              </li>
            </ul>
          </Panel>

          <Panel title="OpenCode skills included">
            <p className="text-sm leading-7 text-slate-700">
              The setup pulls both Anthropic skills and the Claude-skills library,
              then wires them into the generated project config.
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

          <Panel title="VS Code support">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode has IDE support. In VS Code, the extension installs
              automatically the first time you run <InlineCode>opencode</InlineCode>
              in the integrated terminal.
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              <li>1. Open your project folder in VS Code</li>
              <li>2. Open the integrated terminal</li>
              <li>3. Run <InlineCode>opencode</InlineCode></li>
              <li>4. If needed, install the OpenCode extension manually from the VS Code Marketplace</li>
            </ol>
          </Panel>
        </section>

        <aside className="space-y-6">
          <Panel title="OpenCode overview">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- OpenCode is an AI coding agent for terminal and IDE workflows</li>
              <li>- It works with multiple models and providers</li>
              <li>- In this setup, it is preconfigured for your Azure deployments</li>
              <li>- The generated project config already points to the shared skills library</li>
            </ul>
          </Panel>

          <Panel title="Token budget">
            <p className="text-sm leading-7 text-slate-700">
              Users should assume there is roughly <strong>around $100 of token usage</strong>
              available for this setup. Heavy usage can consume that budget faster,
              especially with larger models and long coding sessions.
            </p>
          </Panel>

          <Panel title="MCP and advanced integrations">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode supports MCP servers and advanced integrations, but this
              installer does not auto-install custom MCP servers. It prepares the
              main OpenCode setup, Azure models, and shared skills.
            </p>
          </Panel>

          <Panel title="Quick links">
            <div className="flex flex-wrap gap-3 text-sm">
              <NavLink href="/">Back to setup</NavLink>
              <NavLink href="/admin">Admin</NavLink>
              <NavLink href="https://opencode.ai/docs/ide/">OpenCode IDE docs</NavLink>
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
