// ============================================================
// Doctor Dashboard — Planning, Treat, Patient History (UC18-27)
// FIX: Traiter button navigates to treat view
// FIX: Treated appointments auto-removed from list
// FIX: Fresh data reads on every state change
// ============================================================

import { useState, useCallback } from 'react';
import { useAuth } from '@/shared/auth';
import {
  getAppointmentsByDoctor,
  getConsultationsByPatient,
  getConsultationsByDoctor,
  searchPatients,
  getUserById,
  updateAppointment,
  createConsultation,
  createAppointment,
  getAvailableSlots,
} from '@/shared/store';
import { logger } from '@/shared/logger';
import {
  Calendar,
  ClipboardList,
  Activity,
  Search,
  Clock,
  CheckCircle,
  FileText,
  Plus,
  Save,
  X,
  ChevronRight,
  UserCheck,
  UserX,
  Pill,
  CalendarPlus,
} from 'lucide-react';

interface DoctorDashboardProps {
  view: string;
  onNavigate: (view: string) => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmé', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
  'no-show': { label: 'Absent', color: 'bg-gray-100 text-gray-800' },
};

export default function DoctorDashboard({ view, onNavigate }: DoctorDashboardProps) {
  const { user } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Refresh key — incremented to force fresh data reads
  const [refreshKey, setRefreshKey] = useState(0);

  // Treat appointment state
  const [treatingAptId, setTreatingAptId] = useState<string | null>(null);
  const [isPresent, setIsPresent] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');
  const [report, setReport] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', duration: '', instructions: '' }]);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpSlot, setFollowUpSlot] = useState('');

  // Patient history search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  if (!user) return null;
  const docId = user.id;
  const today = new Date().toISOString().split('T')[0];

  // Read fresh data every render (refreshKey forces re-render)
  void refreshKey;
  const appointments = getAppointmentsByDoctor(docId).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.timeSlot.start.localeCompare(b.timeSlot.start);
  });

  const todayApts = appointments.filter(a => a.date === today && a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no-show');
  const futureApts = appointments.filter(a => a.date >= today && a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no-show');
  const allConsultations = getConsultationsByDoctor(docId);

  // Read follow-up slots FRESH each render
  const followUpSlots = followUpDate ? getAvailableSlots(docId, followUpDate) : [];

  function addMedication() {
    setMedications([...medications, { name: '', dosage: '', duration: '', instructions: '' }]);
  }

  function removeMedication(index: number) {
    setMedications(medications.filter((_, i) => i !== index));
  }

  function updateMedication(index: number, field: string, value: string) {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  }

  // FIX 1: startTreatment now ALSO navigates to 'treat' view
  const startTreatment = useCallback((aptId: string) => {
    setTreatingAptId(aptId);
    setIsPresent(true);
    setDiagnosis('');
    setReport('');
    setNotes('');
    setMedications([{ name: '', dosage: '', duration: '', instructions: '' }]);
    setShowFollowUp(false);
    setFollowUpDate('');
    setFollowUpSlot('');
    setError('');
    setSuccess('');
    // Navigate to treat view
    onNavigate('treat');
  }, [onNavigate]);

  function handleSaveConsultation(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!treatingAptId) return;
    if (diagnosis.trim() === '' && isPresent) {
      setError('Le diagnostic est obligatoire.');
      return;
    }
    if (report.trim() === '' && isPresent) {
      setError('Le compte-rendu est obligatoire.');
      return;
    }

    // Read FRESH appointment data
    const freshAppointments = getAppointmentsByDoctor(docId);
    const apt = freshAppointments.find(a => a.id === treatingAptId);
    if (!apt) {
      setError('Rendez-vous introuvable.');
      return;
    }

    const validMeds = medications.filter(m => m.name.trim() !== '');

    const consultation = createConsultation({
      appointmentId: treatingAptId,
      patientId: apt.patientId,
      doctorId: docId,
      date: today,
      isPresent,
      report: isPresent ? report : 'Patient absent.',
      diagnosis: isPresent ? diagnosis : 'Absence',
      prescription: isPresent ? validMeds : [],
      notes,
    });

    // Update appointment status
    updateAppointment(treatingAptId, {
      status: isPresent ? 'completed' : 'no-show',
      consultationId: consultation.id,
    });

    // UC27 — Optional follow-up appointment (extend)
    if (showFollowUp && followUpDate && followUpSlot) {
      // Read fresh slots to prevent overlap
      const freshSlots = getAvailableSlots(docId, followUpDate);
      const slot = freshSlots.find(s => s.start === followUpSlot);
      if (slot) {
        createAppointment({
          patientId: apt.patientId,
          doctorId: docId,
          date: followUpDate,
          timeSlot: slot,
          status: 'pending',
          reason: `Suivi: ${diagnosis}`,
        });
        logger.info('Follow-up appointment created', { patientId: apt.patientId });
      }
    }

    logger.info('Consultation saved', { appointmentId: treatingAptId, isPresent });
    setSuccess('Consultation enregistrée avec succès.');
    setTreatingAptId(null);
    // FIX 3: Force fresh data read
    setRefreshKey(k => k + 1);
  }

  // Patient search for history
  const searchResults = searchQuery.length >= 2 ? searchPatients(searchQuery) : [];
  const selectedPatient = selectedPatientId ? getUserById(selectedPatientId) : null;
  const patientConsultations = selectedPatientId ? getConsultationsByPatient(selectedPatientId) : [];

  // ---- DASHBOARD ----
  if (view === 'dashboard') {
    return (
      <div className="space-y-6">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}><X size={16} /></button>
          </div>
        )}

        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">Bonjour, Dr. {user.firstName} !</h2>
          <p className="mt-1 text-teal-100">{todayApts.length} consultation(s) aujourd'hui</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Calendar size={20} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{todayApts.length}</p>
                <p className="text-sm text-gray-500">RDV aujourd'hui</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><Clock size={20} className="text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{futureApts.filter(a => a.status === 'pending').length}</p>
                <p className="text-sm text-gray-500">En attente</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{allConsultations.length}</p>
                <p className="text-sm text-gray-500">Consultations</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Consultations du jour</h3>
          <div className="space-y-3">
            {todayApts.map(apt => {
              const pat = getUserById(apt.patientId);
              return (
                <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-teal-50 rounded-lg px-3 py-2 min-w-[60px]">
                      <p className="text-lg font-bold text-teal-700">{apt.timeSlot.start}</p>
                      <p className="text-xs text-teal-600">{apt.timeSlot.end}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{pat ? `${pat.firstName} ${pat.lastName}` : 'Inconnu'}</p>
                      <p className="text-sm text-gray-400">{apt.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[apt.status].color}`}>
                      {statusLabels[apt.status].label}
                    </span>
                    {(apt.status === 'confirmed' || apt.status === 'pending') && (
                      <button
                        onClick={() => startTreatment(apt.id)}
                        className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-700"
                      >
                        <ClipboardList size={16} />
                        Traiter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {todayApts.length === 0 && (
              <p className="text-gray-400 text-center py-8">Aucune consultation aujourd'hui</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- PLANNING VIEW (UC18) ----
  if (view === 'planning') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Mon planning</h3>
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}><X size={16} /></button>
          </div>
        )}
        <div className="space-y-3">
          {futureApts.map(apt => {
            const pat = getUserById(apt.patientId);
            return (
              <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[60px]">
                    <p className="text-xs text-gray-500">{new Date(apt.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                    <p className="text-lg font-bold text-gray-700">{new Date(apt.date).getDate()}/{new Date(apt.date).getMonth() + 1}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{pat ? `${pat.firstName} ${pat.lastName}` : 'Inconnu'}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Clock size={14} /> {apt.timeSlot.start} - {apt.timeSlot.end}</p>
                    <p className="text-sm text-gray-400">{apt.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusLabels[apt.status].color}`}>
                    {statusLabels[apt.status].label}
                  </span>
                  {(apt.status === 'confirmed' || apt.status === 'pending') && apt.date <= today && (
                    <button
                      onClick={() => startTreatment(apt.id)}
                      className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-700"
                    >
                      <ClipboardList size={16} />
                      Traiter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {futureApts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun rendez-vous planifié</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- TREAT APPOINTMENT VIEW (UC22-25, UC27) ----
  if (view === 'treat') {
    // If currently treating, show the treatment form
    if (treatingAptId) {
      // Read FRESH data for the appointment being treated
      const freshApts = getAppointmentsByDoctor(docId);
      const apt = freshApts.find(a => a.id === treatingAptId);
      const pat = apt ? getUserById(apt.patientId) : null;

      if (!apt) {
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              Ce rendez-vous n'existe plus.
            </div>
            <button onClick={() => setTreatingAptId(null)} className="text-teal-600 hover:text-teal-700 text-sm">
              ← Retour à la liste
            </button>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setTreatingAptId(null)} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={20} className="text-gray-400 rotate-180" />
            </button>
            <h3 className="text-xl font-bold text-gray-900">Traitement du rendez-vous</h3>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="font-medium text-blue-900">{pat ? `${pat.firstName} ${pat.lastName}` : 'Inconnu'}</p>
            <p className="text-sm text-blue-700">{apt.reason} — {apt.timeSlot.start}</p>
            <p className="text-sm text-blue-600 mt-1">
              {new Date(apt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {pat && 'allergies' in pat && Array.isArray((pat as Record<string, unknown>).allergies) && ((pat as Record<string, unknown>).allergies as string[]).length > 0 ? (
              <p className="text-sm text-red-600 mt-2 font-medium">
                ⚠️ Allergies : {((pat as Record<string, unknown>).allergies as string[]).join(', ')}
              </p>
            ) : null}
          </div>

          <form onSubmit={handleSaveConsultation} className="space-y-6">
            {/* UC23 — Confirm presence */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                {isPresent ? <UserCheck size={20} className="text-green-600" /> : <UserX size={20} className="text-red-600" />}
                Présence du patient
              </h4>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${isPresent ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                  <input type="radio" name="presence" checked={isPresent} onChange={() => setIsPresent(true)} className="sr-only" />
                  <UserCheck size={18} /> Présent
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${!isPresent ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'}`}>
                  <input type="radio" name="presence" checked={!isPresent} onChange={() => setIsPresent(false)} className="sr-only" />
                  <UserX size={18} /> Absent
                </label>
              </div>
            </div>

            {isPresent && (
              <>
                {/* UC24 — Consultation report */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Compte-rendu de consultation
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostic *</label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      placeholder="Ex: Lombalgie commune, HTA..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Compte-rendu *</label>
                    <textarea
                      value={report}
                      onChange={e => setReport(e.target.value)}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                      placeholder="Description détaillée de la consultation..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                      placeholder="Recommandations, suivi..."
                    />
                  </div>
                </div>

                {/* UC25 — Prescription */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Pill size={20} className="text-purple-600" />
                      Ordonnance
                    </h4>
                    <button type="button" onClick={addMedication} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
                      <Plus size={16} /> Ajouter un médicament
                    </button>
                  </div>
                  {medications.map((med, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Médicament {i + 1}</span>
                        {medications.length > 1 && (
                          <button type="button" onClick={() => removeMedication(i)} className="text-red-400 hover:text-red-600">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nom du médicament *" value={med.name}
                          onChange={e => updateMedication(i, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                        <input type="text" placeholder="Posologie (ex: 1g)" value={med.dosage}
                          onChange={e => updateMedication(i, 'dosage', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                        <input type="text" placeholder="Durée (ex: 7 jours)" value={med.duration}
                          onChange={e => updateMedication(i, 'duration', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                        <input type="text" placeholder="Instructions" value={med.instructions}
                          onChange={e => updateMedication(i, 'instructions', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* UC27 — Follow-up appointment (extend) */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <CalendarPlus size={20} className="text-orange-600" />
                      Rendez-vous complémentaire
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showFollowUp} onChange={e => setShowFollowUp(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                      <span className="text-sm text-gray-600">Planifier un suivi</span>
                    </label>
                  </div>
                  {showFollowUp && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de suivi</label>
                        <input type="date" value={followUpDate}
                          onChange={e => { setFollowUpDate(e.target.value); setFollowUpSlot(''); }}
                          min={today}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                      {followUpDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Créneaux disponibles</label>
                          {followUpSlots.length === 0 ? (
                            <p className="text-sm text-orange-600">Aucun créneau disponible à cette date</p>
                          ) : (
                            <div className="grid grid-cols-4 gap-2">
                              {followUpSlots.map(s => (
                                <button key={s.start} type="button" onClick={() => setFollowUpSlot(s.start)}
                                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border ${followUpSlot === s.start ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
                                  {s.start}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors text-lg">
              <Save size={22} />
              Enregistrer la consultation
            </button>
          </form>
        </div>
      );
    }

    // ---- Show list of appointments to treat ----
    // Read FRESH data for the list
    const freshAptsForList = getAppointmentsByDoctor(docId);
    const aptsToTreat = freshAptsForList.filter(
      a => (a.status === 'pending' || a.status === 'confirmed') && a.date <= today
    ).sort((a, b) => a.timeSlot.start.localeCompare(b.timeSlot.start));

    return (
      <div className="space-y-6">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}><X size={16} /></button>
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900">Rendez-vous à traiter</h3>
        <div className="space-y-3">
          {aptsToTreat.map(apt => {
            const pat = getUserById(apt.patientId);
            return (
              <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center bg-yellow-50 rounded-lg px-3 py-2 min-w-[60px]">
                    <p className="text-lg font-bold text-yellow-700">{apt.timeSlot.start}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{pat ? `${pat.firstName} ${pat.lastName}` : 'Inconnu'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(apt.date).toLocaleDateString('fr-FR')} — {apt.reason}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => startTreatment(apt.id)}
                  className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  <ClipboardList size={18} />
                  Traiter
                </button>
              </div>
            );
          })}
          {aptsToTreat.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun rendez-vous en attente de traitement</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- PATIENT HISTORY VIEW (UC26, UC16) ----
  if (view === 'patient-history') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Dossiers patients</h3>

        {/* UC16 — Search patient */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            Rechercher un patient
          </h4>
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedPatientId(null); }}
            placeholder="Nom, prénom, email ou téléphone..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
          {searchResults.length > 0 && !selectedPatientId && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.email} — {p.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* UC26 — Patient history */}
        {selectedPatient && selectedPatientId && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</h4>
                  <p className="text-sm text-gray-500">{selectedPatient.email} — {selectedPatient.phone}</p>
                  {'dateOfBirth' in selectedPatient && (
                    <p className="text-sm text-gray-500">
                      Né(e) le {new Date((selectedPatient as { dateOfBirth: string }).dateOfBirth).toLocaleDateString('fr-FR')}
                      {'bloodType' in selectedPatient && (selectedPatient as { bloodType: string }).bloodType && (
                        <span className="ml-3 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                          {(selectedPatient as { bloodType: string }).bloodType}
                        </span>
                      )}
                    </p>
                  )}
                  {'allergies' in selectedPatient && Array.isArray((selectedPatient as Record<string, unknown>).allergies) && ((selectedPatient as Record<string, unknown>).allergies as string[]).length > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ Allergies : {((selectedPatient as Record<string, unknown>).allergies as string[]).join(', ')}
                    </p>
                  )}
                </div>
                <button onClick={() => { setSelectedPatientId(null); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-green-600" />
              Historique des consultations
            </h4>

            {patientConsultations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText size={36} className="mx-auto mb-2 opacity-50" />
                <p>Aucune consultation enregistrée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {patientConsultations.sort((a, b) => b.date.localeCompare(a.date)).map(cons => {
                  const consDoc = getUserById(cons.doctorId);
                  return (
                    <div key={cons.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">
                            {new Date(cons.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${cons.isPresent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {cons.isPresent ? 'Présent' : 'Absent'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Dr. {consDoc ? `${consDoc.firstName} ${consDoc.lastName}` : 'Inconnu'}</p>
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
                                  <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded mt-0.5">{med.dosage}</span>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedPatientId && searchQuery.length < 2 && (
          <div className="text-center py-12 text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-50" />
            <p>Recherchez un patient pour consulter son dossier</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
