This project is a hosted OpenCode setup portal with:

- one-command installers for Windows, Linux, and macOS
- a public setup page at `https://ai-pilot-ten.vercel.app`
- an admin page at `/admin` for saving Azure config server-side
- a developer page at `/dev` for the full technical setup details
- optional Neon-backed encrypted storage for installer configuration

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

- `app/page.tsx` - public setup guide
- `app/admin/page.tsx` - admin configuration UI
- `app/api/install/*` - one-command installer endpoints
- `app/api/download/*` - downloadable scripts
- `setup/` - script templates served by the app

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Vercel Environment Variables

- `DATABASE_URL` - Neon connection string
- `CONFIG_ENCRYPTION_KEY` - used to encrypt stored API keys
- `ADMIN_PASSWORD` - required on `/admin` saves
- `NEXT_PUBLIC_SITE_URL` - set to `https://ai-pilot-ten.vercel.app`
- `NEXT_PUBLIC_AZURE_RESOURCE_NAME` - optional default resource name
- `NEXT_PUBLIC_DEFAULT_DEPLOYMENT` - optional default deployment

If `DATABASE_URL` is configured, `/admin` stores installer settings in Neon.
If not, the app falls back to env/default values.

## Install Commands

Windows:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://ai-pilot-ten.vercel.app/api/install/windows | iex"
```

Linux:

```bash
curl -fsSL https://ai-pilot-ten.vercel.app/api/install/linux | bash
```

macOS:

```bash
curl -fsSL https://ai-pilot-ten.vercel.app/api/install/macos | bash
```

The public install flow can either:

- prompt the user for the Azure API key
- or inject the stored key if enabled in `/admin`
