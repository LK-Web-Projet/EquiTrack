import type { Category, Department, Employee, Equipment, Loan, LoanStatus, ReturnCondition } from '@/types'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
  return (body.data ?? body) as T
}

// ─── Categories ───────────────────────────────────────────────
export const getCategories = (): Promise<Category[]> => apiFetch('/api/categories')

export const createCategory = (cat: Omit<Category, 'id' | 'created_at'>): Promise<Category> =>
  apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(cat) })

export const updateCategory = (id: string, updates: Partial<Category>): Promise<Category> =>
  apiFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deleteCategory = (id: string): Promise<void> =>
  apiFetch(`/api/categories/${id}`, { method: 'DELETE' })

// ─── Departments ──────────────────────────────────────────────
export const getDepartments = (): Promise<Department[]> => apiFetch('/api/departments')

export const createDepartment = (dep: Omit<Department, 'id' | 'created_at'>): Promise<Department> =>
  apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(dep) })

export const updateDepartment = (id: string, updates: Partial<Department>): Promise<Department> =>
  apiFetch(`/api/departments/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deleteDepartment = (id: string): Promise<void> =>
  apiFetch(`/api/departments/${id}`, { method: 'DELETE' })

// ─── Employees ────────────────────────────────────────────────
export const getEmployees = (): Promise<Employee[]> => apiFetch('/api/employees')

export const getEmployee = (id: string): Promise<Employee> => apiFetch(`/api/employees/${id}`)

export const createEmployee = (emp: Omit<Employee, 'id' | 'created_at' | 'department'>): Promise<Employee> =>
  apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(emp) })

export const updateEmployee = (id: string, updates: Partial<Employee>): Promise<Employee> =>
  apiFetch(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deleteEmployee = (id: string): Promise<void> =>
  apiFetch(`/api/employees/${id}`, { method: 'DELETE' })

// ─── Equipment ────────────────────────────────────────────────
export const getEquipment = (filters?: { category_id?: string; status?: string }): Promise<Equipment[]> => {
  const qs = new URLSearchParams()
  if (filters?.category_id) qs.set('category_id', filters.category_id)
  if (filters?.status) qs.set('status', filters.status)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiFetch(`/api/equipment${suffix}`)
}

export const getEquipmentItem = (id: string): Promise<Equipment> => apiFetch(`/api/equipment/${id}`)

export const getNextSequentialNumber = (category_id: string): Promise<number> =>
  apiFetch(`/api/equipment/next-sequential-number?category_id=${category_id}`)

export const createEquipment = (
  item: Omit<Equipment, 'id' | 'created_at' | 'updated_at' | 'category'>
): Promise<Equipment> => apiFetch('/api/equipment', { method: 'POST', body: JSON.stringify(item) })

export const updateEquipment = (id: string, updates: Partial<Equipment>): Promise<Equipment> =>
  apiFetch(`/api/equipment/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deleteEquipment = (id: string): Promise<void> =>
  apiFetch(`/api/equipment/${id}`, { method: 'DELETE' })

// ─── Loans ────────────────────────────────────────────────────
export const getLoans = (status?: LoanStatus): Promise<Loan[]> =>
  apiFetch(`/api/loans${status ? `?status=${status}` : ''}`)

export const getLoan = (id: string): Promise<Loan> => apiFetch(`/api/loans/${id}`)

export const createLoan = (
  loan: Omit<Loan, 'id' | 'created_at' | 'employee' | 'items'>,
  equipmentIds: string[]
): Promise<Loan> =>
  apiFetch('/api/loans', {
    method: 'POST',
    body: JSON.stringify({ ...loan, equipment_ids: equipmentIds }),
  })

export const returnLoan = (
  loanId: string,
  returnData: {
    return_date: string
    return_time: string
    return_notes?: string
    items: Array<{ equipment_id: string; return_condition: ReturnCondition; return_notes?: string }>
  }
): Promise<Loan> =>
  apiFetch(`/api/loans/${loanId}/return`, { method: 'POST', body: JSON.stringify(returnData) })

// ─── Dashboard Stats ──────────────────────────────────────────
export const getDashboardStats = (): Promise<{
  total: number
  available: number
  borrowed: number
  broken: number
  maintenance: number
  active_loans: number
}> => apiFetch('/api/dashboard/stats')

// ─── Incidents ────────────────────────────────────────────────
export interface Incident {
  id: string
  equipment_id: string
  reported_at: string
  description: string
  reported_by?: string
  resolved_at?: string
  created_at: string
}

export const getIncidents = (equipment_id: string): Promise<Incident[]> =>
  apiFetch(`/api/incidents?equipment_id=${equipment_id}`)

export const getRecentIncidents = (limit: number): Promise<Incident[]> =>
  apiFetch(`/api/incidents?limit=${limit}`)

export const createIncident = (inc: Omit<Incident, 'id' | 'created_at'>): Promise<Incident> =>
  apiFetch('/api/incidents', { method: 'POST', body: JSON.stringify(inc) })

export const resolveIncident = (id: string): Promise<Incident> =>
  apiFetch(`/api/incidents/${id}`, { method: 'PATCH' })

export const deleteIncident = (id: string): Promise<void> =>
  apiFetch(`/api/incidents/${id}`, { method: 'DELETE' })

// ─── Maintenances ─────────────────────────────────────────────
export interface Maintenance {
  id: string
  equipment_id: string
  performed_at: string
  description: string
  performed_by?: string
  cost?: number
  created_at: string
}

export const getMaintenances = (equipment_id: string): Promise<Maintenance[]> =>
  apiFetch(`/api/maintenances?equipment_id=${equipment_id}`)

export const createMaintenance = (m: Omit<Maintenance, 'id' | 'created_at'>): Promise<Maintenance> =>
  apiFetch('/api/maintenances', { method: 'POST', body: JSON.stringify(m) })

export const deleteMaintenance = (id: string): Promise<void> =>
  apiFetch(`/api/maintenances/${id}`, { method: 'DELETE' })

// ─── Photos équipement ────────────────────────────────────────
export interface EquipmentPhoto {
  id: string
  equipment_id: string
  url: string
  created_at: string
}

const dataUrlFromBlob = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

export const getEquipmentPhotos = (equipment_id: string): Promise<EquipmentPhoto[]> =>
  apiFetch(`/api/equipment/${equipment_id}/photos`)

export const uploadEquipmentPhoto = async (
  equipmentId: string,
  file: Blob | string
): Promise<EquipmentPhoto> => {
  const dataUrl = typeof file === 'string' ? file : await dataUrlFromBlob(file)
  return apiFetch(`/api/equipment/${equipmentId}/photos`, {
    method: 'POST',
    body: JSON.stringify({ dataUrl }),
  })
}

export const deleteEquipmentPhoto = (photo: EquipmentPhoto): Promise<void> =>
  apiFetch(`/api/equipment/${photo.equipment_id}/photos/${photo.id}`, { method: 'DELETE' })

// ─── Historique de prêts d'un équipement ───────────────────────
export interface EquipmentLoanHistoryItem {
  loan_id: string
  return_condition?: string
  loan: {
    status: string
    checkout_date: string
    return_date?: string
    employee: { name: string; department?: { name: string } }
  }
}

export const getEquipmentLoanHistory = (equipment_id: string): Promise<EquipmentLoanHistoryItem[]> =>
  apiFetch(`/api/equipment/${equipment_id}/loan-history`)
