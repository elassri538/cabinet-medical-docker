// server/db.js — MySQL connection pool + auto-seed with hashed passwords
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'cabinet_medical',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// ── Seed demo data on first run ──
export async function seedDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
    if (rows[0].cnt > 0) {
      await conn.commit();
      return;
    }

  const h = (pwd) => bcrypt.hashSync(pwd, 10);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const users = [
    ['admin-1',  'admin@cabinet.fr',  h('admin123'),   'admin',     'Admin',   'Système',  '0600000000', null,  null, null, null, null],
    ['doc-1',    'dupont@cabinet.fr',  h('doctor123'),  'doctor',    'Jean',    'Dupont',   '0612345678', null,  null, null, null, 'Médecine Générale'],
    ['doc-2',    'martin@cabinet.fr',  h('doctor123'),  'doctor',    'Claire',  'Martin',   '0623456789', null,  null, null, null, 'Médecine Générale'],
    ['sec-1',    'marie@cabinet.fr',   h('secret123'),  'secretary', 'Marie',   'Laurent',  '0634567890', null,  null, null, null, null],
    ['pat-1',    'ahmed@email.com',    h('patient123'), 'patient',   'Ahmed',   'Benali',   '0645678901', '1985-03-15', '12 Rue des Lilas, 75011 Paris', 'A+', '["Pénicilline"]', null],
    ['pat-2',    'sophie@email.com',   h('patient123'), 'patient',   'Sophie',  'Dubois',   '0656789012', '1990-07-22', '8 Avenue Victor Hugo, 75016 Paris', 'O-', '[]', null],
    ['pat-3',    'karim@email.com',    h('patient123'), 'patient',   'Karim',   'Hassan',   '0667890123', '1978-11-30', '45 Boulevard Haussmann, 75009 Paris', 'B+', '["Aspirine","Sulfamides"]', null],
  ];

  await conn.query(
    `INSERT INTO users (id,email,password_hash,role,first_name,last_name,phone,date_of_birth,address,blood_type,allergies,specialization) VALUES ?`,
    [users]
  );

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const appointments = [
    ['apt-1', 'pat-1', 'doc-1', today,     '09:00', '09:30', 'confirmed', 'Douleur au dos',       null],
    ['apt-2', 'pat-2', 'doc-1', today,     '09:30', '10:00', 'pending',   'Consultation annuelle', null],
    ['apt-3', 'pat-3', 'doc-2', today,     '10:00', '10:30', 'confirmed', 'Suivi hypertension',    null],
    ['apt-4', 'pat-1', 'doc-1', tomorrow,  '14:00', '14:30', 'pending',   'Renouvellement ordonnance', null],
    ['apt-5', 'pat-2', 'doc-2', tomorrow,  '11:00', '11:30', 'cancelled', 'Fièvre',                null],
    ['apt-old-1', 'pat-1', 'doc-1', '2025-05-15', '09:00', '09:30', 'completed', 'Consultation ancienne', 'cons-1'],
    ['apt-old-2', 'pat-3', 'doc-2', '2025-05-20', '10:00', '10:30', 'completed', 'Suivi ancien', 'cons-2'],
  ];

  await conn.query(
    `INSERT INTO appointments (id,patient_id,doctor_id,date,start_time,end_time,status,reason,consultation_id) VALUES ?`,
    [appointments]
  );

  const consultations = [
    ['cons-1', 'apt-old-1', 'pat-1', 'doc-1', '2025-05-15', 1,
     'Patient présentant des douleurs lombaires depuis 2 semaines.',
     'Lombalgie commune',
     '[{"name":"Paracétamol","dosage":"1g","duration":"7 jours","instructions":"3 fois par jour si douleur"},{"name":"Myorelaxant","dosage":"4mg","duration":"5 jours","instructions":"1 comprimé le soir"}]',
     'Repos recommandé.'],
    ['cons-2', 'apt-old-2', 'pat-3', 'doc-2', '2025-05-20', 1,
     'Contrôle tension artérielle. PA: 14/8.',
     'HTA contrôlée',
     '[{"name":"Amlodipine","dosage":"5mg","duration":"3 mois","instructions":"1 comprimé par jour"}]',
     'Continuer le traitement.'],
  ];

  await conn.query(
    `INSERT INTO consultations (id,appointment_id,patient_id,doctor_id,date,is_present,report,diagnosis,prescription,notes) VALUES ?`,
    [consultations]
  );

    await conn.commit();
    console.log('✅ Database seeded with demo data');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ── Helpers: camelCase ↔ snake_case ──
export function toCamel(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

export function toSnake(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    if (v !== undefined) out[snake] = v;
  }
  return out;
}
