# Detailed Engineering Architecture Design

This document outlines the detailed component design, database schemas, API endpoints, block builder JSON contracts, and rendering pipeline for the **Multi-Tenant CMS Platform**.

---

## 1. Database Schema Strategy (PostgreSQL + ORM)

The relational schema uses PostgreSQL with **Prisma / Drizzle ORM**. Multi-tenancy is enforced via indexed `domain_id` foreign keys on all core entities.

```sql
-- 1. Domains (Tenants)
CREATE TABLE domains (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'shivit_com', 'brand_b_com'
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    default_region VARCHAR(10) DEFAULT 'US',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Roles & Access Control
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'SUPER_ADMIN', 'DOMAIN_ADMIN', 'EDITOR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_domain_access (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    domain_id VARCHAR(50) REFERENCES domains(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, domain_id)
);

-- 3. Pages Entity
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id VARCHAR(50) REFERENCES domains(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    region_code VARCHAR(10) DEFAULT 'default', -- 'default', 'in', 'us'
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_domain_slug_region UNIQUE (domain_id, slug, region_code)
);

-- Indexes for ultra-fast query times
CREATE INDEX idx_pages_lookup ON pages(domain_id, slug, status);
CREATE INDEX idx_pages_region ON pages(domain_id, region_code);

-- 4. Media Library
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id VARCHAR(50) REFERENCES domains(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    public_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image/png', 'application/pdf', 'video/mp4'
    file_size_bytes BIGINT NOT NULL,
    alt_text VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Dynamic Forms & Popups
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id VARCHAR(50) REFERENCES domains(id) ON DELETE CASCADE,
    form_name VARCHAR(100) NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    trigger_rules JSONB DEFAULT '{}'::jsonb, -- time-based, scroll, exit-intent
    is_popup BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Dynamic Content Block JSON Specification

Every page's layout is stored in the `pages.blocks` `JSONB` column as an ordered collection of validated block primitives.

### Sample Block Data Structure
```json
[
  {
    "id": "blk_hero_01",
    "type": "hero_section",
    "variant": "video_background",
    "settings": {
      "padding_top": "large",
      "background_color": "#0F172A"
    },
    "content": {
      "headline": "Enterprise ERP Software Platform",
      "subheadline": "Streamline operations with AI-assisted workflows",
      "video_url": "https://cdn.shivit.com/videos/hero.mp4",
      "primary_cta": {
        "text": "Schedule Demo",
        "url": "/contact",
        "style": "btn-primary"
      }
    }
  },
  {
    "id": "blk_features_02",
    "type": "feature_grid",
    "content": {
      "columns": 3,
      "items": [
        {
          "icon": "cpu",
          "title": "Module Automation",
          "description": "Integrated ERP modules for supply chain & HR."
        },
        {
          "icon": "shield-check",
          "title": "ISO 27001 Certified",
          "description": "Bank-grade data encryption and compliance."
        }
      ]
    }
  }
]
```

### Supported Block Component Registry
1. **Hero Blocks:** Static Image, Video Background, Slider/Carousel.
2. **Content Blocks:** Single/Multi-column Text, Image + Text layout, Accordion/FAQ.
3. **Media Blocks:** Video Embed (YouTube/Vimeo), Autoplay Video, Image Gallery.
4. **Data & Trust Blocks:** Stats Counter Grid, Testimonials, Client Logo Ticker, Comparison Tables.
5. **Interactive Blocks:** Dynamic Inline Forms, Gated Brochure Download Blocks, Tabbed Layouts.

---

## 3. SEO & Host Resolution Middleware

### Next.js Middleware Resolution (`middleware.ts`)
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || 'shivit.com';
  const pathname = request.nextUrl.pathname;

  // Skip static assets
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Inject host into custom header for downstream SSR/ISR component access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-host', host);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

---

## 4. API Endpoints Architecture

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tenant/config` | Public | Returns tenant domain configuration & active features by Host header |
| `GET` | `/api/v1/pages/resolve?slug=/&region=us` | Public | Resolves page blocks and SEO metadata for target domain |
| `GET` | `/sitemap.xml` | Public | Dynamically generates XML sitemap filtered by request domain |
| `GET` | `/robots.txt` | Public | Returns domain-specific robots instruction file |
| `POST` | `/api/v1/admin/pages` | Auth (Editor) | Creates or updates page blocks and drafts |
| `POST` | `/api/v1/admin/media/upload` | Auth (Editor) | Generates pre-signed S3 upload URL with Sharp optimization |
| `POST` | `/api/v1/forms/submit` | Public | Validates and stores incoming lead form submissions |
