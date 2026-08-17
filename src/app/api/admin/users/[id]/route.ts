import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'
import { hashPassword } from '@/lib/auth/hash'
import { adminPasswordResetSchema, validateBody } from '@/lib/validation'

// Réinitialise le mot de passe d'un utilisateur (admin uniquement) — seul
// moyen de récupérer un compte dont le mot de passe est perdu, en l'absence
// d'un système d'email pour un flux "mot de passe oublié" classique.
export const PATCH = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { data: body, error } = validateBody(adminPasswordResetSchema, await req.json())
  if (error) return error

  const password_hash = await hashPassword(body.password)
  await prisma.user.update({ where: { id }, data: { password_hash } })
  return NextResponse.json({ success: true })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params, user }) => {
  const { id } = await params
  if (user.id === id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
