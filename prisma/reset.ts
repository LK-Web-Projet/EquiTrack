// Vide toutes les données métier de la base (catégories, départements,
// employés, équipements, emprunts, incidents, maintenances, photos).
// Les comptes utilisateurs (table users) sont PRÉSERVÉS — tu restes
// connecté après le reset.
//
// Par sécurité, ne fait rien sans le flag --yes (sinon affiche juste un
// aperçu des lignes qui seraient supprimées).
//
// Lancer avec : npm run db:reset -- --yes
// Un backup (npm run db:backup) est fortement recommandé avant.

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Ordre sans importance : TRUNCATE ... CASCADE gère les dépendances de clés
// étrangères. "users" est volontairement absent de cette liste.
const TABLES = [
  'equipment_photos', 'incidents', 'maintenances', 'loan_items',
  'loans', 'equipment', 'employees', 'departments', 'categories',
]

async function main() {
  const confirmed = process.argv.includes('--yes')

  const counts = await Promise.all([
    prisma.categories.count(), prisma.departments.count(), prisma.employees.count(),
    prisma.equipment.count(), prisma.loans.count(), prisma.loan_items.count(),
    prisma.incidents.count(), prisma.maintenances.count(), prisma.equipmentPhoto.count(),
  ])
  const labels = ['categories', 'departments', 'employees', 'equipment', 'loans', 'loan_items', 'incidents', 'maintenances', 'equipment_photos']
  console.table(Object.fromEntries(labels.map((l, i) => [l, counts[i]])))

  if (!confirmed) {
    console.log('\nAperçu seulement — rien n\'a été supprimé. Relance avec --yes pour confirmer.')
    return
  }

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`)
  console.log('\n✓ Données métier vidées. Comptes utilisateurs (users) conservés.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
