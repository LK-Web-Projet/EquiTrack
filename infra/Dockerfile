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
# Copié dans un dossier séparé (pas ./node_modules) : le node_modules issu du build standalone
# pnpm contient des symlinks (ex. react) que Docker ne peut pas fusionner avec un dossier réel.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma/node_modules ./prisma-cli/node_modules
# prisma.config.ts importe dotenv — copié isolément (pas de fusion) directement à l'endroit
# où Node le résout depuis /app/prisma.config.ts.
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma/node_modules/dotenv ./node_modules/dotenv

USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node prisma-cli/node_modules/prisma/build/index.js migrate deploy && node server.js"]
