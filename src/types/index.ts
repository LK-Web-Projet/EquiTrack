export type EquipmentStatus = 'available' | 'borrowed' | 'broken' | 'maintenance'
export type EquipmentCondition = 'good' | 'fair' | 'poor'
export type ReturnCondition = 'good' | 'broken' | 'damaged'
export type LoanStatus = 'active' | 'returned'

export interface Category {
  id: string
  name: string
  code: string
  icon: string
  color: string
  description?: string
  created_at: string
}

export interface Department {
  id: string
  name: string
  color?: string
  description?: string
  created_at: string
}

export interface Employee {
  id: string
  name: string
  department_id?: string
  phone?: string
  is_active: boolean
  created_at: string
  department?: Department
}

export interface Equipment {
  id: string
  category_id: string
  sequential_number: number
  display_number: string
  serial_number?: string
  status: EquipmentStatus
  condition: EquipmentCondition
  description?: string
  location?: string
  acquisition_date?: string
  created_at: string
  updated_at: string
  category?: Category
}

export interface Loan {
  id: string
  employee_id: string
  checkout_date: string
  checkout_time: string
  expected_return_date?: string
  return_date?: string
  return_time?: string
  checkout_notes?: string
  return_notes?: string
  processed_by?: string
  status: LoanStatus
  created_at: string
  employee?: Employee
  items?: LoanItem[]
}

export interface LoanItem {
  id: string
  loan_id: string
  equipment_id: string
  return_condition?: ReturnCondition
  return_notes?: string
  equipment?: Equipment
}

export interface CategoryStats {
  category: Category
  total: number
  available: number
  borrowed: number
  broken: number
  maintenance: number
}

export interface DashboardStats {
  total: number
  available: number
  borrowed: number
  broken: number
  maintenance: number
  active_loans: number
}
