"use client";

import { useEffect, useState } from "react";

export type HomeConfig = {
  azureResourceName: string;
  azureDefaultDeployment: string;
  includeApiKeyInInstaller: boolean;
  siteUrl: string;
};

type OsKey = "windows" | "linux" | "macos";

const STORAGE_KEY = "ai-pilot-home-state";

export default function HomeClient({ config }: { config: HomeConfig }) {
  const [selectedOs, setSelectedOs] = useState<OsKey>("windows");
  const [currentStep, setCurrentStep] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const options = getOsOptions(config.siteUrl);
  const current = options[selectedOs];

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.requestAnimationFrame(() => {
        setIsReady(true);
      });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { selectedOs?: OsKey; currentStep?: number };

      window.requestAnimationFrame(() => {
        if (
          parsed.selectedOs === "windows" ||
          parsed.selectedOs === "linux" ||
          parsed.selectedOs === "macos"
        ) {
          setSelectedOs(parsed.selectedOs);
        }
        if (typeof parsed.currentStep === "number") {
          setCurrentStep(Math.min(Math.max(parsed.currentStep, 1), 4));
        }
        setIsReady(true);
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.requestAnimationFrame(() => {
        setIsReady(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedOs, currentStep }),
    );
  }, [currentStep, isReady, selectedOs]);

  function completeStep(step: number) {
    setCurrentStep((prev) => Math.max(prev, Math.min(step + 1, 4)));
  }

  function goToStep(step: number) {
    setCurrentStep(step);
  }

  function resetSteps() {
    setSelectedOs("windows");
    setCurrentStep(1);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 py-8 text-right sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-sky-200 bg-linear-to-br from-sky-100 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-sky-700">AI Pilot</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          حضّر OpenCode في 4 خطوات بسيطة
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
          الصفحة هاذي معمولة للناس اللي تحب تركّب كل شيء بسهولة. اختار السيستام
          متاعك، نزّل الملف ولا استعمل الطريقة اليدوية، وبعدها افتح VS Code وابدأ.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2 text-sm">
          <Badge tone="blue">ساهلة لغير التقنيين</Badge>
          <Badge tone="emerald">تنصيب خطوة بخطوة</Badge>
          <Badge tone="violet">OpenCode + Skills جاهزين</Badge>
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <StepperItem step="1" title="اختار السيستام" state={getStepState(currentStep, 1)} />
        <StepperItem step="2" title="نزّل ولا استعمل الطريقة اليدوية" state={getStepState(currentStep, 2)} />
        <StepperItem step="3" title="افتح VS Code" state={getStepState(currentStep, 3)} />
        <StepperItem step="4" title="ابدأ الخدمة" state={getStepState(currentStep, 4)} />
      </section>

      <div className="mt-6 space-y-6">
        <StepPanel
          title="اختار السيستام متاعك"
          kicker="الخطوة 1"
          tone="blue"
          state={getStepState(currentStep, 1)}
          summary={`السيستام المختار: ${current.label}`}
          onEdit={() => goToStep(1)}
        >
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Object.values(options).map((option) => {
              const isSelected = option.key === selectedOs;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedOs(option.key)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    isSelected
                      ? "border-sky-400 bg-sky-100 shadow-md"
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
                </button>
              );
            })}
          </div>

          <StepActions>
            <DoneButton onClick={() => completeStep(1)}>تم، كمّل للخطوة اللي بعد</DoneButton>
          </StepActions>
        </StepPanel>

        <StepPanel
          title={`نزّل السكريبت متاع ${current.label}`}
          kicker="الخطوة 2"
          tone="blue"
          state={getStepState(currentStep, 2)}
          summary={`جاهز لـ ${current.label}: تحميل الملف أو استعمال الطريقة اليدوية`}
          onEdit={() => goToStep(2)}
        >
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <DownloadButton href={current.downloadHref} label={`نزّل ${current.downloadLabel}`} />
          </div>

          <details className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm leading-7 text-slate-700">
            <summary className="cursor-pointer font-semibold text-slate-900">
              الطريقة اليدوية
            </summary>
            <p className="mt-3">
              كان تحب الخدمة من غير تحميل، انسخ هالكوموند وشغّلو في التيرمينال داخل الدوسي
              متاع البروجيه.
            </p>
            <CodeBlock lines={[current.command]} />

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
          </details>

          <StepActions>
            <DoneButton onClick={() => completeStep(2)}>تمّ التنصيب، كمّل للـ VS Code</DoneButton>
          </StepActions>
        </StepPanel>

        <StepPanel
          title="افتح VS Code وكمل من غادي"
          kicker="الخطوة 3"
          tone="emerald"
          state={getStepState(currentStep, 3)}
          summary="VS Code جاهز وOpenCode يتركّب من داخل التيرمينال"
          onEdit={() => goToStep(3)}
        >
          <p className="mt-4 text-sm leading-7 text-slate-700">
            حسب دوك OpenCode للـ IDE، الإكستنشن متاع VS Code يتركّب أوتوماتيكياً
            أول مرة تشغّل <InlineCode>opencode</InlineCode> داخل التيرمينال المدموج في VS Code.
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
              اكتب <InlineCode>opencode</InlineCode>. الإكستنشن تركّب وحدها وتولي الخدمة جاهزة.
            </MiniStep>
          </div>

          <StepActions>
            <DoneButton onClick={() => completeStep(3)}>تم، OpenCode حاضر في VS Code</DoneButton>
          </StepActions>
        </StepPanel>

        <StepPanel
          title="ابدا الاستعمال"
          kicker="الخطوة 4"
          tone="amber"
          state={getStepState(currentStep, 4)}
        >
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <a
              href="/dev"
              className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200 bg-violet-100 px-4 py-3 text-sm font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-50 sm:w-auto"
            >
              افتح صفحة الديفلوبر
            </a>
            <a
              href="/admin"
              className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50 sm:w-auto"
            >
              افتح /admin
            </a>
            <button
              type="button"
              onClick={resetSteps}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
            >
              عاود من الأول
            </button>
          </div>
        </StepPanel>
      </div>
    </main>
  );
}

