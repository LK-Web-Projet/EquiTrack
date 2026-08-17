import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { categoryCreateSchema, validateBody } from '@/lib/validation'

export const GET = withAuth(async () => {
  const data = await prisma.categories.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ data })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const { data: body, error } = validateBody(categoryCreateSchema, await req.json())
  if (error) return error

  const data = await prisma.categories.create({ data: body })
  return NextResponse.json({ data })
})
