import { getStoredConfig } from "@/lib/config-store";
import { saveAdminConfig } from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [config, params] = await Promise.all([getStoredConfig(), searchParams]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Installer configuration
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Save Azure settings server-side. These values are stored in Neon on the
          server only. The API key is encrypted before storage.
        </p>
        {params.saved === "1" ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Settings saved.
          </p>
        ) : null}
      </section>

      <form action={saveAdminConfig} className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field
          label="Azure resource name"
          name="azureResourceName"
          defaultValue={config.azureResourceName}
        />
        <Field
          label="Default deployment"
          name="azureDefaultDeployment"
          defaultValue={config.azureDefaultDeployment}
        />
        <Field
          label="Azure API key"
          name="azureApiKey"
          defaultValue=""
          placeholder="Paste a new key to replace the stored one"
          type="password"
        />
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            className="mt-1"
            type="checkbox"
            name="includeApiKeyInInstaller"
            defaultChecked={config.includeApiKeyInInstaller}
          />
          <span>
            Include the stored API key in generated installer scripts.
            <span className="mt-1 block text-xs text-amber-700">
              Warning: enabling this makes the key retrievable by anyone who can reach the install endpoint.
            </span>
          </span>
        </label>
        <Field
          label="Admin password"
          name="adminPassword"
          defaultValue=""
          placeholder="Required to save"
          type="password"
        />
        <button className="rounded-xl border border-sky-200 bg-sky-100 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-50" type="submit">
          Save settings
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-900">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type ?? "text"}
      />
    </label>
  );
}
