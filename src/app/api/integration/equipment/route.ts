import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyIntegrationKey } from '@/lib/integration-auth'
import { shapeEquipment } from '@/lib/api-shape'
import { toErrorResponse } from '@/lib/api-auth'

// GET /api/integration/equipment?service_id=<id_service>&status=available
// Liste le matériel EquiTrack utilisable pour un service CampTrack donné : soit sans restriction
// de service (categories.camptrack_service_ids vide), soit dont la liste contient ce service_id.
export async function GET(req: NextRequest) {
  const authError = verifyIntegrationKey(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get('service_id')
  const status = searchParams.get('status') || 'available'

  if (!serviceId) {
    return NextResponse.json({ error: 'Paramètre service_id requis' }, { status: 400 })
  }

  try {
    const equipment = await prisma.equipment.findMany({
      where: {
        status,
        categories: {
          OR: [
            { camptrack_service_ids: { isEmpty: true } },
            { camptrack_service_ids: { has: serviceId } },
          ],
        },
      },
      include: { categories: true },
      orderBy: [{ categories: { name: 'asc' } }, { sequential_number: 'asc' }],
    })

    return NextResponse.json({ data: equipment.map(shapeEquipment) })
  } catch (err) {
    return toErrorResponse(err)
  }
}
