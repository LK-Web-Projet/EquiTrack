import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyIntegrationKey } from '@/lib/integration-auth'
import { toErrorResponse } from '@/lib/api-auth'
import { shapeLoan } from '@/lib/api-shape'
import { loanReturnSchema, validateBody } from '@/lib/validation'
import { processReturn } from '@/lib/loan-service'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

// POST /api/integration/loans/[id]/return — CampTrack signale le retour du matériel par un
// prestataire, avec l'état constaté par équipement (même contrat que /api/loans/[id]/return).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyIntegrationKey(req)
  if (authError) return authError

  const { id } = await params
  const { data: body, error } = validateBody(loanReturnSchema, await req.json())
  if (error) return error

  try {
    await prisma.$transaction((tx) => processReturn(tx, id, body))
    const loan = await prisma.loans.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE })
    return NextResponse.json({ data: shapeLoan(loan) })
  } catch (err) {
    return toErrorResponse(err)
  }
}
