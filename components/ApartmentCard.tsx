
import React from 'react';
import { Apartment, ApartmentStatus, Project } from '../types';
import { HomeIcon, GarageIcon, EditIcon, TrashIcon, BedIcon, BathIcon, SunIcon, FlameIcon, LockIcon, UnlockIcon, BuildingIcon, FileTextIcon } from './icons/Icons';

interface ApartmentCardProps {
  apartment: Apartment;
  project?: Project;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onEdit: (apartment: Apartment) => void;
  onDelete: (apartment: Apartment) => void;
  onRent: (apartment: Apartment) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  onSell: (apartment: Apartment) => void;
  onViewContractHolder: (apartment: Apartment) => void;
  onViewPdf?: (apartment: Apartment) => void;
}

const translateStatus = (status: ApartmentStatus, intendedFor: 'sale' | 'rental') => {
    switch (status) {
        case ApartmentStatus.Available: return intendedFor === 'sale' ? 'A VENDRE' : 'Disponible';
        case ApartmentStatus.Rented: return 'Loué';
        case ApartmentStatus.Maintenance: return 'En Maintenance';
        case ApartmentStatus.ForSale: return 'A VENDRE';
        case ApartmentStatus.Sold: return intendedFor === 'sale' ? 'RESERVE' : 'Vendu';
        default: return status;
    }
};

