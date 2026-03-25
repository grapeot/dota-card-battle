# Build static assets, then serve with a single Node process (honors PORT for Koyeb).
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve@14.2.4

COPY --from=builder /app/dist ./dist

EXPOSE 8000
CMD sh -c 'serve -s dist -l "tcp://0.0.0.0:${PORT:-8000}"'
