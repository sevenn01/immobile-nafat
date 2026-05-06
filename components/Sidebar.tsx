
import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, BuildingIcon, HomeIcon, UsersIcon, FileTextIcon, PaymentIcon, SettingsIcon, AlertTriangleIcon, PaperclipIcon } from './icons/Icons';
import { useAuth } from '../auth/AuthContext';
import { AppPermissions, User } from '../types';

const Sidebar: React.FC = () => {
  const { user } = useAuth() as { user: User | null };
  const commonLinkClass = "flex items-center px-4 py-2.5 text-gray-600 transition-colors duration-200 transform rounded-lg";
  const activeLinkClass = "bg-gray-200 text-gray-800 shadow-sm";
  const inactiveLinkClass = "hover:bg-gray-100";
  
  const canView = (section: keyof AppPermissions) => {
      if (!user || !user.permissions) return false;
      return user.permissions[section]?.view;
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
         <h1 className="text-xl font-bold text-gray-800">Nafat Immobilier</h1>
      </div>

      <div className="flex flex-col flex-1 p-4">
        <nav className="flex-1">
          {canView('dashboard') && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                <DashboardIcon className="w-5 h-5" />
                <span className="ml-3 font-medium">Tableau de Bord</span>
              </NavLink>
          )}
          {canView('projects') && (
              <NavLink
                to="/projets"
                className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}
              >
                <BuildingIcon className="w-5 h-5" />
                <span className="ml-3 font-medium">Projets</span>
              </NavLink>
          )}
          {canView('apartments') && (
              <NavLink
                to="/appartements"
                className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}
              >
                <HomeIcon className="w-5 h-5" />
                <span className="ml-3 font-medium">Propriétés</span>
              </NavLink>
          )}
          {canView('clients') && (
              <NavLink
                to="/clients"
                className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}
              >
                <UsersIcon className="w-5 h-5" />
                <span className="ml-3 font-medium">Clients</span>
              </NavLink>
          )}
          {canView('contracts') && (
              <NavLink
                to="/contrats"
                className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}
              >
                <FileTextIcon className="w-5 h-5" />
                <span className="ml-3 font-medium">Contrats</span>
              </NavLink>
          )}
          

          {canView('payments') && (
              <>
                  <NavLink
                    to="/paiements"
                    className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-2`}
                  >
                    <PaymentIcon className="w-5 h-5" />
                    <span className="ml-3 font-medium">Paiements</span>
                  </NavLink>
                  <NavLink
                    to="/documents-paiements"
                    className={({ isActive }) => `${commonLinkClass} ${isActive ? 'bg-green-50 text-green-700' : 'hover:bg-green-50 text-gray-600'} mt-1`}
                  >
                    <PaperclipIcon className="w-5 h-5" />
                    <span className="ml-3 font-medium">Documents</span>
                  </NavLink>
              </>
          )}
          
          <NavLink
            to="/rejets"
            className={({ isActive }) => `${commonLinkClass} ${isActive ? 'bg-red-50 text-red-700' : 'hover:bg-red-50 text-gray-600'} mt-2`}
          >
            <AlertTriangleIcon className="w-5 h-5" />
            <span className="ml-3 font-medium">Désistements</span>
          </NavLink>
        </nav>
        
        <div className="pt-4 border-t border-gray-200">
             {canView('settings') && (
                 <NavLink
                    to="/settings"
                    className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                  >
                    <SettingsIcon className="w-5 h-5" />
                    <span className="ml-3 font-medium">Paramètres</span>
                  </NavLink>
             )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
