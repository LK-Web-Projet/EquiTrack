import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'node:fs/promises'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'
import { resolveUploadPath } from '@/lib/uploads'

export const DELETE = withAdmin<{ id: string; photoId: string }>(async (_req: NextRequest, { params }) => {
  const { photoId } = await params
  const photo = await prisma.equipmentPhoto.findUniqueOrThrow({ where: { id: photoId } })

  const relative = photo.url.replace(/^\/api\/uploads\//, '')
  const filePath = resolveUploadPath(...relative.split('/'))
  if (filePath) {
    await unlink(filePath).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e
    })
  }

  await prisma.equipmentPhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ success: true })
})
