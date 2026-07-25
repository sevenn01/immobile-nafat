
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [newContractType, setNewContractType] = useState<'rental' | 'sale'>('sale');
    
    // Cancellation state
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [contractToCancel, setContractToCancel] = useState<Contract | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    
    // Refund details for cancellation/désistement
    const [refundStatus, setRefundStatus] = useState<'none' | 'total' | 'partial'>('none');
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [refundNotes, setRefundNotes] = useState('');

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
    const [searchParams] = useSearchParams();
    const [backUrl, setBackUrl] = useState<string | null>(null);
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
            const [ctrs, cls, apts, projs, pays] = await Promise.all([ 
                getContracts(), 
                getClients(), 
                getApartments(), 
                getProjects(),
                getPayments()
            ]);
            setContracts(ctrs); 
            setClients(cls); 
            setApartments(apts); 
            setProjects(projs);
            setPayments(pays);
            if (projs.length > 0 && !selectedProjectId) setSelectedProjectId(projs[0].id);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [selectedProjectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (loading || apartments.length === 0) return;
        
        const aptIdParam = searchParams.get('apartmentId');
        const projIdParam = searchParams.get('projectId');
        const backUrlParam = searchParams.get('backUrl');
        
        if (aptIdParam && projIdParam) {
            const apt = apartments.find(a => a.id === aptIdParam);
            if (apt) {
                setNewContractType(apt.intended_for || 'sale');
                setSelectedProjectId(projIdParam);
                setSelectedApartmentId(aptIdParam);
                setIsModalOpen(true);
                if (backUrlParam) {
                    setBackUrl(backUrlParam);
                }
                navigate('/reservations', { replace: true });
            }
        }
    }, [searchParams, loading, apartments, navigate]);

    useEffect(() => {
        const apt = apartments.find(a => a.id === selectedApartmentId);
        setSalePrice(String(apt?.sale_price_dh || apt?.price_dh || 0));
    }, [selectedApartmentId, apartments]);

    const filteredModalApartments = useMemo(() => {
        const list = apartments.filter(a => {
            const isAvailable = a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale;
            return isAvailable && a.project_id === selectedProjectId;
        });

        return list.sort((a, b) => {
            const floorA = a.floor || 'N/A';
            const floorB = b.floor || 'N/A';
            if (floorA === floorB) {
                return a.name.localeCompare(b.name);
            }
            if (floorA === 'RDC') return -1;
            if (floorB === 'RDC') return 1;
            const numA = parseInt(floorA);
            const numB = parseInt(floorB);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return floorA.localeCompare(floorB);
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

    const closeCreationModal = () => {
        setIsModalOpen(false);
        if (backUrl) {
            const url = backUrl;
            setBackUrl(null);
            navigate(url);
        }
    };

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
            closeCreationModal(); 
            setNotification({ message: "Dossier enregistré avec succès", type: 'success' });
        } catch(e: any) { 
            console.error(e); 
            setNotification({ message: e?.message || "Une erreur est survenue lors de l'enregistrement du dossier.", type: 'error' });
        }
    };

    const handleCancelSubmit = async () => {
        if (!user || !contractToCancel) return;
        try {
            await cancelContract(
                contractToCancel, 
                user.user_id, 
                cancelReason,
                refundStatus,
                refundAmount,
                refundNotes
            );
            setNotification({ message: "Le dossier a été annulé et archivé.", type: 'success' });
            setIsCancelModalOpen(false);
            setContractToCancel(null);
            setCancelReason('');
            setRefundStatus('none');
            setRefundAmount(0);
            setRefundNotes('');
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

    const contractToDeleteTotalPaid = useMemo(() => {
        if (!contractToDelete) return 0;
        return payments
            .filter(p => p.contract_id === contractToDelete.id && p.status === PaymentStatus.Paid)
            .reduce((sum, p) => sum + p.amount_dh, 0);
    }, [contractToDelete, payments]);

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setContractToDelete(null);
        setCancelReason('');
        setRefundStatus('none');
        setRefundAmount(0);
        setRefundNotes('');
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
        <Modal title={`Nouveau Dossier - ${newContractType === 'rental' ? 'Location' : 'Vente'}`} isOpen={isModalOpen} onClose={closeCreationModal}>
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
                            {filteredModalApartments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.floor === 'RDC' ? `RDC - ${a.name}` : `Étage ${a.floor} - ${a.name}`}
                                </option>
                            ))}
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
                    <button type="button" onClick={closeCreationModal} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold order-2 sm:order-1">Annuler</button>
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
        <Modal 
            isOpen={isDeleteModalOpen} 
            onClose={closeDeleteModal} 
            title="Suppression ou Désistement du dossier"
        >
            <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800 font-bold leading-relaxed">
                        Que souhaitez-vous faire avec ce dossier ? Nous vous conseillons de le classer comme <span className="underline font-extrabold text-amber-900">Désistement</span> pour garder un historique complet, libérer la propriété, et conserver une trace des raisons ainsi que des remboursements.
                    </p>
                </div>

                {contractToDelete && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-gray-600 space-y-1.5 shadow-inner">
                        <div className="font-bold text-gray-800 text-sm mb-1.5 flex items-center justify-between">
                            <span>Dossier sélectionné :</span>
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-extrabold uppercase text-[9px]">{contractToDelete.type === 'rental' ? 'Location' : 'Vente'}</span>
                        </div>
                        <div><span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Client:</span> <span className="font-extrabold text-gray-800 text-xs">{clients.find(cl => cl.id === contractToDelete.client_id)?.full_name}</span></div>
                        <div><span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Propriété:</span> <span className="font-extrabold text-gray-800 text-xs">{apartments.find(a => a.id === contractToDelete.apartment_id)?.name} ({projects.find(p => p.id === contractToDelete.project_id)?.project_name})</span></div>
                        <div><span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Montant Dossier:</span> <span className="font-extrabold text-gray-800 text-xs">{contractToDelete.amount_dh.toLocaleString()} DH</span></div>
                        <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">Total encaissé à ce jour:</span>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-extrabold text-xs">{contractToDeleteTotalPaid.toLocaleString()} DH</span>
                        </div>
                    </div>
                )}

                {/* OPTION 1: DESISTEMENT / CANCELLATION */}
                <div className="border border-indigo-100 rounded-2xl p-5 bg-indigo-50/20 space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm shrink-0">1</div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Option recommandée : Classer en Désistement</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Le dossier sera marqué comme annulé et apparaîtra dans l'archive "Désistements" avec le motif saisi et les détails de remboursement des avances.</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Motif du désistement / Remarque <span className="text-red-500">*</span></label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Saisissez le motif ou une remarque (ex: Problème de financement, changement d'avis...)"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={2}
                        />
                    </div>

                    {/* REFUND OPTIONS */}
                    <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-3 shadow-sm">
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Traitement des avances encaissées</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setRefundStatus('none');
                                    setRefundAmount(0);
                                }}
                                className={`px-2 py-2 rounded-xl font-bold text-center text-[10px] sm:text-xs border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                    refundStatus === 'none'
                                        ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="font-extrabold uppercase">Aucun</span>
                                <span className="text-[9px] opacity-75">Conserver</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRefundStatus('total');
                                    setRefundAmount(contractToDeleteTotalPaid);
                                }}
                                className={`px-2 py-2 rounded-xl font-bold text-center text-[10px] sm:text-xs border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                    refundStatus === 'total'
                                        ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500/20'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="font-extrabold uppercase">Total (100%)</span>
                                <span className="text-[9px] opacity-75">{contractToDeleteTotalPaid.toLocaleString()} DH</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRefundStatus('partial');
                                    setRefundAmount(0);
                                }}
                                className={`px-2 py-2 rounded-xl font-bold text-center text-[10px] sm:text-xs border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                    refundStatus === 'partial'
                                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700 ring-2 ring-yellow-500/20'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="font-extrabold uppercase">Partiel</span>
                                <span className="text-[9px] opacity-75">Montant libre</span>
                            </button>
                        </div>

                        {refundStatus !== 'none' && (
                            <div className="pt-2 space-y-2 border-t border-gray-100">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Montant remboursé (DH)</label>
                                        <input
                                            type="number"
                                            disabled={refundStatus === 'total'}
                                            value={refundAmount || ''}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (val > contractToDeleteTotalPaid) {
                                                    setRefundAmount(contractToDeleteTotalPaid);
                                                } else {
                                                    setRefundAmount(val);
                                                }
                                            }}
                                            max={contractToDeleteTotalPaid}
                                            min={0}
                                            placeholder="Montant en DH"
                                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                                        />
                                        {refundStatus === 'partial' && (
                                            <span className="text-[8px] text-gray-400 font-semibold block mt-0.5">Maximum possible: {contractToDeleteTotalPaid.toLocaleString()} DH</span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Note de remboursement</label>
                                        <input
                                            type="text"
                                            value={refundNotes}
                                            onChange={(e) => setRefundNotes(e.target.value)}
                                            placeholder="Ex: Chèque n° 987654"
                                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                if (!contractToDelete || !user) return;
                                try {
                                    await cancelContract(
                                        contractToDelete, 
                                        user.user_id, 
                                        cancelReason || 'Non spécifié',
                                        refundStatus,
                                        refundAmount,
                                        refundNotes
                                    );
                                    await fetchData();
                                    closeDeleteModal();
                                    setNotification({ message: "Le dossier a été archivé dans les Désistements.", type: 'success' });
                                } catch (error) {
                                    console.error(error);
                                    setNotification({ message: "Erreur lors de l'archivage.", type: 'error' });
                                }
                            }}
                            disabled={!cancelReason.trim()}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                            <span>Confirmer le Désistement</span>
                        </button>
                    </div>
                </div>

                {/* OPTION 2: PERMANENT DELETION */}
                <div className="border border-red-100 rounded-2xl p-5 bg-red-50/20 space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="p-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm shrink-0">2</div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Option destructive : Suppression définitive</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Supprime définitivement le dossier et tous ses paiements associés de la base de données. Aucun historique ne sera conservé.</p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                if (!contractToDelete) return;
                                try {
                                    await deleteContract(contractToDelete.id);
                                    await fetchData();
                                    closeDeleteModal();
                                    setNotification({ message: "Dossier supprimé définitivement de la base de données.", type: 'success' });
                                } catch (error) {
                                    console.error(error);
                                    setNotification({ message: "Erreur lors de la suppression.", type: 'error' });
                                }
                            }}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                            Supprimer définitivement
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                    <button
                        onClick={closeDeleteModal}
                        className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all"
                    >
                        Fermer / Annuler
                    </button>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default ContractsPage;
