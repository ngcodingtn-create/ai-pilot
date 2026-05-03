# 04 - Desktop Manager

## Purpose

`AIPilot Manager` is the desktop runtime layer.

It exists so users do not need to:
- manually understand Azure
- manually edit config files
- manually repair broken installs
- guess how Codex / T3 / OpenCode should be configured

Main folder:
- [C:\Users\ngcadmin\Desktop\ai-pilot\manager-app](C:\Users\ngcadmin\Desktop\ai-pilot\manager-app)

## Main responsibilities

- connect a license
- fetch session configuration from the server
- install runtime dependencies
- write tool config files
- repair broken setups
- run diagnostics
- launch the selected tool

## Supported tools

- Codex App
- VS Code + Codex
- T3 Code
- OpenCode

## Manager bootstrap route

The web app provides a manager manifest via:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\manager\session\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\manager\session\route.ts)

This route is the bridge between:
- server-side config and license truth
- desktop setup logic

## Tool-specific behavior

### Codex App

- manager writes minimal `config.toml`
- manager selects Azure deployment
- manager may close/reopen Codex to apply config

### VS Code + Codex

- manager supports the Codex setup path for VS Code
- manual docs also explain `auth.json` and `config.toml`

### T3 Code

- manager treats it as Codex-adjacent
- setup is tied to Codex-compatible configuration

### OpenCode

- manager writes OpenCode config and auth
- manager supports a chosen project folder
- manager launches OpenCode in that folder

## Downloads and packaging

Main download routes:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\download\manager\windows\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\download\manager\windows\route.ts)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\download\manager\macos\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\download\manager\macos\route.ts)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\download\manager\linux\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\download\manager\linux\route.ts)

## Updates

The manager supports auto-update.

Relevant config key:
- `managerUpdateUrl`

Relevant route:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\manager\update-config\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\manager\update-config\route.ts)

## Current UI direction

The manager UI has been iterated heavily and now aims for:
- beginner-friendly language
- fewer technical raw logs
- stronger configuration-focused layout
- right-side tool action panel

## Important operational rule

The manager is the "do the work for me" layer.

The web portal should explain and convert.
The manager should execute and repair.
