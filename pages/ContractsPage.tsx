
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getContracts, getClients, getApartments, addContract, cancelContract, getProjects, deleteContract, getPayments } from '../services/api';
import { Contract, Client, Apartment, ContractStatus, ApartmentStatus, Project, Payment, PaymentStatus, PaymentMethod } from '../types';
import { PlusIcon, EyeIcon, EditIcon, TrashIcon, SearchIcon, XCircleIcon, FileTextIcon, HomeIcon, UsersIcon, AlertTriangleIcon, PaperclipIcon, CloseIcon, PrinterIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';
import ReservationFormPage from './ReservationFormPage';
import ReceiptPage from './ReceiptPage';
import Notification from '../components/Notification';

// Helper to compress image before saving to Firestore (1MB limit)
const compressImage = (base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onerror = (err) => reject(err);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

const translateStatus = (status: ContractStatus) => {
    switch (status) {
        case ContractStatus.Active: return 'Actif';
        case ContractStatus.Ended: return 'Terminé';
        case ContractStatus.Renewed: return 'Renouvelé';
        case ContractStatus.SaleInProgress: return 'Vente en cours';
        case ContractStatus.SaleCompleted: return 'Vente Terminée';
        case ContractStatus.SaleCanceled: return 'Annulé (Désistement)';
        case ContractStatus.Canceled: return 'Annulé';
        default: return status;
    }
}

const getStatusBadge = (status: ContractStatus) => {
  const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full capitalize';
  switch (status) {
    case ContractStatus.Active: return `${baseClasses} bg-green-100 text-green-800`;
    case ContractStatus.SaleCompleted: return `${baseClasses} bg-indigo-100 text-indigo-800`;
    case ContractStatus.SaleInProgress: return `${baseClasses} bg-yellow-100 text-orange-800 border border-orange-200`;
    case ContractStatus.SaleCanceled:
    case ContractStatus.Canceled: return `${baseClasses} bg-red-100 text-red-800`;
    default: return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const ContractsPage: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [newContractType, setNewContractType] = useState<'rental' | 'sale'>('sale');
    
    // Cancellation state
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [contractToCancel, setContractToCancel] = useState<Contract | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
    
    // Selection states
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedApartmentId, setSelectedApartmentId] = useState('');
    const [salePrice, setSalePrice] = useState<string>('0');
    const [amountPaid, setAmountPaid] = useState<string>('0');
    
    // Initial Payment Method Details
    const [initPaymentMethod, setInitPaymentMethod] = useState<PaymentMethod>('especes');
    const [initProofBase64, setInitProofBase64] = useState<string>('');
    const [fileInputKey, setFileInputKey] = useState(0);

    const navigate = useNavigate();
    const [reservationContractId, setReservationContractId] = useState<string | null>(null);
    const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
    const { user } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ 
        status: 'all', 
        type: 'all', 
        projectId: 'all',
        minAmount: '',
        maxAmount: '',
        startDate: '',
        endDate: ''
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ctrs, cls, apts, projs] = await Promise.all([ getContracts(), getClients(), getApartments(), getProjects() ]);
            setContracts(ctrs); setClients(cls); setApartments(apts); setProjects(projs);
            if (projs.length > 0 && !selectedProjectId) setSelectedProjectId(projs[0].id);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [selectedProjectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const apt = apartments.find(a => a.id === selectedApartmentId);
        setSalePrice(String(apt?.sale_price_dh || apt?.price_dh || 0));
    }, [selectedApartmentId, apartments]);

    const filteredModalApartments = useMemo(() => {
        return apartments.filter(a => {
            const isAvailable = a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale;
            return isAvailable && a.project_id === selectedProjectId;
        });
    }, [apartments, selectedProjectId]);

    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            const client = clients.find(cl => cl.id === c.client_id);
            const nameMatch = (client?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = filters.status === 'all' || c.status === filters.status;
            const typeMatch = filters.type === 'all' || c.type === filters.type;
            const projectMatch = filters.projectId === 'all' || c.project_id === filters.projectId;
            
            const minAmountMatch = !filters.minAmount || c.amount_dh >= Number(filters.minAmount);
            const maxAmountMatch = !filters.maxAmount || c.amount_dh <= Number(filters.maxAmount);
            
            const startDateMatch = !filters.startDate || new Date(c.start_date) >= new Date(filters.startDate);
            const endDateMatch = !filters.endDate || new Date(c.start_date) <= new Date(filters.endDate);

            return nameMatch && statusMatch && typeMatch && projectMatch && 
                   minAmountMatch && maxAmountMatch && startDateMatch && endDateMatch;
        });
    }, [contracts, clients, searchTerm, filters]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string);
                setInitProofBase64(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const formData = new FormData(e.currentTarget);
        const apartmentId = formData.get('apartment_id') as string;
        const selectedApt = apartments.find(a => a.id === apartmentId);
        
        const totalAmount = Number(salePrice);
        const initialDeposit = Number(amountPaid);

        const data: Partial<Contract> = {
            client_id: formData.get('client_id') as string,
            apartment_id: apartmentId,
            project_id: selectedApt?.project_id,
            type: newContractType,
            amount_dh: totalAmount,
            start_date: formData.get('start_date') as string,
            notes: formData.get('notes') as string,
        };

        let initialPay: Partial<Payment> | undefined;
        if (newContractType === 'rental') {
            data.duration_months = Number(formData.get('duration_months'));
            const end = new Date(data.start_date!); end.setMonth(end.getMonth() + data.duration_months);
            data.end_date = end.toISOString().split('T')[0];
            data.status = ContractStatus.Active;
        } else {
            data.status = initialDeposit >= totalAmount ? ContractStatus.SaleCompleted : ContractStatus.SaleInProgress;
            if (initialDeposit > 0) {
                initialPay = { 
                    amount_dh: initialDeposit, 
                    payment_date: data.start_date, 
                    payment_for: "Versement initial", 
                    payment_method: initPaymentMethod, 
                    status: PaymentStatus.Paid,
                    proof_url: initProofBase64 || "",
                    cheque_number: (formData.get('init_ref') as string) || "",
                    bank_name: (formData.get('init_bank') as string) || ""
                };
            }
        }
        try { 
            await addContract(data as any, user.user_id, initialPay); 
            await fetchData(); 
            setIsModalOpen(false); 
            setNotification({ message: "Dossier enregistré avec succès", type: 'success' });
        } catch(e) { console.error(e); }
    };

    const handleCancelSubmit = async () => {
        if (!user || !contractToCancel) return;
        try {
            await cancelContract(contractToCancel, user.user_id, cancelReason);
            setNotification({ message: "Le dossier a été annulé et archivé.", type: 'success' });
            setIsCancelModalOpen(false);
            setContractToCancel(null);
            setCancelReason('');
            fetchData();
        } catch (error) {
            setNotification({ message: "Erreur lors de l'annulation.", type: 'error' });
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 text-black sm:text-sm font-bold";

    const handleShowReceipt = async (contractId: string) => {
        try {
            const allPayments = await getPayments();
            const contractPayments = allPayments
                .filter(p => p.contract_id === contractId && p.status === PaymentStatus.Paid)
                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
            
            if (contractPayments.length > 0) {
                setReceiptPaymentId(contractPayments[0].id);
            } else {
                setNotification({ message: "Aucun paiement encaissé trouvé pour ce dossier.", type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setNotification({ message: "Erreur lors de la récupération des paiements.", type: 'error' });
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 italic font-bold">Chargement des dossiers...</div>;

  return (
    <div>
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Dossiers de Réservation</h2>
            <button onClick={() => setIsTypeSelectionModalOpen(true)} className="w-full md:w-auto justify-center px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center shadow-lg font-bold active:scale-95 text-sm md:text-base">
                <PlusIcon className="w-5 h-5 mr-1" />
                Nouveau
            </button>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 p-4 md:p-6 mb-8 space-y-6">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Chercher un client..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-gray-50 pl-12 pr-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700 text-sm md:text-base" 
                    />
                </div>
                <select 
                    value={filters.status} 
                    onChange={e => setFilters({...filters, status: e.target.value})} 
                    className="bg-gray-50 px-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700 cursor-pointer text-sm sm:min-w-[150px]"
                >
                    <option value="all">Tous statuts</option>
                    <option value={ContractStatus.Active}>Actifs (Location)</option>
                    <option value={ContractStatus.SaleInProgress}>Ventes en cours</option>
                    <option value={ContractStatus.SaleCompleted}>Ventes Terminées</option>
                </select>
                <select 
                    value={filters.type} 
                    onChange={e => setFilters({...filters, type: e.target.value})} 
                    className="bg-gray-50 px-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700 cursor-pointer text-sm sm:min-w-[150px]"
                >
                    <option value="all">Tous types</option>
                    <option value="sale">Ventes</option>
                    <option value="rental">Locations</option>
                </select>
                <select 
                    value={filters.projectId} 
                    onChange={e => setFilters({...filters, projectId: e.target.value})} 
                    className="bg-gray-50 px-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700 cursor-pointer text-sm sm:min-w-[150px]"
                >
                    <option value="all">Tous projets</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
                {(searchTerm || filters.status !== 'all' || filters.type !== 'all' || filters.projectId !== 'all' || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) && (
                    <button 
                        onClick={() => { setSearchTerm(''); setFilters({status:'all', type:'all', projectId:'all', minAmount: '', maxAmount: '', startDate: '', endDate: ''}); }} 
                        className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                        title="Réinitialiser"
                    >
                        <XCircleIcon className="w-6 h-6 text-gray-400" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Période (Signature)</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <input 
                            type="date" 
                            value={filters.startDate}
                            onChange={e => setFilters({...filters, startDate: e.target.value})}
                            className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-xs shadow-inner"
                        />
                        <span className="text-gray-400 text-[10px] font-bold uppercase text-center">au</span>
                        <input 
                            type="date" 
                            value={filters.endDate}
                            onChange={e => setFilters({...filters, endDate: e.target.value})}
                            className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-xs shadow-inner"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Fourchette de Montant (DH)</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <input 
                            type="number" 
                            placeholder="Min" 
                            value={filters.minAmount}
                            onChange={e => setFilters({...filters, minAmount: e.target.value})}
                            className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-xs shadow-inner"
                        />
                        <span className="hidden sm:block text-gray-300">|</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            value={filters.maxAmount}
                            onChange={e => setFilters({...filters, maxAmount: e.target.value})}
                            className="flex-1 px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all outline-none font-medium text-gray-600 text-xs shadow-inner"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden mb-12">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-bottom border-gray-100">
                        <tr>
                            <th className="px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client</th>
                            <th className="hidden sm:table-cell px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Propriété</th>
                            <th className="hidden md:table-cell px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                            <th className="px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Montant</th>
                            <th className="px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Statut</th>
                            <th className="px-4 md:px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredContracts.map(c => (
                            <tr 
                                key={c.id} 
                                className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${c.status === ContractStatus.SaleCanceled || c.status === ContractStatus.Canceled ? 'bg-gray-50/30' : ''}`}
                                onClick={() => navigate(`/clients/${c.client_id}`)}
                            >
                                <td className="px-4 md:px-6 py-4">
                                    <div className="font-bold text-gray-900 group-hover:text-green-600 transition-colors text-sm">
                                        {clients.find(cl => cl.id === c.client_id)?.full_name}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-gray-400">{clients.find(cl => cl.id === c.client_id)?.phone}</div>
                                    {/* Mobile only info */}
                                    <div className="sm:hidden mt-1 flex flex-wrap gap-1">
                                        <span className="text-[8px] font-bold uppercase text-gray-400 bg-gray-100 px-1 rounded">{apartments.find(a => a.id === c.apartment_id)?.name}</span>
                                        <span className={`text-[8px] font-bold uppercase px-1 rounded ${c.type === 'rental' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>{c.type === 'rental' ? 'Loc' : 'Vente'}</span>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-4 md:px-6 py-4 text-sm">
                                    <div className="font-bold text-gray-700">{apartments.find(a => a.id === c.apartment_id)?.name}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{projects.find(p => p.id === c.project_id)?.project_name}</div>
                                </td>
                                <td className="hidden md:table-cell px-4 md:px-6 py-4 italic">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${c.type === 'rental' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {c.type === 'rental' ? 'Location' : 'Vente'}
                                    </span>
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                    <div className="font-bold text-gray-900 text-sm">{c.amount_dh.toLocaleString()} <span className="text-[10px]">DH</span></div>
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                    <span className={getStatusBadge(c.status).replace('px-2 py-1 text-xs', 'px-1.5 py-0.5 text-[10px] sm:text-xs')}>{translateStatus(c.status)}</span>
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                    <div className="flex justify-end sm:space-x-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setReservationContractId(c.id)} className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors" title="Bon de réservation">
                                            <FileTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                        <button onClick={() => handleShowReceipt(c.id)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Reçu / Quittance">
                                            <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                        <button onClick={() => { setContractToDelete(c); setIsDeleteModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Supprimer">
                                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* CANCELLATION MODAL */}
        <Modal title="Annuler le Dossier (Désistement)" isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)}>
            <div className="space-y-4">
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <p className="text-sm font-bold text-orange-800">
                        Attention: Cette action va libérer la propriété et archiver le dossier dans les "Désistements".
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-1">Motif de l'annulation</label>
                    <textarea 
                        value={cancelReason} 
                        onChange={e => setCancelReason(e.target.value)}
                        className={inputClasses + " h-32"} 
                        placeholder="Ex: Problème de financement, désistement client..."
                    ></textarea>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={() => setIsCancelModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold">Garder le dossier</button>
                    <button onClick={handleCancelSubmit} disabled={!cancelReason.trim()} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50">Confirmer l'Annulation</button>
                </div>
            </div>
        </Modal>

        {/* CREATION MODAL */}
        <Modal title={`Nouveau Dossier - ${newContractType === 'rental' ? 'Location' : 'Vente'}`} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Client</label>
                    <select name="client_id" required className={inputClasses} defaultValue="">
                        <option value="" disabled>Choisir un client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Projet</label>
                        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} required className={inputClasses}>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Propriété</label>
                        <select name="apartment_id" required value={selectedApartmentId} onChange={(e) => setSelectedApartmentId(e.target.value)} className={inputClasses}>
                            <option value="" disabled>Choisir l'unité</option>
                            {filteredModalApartments.map(a => <option key={a.id} value={a.id}>{a.name} ({a.floor})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{newContractType === 'sale' ? 'Prix Net (DH)' : 'Loyer Mensuel (DH)'}</label><input type="number" step="any" value={salePrice} onChange={e => setSalePrice(e.target.value)} className={inputClasses} /></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date Signature</label><input type="date" name="start_date" required defaultValue={new Date().toISOString().split('T')[0]} className={inputClasses} /></div>
                </div>

                <div className="p-4 sm:p-5 bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-100 space-y-4">
                    <h4 className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Acompte Initial</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Montant Reçu (DH)</label>
                            <input type="number" step="any" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Mode de paiement</label>
                            <select value={initPaymentMethod} onChange={e => setInitPaymentMethod(e.target.value as PaymentMethod)} className={inputClasses}>
                                <option value="especes">Espèces</option>
                                <option value="cheque">Chèque</option>
                                <option value="virement">Virement</option>
                                <option value="effet">Effet</option>
                            </select>
                        </div>
                    </div>

                    {initPaymentMethod !== 'especes' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Référence (N°)</label><input type="text" name="init_ref" className={inputClasses} /></div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Banque</label><input type="text" name="init_bank" className={inputClasses} /></div>
                        </div>
                    )}
                </div>

                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes Internes</label><textarea name="notes" rows={2} className={inputClasses} placeholder="Observations..."></textarea></div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-5 border-t">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold order-2 sm:order-1">Annuler</button>
                    <button type="submit" className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg order-1 sm:order-2">Enregistrer</button>
                </div>
            </form>
        </Modal>

        <Modal title="Nouveau Dossier Immobilier" isOpen={isTypeSelectionModalOpen} onClose={() => setIsTypeSelectionModalOpen(false)}>
            <div className="flex flex-col sm:flex-row gap-4 p-4">
                <button onClick={() => { setNewContractType('sale'); setIsTypeSelectionModalOpen(false); setInitProofBase64(''); setIsModalOpen(true); }} className="flex-1 p-6 md:p-8 bg-purple-600 text-white rounded-2xl font-bold text-lg md:text-xl hover:bg-purple-700 transition-all shadow-lg transform hover:-translate-y-1">Vente</button>
                <button onClick={() => { setNewContractType('rental'); setIsTypeSelectionModalOpen(false); setInitProofBase64(''); setIsModalOpen(true); }} className="flex-1 p-6 md:p-8 bg-green-600 text-white rounded-2xl font-bold text-lg md:text-xl hover:bg-green-700 transition-all shadow-lg transform hover:-translate-y-1">Location</button>
            </div>
        </Modal>

        {reservationContractId && <ReservationFormPage contractId={reservationContractId} onClose={() => setReservationContractId(null)} />}
        {receiptPaymentId && <ReceiptPage paymentId={receiptPaymentId} onClose={() => setReceiptPaymentId(null)} />}
        <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={async () => { if(contractToDelete) { await deleteContract(contractToDelete.id); await fetchData(); setIsDeleteModalOpen(false); setNotification({ message: "Dossier supprimé.", type: 'success' }); } }} title="Supprimer le dossier ?" message="Attention : cette action supprimera également tous les paiements associés." />
    </div>
  );
};

export default ContractsPage;
