// ============================================================
// API Layer — Backend Connection (MySQL via REST)
// Switches between LocalStorage (demo) and API (production)
// ============================================================

import type {
  AppUser,
  Appointment,
  Consultation,
  Patient,
  Doctor,
} from './types';

// ---- Configuration ----

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const USE_API = !!API_BASE; // If API_BASE is set, use real backend

// ---- Generic HTTP Client ----

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = sessionStorage.getItem('cabinet_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ---- API Interface ----

export const api = {
  // ====== Authentication (UC1) ======
  async login(email: string, password: string): Promise<{ user: AppUser; token: string }> {
    if (!USE_API) {
      // Demo mode — handled by auth.ts with LocalStorage
      throw new Error('Demo mode: use AuthContext');
    }
    const result = await request<{ user: AppUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    sessionStorage.setItem('cabinet_token', result.token);
    return result;
  },

  logout(): void {
    sessionStorage.removeItem('cabinet_token');
  },

  // ====== Users CRUD ======
  async getUsers(): Promise<AppUser[]> {
    return request<AppUser[]>('/users');
  },

  async getUserById(id: string): Promise<AppUser> {
    return request<AppUser>(`/users/${id}`);
  },

  async createUser(data: Record<string, unknown>): Promise<AppUser> {
    return request<AppUser>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Record<string, unknown>): Promise<AppUser> {
    return request<AppUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(id: string, newPassword: string): Promise<void> {
    return request<void>(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password: newPassword }),
    });
  },

  async deleteUser(id: string): Promise<void> {
    return request<void>(`/users/${id}`, { method: 'DELETE' });
  },

  // ====== Patients ======
  async getPatients(): Promise<Patient[]> {
    return request<Patient[]>('/patients');
  },

  async searchPatients(query: string): Promise<Patient[]> {
    return request<Patient[]>(`/patients/search?q=${encodeURIComponent(query)}`);
  },

  // ====== Doctors ======
  async getDoctors(): Promise<Doctor[]> {
    return request<Doctor[]>('/doctors');
  },

  // ====== Appointments ======
  async getAppointments(filters?: { doctorId?: string; patientId?: string; date?: string }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.doctorId) params.set('doctorId', filters.doctorId);
    if (filters?.patientId) params.set('patientId', filters.patientId);
    if (filters?.date) params.set('date', filters.date);
    const qs = params.toString();
    return request<Appointment[]>(`/appointments${qs ? `?${qs}` : ''}`);
  },

  async getAvailableSlots(doctorId: string, date: string): Promise<{ start: string; end: string }[]> {
    return request<{ start: string; end: string }[]>(
      `/appointments/slots?doctorId=${doctorId}&date=${date}`
    );
  },

  async createAppointment(data: Record<string, unknown>): Promise<Appointment> {
    return request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAppointment(id: string, data: Record<string, unknown>): Promise<Appointment> {
    return request<Appointment>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async cancelAppointment(id: string): Promise<Appointment> {
    return request<Appointment>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  // ====== Consultations ======
  async getConsultations(filters?: { patientId?: string; doctorId?: string }): Promise<Consultation[]> {
    const params = new URLSearchParams();
    if (filters?.patientId) params.set('patientId', filters.patientId);
    if (filters?.doctorId) params.set('doctorId', filters.doctorId);
    const qs = params.toString();
    return request<Consultation[]>(`/consultations${qs ? `?${qs}` : ''}`);
  },

  async createConsultation(data: Record<string, unknown>): Promise<Consultation> {
    return request<Consultation>('/consultations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async treatAppointment(appointmentId: string, data: Record<string, unknown>): Promise<Consultation> {
    return request<Consultation>(`/appointments/${appointmentId}/treat`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

/**
 * ARCHITECTURE NOTE:
 *
 * When VITE_API_BASE_URL is NOT set → the app uses store.ts (LocalStorage) directly.
 * When VITE_API_BASE_URL IS set     → the app should switch to use api.ts (HTTP/REST → MySQL).
 *
 * To migrate to MySQL:
 * 1. Set VITE_API_BASE_URL=http://localhost:3001/api in .env
 * 2. Deploy the backend Express server (see SETUP_GUIDE.md)
 * 3. Update store.ts function calls in components to use api.ts instead
 *
 * The current implementation uses store.ts for all data operations.
 * api.ts is prepared and ready for the MySQL backend connection.
 */
