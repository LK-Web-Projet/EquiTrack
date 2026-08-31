import 'server-only'

// Prisma renvoie les colonnes @db.Date / @db.Time comme des objets Date.
// L'app (comparaisons de chaînes, date-fns, inputs HTML) attend les mêmes
// chaînes "YYYY-MM-DD" / "HH:MM:SS" que renvoyait PostgREST.
export function toDateStr(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toISOString().slice(0, 10)
}

export function toTimeStr(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toISOString().slice(11, 19)
}

export function toNumber(d: unknown): number | null {
  if (d === null || d === undefined) return null
  return Number(d)
}

// L'inverse de toDateStr/toTimeStr : le driver adapter Prisma 7 (@prisma/adapter-pg)
// exige de vrais objets Date pour les colonnes @db.Date/@db.Time, il ne coerce
// plus les chaînes "YYYY-MM-DD"/"HH:MM:SS" reçues du client comme le faisait
// l'ancien moteur binaire.
export function parseDateOnly(s: string | null | undefined): Date | null | undefined {
  if (s === undefined) return undefined
  if (s === null || s === '') return null
  return new Date(`${s}T00:00:00.000Z`)
}

export function parseTimeOnly(s: string | null | undefined): Date | null | undefined {
  if (s === undefined) return undefined
  if (s === null || s === '') return null
  return new Date(`1970-01-01T${s}Z`)
}

type EmployeeWithDept = { departments?: unknown } & Record<string, unknown>

export function shapeEmployee<T extends EmployeeWithDept>(emp: T) {
  const { departments, ...rest } = emp
  return { ...rest, department: departments ?? undefined }
}

type EquipmentWithCat = {
  categories?: unknown
  acquisition_date?: Date | null
} & Record<string, unknown>

export function shapeEquipment<T extends EquipmentWithCat>(eq: T) {
  const { categories, acquisition_date, ...rest } = eq
  return { ...rest, category: categories ?? undefined, acquisition_date: toDateStr(acquisition_date) }
}

type LoanItemWithEquipment = {
  equipment?: EquipmentWithCat
} & Record<string, unknown>

type LoanWithRelations = {
  employees?: EmployeeWithDept | null
  loan_items?: LoanItemWithEquipment[]
  checkout_date?: Date | null
  checkout_time?: Date | null
  expected_return_date?: Date | null
  return_date?: Date | null
  return_time?: Date | null
} & Record<string, unknown>

export function shapeLoan<T extends LoanWithRelations>(loan: T) {
  const { employees, loan_items, checkout_date, checkout_time, expected_return_date, return_date, return_time, ...rest } = loan
  return {
    ...rest,
    checkout_date: toDateStr(checkout_date),
    checkout_time: toTimeStr(checkout_time),
    expected_return_date: toDateStr(expected_return_date),
    return_date: toDateStr(return_date),
    return_time: toTimeStr(return_time),
    employee: employees ? shapeEmployee(employees) : undefined,
    items: (loan_items ?? []).map(item => {
      const { equipment, ...itemRest } = item
      return { ...itemRest, equipment: equipment ? shapeEquipment(equipment) : undefined }
    }),
  }
}

export function shapeMaintenance<T extends { performed_at?: Date | null; cost?: unknown } & Record<string, unknown>>(m: T) {
  const { performed_at, cost, ...rest } = m
  return { ...rest, performed_at: toDateStr(performed_at), cost: toNumber(cost) }
}
