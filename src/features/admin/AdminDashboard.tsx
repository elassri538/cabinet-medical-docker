// ============================================================
// Admin Dashboard — Dashboard + Manage doctors and secretaries (UC2-5)
// ============================================================

import { useState } from 'react';
import { useAuth } from '@/shared/auth';
import { getDoctors, getSecretaries, getPatients, createUser, updateUser, deleteUser } from '@/shared/store';
import { logger } from '@/shared/logger';
import type { Doctor, Secretary } from '@/shared/types';
import {
  Plus,
  Pencil,
  Trash2,
  Key,
  X,
  Save,
  Users,
  Stethoscope,
  UserCog,
  AlertTriangle,
  Activity,
  Shield,
} from 'lucide-react';

interface AdminDashboardProps {
  view: string;
}

export default function AdminDashboard({ view }: AdminDashboardProps) {
  const { refreshUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Doctor | Secretary | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<Doctor | Secretary | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const isDoctors = view === 'doctors';
  const staff = isDoctors ? getDoctors() : getSecretaries();
  const role = isDoctors ? 'doctor' : 'secretary';

  function openCreateModal() {
    setEditingUser(null);
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormSpecialization('');
    setError('');
    setShowModal(true);
  }

  function openEditModal(user: Doctor | Secretary) {
    setEditingUser(user);
    setFormFirstName(user.firstName);
    setFormLastName(user.lastName);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormSpecialization('specialization' in user ? user.specialization : '');
    setFormPassword('');
    setError('');
    setShowModal(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formFirstName || !formLastName || !formEmail) {
      setError('Prénom, nom et email sont obligatoires.');
      return;
    }

    try {
      if (editingUser) {
        const updates: Record<string, string> = {
          firstName: formFirstName,
          lastName: formLastName,
          email: formEmail,
          phone: formPhone,
        };
        if (isDoctors) updates.specialization = formSpecialization;
        updateUser(editingUser.id, updates);
        logger.info('Staff account updated', { id: editingUser.id });
        setSuccess('Compte modifié avec succès.');
      } else {
        if (!formPassword) {
          setError('Le mot de passe est obligatoire pour un nouveau compte.');
          return;
        }
        const data: Record<string, string> = {
          email: formEmail,
          password: formPassword,
          role,
          firstName: formFirstName,
          lastName: formLastName,
          phone: formPhone,
        };
        if (isDoctors) data.specialization = formSpecialization;
        createUser(data);
        logger.info('Staff account created', { email: formEmail, role });
        setSuccess('Compte créé avec succès.');
      }
      refreshUser();
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!showPasswordModal || !newPassword) return;
    updateUser(showPasswordModal.id, { password: newPassword });
    logger.info('Password changed', { id: showPasswordModal.id });
    setSuccess('Mot de passe changé avec succès.');
    setShowPasswordModal(null);
    setNewPassword('');
  }

  function handleDelete(id: string) {
    deleteUser(id);
    logger.info('Staff account deleted', { id });
    setDeleteConfirm(null);
    setSuccess('Compte supprimé avec succès.');
  }

  // ============ DASHBOARD VIEW ============
  if (view === 'dashboard') {
    const doctors = getDoctors();
    const secretaries = getSecretaries();
    const patients = getPatients();

    return (
      <div className="space-y-6">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess('')}><X size={16} /></button>
          </div>
        )}

        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} />
            <h2 className="text-2xl font-bold">Espace Administration</h2>
          </div>
          <p className="text-purple-100">Gestion du personnel du cabinet médical</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg"><Stethoscope size={20} className="text-teal-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{doctors.length}</p>
                <p className="text-sm text-gray-500">Médecins</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><UserCog size={20} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{secretaries.length}</p>
                <p className="text-sm text-gray-500">Secrétaires</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Users size={20} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
                <p className="text-sm text-gray-500">Patients</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Activity size={20} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{doctors.length + secretaries.length}</p>
                <p className="text-sm text-gray-500">Personnel total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick access cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-teal-100 rounded-lg"><Stethoscope size={24} className="text-teal-600" /></div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Médecins</h4>
                  <p className="text-sm text-gray-500">{doctors.length} enregistré(s)</p>
                </div>
              </div>
              {/* Preview list */}
              <div className="space-y-2 mb-4">
                {doctors.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {d.firstName[0]}{d.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">Dr. {d.firstName} {d.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{d.specialization}</p>
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">Aucun médecin</p>
                )}
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">Utilisez le menu "Gestion Médecins" pour gérer</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg"><UserCog size={24} className="text-green-600" /></div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Secrétaires</h4>
                  <p className="text-sm text-gray-500">{secretaries.length} enregistré(s)</p>
                </div>
              </div>
              {/* Preview list */}
              <div className="space-y-2 mb-4">
                {secretaries.slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{s.email}</p>
                    </div>
                  </div>
                ))}
                {secretaries.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">Aucun secrétaire</p>
                )}
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">Utilisez le menu "Gestion Secrétaires" pour gérer</p>
            </div>
          </div>
        </div>

        {/* Security info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Shield size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 text-sm">Accès restreint</p>
            <p className="text-xs text-amber-700 mt-1">
              L'administrateur gère exclusivement les comptes du personnel (médecins et secrétaires).
              Les dossiers patients et médicaux ne sont pas accessibles depuis cet espace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ DOCTORS / SECRETARIES MANAGEMENT VIEW ============
  const Icon = isDoctors ? Stethoscope : UserCog;
  const title = isDoctors ? 'Médecins' : 'Secrétaires';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDoctors ? 'bg-teal-100' : 'bg-green-100'}`}>
            <Icon size={24} className={isDoctors ? 'text-teal-600' : 'text-green-600'} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{staff.length} enregistré(s)</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')}><X size={16} /></button>
        </div>
      )}

      {/* Staff list — Card-based for mobile responsiveness */}
      <div className="grid gap-4">
        {staff.map((member) => (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold shrink-0 ${
                  isDoctors ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'
                }`}>
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900">Dr. {member.firstName} {member.lastName}</h4>
                  <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  <p className="text-sm text-gray-400">{member.phone}</p>
                  {'specialization' in member && (
                    <span className="inline-block mt-1 text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                      {member.specialization}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-start">
                <button
                  onClick={() => openEditModal(member)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => setShowPasswordModal(member)}
                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Changer le mot de passe"
                >
                  <Key size={18} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(member.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirm === member.id && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertTriangle size={18} />
                  Confirmer la suppression ?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 bg-white text-gray-700 border rounded text-sm hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {staff.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>Aucun {isDoctors ? 'médecin' : 'secrétaire'} enregistré</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-4 sm:my-0" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingUser ? 'Modifier' : 'Nouveau'} {isDoctors ? 'Médecin' : 'Secrétaire'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={e => setFormFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={e => setFormLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              {isDoctors && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spécialisation</label>
                  <input
                    type="text"
                    value={formSpecialization}
                    onChange={e => setFormSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  <Save size={18} />
                  {editingUser ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password change modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setShowPasswordModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm my-4 sm:my-0" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Changer le mot de passe</h3>
              <button onClick={() => setShowPasswordModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 sm:p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Pour : <strong>{showPasswordModal.firstName} {showPasswordModal.lastName}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  Changer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
