import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const databaseUrl = 'postgresql://postgres:XjBDQBWCrKKuee6V@db.ptvphirdxtxviqlvafar.supabase.co:6543/postgres';
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
  const databaseUrl ='postgresql://postgres:XjBDQBWCrKKuee6V@db.ptvphirdxtxviqlvafar.supabase.co:6543/postgres';
  const adminEmail = 'rainie.coetzer@gmail.com';
  const adminPassword = 'Wharfedale01';

  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Ensure pgcrypto is enabled for native Supabase hashing
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    
    // Hash natively inside the database using crypt and gen_salt
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, role) 
       VALUES ($1, crypt($2, gen_salt('bf', 12)), 'admin') 
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = crypt($2, gen_salt('bf', 12))`,
      [adminEmail, adminPassword]
    );
    console.log(`✓ Admin user created/updated: ${adminEmail}`);
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
