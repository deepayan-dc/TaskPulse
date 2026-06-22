# TaskPulse

TaskPulse is a modern team productivity platform for managing tasks end-to-end with timeline visibility, live collaboration, and operational notifications.
Below is the link to the flow of the system architecture:
https://excalidraw.com/#json=InZh-2S2cF47R40hjIMCf,n3FEqZVaUzIWbXGNBvONZg

## Features

- Task lifecycle management (create, assign, progress, complete)
- Timer tracking for effort and productivity visibility
- Role-based users (MANAGER and EMPLOYEE)
- Task-level comments for collaboration
- In-app notifications for assignments and status changes
- WhatsApp notifications via Gupshup, with a delivery-log audit trail

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database/ORM:** SQLite + Prisma
- **Auth:** HTTP Basic auth (bcrypt-hashed passwords)
- **Realtime:** Socket.IO
- **Messaging:** Gupshup WhatsApp API

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
npm run prisma:migrate   # apply migrations to the SQLite database
npm run prisma:seed      # optional: seed sample users/tasks
npm run dev
```

Backend default: `http://localhost:5000` (health check at `/health`)

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

## Docker Setup

Run the full stack (frontend + backend) from project root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

The database is SQLite stored on disk inside the backend container (`DATABASE_URL=file:./prisma/dev.db`), so no separate database service is required.

Stop services:

```bash
docker compose down
```

## Environment Variables

Backend expects (see `backend/.env.example`):

- `DATABASE_URL` — SQLite connection string, e.g. `file:./dev.db`
- `PORT` — backend port (default `5000`)
- `JWT_SECRET` — reserved for token auth (the active request auth is HTTP Basic)
- `GUPSHUP_API_KEY` — Gupshup WhatsApp API key
- `GUPSHUP_SOURCE_NUMBER` — Gupshup sender number
- `GUPSHUP_APP_NAME` — Gupshup app/source name (default `TaskPulseNotif`)

You can supply them in `backend/.env` for local development and via compose environment for containers.

## Basic Testing Checklist

- [ ] Login works (mock/local auth flow)
- [ ] Task creation works
- [ ] Task lifecycle transitions work
- [ ] Timer tracking works correctly
- [ ] Comments and notifications flow works
- [ ] Backend runs without crash and responds to `/health`

## Screenshots

<img width="1845" height="884" alt="Screenshot 2026-04-23 050329" src="https://github.com/user-attachments/assets/fe0e7318-e1cb-4fde-918a-432fa23e799d" />
<img width="1866" height="888" alt="Screenshot 2026-04-23 053806" src="https://github.com/user-attachments/assets/4bd52c40-c5c0-41b2-8434-efa652c670ff" />
<img width="1862" height="878" alt="Screenshot 2026-04-23 053848" src="https://github.com/user-attachments/assets/1acffc2c-91b0-46d3-925c-52b1e79c0123" />
<img width="1843" height="884" alt="Screenshot 2026-04-23 053937" src="https://github.com/user-attachments/assets/bc47fa03-8b45-4def-9db8-b4c841ba26f7" />
<img width="1836" height="874" alt="image" src="https://github.com/user-attachments/assets/22ee0aa2-b589-42c3-8986-7c73ce1ca60a" />
<img width="1065" height="738" alt="image" src="https://github.com/user-attachments/assets/59e50aa7-8841-47e3-8b6b-f529bf4105a4" />



- Login page
- Dashboard
- Task list / Kanban
- Task detail with comments + timer

