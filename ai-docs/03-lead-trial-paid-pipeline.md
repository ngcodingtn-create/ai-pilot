# 03 - Lead, Trial, Paid Pipeline

## Goal

The pipeline is the business lifecycle layer:

1. Lead
2. Trial
3. Paid

It exists alongside the install-license system.

## Why there are multiple tables

This project has two parallel concerns:

### A. Lifecycle and marketing tracking

Tables:
- `clients`
- `licenses`
- `fb_events`
- `trial_leads`

### B. Product / install access keys

Table:
- `license_keys`

This split is intentional, even if it is slightly more complex.

## Core lifecycle file

Main lifecycle implementation:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\client-pipeline-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\client-pipeline-store.ts)

It handles:
- table creation
- lead upsert
- legacy lead synchronization
- lifecycle license activation / deactivation
- trial creation
- paid conversion
- expiry logic
- fb event persistence

## How lead creation works now

Lead entrypoint:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\leads\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\leads\route.ts)

Funnel entrypoint:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\trial\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\trial\route.ts)

The funnel route currently does all of this:
- stores a row in `trial_leads`
- normalizes WhatsApp
- upserts a `clients` row
- ensures there is a **pending inactive trial**
- records a CAPI `Lead`
- returns WhatsApp redirect info

## Important current rule: inactive trials

Right now, when the system creates a trial during funnel/admin flow:
- it is created as a lifecycle trial
- but it is intentionally **inactive**
- this means "prepared but not live"

The user explicitly requested this current behavior:
- for now, when the trial is not active, do nothing else
- just mark it inactive

This applies to:
- admin trial creation
- automatic funnel pending trial creation

## Trial creation behavior

Entry points:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\trial\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\trial\route.ts)
- admin server action in [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts)

Behavior:
- deactivate previous lifecycle licenses
- create a new trial install/product key via `createLicense(...)`
- create a lifecycle `licenses` row
- update `clients` row to `trial`
- keep the actual trial inactive

## Paid conversion behavior

Entry points:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\convert\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\convert\route.ts)
- admin server action in [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts)

Behavior:
- deactivate older lifecycle licenses
- create a new active paid lifecycle license
- create a new active install/product key
- update `clients.status` to `paid`
- send Meta `Purchase`

## Legacy lead synchronization

One important fix was added:
- historical `trial_leads` are synchronized into `clients`
- phone matching is tolerant for Tunisian number formats
- old and new records can match by full normalized number or last 8 digits

Why this matters:
- production and local counts can drift otherwise
- admin pipeline would miss older funnel leads

## License validation

Product/install key validation routes:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\licenses\validate\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\licenses\validate\route.ts)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\license\validate\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\license\validate\route.ts)

The second route is an alias for compatibility.

## Trial expiry

Expiry route:
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\cron\expire-trials\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\cron\expire-trials\route.ts)

Scheduler:
- [C:\Users\ngcadmin\Desktop\ai-pilot\vercel.json](C:\Users\ngcadmin\Desktop\ai-pilot\vercel.json)

Current schedule:
- hourly

## Meta / Facebook event flow

Supported events in code:
- `Lead`
- `StartTrial`
- `Purchase`
- `InitiateCheckout` as a modelled concept

Server utility:
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts)

Note:
- the business plan may talk about browser pixel and richer CAPI wiring
- current implementation focuses on the server-side path already present
