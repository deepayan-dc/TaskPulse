FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Absolute DB path so the Prisma CLI and the Prisma client resolve to the SAME
# file at both build and runtime (a relative path resolves differently for each).
ENV DATABASE_URL="file:/app/prisma/dev.db"

RUN npx prisma generate
RUN npx prisma db push
# Seed the database so the test accounts (e.g. manager1@test.com / password123)
# exist. db push only creates the schema; without seeding every login fails
# with "Invalid credentials". The seed uses upsert, so it is idempotent.
RUN npx prisma db seed

EXPOSE 5000

# Additive schema changes against the persistent (volume-backed) DB are applied
# at app startup via the Prisma client (see src/lib/ensure-schema.ts), which
# always targets the same DB file the app reads — avoiding the CLI's relative
# path-resolution mismatch.
CMD ["npm", "run", "dev"]