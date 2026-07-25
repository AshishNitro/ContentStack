# Dashboard Multi-Domain Self-Service Plan

Created: 2026-07-25

## Requirement

From the CMS dashboard, an admin should be able to:

1. Add a new domain without developer help.
2. See the DNS records required for that domain.
3. Wait for DNS/SSL verification.
4. Have the domain become active automatically after DNS is correct.
5. Create and publish a test page/post for that domain.
6. Ensure content from one domain never appears on another domain.

## Is This Possible?

Yes, this is possible for this project.

The codebase already has the foundation:

- `domains`, `regions`, and `posts` tables exist.
- Posts already store `domain_id`.
- The CMS dashboard can switch between domains.
- The preview list page fetches posts by `domainId`.

But the project is not fully self-service yet. To make it work without developer support, the app needs:

- Domain creation APIs.
- Domain status tracking.
- DNS verification.
- Automatic hosting-provider domain registration, or a manual one-time hosting step.
- Host-based frontend routing.
- Stronger backend content isolation checks.

## Important Production Reality

DNS alone is not enough on hosts like Vercel.

For `example.com` to serve this Next.js app, two things must happen:

1. The domain's DNS records must point to the frontend host.
2. The frontend hosting provider must know about the domain so it can route traffic and issue SSL.

There are two implementation options:

| Option | Meaning | Developer Support After Build | Recommendation |
|---|---|---:|---|
| Manual hosting registration | Admin adds domain in CMS, but someone still adds the domain in Vercel/hosting dashboard | Sometimes required | Good first release |
| Automated hosting registration | Backend calls the hosting provider API when a domain is created | No | Best final version |

For the exact requirement "without developer support", choose automated hosting registration.

## Proposed User Flow

1. Admin opens CMS dashboard.
2. Admin clicks "Add Domain".
3. Admin enters:
   - Display name, for example `Shivit India`
   - Domain, for example `shivit.in`
   - Optional default regions, for example `in`, `us`, `eu`
4. Backend creates the domain with status `pending_dns`.
5. Backend registers the domain with the frontend host, if automation is enabled.
6. Dashboard shows DNS records:
   - Apex/root domain: `A @ -> 76.76.21.21` for Vercel
   - `www`: `CNAME www -> cname.vercel-dns.com`
   - Any TXT record required by the host for verification
7. Admin adds DNS records at the registrar.
8. A background verifier checks DNS and hosting status.
9. When DNS and SSL are ready, the domain becomes `active`.
10. Admin selects the domain in the CMS and publishes a test page/post.
11. Visiting the custom domain serves only that domain's content.

## Current Codebase Assessment

| Area | Current State | Gap |
|---|---|---|
| Database | `domains`, `regions`, `posts` exist | Need uniqueness, status, normalized host, optional verification fields |
| Backend domain API | `GET /api/domains` exists | Need create/update/delete/resolve/verify endpoints |
| Backend post API | Can create and list posts by domain | `GET /posts/:id` must verify the post belongs to the requested domain |
| Dashboard | Can select existing domains | Need add-domain form, status, DNS instructions, refresh |
| Frontend public routing | Preview route uses `/preview/[domainId]` | Need custom-domain host routing |
| Hosting | README mentions Vercel | Need manual or automated domain attachment |
| Content isolation | Mostly present for post lists | Must harden every API path, especially detail pages |

## Data Model Changes

Update `domains`:

```sql
ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS host VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_dns',
  ADD COLUMN IF NOT EXISTS dns_verified_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS ssl_ready_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS provider_domain_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS domains_host_unique
  ON domains (LOWER(host));
```

Recommended statuses:

- `draft`: saved but not ready for DNS setup
- `pending_dns`: DNS records need to be added
- `verifying`: DNS/hosting checks are running
- `active`: domain can serve public content
- `failed`: setup failed and needs attention
- `disabled`: domain is intentionally not serving content

Store normalized hosts like `shivit.in`, not full URLs like `https://shivit.in/path`.

## Backend Plan

Add domain endpoints:

```txt
GET    /api/domains
POST   /api/domains
GET    /api/domains/:id
PATCH  /api/domains/:id
DELETE /api/domains/:id
GET    /api/domains/resolve?host=shivit.in
POST   /api/domains/:id/verify
```

`POST /api/domains` should:

1. Validate and normalize the domain.
2. Reject duplicates.
3. Insert the domain with `pending_dns`.
4. Create default regions if needed.
5. Register the domain with the hosting provider API if full automation is enabled.
6. Return the DNS records the admin must add.

`GET /api/domains/resolve?host=` should:

1. Normalize the incoming host.
2. Remove ports, for example `example.com:3000` -> `example.com`.
3. Match both root and `www`.
4. Return only active domains for public routing.

`POST /api/domains/:id/verify` should:

1. Check DNS records.
2. Check hosting provider domain status.
3. Check SSL readiness if the provider exposes it.
4. Update the domain status.

