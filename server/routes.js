// server/routes.js — All API routes (auth, users, appointments, consultations)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, toCamel, toSnake } from './db.js';
import { authRequired, roleAllowed } from './middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

// Helper: query + map to camelCase
async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows.map(toCamel);
}
async function qOne(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows.length ? toCamel(rows[0]) : null;
}

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await qOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const { passwordHash, ...safe } = user;
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: safe, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════
router.get('/users', authRequired, async (req, res) => {
  try {
    let sql = 'SELECT * FROM users';
    const params = [];
    if (req.query.role) { sql += ' WHERE role = ?'; params.push(req.query.role); }
    const rows = await q(sql, params);
    res.json(rows.map(u => { const { passwordHash, ...safe } = u; return safe; }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users/:id', authRequired, async (req, res) => {
  try {
    const user = await qOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public registration creates patients only; other roles need an authenticated admin.
router.post('/users', async (req, res) => {
  try {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !body.firstName || !body.lastName ||
        typeof body.password !== 'string' || body.password.length < 8) {
      return res.status(400).json({ error: 'Nom, email et mot de passe (8 caractères minimum) requis.' });
    }
    const requestedRole = body.role ?? 'patient';
    if (requestedRole !== 'patient') {
      const bearer = req.headers.authorization;
      let caller;
      try { caller = jwt.verify(bearer?.startsWith('Bearer ') ? bearer.slice(7) : '', JWT_SECRET); }
      catch { return res.status(403).json({ error: 'Administrateur requis.' }); }
      if (caller.role !== 'admin') return res.status(403).json({ error: 'Administrateur requis.' });
      if (!['doctor', 'secretary', 'admin'].includes(requestedRole)) return res.status(400).json({ error: 'Rôle invalide.' });
    }
    const dup = await qOne('SELECT id FROM users WHERE email = ?', [email]);
    if (dup) return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' });
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(body.password, 10);
    const allergies = Array.isArray(body.allergies) ? body.allergies : [];
    await pool.query(
      `INSERT INTO users (id,email,password_hash,role,first_name,last_name,phone,date_of_birth,address,blood_type,allergies,specialization)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, email, hash, requestedRole, body.firstName, body.lastName,
       body.phone || '', body.dateOfBirth || null, body.address || null,
       body.bloodType || null, JSON.stringify(allergies), body.specialization || null]
    );
    const user = await qOne('SELECT * FROM users WHERE id = ?', [id]);
    const { passwordHash, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', authRequired, async (req, res) => {
  try {
    const db = toSnake(req.body);
    if (db.password) {
      db.password_hash = await bcrypt.hash(db.password, 10);
      delete db.password;
    }
    // Remove fields that shouldn't be updated directly
    delete db.id; delete db.created_at; delete db.email;

    const cols = Object.keys(db);
    if (cols.length === 0) return res.status(400).json({ error: 'Rien à mettre à jour' });
    const vals = [...Object.values(db), req.params.id];
    await pool.query(`UPDATE users SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`, vals);

    const user = await qOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/users/:id', authRequired, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════
// APPOINTMENTS
// ══════════════════════════════════════
router.get('/appointments', authRequired, async (req, res) => {
  try {
    let sql = 'SELECT * FROM appointments';
    const conds = []; const params = [];
    if (req.query.doctorId)  { conds.push('doctor_id = ?');  params.push(req.query.doctorId); }
    if (req.query.patientId) { conds.push('patient_id = ?'); params.push(req.query.patientId); }
    if (req.query.date)      { conds.push('date = ?');       params.push(req.query.date); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY date, start_time';
    const rows = await q(sql, params);
    // Map DB fields to frontend shape
    res.json(rows.map(a => ({
      ...a,
      timeSlot: { start: a.startTime, end: a.endTime },
      patientId: a.patientId, doctorId: a.doctorId, consultationId: a.consultationId,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/appointments', authRequired, async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const slot = body.timeSlot || {};
    const db = {
      id,
      patient_id: body.patientId,
      doctor_id: body.doctorId,
      date: body.date,
      start_time: slot.start,
      end_time: slot.end,
      status: body.status || 'pending',
      reason: body.reason || '',
      consultation_id: body.consultationId || null,
    };
    await pool.query(
      'INSERT INTO appointments (id,patient_id,doctor_id,date,start_time,end_time,status,reason,consultation_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [db.id, db.patient_id, db.doctor_id, db.date, db.start_time, db.end_time, db.status, db.reason, db.consultation_id]
    );
    const row = await qOne('SELECT * FROM appointments WHERE id = ?', [id]);
    res.status(201).json({ ...row, timeSlot: { start: row.startTime, end: row.endTime } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/appointments/:id', authRequired, async (req, res) => {
  try {
    const body = req.body;
    const sets = []; const vals = [];
    if (body.patientId)      { sets.push('patient_id = ?');      vals.push(body.patientId); }
    if (body.doctorId)       { sets.push('doctor_id = ?');       vals.push(body.doctorId); }
    if (body.date)           { sets.push('date = ?');            vals.push(body.date); }
    if (body.status)         { sets.push('status = ?');          vals.push(body.status); }
    if (body.reason !== undefined) { sets.push('reason = ?');    vals.push(body.reason); }
    if (body.consultationId) { sets.push('consultation_id = ?'); vals.push(body.consultationId); }
    if (body.timeSlot) {
      sets.push('start_time = ?', 'end_time = ?');
      vals.push(body.timeSlot.start, body.timeSlot.end);
    }
    if (!sets.length) return res.status(400).json({ error: 'Rien à mettre à jour' });
    vals.push(req.params.id);
    await pool.query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, vals);

    const row = await qOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ ...row, timeSlot: { start: row.startTime, end: row.endTime } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/appointments/:id', authRequired, async (req, res) => {
  try {
    await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════
// CONSULTATIONS
// ══════════════════════════════════════
router.get('/consultations', authRequired, async (req, res) => {
  try {
    let sql = 'SELECT * FROM consultations';
    const conds = []; const params = [];
    if (req.query.patientId) { conds.push('patient_id = ?'); params.push(req.query.patientId); }
    if (req.query.doctorId)  { conds.push('doctor_id = ?');  params.push(req.query.doctorId); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY date DESC';
    const rows = await q(sql, params);
    // Parse JSON prescription
    res.json(rows.map(c => ({
      ...c,
      patientId: c.patientId, doctorId: c.doctorId, appointmentId: c.appointmentId,
      isPresent: !!c.isPresent,
      prescription: typeof c.prescription === 'string' ? JSON.parse(c.prescription) : (c.prescription || []),
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/consultations', authRequired, async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    await pool.query(
      'INSERT INTO consultations (id,appointment_id,patient_id,doctor_id,date,is_present,report,diagnosis,prescription,notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, body.appointmentId, body.patientId, body.doctorId, body.date,
       body.isPresent ? 1 : 0, body.report || '', body.diagnosis || '',
       JSON.stringify(body.prescription || []), body.notes || '']
    );
    const row = await qOne('SELECT * FROM consultations WHERE id = ?', [id]);
    res.status(201).json({
      ...row, isPresent: !!row.isPresent, patientId: row.patientId,
      doctorId: row.doctorId, appointmentId: row.appointmentId,
      prescription: typeof row.prescription === 'string' ? JSON.parse(row.prescription) : (row.prescription || []),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
