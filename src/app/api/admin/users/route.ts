import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/hash'
import { withAdmin } from '@/lib/api-auth'
import { userCreateSchema, validateBody } from '@/lib/validation'

export const GET = withAdmin(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true, role: true, created_at: true },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json({ users })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const { data: body, error } = validateBody(userCreateSchema, await req.json())
  if (error) return error

  const password_hash = await hashPassword(body.password)
  const user = await prisma.user.create({
    data: { email: body.email, password_hash, full_name: body.full_name ?? '', role: body.role ?? 'user' },
    select: { id: true, email: true, full_name: true, role: true, created_at: true },
  })
  return NextResponse.json({ user })
})
