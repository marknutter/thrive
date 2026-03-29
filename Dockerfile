FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Rebuild native modules for the builder's platform
RUN npm rebuild better-sqlite3
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/migrations ./migrations

COPY --from=builder /app/content ./content
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/jobs ./jobs

USER nextjs
EXPOSE ${PORT:-3022}
ENV PORT=3022
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_PATH=/data/thrive.db

# Railway sets PORT dynamically; use it if available
CMD ["sh", "-c", "node_modules/.bin/next start -p ${PORT:-3022}"]
