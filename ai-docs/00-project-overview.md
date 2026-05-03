# 00 - Project Overview

## What AIPilot is

AIPilot is a Tunisia-focused access layer for premium AI coding tools.

The business promise is:
- real OpenAI / Azure-based coding tooling
- accessible from Tunisia
- local payment logic and WhatsApp conversion
- setup help so non-expert users can start quickly

## Main product surfaces

### 1. Public portal

Built in Next.js App Router.

Responsibilities:
- explain the offer
- collect requests / funnel leads
- let users choose OS and environment
- send users toward trial or installation flows
- provide manual setup guides

Main routes:
- `/`
- `/funnel`
- `/tuto`
- `/tuto-mac`
- `/tuto-linux`

### 2. Admin

The backoffice used by the operator.

Responsibilities:
- save Azure and support configuration
- manage install-time configuration
- manage subscription licenses
- process access requests
- manage the lead -> trial -> paid pipeline

Main route:
- `/admin`

### 3. AIPilot Manager

Electron desktop app in `manager-app/`.

Responsibilities:
- connect the user's license
- fetch manager session config from the server
- install / configure / repair supported tools
- write local config files
- diagnose the machine
- open the selected tool

### 4. Server-side lifecycle + config APIs

Responsibilities:
- store global config
- validate licenses
- create leads
- create inactive trials
- convert to paid
- support manager bootstrap

## Supported coding tools

Current AIPilot positioning supports:
- Codex App
- VS Code + Codex
- T3 Code
- OpenCode

The exact runtime behavior differs by OS and by tool support reality.

## Core design rule

There are two audiences:

- end users:
  - want simple setup
  - should not see raw Azure complexity unless necessary
- admins / maintainers:
  - need full lifecycle visibility and operational control

## Product language

The project mixes:
- French for product and user-facing copy
- occasional Tunisian Arabic phrasing in funnel and WhatsApp contexts
- English for code, APIs, and technical implementation

## Source directories that matter most

- `app/` -> web app pages and route handlers
- `lib/` -> server/business logic
- `manager-app/` -> Electron app
- `setup/` -> install script templates
- `public/` -> funnel and UI assets

## What not to confuse

- `license_keys`:
  install / product access keys
- `licenses`:
  lifecycle records for lead/trial/paid pipeline
- `trial_leads`:
  funnel submissions, including historical records
- `clients`:
  current lifecycle pipeline entities used by admin and conversion logic
