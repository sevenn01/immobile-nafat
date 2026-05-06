
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
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-500 focus:outline-none md:hidden"
            aria-label="Ouvrir le menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center">
          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center text-left focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold border border-green-200">
                {userInitial}
              </div>
              <div className="ml-3 hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5">
                {isDeveloper && (
                    <button
                    onClick={handleResetData}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center border-b border-gray-100"
                    >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Réinitialiser les données
                    </button>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
};

export default Header;
