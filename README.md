# Multi-Domain Blog Manager

A centralized, headless CMS platform built to manage and publish Markdown blogs across multiple domains from a single unified dashboard. 

## Live Demo
- **Frontend Dashboard:** [https://content-stack-mu.vercel.app](https://content-stack-mu.vercel.app)
- **Backend API:** [https://contentstack-urip.onrender.com](https://contentstack-urip.onrender.com)

## Architecture

This project is structured as a monorepo with distinct frontend and backend layers:

- **`/backend` (Express / Node.js / TypeScript)**: A RESTful API that acts as the single source of truth. It manages the domains, regions, and saves blog posts in Markdown format. The datastore is a **PostgreSQL** database (hosted on Neon).
- **`/frontend` (Next.js / React)**: The centralized Management Dashboard. It features a premium, distraction-free writing interface and a dynamic sidebar that shifts the UI context based on the selected publishing domain.

*(Note: The actual public-facing client websites would act as separate frontends pulling from this core backend).*

## Features

- **Multi-Domain Routing**: Manage content for entirely separate websites (e.g., a Tech Blog and a Lifestyle Blog) from one screen.
- **Context-Aware Design**: The dashboard features a custom dark-mode typography system (`Outfit`, `Inter`, `JetBrains Mono`) with a signature accent shift to clearly indicate which domain you are currently publishing to.
- **Markdown Native**: The editor natively supports Markdown for all blog content.
- **Robust Database**: Fully typed TypeScript backend integrated with PostgreSQL for scalable data storage.

## Getting Started Locally

You will need to run both the backend and frontend servers simultaneously for the full experience.

### 1. Database Setup

1. Create a `.env` file in the `backend` directory.
2. Add your PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```
3. Run the setup scripts to create tables and seed initial data:
   ```bash
   cd backend
   npm run db:setup
   npm run db:seed
   ```

### 2. Start the Backend API

```bash
cd backend
npm install
npm run dev
```
*The backend will run on `http://localhost:3001`.*

### 3. Start the Frontend Dashboard

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```
*The frontend dashboard will run on `http://localhost:3000`.*

## Available Endpoints (Backend)

- `GET /api/domains` - Returns all registered domains and their associated regions.
- `GET /api/posts?domainId=1` - Fetches all posts, optionally filtered by domain.
- `POST /api/posts` - Accepts a JSON payload to publish a new Markdown post.

## Deployment

This project is configured for seamless deployment:
- **Database:** Serverless PostgreSQL via [Neon](https://neon.tech)
- **Backend:** Node.js Web Service on [Render](https://render.com) (`npm run build` & `node dist/app.js`)
- **Frontend:** Next.js Application on [Vercel](https://vercel.com) (Requires `NEXT_PUBLIC_API_URL` pointing to the backend).
