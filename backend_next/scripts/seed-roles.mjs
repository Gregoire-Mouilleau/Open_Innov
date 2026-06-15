import pg from 'pg';

const client = new pg.Client({
  host: 'localhost', port: 5432,
  database: 'techfarm', user: 'techfarm', password: 'techfarm123',
});
await client.connect();

// 1. Passer l'user admin → gerant
await client.query(`UPDATE users SET role = 'gerant' WHERE email = 'gregoire.mouilleau@gmail.com'`);
console.log('✓ user role → gerant');

// 2. Créer les rôles par défaut pour la company 1 (si pas encore créés)
const ALL = ['manage_farms','manage_parcelles','manage_kits','view_reports','manage_members','manage_roles'];

const defaultRoles = [
  { nom: 'Gérant',         base_role: 'gerant',  perms: ALL },
  { nom: 'Administrateur', base_role: 'admin',   perms: ALL.filter(p => p !== 'manage_roles') },
  { nom: 'Agriculteur',    base_role: 'farmer',  perms: ['view_reports'] },
];

for (const r of defaultRoles) {
  // Upsert le rôle
  const res = await client.query(
    `INSERT INTO company_role (company_id, nom, base_role)
     VALUES (1, $1, $2)
     ON CONFLICT (company_id, nom) DO UPDATE SET base_role = EXCLUDED.base_role
     RETURNING id`,
    [r.nom, r.base_role]
  );
  const roleId = res.rows[0].id;

  // Resynchro permissions
  await client.query(`DELETE FROM role_permission WHERE role_id = $1`, [roleId]);
  for (const perm of r.perms) {
    await client.query(
      `INSERT INTO role_permission (role_id, permission_key) VALUES ($1, $2)`,
      [roleId, perm]
    );
  }
  console.log(`✓ rôle "${r.nom}" (id=${roleId}) → ${r.perms.length} permissions`);
}

// 3. Assigner le rôle Gérant à l'user gregoire
const gerantRow = await client.query(
  `SELECT id FROM company_role WHERE company_id = 1 AND base_role = 'gerant'`
);
if (gerantRow.rows.length) {
  const gerantRoleId = gerantRow.rows[0].id;
  await client.query(
    `UPDATE users SET company_role_id = $1 WHERE email = 'gregoire.mouilleau@gmail.com'`,
    [gerantRoleId]
  );
  console.log(`✓ user company_role_id → ${gerantRoleId}`);
}

await client.end();
console.log('\nTout est prêt. Reconnecte-toi.');
