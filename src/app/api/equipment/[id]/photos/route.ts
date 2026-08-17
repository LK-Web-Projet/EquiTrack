import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { UPLOADS_DIR } from '@/lib/uploads'

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const data = await prisma.equipmentPhoto.findMany({
    where: { equipment_id: id },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json({ data })
})

export const POST = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { dataUrl } = await req.json()
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return NextResponse.json({ error: 'dataUrl invalide' }, { status: 400 })
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const buffer = Buffer.from(base64, 'base64')

  const dir = path.join(UPLOADS_DIR, 'equipment', id)
  await mkdir(dir, { recursive: true })

  const filename = `${crypto.randomUUID()}.jpg`
  await writeFile(path.join(dir, filename), buffer)

  const data = await prisma.equipmentPhoto.create({
    data: { equipment_id: id, url: `/api/uploads/equipment/${id}/${filename}` },
  })
  return NextResponse.json({ data })
})
