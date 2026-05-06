
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClients, getPayments, getContracts, getApartments, addPayment, updatePayment } from '../services/api';
import { Client, Payment, PaymentStatus, Contract, ContractStatus, Apartment, PaymentMethod } from '../types';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import { CoinsIcon, PrinterIcon, FileTextIcon, XCircleIcon, PaperclipIcon, ClockIcon, TrashIcon } from '../components/icons/Icons';
import ReceiptPage from './ReceiptPage';

// Helper to compress image before saving to Firestore (1MB limit)
const compressImage = (base64Str: string, maxWidth = 1000, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
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

const getPaymentStatusBadge = (status: PaymentStatus) => {
  const baseClasses = 'px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-tighter';
  switch (status) {
    case PaymentStatus.Paid: return `${baseClasses} bg-green-100 text-green-800`;
    case PaymentStatus.Pending: return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case PaymentStatus.Late: return `${baseClasses} bg-red-100 text-red-800`;
    case PaymentStatus.Canceled: return `${baseClasses} bg-slate-100 text-slate-400`;
    default: return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const getContractStatusBadge = (status: ContractStatus) => {
  const baseClasses = 'px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-tighter';
  switch (status) {
    case ContractStatus.Active: return `${baseClasses} bg-green-100 text-green-800`;
    case ContractStatus.SaleCompleted: return `${baseClasses} bg-indigo-100 text-indigo-800`;
    case ContractStatus.SaleInProgress: return `${baseClasses} bg-yellow-100 text-orange-800 border border-orange-200`;
    case ContractStatus.Canceled:
    case ContractStatus.SaleCanceled: return `${baseClasses} bg-red-100 text-red-800`;
    default: return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const ClientDetailsPage: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const [client, setClient] = useState<Client | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
    const [proofBase64, setProofBase64] = useState<string>('');
    const [fileInputKey, setFileInputKey] = useState(0);
    const { user } = useAuth();
    const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!clientId) return;
        try {
            setLoading(true);
            const [clientsData, paymentsData, contractsData, apartmentsData] = await Promise.all([
                getClients(), getPayments(), getContracts(), getApartments()
            ]);
            const currentClient = clientsData.find(c => c.id === clientId) || null;
            // Sorting to see most recent first, but also ensuring initial payments are visible
            const clientPayments = paymentsData.filter(p => p.client_id === clientId)
                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
            const clientContracts = contractsData.filter(c => c.client_id === clientId);
            
            setClient(currentClient);
            setPayments(clientPayments);
            setContracts(clientContracts);
            setApartments(apartmentsData);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [clientId]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const { activeContracts, archivedContracts } = useMemo(() => {
        const withDetails = contracts.map(contract => {
            const apartment = apartments.find(a => a.id === contract.apartment_id);
            const totalPaid = payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid).reduce((sum, p) => sum + p.amount_dh, 0);
            return { ...contract, apartmentName: apartment?.name || 'Unité Inconnue', totalPaid, remainingAmount: Math.max(0, contract.amount_dh - totalPaid) };
        });
        return {
            activeContracts: withDetails.filter(c => c.status !== ContractStatus.Canceled && c.status !== ContractStatus.SaleCanceled && c.status !== ContractStatus.Ended),
            archivedContracts: withDetails.filter(c => c.status === ContractStatus.Canceled || c.status === ContractStatus.SaleCanceled || c.status === ContractStatus.Ended)
        };
    }, [contracts, apartments, payments]);

    const handleOpenPaymentModal = (contract: Contract) => {
        setSelectedContract(contract);
        setProofBase64('');
        setPaymentMethod('especes');
        setFileInputKey(k => k + 1);
        setIsPaymentModalOpen(true);
    }
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string);
                setProofBase64(compressed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearSelection = () => {
        if (window.confirm("Annuler le chargement du fichier ?")) {
            setProofBase64('');
            setFileInputKey(prev => prev + 1);
        }
    };

    const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !selectedContract) return;
        const formData = new FormData(e.currentTarget);
        const paymentData: Partial<Payment> = {
            contract_id: selectedContract.id, 
            client_id: selectedContract.client_id,
            amount_dh: Number(formData.get('amount_dh')),
            payment_date: formData.get('payment_date') as string,
            payment_for: formData.get('payment_for') as string,
            status: PaymentStatus.Paid,
            payment_method: paymentMethod,
            cheque_number: formData.get('ref_num') as string,
            bank_name: formData.get('bank_name') as string,
            proof_url: proofBase64 || ""
        };
        try {
            await addPayment(paymentData, user.user_id);
            await fetchData();
            setIsPaymentModalOpen(false);
            setSelectedContract(null);
        } catch(error) { console.error(error); }
    }

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold italic">Ouverture du dossier client...</div>;
    if (!client) return <div className="p-12 text-center text-red-500 font-bold text-xl">Dossier client introuvable.</div>;

    const inputClasses = "mt-1 block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-green-500 focus:border-green-500 text-gray-900 sm:text-sm font-semibold";

    return (
        <div className="space-y-10">
            <Link to="/clients" className="text-sm font-semibold text-green-600 hover:text-green-700 mb-6 flex items-center transition-colors">
                <span className="mr-2">←</span> Retour à l'Annuaire
            </Link>
            
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 p-4 md:p-8 flex flex-col xl:flex-row justify-between gap-8 text-slate-800">
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">{client.full_name}</h2>
                    <p className="text-slate-400 font-semibold uppercase tracking-widest mt-2 text-[8px] md:text-[10px] flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> {client.occupation || 'Dossier Particulier'}
                    </p>
                    <div className="mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-inner">
                             <p className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase mb-0.5 md:mb-1">CIN / Passport</p>
                             <p className="font-bold text-slate-800 tracking-wide text-sm md:text-base">{client.cin_number}</p>
                        </div>
                        <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-inner">
                             <p className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase mb-0.5 md:mb-1">Téléphone</p>
                             <p className="font-bold text-slate-800 tracking-wide text-sm md:text-base">{client.phone}</p>
                        </div>
                        <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-inner">
                             <p className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase mb-0.5 md:mb-1">Email</p>
                             <p className="font-semibold text-slate-700 truncate text-sm md:text-base">{client.email || 'Non renseigné'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-inner">
                             <p className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase mb-0.5 md:mb-1">Adresse</p>
                             <p className="font-semibold text-slate-700 truncate text-sm md:text-base">{client.address || 'Non renseignée'}</p>
                        </div>
                    </div>
                </div>
                <div className="xl:w-80 flex flex-col gap-4">
                    <div className="bg-green-600 rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-xl flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                             <CoinsIcon className="w-6 h-6 md:w-8 md:h-8 opacity-40" />
                             <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Total Cumulé Payé</span>
                         </div>
                         <div className="mt-6 md:mt-8">
                             <p className="text-2xl md:text-3xl font-bold">{payments.filter(p => p.status === PaymentStatus.Paid).reduce((sum, p) => sum + p.amount_dh, 0).toLocaleString()} <span className="text-sm">DH</span></p>
                             <p className="text-[10px] md:text-xs opacity-70 mt-1 font-medium">Dossiers soldés et en cours</p>
                         </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    <section>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-5 px-2 flex items-center uppercase tracking-tight">
                            <FileTextIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-indigo-600" /> Dossiers Actifs
                        </h3>
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4 text-left">Propriété</th>
                                            <th className="hidden sm:table-cell px-4 md:px-6 py-4 text-left">Valeur</th>
                                            <th className="px-4 md:px-6 py-4 text-left">Reliquat</th>
                                            <th className="px-4 md:px-6 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-semibold text-xs md:text-sm">
                                        {activeContracts.length > 0 ? activeContracts.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 md:px-6 py-4 md:py-5 text-slate-900">
                                                    {c.apartmentName}
                                                    <div className="sm:hidden text-[10px] text-slate-400">Total: {c.amount_dh.toLocaleString()} DH</div>
                                                </td>
                                                <td className="hidden sm:table-cell px-4 md:px-6 py-4 md:py-5 text-slate-900">{c.amount_dh.toLocaleString()} DH</td>
                                                <td className="px-4 md:px-6 py-4 md:py-5">
                                                    <span className={c.remainingAmount > 0 ? "text-red-600 font-bold" : "text-green-600"}>
                                                        {c.remainingAmount.toLocaleString()} DH
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4 md:py-5 text-center">
                                                    {c.remainingAmount > 0 ? (
                                                        <button onClick={() => handleOpenPaymentModal(c)} className="mx-auto px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-white bg-indigo-600 rounded-lg md:rounded-xl hover:bg-indigo-700 flex items-center shadow-lg transition-all active:scale-95">
                                                           <CoinsIcon className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" /> Encaisser
                                                        </button>
                                                    ) : <span className="text-green-500 font-bold text-[9px] md:text-[10px] uppercase bg-green-50 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">Soldé ✓</span>}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="p-8 md:p-10 text-center text-slate-400 italic font-medium">Aucun dossier actif.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-5 px-2 gap-3">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center uppercase tracking-tight">
                                <ClockIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-green-600" /> Historique Versements
                            </h3>
                        </div>
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50 font-semibold text-slate-400 text-[9px] md:text-[10px] uppercase">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4 text-left">Date</th>
                                            <th className="px-4 md:px-6 py-4 text-left">Montant</th>
                                            <th className="hidden sm:table-cell px-4 md:px-6 py-4 text-left">Objet</th>
                                            <th className="px-4 md:px-6 py-4 text-center">Statut</th>
                                            <th className="px-4 md:px-6 py-4 text-center">Reçu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-semibold text-xs md:text-sm">
                                        {payments.length > 0 ? payments.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 md:px-6 py-4 text-slate-400 font-medium">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                                                <td className="px-4 md:px-6 py-4 md:py-4 text-slate-900 font-bold whitespace-nowrap">
                                                    {p.amount_dh.toLocaleString()} DH
                                                    <div className="sm:hidden text-[9px] text-slate-400 font-medium truncate max-w-[100px]">{p.payment_for}</div>
                                                </td>
                                                <td className="hidden sm:table-cell px-4 md:px-6 py-4 md:py-4 text-slate-500 font-medium">
                                                    {p.payment_for}
                                                    {p.payment_for.toLowerCase().includes('initial') && (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] rounded border border-blue-100">DÉPÔT</span>
                                                    )}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-center"><span className={getPaymentStatusBadge(p.status).replace('text-[10px]', 'text-[8px] md:text-[10px]')}>{p.status}</span></td>
                                                <td className="px-4 md:px-6 py-4 text-center">
                                                    <button onClick={() => setReceiptPaymentId(p.id)} className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors" title="Imprimer le reçu">
                                                        <PrinterIcon className="w-5 h-5 mx-auto" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className="p-8 md:p-10 text-center text-slate-400 italic font-medium">Aucun versement.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-10">
                    <section>
                        <h3 className="text-xl font-bold text-slate-800 mb-5 px-2 flex items-center uppercase tracking-tight">
                            <ClockIcon className="w-6 h-6 mr-3 text-slate-400" /> Archives de Dossiers
                        </h3>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 space-y-4">
                                {archivedContracts.length > 0 ? archivedContracts.map(c => (
                                    <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-slate-100 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{c.apartmentName}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Dossier archivé</p>
                                        </div>
                                        <span className={getContractStatusBadge(c.status)}>{c.status}</span>
                                    </div>
                                )) : (
                                    <p className="p-6 text-center text-slate-400 italic text-sm font-medium">Aucune archive disponible.</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <Modal title="Encaisser un versement" isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)}>
                <form onSubmit={handleAddPayment} className="space-y-6">
                    {selectedContract && (
                         <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Solde à régler sur {activeContracts.find(c => c.id === selectedContract.id)?.apartmentName}</p>
                                <p className="text-3xl font-bold text-amber-900 tracking-tight">
                                    {activeContracts.find(c => c.id === selectedContract.id)?.remainingAmount.toLocaleString()} DH
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                                <CoinsIcon className="w-8 h-8 text-amber-600" />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Montant à encaisser (DH)</label>
                            <input type="number" step="any" name="amount_dh" required defaultValue={activeContracts.find(c => c.id === selectedContract?.id)?.remainingAmount} className={inputClasses + " text-lg text-green-700 bg-green-50/20 border-green-100 shadow-sm"} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Objet du versement</label>
                            <input type="text" name="payment_for" required className={inputClasses} placeholder="ex: Solde dossier vente" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100">
                        <div>
                            <label className="block text-sm font-bold text-indigo-900 mb-1">Méthode</label>
                            <select onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} value={paymentMethod} className={inputClasses}>
                                <option value="especes">💰 Espèces</option>
                                <option value="cheque">🏦 Chèque</option>
                                <option value="virement">🔀 Virement</option>
                                <option value="effet">📄 Effet</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-indigo-900 mb-1">Date</label>
                            <input type="date" name="payment_date" required defaultValue={new Date().toISOString().substring(0, 10)} className={inputClasses} />
                        </div>
                    </div>

                    {paymentMethod !== 'especes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6 border-2 border-dashed border-indigo-100 bg-white rounded-3xl animate-slide-up-from-bottom shadow-inner">
                            <div><label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">N° Référence</label><input type="text" name="ref_num" required className={inputClasses} /></div>
                            <div><label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Banque émettrice</label><input type="text" name="bank_name" required className={inputClasses} /></div>
                        </div>
                    )}

                    <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center hover:bg-white transition-all group">
                        <label className="block text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Justificatif de versement (Auto-compression)</label>
                        {!proofBase64 ? (
                            <input 
                                key={`recov-file-${fileInputKey}`}
                                type="file" accept="image/*" onChange={handleFileChange} 
                                className="text-xs file:bg-slate-900 file:text-white file:border-0 file:rounded-xl file:px-6 file:py-2.5 file:font-bold hover:file:bg-black cursor-pointer shadow-md" 
                            />
                        ) : (
                            <div className="flex flex-col items-center animate-slide-up-from-bottom">
                                <div className="relative group">
                                    <img src={proofBase64} className="h-24 w-auto rounded-xl border-4 border-white shadow-xl mb-3" alt="Selected" />
                                    <button type="button" onClick={handleClearSelection} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700 transition-all">
                                        <XCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Optimisé ✓</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold">Annuler</button>
                        <button type="submit" className="px-10 py-3 bg-green-600 text-white rounded-2xl font-bold shadow-xl hover:bg-green-700 transform active:scale-95 transition-all">Valider l'Encaissement</button>
                    </div>
                </form>
            </Modal>
            
            {receiptPaymentId && <ReceiptPage paymentId={receiptPaymentId} onClose={() => setReceiptPaymentId(null)} />}
        </div>
    );
};

export default ClientDetailsPage;