const getStatusClasses = (status: ApartmentStatus, intendedFor: 'sale' | 'rental') => {
  if (status === ApartmentStatus.Available || status === ApartmentStatus.ForSale) {
      return intendedFor === 'sale' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-green-100 text-green-700 border border-green-200';
  }
  switch (status) {
    case ApartmentStatus.Rented: return 'bg-blue-100 text-blue-700 border border-blue-200';
    case ApartmentStatus.Maintenance: return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    case ApartmentStatus.Sold: return intendedFor === 'sale' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-150 text-gray-700 border border-gray-250';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const ApartmentInfo: React.FC<{ icon: React.ReactNode; label: string; value: string | number | undefined }> = ({ icon, label, value }) => (
    <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="text-gray-400 group-hover:text-green-500 transition-colors">{icon}</div>
        <div className="flex items-baseline space-x-1">
            <span className="font-medium text-gray-600">{label}:</span> 
            <span className="font-semibold text-gray-800">{value}</span>
        </div>
    </div>
);

const ApartmentAmenity: React.FC<{ icon: React.ReactNode; label: string; available: boolean | undefined; colorClass: string }> = ({ icon, label, available, colorClass }) => {
    if (!available) return null;
    return (
        <div className={`flex items-center space-x-2 text-[10px] font-semibold px-3 py-1.5 rounded-xl border border-transparent ${colorClass}`}>
            {icon}
            <span>{label}</span>
        </div>
    );
}

const ApartmentCard: React.FC<ApartmentCardProps> = ({ apartment, project, isLocked = false, onToggleLock, onEdit, onDelete, onRent, onSelect, isSelected = false, onSell, onViewContractHolder, onViewPdf }) => {

  const handleToggleLock = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(onToggleLock) onToggleLock();
  };

  const renderFooter = () => {
    const isSale = apartment.intended_for === 'sale';
    const isOccupied = apartment.status === ApartmentStatus.Rented || apartment.status === ApartmentStatus.Sold;
    
    return (
        <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
            <div className="flex flex-col">
                <div className="flex items-baseline space-x-1">
                    <span className="text-xl font-bold text-gray-900">
                        {(isOccupied ? (apartment.status === ApartmentStatus.Sold && apartment.sale_price_dh ? apartment.sale_price_dh : apartment.price_dh) : (isSale ? (apartment.sale_price_dh || 0) : apartment.price_dh)).toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">DH</span>
                    {!isSale && !isOccupied && <span className="text-xs font-semibold text-gray-400 ml-1">/ mois</span>}
                </div>
                {isOccupied && (
                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5" onClick={e => e.stopPropagation()}>Dossier #{apartment.current_contract_id?.substring(0,6)}</span>
                )}
            </div>
            
            {isOccupied ? (
                <button 
                    type="button" 
                    onClick={() => onViewContractHolder(apartment)} 
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
                >
                    Dossier
                </button>
            ) : (
                <button 
                    type="button" 
                    onClick={() => isSale ? onSell(apartment) : onRent(apartment)} 
                    className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all active:scale-95 shadow-lg ${isSale ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100' : 'bg-green-600 hover:bg-green-700 shadow-green-100'}`}
                >
                    Réserver
                </button>
            )}
        </div>
    );
  }

  return (
    <div 
        className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100/80 transition-all duration-500 flex flex-col group relative overflow-hidden ${
            (apartment.status === ApartmentStatus.Rented || apartment.status === ApartmentStatus.Sold) ? 'hover:shadow-xl hover:border-green-100' : ''
        } ${isLocked ? 'ring-2 ring-red-100' : ''}`}
    >
      {/* Visual Decoration / "Bubble" Effect */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] transition-all duration-700 group-hover:scale-150 ${
          apartment.status === ApartmentStatus.Available || apartment.status === ApartmentStatus.ForSale ? 'bg-green-500' : 'bg-gray-500'
      }`}></div>

      <div className="relative flex flex-col h-full">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center space-x-2 text-green-600">
            {onSelect && (
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={() => onSelect(apartment.id)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer accent-green-600 mr-1"
                onClick={e => e.stopPropagation()}
              />
            )}
            <HomeIcon className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{project?.project_name || 'Projet'}</span>
          </div>
          
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
            {onToggleLock && (
              <button 
                onClick={handleToggleLock} 
                className={`p-2 rounded-xl transition-all focus:outline-none ${isLocked ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-300 hover:text-green-600 hover:bg-green-50'}`}
                title={isLocked ? "Déverrouiller" : "Verrouiller"}
              >
                  {isLocked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
              </button>
            )}
            {onViewPdf && (
              <button 
                onClick={() => onViewPdf(apartment)} 
                className="p-2 rounded-xl text-gray-300 hover:text-green-600 transition-all bg-gray-50/50 hover:bg-green-50 focus:outline-none"
                title="Fiche Technique / Dossier PDF"
              >
                <FileTextIcon className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => onEdit(apartment)} className="p-2 rounded-xl text-gray-300 hover:text-blue-600 transition-all bg-gray-50/50 hover:bg-blue-50 focus:outline-none">
                <EditIcon className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(apartment)} className="p-2 rounded-xl text-gray-300 hover:text-red-600 transition-all bg-gray-50/50 hover:bg-red-50 focus:outline-none">
                <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors truncate">{apartment.name}</h3>

        <div className="mb-6">
            <span className={`px-4 py-1.5 text-[10px] font-semibold rounded-full uppercase tracking-widest ${getStatusClasses(apartment.status, apartment.intended_for)}`}>
              {translateStatus(apartment.status, apartment.intended_for)}
            </span>
        </div>

        <div className="grid grid-cols-2 gap-y-4 mb-6">
            <ApartmentInfo 
                icon={<span className="text-xs font-semibold">m²</span>} 
                label="Surface" 
                value={apartment.surface_m2} 
            />
            <ApartmentInfo 
                icon={<BuildingIcon className="w-4 h-4" />} 
                label="Étage" 
                value={apartment.floor === 'RDC' ? 'RDC' : apartment.floor} 
            />
            {apartment.type === 'apartment' && (
                <>
                    <ApartmentInfo 
                        icon={<BedIcon className="w-4 h-4" />} 
                        label="Pièces" 
                        value={apartment.rooms} 
                    />
                    <ApartmentInfo 
                        icon={<BathIcon className="w-4 h-4" />} 
                        label="S. Bains" 
                        value={apartment.bathroom} 
                    />
                </>
            )}
            {apartment.titre && (
                <div className="col-span-2 flex items-center space-x-2 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-700 w-fit">
                    <span className="text-indigo-400 uppercase tracking-wider text-[9px]">TF:</span>
                    <span>{apartment.titre}</span>
                </div>
            )}
        </div>

        {apartment.type === 'apartment' && (
            <div className="flex flex-wrap gap-2 mb-4">
                <ApartmentAmenity 
                    icon={<SunIcon className="w-3 h-3 text-orange-500" />} 
                    label="Balcon" 
                    available={apartment.balcony} 
                    colorClass="bg-orange-50/50 text-orange-600 border-orange-100/50"
                />
                <ApartmentAmenity 
                    icon={<FlameIcon className="w-3 h-3 text-red-500" />} 
                    label="Cuisine" 
                    available={apartment.kitchen} 
                    colorClass="bg-red-50/50 text-red-600 border-red-100/50"
                />
            </div>
        )}

        {renderFooter()}
      </div>
    </div>
  );
};

export default ApartmentCard;
