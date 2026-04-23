export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-sky-700 uppercase">
          OpenCode setup
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Minimal setup guide
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          One bootstrap command per operating system. After that, OpenCode is
          ready with Azure models and shared skills.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge tone="blue">Beginner friendly</Badge>
          <Badge tone="emerald">Scripts included</Badge>
          <Badge tone="violet">Shared skills loaded</Badge>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-6">
          <Panel title="1. Run one command" tone="blue">
            <div className="mb-4 rounded-2xl border border-sky-200 bg-white/80 p-4">
              <p className="text-sm font-medium text-slate-900">
                Run this inside the project folder you want to prepare.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StepCard
                title="Windows"
                command={'powershell -ExecutionPolicy Bypass -Command "irm http://localhost:3000/api/install/windows | iex"'}
                downloadHref="/api/download/windows"
                downloadLabel="Download .ps1 instead"
                tone="blue"
              />
              <StepCard
                title="Linux"
                command="curl -fsSL http://localhost:3000/api/install/linux | bash"
                downloadHref="/api/download/linux"
                downloadLabel="Download .sh instead"
                tone="emerald"
              />
              <StepCard
                title="macOS"
                command="curl -fsSL http://localhost:3000/api/install/macos | bash"
                downloadHref="/api/download/macos"
                downloadLabel="Download .sh instead"
                tone="violet"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-7 text-slate-700">
              The installer will:
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>install OpenCode if missing</li>
                <li>ask for your Azure API key</li>
                <li>write <InlineCode>opencode.json</InlineCode> in the current project</li>
                <li>write <InlineCode>.opencode/config.json</InlineCode></li>
                <li>clone shared skills repos</li>
                <li>configure Azure models</li>
              </ul>
            </div>
          </Panel>

          <Panel title="2. Start OpenCode" tone="emerald">
            <CodeBlock
              lines={[
                "opencode -m azure/gpt-5.4-1",
                "# alternative models:",
                "opencode -m azure/gpt-5.3-codex",
                "opencode -m azure/gpt-5.4-pro",
                "opencode -m azure-chat/Kimi-K2.6",
              ]}
            />
          </Panel>

          <Panel title="3. Change model inside an open session" tone="amber">
            <CodeBlock
              lines={[
                "/models",
                "# select one of:",
                "# azure/gpt-5.4-1",
                "# azure/gpt-5.3-codex",
                "# azure/gpt-5.4-pro",
                "# azure-chat/Kimi-K2.6",
              ]}
            />
          </Panel>

          <Panel title="What is already configured" tone="slate">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>
                Azure resource: <InlineCode>admin-3342-resource</InlineCode>
              </li>
              <li>Models: GPT-5.4-1, GPT-5.3-Codex, GPT-5.4-Pro</li>
              <li>
                Kimi path: <InlineCode>azure-chat/Kimi-K2.6</InlineCode>
              </li>
              <li>Shared skills: Anthropic skills + Claude-skills library</li>
            </ul>
          </Panel>
        </section>

        <aside className="space-y-6">
          <Panel title="Quick facts" tone="slate">
            <Fact label="Default model" value="azure/gpt-5.4-1" />
            <Fact label="Kimi model" value="azure-chat/Kimi-K2.6" />
            <Fact label="Resource" value="admin-3342-resource" />
          </Panel>

          <Panel title="Why Kimi uses a different provider" tone="violet">
            <p className="text-sm leading-7 text-slate-700">
              GPT deployments work through Azure Responses API. Kimi is wired
              through Azure chat completions, so it uses
              <InlineCode>azure-chat</InlineCode>.
            </p>
          </Panel>

          <Panel title="Keep skills up to date" tone="emerald">
            <CodeBlock
              lines={[
                "cd external-skills/anthropic-skills && git pull",
                "cd ../claude-skills && git pull",
              ]}
            />
          </Panel>

          <Panel title="Downloads" tone="blue">
            <ul className="space-y-3 text-sm text-slate-700">
              <li>
                <DownloadLink href="/api/download/windows" label="Windows setup script" />
              </li>
              <li>
                <DownloadLink href="/api/download/linux" label="Linux setup script" />
              </li>
              <li>
                <DownloadLink href="/api/download/macos" label="macOS setup script" />
              </li>
            </ul>
          </Panel>

          <Panel title="Security note" tone="amber">
            <p className="text-sm leading-7 text-slate-700">
              The installer prompts for the API key and writes it into the local
              project config. For team rollout, rotate keys regularly and prefer
              managed secrets or environment variables.
            </p>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function StepCard({
  title,
  command,
  downloadHref,
  downloadLabel,
  tone,
}: {
  title: string;
  command: string;
  downloadHref: string;
  downloadLabel: string;
  tone: Tone;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
    violet: "border-violet-200 bg-violet-50/70",
    amber: "border-amber-200 bg-amber-50/70",
    slate: "border-slate-200 bg-white",
  } satisfies Record<Tone, string>;

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <CodeBlock lines={[command]} />
      <div className="mt-3">
        <DownloadLink href={downloadHref} label={downloadLabel} />
      </div>
    </article>
  );
}

function Panel({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: Tone;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
    violet: "border-violet-200 bg-violet-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    slate: "border-slate-200 bg-white",
  } satisfies Record<Tone, string>;

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type Tone = "blue" | "emerald" | "violet" | "amber" | "slate";

function Badge({
  tone,
  children,
}: {
  tone: Exclude<Tone, "slate">;
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-100 text-sky-800",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
    violet: "border-violet-200 bg-violet-100 text-violet-800",
    amber: "border-amber-200 bg-amber-100 text-amber-800",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm text-slate-900">{value}</p>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
      href={href}
    >
      {label}
    </a>
  );
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white/90 p-3 text-xs leading-6 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <code>{lines.join("\n")}</code>
    </pre>
  );
}
