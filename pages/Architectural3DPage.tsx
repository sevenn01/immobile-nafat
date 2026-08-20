import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getProjects, getApartments, getContracts, getClients } from '../services/api';
import { Project, Apartment, Contract, Client } from '../types';
import Architectural3DPlan from '../components/Architectural3DPlan';
import { OccupantQuickInfoModal } from '../components/OccupantQuickInfoModal';
import { ReservationModal } from '../components/ReservationModal';
import Notification from '../components/Notification';
import { Sparkles, Building, Layers, Eye } from 'lucide-react';

const Architectural3DPage: React.FC = () => {
  const { user } = useAuth();
  const isDevUser = user?.email?.toLowerCase() === 'dev@dev';

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Modals
  const [quickInfoApt, setQuickInfoApt] = useState<Apartment | null>(null);
  const [reservationApt, setReservationApt] = useState<Apartment | null>(null);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsData, apartmentsData, contractsData, clientsData] = await Promise.all([
        getProjects(),
        getApartments(),
        getContracts(),
        getClients()
      ]);

      let ghaliProject = projectsData.find(
        p => (p.project_name || '').toUpperCase() === 'GHALI 1' && p.id !== 'ghali_1_project_id'
      ) || projectsData.find(
        p => (p.project_name || '').toLowerCase().includes('ghali')
      );

      if (!ghaliProject) {
        // Fallback default project object if no database match yet
        ghaliProject = projectsData[0] || {
          id: 'ghali_1_project_id',
          project_id: 'ghali_1_project_id',
          project_name: 'GHALI 1',
          location: 'AIN SBAA CASABLANCA',
          description: 'Projet Immobilier Ghali 1 — Immeuble R+4 avec Soupente et Magasins RDC',
          total_apartments: 18,
          num_floors: 4,
          has_rdc: true,
          status: 'active' as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      setProject(ghaliProject);

      const ghaliApartments = apartmentsData.filter(
        a => a.project_id === ghaliProject?.id || a.project_id === 'ghali_1_project_id' || a.name.startsWith('Appt') || a.name.startsWith('Magasin') || a.name.startsWith('Soupente')
      );
      setApartments(ghaliApartments.length > 0 ? ghaliApartments : apartmentsData);
      setContracts(contractsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load 3D plan data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDevUser) {
      fetchData();
    }
  }, [isDevUser, fetchData]);

  // If not developer user, forbid access and redirect to dashboard
  if (!isDevUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-black rounded-full uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Compte Développeur Exclusif
            </span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full">
              Projet Ghali 1
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 pt-1">
            Section Plan 3D Architecte & Occupants
          </h2>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl font-medium">
            Visualisation 3D interactive certifiée issue des plans d'architecte du projet Ghali 1. Survolez chaque appartement avec le curseur pour voir sa fiche d'occupant et ses caractéristiques.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <Building className="w-8 h-8 text-amber-600 shrink-0" />
          <div className="text-xs">
            <div className="font-extrabold text-slate-900">{project?.project_name || 'Ghali 1'}</div>
            <div className="text-slate-500 font-medium">{project?.location || 'Rue n° 1 & Rue n° 2'}</div>
          </div>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-slate-200 text-slate-500 space-y-3 shadow-sm">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-sm">Chargement du Plan Architecte 3D Ghali 1...</p>
        </div>
      ) : project ? (
        <Architectural3DPlan
          project={project}
          apartments={apartments}
          contracts={contracts}
          clients={clients}
          onQuickInfo={(apt) => setQuickInfoApt(apt)}
          onRentOrSell={(apt) => {
            setReservationApt(apt);
            setIsReservationOpen(true);
          }}
        />
      ) : null}

      {/* Quick Info Occupant Modal */}
      {quickInfoApt && (
        <OccupantQuickInfoModal
          isOpen={Boolean(quickInfoApt)}
          onClose={() => setQuickInfoApt(null)}
          apartment={quickInfoApt}
          contract={contracts.find(c => c.id === quickInfoApt.current_contract_id || (c.apartment_id === quickInfoApt.id && c.status !== 'canceled' && c.status !== 'sale_canceled'))}
          client={clients.find(cl => {
            const contract = contracts.find(c => c.id === quickInfoApt.current_contract_id || (c.apartment_id === quickInfoApt.id && c.status !== 'canceled' && c.status !== 'sale_canceled'));
            return cl.id === contract?.client_id;
          })}
        />
      )}

      {/* Reservation Modal */}
      {reservationApt && (
        <ReservationModal
          isOpen={isReservationOpen}
          onClose={() => {
            setIsReservationOpen(false);
            setReservationApt(null);
          }}
          apartment={reservationApt}
          project={project}
          onSuccess={() => {
            setNotification({ message: 'Réservation enregistrée avec succès!', type: 'success' });
            setIsReservationOpen(false);
            setReservationApt(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default Architectural3DPage;
