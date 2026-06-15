# syntax=docker/dockerfile:1
# ── Image de production du back Next.js (output: standalone) ───────────────────
# Build multi-stage : deps → builder → runner (image finale minimale).

# 1) Dépendances (cache séparé du code source)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build de l'application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Aucune variable secrète n'est nécessaire au build (pas de NEXT_PUBLIC_*),
# les credentials DB sont lus au runtime.
RUN npm run build

# 3) Runner (image finale)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Utilisateur non-root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Fichiers nécessaires au runtime standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Railway injecte PORT ; on écoute sur toutes les interfaces.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
