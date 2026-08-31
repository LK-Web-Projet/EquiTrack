import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyIntegrationKey } from '@/lib/integration-auth'
import { toErrorResponse } from '@/lib/api-auth'
import { shapeLoan } from '@/lib/api-shape'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

// GET /api/integration/loans/[id] — statut courant d'un prêt externe (actif/retourné, état par
// équipement). CampTrack l'utilise pour se synchroniser sur l'état réel côté EquiTrack au lieu de
// dupliquer sa propre saisie de retour.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyIntegrationKey(req)
  if (authError) return authError

  const { id } = await params
  try {
    const loan = await prisma.loans.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE })
    return NextResponse.json({ data: shapeLoan(loan) })
  } catch (err) {
    return toErrorResponse(err)
  }
}
