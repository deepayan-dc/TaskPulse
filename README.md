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

