# Client Technical Discovery & Infrastructure Questionnaire

This questionnaire is designed to gather critical technical, operational, and hosting requirements from the client before starting development on the **Multi-Tenant SEO-First CMS Platform** (`shivit.com` and managed domains).

---

## 1. Cloud & Server Infrastructure

1. **Preferred Hosting Environment:**
   - Do you prefer running containerized workloads on **AWS ECS / Fargate** / **AWS App Runner**, or setting up managed **AWS EC2 instances** with Nginx and Docker?
   - *(Recommendation: Containerized deployment via AWS ECS or App Runner for automated auto-scaling, zero downtime deployments, and container isolation).*

2. **CDN & Edge Routing:**
   - What is your current CDN provider (**Cloudflare**, **AWS CloudFront**, or **Fastly**)?
   - Will we have administrative control over edge routing rules to pass the original `Host` header to the backend application?

3. **CI/CD & Deployment Pipeline:**
   - Do you have an existing CI/CD platform (e.g., GitHub Actions, AWS CodePipeline, GitLab CI, Bitbucket Pipelines)?
   - Are there specific staging/testing environment pipelines required prior to production deployment?

---

## 2. Database & Data Isolation

1. **Managed Database Preference:**
   - Are we using a managed PostgreSQL instance like **AWS RDS PostgreSQL** or **AWS Aurora Serverless v2**?
   - *(Recommendation: AWS Aurora Serverless v2 for auto-scaling DB CPU/RAM and automated point-in-time recovery).*

2. **Multi-Tenant Data Isolation Strategy:**
   - Is row-level tenant isolation (indexing all tables with `domain_id`) sufficient, or do enterprise compliance rules require separate database schemas per domain tenant?

3. **Backup & Retention Policies:**
   - What are your required SLA backup intervals (e.g., daily automated snapshots, 30-day point-in-time recovery)?

---

## 3. DNS, SSL & Security

1. **DNS Control & Domain Provisioning:**
   - Where are your domain DNS zone files hosted (AWS Route53, Cloudflare, GoDaddy)?
   - Will we be granted DNS management access to issue Wildcard SSL certificates via **AWS Certificate Manager (ACM)** or **Let's Encrypt**?

2. **Authentication & User Management:**
   - Is standard JWT / Secure Session cookie authentication with Role-Based Access Control (RBAC) sufficient for CMS admin users?
   - Do you require Single Sign-On (SSO) integration (e.g., Google Workspace, Microsoft Entra ID / Azure AD, SAML 2.0, Okta)?

---

## 4. Media, Documents & Video Hosting

1. **Static Media & Document Storage:**
   - Are we provisioning a dedicated **AWS S3 bucket** backed by an **AWS CloudFront** distribution for images, PDFs, brochures, and DOCs?
   - Are there specific storage limits or document retention policies?

2. **Video Streaming & Autoplay Strategy:**
   - For product walkthrough videos and autoplay muted hero banners, will videos be embedded from **YouTube/Vimeo**, or hosted directly via AWS S3 / Cloudflare Stream / AWS Elemental?

---

## 5. Content Migration & SEO Rank Preservation (Critical)

1. **Existing URL Inventory:**
   - Can you provide a full audit/sitemap of all existing URLs currently active on `shivit.com`?
   - *(Target: Maintain 100% exact match URLs to guarantee zero drop in organic SEO ranking).*

2. **Content Migration Workflow:**
   - Will your content team manually populate the new dynamic CMS block builder, or do you require an automated HTML-to-Block scraper/migration script for legacy pages?

3. **Redirect Strategy:**
   - If any legacy URLs need modification, do you have an existing list of 301 redirects that must be configured in the CMS engine?
