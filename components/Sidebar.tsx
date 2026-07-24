
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  DashboardIcon, 
  BuildingIcon, 
  HomeIcon, 
  UsersIcon, 
  FileTextIcon, 
  PaymentIcon, 
  SettingsIcon, 
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from './icons/Icons';
import { useAuth } from '../auth/AuthContext';
import { AppPermissions, User } from '../types';

const Sidebar: React.FC = () => {
  const { user } = useAuth() as { user: User | null };
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const commonLinkClass = "flex items-center text-slate-700 font-semibold text-sm transition-all duration-200 rounded-xl group relative";
  const activeLinkClass = "bg-green-600 text-white shadow-md shadow-emerald-200/80 font-bold";
  const inactiveLinkClass = "hover:bg-slate-100 hover:text-slate-900";
  
  const canView = (section: keyof AppPermissions) => {
      if (!user || !user.permissions) return false;
      return user.permissions[section]?.view;
  };

  return (
    <div className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 no-print shrink-0 shadow-2xs transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-[72px]' : 'w-64'
    }`}>
      {/* Header with Logo & Toggle Slide Button */}
      <div className={`flex items-center h-16 border-b border-slate-100 bg-white px-4 transition-all duration-300 ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
         {!isCollapsed && (
           <div className="flex items-center space-x-3 overflow-hidden">
               <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                   N
               </div>
               <h1 className="text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap animate-fade-in">
                 Nafat Immobilier
               </h1>
           </div>
         )}

         {/* Collapse / Slide Button */}
         <button 
            onClick={toggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
              isCollapsed ? 'w-full flex justify-center py-2 bg-slate-50 hover:bg-slate-100' : ''
            }`}
            title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
            aria-label={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
         >
            {isCollapsed ? <ChevronRightIcon className="w-5 h-5 text-slate-600" /> : <ChevronLeftIcon className="w-5 h-5" />}
         </button>
      </div>

      <div className="flex flex-col flex-1 p-3 overflow-y-auto">
        <nav className="flex-1 space-y-1.5">
          {canView('dashboard') && (
              <NavLink
                to="/dashboard"
                title={isCollapsed ? "Tableau de Bord" : undefined}
                className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                <DashboardIcon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="ml-3 truncate">Tableau de Bord</span>}
              </NavLink>
          )}
          {canView('projects') && (
              <NavLink
                to="/projets"
                title={isCollapsed ? "Projets" : undefined}
                className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                <BuildingIcon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="ml-3 truncate">Projets</span>}
              </NavLink>
          )}
          {canView('apartments') && (
              <NavLink
                to="/appartements"
                title={isCollapsed ? "Propriétés" : undefined}
                className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                <HomeIcon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="ml-3 truncate">Propriétés</span>}
              </NavLink>
          )}
          {canView('clients') && (
              <NavLink
                to="/clients"
                title={isCollapsed ? "Clients" : undefined}
                className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                <UsersIcon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="ml-3 truncate">Clients</span>}
              </NavLink>
          )}
          {canView('payments') && (
              <NavLink
                to="/paiements"
                title={isCollapsed ? "Paiements" : undefined}
                className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                <PaymentIcon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="ml-3 truncate">Paiements</span>}
              </NavLink>
          )}
          {canView('contracts') && (
              <>
                <NavLink
                  to="/reservations"
                  title={isCollapsed ? "Réservations" : undefined}
                  className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                >
                  <FileTextIcon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="ml-3 truncate">Réservations</span>}
                </NavLink>
                <NavLink
                  to="/contrats"
                  title={isCollapsed ? "Contrats Definitifs" : undefined}
                  className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                >
                  <FileTextIcon className="w-5 h-5 shrink-0 text-emerald-400" />
                  {!isCollapsed && <span className="ml-3 truncate">Contrats Definitifs</span>}
                </NavLink>
              </>
          )}
          
          <NavLink
            to="/rejets"
            title={isCollapsed ? "Désistements" : undefined}
            className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? 'bg-red-50 text-red-700 font-bold' : 'hover:bg-red-50 text-slate-700'}`}
          >
            <AlertTriangleIcon className="w-5 h-5 shrink-0 text-red-500" />
            {!isCollapsed && <span className="ml-3 truncate">Désistements</span>}
          </NavLink>
        </nav>
        
        <div className="pt-3 border-t border-slate-100">
             {canView('settings') && (
                 <NavLink
                    to="/settings"
                    title={isCollapsed ? "Paramètres" : undefined}
                    className={({ isActive }) => `${commonLinkClass} ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'} ${isActive ? activeLinkClass : inactiveLinkClass}`}
                  >
                    <SettingsIcon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="ml-3 truncate">Paramètres</span>}
                  </NavLink>
             )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
