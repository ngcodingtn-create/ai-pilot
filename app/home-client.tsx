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
const TOTAL_STEPS = 4;

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
          setCurrentStep(Math.min(Math.max(parsed.currentStep, 1), TOTAL_STEPS));
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

  function nextStep() {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }

  function previousStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function resetSteps() {
    setSelectedOs("windows");
    setCurrentStep(1);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 py-8 text-right sm:px-6 lg:px-8">
      <header className="rounded-[2.25rem] border border-sky-200 bg-linear-to-br from-sky-100 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-sky-700">AI Pilot</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          ركّب OpenCode خطوة بخطوة ومن غير تعقيد
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
          هالصفحة معمولة للناس اللي تحب تشوف خطوة واحدة واضحة كل مرة. اختار
          السيستام، كمّل التنصيب، وبعدها استعمل OpenCode داخل VS Code ولا من
          التيرمينال.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2 text-sm">
          <Badge tone="blue">ساهلة لغير التقنيين</Badge>
          <Badge tone="emerald">يشبه Claude Code</Badge>
          <Badge tone="violet">موديلات Azure جاهزين</Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <QuickFact
            title="كيفاش يخدم؟"
            text="مساعد برمجة كيما Claude Code، أما هنا محضّر بإعداداتك وموديلاتك من الأول."
          />
          <QuickFact
            title="شنوّة الموديلات؟"
            text={`${config.azureDefaultDeployment} هو الافتراضي، ومعاه GPT-5.3-Codex و GPT-5.4-Pro و Kimi.`}
          />
          <QuickFact
            title="شنوّة يتثبت؟"
            text="OpenCode CLI، ملفات الكونفيغ، Azure setup، والـ skills المشتركة." 
          />
        </div>
      </header>

        <section className="mt-6 grid grid-cols-2 gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4 sm:p-5">
          <StepperItem step="1" title="اختار السيستام" state={getStepState(currentStep, 1)} />
          <StepperItem step="2" title="نزّل ملف التنصيب" state={getStepState(currentStep, 2)} />
          <StepperItem step="3" title="افتح VS Code" state={getStepState(currentStep, 3)} />
          <StepperItem step="4" title="ابدأ الخدمة" state={getStepState(currentStep, 4)} />
        </section>

      <section className="mt-6 overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-slate-50/90 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                الخطوة {currentStep} من {TOTAL_STEPS}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-4xl">
                {getWizardTitle(currentStep, current.label)}
              </h2>
              <p className="mt-3 text-sm leading-8 text-slate-700 sm:text-base">
                {getWizardDescription(currentStep, current.label)}
              </p>
            </div>

            <div className="inline-flex items-center gap-3 self-start rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-900">
                {currentStep}
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-500">التقدّم</p>
                <p className="text-sm font-semibold text-slate-900">
                  {Math.round((currentStep / TOTAL_STEPS) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-4">
            {currentStep === 1 ? (
              <>
                <NoticeCard
                  tone="blue"
                  title="اختار سيستام واحد"
                  text="كانك موش متأكد، خليك على ويندوز. تنجم ديما ترجع وتبدّل قبل ما تكمل."
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.values(options).map((option) => {
                    const isSelected = option.key === selectedOs;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectedOs(option.key)}
                        className={`group rounded-[1.75rem] border p-5 text-right transition ${
                          isSelected
                            ? "border-sky-400 bg-sky-100 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                                isSelected
                                  ? "border-sky-200 bg-white/90"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <OsLogo os={option.key} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold tracking-wide text-slate-500">
                                سيستام
                              </p>
                              <h3 className="mt-2 text-xl font-bold text-slate-950">
                                {option.label}
                              </h3>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isSelected
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isSelected ? "مختار" : option.tag}
                          </span>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-slate-600">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-950">
                    شنوّة باش تلقى بعد هالخطوة؟
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                    <li>- رابط تحميل واضح للسيستام اللي اخترتو</li>
                    <li>- خطوات مبسّطة باش تكمل التنصيب من غير تعقيد</li>
                    <li>- شرح مبسّط باش تستعمل OpenCode داخل VS Code</li>
                  </ul>
                </div>
              </>
            ) : null}

            {currentStep === 2 ? (
              <>
                <NoticeCard
                  tone="emerald"
                  title={`جاهز لـ ${current.label}`}
                  text={current.key === "windows"
                    ? "في ويندوز، الملف يتهبط بصيغة .cmd. أول ما تضغط عليه، يطلب منك تختار الدوسي الصحيح: اختار نفس الدوسي اللي إنت خدام عليه وتوا محلولو في VS Code."
                    : "المرحلة هاذي مخصصة للتنزيل فقط: نزّل ملف التنصيب المناسب للسيستام متاعك وكمل الخطوات اللي تظهرلك."}
                />

                <div className="flex flex-col gap-3 sm:flex-row-reverse sm:flex-wrap">
                  <DownloadButton
                    href={current.downloadHref}
                    label={`نزّل ${current.downloadLabel}`}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <InfoPanel title="طريقة التحميل" tone="slate">
                    {current.key === "windows" ? (
                      <ol className="space-y-2 text-sm leading-7 text-slate-700">
                        <li>1. نزّل ملف <InlineCode>setup-opencode.cmd</InlineCode></li>
                        <li>2. بعد ما يتهبط، اضغط عليه مرتين مباشرة</li>
                        <li>3. كي تطلعلك نافذة اختيار الدوسي، اختار نفس الدوسي اللي فاتحو في VS Code</li>
                        <li>4. مثال: إذا إنت خدام على <InlineCode>D:\services web</InlineCode> اختار نفس هذاك الدوسي</li>
                        <li>5. من بعد PowerShell يتحل وحدو ويثبت الكونفيغ داخل هذاك الدوسي</li>
                      </ol>
                    ) : (
                      <ol className="space-y-2 text-sm leading-7 text-slate-700">
                        <li>1. نزّل الملف على جهازك</li>
                        <li>2. افتح الملف من الدوسي اللي تهبّط فيه</li>
                        <li>3. كمّل الخطوات اللي تظهرلك على الشاشة</li>
                      </ol>
                    )}
                  </InfoPanel>

                  <InfoPanel title="شنوّة يصير وقت التنصيب؟" tone="slate">
                    <ul className="space-y-2 text-sm leading-7 text-slate-700">
                      <li>- يركّب OpenCode كانو موش موجود</li>
                      <li>
                        - {config.includeApiKeyInInstaller
                          ? "الـ API key يتزاد وحدو من الإعدادات اللي خزّنتهم"
                          : "إذا يلزم، باش يطلب منك الـ API key مرة وحدة"}
                      </li>
                      <li>- يخلق ملفات الإعدادات داخل البروجيه</li>
                      <li>- يهبّط الـ skills المشتركة ويحضّر الموديلات</li>
                    </ul>
                  </InfoPanel>
                </div>

                {current.key === "windows" ? (
                  <InfoPanel title="مهم برشة" tone="blue">
                    <p className="text-sm leading-7 text-slate-700">
                      كان تختار الدوسي الغالط، <InlineCode>opencode.json</InlineCode> باش يتركب
                      في بلاصة أخرى وما يبانش في البروجيه متاعك داخل VS Code. ديما اختار
                      نفس الدوسي اللي عندك مفتوح في VS Code قبل ما تكمل.
                    </p>
                  </InfoPanel>
                ) : null}

              </>
            ) : null}

            {currentStep === 3 ? (
              <>
                <NoticeCard
                  tone="violet"
                  title="ركّب OpenCode داخل VS Code"
                  text="هوني نمشيو بالطريقة الأسهل لغير التقنيين: افتح Extensions داخل VS Code، ركّب OpenCode، وبعدها اضغط عليه من الشريط الجانبي اليمين باش يتحل." 
                />

                <InfoPanel title="الخطوات داخل VS Code" tone="slate">
                  <ol className="space-y-2 text-sm leading-7 text-slate-700">
                    <li>1. افتح البروجيه متاعك في VS Code</li>
                    <li>2. من الشريط الجانبي افتح <InlineCode>Extensions</InlineCode></li>
                    <li>3. قلّب على <InlineCode>OpenCode</InlineCode></li>
                    <li>4. اضغط <InlineCode>Install</InlineCode></li>
                    <li>5. بعد التركيب، اضغط على <InlineCode>OpenCode</InlineCode> من الشريط الجانبي اليمين</li>
                  </ol>
                </InfoPanel>

                <div className="flex flex-col gap-3 sm:flex-row-reverse sm:flex-wrap">
                  <LinkButton
                    href="https://marketplace.visualstudio.com/search?term=OpenCode&target=VSCode&category=All%20categories&sortBy=Relevance"
                    label="حل VS Code Marketplace"
                    tone="blue"
                    external
                  />
                </div>

                <InfoPanel title="صور توضيحية" tone="blue">
                  <div className="space-y-4">
                    <PlaceholderImageCard
                      title="صورة 1"
                      caption="مكان تبويب Extensions والبحث على OpenCode داخل VS Code"
                      imageUrl="https://h3w8n96m79.ufs.sh/f/bDIUcwVinDBcqH6UZSR14hLjiKrP5ZAQWYgfMOlFpnqcvebu"
                    />
                    <PlaceholderImageCard
                      title="صورة 2"
                      caption="بعد التركيب: مكان OpenCode في الشريط الجانبي اليمين"
                      imageUrl="https://h3w8n96m79.ufs.sh/f/bDIUcwVinDBcz13n6lEGBUJOp3jVPsrL27kvaNdRhZgtSAxH"
                    />
                  </div>
                </InfoPanel>
              </>
            ) : null}

            {currentStep === 4 ? (
              <>
                <NoticeCard
                  tone="amber"
                  title="أنت حاضر توّا"
                  text="إذا وصلت لهنا، هذا يعني اللي التركيب خدم. توّا المطلوب منك كان تفتح OpenCode وتبدأ الخدمة من داخل VS Code."
                />

                <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4">
                  <ul className="space-y-2 text-sm leading-7 text-slate-700">
                    <li>- افتح OpenCode من داخل VS Code</li>
                    <li>- إذا الشاشة ظهرتلك كيما الصور اللي تحت، معناها كل شيء خدم</li>
                    <li>- إذا حبيت تبدّل الموديل بعد، تنجم تعمل هذا من داخل OpenCode</li>
                  </ul>
                </div>

                <InfoPanel title="صور توضيحية" tone="blue">
                  <div className="space-y-4">
                    <PlaceholderImageCard
                      title="صورة 1"
                      caption="مكان التيرمينال داخل VS Code وقت تكتب أمر التشغيل"
                      imageUrl="https://h3w8n96m79.ufs.sh/f/bDIUcwVinDBcm9qnm43dOEJYeU4QvfR3mCMFcG8twSqi50Pr"
                    />
                    <PlaceholderImageCard
                      title="صورة 2"
                      caption="شكل OpenCode بعد ما يتحل وتبدأ تختار الموديل أو تبدأ الشات"
                      imageUrl="https://h3w8n96m79.ufs.sh/f/bDIUcwVinDBc7i6wj8AownFXT9WCO2qURusS03xfPGBIvhZH"
                    />
                  </div>
                </InfoPanel>

                <div className="flex flex-col gap-3 sm:flex-row-reverse sm:flex-wrap">
                  <LinkButton href="/dev" label="حل صفحة الديفلوبر" tone="violet" />
                  <LinkButton href="/admin" label="حل /admin" tone="emerald" />
                </div>
              </>
            ) : null}
          </div>

        </div>

        <div className="border-t border-slate-200 bg-slate-50/80 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              {currentStep < TOTAL_STEPS ? (
                <PrimaryButton onClick={nextStep}>{getNextLabel(currentStep)}</PrimaryButton>
              ) : (
                <PrimaryButton onClick={resetSteps}>عاود من الأول</PrimaryButton>
              )}

              {currentStep > 1 ? (
                <SecondaryButton onClick={previousStep}>ارجع للخطوة اللي قبل</SecondaryButton>
              ) : null}
            </div>

            <p className="text-sm leading-7 text-slate-600">
              {currentStep < TOTAL_STEPS
                ? "كل مرة كمّل خطوة واحدة فقط، والصفحة تبدّل وحدها للمرحلة اللي بعدها."
                : "إذا كل شيء خدم، افتح التيرمينال واكتب opencode وابدأ الخدمة."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function getStepState(currentStep: number, step: number) {
  if (currentStep > step) return "done";
  if (currentStep === step) return "active";
  return "locked";
}

function getWizardTitle(currentStep: number, selectedLabel: string) {
  if (currentStep === 1) return "اختار السيستام متاعك";
  if (currentStep === 2) return `نزّل السكريبت متاع ${selectedLabel}`;
  if (currentStep === 3) return "ركّب الإكستنشن داخل VS Code";
  return "ابدا الاستعمال";
}

function getWizardDescription(currentStep: number, selectedLabel: string) {
  if (currentStep === 1) {
    return "بداية سهلة: اختار السيستام اللي تخدم عليه. من بعدك الصفحة تبدّل وحدها وتوريك الخطوة الجاية فقط.";
  }

  if (currentStep === 2) {
    return `توّا بعد ما اخترت ${selectedLabel}، عندك زر تنزيل واضح وخطوات بسيطة باش تكمل التركيب من الملف اللي باش يتهبط.`;
  }

  if (currentStep === 3) {
    return "في هالمرحلة باش تركّب إكستنشن OpenCode من داخل VS Code، وبعدها تفتحو من الشريط الجانبي اليمين وتولي الخدمة جاهزة.";
  }

  return "آخر خطوة: شغّل OpenCode بالموديل اللي تحب عليه الخدمة وابدأ مباشرة. إذا حبيت، تنجم تبدّل الموديل من داخل OpenCode.";
}

function getNextLabel(currentStep: number) {
  if (currentStep === 1) return "التالي: التنصيب";
  if (currentStep === 2) return "التالي: VS Code";
  if (currentStep === 3) return "التالي: ابدأ الخدمة";
  return "عاود من الأول";
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
      downloadLabel: "ملف Windows (.cmd)",
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

function QuickFact({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function OsLogo({ os }: { os: OsKey }) {
  if (os === "windows") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-sky-600" fill="currentColor" aria-hidden="true">
        <path d="M3 4.5 10.4 3v8.2H3V4.5Zm8.6-1.7L21 1v10.2h-9.4V2.8ZM3 12.8h7.4V21L3 19.6v-6.8Zm8.6 0H21V23l-9.4-1.8v-8.4Z" />
      </svg>
    );
  }

  if (os === "linux") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <circle cx="12" cy="7" r="3.2" fill="#111827" />
        <ellipse cx="12" cy="13.2" rx="4.8" ry="6.1" fill="#111827" />
        <ellipse cx="10.2" cy="8.2" rx="0.7" ry="0.9" fill="#ffffff" />
        <ellipse cx="13.8" cy="8.2" rx="0.7" ry="0.9" fill="#ffffff" />
        <path d="M11 9.8h2l-.7 1.1h-.6L11 9.8Z" fill="#f59e0b" />
        <ellipse cx="9.5" cy="19.6" rx="2.1" ry="1.1" fill="#f59e0b" />
        <ellipse cx="14.5" cy="19.6" rx="2.1" ry="1.1" fill="#f59e0b" />
      </svg>
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
      ⌘
    </div>
  );
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
    <div className={`flex min-h-24 flex-col justify-between rounded-2xl border px-4 py-3 ${styles[state]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">الخطوة {step}</p>
        <span className="text-[11px] font-semibold">{labels[state]}</span>
      </div>
      <p className="mt-3 text-sm font-medium leading-6">{title}</p>
    </div>
  );
}

function NoticeCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const tones = {
    blue: "border-sky-200 bg-sky-50",
    emerald: "border-emerald-200 bg-emerald-50",
    violet: "border-violet-200 bg-violet-50",
    amber: "border-amber-200 bg-amber-50",
  };

  return (
    <div className={`rounded-[1.75rem] border p-4 ${tones[tone]}`}>
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function InfoPanel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "slate" | "blue";
  children: React.ReactNode;
}) {
  const tones = {
    slate: "border-slate-200 bg-white",
    blue: "border-sky-200 bg-sky-50/70",
  };

  return (
    <div className={`rounded-[1.75rem] border p-4 ${tones[tone]}`}>
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
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

function LinkButton({
  href,
  label,
  tone,
  external = false,
}: {
  href: string;
  label: string;
  tone: "slate" | "blue" | "emerald" | "violet";
  external?: boolean;
}) {
  const tones = {
    slate: "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
    blue: "border-sky-200 bg-sky-100 text-sky-900 hover:border-sky-300 hover:bg-sky-50",
    emerald:
      "border-emerald-200 bg-emerald-100 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50",
    violet:
      "border-violet-200 bg-violet-100 text-violet-900 hover:border-violet-300 hover:bg-violet-50",
  };

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition sm:w-auto ${tones[tone]}`}
    >
      {label}
    </a>
  );
}

function PlaceholderImageCard({
  title,
  caption,
  imageUrl,
}: {
  title: string;
  caption: string;
  imageUrl?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{imageUrl ? "Screenshot" : "Placeholder"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
      </div>
      <div className="bg-slate-100 p-4">
        {imageUrl ? (
          <div
            role="img"
            aria-label={caption}
            className="aspect-[16/9] rounded-[1.25rem] border border-slate-200 bg-white bg-cover bg-top shadow-sm"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center rounded-[1.25rem] border-2 border-dashed border-slate-300 bg-white text-center text-sm font-semibold text-slate-500">
            ضع screenshot هنا
          </div>
        )}
        <p className="mt-3 text-sm leading-7 text-slate-600">{caption}</p>
      </div>
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

function PrimaryButton({
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

function SecondaryButton({
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
      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
    >
      {children}
    </button>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900">
      {children}
    </code>
  );
}
