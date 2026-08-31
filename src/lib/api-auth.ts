import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySessionToken } from '@/lib/auth/jwt'
import { SESSION_COOKIE } from '@/lib/auth/session'
import { Prisma, type User } from '@prisma/client'

// Traduit les erreurs Prisma courantes en réponses HTTP propres, pour ne pas
// laisser fuiter un 500 brut (ou un message d'erreur interne) au client
// quand un id est introuvable ou qu'une contrainte unique est violée.
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Ressource introuvable' }, { status: 404 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Cette valeur existe déjà' }, { status: 409 })
    }
    if (err.code === 'P2003') {
      return NextResponse.json({ error: 'Référence invalide ou encore utilisée' }, { status: 409 })
    }
  }
  console.error(err)
  return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
}

export type SessionUser = Omit<User, 'password_hash'>

async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const payload = verifySessionToken(token)
    const user = await prisma.user.findFirst({ where: { id: payload.userId, is_active: true } })
    if (!user) return null
    const { password_hash: _password_hash, ...rest } = user
    return rest
  } catch {
    return null
  }
}

type RouteContext<P> = { params: Promise<P> }
type AuthedHandler<P> = (
  req: NextRequest,
  ctx: RouteContext<P> & { user: SessionUser }
) => Promise<Response> | Response

export function withAuth<P = Record<string, string>>(handler: AuthedHandler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    try {
      return await handler(req, { ...ctx, user })
    } catch (err) {
      return toErrorResponse(err)
    }
  }
}

export function withAdmin<P = Record<string, string>>(handler: AuthedHandler<P>) {
  return withAuth<P>((req, ctx) => {
    if (ctx.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    return handler(req, ctx)
  })
}
