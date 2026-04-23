# One-command OpenCode installer

Run one command inside the project folder you want to configure.

## Windows

```powershell
powershell -ExecutionPolicy Bypass -Command "irm http://localhost:3000/api/install/windows | iex"
```

## Linux

```bash
curl -fsSL http://localhost:3000/api/install/linux | bash
```

## macOS

```bash
curl -fsSL http://localhost:3000/api/install/macos | bash
```

The installer will create:

- `opencode.json`
- `.opencode/config.json`
- `external-skills/`
