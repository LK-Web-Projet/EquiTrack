import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'

export const GET = withAdmin(async (req: NextRequest) => {
  const url = new URL(req.url)
  const category_id = url.searchParams.get('category_id')
  if (!category_id) {
    return NextResponse.json({ error: 'category_id requis' }, { status: 400 })
  }

  const last = await prisma.equipment.findFirst({
    where: { category_id },
    orderBy: { sequential_number: 'desc' },
    select: { sequential_number: true },
  })

  return NextResponse.json({ data: (last?.sequential_number ?? 0) + 1 })
})
