# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# NEXT_PUBLIC_API_URL is baked into the client JS bundle at build time.
# It MUST be passed as a build argument — Railway does this automatically when
# you add NEXT_PUBLIC_API_URL as a variable on the frontend service.
#
# Railway:  add NEXT_PUBLIC_API_URL = https://your-backend.up.railway.app/api
#           in the frontend service Variables tab before deploying.
# Docker:   docker build --build-arg NEXT_PUBLIC_API_URL=https://... ./frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Fail the build early if the variable is missing — much better than silently
# baking in an empty string and discovering broken API calls in production.
RUN if [ -z "$NEXT_PUBLIC_API_URL" ]; then \
      echo ""; \
      echo "ERROR: NEXT_PUBLIC_API_URL is not set."; \
      echo ""; \
      echo "On Railway: add NEXT_PUBLIC_API_URL as a Variable on the frontend"; \
      echo "service (Settings → Variables) and redeploy."; \
      echo ""; \
      echo "Value should be: https://your-backend.up.railway.app/api"; \
      echo ""; \
      exit 1; \
    fi

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
