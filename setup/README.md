# AIPilot installer templates

These templates are the script layer behind the public AIPilot portal.

Current implementation status:

- The portal UI describes a broader AIPilot flow with multiple environments.
- The scripts in `setup/` are still the concrete OpenCode installer implementation used by `/api/install/*` and `/api/download/*`.

Run one command inside the project folder you want to configure if you want the currently implemented OpenCode path.

## Windows

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://ai-pilot-ten.vercel.app/api/install/windows | iex"
```

## Linux

```bash
curl -fsSL https://ai-pilot-ten.vercel.app/api/install/linux | bash
```

## macOS

```bash
curl -fsSL https://ai-pilot-ten.vercel.app/api/install/macos | bash
```

The installer will create:

- `opencode.json`
- `.opencode/config.json`
- `external-skills/`

## Optional server-side admin config

If you deploy this app on Vercel, set these environment variables:

- `DATABASE_URL` - Neon connection string (server only)
- `CONFIG_ENCRYPTION_KEY` - used to encrypt stored API keys
- `ADMIN_PASSWORD` - password required on `/admin`
- `NEXT_PUBLIC_SITE_URL` - public site URL, e.g. `https://ai-pilot-ten.vercel.app`
- `MANAGER_UPDATE_URL` - optional Electron release feed URL

Then open `/admin` to save:

- Azure resource name
- default deployment
- Azure API key
- whether installer endpoints should include the API key automatically
- support video URL
- manager update URL

If `DATABASE_URL` is not set, local saves fall back to `.opencode/portal-config.json` on that machine.
