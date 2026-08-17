import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/hash'
import { withAdmin } from '@/lib/api-auth'

export const GET = withAdmin(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true, role: true, created_at: true },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json({ users })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const { email, password, full_name, role } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
  }

  const finalRole = role === 'admin' ? 'admin' : 'user'
  const password_hash = await hashPassword(password)

  try {
    const user = await prisma.user.create({
      data: { email, password_hash, full_name: full_name ?? '', role: finalRole },
      select: { id: true, email: true, full_name: true, role: true, created_at: true },
    })
    return NextResponse.json({ user })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 400 })
    }
    throw e
  }
})
