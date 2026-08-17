import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import { withAuth } from '@/lib/api-auth'
import { resolveUploadPath, contentTypeFor } from '@/lib/uploads'

export const GET = withAuth<{ path: string[] }>(async (_req: NextRequest, { params }) => {
  const { path: segments } = await params
  const filePath = resolveUploadPath(...segments)
  if (!filePath) {
    return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
  }

  try {
    await stat(filePath)
    const buffer = await readFile(filePath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  }
})
