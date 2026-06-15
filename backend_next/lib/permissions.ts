export const PERMISSIONS = {
  MANAGE_FARMS:     'manage_farms',
  MANAGE_PARCELLES: 'manage_parcelles',
  MANAGE_KITS:      'manage_kits',
  VIEW_REPORTS:     'view_reports',
  MANAGE_MEMBERS:   'manage_members',
  MANAGE_ROLES:     'manage_roles',
} as const

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as string[]
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const DEFAULT_ROLES: { nom: string; base_role: string; permissions: string[] }[] = [
  {
    nom:         'Gérant',
    base_role:   'gerant',
    permissions: ALL_PERMISSIONS,
  },
  {
    nom:         'Administrateur',
    base_role:   'admin',
    permissions: ['manage_farms', 'manage_parcelles', 'manage_kits', 'view_reports', 'manage_members'],
  },
  {
    nom:         'Agriculteur',
    base_role:   'farmer',
    permissions: ['view_reports'],
  },
]

/** Vérifie si un user a une permission via son company_role */
export async function hasPermission(
  pool: import('pg').Pool,
  userId: string | number,
  permission: string
): Promise<boolean> {
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM role_permission rp
     JOIN users u ON u.company_role_id = rp.role_id
     WHERE u.id = $1 AND rp.permission_key = $2`,
    [Number(userId), permission]
  )
  return parseInt(res.rows[0].count, 10) > 0
}
