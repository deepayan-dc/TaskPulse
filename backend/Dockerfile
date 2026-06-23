FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time DB URL so Prisma can run inside image build
ENV DATABASE_URL="file:./prisma/dev.db"

RUN npx prisma generate
RUN npx prisma db push
# Seed the database so the test accounts (e.g. manager1@test.com / password123)
# exist. db push only creates the schema; without seeding every login fails
# with "Invalid credentials". The seed uses upsert, so it is idempotent.
RUN npx prisma db seed

EXPOSE 5000

CMD ["npm", "run", "dev"]