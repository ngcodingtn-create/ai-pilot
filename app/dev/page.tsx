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
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 py-8 text-right sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-slate-500">Dev</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
          صفحة الديفلوبر: كل التفاصيل التقنية
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-700">
          هوني تلقى الإعدادات الكل: شنوّة يتركّب، شنوّة يتحطّ في الكونفيغ، كيفاش
          يخدم VS Code، وشنوّة وضعية الـ MCP والـ admin.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-6">
          <DevPanel title="أوامر التنصيب الرسمية">
            <DevCode>{`powershell -ExecutionPolicy Bypass -Command "irm ${siteUrl}/api/install/windows | iex"`}</DevCode>
            <DevCode>{`curl -fsSL ${siteUrl}/api/install/linux | bash`}</DevCode>
            <DevCode>{`curl -fsSL ${siteUrl}/api/install/macos | bash`}</DevCode>
          </DevPanel>

          <DevPanel title="شنوّة يتركّب أوتوماتيكياً">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- OpenCode CLI كانو موش موجود</li>
              <li>- ملف <InlineCode>opencode.json</InlineCode> داخل البروجيه</li>
              <li>- ملف <InlineCode>.opencode/config.json</InlineCode></li>
              <li>- فولدر <InlineCode>external-skills</InlineCode></li>
              <li>- متغيرات Azure في السيشن الحالية وبشكل دائم</li>
              <li>- smoke tests للموديلات كان ما عطلتهمش</li>
            </ul>
          </DevPanel>

          <DevPanel title="What is already configured">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>
                - Azure resource: <InlineCode>{config.azureResourceName}</InlineCode>
              </li>
              <li>
                - Models: <InlineCode>{config.azureDefaultDeployment}</InlineCode>, <InlineCode>gpt-5.3-codex</InlineCode>, <InlineCode>gpt-5.4-pro</InlineCode>
              </li>
              <li>
                - Kimi path: <InlineCode>azure-chat/Kimi-K2.6</InlineCode>
              </li>
              <li>- Shared skills: Anthropic skills + Claude-skills library</li>
            </ul>
          </DevPanel>

          <DevPanel title="Skills اللي مربوطين في المشروع">
            <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {SKILL_GROUPS.map((group) => (
                <li key={group} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" dir="ltr">
                  ./external-skills/{group}
                </li>
              ))}
            </ul>
          </DevPanel>

          <DevPanel title="VS Code / IDE">
            <p className="text-sm leading-7 text-slate-700">
              حسب دوك OpenCode IDE، الإكستنشن متاع VS Code تتركّب وحدها أول مرة
              تشغّل <InlineCode>opencode</InlineCode> داخل الـ integrated terminal.
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              <li>- افتح البروجيه في VS Code</li>
              <li>- افتح التيرمينال من الداخل</li>
              <li>- شغّل <InlineCode>opencode</InlineCode></li>
              <li>- إذا ما ركبتش وحدها، قلّب على OpenCode في Marketplace وثبّتها يدوي</li>
              <li>- إذا تحب أوامر <InlineCode>/editor</InlineCode> و <InlineCode>/export</InlineCode> يخدمو مليح، استعمل <InlineCode>code --wait</InlineCode> كـ editor command</li>
            </ul>
          </DevPanel>
        </section>

        <aside className="space-y-6">
          <DevPanel title="Admin + Neon">
            <ul className="space-y-2 text-sm leading-7 text-slate-700">
              <li>- صفحة الإدارة موجودة في <InlineCode>/admin</InlineCode></li>
              <li>- الإعدادات تتخزّن في Neon إذا <InlineCode>DATABASE_URL</InlineCode> موجود</li>
              <li>- الـ API key يتشفر بـ <InlineCode>CONFIG_ENCRYPTION_KEY</InlineCode></li>
              <li>- الحفظ في /admin يتطلب <InlineCode>ADMIN_PASSWORD</InlineCode></li>
            </ul>
          </DevPanel>

          <DevPanel title="وضعية الـ API key">
            <p className="text-sm leading-7 text-slate-700">
              {config.includeApiKeyInInstaller
                ? "توّا التنصيب العمومي ينجم يضمّن الـ API key المخزّن. هذا يعني اللي أي واحد يوصل للـ install endpoint ينجم يخرّجو."
                : "توّا التنصيب العمومي ما يضمّنش الـ API key. المستخدم يكتبو وحدو وقت التنصيب أو يتحط من /admin إذا فعلت الخيار."}
            </p>
          </DevPanel>

          <DevPanel title="MCP وشنوّة مازال يدوي">
            <p className="text-sm leading-7 text-slate-700">
              OpenCode يدعم MCP servers، أما الـ setup الحالي متاعنا ما يركّب حتى
              MCP server أوتوماتيكياً. يعني skills جاهزين، أما MCP يلزمك تزيدو
              وحدك من بعد حسب حاجتك.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              نفس الشيء لحاجات متقدمة كيف custom tools، rules إضافية، ولا editor
              integrationات خاصة بخدمة الفريق.
            </p>
          </DevPanel>

          <DevPanel title="روابط سريعة">
            <div className="flex flex-wrap justify-end gap-3 text-sm">
              <DevLink href="/">الرجوع للصفحة الرئيسية</DevLink>
              <DevLink href="/admin">فتح /admin</DevLink>
              <DevLink href="https://opencode.ai/docs/ide/">دوك VS Code</DevLink>
            </div>
          </DevPanel>
        </aside>
      </div>
    </main>
  );
}

function DevPanel({
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

function DevCode({ children }: { children: string }) {
  return (
    <pre dir="ltr" className="mb-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs leading-6 text-slate-800 last:mb-0">
      <code>{children}</code>
    </pre>
  );
}

function DevLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
    </a>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}
