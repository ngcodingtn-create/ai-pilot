import { getStoredConfig } from "@/lib/config-store";

type SearchParams = Promise<{ os?: string }>;
type OsKey = "windows" | "linux" | "macos";

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [config, params] = await Promise.all([getStoredConfig(), searchParams]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-pilot-ten.vercel.app";
  const selectedOs = normalizeOs(params.os);
  const options = getOsOptions(siteUrl);
  const current = options[selectedOs];

  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 py-8 text-right sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-sky-200 bg-linear-to-br from-sky-100 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-sky-700">AI Pilot</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          حضّر OpenCode في 4 خطوات بسيطة
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
          الصفحة هاذي معمولة للناس اللي تحب تركّب كل شيء بسهولة. اختار السيستام
          متاعك، نزّل الملف ولا استعمل التنصيب المباشر، وبعدها افتح VS Code وابدأ.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2 text-sm">
          <Badge tone="blue">ساهلة لغير التقنيين</Badge>
          <Badge tone="emerald">تنصيب خطوة بخطوة</Badge>
          <Badge tone="violet">OpenCode + Skills جاهزين</Badge>
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <StepperItem step="1" title="اختار السيستام" active />
        <StepperItem step="2" title="نزّل وشغّل" active />
        <StepperItem step="3" title="افتح VS Code" active />
        <StepperItem step="4" title="ابدأ الخدمة" active />
      </section>

      <section className="mt-6 rounded-[2rem] border border-sky-200 bg-sky-50/70 p-5 shadow-sm sm:p-6">
        <SectionTitle kicker="الخطوة 1" title="اختار السيستام متاعك" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.values(options).map((option) => {
            const isSelected = option.key === selectedOs;

            return (
              <a
                key={option.key}
                href={`/?os=${option.key}`}
                className={`rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-slate-900 bg-white shadow-md"
                    : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {option.tag}
                  </span>
                  {isSelected ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      مختار توّا
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">
                  {option.label}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {option.description}
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <Panel tone="blue">
            <SectionTitle
              kicker="الخطوة 2"
              title={`نزّل السكريبت متاع ${current.label}`}
            />

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <DownloadButton href={current.downloadHref} label={`نزّل ${current.downloadLabel}`} />
              <a
                href={current.installHref}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                حل صفحة التنصيب المباشر
              </a>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              كان تحب الخدمة المباشرة من غير تحميل، انسخ هالكوموند وشغّلو في
              التيرمينال داخل الدوسي متاع البروجيه.
            </p>

            <CodeBlock lines={[current.command]} />

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-7 text-slate-700">
              <p className="font-semibold text-slate-900">شنوّة يصير وقت تشغّل التنصيب؟</p>
              <ul className="mt-2 space-y-2">
                <li>- يركّب OpenCode كانو موش موجود</li>
                <li>
                  - {config.includeApiKeyInInstaller
                    ? "الـ API key يتزاد وحدو من الإعدادات اللي خزّنتهم"
                    : "إذا يلزم، باش يطلب منك الـ API key مرة وحدة"}
                </li>
                <li>- يخلق ملفات الإعدادات داخل البروجيه</li>
                <li>- يهبّط الـ skills المشتركة ويحضّر الموديلات</li>
              </ul>
            </div>
          </Panel>

          <Panel tone="emerald">
            <SectionTitle kicker="الخطوة 3" title="افتح VS Code وكمل من غادي" />

            <p className="mt-4 text-sm leading-7 text-slate-700">
              حسب دوك OpenCode للـ IDE، الإكستنشن متاع VS Code يتركّب
              أوتوماتيكياً أول مرة تشغّل <InlineCode>opencode</InlineCode> داخل
              التيرمينال المدموج في VS Code.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStep number="1" title="حل الدوسي">
                افتح البروجيه متاعك في VS Code. كان عندك أمر <InlineCode>code</InlineCode>
                يخدم، استعمل <InlineCode>code .</InlineCode>.
              </MiniStep>
              <MiniStep number="2" title="حل التيرمينال">
                من داخل VS Code، افتح الـ integrated terminal.
              </MiniStep>
              <MiniStep number="3" title="شغّل OpenCode">
                اكتب <InlineCode>opencode</InlineCode>. الإكستنشن تركّب وحدها
                وتولي الخدمة جاهزة.
              </MiniStep>
            </div>
          </Panel>

          <Panel tone="amber">
            <SectionTitle kicker="الخطوة 4" title="ابدا الاستعمال" />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-900">الانطلاقة العادية</p>
                <CodeBlock lines={[`opencode -m azure/${config.azureDefaultDeployment}`]} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">إذا تحب Kimi</p>
                <CodeBlock lines={["opencode -m azure-chat/Kimi-K2.6"]} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm leading-7 text-slate-700">
              إذا تحب تبدّل الموديل بعد ما تدخل، اكتب <InlineCode>/models</InlineCode>
              واختار اللي يناسبك.
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel tone="slate">
            <SectionTitle kicker="السريع" title="شنوّة لازمك قبل ما تبدأ" />
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              <li>- إنترنت شغّال</li>
              <li>- Terminal ولا PowerShell</li>
              <li>- VS Code إذا تحب الخدمة من داخل الإيديتور</li>
              <li>- صلاحية تنصيب برامج على الجهاز</li>
            </ul>
          </Panel>

          <Panel tone="violet">
            <SectionTitle kicker="ملاحظة للديفلوبر" title="تحب التفاصيل التقنية؟" />
            <p className="mt-4 text-sm leading-7 text-slate-700">
              إذا إنت ديفلوبر وتحب تشوف الموديلات، الـ skills، الـ MCP، إعدادات
              الـ admin، وكيفاش خدام التنصيب بالضبط، امشِ لصفحة المطورين.
            </p>
            <a
              href="/dev"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              افتح صفحة الديفلوبر
            </a>
          </Panel>

          <Panel tone="slate">
            <SectionTitle kicker="إدارة" title="للأدمن فقط" />
            <p className="mt-4 text-sm leading-7 text-slate-700">
              إذا تحب تبدّل الـ resource ولا الـ API key من السيرفر، استعمل صفحة
              الإدارة.
            </p>
            <a
              href="/admin"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              افتح /admin
            </a>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function normalizeOs(value?: string): OsKey {
  if (value === "linux" || value === "macos" || value === "windows") {
    return value;
  }

  return "windows";
}

function getOsOptions(siteUrl: string) {
  return {
    windows: {
      key: "windows",
      label: "ويندوز",
      tag: "الأكثر استعمالاً",
      description: "إذا تخدم على Windows، هاذا هو الاختيار اللي ننصحوا بيه في العادة.",
      command:
        `powershell -ExecutionPolicy Bypass -Command "irm ${siteUrl}/api/install/windows | iex"`,
      installHref: `${siteUrl}/api/install/windows`,
      downloadHref: "/api/download/windows",
      downloadLabel: "ملف Windows (.ps1)",
    },
    linux: {
      key: "linux",
      label: "لينكس",
      tag: "للسيرفرات والديف",
      description: "إذا تستعمل Ubuntu ولا توزيعة Linux أخرى، هاذا هو الاختيار المناسب.",
      command: `curl -fsSL ${siteUrl}/api/install/linux | bash`,
      installHref: `${siteUrl}/api/install/linux`,
      downloadHref: "/api/download/linux",
      downloadLabel: "ملف Linux (.sh)",
    },
    macos: {
      key: "macos",
      label: "ماك",
      tag: "MacBook / iMac",
      description: "إذا عندك macOS، نفس الفكرة لكن بملف مناسب للماك.",
      command: `curl -fsSL ${siteUrl}/api/install/macos | bash`,
      installHref: `${siteUrl}/api/install/macos`,
      downloadHref: "/api/download/macos",
      downloadLabel: "ملف macOS (.sh)",
    },
  } satisfies Record<OsKey, {
    key: OsKey;
    label: string;
    tag: string;
    description: string;
    command: string;
    installHref: string;
    downloadHref: string;
    downloadLabel: string;
  }>;
}

function StepperItem({
  step,
  title,
  active,
}: {
  step: string;
  title: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        active ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <p className="text-xs font-semibold">الخطوة {step}</p>
      <p className="mt-1 text-sm font-medium">{title}</p>
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-500">{kicker}</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function Panel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber" | "slate";
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
    violet: "border-violet-200 bg-violet-50/70",
    amber: "border-amber-200 bg-amber-50/70",
    slate: "border-slate-200 bg-white",
  };

  return <section className={`rounded-[2rem] border p-5 shadow-sm sm:p-6 ${tones[tone]}`}>{children}</section>;
}

function Badge({
  tone,
  children,
}: {
  tone: "blue" | "emerald" | "violet";
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-100 text-sky-800",
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
    violet: "border-violet-200 bg-violet-100 text-violet-800",
  };

  return <span className={`rounded-full border px-3 py-1 font-medium ${tones[tone]}`}>{children}</span>;
}

function MiniStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-700">{children}</p>
    </div>
  );
}

function DownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      {label}
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

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre
      dir="ltr"
      className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs leading-6 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
    >
      <code>{lines.join("\n")}</code>
    </pre>
  );
}
