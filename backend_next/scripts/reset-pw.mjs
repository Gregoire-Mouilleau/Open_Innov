import bcrypt from 'bcryptjs';
import pg from 'pg';

const hash = await bcrypt.hash('password', 12);
const client = new pg.Client({
  host: 'localhost', port: 5432,
  database: 'techfarm', user: 'techfarm', password: 'techfarm123',
});
await client.connect();
await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
  hash, 'gregoire.mouilleau@gmail.com',
]);
console.log('Mot de passe réinitialisé à "password"');
console.log('Hash:', hash);
await client.end();
