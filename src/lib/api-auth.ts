import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySessionToken } from '@/lib/auth/jwt'
import { SESSION_COOKIE } from '@/lib/auth/session'
import type { User } from '@prisma/client'

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
    return handler(req, { ...ctx, user })
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
