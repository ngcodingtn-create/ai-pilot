# 07 - Facebook Ads and Growth Plan

## Goal

The intended business loop is:

1. Meta ad or organic traffic
2. funnel visit
3. WhatsApp / lead capture
4. trial creation
5. paid conversion

This file explains both:

- the **target marketing architecture**
- and the **current implemented state in this repo**

## The 3-stage lifecycle

### Stage 1: Lead

User sees the ad and reaches the funnel.

Current funnel:

- `/funnel`

Main capture behavior:

- user submits `nom + telephone`
- lead is stored
- WhatsApp redirect opens
- lifecycle `client` is upserted
- pending inactive trial is ensured
- Meta `Lead` can be sent via CAPI

Relevant code:

- [C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\funnel-client.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\funnel-client.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\trial\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\trial\route.ts)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\leads\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\leads\route.ts)

Tables touched:

- `trial_leads`
- `clients`
- `fb_events`

### Stage 2: Trial

Trial is managed from admin, not automatically granted by the funnel.

Current rule:

- trials are created intentionally **inactive**
- this is a product safety decision for the current phase

Relevant code:

- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\trial\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\trial\route.ts)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts)
- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\client-pipeline-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\client-pipeline-store.ts)

Tables touched:

- lifecycle `licenses`
- `clients`
- install/product `license_keys`

### Stage 3: Paid

Paid conversion happens when the operator confirms payment.

Current route:

- [C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\convert\route.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\api\admin\convert\route.ts)

What it does:

- deactivates older lifecycle licenses
- creates a paid lifecycle license
- creates an active install/product key
- updates `clients.status` to `paid`
- sends Meta `Purchase`

## Browser Pixel and Conversions API

### Current server implementation

Current CAPI helper:

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts)

Supported event names in code:

- `Lead`
- `StartTrial`
- `Purchase`
- `InitiateCheckout`

Important note:

- the funnel and lifecycle docs may describe a broader browser pixel plan
- the repo today already has the **server-side CAPI foundation**
- future work can still deepen browser-side tracking if needed

### Environment variables

The relevant Meta env values are:

- `NEXT_PUBLIC_FB_PIXEL_ID`
- `FB_PIXEL_ID`
- `FB_CAPI_TOKEN`
- `FB_TEST_EVENT_CODE`

## UTM and ad attribution

The system is designed to preserve ad-level context whenever possible.

Fields that matter:

- `utm_source`
- `utm_campaign`
- `utm_medium`
- `utm_content`
- `fbclid`
- `_fbp`
- `_fbc`

Practical purpose:

- know which creative brought the lead
- know which campaign produced good trial quality
- know which acquisition path produces real paid customers

## WhatsApp as a conversion layer

WhatsApp is not a side feature. It is part of the acquisition funnel.

Current rules:

- the lead form ends in a WhatsApp conversation
- phone numbers are normalized for Tunisia
- the final message is intentionally human and conversion-oriented
- the support number comes from stored config, with a project fallback

Relevant helper:

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts)

## KPI model

Suggested KPIs:

- cost per lead
- lead -> trial rate
- trial -> paid rate
- paid customer count
- monthly recurring revenue
- funnel submit -> WhatsApp open rate
- ad creative quality by `utm_content`

## Practical launch checklist

### Tracking

- confirm Pixel envs
- confirm CAPI token env
- test `Lead`
- test `Purchase`
- verify `fb_events` rows are stored

### Funnel

- confirm `/funnel` mobile behavior
- confirm WhatsApp redirect
- confirm phone normalization
- confirm `trial_leads` insert

### Admin

- confirm `pipeline` view loads
- confirm trial creation
- confirm paid conversion
- confirm active paid install key creation

### Operations

- make sure the operator knows the current rule:
  - trial can be created but remain inactive
  - paid is the real active access state

## Strategic recommendation

The current product direction is correct for this phase:

1. keep the funnel simple
2. store clean leads
3. normalize WhatsApp aggressively
4. create pending inactive trials
5. convert manually to paid

This is safer than over-automating before the growth loop is stable.
