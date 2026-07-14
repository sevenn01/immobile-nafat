
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProjects, getApartments, addApartment, deleteApartment, updateApartment, getContracts, getClients, addContract } from '../services/api';
import { Project, Apartment, ApartmentStatus, Contract, Client, ContractStatus } from '../types';
import { PlusIcon, EditIcon, TrashIcon, HomeIcon, GarageIcon, GridIcon, ListIcon, LockIcon, UnlockIcon, BuildingIcon, FileTextIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';
import ApartmentCard from '../components/ApartmentCard';
import Notification from '../components/Notification';
import { PropertyPdfModal } from '../components/PropertyPdfModal';

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  
  // Creation States
  const [propertyType, setPropertyType] = useState<'apartment' | 'garage'>('apartment');
  const [intendedFor, setIntendedFor] = useState<'sale' | 'rental'>('sale');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  
  const { user } = useAuth();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
  const [pdfApartment, setPdfApartment] = useState<Apartment | null>(null);
  const navigate = useNavigate();
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('projectDetailViewMode') as 'list' | 'grid') || 'grid'
  );

  const [manualLockStates, setManualLockStates] = useState<Record<string, boolean>>(() => {
      const saved = localStorage.getItem('apartmentLockStates');
      return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
      localStorage.setItem('apartmentLockStates', JSON.stringify(manualLockStates));
  }, [manualLockStates]);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projectsData, apartmentsData, contractsData, clientsData] = await Promise.all([
          getProjects(),
          getApartments(),
          getContracts(),
          getClients()
      ]);
      const currentProject = projectsData.find(p => p.id === projectId) || null;
      setProject(currentProject);
      setApartments(apartmentsData.filter(a => a.project_id === projectId));
      setContracts(contractsData);
      setClients(clientsData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Smart Auto-naming on floor change
  useEffect(() => {
    if (!editingApartment && selectedFloor && projectId) {
        const floorApts = apartments.filter(a => a.floor === selectedFloor);
        const nextNum = floorApts.length + 1;
        const prefix = selectedFloor === 'RDC' ? 'RDC' : selectedFloor;
        const suggested = propertyType === 'apartment' 
            ? `Appart ${prefix}${nextNum < 10 ? '0' : ''}${nextNum}`
            : `Local ${prefix}-${nextNum}`;
        setManualName(suggested);
    }
  }, [selectedFloor, propertyType, apartments, editingApartment, projectId]);

  const groupedByFloor = useMemo(() => {
    const groups: Record<string, Apartment[]> = {};
    apartments.forEach(apt => {
        const key = apt.floor || 'N/A';
        if (!groups[key]) groups[key] = [];
        groups[key].push(apt);
    });
    return Object.entries(groups).sort(([floorA], [floorB]) => {
        if (floorA === 'RDC') return -1;
        if (floorB === 'RDC') return 1;
        const numA = parseInt(floorA);
        const numB = parseInt(floorB);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return floorA.localeCompare(floorB);
    });
  }, [apartments]);

  const floorOptions = useMemo(() => {
    if (!project) return [];
    const options: string[] = [];
    if (project.has_rdc) options.push('RDC');
    for (let i = 1; i <= project.num_floors; i++) options.push(`${i}`);
    return options;
  }, [project]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if(!user || !projectId) return;
      const formData = new FormData(e.currentTarget);
      
      const data: any = {
          project_id: projectId,
          name: manualName || formData.get('name') || "Sans nom",
          type: propertyType,
          intended_for: intendedFor,
          surface_m2: Number(formData.get('surface_m2')) || 0,
          price_dh: Number(formData.get('price_dh')) || 0,
          sale_price_dh: Number(formData.get('sale_price_dh')) || 0,
          owner_name: formData.get('owner_name') as string || 'Nafat Immobilier',
          description: formData.get('description') as string || '',
          floor: selectedFloor || "RDC",
          titre: (formData.get('titre') as string) || '',
      };

      if (propertyType === 'apartment') {
          data.rooms = Number(formData.get('rooms')) || 0;
          data.bathroom = Number(formData.get('bathroom')) || 0;
          data.balcony = formData.get('balcony') === 'on';
          data.kitchen = formData.get('kitchen') === 'on';
      }
      
      try {
          if (editingApartment) await updateApartment(editingApartment.id, data, user.user_id);
          else await addApartment(data, user.user_id);
          setNotification({ message: "Propriété enregistrée avec succès", type: 'success' });
          fetchData(); 
          closeModal();
      } catch(error: any) { 
          console.error(error);
          setNotification({ message: error.message, type: 'error' });
      }
  }

  const handleDelete = (apartment: Apartment) => {
    setApartmentToDelete(apartment);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!apartmentToDelete) return;
    try {
        await deleteApartment(apartmentToDelete);
        setNotification({ message: "Propriété supprimée avec succès.", type: 'success' });
        fetchData();
    } catch (error: any) {
        // Here we catch logic errors like "Impossible de supprimer car historique existant"
        setNotification({ message: error.message, type: 'error' });
    } finally {
        setIsConfirmModalOpen(false);
        setApartmentToDelete(null);
    }
  };

  const handleViewContractHolder = (apartment: Apartment) => {
    const contract = contracts.find(c => c.id === apartment.current_contract_id);
    if (contract) { navigate(`/clients/${contract.client_id}`); }
  };
  
  const openAddModal = () => { 
      setEditingApartment(null); 
      setPropertyType('apartment'); 
      setIntendedFor('sale'); 
      setSelectedFloor(''); 
      setManualName(''); 
      setIsModalOpen(true); 
  }
  
  const openEditModal = (apt: Apartment) => { 
      setEditingApartment(apt); 
      setPropertyType(apt.type); 
      setIntendedFor(apt.intended_for || 'sale'); 
      setSelectedFloor(apt.floor || ''); 
      setManualName(apt.name); 
      setIsModalOpen(true); 
  }
  
  const closeModal = () => { setIsModalOpen(false); setEditingApartment(null); }

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 sm:text-sm font-medium";

  if (loading) return <div className="flex justify-center py-12">Chargement du projet...</div>;
  if (!project) return <div className="p-8 text-center bg-white rounded-xl shadow-sm border">Projet non trouvé.</div>;

  return (
    <div>
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        <div className="mb-6">
            <Link to="/projets" className="text-sm text-green-600 font-bold hover:underline mb-2 block">&larr; Retour aux projets</Link>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">{project.project_name}</h2>
                    <p className="text-gray-600 mt-1">{project.location}</p>
                </div>
                <div className="flex items-center bg-gray-200 rounded-lg p-1">
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}><ListIcon className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}><GridIcon className="w-5 h-5" /></button>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1"><h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Détails</h3><p className="text-gray-600 leading-relaxed">{project.description}</p></div>
            <button onClick={openAddModal} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow-lg flex items-center"><PlusIcon className="w-5 h-5 mr-2" />Ajouter Propriété</button>
        </div>

        {groupedByFloor.map(([floor, floorApts]) => (
            <div key={floor} className="mb-8">
                <div className="flex items-center space-x-3 bg-gray-100/50 px-4 py-3 rounded-lg border border-gray-200 mb-4">
                    <BuildingIcon className="w-5 h-5 text-gray-500" /><h4 className="text-lg font-bold text-gray-700">{floor === 'RDC' ? 'Rez-de-chaussée' : `Étage ${floor}`}</h4>
                </div>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {floorApts.map((apt) => (
                            <ApartmentCard 
                                key={apt.id} 
                                apartment={apt} 
                                project={project} 
                                isLocked={manualLockStates[apt.id] !== undefined ? manualLockStates[apt.id] : (apt.status === ApartmentStatus.Rented || apt.status === ApartmentStatus.Sold)} 
                                onToggleLock={() => setManualLockStates(p => ({...p, [apt.id]: !p[apt.id]}))} 
                                onEdit={openEditModal} 
                                onDelete={handleDelete} 
                                onRent={() => navigate('/reservations')} 
                                onSell={() => navigate('/reservations')} 
                                onViewContractHolder={handleViewContractHolder} 
                                onViewPdf={(a) => setPdfApartment(a)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                                <tr><th className="px-6 py-3 text-left">Nom</th><th className="px-6 py-3 text-left">Usage</th><th className="px-6 py-3 text-left">Prix/Loyer</th><th className="px-6 py-3 text-center">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">{floorApts.map(apt => (
                                <tr key={apt.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold">{apt.name}</td>
                                    <td className="px-6 py-4 uppercase text-[10px] font-bold">{apt.intended_for === 'sale' ? 'Vente' : 'Loc'}</td>
                                    <td className="px-6 py-4 font-bold">{apt.intended_for === 'sale' ? apt.sale_price_dh?.toLocaleString() : apt.price_dh.toLocaleString()} DH</td>
                                    <td className="px-6 py-4 flex justify-center items-center space-x-3">
                                        <FileTextIcon className="w-5 h-5 cursor-pointer hover:text-green-600" onClick={() => setPdfApartment(apt)} title="Fiche Technique / Dossier PDF" />
                                        <EditIcon className="w-5 h-5 cursor-pointer hover:text-green-600" onClick={() => openEditModal(apt)} />
                                        <TrashIcon className="w-5 h-5 cursor-pointer hover:text-red-600" onClick={() => handleDelete(apt)} />
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
        ))}

        <Modal title={editingApartment ? `Modifier Propriété` : `Ajouter Propriété`} isOpen={isModalOpen} onClose={closeModal}>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700">Usage Prévu</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full mt-2">
                        <button type="button" onClick={() => setIntendedFor('sale')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${intendedFor === 'sale' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>À Vendre</button>
                        <button type="button" onClick={() => setIntendedFor('rental')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${intendedFor === 'rental' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>À Louer</button>
                    </div>
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700">Type</label><div className="flex space-x-2 mt-2"><button type="button" onClick={() => setPropertyType('apartment')} className={`flex-1 py-2 border rounded-lg font-bold text-sm ${propertyType === 'apartment' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Logement</button><button type="button" onClick={() => setPropertyType('garage')} className={`flex-1 py-2 border rounded-lg font-bold text-sm ${propertyType === 'garage' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Garage/Local</button></div></div>
                <div><label className="block text-sm font-bold text-gray-700">Étage</label><select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} required className={inputClasses}><option value="" disabled>Choisir l'étage</option>{floorOptions.map(f => <option key={f} value={f}>{f === 'RDC' ? 'Rez-de-chaussée' : `Étage ${f}`}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700">Nom / Référence <span className="text-[10px] text-green-600 font-bold">(Auto)</span></label><input type="text" value={manualName} onChange={e => setManualName(e.target.value)} required className={inputClasses} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700">Titre de l'appartement (Titre Foncier / Land Title)</label><input type="text" name="titre" defaultValue={editingApartment?.titre || ''} className={inputClasses} placeholder="Ex: TF 12345/66 ou En cours..." /></div>
                
                {propertyType === 'apartment' && (<>
                    <div><label className="block text-sm font-bold text-gray-700">Pièces</label><input type="number" name="rooms" defaultValue={editingApartment?.rooms || 0} className={inputClasses} /></div>
                    <div><label className="block text-sm font-bold text-gray-700">S. Bains</label><input type="number" name="bathroom" defaultValue={editingApartment?.bathroom || 0} className={inputClasses} /></div>
                    <div className="flex items-center space-x-6 py-2"><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="balcony" defaultChecked={editingApartment?.balcony} className="text-green-600 rounded" /><span className="text-sm font-medium">Balcon</span></label><label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="kitchen" defaultChecked={editingApartment?.kitchen} className="text-green-600 rounded" /><span className="text-sm font-medium">Cuisine</span></label></div>
                </>)}

                <div><label className="block text-sm font-bold text-gray-700">Surface (m²)</label><input type="number" name="surface_m2" defaultValue={editingApartment?.surface_m2} required className={inputClasses} /></div>
                
                {intendedFor === 'sale' ? (
                    <div><label className="block text-sm font-bold text-gray-700">Prix Vente (DH)</label><input type="number" name="sale_price_dh" defaultValue={editingApartment?.sale_price_dh || 0} required className={inputClasses} /></div>
                ) : (
                    <div><label className="block text-sm font-bold text-gray-700">Loyer (DH)</label><input type="number" name="price_dh" defaultValue={editingApartment?.price_dh || 0} required className={inputClasses} /></div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-100 rounded-lg font-bold">Annuler</button><button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-lg">Enregistrer</button></div>
            </form>
        </Modal>

        {isConfirmModalOpen && apartmentToDelete && (
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Supprimer ?" message={`Voulez-vous supprimer "${apartmentToDelete.name}" ?`} />
        )}

        {pdfApartment && (
            <PropertyPdfModal 
                apartment={pdfApartment} 
                project={project || undefined} 
                onClose={() => setPdfApartment(null)} 
            />
        )}
    </div>
  );
};

export default ProjectDetailsPage;
