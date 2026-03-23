# IPTV Reseller System

Production-style full-stack IPTV reseller management platform with:
- Admin panel (parent company)
- Reseller panel
- Client portal
- JWT authentication, role-based access control
- Activity logs, alerts, reports (CSV/PDF)
- Multi-server and multi-channel-list package support

## Tech Stack

- Frontend: React + Vite + Recharts
- Backend: Node.js + Express + Mongoose
- Database: MongoDB
- Security: bcrypt password hashing, JWT, role guards, request validation, rate limiting, Helmet

## Project Structure

```
.
├── backend
│   ├── src
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config
│   │   ├── controllers
│   │   ├── middlewares
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   └── utils
│   ├── Dockerfile
│   └── package.json
├── frontend
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── context
│   │   ├── hooks
│   │   ├── layouts
│   │   ├── pages
│   │   └── styles
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Core Features

### Admin Panel
- KPI dashboard: total resellers, clients, active subscriptions, revenue
- Reseller CRUD
- Credit assignment
- Package management (monthly/quarterly/yearly via `durationDays`)
- Server management (Xtream/M3U)
- Sales and activity monitoring
- Notifications/alerts for low credits and expiring subscriptions
- CSV/PDF report generation

### Reseller Panel
- KPI dashboard: clients, revenue, credits, active subscriptions
- Client CRUD
- Subscription assignment and renewal
- Free trial support
- Client activity tracking
- Sales/client CSV and PDF reports

### Client Portal
- Personal subscription visibility
- Active package and expiry details
- Server visibility

### Security
- Roles: `admin`, `reseller`, `client`
- Password hashing with bcrypt
- JWT auth
- Optional Admin 2FA via TOTP
- Zod request validation
- Rate limiting + Helmet

## Local Setup (Standard Node.js)

## 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed-admin
npm run dev
```

Backend runs on `http://localhost:5000`.

## 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Default Admin Credentials

Set in `backend/.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Then run:

```bash
npm run seed-admin
```

## Docker Deployment

From project root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- MongoDB: `mongodb://localhost:27017`

## Vercel Deployment (Frontend)

This repository is a monorepo. Deploy only the `frontend` app on Vercel:

1. Import this GitHub repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add env variable:
	- `VITE_API_URL=https://your-backend-domain/api`

`frontend/vercel.json` already includes SPA rewrites.

Note: The Express API (`backend`) is not deployed by this Vercel frontend config. Deploy backend separately (Render/Railway/VM/Docker host), then point `VITE_API_URL` to it.

## Production Deployment (Recommended)

Deploy frontend on Vercel and backend on Render.

### 1) Deploy Backend on Render

This repo includes `render.yaml` at project root.

1. In Render: **New +** -> **Blueprint** -> connect this repository.
2. Render creates service `iptv-reseller-api` from `backend`.
3. Set required secrets in Render environment:
	- `MONGODB_URI`
	- `JWT_SECRET` (minimum 24 chars)
	- `FRONTEND_URL` (your Vercel production URL)
	- `FRONTEND_URLS` (comma-separated allowed origins if needed)
	- `ADMIN_EMAIL`
	- `ADMIN_PASSWORD`
4. After first deploy, run one-time seed command in Render shell:
	- `npm run seed-admin`

### 2) Deploy Frontend on Vercel

1. Import same GitHub repository in Vercel.
2. Keep root directory as repository root (already supported by root `vercel.json`).
3. Add env variable:
	- `VITE_API_URL=https://<your-render-backend-domain>/api`
4. Redeploy.

### 3) Go Live Checklist

- Use strong secret values and rotate defaults.
- Confirm `https://<backend-domain>/api/health` returns `ok: true`.
- Confirm login works with seeded admin.
- Confirm CORS allows only your production domains.
- Enable database backups and IP restrictions if possible.

## Main API Routes

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`

### Admin
- `GET /api/admin/dashboard`
- `GET/POST/PATCH/DELETE /api/admin/resellers`
- `POST /api/admin/resellers/:resellerId/credits`
- `GET/POST/PATCH/DELETE /api/admin/packages`
- `GET/POST/PATCH/DELETE /api/admin/servers`
- `GET /api/admin/activity`
- `GET /api/admin/sales`
- `GET /api/admin/notifications`
- `PATCH /api/admin/notifications/:notificationId/read`
- `GET /api/admin/reports?reportType=sales|clients&format=csv|pdf`

### Reseller
- `GET /api/reseller/dashboard`
- `GET/POST/PATCH/DELETE /api/reseller/clients`
- `GET /api/reseller/packages`
- `GET /api/reseller/subscriptions`
- `POST /api/reseller/subscriptions`
- `POST /api/reseller/subscriptions/:subscriptionId/renew`
- `GET /api/reseller/client-activity`
- `GET /api/reseller/reports?reportType=sales|clients&format=csv|pdf`

### Client
- `GET /api/client/dashboard`

## Production Notes

- Replace `JWT_SECRET` with a long random value.
- Add HTTPS termination (Nginx/Cloud LB).
- Restrict CORS to exact frontend origin.
- Add database backups and monitoring.
- For large datasets, paginate list endpoints.
- Add automated tests (unit + integration + e2e).

## UI Notes

- Responsive layout for desktop/mobile.
- Reusable cards/tables/charts for fast extension.
- Clean separation of concerns between auth, API, layout, and domain pages.
