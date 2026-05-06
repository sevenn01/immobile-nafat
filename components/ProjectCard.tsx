
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';
import { EditIcon, TrashIcon, BuildingIcon } from './icons/Icons';

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

type RentalStatus = 'Complet' | 'Partiellement' | 'Disponible' | 'Vide' | 'Vendu';

const getRentalStatus = (project: Project): RentalStatus => {
    const total = project.total_apartments;
    const rented = project.rented_apartments_count ?? 0;
    const sold = project.sold_apartments_count ?? 0;
    
    if (total === 0) return 'Vide';
    if (rented + sold >= total) return 'Complet';
    if (rented + sold > 0) return 'Partiellement';
    return 'Disponible';
};

const getRentalStatusClasses = (status: RentalStatus) => {
    switch (status) {
        case 'Complet': return 'bg-blue-100 text-blue-700';
        case 'Partiellement': return 'bg-green-100 text-green-700';
        case 'Disponible': return 'bg-yellow-100 text-yellow-700';
        case 'Vendu': return 'bg-gray-100 text-gray-700';
        case 'Vide': return 'bg-gray-100 text-gray-400';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const rentalStatus = getRentalStatus(project);
  const capacity = project.total_apartments;
  const registered = (project as any).registered_count ?? 0;
  const occupied = (project.rented_apartments_count ?? 0) + (project.sold_apartments_count ?? 0);
  const percent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
  
  return (
    <div 
        onClick={() => navigate(`/projets/${project.id}`)}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/80 hover:shadow-xl hover:border-green-100 transition-all duration-500 flex flex-col group relative overflow-hidden cursor-pointer"
    >
      <div className="relative flex flex-col h-full">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center space-x-2 text-blue-600">
            <BuildingIcon className="w-4 h-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Promotion Immobilière</span>
          </div>
          
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => onEdit()} className="p-2 rounded-xl text-gray-300 hover:text-blue-600 transition-all bg-gray-50/50 hover:bg-blue-50">
                    <EditIcon className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete()} className="p-2 rounded-xl text-gray-300 hover:text-red-600 transition-all bg-gray-50/50 hover:bg-red-50">
                    <TrashIcon className="w-4 h-4" />
                </button>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors truncate">{project.project_name}</h3>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-4 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {project.location}
        </p>

        <div className="mb-6">
            <span className={`px-4 py-1.5 text-[10px] font-semibold rounded-full uppercase tracking-widest ${getRentalStatusClasses(rentalStatus)}`}>
              {rentalStatus}
            </span>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-50">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Taux d'occupation</p>
                    <p className="text-xl font-bold text-gray-900">{percent}% <span className="text-sm font-medium text-gray-400">({occupied}/{capacity})</span></p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest mb-1">Enregistrés</p>
                    <p className="text-sm font-semibold text-gray-500">{registered} unités</p>
                </div>
            </div>
            <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
