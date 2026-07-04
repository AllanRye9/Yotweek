# ── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Prisma's engine binaries need libssl, which recent Alpine base images no
# longer ship by default. Needed here too since `prisma generate` runs in
# this stage, not just at runtime.
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 4000

# Run pending migrations, then start the API. `migrate deploy` is safe to
# run on every boot - it only applies migrations that haven't run yet.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
