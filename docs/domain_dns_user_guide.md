# Domain DNS User Guide

Created: 2026-07-25

## Purpose

This guide helps a CMS admin connect a newly added domain to the project after buying the domain from a registrar such as GoDaddy, Namecheap, Cloudflare, or Hostinger.

## Before You Start

Make sure the domain has already been created in the CMS admin panel.

Example:

- Domain name: `Shivit India`
- Domain host: `shivit.in`

After creating the domain in the CMS, use the DNS records shown by the app.

## DNS Records To Add

For a standard Vercel setup, the default records are:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

## Steps For The User

1. Log in to the website where the domain was purchased.
2. Open the domain management area.
3. Find the DNS page. It may be called `DNS`, `Manage DNS`, `Advanced DNS`, or `DNS Records`.
4. Add or update the root `A` record:
   `@ -> 76.76.21.21`
5. Add or update the `www` CNAME record:
   `www -> cname.vercel-dns.com`
6. Remove old conflicting records for `@` or `www` if they point somewhere else.
7. Save the DNS changes.
8. Wait for propagation.
9. Return to the CMS dashboard and click `Verify` for that domain.

## Common Registrar Paths

- GoDaddy:
  `My Products -> DNS -> Manage DNS`
- Namecheap:
  `Domain List -> Manage -> Advanced DNS`
- Cloudflare:
  `Select Domain -> DNS -> Records`
- Hostinger:
  `Domains -> Manage -> DNS / Nameservers`

## Where Should The Domain Be Hosted?

> [!IMPORTANT]
> **Must the domain be added to our project's hosting platform (e.g., Vercel)?**
> 
> **YES.** The domain **MUST** be added to the exact hosting platform (e.g. Vercel / project server) where this project is deployed.
> 
> - **Why?** Pointing DNS records (`76.76.21.21` / `cname.vercel-dns.com`) only sends web traffic to the hosting provider's server network. The hosting provider still needs to know **which project** owns the domain so it can provision SSL (HTTPS) certificates and route incoming requests to your CMS frontend.
> - **Can it be hosted anywhere else?** No. If you host it on another external platform (like cPanel, WordPress, GoDaddy Hosting, Wix), those external servers will not serve content from this CMS project. 
> - **Summary**: To serve website content from this CMS, the domain MUST be attached under **Project Settings -> Domains** in our hosting environment (Vercel).

## Important Notes

- Do not add URLs with `https://` into DNS values unless the registrar specifically asks for them.
- Do not add paths like `/blog` into DNS.
- DNS changes may work in a few minutes, but sometimes take a few hours.
- If the domain is added in the CMS but not attached in the hosting platform (Vercel), the domain will show a `404 Deployment Not Found` error.

## After DNS Is Added

Once DNS propagation finishes:

1. Open the dashboard.
2. Select the new domain.
3. Click `Verify`.
4. When the status becomes `Active`, create and publish a test page/post.
5. Open the custom domain in the browser and confirm the content is correct.
