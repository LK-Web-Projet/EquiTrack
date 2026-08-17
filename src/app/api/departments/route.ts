import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'

export const GET = withAuth(async () => {
  const data = await prisma.departments.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ data })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json()
  const data = await prisma.departments.create({ data: body })
  return NextResponse.json({ data })
})
