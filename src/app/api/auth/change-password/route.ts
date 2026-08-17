import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { comparePassword, hashPassword } from '@/lib/auth/hash'
import { changePasswordSchema, validateBody } from '@/lib/validation'

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const { data: body, error } = validateBody(changePasswordSchema, await req.json())
  if (error) return error

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  const valid = await comparePassword(body.current_password, fullUser.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
  }

  const password_hash = await hashPassword(body.new_password)
  await prisma.user.update({ where: { id: user.id }, data: { password_hash } })
  return NextResponse.json({ success: true })
})
