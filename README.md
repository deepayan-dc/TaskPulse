# TaskPulse

TaskPulse is a modern team productivity platform for managing tasks end-to-end with timeline visibility, live collaboration, and operational notifications.

## Features

- Task lifecycle management (create, assign, progress, review, complete)
- Timer tracking for effort and productivity visibility
- Role-based access for managers and employees
- Task-level comments for collaboration
- In-app notifications for assignments and updates
- WhatsApp integration using MSG91 (sandbox-ready)

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database/ORM:** PostgreSQL + Prisma
- **Realtime:** Socket.IO

## Project Structure

```text
TaskPulse/
  frontend/
  backend/
  docker-compose.yml
```

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

Backend default: `http://localhost:5000`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

## Docker Setup

Run the full stack (frontend + backend + postgres) from project root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Postgres: `localhost:5432`

Stop services:

```bash
docker compose down
```

## Environment Variables

Backend expects:

- `DATABASE_URL`
- `JWT_SECRET`
- `MSG91_API_KEY`
- `MSG91_TEMPLATE_ID`

You can supply them in `backend/.env` for local development and via compose environment for containers.

## Basic Testing Checklist

- [ ] Login works (mock/local auth flow)
- [ ] Task creation works
- [ ] Task lifecycle transitions work
- [ ] Timer tracking works correctly
- [ ] Comments and notifications flow works
- [ ] Backend runs without crash and responds to `/health`

## Screenshots

> Add final UI screenshots before submission:

- Login page
- Dashboard
- Task list / Kanban
- Task detail with comments + timer

## Future Improvements

- Add automated test suite (unit + integration + e2e)
- Add CI pipeline with lint/build/test gates
- Add production-grade monitoring and alerts
- Move mock data fully to persistent backend models
- Add stricter RBAC policies and audit logs
