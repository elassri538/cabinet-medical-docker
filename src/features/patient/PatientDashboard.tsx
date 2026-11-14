// ============================================================
// Patient Dashboard — Appointments & History (UC7-11)
// ============================================================

import { useState } from 'react';
import { useAuth } from '@/shared/auth';
import {
  getAppointmentsByPatient,
  getDoctors,
  getAvailableSlots,
  createAppointment,
  updateAppointment,
  getConsultationsByPatient,
  getUserById,
} from '@/shared/store';
import { logger } from '@/shared/logger';
import {
  Calendar,
  Clock,
  Plus,
  X,
  Save,
  Ban,
  CheckCircle,
  AlertCircle,
  FileText,
  Activity,
} from 'lucide-react';

interface PatientDashboardProps {
  view: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmé', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
  'no-show': { label: 'Absent', color: 'bg-gray-100 text-gray-800' },
};

export default function PatientDashboard({ view }: PatientDashboardProps) {
  const { user } = useAuth();
  const [showNewApt, setShowNewApt] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New appointment form
  const [selDoctor, setSelDoctor] = useState('');
  const [selDate, setSelDate] = useState('');
  const [selSlot, setSelSlot] = useState('');
  const [aptReason, setAptReason] = useState('');

  if (!user) return null;

  const uid = user.id;
  const appointments = getAppointmentsByPatient(uid);
  const doctors = getDoctors();
  const consultations = getConsultationsByPatient(uid);
  const availableSlots = selDoctor && selDate ? getAvailableSlots(selDoctor, selDate) : [];
  const today = new Date().toISOString().split('T')[0];

  const upcomingApts = appointments.filter(a => a.date >= today && a.status !== 'cancelled');
  const pastApts = appointments.filter(a => a.date < today || a.status === 'completed' || a.status === 'cancelled');

  function handleNewAppointment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selDoctor || !selDate || !selSlot) {
      setError('Veuillez sélectionner un médecin, une date et un créneau.');
      return;
    }
    // FIX: Re-read available slots FRESH from localStorage to prevent overlap
    const freshSlots = getAvailableSlots(selDoctor, selDate);
    const slot = freshSlots.find(s => s.start === selSlot);
    if (!slot) {
      setError('Ce créneau vient d\'être réservé. Veuillez en choisir un autre.');
      return;
    }
    createAppointment({
      patientId: uid,
      doctorId: selDoctor,
      date: selDate,
      timeSlot: slot,
      status: 'pending',
      reason: aptReason || 'Consultation',
    });
    logger.info('Appointment requested', { patientId: uid, doctorId: selDoctor, date: selDate });
    setSuccess('Rendez-vous demandé avec succès.');
    setShowNewApt(false);
    setSelDoctor('');
    setSelDate('');
    setSelSlot('');
    setAptReason('');
  }

  function handleCancel(id: string) {
    updateAppointment(id, { status: 'cancelled' });
    logger.info('Appointment cancelled', { appointmentId: id });
    setSuccess('Rendez-vous annulé.');
  }

  function DoctorName({ id }: { id: string }) {
    const doc = getUserById(id);
    return <span>Dr. {doc ? `${doc.firstName} ${doc.lastName}` : 'Inconnu'}</span>;
  }

  // ---- DASHBOARD VIEW ----
  if (view === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">Bonjour, {user.firstName} !</h2>
          <p className="mt-1 text-teal-100">
            Vous avez {upcomingApts.length} rendez-vous à venir.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{upcomingApts.length}</p>
                <p className="text-sm text-gray-500">RDV à venir</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pastApts.filter(a => a.status === 'completed').length}</p>
                <p className="text-sm text-gray-500">Consultations</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{consultations.length}</p>
                <p className="text-sm text-gray-500">Ordonnances</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming appointments */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Prochains rendez-vous</h3>
          <div className="space-y-3">
            {upcomingApts.slice(0, 5).map(apt => (
              <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center bg-teal-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-teal-600 font-medium">
                      {new Date(apt.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-teal-700">
                      {new Date(apt.date).getDate()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      <DoctorName id={apt.doctorId} />
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={14} /> {apt.timeSlot.start} - {apt.timeSlot.end}
                    </p>
                    <p className="text-sm text-gray-400">{apt.reason}</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusLabels[apt.status].color}`}>
                  {statusLabels[apt.status].label}
                </span>
              </div>
            ))}
            {upcomingApts.length === 0 && (
              <p className="text-gray-400 text-center py-8">Aucun rendez-vous à venir</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- APPOINTMENTS VIEW (UC7 - includes UC8, UC9, UC10) ----
  if (view === 'appointments') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">Mes rendez-vous</h3>
          <button
            onClick={() => setShowNewApt(true)}
            className="flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            <Plus size={18} />
            Nouveau RDV
          </button>
        </div>

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}><X size={16} /></button>
          </div>
        )}

        {/* Appointments list */}
        <div className="space-y-3">
          {appointments.sort((a, b) => b.date.localeCompare(a.date)).map(apt => (
            <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[55px] shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      {new Date(apt.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-gray-700">
                      {new Date(apt.date).getDate()}/{new Date(apt.date).getMonth() + 1}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      <DoctorName id={apt.doctorId} />
                    </p>
                    <p className="text-sm text-gray-500">{apt.timeSlot.start} - {apt.timeSlot.end}</p>
                    <p className="text-sm text-gray-400">{apt.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium ${statusLabels[apt.status].color}`}>
                    {statusLabels[apt.status].label}
                  </span>
                  {(apt.status === 'pending' || apt.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancel(apt.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Annuler"
                    >
                      <Ban size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun rendez-vous</p>
            </div>
          )}
        </div>

        {/* New appointment modal (UC8 + UC9) */}
        {showNewApt && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowNewApt(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-4 sm:my-0" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Nouveau rendez-vous</h3>
                <button onClick={() => setShowNewApt(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleNewAppointment} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Médecin *</label>
                  <select
                    value={selDoctor}
                    onChange={e => { setSelDoctor(e.target.value); setSelSlot(''); }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    <option value="">Sélectionner un médecin</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={selDate}
                    onChange={e => { setSelDate(e.target.value); setSelSlot(''); }}
                    min={today}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                {selDoctor && selDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Créneaux disponibles *</label>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-orange-600 flex items-center gap-1">
                        <AlertCircle size={16} /> Aucun créneau disponible
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.start}
                            type="button"
                            onClick={() => setSelSlot(slot.start)}
                            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              selSlot === slot.start
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'border-gray-200 text-gray-600 hover:border-teal-300'
                            }`}
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
                  <input
                    type="text"
                    value={aptReason}
                    onChange={e => setAptReason(e.target.value)}
                    placeholder="Ex: Consultation, douleur..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewApt(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                  >
                    <Save size={18} />
                    Confirmer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- HISTORY VIEW (UC11) ----
  if (view === 'history') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Mon historique médical</h3>

        {consultations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p>Aucune consultation enregistrée</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.sort((a, b) => b.date.localeCompare(a.date)).map(cons => {
              const doc = getUserById(cons.doctorId);
              return (
                <div key={cons.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Activity size={20} className="text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(cons.date).toLocaleDateString('fr-FR', {
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            Dr. {doc ? `${doc.firstName} ${doc.lastName}` : 'Inconnu'}
                          </p>
                        </div>
                      </div>
                      {cons.isPresent ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Présent</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Absent</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Diagnostic</p>
                        <p className="text-sm text-gray-600">{cons.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Compte-rendu</p>
                        <p className="text-sm text-gray-600">{cons.report}</p>
                      </div>

                      {cons.prescription.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Ordonnance</p>
                          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                            {cons.prescription.map((med, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded mt-0.5">
                                  {med.dosage}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-blue-900">{med.name}</p>
                                  <p className="text-xs text-blue-700">{med.instructions} — {med.duration}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {cons.notes && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Notes</p>
                          <p className="text-sm text-gray-600">{cons.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
