# Dynamic Multi-Domain Routing & Management Plan

> Cross-checked against the full codebase on 2026-07-22

---

## Goal

Enable an admin to add a new domain from the CMS dashboard, point DNS records to the hosting server, and have that domain automatically start serving its own isolated content — without any developer intervention.

---

## Current State of the Codebase

| Layer | What Exists Today | What's Missing |
|---|---|---|
| **Database** (`database/schema.sql`) | `domains`, `regions`, `posts` tables with foreign keys. Content is already scoped to `domain_id`. | `domains.url` has no UNIQUE constraint — duplicate URLs could break host resolution. No `is_active` / `status` column for DNS readiness tracking. |
| **Backend API** (`backend/src/routes/api.ts`, `backend/src/controllers/postController.ts`) | `GET /domains`, `GET /posts`, `GET /posts/:id`, `POST /posts` | No `POST /domains` (create), no `DELETE /domains/:id`, no `GET /domains/resolve?host=` for middleware lookups. CORS is wide open (`cors()` with no origin restriction). |
| **Frontend API Service** (`frontend/src/services/api.ts`) | `fetchDomains`, `fetchPosts`, `fetchPost`, `createPost` | No `createDomain`, `deleteDomain`, or `resolveDomainByHost` functions. |
| **Frontend Dashboard** (`frontend/src/components/Sidebar.tsx`) | Lists domains, allows switching. Has no way to add or remove domains. | Needs "+ Add Domain" button with a modal form. |
| **Public Preview Pages** (`frontend/src/pages/preview/[domainId]/index.tsx`, `[postId].tsx`) | Fully functional preview with region switching. Content is already filtered by `domainId`. | These pages hardcode `← Manager` back-links — when accessed from a custom domain, these links should be hidden or adapted. |
| **Next.js Middleware** | **Does not exist.** | Need a `middleware.ts` at the project root (`frontend/src/middleware.ts` for Pages Router) to intercept custom domain requests and rewrite them to `/preview/[domainId]`. |
| **Next.js Config** (`frontend/next.config.ts`) | Uses `i18n` config with hardcoded locales for region routing. | **Critical:** Next.js `i18n` in the Pages Router and custom Middleware can coexist, but the middleware must handle locale prefixing carefully. No changes needed to `i18n` config itself. |
| **Backend CORS** (`backend/src/app.ts`) | `app.use(cors())` — allows ALL origins. | Should be tightened to allow the admin panel domain + all registered custom domains dynamically. |

---

## User Review Required

### Vercel Custom Domain Registration
When a new domain's DNS is pointed at Vercel, Vercel must also know about it to provision SSL and route traffic.
- **Option A (Manual):** Admin adds the domain in Vercel Dashboard → Settings → Domains. Simple, no code needed.
- **Option B (Automated):** We store a Vercel API token in backend env and call `POST /v9/projects/{id}/domains` when a domain is created. Fully hands-off but requires token management.

**Recommendation:** Start with Option A. It's a one-time step per domain and avoids storing API keys.

### ⚠️ `domains.url` needs a UNIQUE constraint
Without it, two domains could share the same URL, breaking host-based resolution. The schema migration below adds this.

---

## Open Questions

1. Should we auto-seed default regions (US, India, Europe) for every new domain, or let the admin configure regions separately later?
2. Do you want a "Domain Status" indicator (e.g., ✅ Active / ⏳ DNS Pending) on the sidebar, or is it sufficient to just show all domains as-is?

---

## Proposed Changes

---

### 1. Database Schema Migration

#### [MODIFY] `database/schema.sql`

Add a UNIQUE constraint to `domains.url` and an `is_active` status column:

```sql
-- Migration: Add unique constraint and status tracking
ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE domains ADD CONSTRAINT domains_url_unique UNIQUE (url);
```

---

### 2. Backend API — Domain CRUD + Host Resolution

#### [MODIFY] `backend/src/controllers/postController.ts`

Add three new controller functions:

- **`createDomain`** — Accepts `{ name, url }`, inserts into `domains` table, auto-seeds 3 default regions (US, India, Europe), returns the created domain with regions.
- **`deleteDomain`** — Accepts domain `id` param, deletes the domain (cascades to regions and posts via existing FK constraints).
- **`resolveDomainByHost`** — Accepts `?host=mynewblog.com`, looks up `domains` table where `url` contains the host, returns the matching domain ID. This is the endpoint the Next.js middleware will call.

#### [MODIFY] `backend/src/routes/api.ts`

Add three new routes:

```typescript
router.post('/domains', createDomain);
router.delete('/domains/:id', deleteDomain);
router.get('/domains/resolve', resolveDomainByHost);
```

#### [MODIFY] `backend/src/app.ts`

Harden CORS — instead of `cors()` with no restrictions, dynamically build the allow-list from the `domains` table + the known admin panel origins (`localhost:3000`, Vercel deployment URL). This ensures custom domains can make API calls while blocking arbitrary origins.

---

### 3. Frontend API Service

#### [MODIFY] `frontend/src/services/api.ts`

Add new API functions:

```typescript
export async function createDomain(payload: { name: string; url: string }): Promise<Domain> { ... }
export async function deleteDomain(domainId: number): Promise<void> { ... }
```

