FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 🔥 IMPORTANT FIX
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "run", "dev"]