import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url)
  const equipment_id = url.searchParams.get('equipment_id')
  const limit = url.searchParams.get('limit')

  // Sans equipment_id : les incidents les plus récents tous équipements
  // confondus (utilisé par le tableau de bord).
  const data = await prisma.incidents.findMany({
    where: equipment_id ? { equipment_id } : undefined,
    orderBy: equipment_id ? { reported_at: 'desc' } : { created_at: 'desc' },
    take: limit ? Number(limit) : undefined,
  })
  return NextResponse.json({ data })
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const data = await prisma.incidents.create({ data: body })
  return NextResponse.json({ data })
})
