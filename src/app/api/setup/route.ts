import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/hash'
import { signSessionToken } from '@/lib/auth/jwt'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'
import { setupAdminSchema, validateBody } from '@/lib/validation'

// Bootstrap du tout premier compte admin, sans authentification requise.
// Ne fonctionne que tant qu'aucun utilisateur n'existe : une fois le premier
// admin créé, ce endpoint (et la page /setup) se désactivent d'eux-mêmes.
// À supprimer (src/app/api/setup, src/app/setup) une fois l'admin en place.

export async function GET() {
  const count = await prisma.user.count()
  return NextResponse.json({ done: count > 0 })
}

export async function POST(req: NextRequest) {
  const existing = await prisma.user.count()
  if (existing > 0) {
    return NextResponse.json({ error: 'Un compte existe déjà. Cette page est désactivée.' }, { status: 403 })
  }

  const { data: body, error } = validateBody(setupAdminSchema, await req.json())
  if (error) return error

  const password_hash = await hashPassword(body.password)
  const user = await prisma.user.create({
    data: { email: body.email, password_hash, full_name: body.full_name ?? '', role: 'admin' },
  })

  const token = signSessionToken({ userId: user.id, email: user.email, role: user.role })
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, created_at: user.created_at },
  })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
}
