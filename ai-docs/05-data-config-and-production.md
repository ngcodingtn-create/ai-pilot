# 05 - Data, Config, and Production

## Main data stores

### Neon / Postgres

If `DATABASE_URL` exists, production state should be considered database-first.

Tables used by this project include:
- `app_config`
- `license_keys`
- `clients`
- `licenses`
- `fb_events`
- `trial_leads`
- `access_requests`

### Local JSON fallback

If `DATABASE_URL` is missing, some systems fall back to local JSON:
- `.opencode/portal-config.json`
- `.opencode/license-keys.json`
- `.opencode/client-pipeline.json`

This is useful for local dev but is not the production source of truth.

## Config store

Main source:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\config-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\config-store.ts)

Stored config includes:
- Azure resource name
- default deployment
- GPT-5.5 deployment
- Azure API key
- whether to include API key in installer
- support WhatsApp number
- support email
- support video URL
- manager update URL
- manager tutorial links

## Security-sensitive fields

Especially sensitive:
- `azureApiKey`
- `DATABASE_URL`
- `CONFIG_ENCRYPTION_KEY`
- `ADMIN_PASSWORD`

Rules:
- never expose secrets through `NEXT_PUBLIC_*`
- never commit local runtime secrets from `.opencode`
- treat `includeApiKeyInInstaller` as a real security-sensitive product switch

## Environment variables

Common important env values:
- `DATABASE_URL`
- `CONFIG_ENCRYPTION_KEY`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_AZURE_RESOURCE_NAME`
- `NEXT_PUBLIC_DEFAULT_DEPLOYMENT`
- `MANAGER_UPDATE_URL`

## Production notes

### Verified state at documentation time

The Neon production database was verified with:
- `clients`: 3
- `licenses`: 3
- `license_keys`: 3
- all `clients.status = 'paid'`
- all lifecycle `licenses` are active paid

This is not a code contract. It is only the verified operational state when this doc was written.

### Vercel

Production deployment is expected on Vercel.

Important:
- dynamic APIs are server-rendered
- cron is configured in `vercel.json`

### Build readiness

Standard verification commands:

```bash
npx eslint app lib
npx tsc --noEmit
npm run build
```

## Why local/prod counts can diverge

Typical reasons:
- local JSON fallback instead of Neon
- old `trial_leads` not yet synchronized into `clients`
- Tunisian WhatsApp number formatting mismatch

The project now includes tolerant phone matching and legacy lead synchronization to reduce this issue.
