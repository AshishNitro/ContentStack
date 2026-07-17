# Demo Architecture Plan

This is a streamlined architecture designed specifically for a client-facing demo. It strips away complex infrastructure, CI/CD, and edge cases to focus entirely on demonstrating the core functional layers: Frontend, Backend, and Database.

```text
/demo-blog-manager
│
├── /frontend                  # The centralized Management Dashboard (Next.js)
│   ├── /src
│   │   ├── /components        # Core UI components (Rich Text Editor, Dropdowns)
│   │   ├── /pages             # Essential pages (Login, Dashboard, Post Editor)
│   │   └── /services          # API clients to fetch/post data to backend
│   └── package.json           # Dependencies and scripts
│
├── /backend                   # Core API Server (Node.js/Express)
│   ├── /src
│   │   ├── /controllers       # Logic to handle blog creation and domain routing
│   │   ├── /models            # Database schemas for Posts and Domains
│   │   ├── /routes            # Exposed API endpoints for the frontend
│   │   └── app.js             # Server initialization
│   └── package.json           # Dependencies and scripts
│
└── /database                  # Database configuration
    ├── seed.sql               # Script to inject mock domains and posts for the demo
    └── schema.sql             # Base database schema definitions
```

## Layer Breakdown

### 1. Frontend (Next.js Dashboard)
- **Goal**: Demonstrate a smooth user experience. It will show how a user logs in, manages their different domains, and writes a blog post.
- **Key Features for Demo**: 
  - A simple **Domain Selector** dropdown.
  - A **Region/Category Selector** that dynamically updates based on the chosen domain.
  - A fully functional WYSIWYG **Rich Text Editor** for drafting the post.

### 2. Backend (Node.js/Express API)
- **Goal**: Serve as the core engine handling incoming requests from the frontend and managing the underlying data.
- **Key Features for Demo**: 
  - Routing logic to ensure posts are correctly associated with specific domains.
  - Straightforward REST API endpoints (`GET /posts`, `POST /posts`, `GET /domains`) that the frontend can interact with.

### 3. Database
- **Goal**: Centralized data storage for the entire system.
- **Key Features for Demo**: 
  - Core tables for **Users**, **Domains**, **Regions**, and **Posts**. 
  - A `seed.sql` script that comes pre-loaded with sample domains (e.g., Domain A, Domain B) so the client can immediately see the multi-tenant capabilities without needing to set everything up from scratch.
