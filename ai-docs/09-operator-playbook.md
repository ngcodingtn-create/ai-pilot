# 09 - Operator Playbook

This is the practical operating guide for someone running AIPilot day to day.

It is intentionally high-level and operational, not code-first.

## 1. Daily mental model

AIPilot has four operational layers:

1. Acquisition
   - the funnel
   - the public portal
   - WhatsApp

2. Control
   - `/admin`

3. Lifecycle
   - `clients`
   - lifecycle `licenses`
   - `fb_events`

4. Product access
   - install/product `license_keys`
   - AIPilot Manager
   - manual docs

If an operator understands those four layers, the rest of the project becomes much easier to reason about.

## 2. Daily admin workflow

### A. Check requests

Go to:

- `/admin?section=requests`

Use it to:

- review pending WhatsApp access requests
- see normalized phone numbers
- generate a key when needed
- continue the conversation on WhatsApp

### B. Check subscriptions

Go to:

- `/admin?section=subscriptions`

Use it to:

- search by client, email, or key
- suspend or reactivate install/product keys
- check whether a client is on a global Azure key or a dedicated one

### C. Check pipeline

Go to:

- `/admin?section=pipeline`

Use it to:

- see lifecycle clients
- turn `lead` into `trial`
- turn `trial` into `paid`
- understand which stage each contact is in

## 3. Lead -> trial -> paid operator flow

### Lead

The user comes in through:

- `/funnel`
- or the access request flow on `/`

What happens:

- lead is stored
- phone is normalized
- Meta lead tracking can be recorded
- WhatsApp conversation starts

### Trial

When you decide to give the person a trial:

- create the trial from admin pipeline
- understand that it is currently created **inactive**
- the project intentionally does not auto-activate trials yet

This means:

- the record exists
- the lifecycle stage changes
- but active product access is not automatically opened

### Paid

When the person pays:

- convert to paid from the pipeline
- this creates the paid lifecycle record
- and also creates the active install/product key

## 4. What the operator should say to the client

The real customer conversation is usually:

1. user arrives from the funnel
2. user opens WhatsApp
3. operator confirms the need
4. operator grants trial or paid access
5. user installs AIPilot Manager or follows the manual docs

Important:

- keep Azure invisible in the conversation
- talk in terms of:
  - trial
  - access
  - installation
  - support
  - tool choice

## 5. Which route to send to which user

### Funnel-first users

Send:

- `/funnel`

Use when:

- the user is cold traffic
- coming from Meta ads
- needs a high-conversion path

### Portal users

Send:

- `/`

Use when:

- the user already understands AIPilot
- already has a key
- needs download + setup guidance

### Manual setup users

Send:

- `/tuto` for Windows
- `/tuto-mac` for macOS
- `/tuto-linux` for Linux

Use when:

- the user wants to configure things manually
- an AI assistant will help them
- the desktop manager is not the preferred route

## 6. AIPilot Manager expectations

The operator should think of the manager as:

- the safest user path
- the repair path
- the runtime setup path

If a user is confused technically, the correct answer is usually:

- send them to AIPilot Manager first
- keep the manual docs as a fallback

## 7. Production expectations

### Vercel

Production deploys live on Vercel.

Be careful with:

- env vars
- cron configuration
- public URLs
- browser-side funnel behavior

### Neon / database

Production should be treated as database-first.

Do not assume local JSON fallback reflects production.

If numbers look wrong:

- compare local vs production
- remember legacy `trial_leads`
- remember phone normalization can affect dedupe

## 8. Current intentional limitations

These are not necessarily bugs:

- inactive trial creation by default
- some lifecycle and install-license data live in separate tables
- multiple tools need different config patterns
- WhatsApp remains a manual human conversion layer

## 9. Best practices for future operators and agents

- Never edit secrets directly in docs or commits.
- Never expose raw Azure API keys in public UI copy.
- Treat WhatsApp as a first-class system, not a side channel.
- Update both product UX and docs when flow changes.
- Before changing lifecycle behavior, verify what is implemented in:
  - `app/admin/actions.ts`
  - `app/api/admin/trial/route.ts`
  - `app/api/admin/convert/route.ts`
  - `lib/client-pipeline-store.ts`

## 10. If something looks wrong

Use this triage order:

1. Is the issue acquisition?
   - check `/funnel`
   - check WhatsApp redirect
   - check Meta lead flow

2. Is the issue lifecycle?
   - check `clients`
   - check lifecycle `licenses`
   - check pipeline section in admin

3. Is the issue product access?
   - check `license_keys`
   - check `/api/licenses/validate`
   - check the desktop manager session route

4. Is the issue setup/runtime?
   - use AIPilot Manager
   - then use `/tuto*` docs if needed
