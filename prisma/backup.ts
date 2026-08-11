// Sauvegarde complète de la base de données vers un fichier JSON horodaté.
//
// Lancer avec : npm run db:backup
// Écrit dans  : backups/backup-<horodatage>.json
//
// Ne sauvegarde pas les fichiers du bucket Supabase Storage
// (equipment-photos) — seulement leurs URLs, stockées dans la table
// equipment_photos.

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const [
    categories, departments, employees, equipment,
    loans, loan_items, incidents, maintenances,
    profiles, equipment_photos,
  ] = await Promise.all([
    prisma.categories.findMany(),
    prisma.departments.findMany(),
    prisma.employees.findMany(),
    prisma.equipment.findMany(),
    prisma.loans.findMany(),
    prisma.loan_items.findMany(),
    prisma.incidents.findMany(),
    prisma.maintenances.findMany(),
    prisma.profile.findMany(),
    prisma.equipmentPhoto.findMany(),
  ])

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    data: {
      categories, departments, employees, equipment,
      loans, loan_items, incidents, maintenances,
      profiles, equipment_photos,
    },
  }

  const dir = join(process.cwd(), 'backups')
  mkdirSync(dir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `backup-${stamp}.json`)
  writeFileSync(file, JSON.stringify(backup, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2), 'utf-8')

  const counts = Object.fromEntries(Object.entries(backup.data).map(([k, v]) => [k, v.length]))
  console.log('✓ Backup écrit :', file)
  console.table(counts)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
