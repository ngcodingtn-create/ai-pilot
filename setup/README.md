# One-command OpenCode installer

Run one command inside the project folder you want to configure.

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

Then open `/admin` to save:

- Azure resource name
- default deployment
- Azure API key
- whether installer endpoints should include the API key automatically
