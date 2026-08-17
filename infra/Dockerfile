# ── Build ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN node -p "const p=require('./package.json'); (p.dependencies?.prisma || p.devDependencies?.prisma).replace(/^[\^~]/, '')" > /tmp/prisma-version
RUN node -p "const p=require('./package.json'); (p.dependencies?.dotenv || p.devDependencies?.dotenv).replace(/^[\^~]/, '')" > /tmp/dotenv-version
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN npm run build

# ── Prisma CLI (isolé) ───────────────────────────────────────────────────────
# Installation propre du CLI Prisma seul, sans package.json du projet —
# sa présence forcerait npm à valider les peer deps du projet entier (ERESOLVE).
FROM node:22-alpine AS prisma-cli
WORKDIR /prisma
COPY --from=builder /tmp/prisma-version ./prisma-version
COPY --from=builder /tmp/dotenv-version ./dotenv-version
RUN npm install --no-save prisma@$(cat prisma-version) dotenv@$(cat dotenv-version)
# react/react-dom arrivent en peer dep de @prisma/studio-core (UI de "prisma studio"),
# jamais utilisée par "migrate deploy" — supprimés pour éviter un conflit avec le
# react du build standalone Next.js (symlink pnpm) à la fusion dans le runner.
RUN rm -rf node_modules/react node_modules/react-dom

# ── Runner ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI pour migrations au démarrage (deps résolues isolément, voir stage prisma-cli).
# prisma.config.ts est requis à la racine (Prisma 7 + adapter-pg, l'URL n'est plus dans
# schema.prisma) et doit pouvoir résoudre ses imports (dotenv, prisma/config) depuis ./node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma/node_modules ./node_modules

USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
