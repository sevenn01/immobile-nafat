
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ApartmentsPage from './pages/ApartmentsPage';
import ClientsPage from './pages/ClientsPage';
import ContractsPage from './pages/ContractsPage';
import LoginPage from './pages/LoginPage';
import PaymentsPage from './pages/PaymentsPage';
import PaymentDocumentsPage from './pages/PaymentDocumentsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ClientDetailsPage from './pages/ClientDetailsPage';
import SettingsPage from './pages/SettingsPage';
import RejectedSalesPage from './pages/RejectedSalesPage';
import { useAuth } from './auth/AuthContext';
import { seedAdminUser } from './firebase/seed';
import SplashScreen from './components/SplashScreen';

const ProtectedRoute: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

const Layout: React.FC = () => (
  <div className="flex h-screen bg-slate-50 font-sans text-gray-800">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);

const App: React.FC = () => {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExitingSplash, setIsExitingSplash] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
        try {
            await seedAdminUser();
        } catch (error) {
            console.error("Failed to seed users:", error);
        }

        setTimeout(() => {
            setIsExitingSplash(true);
        }, 1800); 
        
        setTimeout(() => {
            setIsInitializing(false);
        }, 2600);
    };
    initializeApp();
  }, []);

  if (isInitializing) {
    return <SplashScreen isExiting={isExitingSplash} />;
  }

  return (
    <div className="animate-slide-up-from-bottom">
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projets" element={<ProjectsPage />} />
            <Route path="/projets/:projectId" element={<ProjectDetailsPage />} />
            <Route path="/appartements" element={<ApartmentsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
            <Route path="/contrats" element={<ContractsPage />} />
            <Route path="/rejets" element={<RejectedSalesPage />} />
            <Route path="/paiements" element={<PaymentsPage />} />
            <Route path="/documents-paiements" element={<PaymentDocumentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;
