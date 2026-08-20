
import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, BuildingIcon, HomeIcon, UsersIcon, FileTextIcon, PaymentIcon, CloseIcon, SettingsIcon, AlertTriangleIcon } from './icons/Icons';
import { useAuth } from '../auth/AuthContext';
import { AppPermissions, User } from '../types';
import { Sparkles } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth() as { user: User | null };
  const isDevUser = user?.email?.toLowerCase() === 'dev@dev';
  
  const commonLinkClass = "flex items-center px-4 py-3 text-slate-700 font-semibold text-sm transition-all duration-200 rounded-xl active:scale-98";
  const activeLinkClass = "bg-emerald-600 text-white shadow-md shadow-emerald-200/80 font-bold";
  const inactiveLinkClass = "hover:bg-slate-100/80 hover:text-slate-900";
  
  const handleLinkClick = () => {
    onClose();
  };
  
  const canView = (section: keyof AppPermissions) => {
      if (!user || !user.permissions) return false;
      return user.permissions[section]?.view;
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const userRole = user?.role === 'admin' ? 'Administrateur' : 'Agent';

  return (
    <>
        {/* Backdrop Overlay with Smooth Fade */}
        <div 
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ease-in-out no-print ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`} 
            onClick={onClose}
            aria-hidden="true"
        />
        
        {/* Pure Slide-in Drawer from Left (-translate-x-full to translate-x-0) */}
        <div 
            className={`fixed top-0 left-0 bottom-0 w-[280px] max-w-[82vw] h-full bg-white shadow-2xl z-50 md:hidden flex flex-col transform transition-transform duration-300 ease-in-out no-print ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            {/* Drawer Header */}
            <div className="flex items-center justify-between h-16 border-b border-slate-100 px-5 bg-slate-900 text-white shrink-0">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
                        N
                    </div>
                    <span className="text-base font-extrabold tracking-tight text-white">Nafat Immobilier</span>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" 
                    aria-label="Fermer le menu"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>

            {/* User Profile Mini Badge */}
            {user && (
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center border border-emerald-200 shrink-0">
                        {userInitial}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{userRole}</p>
                    </div>
                </div>
            )}

            {/* Navigation Links */}
            <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
                <nav className="space-y-1">
                    {canView('dashboard') && (
                        <NavLink to="/dashboard" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <DashboardIcon className="w-5 h-5 mr-3 shrink-0" />
                            <span>Tableau de Bord</span>
                        </NavLink>
                    )}
                    {canView('projects') && (
                        <NavLink to="/projets" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <BuildingIcon className="w-5 h-5 mr-3 shrink-0" />
                            <span>Projets</span>
                        </NavLink>
                    )}
                    {isDevUser && (
                        <NavLink to="/plan-3d" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? 'bg-amber-600 text-white font-bold' : inactiveLinkClass}`}>
                            <Sparkles className="w-5 h-5 mr-3 shrink-0 text-amber-400" />
                            <span>Plan 3D (Dev)</span>
                        </NavLink>
                    )}
                    {canView('apartments') && (
                        <NavLink to="/appartements" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <HomeIcon className="w-5 h-5 mr-3 shrink-0" />
                            <span>Propriétés</span>
                        </NavLink>
                    )}
                    {canView('clients') && (
                        <NavLink to="/clients" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <UsersIcon className="w-5 h-5 mr-3 shrink-0" />
                            <span>Clients</span>
                        </NavLink>
                    )}
                    {canView('payments') && (
                        <NavLink to="/paiements" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <PaymentIcon className="w-5 h-5 mr-3 shrink-0" />
                            <span>Paiements</span>
                        </NavLink>
                    )}
                    {canView('contracts') && (
                        <>
                            <NavLink to="/reservations" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                                <FileTextIcon className="w-5 h-5 mr-3 shrink-0" />
                                <span>Réservations</span>
                            </NavLink>
                            <NavLink to="/contrats" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                                <FileTextIcon className="w-5 h-5 mr-3 shrink-0 text-emerald-400" />
                                <span>Contrats Definitifs</span>
                            </NavLink>
                        </>
                    )}
                    
                    <NavLink to="/rejets" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? 'bg-red-50 text-red-700 font-bold' : 'hover:bg-red-50 text-slate-700'}`}>
                        <AlertTriangleIcon className="w-5 h-5 mr-3 shrink-0 text-red-500" />
                        <span>Désistements</span>
                    </NavLink>

                    {canView('settings') && (
                        <NavLink to="/settings" onClick={handleLinkClick} className={({ isActive }) => `${commonLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass} mt-3 pt-3 border-t border-slate-100`}>
                            <SettingsIcon className="w-5 h-5 mr-3 shrink-0" />
                            <span>Paramètres</span>
                        </NavLink>
                    )}
                </nav>
            </div>
        </div>
    </>
  );
};

export default MobileMenu;
