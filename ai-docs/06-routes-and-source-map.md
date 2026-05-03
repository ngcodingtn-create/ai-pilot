# 06 - Routes and Source Map

## User-facing pages

- `/` -> main portal
- `/funnel` -> conversion landing page
- `/tuto` -> Windows manual guide
- `/tuto-mac` -> macOS manual guide
- `/tuto-linux` -> Linux manual guide
- `/tutoriels` -> legacy path / tutorial route compatibility
- `/admin` -> admin backoffice
- `/dev` -> technical page / dev info

## Public APIs

### Lead and funnel

- `/api/trial`
- `/api/leads`

### Access requests

- `/api/access-requests`

### License validation

- `/api/licenses/validate`
- `/api/license/validate`

### Admin lifecycle APIs

- `/api/admin/clients`
- `/api/admin/trial`
- `/api/admin/convert`

### Cron

- `/api/cron/expire-trials`

### Manager

- `/api/manager/session`
- `/api/manager/update-config`
- `/api/manager/files/[...segments]`

### Installer / downloads

- `/api/install/windows`
- `/api/install/macos`
- `/api/install/linux`
- `/api/download/windows`
- `/api/download/linux`
- `/api/download/macos`
- `/api/download/manager/windows`
- `/api/download/manager/macos`
- `/api/download/manager/linux`

## Main server/business files

### Config

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\config-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\config-store.ts)

### Product/install licenses

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\license-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\license-store.ts)

### Lifecycle pipeline

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\client-pipeline-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\client-pipeline-store.ts)

### Trial lead submissions

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\trial-leads-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\trial-leads-store.ts)

### Access requests

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\access-request-store.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\access-request-store.ts)

### WhatsApp utilities

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\whatsapp.ts)

### Meta / Facebook CAPI

- [C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts](C:\Users\ngcadmin\Desktop\ai-pilot\lib\capi.ts)

## Main admin files

- [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts](C:\Users\ngcadmin\Desktop\ai-pilot\app\admin\actions.ts)

## Main funnel files

- [C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\page.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\page.tsx)
- [C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\funnel-client.tsx](C:\Users\ngcadmin\Desktop\ai-pilot\app\funnel\funnel-client.tsx)

## Main manager files

- [C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\main.js](C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\main.js)
- [C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\preload.js](C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\preload.js)
- [C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\src\index.html](C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\src\index.html)
- [C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\src\renderer.js](C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\src\renderer.js)
- [C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\src\styles.css](C:\Users\ngcadmin\Desktop\ai-pilot\manager-app\src\styles.css)