## Content Isolation Plan

Content isolation must be enforced on the backend, not only in the frontend.

Required API changes:

1. `GET /api/posts?domainId=...` should keep filtering by `domain_id`.
2. `GET /api/posts/:id` should accept `domainId` and query:

```sql
SELECT *
FROM posts
WHERE id = $1
  AND domain_id = $2;
```

3. `POST /api/posts` should verify the selected region belongs to the selected domain:

```sql
SELECT id
FROM regions
WHERE id = $1
  AND domain_id = $2;
```

4. Public frontend post detail pages must request posts with both `postId` and `domainId`.
5. Any future page, media, settings, navigation, or SEO table must include `domain_id`.

This prevents content from domain A appearing on domain B even if a user guesses an ID or edits the URL.

## Frontend Dashboard Plan

Update the dashboard sidebar:

- Add an "Add Domain" action.
- Open a modal or panel with:
  - Domain name
  - Domain host
  - Region selection
- After create, show a setup screen with:
  - DNS records
  - Current status
  - "Verify DNS" action
  - Last checked time
- Add status indicators in the domain list:
  - Pending DNS
  - Verifying
  - Active
  - Failed

Update publishing:

- Only allow publishing to active domains, or show a clear warning when publishing to a pending domain.
- Keep preview available for pending domains through `/preview/[domainId]`.
- Show the final public URL after publishing.

## Public Frontend Routing Plan

Add Next.js middleware:

1. Read the request `Host` header.
2. Ignore known admin hosts like `localhost:3000` and the dashboard deployment domain.
3. Resolve the host through the backend.
4. If the domain is active, rewrite:

```txt
https://shivit.in/
-> /preview/{domainId}

https://shivit.in/in
-> /in/preview/{domainId}
```

5. Preserve existing locale routing.
6. Do not intercept:
   - `/_next/*`
   - `/api/*`
   - `/favicon.ico`
   - static assets

Add a short cache in middleware to avoid resolving the same host on every request.

## Hosting Automation Plan

For Vercel automation, backend needs environment variables:

```env
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
FRONTEND_PRIMARY_HOST=content-stack-mu.vercel.app
```

When a domain is created:

1. Backend calls Vercel's project-domain API.
2. Backend stores provider response data.
3. Backend shows DNS records in the dashboard.
4. Verifier periodically checks whether the domain is configured and SSL is ready.

If automation is not implemented in phase 1, document one manual step:

> Add the custom domain to the Vercel project after creating it in the CMS.

That version is still useful, but it does not fully meet "without developer support".

## Security And Admin Requirements

Before this is production-ready, add:

- Admin authentication.
- Role-based access for domain management.
- CORS allow-list using admin host plus active custom domains.
- Rate limiting on domain creation and verification.
- Audit log for domain add/delete/status changes.
- Validation to block localhost/private/internal domains in production.
- Soft delete or confirmation flow for deleting domains.

## Implementation Phases

### Phase 1: Safe Domain CRUD

- Add database columns and unique host index.
- Add `POST /api/domains`.
- Add `PATCH /api/domains/:id`.
- Add `DELETE /api/domains/:id`.
- Add domain form in the dashboard.
- Add domain refresh after create/delete.

### Phase 2: Content Isolation Hardening

- Change post detail API to require `domainId`.
- Verify region ownership when publishing.
- Update preview detail page to fetch by `postId + domainId`.
- Add tests for cross-domain leakage.

### Phase 3: Host-Based Routing

- Add `GET /api/domains/resolve`.
- Add Next.js middleware.
- Map custom host requests to `/preview/[domainId]`.
- Hide CMS-only links when viewed through a custom domain.

### Phase 4: DNS And Status UI

- Add status columns.
- Show required DNS records.
- Add manual "Verify DNS" button.
- Add background verification job if the backend host supports scheduled jobs.

### Phase 5: Full No-Developer Automation

- Integrate Vercel domain API or the selected hosting provider API.
- Store provider domain id/status.
- Automatically move domain to `active` after DNS and SSL checks pass.
- Add clear failure messages in the dashboard.

## Acceptance Criteria

- Admin can create a new domain from the CMS.
- Duplicate domains are rejected.
- Dashboard displays DNS records for the new domain.
- Domain remains inactive until DNS/hosting verification passes.
- Once active, visiting the custom domain shows the correct public site.
- Admin can publish a test page/post to the new domain.
- Posts from domain A never appear on domain B list pages.
- Posts from domain A cannot be opened through domain B detail URLs.
- Region-specific content still works through locale paths.
- No code deploy is required for each new domain after the feature is built.

## Recommended First Build

Build phases 1, 2, and 3 first.

That gives the project real CMS-created domains, safe isolation, and custom-domain routing. Then add phase 4 and phase 5 to make the onboarding experience fully self-service and production-grade.

