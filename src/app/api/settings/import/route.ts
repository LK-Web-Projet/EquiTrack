import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'
import { parseDateOnly } from '@/lib/api-shape'
import { settingsImportSchema, validateBody } from '@/lib/validation'

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json()
  const { data, error } = validateBody(settingsImportSchema, body)
  if (error) return error
  const { categories, departments, employees, equipment } = data

  let count = 0

  await prisma.$transaction(async (tx) => {
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        await tx.categories.upsert({ where: { id: cat.id }, create: cat, update: cat })
        count++
      }
    }
    if (Array.isArray(departments)) {
      for (const dept of departments) {
        await tx.departments.upsert({ where: { id: dept.id }, create: dept, update: dept })
        count++
      }
    }
    if (Array.isArray(employees)) {
      for (const emp of employees) {
        const { department: _department, ...rest } = emp
        await tx.employees.upsert({ where: { id: rest.id }, create: rest, update: rest })
        count++
      }
    }
    if (Array.isArray(equipment)) {
      for (const eq of equipment) {
        const { category: _category, ...rest } = eq
        const row = { ...rest, acquisition_date: parseDateOnly(rest.acquisition_date) ?? null }
        await tx.equipment.upsert({ where: { id: row.id }, create: row, update: row })
        count++
      }
    }
  })

  return NextResponse.json({ count })
})
