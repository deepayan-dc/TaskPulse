FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ✅ Generate Prisma client
RUN npx prisma generate

# ✅ (IMPORTANT) push schema (no DB needed)
RUN npx prisma db push || true

EXPOSE 5000

CMD ["npm", "run", "dev"]