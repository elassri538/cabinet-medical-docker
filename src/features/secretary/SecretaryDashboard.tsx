// ============================================================
// Secretary Dashboard — Patients + Planning (UC12-21)
// ============================================================

import { useState } from 'react';
import { useAuth } from '@/shared/auth';
import {
  getPatients,
  searchPatients,
  createUser,
  updateUser,
  deleteUser,
  getAppointments,
  getDoctors,
  getAvailableSlots,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getUserById,
} from '@/shared/store';
import { logger } from '@/shared/logger';
import type { Patient } from '@/shared/types';
import {
  Users,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  Clock,
  Ban,
  AlertTriangle,
  CheckSquare,
  UserPlus,
} from 'lucide-react';

interface SecretaryDashboardProps {
  view: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmé', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
  'no-show': { label: 'Absent', color: 'bg-gray-100 text-gray-800' },
};

export default function SecretaryDashboard({ view }: SecretaryDashboardProps) {
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Patient form state
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pFirstName, setPFirstName] = useState('');
  const [pLastName, setPLastName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pPassword, setPPassword] = useState('');
  const [pDOB, setPDOB] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pBloodType, setPBloodType] = useState('');
  const [pAllergies, setPAllergies] = useState('');

  // Appointment form state
  const [showAptModal, setShowAptModal] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  const [aPatientId, setAPatientId] = useState('');
  const [aDoctorId, setADoctorId] = useState('');
  const [aDate, setADate] = useState('');
  const [aSlot, setASlot] = useState('');
  const [aReason, setAReason] = useState('');
  const [aStatus, setAStatus] = useState('pending');

  const patients = searchQuery ? searchPatients(searchQuery) : getPatients();
  const doctors = getDoctors();
  const appointments = getAppointments().sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().split('T')[0];
  const availableSlots = aDoctorId && aDate ? getAvailableSlots(aDoctorId, aDate) : [];

  // ---- Patient CRUD ----
  function openCreatePatient() {
    setEditingPatient(null);
    setPFirstName(''); setPLastName(''); setPEmail(''); setPPhone('');
    setPPassword(''); setPDOB(''); setPAddress(''); setPBloodType(''); setPAllergies('');
    setError(''); setShowPatientModal(true);
  }

  function openEditPatient(p: Patient) {
    setEditingPatient(p);
    setPFirstName(p.firstName); setPLastName(p.lastName); setPEmail(p.email);
    setPPhone(p.phone); setPPassword(''); setPDOB(p.dateOfBirth);
    setPAddress(p.address); setPBloodType(p.bloodType); setPAllergies(p.allergies.join(', '));
    setError(''); setShowPatientModal(true);
  }

  function handleSavePatient(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!pFirstName || !pLastName || !pEmail) {
      setError('Prénom, nom et email sont obligatoires.');
      return;
    }
    try {
      if (editingPatient) {
        updateUser(editingPatient.id, {
          firstName: pFirstName, lastName: pLastName, email: pEmail, phone: pPhone,
          dateOfBirth: pDOB, address: pAddress, bloodType: pBloodType,
          allergies: pAllergies ? pAllergies.split(',').map(a => a.trim()) : [],
        });
        logger.info('Patient updated', { id: editingPatient.id });
        setSuccess('Patient modifié avec succès.');
      } else {
        if (!pPassword) { setError('Mot de passe obligatoire.'); return; }
        createUser({
          email: pEmail, password: pPassword, role: 'patient',
          firstName: pFirstName, lastName: pLastName, phone: pPhone,
          dateOfBirth: pDOB, address: pAddress, bloodType: pBloodType,
          allergies: pAllergies ? pAllergies.split(',').map(a => a.trim()) : [],
        });
        logger.info('Patient created by secretary', { email: pEmail });
        setSuccess('Patient créé avec succès.');
      }
      refreshUser();
      setShowPatientModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  function handleDeletePatient(id: string) {
    deleteUser(id);
    setDeleteConfirm(null);
    logger.info('Patient deleted', { id });
    setSuccess('Patient supprimé.');
  }

  // ---- Appointment CRUD ----
  function openCreateApt() {
    setEditingAptId(null);
    setAPatientId(''); setADoctorId(''); setADate(''); setASlot('');
    setAReason(''); setAStatus('pending');
    setError(''); setShowAptModal(true);
  }

  function openEditApt(aptId: string) {
    const apt = getAppointments().find(a => a.id === aptId);
    if (!apt) return;
    setEditingAptId(aptId);
    setAPatientId(apt.patientId); setADoctorId(apt.doctorId); setADate(apt.date);
    setASlot(apt.timeSlot.start); setAReason(apt.reason); setAStatus(apt.status);
    setError(''); setShowAptModal(true);
  }

  // Helper: compute end time from start time (30-min slots)
  function computeEndTime(start: string): string {
    const [h, m] = start.split(':').map(Number);
    const totalMin = h * 60 + m + 30;
    const eh = Math.floor(totalMin / 60);
    const em = totalMin % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }

  function handleSaveApt(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!aPatientId || !aDoctorId || !aDate || !aSlot) {
      setError('Patient, médecin, date et créneau sont obligatoires.');
      return;
    }

    if (editingAptId) {
      // Editing existing appointment — allow keeping the same slot
      const slot = { start: aSlot, end: computeEndTime(aSlot) };
      updateAppointment(editingAptId, {
        patientId: aPatientId, doctorId: aDoctorId, date: aDate,
        timeSlot: slot, reason: aReason, status: aStatus as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show',
      });
      logger.info('Appointment updated by secretary', { id: editingAptId });
      setSuccess('Rendez-vous modifié.');
    } else {
      // FIX: Creating NEW appointment — re-read FRESH slots to prevent overlap
      const freshSlots = getAvailableSlots(aDoctorId, aDate);
      const slot = freshSlots.find(s => s.start === aSlot);
      if (!slot) {
        setError('Ce créneau vient d\'être réservé. Veuillez en choisir un autre.');
        return;
      }
      createAppointment({
        patientId: aPatientId, doctorId: aDoctorId, date: aDate,
        timeSlot: slot, status: 'pending', reason: aReason,
      });
      logger.info('Appointment created by secretary', { patientId: aPatientId });
      setSuccess('Rendez-vous créé.');
    }
    setShowAptModal(false);
  }

  return (
    <div className="space-y-6">
      {/* Success */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')}><X size={16} /></button>
        </div>
      )}

      {/* ---- DASHBOARD ---- */}
      {view === 'dashboard' && (
        <>
          <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
            <h2 className="text-2xl font-bold">Espace Secrétariat</h2>
            <p className="mt-1 text-green-100">Gestion des patients et des rendez-vous</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Users size={20} className="text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{getPatients().length}</p>
                  <p className="text-sm text-gray-500">Patients</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><Calendar size={20} className="text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.date === today && a.status !== 'cancelled').length}</p>
                  <p className="text-sm text-gray-500">RDV aujourd'hui</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg"><Clock size={20} className="text-yellow-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'pending').length}</p>
                  <p className="text-sm text-gray-500">En attente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today's appointments quick view */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rendez-vous du jour</h3>
            <div className="space-y-2">
              {appointments.filter(a => a.date === today && a.status !== 'cancelled').map(apt => {
                const pat = getUserById(apt.patientId);
                const doc = getUserById(apt.doctorId);
                return (
                  <div key={apt.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-teal-700">{apt.timeSlot.start}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{pat ? `${pat.firstName} ${pat.lastName}` : 'Inconnu'}</p>
                        <p className="text-xs text-gray-500">Dr. {doc ? `${doc.firstName} ${doc.lastName}` : 'Inconnu'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[apt.status].color}`}>
                      {statusLabels[apt.status].label}
                    </span>
                  </div>
                );
              })}
              {appointments.filter(a => a.date === today && a.status !== 'cancelled').length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Aucun rendez-vous aujourd'hui</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---- PATIENTS VIEW (UC12-16) ---- */}
      {view === 'patients' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-gray-900">Gestion des patients</h3>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <button
                onClick={openCreatePatient}
                className="flex items-center gap-2 bg-teal-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 whitespace-nowrap"
              >
                <UserPlus size={18} />
                <span className="sm:inline">Ajouter</span>
              </button>
            </div>
          </div>

          {/* Table with horizontal scroll for mobile */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Naissance</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Groupe</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 whitespace-nowrap">{p.firstName} {p.lastName}</p>
                          {p.allergies.length > 0 && (
                            <p className="text-xs text-red-500 truncate max-w-[150px]">Allergies: {p.allergies.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 whitespace-nowrap">{p.email}</p>
                      <p className="text-gray-400 text-xs">{p.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.bloodType ? (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{p.bloodType}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditPatient(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {deleteConfirm === p.id && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-2">
                          <span className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle size={14} />Confirmer ?</span>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleDeletePatient(p.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Oui</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-white text-gray-600 border rounded text-xs">Non</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {patients.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users size={36} className="mx-auto mb-2 opacity-50" />
                <p>Aucun patient trouvé</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---- PLANNING VIEW (UC17-21) ---- */}
      {view === 'planning' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-gray-900">Planning des rendez-vous</h3>
            <button
              onClick={openCreateApt}
              className="flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
            >
              <Plus size={18} />
              Nouveau RDV
            </button>
          </div>

          <div className="space-y-3">
            {appointments.map(apt => {
              const pat = getUserById(apt.patientId);
              const doc = getUserById(apt.doctorId);
              return (
                <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[55px] shrink-0">
                        <p className="text-xs text-gray-500">{new Date(apt.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                        <p className="text-lg font-bold text-gray-700">{new Date(apt.date).getDate()}/{new Date(apt.date).getMonth() + 1}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{pat ? `${pat.firstName} ${pat.lastName}` : 'Inconnu'}</p>
                        <p className="text-sm text-gray-500">Dr. {doc ? `${doc.firstName} ${doc.lastName}` : 'Inconnu'} — {apt.timeSlot.start}</p>
                        <p className="text-sm text-gray-400 truncate">{apt.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[apt.status].color}`}>
                        {statusLabels[apt.status].label}
                      </span>
                      <button onClick={() => openEditApt(apt.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => { deleteAppointment(apt.id); setSuccess('RDV supprimé.'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                      {apt.status === 'pending' && (
                        <button
                          onClick={() => { updateAppointment(apt.id, { status: 'confirmed' }); setSuccess('RDV confirmé.'); }}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Confirmer"
                        >
                          <CheckSquare size={16} />
                        </button>
                      )}
                      {(apt.status === 'pending' || apt.status === 'confirmed') && (
                        <button
                          onClick={() => { updateAppointment(apt.id, { status: 'cancelled' }); setSuccess('RDV annulé.'); }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Annuler"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {appointments.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Calendar size={36} className="mx-auto mb-2 opacity-50" />
                <p>Aucun rendez-vous</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowPatientModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4 sm:my-0" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editingPatient ? 'Modifier le patient' : 'Nouveau patient'}</h3>
              <button onClick={() => setShowPatientModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePatient} className="p-4 sm:p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input type="text" value={pFirstName} onChange={e => setPFirstName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={pLastName} onChange={e => setPLastName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={pPhone} onChange={e => setPPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              {!editingPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input type="password" value={pPassword} onChange={e => setPPassword(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" value={pDOB} onChange={e => setPDOB(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Groupe sanguin</label>
                  <select value={pBloodType} onChange={e => setPBloodType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="">—</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={pAddress} onChange={e => setPAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (virgules)</label>
                <input type="text" value={pAllergies} onChange={e => setPAllergies(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPatientModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"><Save size={18} />{editingPatient ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAptModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowAptModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-4 sm:my-0" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editingAptId ? 'Modifier le RDV' : 'Nouveau RDV'}</h3>
              <button onClick={() => setShowAptModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveApt} className="p-4 sm:p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                <select value={aPatientId} onChange={e => setAPatientId(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="">Sélectionner</option>
                  {getPatients().map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Médecin *</label>
                <select value={aDoctorId} onChange={e => { setADoctorId(e.target.value); setASlot(''); }} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="">Sélectionner</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={aDate} onChange={e => { setADate(e.target.value); setASlot(''); }} min={today} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              {aDoctorId && aDate && !editingAptId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Créneaux disponibles *</label>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-orange-600">Aucun créneau disponible</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(s => (
                        <button key={s.start} type="button" onClick={() => setASlot(s.start)}
                          className={`px-2 py-1.5 text-xs font-medium rounded-lg border ${aSlot === s.start ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                          {s.start}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
                <input type="text" value={aReason} onChange={e => setAReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              {editingAptId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select value={aStatus} onChange={e => setAStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                    <option value="no-show">Absent</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAptModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"><Save size={18} />{editingAptId ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
