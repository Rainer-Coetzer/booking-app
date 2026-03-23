import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    await pool.query(sql);
    console.log('✓ Database migration complete');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@studio.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const hash = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [adminEmail, hash]
    );
    console.log(`✓ Admin user created: ${adminEmail}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const command = process.argv[2];
if (command === 'migrate') {
  migrate();
} else if (command === 'seed') {
  seedAdmin();
} else {
  migrate().then(() => seedAdmin());
}
