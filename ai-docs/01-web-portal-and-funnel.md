# 01 - Web Portal and Funnel

## Public routes

### `/`

Main portal.

Responsibilities:
- product explanation
- access requests
- environment selection
- install / download guidance
- links to manual setup docs

Main implementation:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\home-client.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\home-client.tsx)

### `/funnel`

High-conversion landing page.

Responsibilities:
- capture trial intent
- send users to WhatsApp
- track Meta / Facebook acquisition data
- support mobile-first sales flow

Main implementation:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\funnel-client.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\funnel-client.tsx)

### Manual setup docs

- `/tuto` -> Windows
- `/tuto-mac` -> macOS
- `/tuto-linux` -> Linux

Main implementation:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\tutorial-content.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto\tutorial-content.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-mac\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-mac\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-linux\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\tuto-linux\page.tsx)

## Funnel logic

The funnel is intentionally optimized for:
- mobile-first viewing
- WhatsApp-driven conversion
- Tunisian payment trust
- product proof through real screenshots and media

It includes:
- urgency bar
- hero
- pain / solution
- model comparison
- tool explanation
- trial steps
- scarcity close
- lead form
- FAQ
- floating CTA

## Funnel data submission

The funnel submits to:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\trial\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\trial\route.ts)

That route currently:
- stores a funnel submission in `trial_leads`
- creates or updates a lifecycle `client`
- ensures a pending inactive trial exists for that client
- records a Meta CAPI `Lead` event
- returns WhatsApp redirection URLs

## WhatsApp redirection

The funnel currently opens WhatsApp using:
- an app/deep link when possible
- a web fallback when the app does not open

Key helper:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts)

Important behavior:
- target support number comes from stored config
- current default fallback is the project WhatsApp support number
- lead message now uses the lead's name and WhatsApp number, not a visible `TRIAL-...` code

## Tracking intent

The funnel is designed to support Meta tracking:
- browser-side pixel logic
- server-side CAPI logic
- UTM capture
- lead / trial / purchase attribution

Current server integration exists in:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts)

## Public assets

Funnel assets live mainly in:
- `public/funnel/`

Important subfolders:
- `public/funnel/tools/`
- `public/funnel/whatsapp-proof/`
- `public/funnel/step-*.png`

## UX rule for public pages

Public pages should:
- feel premium
- stay mobile-first
- reduce cognitive load
- use proof and screenshots
- move the user toward WhatsApp or installation

They should not:
- expose raw Azure technical details early
- rely on heavy technical explanation above the fold
