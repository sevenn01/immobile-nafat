
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MenuIcon, TrashIcon } from './icons/Icons';
import MobileMenu from './MobileMenu';
import { clearDatabase } from '../services/api';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResetData = async () => {
      if (window.confirm("ATTENTION : Vous êtes sur le point de supprimer TOUTES les données (Projets, Appartements, Clients, Contrats, Paiements). Cette action est irréversible. Voulez-vous continuer ?")) {
          try {
              await clearDatabase();
              alert("Données réinitialisées avec succès. L'application va se recharger.");
              window.location.reload();
          } catch (error) {
              console.error("Failed to clear database:", error);
              alert("Une erreur est survenue lors de la suppression des données.");
          }
      }
  };

  const userRole = user?.role === 'admin' ? 'Administrateur' : 'Agent';
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  
  // Only the specific developer email can reset data
  const isDeveloper = user?.email === 'dev@dev';

  return (
    <>
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200/80 no-print sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none md:hidden flex items-center justify-center transition-colors shadow-2xs"
            aria-label="Ouvrir le menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          
          <div className="md:hidden flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-extrabold text-slate-800 text-sm tracking-tight">Nafat Immobilier</span>
          </div>
        </div>

        <div className="flex items-center">
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
              className="flex items-center text-left focus:outline-none p-1 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-sm border border-emerald-200">
                {userInitial}
              </div>
              <div className="ml-3 hidden md:block">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">{userRole}</p>
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl py-1 z-20 border border-slate-100 ring-1 ring-black/5 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 md:hidden">
                    <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">{userRole}</p>
                  </div>
                  {isDeveloper && (
                      <button
                        onClick={handleResetData}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center border-b border-slate-100"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Réinitialiser les données
                      </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
};

export default Header;