function getStepState(currentStep: number, step: number) {
  if (currentStep > step) return "done";
  if (currentStep === step) return "active";
  return "locked";
}

function getOsOptions(siteUrl: string) {
  return {
    windows: {
      key: "windows" as const,
      label: "ويندوز",
      tag: "الأكثر استعمالاً",
      description: "إذا تخدم على Windows، هاذا هو الاختيار اللي ننصحوا بيه في العادة.",
      command:
        `powershell -ExecutionPolicy Bypass -Command "irm ${siteUrl}/api/install/windows | iex"`,
      downloadHref: "/api/download/windows",
      downloadLabel: "ملف Windows (.ps1)",
    },
    linux: {
      key: "linux" as const,
      label: "لينكس",
      tag: "للسيرفرات والديف",
      description: "إذا تستعمل Ubuntu ولا توزيعة Linux أخرى، هاذا هو الاختيار المناسب.",
      command: `curl -fsSL ${siteUrl}/api/install/linux | bash`,
      downloadHref: "/api/download/linux",
      downloadLabel: "ملف Linux (.sh)",
    },
    macos: {
      key: "macos" as const,
      label: "ماك",
      tag: "MacBook / iMac",
      description: "إذا عندك macOS، نفس الفكرة لكن بملف مناسب للماك.",
      command: `curl -fsSL ${siteUrl}/api/install/macos | bash`,
      downloadHref: "/api/download/macos",
      downloadLabel: "ملف macOS (.sh)",
    },
  };
}

function StepperItem({
  step,
  title,
  state,
}: {
  step: string;
  title: string;
  state: "done" | "active" | "locked";
}) {
  const styles = {
    done: "border-emerald-300 bg-emerald-100 text-emerald-950",
    active: "border-sky-300 bg-sky-100 text-sky-950",
    locked: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const labels = {
    done: "مكمّلة",
    active: "توّا",
    locked: "بعد",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles[state]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">الخطوة {step}</p>
        <span className="text-[11px] font-semibold">{labels[state]}</span>
      </div>
      <p className="mt-1 text-sm font-medium">{title}</p>
    </div>
  );
}

function StepPanel({
  title,
  kicker,
  tone,
  state,
  summary,
  onEdit,
  children,
}: {
  title: string;
  kicker: string;
  tone: "blue" | "emerald" | "amber";
  state: "done" | "active" | "locked";
  summary?: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
    amber: "border-amber-200 bg-amber-50/70",
  };

  return (
    <section className={`rounded-[2rem] border p-5 shadow-sm sm:p-6 ${tones[tone]} ${state === "locked" ? "opacity-60" : ""}`}>
      <SectionTitle kicker={kicker} title={title} />
      {state === "active" ? (
        children
      ) : state === "done" ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-7 text-slate-700">
            {summary ?? "المرحلة هاذي تكمّلت."}
          </p>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
            >
              رجّع افتح الخطوة
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-600">
          كمّل الخطوة اللي قبلها باش تتفتح هالمرحلة.
        </p>
      )}
    </section>
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
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900">
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
      className="inline-flex w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50 sm:w-auto"
    >
      {label}
    </a>
  );
}

function DoneButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50 sm:w-auto"
    >
      {children}
    </button>
  );
}

function StepActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">{children}</div>;
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
