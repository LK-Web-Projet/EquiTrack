// Config Prisma 7 — les URLs de connexion ne vont plus dans schema.prisma,
// elles se lisent ici. On recharge .env.local (convention Next.js du projet)
// puisque Prisma ne le fait pas automatiquement (seul .env l'est par défaut).
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
