# IT Domain Testing Review

Created: 2026-07-25

## Purpose

This note summarizes the current readiness of the multi-domain feature before handing it to IT for testing.

## Current Status

The implementation is in a workable testing state, but it should **not** be described as fully automatic unless the required Vercel environment variables are configured in production.

What works now:

- A new domain can be created from the CMS.
- DNS guidance is available in the UI and docs.
- Posts are isolated by `domain_id`.
- Custom-domain routing is implemented for the existing blog preview flow.

What is not guaranteed yet:

- Automatic public activation for a real production domain without Vercel API configuration.
- Full hosting readiness verification.
- Generic multi-page website routing beyond the current blog-style routes.

## Key Findings

### 1. Domain creation is not fully automatic unless Vercel API env vars are set

In the backend, Vercel registration only happens if these environment variables exist:

- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` (if applicable)

If these are missing, the CMS will still create the domain record, but Vercel will not automatically know about the new domain. In that case, adding DNS records alone is not enough for the site to go live.

## 2. Verify currently checks DNS, not full hosting readiness

The current `Verify` flow confirms DNS resolution, but it does not confirm all of the following:

- that Vercel accepted the domain
- that SSL certificates are ready
- that the app is actually serving traffic on that host

Because of that, the CMS may show `Active` even while the public domain is still not fully ready in the browser.

## 3. Custom-domain routing currently supports the blog flow, not a full arbitrary website

The current frontend proxy rewrites:

- `/` to the domain preview home
- `/{single-segment}` to a single post route

This is enough for the current blog flow, but it is not a generic CMS page-routing system yet.

If IT expects routes like:

- `/about`
- `/contact`
- `/services/design`

that is not fully implemented in this version.

## 4. The onboarding UI is usable, but one label is ambiguous

The field called `Domain name` is really a display label inside the CMS.

Example:

- `Domain name`: `Shivaizer`
- `Domain host`: `shivaizer.com`

This works, but the label may confuse non-technical users. A clearer naming scheme would be:

- `Display name`
- `Domain / Hostname`

## 5. DNS verification currently allows partial success

The DNS check passes if either:

- the apex/root `A` record works
- or the `www` `CNAME` works

That means one of them can still be broken while the CMS shows the domain as active.

## What IT Can Reliably Test

IT can safely test the following:

1. Create a domain in the CMS.
2. Add the shown DNS records at the registrar.
3. Use the `Verify` action in the dashboard.
4. Publish a post under that domain.
5. Confirm that posts from one domain do not appear on another domain.
6. Confirm that the custom domain resolves to the correct blog if hosting is also properly configured.

## What IT Must Confirm In Environment Setup

Before calling the feature fully automatic, IT should verify these production settings:

- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` if the Vercel project belongs to a team
- `FRONTEND_PRIMARY_HOST`
- `NEXT_PUBLIC_API_URL`

Without the Vercel configuration, the flow is only partially automated.

## Safe Summary For IT

Use this wording when sharing the feature:

> Domains can now be created from the CMS, DNS guidance is built in, and blog content is isolated per domain. Public domain activation becomes fully automatic only when the Vercel domain API configuration is present in production.

## Recommendation Before Final Push

This version is acceptable for IT testing if everyone understands:

- CMS creation works
- DNS guidance works
- tenant isolation works
- automatic production activation depends on Vercel API configuration

For a stronger production-ready release, the next improvements should be:

1. Rename the onboarding fields for clarity.
2. Make `Verify` confirm hosting readiness, not DNS alone.
3. Expand routing if the system needs true CMS page slugs beyond the current blog flow.
