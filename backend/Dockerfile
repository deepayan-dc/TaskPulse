FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time DB URL so Prisma can run inside image build
ENV DATABASE_URL="file:./prisma/dev.db"

RUN npx prisma generate
RUN npx prisma db push

EXPOSE 5000

CMD ["npm", "run", "dev"]