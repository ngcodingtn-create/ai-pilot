# AIPilot AI Docs

This folder is the canonical AI handoff for the AIPilot project.

It is meant for:
- future Codex / Claude / GPT agents
- developers joining the project
- operations / growth work that touches the funnel, admin, licenses, or desktop manager

Use this folder before making product, infra, funnel, admin, or installer changes.

## Recommended reading order

1. [00-project-overview.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/00-project-overview.md)
2. [01-web-portal-and-funnel.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/01-web-portal-and-funnel.md)
3. [02-admin-and-operations.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/02-admin-and-operations.md)
4. [03-lead-trial-paid-pipeline.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/03-lead-trial-paid-pipeline.md)
5. [04-desktop-manager.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/04-desktop-manager.md)
6. [05-data-config-and-production.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/05-data-config-and-production.md)
7. [06-routes-and-source-map.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/06-routes-and-source-map.md)
8. [07-facebook-ads-and-growth.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/07-facebook-ads-and-growth.md)
9. [08-working-configs-and-tool-behavior.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/08-working-configs-and-tool-behavior.md)
10. [09-operator-playbook.md](C:/Users/ngcadmin/Desktop/ai-pilot/ai-docs/09-operator-playbook.md)

## High-level truth

AIPilot is now made of 4 big parts:

- a public web portal and funnel built with Next.js
- an admin backoffice for config, licenses, requests, and lead pipeline
- a server-side lifecycle system for leads, trials, paid conversions, and license validation
- an Electron desktop app (`AIPilot Manager`) that installs, configures, repairs, and launches the supported AI coding tools

## Important conventions

- The portal and funnel are the acquisition layer.
- The admin is the control plane.
- The license tables and pipeline tables are not the same thing; both matter.
- The manager is the runtime installer / repair tool.
- WhatsApp is a core conversion surface, not a side detail.
- Azure complexity should stay hidden from end users whenever possible.

## Current product intent

User journey:

1. user discovers AIPilot from ads or organic pages
2. user fills the funnel or asks for access
3. admin or automation creates a trial or paid license
4. user downloads AIPilot Manager or uses manual setup docs
5. user runs Codex, VS Code + Codex, T3 Code, or OpenCode

## What this folder should answer

Any future developer or agent should be able to answer these questions from `ai-docs/` alone:

- What is AIPilot as a business and as a product?
- Which parts of the system are public portal, admin, lifecycle pipeline, and desktop manager?
- What is already implemented versus still intentionally manual?
- How does the lead -> trial -> paid flow work right now?
- Which config format is known-good for Codex App, VS Code Codex, T3 Code, and OpenCode?
- How does the funnel talk to WhatsApp, Meta tracking, and the database?
- What is the current production shape of the database and what must not be broken?
- What should an operator do day to day in the admin?

## Current implementation status

The repo is no longer only an installer MVP. It now includes:

- a public portal at `/`
- a funnel at `/funnel`
- manual guides at `/tuto`, `/tuto-mac`, and `/tuto-linux`
- an admin backoffice with `dashboard`, `subscriptions`, `requests`, and `pipeline`
- lifecycle tables for `clients`, `licenses`, and `fb_events`
- install/product key tables in `license_keys`
- an Electron desktop app in `manager-app/`
- Meta / Facebook CAPI server logic
- Vercel cron for trial expiry

## Important reality checks

- The lifecycle pipeline and the install-license system are separate on purpose.
- Funnel leads currently create **inactive trials by default**.
- Paid conversion is the moment where the user gets an active paid lifecycle record and an active install/product key.
- The manager is the place where configuration is applied and repaired; the web app converts and explains.
- The current verified production database state can change; the docs note it only as a snapshot, never as a rule.

## Notes for future agents

- Do not assume local fallback JSON is the source of truth if `DATABASE_URL` exists.
- Do not assume every "license" is paid.
- Do not assume every lead already exists in `clients`; legacy `trial_leads` are synchronized into the lifecycle pipeline.
- Do not expose raw Azure concepts in public-facing UX unless the user explicitly needs manual setup help.
