
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApartments, getProjects, addApartment, updateApartment, deleteApartment, getContracts, getClients } from '../services/api';
import { Apartment, Project, ApartmentStatus, Contract, Client } from '../types';
import { PlusIcon, EditIcon, TrashIcon, HomeIcon, GarageIcon, SearchIcon, XCircleIcon, GridIcon, ListIcon, BuildingIcon, FileTextIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import ApartmentCard from '../components/ApartmentCard';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import { PropertyPdfModal } from '../components/PropertyPdfModal';
import { AllPropertiesPdfModal } from '../components/AllPropertiesPdfModal';

const ApartmentsPage: React.FC = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
    
    // Form States
    const [propertyType, setPropertyType] = useState<'apartment' | 'garage'>('apartment');
    const [intendedFor, setIntendedFor] = useState<'sale' | 'rental'>('sale');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedFloor, setSelectedFloor] = useState<string>('');
    const [manualName, setManualName] = useState<string>('');
    
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
    const [pdfApartment, setPdfApartment] = useState<Apartment | null>(null);
    const [selectedApartmentIds, setSelectedApartmentIds] = useState<string[]>([]);
    const [isMultiPdfOpen, setIsMultiPdfOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ 
        status: 'all', 
        projectId: 'all', 
        floor: 'all',
        type: 'all',
        minPrice: '',
        maxPrice: '',
        minSurface: '',
        maxSurface: ''
    });
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('apartmentsViewMode');
        return (savedMode as 'grid' | 'list') || 'grid';
    });

    useEffect(() => {
        localStorage.setItem('apartmentsViewMode', viewMode);
    }, [viewMode]);
    
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [apts, projs, ctrs, cls] = await Promise.all([ getApartments(), getProjects(), getContracts(), getClients() ]);
            setApartments(apts); setProjects(projs); setContracts(ctrs); setClients(cls);
        } catch (error) { 
            console.error(error);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    // Auto-naming logic when floor changes
    useEffect(() => {
        if (!editingApartment && selectedFloor && selectedProjectId) {
            const sameFloorApts = apartments.filter(a => a.project_id === selectedProjectId && a.floor === selectedFloor);
            const nextNum = sameFloorApts.length + 1;
            const prefix = selectedFloor === 'RDC' ? 'RDC' : selectedFloor;
            const suggestedName = propertyType === 'apartment' 
                ? `Appart ${prefix}${nextNum < 10 ? '0' : ''}${nextNum}`
                : `Magasin ${prefix}-${nextNum}`;
            setManualName(suggestedName);
        }
    }, [selectedFloor, selectedProjectId, propertyType, apartments, editingApartment]);

    const floorOptions = useMemo(() => {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project) return [];
        const options: string[] = [];
        if (project.has_rdc) options.push('RDC');
        for (let i = 1; i <= project.num_floors; i++) options.push(`${i}`);
        return options;
    }, [selectedProjectId, projects]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!user) return;
        const formData = new FormData(e.currentTarget);
        
        // CLEANING DATA: Ensure NO undefined values are sent to Firestore
        const data: any = {
            project_id: selectedProjectId,
            name: manualName || formData.get('name') || "Sans nom",
            type: propertyType,
            intended_for: intendedFor,
            floor: selectedFloor || "RDC",
            surface_m2: Number(formData.get('surface_m2')) || 0,
            price_dh: Number(formData.get('price_dh')) || 0,
            sale_price_dh: Number(formData.get('sale_price_dh')) || 0,
            owner_name: formData.get('owner_name') as string || 'Nafat Immobilier',
            description: formData.get('description') as string || '',
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
        } catch (error: any) { 
            console.error(error);
            setNotification({ message: "Erreur: " + error.message, type: 'error' }); 
        }
    };

    const openAddModal = () => {
        setEditingApartment(null); 
        setSelectedProjectId(''); 
        setSelectedFloor(''); 
        setManualName(''); 
        setPropertyType('apartment'); 
        setIntendedFor('sale'); 
        setIsModalOpen(true);
    };

    const openEditModal = (apt: Apartment) => {
        setEditingApartment(apt); 
        setSelectedProjectId(apt.project_id); 
        setSelectedFloor(apt.floor || ''); 
        setManualName(apt.name); 
        setPropertyType(apt.type); 
        setIntendedFor(apt.intended_for || 'sale'); 
        setIsModalOpen(true);
    };

    const closeModal = () => { 
        setIsModalOpen(false); 
        setEditingApartment(null); 
        setManualName(''); 
        setSelectedProjectId(''); 
        setSelectedFloor(''); 
    };

    const handleConfirmDelete = async () => {
        if (!apartmentToDelete) return;
        try {
            await deleteApartment(apartmentToDelete);
            setNotification({ message: "Propriété supprimée avec succès.", type: 'success' });
            fetchData();
        } catch (error: any) {
            setNotification({ message: error.message, type: 'error' });
        } finally {
            setIsConfirmModalOpen(false);
            setApartmentToDelete(null);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 text-gray-900 sm:text-sm font-medium";

    const filteredApartments = useMemo(() => {
        return apartments.filter(a => {
            const projectMatch = filters.projectId === 'all' || a.project_id === filters.projectId;
            
            // Selling / Renting status options filter mapping
            let statusMatch = true;
            if (filters.status !== 'all') {
                if (filters.status === 'a_vendre') {
                    statusMatch = a.intended_for === 'sale' && (a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale);
                } else if (filters.status === 'reserve') {
                    statusMatch = a.intended_for === 'sale' && a.status === ApartmentStatus.Sold;
                } else if (filters.status === 'rented') {
                    statusMatch = a.intended_for === 'rental' && a.status === ApartmentStatus.Rented;
                } else if (filters.status === 'available_rental') {
                    statusMatch = a.intended_for === 'rental' && (a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale);
                } else {
                    statusMatch = a.status === filters.status;
                }
            }

            const floorMatch = filters.floor === 'all' || a.floor === filters.floor;
            const typeMatch = filters.type === 'all' || a.type === filters.type;
            
            const currentPrice = (a.intended_for === 'sale' ? a.sale_price_dh : a.price_dh) || 0;
            const minPriceMatch = !filters.minPrice || currentPrice >= Number(filters.minPrice);
            const maxPriceMatch = !filters.maxPrice || currentPrice <= Number(filters.maxPrice);
            
            const minSurfaceMatch = !filters.minSurface || a.surface_m2 >= Number(filters.minSurface);
            const maxSurfaceMatch = !filters.maxSurface || a.surface_m2 <= Number(filters.maxSurface);

            const searchMatch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            return projectMatch && statusMatch && floorMatch && typeMatch && 
                   minPriceMatch && maxPriceMatch && minSurfaceMatch && maxSurfaceMatch && 
                   searchMatch;
        });
    }, [apartments, filters, searchTerm]);

    const groupedFilteredByFloor = useMemo(() => {
        const groups: Record<string, Apartment[]> = {};
        filteredApartments.forEach(apt => {
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
    }, [filteredApartments]);

    const handleToggleSelect = (id: string) => {
        setSelectedApartmentIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const isAllSelected = useMemo(() => {
        if (filteredApartments.length === 0) return false;
        return filteredApartments.every(a => selectedApartmentIds.includes(a.id));
    }, [filteredApartments, selectedApartmentIds]);

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedApartmentIds([]);
        } else {
            setSelectedApartmentIds(filteredApartments.map(a => a.id));
        }
    };

    const apartmentsToPrint = useMemo(() => {
        if (selectedApartmentIds.length > 0) {
            return filteredApartments.filter(a => selectedApartmentIds.includes(a.id));
        }
        return filteredApartments;
    }, [filteredApartments, selectedApartmentIds]);

    return (
        <div>
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Appartements</h2>
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
                    <button onClick={() => setIsMultiPdfOpen(true)} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 flex items-center shadow-md font-bold transition-all active:scale-95" title="Aperçu & impression de toutes les fiches">
                        <FileTextIcon className="w-5 h-5 mr-1 text-green-400" />
                        {selectedApartmentIds.length > 0 ? `Fiches (${selectedApartmentIds.length})` : 'Toutes les Fiches'}
                    </button>
                    <button onClick={openAddModal} className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center shadow-md font-bold transition-all active:scale-95">
                        <PlusIcon className="w-5 h-5 mr-1" /> Ajouter
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 font-bold" />
                        <input 
                            type="text" 
                            placeholder="Rechercher par nom..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none font-medium text-gray-700" 
                        />
                    </div>
                    
                    <select 
                        value={filters.projectId} 
                        onChange={e => setFilters({...filters, projectId: e.target.value})} 
                        className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 cursor-pointer min-w-[150px] text-sm md:text-base"
                    >
                        <option value="all">Tous les projets</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                    </select>

                    <select 
                        value={filters.status} 
                        onChange={e => setFilters({...filters, status: e.target.value})} 
                        className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 cursor-pointer min-w-[150px] text-sm md:text-base"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="a_vendre">A VENDRE</option>
                        <option value="reserve">RESERVE (Vendu)</option>
                        <option value="rented">Loué</option>
                        <option value="available_rental">Disponible (Location)</option>
                    </select>

                    <button 
                        onClick={() => {setSearchTerm(''); setFilters({status:'all', projectId:'all', floor: 'all', type: 'all', minPrice: '', maxPrice: '', minSurface: '', maxSurface: ''})}} 
                        className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors group flex items-center justify-center"
                        title="Réinitialiser"
                    >
                        <XCircleIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                        <select 
                            value={filters.type} 
                            onChange={e => setFilters({...filters, type: e.target.value})} 
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 cursor-pointer text-sm"
                        >
                            <option value="all">Tous types</option>
                            <option value="apartment">Logement</option>
                            <option value="garage">Garage</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Prix (DH)</label>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="number" 
                                placeholder="Min" 
                                value={filters.minPrice}
                                onChange={e => setFilters({...filters, minPrice: e.target.value})}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-sm shadow-inner"
                            />
                            <input 
                                type="number" 
                                placeholder="Max" 
                                value={filters.maxPrice}
                                onChange={e => setFilters({...filters, maxPrice: e.target.value})}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-sm shadow-inner"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Surface (m²)</label>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="number" 
                                placeholder="Min" 
                                value={filters.minSurface}
                                onChange={e => setFilters({...filters, minSurface: e.target.value})}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-sm shadow-inner"
                            />
                            <input 
                                type="number" 
                                placeholder="Max" 
                                value={filters.maxSurface}
                                onChange={e => setFilters({...filters, maxSurface: e.target.value})}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-sm shadow-inner"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Étage</label>
                        <select 
                            value={filters.floor} 
                            onChange={e => setFilters({...filters, floor: e.target.value})} 
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 cursor-pointer text-sm"
                        >
                            <option value="all">Tous étages</option>
                            <option value="RDC">RDC</option>
                            {[...Array(10)].map((_, i) => (
                                <option key={i+1} value={`${i+1}`}>{i+1}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Selection and help guide bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-2xl mb-6 text-sm gap-4">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={isAllSelected} 
                        onChange={handleToggleSelectAll} 
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 accent-green-600 cursor-pointer"
                    />
                    <span className="font-bold text-gray-700">Tout Sélectionner ({filteredApartments.length} unités filtrées)</span>
                </label>
                <div className="text-xs text-gray-500 font-medium">
                    Cochez des unités individuelles pour exporter une sélection, ou cliquez sur <strong className="text-slate-800 font-bold">"Toutes les fiches"</strong> pour tout imprimer.
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="space-y-10">
                    {groupedFilteredByFloor.map(([floor, floorApts]) => (
                        <div key={floor} className="space-y-4">
                            <div className="flex items-center space-x-3 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-150">
                                <BuildingIcon className="w-5 h-5 text-gray-400" />
                                <h3 className="text-md font-bold text-gray-700">
                                    {floor === 'RDC' ? 'Rez-de-chaussée (RDC)' : `Étage ${floor}`}
                                </h3>
                                <span className="bg-gray-200/80 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    {floorApts.length} unité(s)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {floorApts.map(apt => (
                                    <ApartmentCard 
                                        key={apt.id} 
                                        apartment={apt} 
                                        project={projects.find(p => p.id === apt.project_id)} 
                                        onEdit={openEditModal} 
                                        onDelete={(a) => { setApartmentToDelete(a); setIsConfirmModalOpen(true); }} 
                                        onRent={() => navigate('/reservations')} 
                                        onSelect={handleToggleSelect}
                                        isSelected={selectedApartmentIds.includes(apt.id)}
                                        onSell={() => navigate('/reservations')} 
                                        onViewContractHolder={(a) => navigate(`/clients/${contracts.find(c => c.id === a.current_contract_id)?.client_id}`)} 
                                        onViewPdf={(a) => setPdfApartment(a)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredApartments.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 font-medium">
                            Aucune propriété ne correspond à vos filtres.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-10">
                    {groupedFilteredByFloor.map(([floor, floorApts]) => (
                        <div key={floor} className="space-y-4">
                            <div className="flex items-center space-x-3 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-150">
                                <BuildingIcon className="w-5 h-5 text-gray-400" />
                                <h3 className="text-md font-bold text-gray-700">
                                    {floor === 'RDC' ? 'Rez-de-chaussée (RDC)' : `Étage ${floor}`}
                                </h3>
                                <span className="bg-gray-200/80 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    {floorApts.length} unité(s)
                                </span>
                            </div>
                            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-bottom border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest w-12">
                                                {/* Selection space */}
                                            </th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Unité</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Projet</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Statut</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Type</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Prix</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {floorApts.map(apt => (
                                            <tr 
                                                key={apt.id} 
                                                className={`hover:bg-gray-50/50 transition-colors group ${selectedApartmentIds.includes(apt.id) ? 'bg-green-50/30' : ''}`}
                                            >
                                                <td className="px-6 py-4 w-12">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedApartmentIds.includes(apt.id)}
                                                        onChange={() => handleToggleSelect(apt.id)}
                                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 accent-green-600 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">{apt.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium">{apt.floor === 'RDC' ? 'Rez-de-chaussée' : `Étage ${apt.floor}`}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-600">{projects.find(p => p.id === apt.project_id)?.project_name || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-lg uppercase tracking-tight ${
                                                        (apt.status === ApartmentStatus.Available || apt.status === ApartmentStatus.ForSale)
                                                            ? (apt.intended_for === 'sale' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700')
                                                            : (apt.status === ApartmentStatus.Rented ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')
                                                    }`}>
                                                        {apt.status === ApartmentStatus.Rented ? 'Loué' : 
                                                         apt.intended_for === 'sale' 
                                                            ? ((apt.status === ApartmentStatus.Available || apt.status === ApartmentStatus.ForSale) ? 'A VENDRE' : 'RESERVE')
                                                            : ((apt.status === ApartmentStatus.Available || apt.status === ApartmentStatus.ForSale) ? 'Disponible' : 'Vendu')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{apt.type === 'apartment' ? 'Logement' : 'Garage'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-semibold text-gray-900">
                                                        {((apt.intended_for === 'sale' ? apt.sale_price_dh : apt.price_dh) || 0).toLocaleString()} DH
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
                                                        <button 
                                                            onClick={() => setPdfApartment(apt)} 
                                                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                                            title="Fiche Technique / Dossier PDF"
                                                        >
                                                            <FileTextIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => openEditModal(apt)} className="p-2 text-gray-400 hover:text-green-600 transition-colors"><EditIcon className="w-5 h-5" /></button>
                                                        <button onClick={() => { setApartmentToDelete(apt); setIsConfirmModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {filteredApartments.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 font-medium">
                            Aucune propriété ne correspond à vos filtres.
                        </div>
                    )}
                </div>
            )}
            
            <Modal title={editingApartment ? "Modifier la Propriété" : "Ajouter une Propriété"} isOpen={isModalOpen} onClose={closeModal}>
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Usage Prévu</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl w-full">
                                <button type="button" onClick={() => setIntendedFor('sale')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${intendedFor === 'sale' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>À Vendre</button>
                                <button type="button" onClick={() => setIntendedFor('rental')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${intendedFor === 'rental' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>À Louer</button>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                            <div className="flex space-x-2">
                                <button type="button" onClick={() => setPropertyType('apartment')} className={`flex-1 py-2 border rounded-lg font-bold text-sm ${propertyType === 'apartment' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Logement</button>
                                <button type="button" onClick={() => setPropertyType('garage')} className={`flex-1 py-2 border rounded-lg font-bold text-sm ${propertyType === 'garage' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>Garage/Magasin</button>
                            </div>
                        </div>

                        <div><label className="block text-sm font-bold text-gray-700">Projet</label>
                            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} required className={inputClasses}><option value="" disabled>Choisir un projet</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}</select>
                        </div>
                        <div><label className="block text-sm font-bold text-gray-700">Étage</label>
                            <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} required className={inputClasses}><option value="" disabled>Choisir l'étage</option>{floorOptions.map(f => <option key={f} value={f}>{f === 'RDC' ? 'Rez-de-chaussée' : `Étage ${f}`}</option>)}</select>
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700">Nom / Référence <span className="text-[10px] text-green-600">(Auto-suggéré)</span></label>
                            <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} required className={inputClasses} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700">Titre de l'appartement (Titre Foncier / Land Title)</label>
                            <input type="text" name="titre" defaultValue={editingApartment?.titre || ''} className={inputClasses} placeholder="Ex: TF 12345/66 ou En cours de morcellement" />
                        </div>

                        {propertyType === 'apartment' && (
                            <>
                                <div><label className="block text-sm font-bold text-gray-700">Nombre de pièces</label><input type="number" name="rooms" defaultValue={editingApartment?.rooms || 0} className={inputClasses} /></div>
                                <div><label className="block text-sm font-bold text-gray-700">Salles de bain</label><input type="number" name="bathroom" defaultValue={editingApartment?.bathroom || 0} className={inputClasses} /></div>
                                <div className="flex items-center space-x-6 py-2">
                                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="balcony" defaultChecked={editingApartment?.balcony} className="text-green-600 rounded" /><span className="text-sm font-medium">Balcon</span></label>
                                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="kitchen" defaultChecked={editingApartment?.kitchen} className="text-green-600 rounded" /><span className="text-sm font-medium">Cuisine équipée</span></label>
                                </div>
                            </>
                        )}

                        <div><label className="block text-sm font-bold text-gray-700">Surface (m²)</label><input type="number" name="surface_m2" defaultValue={editingApartment?.surface_m2} required className={inputClasses} /></div>
                        
                        {intendedFor === 'sale' ? (
                            <div className="md:col-span-1"><label className="block text-sm font-bold text-gray-700">Prix de Vente (DH)</label><input type="number" name="sale_price_dh" defaultValue={editingApartment?.sale_price_dh || 0} required className={inputClasses} /></div>
                        ) : (
                            <div className="md:col-span-1"><label className="block text-sm font-bold text-gray-700">Loyer Mensuel (DH)</label><input type="number" name="price_dh" defaultValue={editingApartment?.price_dh || 0} required className={inputClasses} /></div>
                        )}
                        
                        <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700">Propriétaire</label><input type="text" name="owner_name" defaultValue={editingApartment?.owner_name || 'Nafat Immobilier'} required className={inputClasses} /></div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100">
                        <button type="button" onClick={closeModal} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-all">Annuler</button>
                        <button type="submit" className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all">Enregistrer</button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Supprimer la propriété ?" message="Cette action est irréversible. Seules les unités sans historique peuvent être supprimées." />

            {pdfApartment && (
                <PropertyPdfModal 
                    apartment={pdfApartment} 
                    project={projects.find(p => p.id === pdfApartment.project_id)} 
                    onClose={() => setPdfApartment(null)} 
                />
            )}

            {isMultiPdfOpen && (
                <AllPropertiesPdfModal 
                    selectedApartments={apartmentsToPrint} 
                    projects={projects} 
                    onClose={() => setIsMultiPdfOpen(false)} 
                />
            )}
        </div>
    );
};

export default ApartmentsPage;
