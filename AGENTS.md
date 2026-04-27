# AGENTS.md

## Scope
- This is a single Next.js 16.2.4 App Router app. If you change framework behavior, check the local Next docs in `node_modules/next/dist/docs/`; do not assume older Next.js behavior.
- App/runtime code is in `app/` and `lib/`. `setup/` holds installer templates. `external-skills/`, `opencode.json`, and `.opencode/` are local OpenCode installer outputs and are gitignored; ignore them unless the task is about installer payloads or local agent setup.
- Broad searches should usually skip `external-skills/` and `.opencode/`; they add a lot of noise and can break repo-wide verification.

## Commands
- Install deps with `npm install`.
- Dev server: `npm run dev`
- Full checks: `npm run lint`, `npx tsc --noEmit`, `npm run build`
- Focused app lint: `npx eslint app lib`
- Root `package.json` only defines `dev`, `build`, `start`, and `lint`; there is no repo test script or dedicated typecheck script.

## Runtime Config
- `/` loads stored config in `app/page.tsx` and passes a sanitized subset into the large client wizard in `app/home-client.tsx`.
- `/admin` persists config through the server action in `app/admin/actions.ts`; there is no admin API route.
- `lib/config-store.ts` is the source of truth for installer settings. It auto-creates a single Neon table named `app_config`; there are no migrations.
- `NEXT_PUBLIC_SITE_URL` drives generated install URLs. If `DATABASE_URL` is unset, config falls back to `.opencode/portal-config.json` on the current machine, using `NEXT_PUBLIC_AZURE_RESOURCE_NAME` and `NEXT_PUBLIC_DEFAULT_DEPLOYMENT` as defaults.
- `ADMIN_PASSWORD` gates saves. `CONFIG_ENCRYPTION_KEY` is required to encrypt/decrypt stored `azureApiKey` values.

## Installer Flow
- `setup/**` are templates. `/api/install/*` serves request-time rewritten scripts via `app/api/install/lib.ts` for resource name, default deployment, and optional API key injection.
- `/api/download/windows` returns a `setup-opencode.cmd` launcher that fetches `/api/install/windows` and forces `-PromptProjectRoot`.
- `/api/download/linux` and `/api/download/macos` currently return raw files from `setup/**` with no runtime rewriting. If you change installer defaults or injected config, update both the templates and the download/install paths intentionally.
- `setup/macos/setup-opencode.sh` delegates to `../linux/setup-opencode.sh`; macOS behavior lives in the Linux script.
- `includeApiKeyInInstaller` intentionally makes the stored key retrievable from the public install endpoint. Treat changes to that flag and its copy as security-sensitive.

## UI Notes
- The public setup flow in `app/home-client.tsx` is Arabic RTL (`dir="rtl"`). `/admin` and `/dev` are English LTR. Preserve that split when editing copy or layout.
- `opencode.json` and `.opencode/config.json` can contain live Azure credentials in local worktrees. Never quote or commit secret values from them.
