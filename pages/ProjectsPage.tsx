
import React, { useState, useEffect, useCallback } from 'react';
import { getProjects, getApartments, addProject, updateProject, deleteProject } from '../services/api';
import { PlusIcon, GridIcon, ListIcon, SearchIcon, XCircleIcon, EditIcon, TrashIcon } from '../components/icons/Icons';
import { Project, ProjectStatus, Apartment, ApartmentStatus } from '../types';
import Modal from '../components/Modal';
import ProjectCard from '../components/ProjectCard';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('projectsViewMode');
        return (savedMode as 'grid' | 'list') || 'grid';
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [hasRdc, setHasRdc] = useState(true);
    const [numApartments, setNumApartments] = useState(1);
    const [numRdc, setNumRdc] = useState(1);

    useEffect(() => {
        localStorage.setItem('projectsViewMode', viewMode);
    }, [viewMode]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsData, apartmentsData] = await Promise.all([
          getProjects(),
          getApartments()
      ]);
      
      const projectsWithCounts = projectsData.map(p => ({
          ...p,
          rented_apartments_count: apartmentsData.filter(a => a.project_id === p.id && a.status === ApartmentStatus.Rented).length,
          sold_apartments_count: apartmentsData.filter(a => a.project_id === p.id && a.status === ApartmentStatus.Sold).length,
          registered_count: apartmentsData.filter(a => a.project_id === p.id).length
      }));

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProjects = projects.filter(p => {
    const nameMatch = p.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || p.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const calculatedTotal = numApartments + (hasRdc ? numRdc : 0);
    const projectData: Partial<Project> = {
        project_name: formData.get('projectName') as string,
        location: formData.get('location') as string,
        description: formData.get('description') as string,
        status: (formData.get('status') as ProjectStatus) || ProjectStatus.Active,
        num_floors: Number(formData.get('num_floors')),
        has_rdc: hasRdc,
        num_apartments: numApartments,
        num_rdc: hasRdc ? numRdc : 0,
        total_apartments: calculatedTotal
    };
    
    try {
      if (editingProject) {
        await updateProject(editingProject.id, projectData, user.user_id);
      } else {
        await addProject(projectData, user.user_id);
      }
      fetchData();
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("Erreur lors de la sauvegarde du projet.");
    }
  }

  const handleDeleteProject = async (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      const units = project?.registered_count || 0;
      
      if (units > 0) {
          setNotification({ 
              message: `Désolé, ce projet contient ${units} unité(s). Vous devez d'abord supprimer toutes les propriétés de ce projet avant de pouvoir le supprimer.`, 
              type: 'error' 
          });
          return;
      }

      setProjectToDelete(projectId);
  }

  const confirmDeleteProject = async () => {
      if (!projectToDelete) return;
      
      try {
          await deleteProject(projectToDelete);
          await fetchData();
          setNotification({ message: "Projet supprimé avec succès.", type: 'success' });
      } catch(error: any) {
          console.error("Failed to delete project:", error);
          setNotification({ message: error.message || "Erreur lors de la suppression du projet.", type: 'error' });
      } finally {
          setProjectToDelete(null);
      }
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setHasRdc(project.has_rdc !== false);
    const existingNumRdc = project.num_rdc ?? (project.has_rdc ? 1 : 0);
    setNumApartments(project.num_apartments ?? Math.max(0, project.total_apartments - existingNumRdc));
    setNumRdc(existingNumRdc);
    setIsModalOpen(true);
  }
  
  const openAddModal = () => {
    setEditingProject(null);
    setHasRdc(true);
    setNumApartments(12);
    setNumRdc(2);
    setIsModalOpen(true);
  }

  const inputClasses = "mt-1 block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 sm:text-sm font-medium transition-all group";

  if (loading) {
    return (
        <div className="p-8 flex justify-center items-center h-64 text-gray-400 font-bold italic">
            Chargement des projets...
        </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Projets</h2>
        <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button 
                    onClick={() => setViewMode('list')} 
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <ListIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode('grid')} 
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <GridIcon className="w-5 h-5" />
                </button>
            </div>
            <button 
                onClick={openAddModal}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center shadow-lg font-bold active:scale-95"
            >
                <PlusIcon className="w-5 h-5 mr-1" />
                Ajouter
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-8 flex flex-wrap items-center gap-2">
            <div className="relative flex-grow min-w-[200px]">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Rechercher par nom de projet..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-gray-50 pl-12 pr-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700" 
                />
            </div>
            <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 cursor-pointer min-w-[150px]"
            >
                <option value="all">Tous les statuts</option>
                <option value={ProjectStatus.Active}>En cours</option>
                <option value={ProjectStatus.Paused}>En pause</option>
                <option value={ProjectStatus.Completed}>Terminé</option>
            </select>
            {(searchTerm || statusFilter !== 'all') && (
                <button 
                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} 
                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                    <XCircleIcon className="w-6 h-6 text-gray-400" />
                </button>
            )}
        </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} onEdit={() => openEditModal(project)} onDelete={() => handleDeleteProject(project.id)} />
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-bottom border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Projet</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Localisation</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Unités</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Occupé</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filteredProjects.map(p => (
                        <tr 
                            key={p.id} 
                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                            onClick={() => navigate(`/projets/${p.id}`)}
                        >
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">{p.project_name}</div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{p.status === ProjectStatus.InProgress ? 'En cours' : p.status === ProjectStatus.Paused ? 'En Pause' : 'Terminé'}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-600">{p.location || '-'}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                                    {p.registered_count || 0} unité(s)
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-green-500 rounded-full" 
                                            style={{ width: `${p.registered_count ? ((p.rented_apartments_count! + p.sold_apartments_count!) / p.registered_count) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-400">
                                        {Math.round(p.registered_count ? ((p.rented_apartments_count! + p.sold_apartments_count!) / p.registered_count) * 100 : 0)}%
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => openEditModal(p)} className="p-2 text-gray-400 hover:text-green-600 transition-colors"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      <Modal title={editingProject ? "Modifier le Projet" : "Ajouter un Nouveau Projet"} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProject(null); }}>
        <form onSubmit={handleFormSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Nom du Projet</label>
              <input type="text" name="projectName" id="projectName" defaultValue={editingProject?.project_name} required className={inputClasses} />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Localisation</label>
              <input type="text" name="location" id="location" defaultValue={editingProject?.location} required className={inputClasses} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="num_floors" className="block text-sm font-medium text-gray-700">Nombre d'étages</label>
                  <input type="number" min="0" name="num_floors" id="num_floors" defaultValue={editingProject?.num_floors || 0} required className={inputClasses} />
                </div>
                <div className="flex items-center pt-6">
                    <div className="flex items-center">
                        <input 
                            id="has_rdc" 
                            name="has_rdc" 
                            type="checkbox" 
                            checked={hasRdc} 
                            onChange={(e) => {
                                setHasRdc(e.target.checked);
                                if (!e.target.checked) {
                                    setNumRdc(0);
                                } else {
                                    setNumRdc(editingProject?.num_rdc || 1);
                                }
                            }}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer" 
                        />
                        <label htmlFor="has_rdc" className="ml-2 block text-sm text-gray-900 font-medium cursor-pointer">Inclure RDC</label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="num_apartments" className="block text-sm font-medium text-gray-700">Nombre d'appartements</label>
                  <input 
                    type="number" 
                    min="0" 
                    name="num_apartments" 
                    id="num_apartments" 
                    value={numApartments}
                    onChange={(e) => setNumApartments(Number(e.target.value))}
                    required 
                    className={inputClasses} 
                  />
                </div>
                <div>
                  <label htmlFor="num_rdc" className={`block text-sm font-medium transition-colors ${hasRdc ? 'text-gray-700' : 'text-gray-400'}`}>Nombre de RDC</label>
                  <input 
                    type="number" 
                    min="0" 
                    name="num_rdc" 
                    id="num_rdc" 
                    value={hasRdc ? numRdc : 0}
                    onChange={(e) => setNumRdc(Number(e.target.value))}
                    disabled={!hasRdc}
                    required 
                    className={`${inputClasses} ${!hasRdc ? 'bg-gray-100/80 text-gray-400 cursor-not-allowed' : ''}`} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacité Totale (Unités)</label>
                  <div className="mt-1 block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-green-700">
                    {numApartments + (hasRdc ? numRdc : 0)} unités
                  </div>
                  <input type="hidden" name="total_apartments" value={numApartments + (hasRdc ? numRdc : 0)} />
                </div>
            </div>

            {editingProject && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Statut</label>
                <select name="status" id="status" defaultValue={editingProject?.status} className={inputClasses}>
                  <option value={ProjectStatus.Active}>Actif</option>
                  <option value={ProjectStatus.Paused}>En Pause</option>
                  <option value={ProjectStatus.Completed}>Terminé</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" id="description" rows={3} defaultValue={editingProject?.description} className={inputClasses}></textarea>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={() => { setIsModalOpen(false); setEditingProject(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm">Sauvegarder</button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal 
        isOpen={projectToDelete !== null}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDeleteProject}
        title="Supprimer le Projet"
        message="Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible."
      />

      {notification && (
        <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
        />
      )}

    </div>
  );
};

export default ProjectsPage;
