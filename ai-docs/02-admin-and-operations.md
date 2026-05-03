# 02 - Admin and Operations

## Admin purpose

The admin is the operational cockpit of AIPilot.

It is used to:
- save global Azure and support config
- manage licenses
- process access requests
- manage the lead -> trial -> paid pipeline
- copy keys and continue operations on WhatsApp

Main page:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\page.tsx)

Main server actions:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts)

## Admin sections

### Dashboard

Used for:
- global config
- license creation
- quick operating context

Global config includes:
- Azure resource name
- default deployment
- optional GPT-5.5 deployment
- support WhatsApp
- support email
- support video
- manager update URL
- manager tutorial links
- install behavior like `includeApiKeyInInstaller`

### Subscriptions

Used for:
- browsing install/product licenses from `license_keys`
- search and filtering
- active / disabled status changes

### Requests

Used for:
- pending access requests only
- WhatsApp-based lead intake from the portal
- generating a license for a requester
- copying or sending the generated key

### Pipeline

Used for:
- lifecycle clients
- trial creation
- paid conversion
- operational visibility on lead/trial/paid state

## Current lifecycle rules

### Trial creation

When admin creates a trial from the pipeline:
- a license is created
- it is intentionally created **inactive / disabled**
- it does not auto-activate for 24h yet

This was a deliberate current-phase decision.

Meaning:
- the trial exists
- the client is marked in pipeline
- but nothing active is granted automatically yet

### Paid conversion

When admin converts to paid:
- old lifecycle licenses are deactivated
- a new paid lifecycle license is created and active
- a new install/product key is also created through `license_keys`
- Meta `Purchase` can be sent through CAPI

## Access requests

Access requests are separate from funnel trial leads.

They come from the public request flow and are stored via:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\access-request-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\access-request-store.ts)

Admin turns them into install licenses, not directly into pipeline trials.

## WhatsApp operational flow

The admin should assume WhatsApp is central.

Why:
- leads arrive with WhatsApp numbers
- access requests depend on WhatsApp
- support and conversion continue on WhatsApp

The number normalization flow is shared in:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts)

Supported normalization behavior:
- local Tunisian numbers
- `+216`
- `00216`
- digits with spaces or separators

## Admin authentication

Admin is password-gated.

Relevant code:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\admin-auth.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\admin-auth.ts)

Important env:
- `ADMIN_PASSWORD`

## Current production operational truth

At the time this reference was written and verified:
- the production Neon database had 3 lifecycle clients
- all 3 were `paid`
- all 3 lifecycle licenses were active and paid

Do not hardcode this assumption in code. It is just the verified state at documentation time.
