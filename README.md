# Jeremias Frontend (React)

## Overview
The frontend is a React app with two areas:
- /app for internal CRM users (admin, sales, project members)
- /portal for customer self service

## Stack
- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui, Radix UI
- React Router, @tanstack/react-query, React Hook Form, Zod

## Setup (local)
Prereqs: Node.js 18+ (or Bun).

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

## Configuration
The API base URL is resolved in frontend/src/config/api.ts.
To override locally, create frontend/.env or frontend/.env.local:

```env
VITE_API_URL=http://127.0.0.1:8080/api
```

Auth tokens are stored in localStorage under the key jeremia_token.

## Scripts
```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Structure (high level)
- frontend/src/pages/app/ - internal CRM pages
- frontend/src/pages/portal/ - customer portal pages
- frontend/src/components/ - UI and layout components
- frontend/src/contexts/ - auth and theme context
- frontend/src/lib/ - API client and helpers
