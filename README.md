This project is the AIPilot download portal MVP. It currently exposes:

- a public download flow at `https://ai-pilot-ten.vercel.app`
- OS-aware install/download endpoints for Windows, Linux, and macOS
- a public wizard that now reflects the broader AIPilot vision: OS, license key, environment choice, then download
- an admin page at `/admin` for saving Azure config and managing licenses server-side
- a developer page at `/dev` for the full technical setup details
- optional Neon-backed encrypted storage for installer configuration
- a desktop manager in `manager-app/` that can install, configure, diagnose, and repair Codex, T3 Code, and OpenCode

Important current scope: the web portal now downloads AIPilot Manager. The manager is the component that applies the environment-specific setup for Codex, T3 Code, and OpenCode.

## Local Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open `http://localhost:3000` locally, or use the deployed site:

- `https://ai-pilot-ten.vercel.app`

Main files:

- `app/page.tsx` - public download entry
- `app/home-client.tsx` - French AIPilot wizard for OS, license, environment, and download
- `app/admin/page.tsx` - admin configuration UI
- `app/api/install/*` - one-command installer endpoints
- `app/api/download/*` - downloadable scripts and packaged manager artifacts
- `app/api/manager/session` - server-side manager manifest bootstrap
- `manager-app/` - Electron-based AIPilot Manager app
- `setup/` - script templates served by the app

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Vercel Environment Variables

- `DATABASE_URL` - Neon connection string
- `CONFIG_ENCRYPTION_KEY` - used to encrypt stored API keys
- `ADMIN_PASSWORD` - required on `/admin` saves
- `NEXT_PUBLIC_SITE_URL` - set to `https://ai-pilot-ten.vercel.app`
- `NEXT_PUBLIC_AZURE_RESOURCE_NAME` - optional default resource name
- `NEXT_PUBLIC_DEFAULT_DEPLOYMENT` - optional default deployment
- `MANAGER_UPDATE_URL` - optional release feed URL for Electron auto-updates

If `DATABASE_URL` is configured, `/admin` stores installer settings in Neon.
If not, the app falls back to `.opencode/portal-config.json` locally, seeded by env/default values.

## Install Commands

These commands download AIPilot Manager for the current platform:

Windows:

```powershell
powershell -ExecutionPolicy Bypass -Command "$file = Join-Path $env:TEMP 'setup-aipilot-manager.cmd'; Invoke-WebRequest -UseBasicParsing https://ai-pilot-ten.vercel.app/api/download/manager/windows -OutFile $file; Start-Process $file"
```

Linux:

```bash
curl -fsSL https://ai-pilot-ten.vercel.app/api/download/manager/linux | bash
```

macOS:

```bash
curl -fsSL https://ai-pilot-ten.vercel.app/api/download/manager/macos | bash
```

## Manager Packaging

Build commands from `manager-app/`:

```bash
npm run dist:win
npm run dist:linux
npm run dist:mac
```

The repo also includes a GitHub Actions workflow at `.github/workflows/build-aipilot-manager.yml` to build native artifacts on Windows, Ubuntu, and macOS runners.

If you want Electron auto-updates in production, configure `MANAGER_UPDATE_URL` or set the same value from `/admin` in the "URL des mises à jour du manager" field.

The public install flow can either:

- prompt the user for the Azure API key
- or inject the stored key if enabled in `/admin`
