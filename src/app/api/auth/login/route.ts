import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth/hash'
import { signSessionToken } from '@/lib/auth/jwt'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'
import { isRateLimited, recordFailedAttempt, clearAttempts, rateLimitKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 400 })
  }

  const key = rateLimitKey(req, String(email).trim())
  const { limited, retryAfterSeconds } = isRateLimited(key)
  if (limited) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${Math.ceil((retryAfterSeconds ?? 60) / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds ?? 60) } }
    )
  }

  const user = await prisma.user.findFirst({ where: { email: String(email).trim(), is_active: true } })
  const valid = user ? await comparePassword(password, user.password_hash) : false

  if (!user || !valid) {
    recordFailedAttempt(key)
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })
  }

  clearAttempts(key)
  const token = signSessionToken({ userId: user.id, email: user.email, role: user.role })

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, created_at: user.created_at },
  })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
}
