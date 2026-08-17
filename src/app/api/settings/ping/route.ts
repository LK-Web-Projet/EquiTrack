import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'

export const GET = withAdmin(async () => {
  await prisma.categories.count()
  return NextResponse.json({ ok: true })
})
