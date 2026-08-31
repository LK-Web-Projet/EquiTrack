import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyIntegrationKey } from '@/lib/integration-auth'
import { toErrorResponse } from '@/lib/api-auth'
import { shapeLoan } from '@/lib/api-shape'
import { externalLoanCreateSchema, validateBody } from '@/lib/validation'
import { reserveAndCreateLoan, EquipmentUnavailableError } from '@/lib/loan-service'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

// POST /api/integration/loans — CampTrack remet du matériel EquiTrack à un prestataire pour une
// campagne. Réservation atomique (voir reserveAndCreateLoan) + revalidation serveur de la
// restriction de service par catégorie (défense en profondeur : CampTrack a déjà dû filtrer via
// GET /api/integration/equipment, mais rien n'empêche un appel direct avec un équipement invalide).
export async function POST(req: NextRequest) {
  const authError = verifyIntegrationKey(req)
  if (authError) return authError

  const { data: body, error } = validateBody(externalLoanCreateSchema, await req.json())
  if (error) return error
  const {
    campagne_id, campagne_nom, prestataire_id, prestataire_nom, service_id,
    checkout_date, checkout_time, expected_return_date, checkout_notes, equipment_ids,
  } = body

  try {
    const equipment = await prisma.equipment.findMany({
      where: { id: { in: equipment_ids } },
      include: { categories: true },
    })

    const restricted = equipment.filter(
      (e) => e.categories.camptrack_service_ids.length > 0 &&
        !e.categories.camptrack_service_ids.includes(service_id)
    )
    if (restricted.length > 0) {
      const details = restricted
        .map((e) => `${e.display_number} (${e.categories.name} → ${e.categories.camptrack_service_names.join(', ')})`)
        .join(', ')
      return NextResponse.json(
        { error: `Équipement(s) restreint(s) à un autre service : ${details}` },
        { status: 409 }
      )
    }

    let loanId: string
    try {
      loanId = await prisma.$transaction((tx) => reserveAndCreateLoan(tx, {
        campagne_id, campagne_nom, prestataire_id, prestataire_nom,
        checkout_date, checkout_time, expected_return_date, checkout_notes,
        processed_by: 'CampTrack',
        equipment_ids, source: 'external',
      }))
    } catch (err) {
      if (err instanceof EquipmentUnavailableError) {
        return NextResponse.json(
          { error: 'Un ou plusieurs équipements sélectionnés ne sont plus disponibles.' },
          { status: 409 }
        )
      }
      throw err
    }

    const loan = await prisma.loans.findUniqueOrThrow({ where: { id: loanId }, include: LOAN_INCLUDE })
    return NextResponse.json({ data: shapeLoan(loan) }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