---

### 4. Frontend Dashboard — Add Domain UI

#### [MODIFY] `frontend/src/components/Sidebar.tsx`

- Add a "+ Add Domain" button below the domain list.
- Open a modal dialog with inputs for **Domain Name** and **Domain URL**.
- On submit → call `createDomain()` → refresh domains list → auto-select the new domain.
- Add a small delete icon (🗑) on each domain button (with confirmation prompt).

#### [MODIFY] `frontend/src/components/Sidebar.module.css`

- Style the Add Domain button, modal overlay, form fields, and delete icon.
- Use the existing design system from `frontend/src/styles/globals.css` (accent colors, border radii, shadows, Inter font).

#### [MODIFY] `frontend/src/pages/index.tsx`

- Lift the `fetchDomains` refresh logic so the Sidebar can trigger a re-fetch after creating/deleting a domain. Pass a `onDomainsChanged` callback to the Sidebar.

---

### 5. Next.js Middleware — Dynamic Host-Based Routing

This is the core piece that makes custom domains work without developer intervention.

#### [NEW] `frontend/src/middleware.ts`

**Logic:**

```
1. Extract `host` from the incoming request headers
2. If host is the admin panel (localhost:3000 / Vercel URL) → let the request pass through normally
3. Otherwise → call backend: GET /api/domains/resolve?host={host}
4. If a domain is found → NextResponse.rewrite() to /preview/{domainId}
5. If no domain found → show a 404 or fallback page
```

**Key considerations identified from codebase review:**
- The existing `i18n` config in `frontend/next.config.ts` uses locale prefixes (`/us`, `/in`, `/eu`). The middleware must preserve locale handling — if a user visits `mynewblog.com/in`, the middleware rewrites to `/preview/{domainId}` with locale `in` intact.
- The middleware must **not** intercept `/_next/`, `/api/`, or static asset requests.
- To avoid hitting the backend on every request, implement a simple in-memory cache (Map) with a short TTL (e.g., 60 seconds).

**Matcher config:**
```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

---

### 6. Preview Pages — Custom Domain Awareness

#### [MODIFY] `frontend/src/pages/preview/[domainId]/index.tsx`

- Detect if the page is being served via a custom domain (by checking if `window.location.host` matches the domain's `url`).
- If yes: hide the "← Manager" back-link and the "Preview" badge (the user is on the live site, not previewing).
- If no: keep existing behavior.

#### [MODIFY] `frontend/src/pages/preview/[domainId]/[postId].tsx`

- Same custom-domain awareness: hide admin navigation links when accessed from a custom domain.

---

### 7. Content Isolation Verification

Content isolation **already works** in the current codebase. The `postController.ts` `getPosts` function filters by `domain_id` when the query parameter is provided, and the preview pages always pass the `domainId`. No additional changes needed for isolation itself.

The middleware rewrite ensures each custom domain always resolves to a specific `domainId`, so the filtering chain is:

```
Custom Domain → Middleware resolves domain_id → Preview page fetches posts WHERE domain_id = X
```

---

## File Change Summary

| File | Action | Purpose |
|---|---|---|
| `database/schema.sql` | MODIFY | Add UNIQUE constraint on `url`, add `is_active` column |
| `backend/src/controllers/postController.ts` | MODIFY | Add `createDomain`, `deleteDomain`, `resolveDomainByHost` controllers |
| `backend/src/routes/api.ts` | MODIFY | Add `POST /domains`, `DELETE /domains/:id`, `GET /domains/resolve` routes |
| `backend/src/app.ts` | MODIFY | Harden CORS to dynamic allow-list |
| `frontend/src/services/api.ts` | MODIFY | Add `createDomain`, `deleteDomain` functions |
| `frontend/src/components/Sidebar.tsx` | MODIFY | Add domain creation modal + delete button |
| `frontend/src/components/Sidebar.module.css` | MODIFY | Style modal, form, delete button |
| `frontend/src/pages/index.tsx` | MODIFY | Add domain refresh callback |
| `frontend/src/middleware.ts` | **NEW** | Host-based routing for custom domains |
| `frontend/src/pages/preview/[domainId]/index.tsx` | MODIFY | Hide admin links on custom domain |
| `frontend/src/pages/preview/[domainId]/[postId].tsx` | MODIFY | Hide admin links on custom domain |

---

## Verification Plan

### Automated
```bash
# Backend: Verify new endpoints
curl -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Blog","url":"http://testblog.localhost:3000"}'

curl http://localhost:3001/api/domains/resolve?host=testblog.localhost:3000

curl http://localhost:3001/api/domains  # Should show new domain with seeded regions
```

### Manual
1. Start backend (`npm run dev` in `/backend`) and frontend (`npm run dev` in `/frontend`).
2. Open `http://localhost:3000` — see the CMS dashboard. Click "+ Add Domain", enter name `Local Test Blog` and URL `http://localtest.localhost:3000`.
3. Select the new domain, publish a test post.
4. Open `http://localtest.localhost:3000` in a new tab — should see the preview page with only the test post (middleware rewrite in action).
5. Open `http://localhost:3000/preview/1` — should still show Domain 1's posts only.
6. Verify no cross-domain content leakage.
