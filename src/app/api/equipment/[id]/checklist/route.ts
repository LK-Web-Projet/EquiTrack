import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getEquipmentChecklistState } from '@/lib/checklist-service'

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const data = await getEquipmentChecklistState(id)
  return NextResponse.json({ data })
})
