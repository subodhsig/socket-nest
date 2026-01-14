FROM node:22.11-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm@9.12.2 && pnpm install --frozen-lockfile

COPY . .

EXPOSE 3005

CMD pnpm migration:run && pnpm seed && pnpm run start