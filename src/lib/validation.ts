import 'server-only'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const uuid = z.string().uuid('Identifiant invalide')
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #rrggbb)')
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)')

export const equipmentStatusEnum = z.enum(['available', 'borrowed', 'broken', 'maintenance'])
export const equipmentConditionEnum = z.enum(['good', 'fair', 'poor'])
export const checklistPriorityEnum = z.enum(['low', 'normal', 'critical'])

const checklistRatingSchema = z.object({
  checklist_item_id: uuid,
  state: equipmentConditionEnum,
}).strict()

// ─── Categories ───────────────────────────────────────────────
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  code: z.string().trim().min(1, 'Code requis').max(20),
  icon: z.string().trim().min(1).max(8).optional(),
  color: hexColor.optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  camptrack_service_ids: z.array(z.string().trim().min(1)).max(30).optional(),
  camptrack_service_names: z.array(z.string().trim().min(1)).max(30).optional(),
}).strict()
export const categoryUpdateSchema = categoryCreateSchema.partial()

// ─── Departments ──────────────────────────────────────────────
export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  color: hexColor.optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
}).strict()
export const departmentUpdateSchema = departmentCreateSchema.partial()

// ─── Employees ────────────────────────────────────────────────
export const employeeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(150),
  department_id: uuid.optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  is_active: z.boolean().optional(),
}).strict()
export const employeeUpdateSchema = employeeCreateSchema.partial()

// ─── Equipment ────────────────────────────────────────────────
// Le numéro séquentiel / display_number / catégorie ne sont modifiables
// qu'à la création : les changer après coup casserait la contrainte unique
// (category_id, sequential_number) sans recalcul — cf. audit sécurité.
export const equipmentCreateSchema = z.object({
  category_id: uuid,
  sequential_number: z.number().int().positive(),
  display_number: z.string().trim().min(1).max(30),
  serial_number: z.string().trim().max(100).optional(),
  status: equipmentStatusEnum.optional(),
  condition: equipmentConditionEnum.optional(),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  acquisition_date: isoDateOnly.optional().nullable(),
}).strict()

export const equipmentUpdateSchema = z.object({
  serial_number: z.string().trim().max(100).optional(),
  status: equipmentStatusEnum.optional(),
  condition: equipmentConditionEnum.optional(),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  acquisition_date: isoDateOnly.optional().nullable(),
}).strict()

// ─── Incidents ────────────────────────────────────────────────
export const incidentCreateSchema = z.object({
  equipment_id: uuid,
  description: z.string().trim().min(1, 'Description requise').max(2000),
  reported_by: z.string().trim().max(150).optional(),
  reported_at: z.string().datetime().optional(),
}).strict()

// ─── Maintenances ─────────────────────────────────────────────
export const maintenanceCreateSchema = z.object({
  equipment_id: uuid,
  performed_at: isoDateOnly,
  description: z.string().trim().min(1, 'Description requise').max(2000),
  performed_by: z.string().trim().max(150).optional(),
  cost: z.number().nonnegative().optional(),
  checklist: z.array(checklistRatingSchema).max(50).optional(),
}).strict()

// ─── Checklist d'inspection (par catégorie) ────────────────────
export const checklistItemCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  priority: checklistPriorityEnum,
  order: z.number().int().optional(),
}).strict()
export const checklistItemUpdateSchema = checklistItemCreateSchema.partial().extend({
  active: z.boolean().optional(),
})

// ─── Loans ────────────────────────────────────────────────────
export const loanCreateSchema = z.object({
  employee_id: uuid,
  checkout_date: isoDateOnly,
  checkout_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Heure invalide'),
  expected_return_date: isoDateOnly.optional().nullable(),
  checkout_notes: z.string().trim().max(2000).optional().nullable(),
  processed_by: z.string().trim().max(150).optional().nullable(),
  equipment_ids: z.array(uuid).min(1, 'Aucun équipement sélectionné'),
}).strict()

export const loanReturnSchema = z.object({
  return_date: isoDateOnly,
  return_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Heure invalide'),
  return_notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(z.object({
    equipment_id: uuid,
    return_condition: z.enum(['good', 'broken', 'damaged']),
    return_notes: z.string().trim().max(2000).optional().nullable(),
    checklist: z.array(checklistRatingSchema).max(50).optional(),
  }).strict()).min(1, 'Aucun équipement à retourner'),
}).strict()

// ─── Intégration (CampTrack → EquiTrack) : prêt externe ─────────
export const externalLoanCreateSchema = z.object({
  campagne_id: z.string().trim().min(1, 'campagne_id requis').max(60),
  campagne_nom: z.string().trim().max(200).optional().nullable(),
  prestataire_id: z.string().trim().min(1, 'prestataire_id requis').max(60),
  prestataire_nom: z.string().trim().min(1, 'Nom du prestataire requis').max(200),
  service_id: z.string().trim().min(1, 'service_id requis').max(60),
  checkout_date: isoDateOnly,
  checkout_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Heure invalide'),
  expected_return_date: isoDateOnly.optional().nullable(),
  checkout_notes: z.string().trim().max(2000).optional().nullable(),
  equipment_ids: z.array(uuid).min(1, 'Aucun équipement sélectionné'),
}).strict()

// ─── Setup initial : création du tout premier compte admin ─────
// Pas de champ "role" : ce endpoint crée toujours un admin, et seulement
// si la table users est vide (cf. src/app/api/setup/route.ts).
export const setupAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  full_name: z.string().trim().max(150).optional(),
}).strict()

// ─── Admin: création d'utilisateur ─────────────────────────────
export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  full_name: z.string().trim().max(150).optional(),
  role: z.enum(['admin', 'user']).optional(),
}).strict()

// ─── Admin: réinitialisation du mot de passe d'un utilisateur ──
export const adminPasswordResetSchema = z.object({
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
}).strict()

// ─── Changement de mot de passe (self-service) ─────────────────
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  new_password: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
}).strict()

/**
 * Parse `body` avec `schema` ; renvoie soit les données validées, soit une
 * réponse 400 prête à `return`-er directement depuis le handler de route.
 */
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Données invalides'
    return { error: NextResponse.json({ error: message }, { status: 400 }) }
  }
  return { data: result.data }
}
