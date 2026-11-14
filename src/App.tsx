// ============================================================
// App — Root component with routing + MySQL loading state
// ============================================================

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/shared/auth';
import LoginPage from '@/features/auth/LoginPage';
import Layout from '@/components/Layout';
import AdminDashboard from '@/features/admin/AdminDashboard';
import PatientDashboard from '@/features/patient/PatientDashboard';
import SecretaryDashboard from '@/features/secretary/SecretaryDashboard';
import DoctorDashboard from '@/features/doctor/DoctorDashboard';
import { Stethoscope } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  // Show loading spinner while connecting to MySQL backend
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Stethoscope className="text-white" size={32} />
          </div>
          <p className="text-gray-600 font-medium">Connexion au serveur...</p>
          <p className="text-gray-400 text-sm mt-1">Vérifiez que le backend est démarré :</p>
          <code className="text-xs bg-gray-100 px-3 py-1 rounded-lg mt-2 inline-block">
            node server/index.js
          </code>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setCurrentView('dashboard')} />;
  }

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      <DashboardRouter currentView={currentView} onNavigate={setCurrentView} />
    </Layout>
  );
}

function DashboardRouter({ currentView, onNavigate }: { currentView: string; onNavigate: (view: string) => void }) {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard view={currentView === 'dashboard' ? 'dashboard' : currentView} />;
    case 'patient':
      return <PatientDashboard view={currentView} />;
    case 'secretary':
      return <SecretaryDashboard view={currentView} />;
    case 'doctor':
      return <DoctorDashboard view={currentView} onNavigate={onNavigate} />;
    default:
      return <div>Rôle non reconnu</div>;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
