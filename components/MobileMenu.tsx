
import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, BuildingIcon, HomeIcon, UsersIcon, FileTextIcon, PaymentIcon, CloseIcon, SettingsIcon, AlertTriangleIcon, PaperclipIcon } from './icons/Icons';
import { useAuth } from '../auth/AuthContext';
import { AppPermissions, User } from '../types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth() as { user: User | null };
  const commonLinkClass = "flex items-center px-4 py-3 text-gray-700 transition-colors duration-200 transform rounded-lg";
  const activeLinkClass = "bg-gray-200 text-gray-800";
  const inactiveLinkClass = "hover:bg-gray-100";
  
  const handleLinkClick = () => {
    onClose();
  };
  
  const canView = (section: keyof AppPermissions) => {
      if (!user || !user.permissions) return false;
      return user.permissions[section]?.view;
  };

  return (
    <>
        {/* Overlay */}
        <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={onClose}
            aria-hidden="true"
        ></div>
        
        {/* Menu Panel */}
        <div 
            className={`fixed top-0 left-0 flex flex-col w-64 h-full bg-white shadow-xl z-40 md:hidden transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
                <h1 className="text-xl font-semibold text-gray-800">Nafat Immobilier</h1>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Fermer le menu">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                <nav>
                    {canView('dashboard') && (
                        <NavLink to="/dashboard" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <DashboardIcon className="w-5 h-5" />
                            <span className="mx-4 font-medium">Tableau de Bord</span>
                        </NavLink>
                    )}
                    {canView('projects') && (
                        <NavLink to="/projets" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}>
                            <BuildingIcon className="w-5 h-5" />
                            <span className="mx-4 font-medium">Projets</span>
                        </NavLink>
                    )}
                    {canView('apartments') && (
                        <NavLink to="/appartements" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}>
                            <HomeIcon className="w-5 h-5" />
                            <span className="mx-4 font-medium">Propriétés</span>
                        </NavLink>
                    )}
                    {canView('clients') && (
                        <NavLink to="/clients" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}>
                            <UsersIcon className="w-5 h-5" />
                            <span className="mx-4 font-medium">Clients</span>
                        </NavLink>
                    )}
                    {canView('contracts') && (
                        <NavLink to="/contrats" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}>
                            <FileTextIcon className="w-5 h-5" />
                            <span className="mx-4 font-medium">Contrats</span>
                        </NavLink>
                    )}
                    {canView('payments') && (
                        <>
                            <NavLink to="/paiements" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}>
                                <PaymentIcon className="w-5 h-5" />
                                <span className="mx-4 font-medium">Paiements</span>
                            </NavLink>
                            <NavLink to="/documents-paiements" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? 'bg-green-50 text-green-700' : 'hover:bg-green-50 text-gray-700'} mt-1`}>
                                <PaperclipIcon className="w-5 h-5" />
                                <span className="mx-4 font-medium">Documents</span>
                            </NavLink>
                        </>
                    )}
                    
                    <NavLink to="/rejets" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? 'bg-red-50 text-red-700' : 'hover:bg-red-50 text-gray-700'} mt-2`}>
                        <AlertTriangleIcon className="w-5 h-5" />
                        <span className="mx-4 font-medium">Désistements</span>
                    </NavLink>

                    {canView('settings') && (
                         <NavLink to="/settings" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}>
                            <SettingsIcon className="w-5 h-5" />
                            <span className="mx-4 font-medium">Paramètres</span>
                        </NavLink>
                    )}
                </nav>
            </div>
        </div>
    </>
  );
};

export default MobileMenu;
