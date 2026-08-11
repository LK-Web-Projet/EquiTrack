import { createBrowserClient } from '@supabase/ssr'
import type { Category, Department, Employee, Equipment, Loan } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// ─── Categories ───────────────────────────────────────────────
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export const createCategory = async (cat: Omit<Category, 'id' | 'created_at'>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(cat)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ─── Departments ──────────────────────────────────────────────
export const getDepartments = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export const createDepartment = async (dep: Omit<Department, 'id' | 'created_at'>): Promise<Department> => {
  const { data, error } = await supabase
    .from('departments')
    .insert(dep)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateDepartment = async (id: string, updates: Partial<Department>): Promise<Department> => {
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteDepartment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

// ─── Employees ────────────────────────────────────────────────
export const getEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*, department:departments(*)')
    .order('name')
  if (error) throw error
  return data ?? []
}

export const getEmployee = async (id: string): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*, department:departments(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createEmployee = async (emp: Omit<Employee, 'id' | 'created_at' | 'department'>): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .insert(emp)
    .select('*, department:departments(*)')
    .single()
  if (error) throw error
  return data
}

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<Employee> => {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select('*, department:departments(*)')
    .single()
  if (error) throw error
  return data
}

export const deleteEmployee = async (id: string): Promise<void> => {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

// ─── Equipment ────────────────────────────────────────────────
export const getEquipment = async (filters?: {
  category_id?: string
  status?: string
}): Promise<Equipment[]> => {
  let query = supabase
    .from('equipment')
    .select('*, category:categories(*)')
    .order('category_id')
    .order('sequential_number')
  if (filters?.category_id) query = query.eq('category_id', filters.category_id)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export const getEquipmentItem = async (id: string): Promise<Equipment> => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getNextSequentialNumber = async (category_id: string): Promise<number> => {
  const { data, error } = await supabase
    .from('equipment')
    .select('sequential_number')
    .eq('category_id', category_id)
    .order('sequential_number', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return 1
  return data[0].sequential_number + 1
}

export const createEquipment = async (
  item: Omit<Equipment, 'id' | 'created_at' | 'updated_at' | 'category'>
): Promise<Equipment> => {
  const { data, error } = await supabase
    .from('equipment')
    .insert(item)
    .select('*, category:categories(*)')
    .single()
  if (error) throw error
  return data
}

export const updateEquipment = async (id: string, updates: Partial<Equipment>): Promise<Equipment> => {
  const { data, error } = await supabase
    .from('equipment')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()
  if (error) throw error
  return data
}

export const deleteEquipment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) throw error
}

// ─── Loans ────────────────────────────────────────────────────
export const getLoans = async (status?: LoanStatus): Promise<Loan[]> => {
  let query = supabase
    .from('loans')
    .select('*, employee:employees(*, department:departments(*)), items:loan_items(*, equipment:equipment(*, category:categories(*)))')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export const getLoan = async (id: string): Promise<Loan> => {
  const { data, error } = await supabase
    .from('loans')
    .select('*, employee:employees(*, department:departments(*)), items:loan_items(*, equipment:equipment(*, category:categories(*)))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createLoan = async (
  loan: Omit<Loan, 'id' | 'created_at' | 'employee' | 'items'>,
  equipmentIds: string[]
): Promise<Loan> => {
  // Écriture atomique côté base (fonction RPC transactionnelle) : soit
  // le prêt + ses items + le statut des équipements passent tous ensemble,
  // soit rien n'est appliqué en cas d'erreur.
  const { data: loanId, error } = await supabase.rpc('create_loan_with_items', {
    p_employee_id: loan.employee_id,
    p_checkout_date: loan.checkout_date,
    p_checkout_time: loan.checkout_time,
    p_expected_return_date: loan.expected_return_date ?? null,
    p_checkout_notes: loan.checkout_notes ?? null,
    p_processed_by: loan.processed_by ?? null,
    p_equipment_ids: equipmentIds,
  })
  if (error) throw error

  return getLoan(loanId as string)
}

export const returnLoan = async (
  loanId: string,
  returnData: {
    return_date: string
    return_time: string
    return_notes?: string
    items: Array<{ equipment_id: string; return_condition: ReturnCondition; return_notes?: string }>
  }
): Promise<Loan> => {
  const { error } = await supabase.rpc('return_loan_with_items', {
    p_loan_id: loanId,
    p_return_date: returnData.return_date,
    p_return_time: returnData.return_time,
    p_return_notes: returnData.return_notes ?? null,
    p_items: returnData.items,
  })
  if (error) throw error

  return getLoan(loanId)
}

// ─── Dashboard Stats ──────────────────────────────────────────
export const getDashboardStats = async () => {
  const [equipmentRes, loansRes] = await Promise.all([
    supabase.from('equipment').select('status, category_id'),
    supabase.from('loans').select('id').eq('status', 'active'),
  ])
  if (equipmentRes.error) throw equipmentRes.error
  if (loansRes.error) throw loansRes.error

  const equipment = equipmentRes.data ?? []
  return {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    borrowed: equipment.filter(e => e.status === 'borrowed').length,
    broken: equipment.filter(e => e.status === 'broken').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    active_loans: loansRes.data?.length ?? 0,
  }
}

type LoanStatus = 'active' | 'returned'
type ReturnCondition = 'good' | 'broken' | 'damaged'

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

export const getIncidents = async (equipment_id: string): Promise<Incident[]> => {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('equipment_id', equipment_id)
    .order('reported_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const createIncident = async (
  inc: Omit<Incident, 'id' | 'created_at'>
): Promise<Incident> => {
  const { data, error } = await supabase
    .from('incidents')
    .insert(inc)
    .select()
    .single()
  if (error) throw error
  return data
}

export const resolveIncident = async (id: string): Promise<Incident> => {
  const { data, error } = await supabase
    .from('incidents')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteIncident = async (id: string): Promise<void> => {
  const { error } = await supabase.from('incidents').delete().eq('id', id)
  if (error) throw error
}

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

export const getMaintenances = async (equipment_id: string): Promise<Maintenance[]> => {
  const { data, error } = await supabase
    .from('maintenances')
    .select('*')
    .eq('equipment_id', equipment_id)
    .order('performed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const createMaintenance = async (
  m: Omit<Maintenance, 'id' | 'created_at'>
): Promise<Maintenance> => {
  const { data, error } = await supabase
    .from('maintenances')
    .insert(m)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteMaintenance = async (id: string): Promise<void> => {
  const { error } = await supabase.from('maintenances').delete().eq('id', id)
  if (error) throw error
}

// ─── Photos équipement ────────────────────────────────────────
export interface EquipmentPhoto {
  id: string
  equipment_id: string
  url: string
  created_at: string
}

const EQUIPMENT_PHOTOS_BUCKET = 'equipment-photos'

export const getEquipmentPhotos = async (equipment_id: string): Promise<EquipmentPhoto[]> => {
  const { data, error } = await supabase
    .from('equipment_photos')
    .select('*')
    .eq('equipment_id', equipment_id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// dataUrlToBlob : convertit un data URL (base64, produit par CameraCapture)
// en Blob uploadable vers Supabase Storage.
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl)
  return res.blob()
}

export const uploadEquipmentPhoto = async (
  equipmentId: string,
  file: Blob | string
): Promise<EquipmentPhoto> => {
  const blob = typeof file === 'string' ? await dataUrlToBlob(file) : file
  const path = `${equipmentId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(EQUIPMENT_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from(EQUIPMENT_PHOTOS_BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('equipment_photos')
    .insert({ equipment_id: equipmentId, url: urlData.publicUrl })
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteEquipmentPhoto = async (photo: EquipmentPhoto): Promise<void> => {
  const marker = `/${EQUIPMENT_PHOTOS_BUCKET}/`
  const idx = photo.url.indexOf(marker)
  if (idx !== -1) {
    const path = photo.url.slice(idx + marker.length)
    await supabase.storage.from(EQUIPMENT_PHOTOS_BUCKET).remove([path])
  }
  const { error } = await supabase.from('equipment_photos').delete().eq('id', photo.id)
  if (error) throw error
}
