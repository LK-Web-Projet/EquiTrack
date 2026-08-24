// Seed : crée (ou met à jour) le tout premier compte admin.
//
// Nécessite dans .env :
//   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (optionnel)
//
// Lancer avec : npm run db:seed  (ou automatiquement après `npm run db:migrate`)
//
// Idempotent : peut être relancé sans risque, il ne recrée pas le compte
// s'il existe déjà (il remet juste son rôle à 'admin').

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const adminEmail = process.env.SEED_ADMIN_EMAIL
const adminPassword = process.env.SEED_ADMIN_PASSWORD
const adminName = process.env.SEED_ADMIN_NAME || 'Admin'

async function main() {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont requis dans .env pour créer le premier compte admin.'
    )
  }
  if (adminPassword.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD doit contenir au moins 8 caractères.')
  }

  const password_hash = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'admin', is_active: true },
    create: { email: adminEmail, password_hash, full_name: adminName, role: 'admin' },
  })

  console.log(`✓ Compte admin prêt : ${adminEmail}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
