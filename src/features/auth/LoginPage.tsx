// ============================================================
// Login / Register Page
// ============================================================

import { useState } from 'react';
import { useAuth } from '@/shared/auth';
import { registerPatient } from '@/shared/store';
import { logger } from '@/shared/logger';
import { Stethoscope, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import type { UserRole } from '@/shared/types';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form (patient only — UC6)
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDOB, setRegDOB] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regBloodType, setRegBloodType] = useState('');
  const [regAllergies, setRegAllergies] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      onLogin();
    } else {
      setError(result.error ?? 'Erreur de connexion');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regFirstName || !regLastName || !regEmail || !regPassword || !regDOB) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      await registerPatient({
        email: regEmail,
        password: regPassword,
        role: 'patient' as UserRole,
        firstName: regFirstName,
        lastName: regLastName,
        phone: regPhone,
        dateOfBirth: regDOB,
        address: regAddress,
        bloodType: regBloodType,
        allergies: regAllergies ? regAllergies.split(',').map(a => a.trim()) : [],
      });
      logger.info('Patient registered', { email: regEmail });
      setSuccess('Compte enregistré. Vous pouvez maintenant vous connecter.');
      setIsRegister(false);
      setEmail(regEmail);
      setPassword(regPassword);
      // Reset register form
      setRegFirstName('');
      setRegLastName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegDOB('');
      setRegAddress('');
      setRegBloodType('');
      setRegAllergies('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <Stethoscope className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cabinet Médical</h1>
          <p className="text-gray-500 mt-1">Système de gestion intégré</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                !isRegister
                  ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn size={18} />
              Connexion
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                isRegister
                  ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus size={18} />
              Créer un compte
            </button>
          </div>

          <div className="p-6">
            {/* Error/Success */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            {!isRegister ? (
              /* ---- LOGIN FORM ---- */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-sm"
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-sm pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  Se connecter
                </button>

                {/* Demo credentials */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 text-center">Comptes de démonstration :</p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-purple-50 rounded-lg p-2">
                      <p className="font-medium text-purple-700">Admin</p>
                      <p className="text-purple-600 truncate">admin@cabinet.fr</p>
                      <p className="text-purple-400">admin123</p>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-2">
                      <p className="font-medium text-teal-700">Médecin</p>
                      <p className="text-teal-600 truncate">dupont@cabinet.fr</p>
                      <p className="text-teal-400">doctor123</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="font-medium text-green-700">Secrétaire</p>
                      <p className="text-green-600 truncate">marie@cabinet.fr</p>
                      <p className="text-green-400">secret123</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="font-medium text-blue-700">Patient</p>
                      <p className="text-blue-600 truncate">ahmed@email.com</p>
                      <p className="text-blue-400">patient123</p>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              /* ---- REGISTER FORM (Patient) ---- */
              <form onSubmit={handleRegister} className="space-y-4">
                <p className="text-sm text-gray-500">Création de compte Patient</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={regFirstName}
                      onChange={e => setRegFirstName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={regLastName}
                      onChange={e => setRegLastName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance *</label>
                    <input
                      type="date"
                      value={regDOB}
                      onChange={e => setRegDOB(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Groupe sanguin</label>
                    <select
                      value={regBloodType}
                      onChange={e => setRegBloodType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                    >
                      <option value="">—</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={e => setRegAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (séparées par des virgules)</label>
                  <input
                    type="text"
                    value={regAllergies}
                    onChange={e => setRegAllergies(e.target.value)}
                    placeholder="Pénicilline, Aspirine..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  Créer mon compte
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
