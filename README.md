# Multi-Domain Blog Manager

A centralized, headless CMS platform built to manage and publish Markdown blogs across multiple domains from a single unified dashboard. 

## Architecture

This project is structured as a monorepo with distinct frontend and backend layers:

- **`/backend` (Express / Node.js / TypeScript)**: A RESTful API that acts as the single source of truth. It manages the domains, regions, and saves blog posts in Markdown format. For seamless cross-platform testing, the MVP utilizes a local `db.json` file as the datastore.
- **`/frontend` (Next.js / React)**: The centralized Management Dashboard. It features a premium, distraction-free writing interface and a dynamic sidebar that shifts the UI context based on the selected publishing domain.

*(Note: The actual public-facing client websites would act as separate frontends pulling from this core backend).*

## Features

- **Multi-Domain Routing**: Manage content for entirely separate websites (e.g., a Tech Blog and a Lifestyle Blog) from one screen.
- **Context-Aware Design**: The dashboard features a custom dark-mode typography system (`Outfit`, `Inter`, `JetBrains Mono`) with a signature accent shift to clearly indicate which domain you are currently publishing to.
- **Markdown Native**: The editor natively supports Markdown for all blog content.
- **Zero-Setup Database**: The backend uses an in-memory/JSON approach for rapid prototyping without needing Docker or a SQL server installed locally.

## Getting Started

You will need to run both the backend and frontend servers simultaneously for the full experience.

### 1. Start the Backend API

```bash
cd backend
npm install
npm run dev
```
*The backend will run on `http://localhost:3001`.*

### 2. Start the Frontend Dashboard

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

## Design Philosophy

The frontend avoids generic utility-class templates (no Tailwind) in favor of a strictly defined Vanilla CSS Module token system (`src/styles/globals.css`). The aesthetic is built around:
- A soft matte charcoal background (`#111110`).
- A typography scale tailored for reading and writing technical content.
- Dynamic CSS variables (`--dynamic-accent`) that drive visual cues across the dashboard.
