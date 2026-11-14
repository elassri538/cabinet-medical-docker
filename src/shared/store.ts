// ============================================================
// Data Store — API + In-Memory Cache (MySQL via Express)
// NO LocalStorage. All data comes from MySQL backend.
// Reads: synchronous from cache (zero component changes)
// Writes: optimistic (update cache, fire API in background)
// ============================================================

import type { AppUser, Patient, Doctor, Secretary, Appointment, Consultation, TimeSlot } from './types';
import { logger } from './logger';

// ── API Base URL ──
const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ── In-Memory Cache ──
let _users: AppUser[] = [];
let _appointments: Appointment[] = [];
let _consultations: Consultation[] = [];
let _token: string | null = null;
let _initialized = false;

// ── API Helpers ──
function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

async function apiGet<T>(path: string): Promise<T[]> {
  const r = await fetch(`${API}${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
  return r.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || r.statusText); }
  return r.json();
}

// (direct API calls for non-bg operations if needed later)

// Fire-and-forget: update cache + call API in background
function bgPut(path: string, body: unknown) {
  fetch(`${API}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
    .catch(err => logger.error('BG PUT failed', { path, err: String(err) }));
}
function bgPost(path: string, body: unknown) {
  fetch(`${API}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
    .catch(err => logger.error('BG POST failed', { path, err: String(err) }));
}
function bgDelete(path: string) {
  fetch(`${API}${path}`, { method: 'DELETE', headers: headers() })
    .catch(err => logger.error('BG DELETE failed', { path, err: String(err) }));
}

// ── Initialize: load all data from MySQL via API ──
export async function initStore(token?: string): Promise<void> {
  if (_initialized && !token) return;
  if (token) _token = token;
  try {
    const [users, appointments, consultations] = await Promise.all([
      apiGet<AppUser>('/users'),
      apiGet<Appointment>('/appointments'),
      apiGet<Consultation>('/consultations'),
    ]);
    _users = users;
    _appointments = appointments;
    _consultations = consultations;
    _initialized = true;
    logger.info('Store initialized from MySQL', { users: users.length, appointments: appointments.length });
  } catch (err) {
    logger.error('initStore failed', String(err));
    throw err;
  }
}

// ══════════════════════════════════════════
// AUTH (async — only truly async functions)
// ══════════════════════════════════════════
export async function authenticate(email: string, password: string): Promise<{ user: AppUser; token: string } | null> {
  try {
    const result = await apiPost<{ user: AppUser; token: string }>('/auth/login', { email, password });
    _token = result.token;
    return result;
  } catch {
    return null;
  }
}

export function setToken(t: string | null) { _token = t; }

// ══════════════════════════════════════════
// USERS — Sync reads from cache
// ══════════════════════════════════════════
export function getUsers(): AppUser[] { return _users; }

export function getUserById(id: string): AppUser | undefined {
  return _users.find(u => u.id === id);
}

export function getUserByEmail(email: string): AppUser | undefined {
  return _users.find(u => u.email === email);
}

export function getDoctors(): Doctor[] {
  return _users.filter((u): u is Doctor => u.role === 'doctor');
}

export function getSecretaries(): Secretary[] {
  return _users.filter((u): u is Secretary => u.role === 'secretary');
}

export function getPatients(): Patient[] {
  return _users.filter((u): u is Patient => u.role === 'patient');
}

export function searchPatients(query: string): Patient[] {
  const q = query.toLowerCase();
  return getPatients().filter(
    p => p.firstName.toLowerCase().includes(q) ||
         p.lastName.toLowerCase().includes(q) ||
         p.email.toLowerCase().includes(q) ||
         p.phone.includes(q)
  );
}

// Registration waits for the database; a success message means the account exists.
export async function registerPatient(data: Record<string, unknown>): Promise<AppUser> {
  const user = await apiPost<AppUser>('/users', { ...data, role: 'patient' });
  _users = [..._users, user];
  return user;
}

// ── Users — Optimistic writes ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createUser(data: Record<string, any>): AppUser {
  if (_users.find(u => u.email === data.email)) {
    throw new Error('Un compte avec cet email existe déjà.');
  }
  const user = { ...data, id: data.id || crypto.randomUUID(), createdAt: new Date().toISOString() } as AppUser;
  _users = [..._users, user];
  bgPost('/users', { ...data, id: user.id });
  logger.info('User created', { email: data.email });
  return user;
}

export function updateUser(id: string, updates: Partial<AppUser>): AppUser | null {
  const idx = _users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  _users[idx] = { ..._users[idx], ...updates, id: _users[idx].id, createdAt: _users[idx].createdAt } as AppUser;
  _users = [..._users]; // trigger re-render
  bgPut(`/users/${id}`, updates);
  logger.info('User updated', { id });
  return _users[idx];
}

export function deleteUser(id: string): boolean {
  const before = _users.length;
  _users = _users.filter(u => u.id !== id);
  if (_users.length === before) return false;
  bgDelete(`/users/${id}`);
  logger.info('User deleted', { id });
  return true;
}

// ══════════════════════════════════════════
// APPOINTMENTS — Sync reads
// ══════════════════════════════════════════
export function getAppointments(): Appointment[] { return _appointments; }

export function getAppointmentById(id: string): Appointment | undefined {
  return _appointments.find(a => a.id === id);
}

export function getAppointmentsByDoctor(doctorId: string): Appointment[] {
  return _appointments.filter(a => a.doctorId === doctorId);
}

export function getAppointmentsByPatient(patientId: string): Appointment[] {
  return _appointments.filter(a => a.patientId === patientId);
}

export function getAppointmentsByDate(date: string): Appointment[] {
  return _appointments.filter(a => a.date === date);
}

export function getAvailableSlots(doctorId: string, date: string): TimeSlot[] {
  const allSlots: TimeSlot[] = [
    { start: '08:00', end: '08:30' }, { start: '08:30', end: '09:00' },
    { start: '09:00', end: '09:30' }, { start: '09:30', end: '10:00' },
    { start: '10:00', end: '10:30' }, { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:30' }, { start: '11:30', end: '12:00' },
    { start: '14:00', end: '14:30' }, { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:30' }, { start: '15:30', end: '16:00' },
    { start: '16:00', end: '16:30' }, { start: '16:30', end: '17:00' },
  ];
  const booked = new Set(
    _appointments
      .filter(a => a.doctorId === doctorId && a.date === date && a.status !== 'cancelled' && a.status !== 'no-show')
      .map(a => a.timeSlot.start)
  );
  return allSlots.filter(s => !booked.has(s.start));
}

// ── Appointments — Optimistic writes ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAppointment(data: Record<string, any>): Appointment {
  const apt = { ...data, id: data.id || crypto.randomUUID(), createdAt: new Date().toISOString() } as Appointment;
  _appointments = [..._appointments, apt];
  bgPost('/appointments', { ...data, id: apt.id, timeSlot: data.timeSlot });
  logger.info('Appointment created', { id: apt.id });
  return apt;
}

export function updateAppointment(id: string, updates: Partial<Appointment>): Appointment | null {
  const idx = _appointments.findIndex(a => a.id === id);
  if (idx === -1) return null;
  _appointments[idx] = { ..._appointments[idx], ...updates, id };
  _appointments = [..._appointments];
  bgPut(`/appointments/${id}`, updates);
  logger.info('Appointment updated', { id, status: updates.status });
  return _appointments[idx];
}

export function deleteAppointment(id: string): boolean {
  const before = _appointments.length;
  _appointments = _appointments.filter(a => a.id !== id);
  if (_appointments.length === before) return false;
  bgDelete(`/appointments/${id}`);
  logger.info('Appointment deleted', { id });
  return true;
}

// ══════════════════════════════════════════
// CONSULTATIONS — Sync reads
// ══════════════════════════════════════════
export function getConsultations(): Consultation[] { return _consultations; }

export function getConsultationsByPatient(patientId: string): Consultation[] {
  return _consultations.filter(c => c.patientId === patientId);
}

export function getConsultationsByDoctor(doctorId: string): Consultation[] {
  return _consultations.filter(c => c.doctorId === doctorId);
}

// ── Consultations — Optimistic write ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createConsultation(data: Record<string, any>): Consultation {
  const cons = { ...data, id: data.id || crypto.randomUUID() } as Consultation;
  _consultations = [..._consultations, cons];
  bgPost('/consultations', { ...data, id: cons.id });
  logger.info('Consultation created', { id: cons.id });
  return cons;
}
