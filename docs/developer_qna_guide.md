# Developer Q&A Guide: Discovery & Client Interview Preparation

This document serves as your complete guide for client meetings. It contains:
1. **Questions YOU (the Developer) must ask the client.**
2. **Questions THE CLIENT may ask you, along with exact, professional answers tailored to this POC and SOW.**

---

## Part 1: Questions YOU (The Developer) Should Ask The Client

### 🖥️ 1. Hosting & AWS Infrastructure
* **Q1:** Do you already have an active AWS account, or do we need to provision a new AWS environment?
* **Q2:** For hosting the application, do you prefer **AWS ECS/Fargate (Containerized)** or **AWS EC2 instances** managed with Nginx and PM2/Docker?
  * *Context:* ECS/Fargate is recommended for auto-scaling and zero-downtime deployments.
* **Q3:** What is your preferred managed database setup: **AWS RDS PostgreSQL** or **AWS Aurora Serverless v2**?

### 🌐 2. DNS, CDN & Domain Management
* **Q4:** Who manages your DNS zone files (Cloudflare, AWS Route 53, GoDaddy)?
* **Q5:** Can you grant us access to configure **AWS ACM Wildcard SSL Certificates** and edge routing headers (`Host` header preservation)?
* **Q6:** Are there any additional domain names (besides `shivit.com` and regional subdomains like `in.shivit.com`) that need to be launched on day one?

### 📁 3. Assets, Media & Video Streaming
* **Q7:** Where are your existing website images, PDF brochures, and media files currently hosted?
* **Q8:** For product walkthrough videos and autoplay hero banners, will videos be embedded via **YouTube/Vimeo**, or hosted on **AWS S3 / Cloudflare Stream**?

### 🚀 4. Content Migration & SEO Integrity
* **Q9:** Do you have a complete inventory/sitemap of all active URLs on the current `shivit.com` website to guarantee 100% URL structure preservation?
* **Q10:** Will your marketing team populate content into the new CMS block builder manually, or do you require us to build an automated HTML scraper script for initial migration?

---

## Part 2: Questions THE CLIENT Might Ask YOU & Recommended Answers

### Q1: "How will one single CMS app manage multiple separate domains without cloning code or databases?"
> **Developer Answer:**
> "We use a **Host-Header Tenant Resolution Architecture**. When a request arrives (e.g., `shivit.com` vs `domain2.com`), our Edge Middleware intercepts the incoming request host header, resolves it to the correct `tenant_id` in milliseconds, and dynamically serves the specific pages, blocks, and SEO metadata assigned to that domain. 
> 
> There are no duplicated codebases, no folder-based domain structures, and no separate database instances required. Everything is unified in one central admin dashboard with a Site Switcher in the header."

---

### Q2: "How do you guarantee 100% existing URL integrity and prevent loss of Google SEO rankings during migration?"
> **Developer Answer:**
> "We guarantee zero drop in SEO rank by executing three key measures:
> 1. **URL Matching:** The dynamic page routing engine in Next.js mirrors your exact legacy URL structure (`100% structural preservation`).
> 2. **Independent Per-Domain SEO Engine:** The CMS dynamically generates host-specific `/sitemap.xml`, `/robots.txt`, canonical tags, JSON-LD structured schema, and OpenGraph social tags per domain and region (`/erp-software` vs `/in/erp-software`).
> 3. **301 Redirect Engine:** Built directly into the CMS so any legacy page changes automatically return HTTP 301 Permanent Redirects to preserve link equity."

---

### Q3: "Can our non-technical marketing staff create new pages and landing pages without developer assistance?"
> **Developer Answer:**
> "Yes, absolutely. The CMS uses a **Dynamic Content Block System**. Instead of rigid static templates, pages are built using 20+ configurable content block primitives (Hero Video Banners, Accordion FAQs, Feature Grids, Testimonial Tickers, Comparison Tables, CTA Banners, and Inline Forms). 
> 
> Marketers can add, reorder, edit, and publish blocks visually inside the admin panel with zero coding or design intervention."

---

### Q4: "What tech stack do you recommend for our project, and why?"
> **Developer Answer:**
> "We recommend a modern, enterprise-proven tech stack:
> * **Frontend Public Renderer:** **Next.js (React)** with **Incremental Static Regeneration (ISR)**. This delivers sub-second page loads, maximum Lighthouse scores (90+ Core Web Vitals), and instant TTFB.
> * **Backend Core API:** **Node.js / Express with TypeScript** and **Prisma ORM** for type-safe database queries.
> * **Database:** **PostgreSQL** hosted on **AWS Aurora Serverless v2 / RDS** for auto-scaling and high availability.
> * **Media & Assets:** **AWS S3 + CloudFront CDN** with automated **Sharp image compression** (converting uploaded assets into WebP/AVIF format)."

---

### Q5: "How does user permissions and security work when multiple team members manage different domains?"
> **Developer Answer:**
> "We implement **Role-Based Access Control (RBAC)** integrated into JWT sessions:
> * **Super Admin:** Access to all domain tenants and global system settings.
> * **Domain Admin:** Full administrative rights restricted to specific assigned domains.
> * **Content Editor:** Can create and edit draft blocks for assigned domains but cannot publish live without approval.
> * **SEO Specialist:** Restricted exclusively to managing meta titles, canonicals, sitemaps, and 301 redirects."

---

### Q6: "How will popups and lead collection forms be controlled?"
> **Developer Answer:**
> "Popups (time-based, scroll-based, exit-intent) and lead forms (demo requests, contact forms, gated PDF downloads) are completely managed inside the CMS per page and per domain. 
> 
> Form submissions are protected with **Cloudflare Turnstile / reCAPTCHA v3** and Redis rate limiting to prevent spam."

---

### Q7: "The document mentions AI-Assisted Accelerated Development. How will you use AI in this project?"
> **Developer Answer:**
> "We leverage AI tools across the entire development lifecycle:
> 1. **Code Generation & Scaffolding:** Accelerating block UI component creation and TypeScript database schemas.
> 2. **SEO Metadata Migration:** Using AI models to parse, extract, and clean legacy HTML metadata for automated migration.
> 3. **Automated QA & Unit Testing:** Generating automated integration tests to ensure cross-browser compatibility and zero URL breakage."
