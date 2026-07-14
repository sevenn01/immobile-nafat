
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPayments, getClients, getContracts, addPayment, cancelPayment, updatePayment, deletePayment } from '../services/api';
import { Payment, Client, PaymentStatus, Contract, ContractStatus, PaymentMethod } from '../types';
import { PlusIcon, TrashIcon, SearchIcon, XCircleIcon, PrinterIcon, PaperclipIcon, DownloadIcon, EditIcon, CoinsIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import ReceiptPage from './ReceiptPage';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';

// Utility to compress image to stay under Firestore's 1MB limit
const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.6): Promise<string> => {
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
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
            }
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

const translateStatus = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.Paid: return 'Payé';
        case PaymentStatus.Pending: return 'En attente';
        case PaymentStatus.Late: return 'En retard';
        case PaymentStatus.Canceled: return 'Annulé';
        default: return status;
    }
};

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
  const [proofBase64, setProofBase64] = useState<string>('');
  const [fileInputKey, setFileInputKey] = useState(0); 
  const { user } = useAuth();
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [selectedPaymentForDoc, setSelectedPaymentForDoc] = useState<Payment | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ 
    status: 'all',
    method: 'all',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: ''
  });

  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [paymentFor, setPaymentFor] = useState('');
  const [paymentForOption, setPaymentForOption] = useState<string>('avance');
  const [customPaymentFor, setCustomPaymentFor] = useState<string>('');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<string>('');
  
  // Confirmation state for deleting whole payment
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pays, cls, ctrs] = await Promise.all([ getPayments(), getClients(), getContracts() ]);
      setPayments(pays.sort((a,b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()));
      setClients(cls); setContracts(ctrs);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedContractDetails = useMemo(() => {
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;
    const totalPaid = payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid).reduce((sum, p) => sum + p.amount_dh, 0);
    return { contract, totalPaid, remaining: Math.max(0, contract.amount_dh - totalPaid) };
  }, [selectedContractId, contracts, payments]);

  useEffect(() => {
    if (selectedContractDetails) {
        setCurrentPaymentAmount(String(selectedContractDetails.remaining));
        const hasExistingPayments = payments.some(p => p.contract_id === selectedContractDetails.contract.id && p.status === PaymentStatus.Paid);
        if (!hasExistingPayments) {
            setPaymentForOption('Versement initial');
        } else {
            setPaymentForOption(selectedContractDetails.contract.type === 'sale' ? 'avance' : 'Loyer mensuel');
        }
        setCustomPaymentFor('');
    }
  }, [selectedContractDetails, payments]);

  useEffect(() => {
    if (paymentForOption === 'autre') {
        setPaymentFor(customPaymentFor);
    } else {
        setPaymentFor(paymentForOption);
    }
  }, [paymentForOption, customPaymentFor]);

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
    if (window.confirm("Voulez-vous annuler le choix de ce fichier ?")) {
        setProofBase64('');
        setFileInputKey(prev => prev + 1); 
    }
  };

  const handleDeleteExistingDoc = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedPaymentForDoc) return;
      
      if (window.confirm("Voulez-vous supprimer DÉFINITIVEMENT ce document joint ?")) {
          try {
              // 1. Update DB
              await updatePayment(selectedPaymentForDoc.id, { proof_url: "" });
              
              // 2. Immediate local feedback
              setSelectedPaymentForDoc(prev => prev ? { ...prev, proof_url: "" } : null);
              setProofBase64('');
              setFileInputKey(prev => prev + 1);

              // 3. Refresh and Notify
              await fetchData();
              setNotification({ message: "Le document a été retiré de l'archive.", type: 'success' });
          } catch(err) { 
              console.error(err);
              setNotification({ message: "Une erreur est survenue lors du retrait.", type: 'error' });
          }
      }
  };

  const handleConfirmFullDelete = async () => {
      if (!paymentToDelete) return;
      try {
          await deletePayment(paymentToDelete.id);
          setNotification({ message: "Paiement supprimé définitivement.", type: 'success' });
          await fetchData();
      } catch (error) {
          setNotification({ message: "Erreur lors de la suppression du paiement.", type: 'error' });
      } finally {
          setIsDeleteConfirmModalOpen(false);
          setPaymentToDelete(null);
      }
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedContractId) return;
    const formData = new FormData(e.currentTarget);
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return;

    const data: Partial<Payment> = {
        contract_id: selectedContractId,
        client_id: contract.client_id,
        amount_dh: Number(currentPaymentAmount) || 0,
        payment_date: (formData.get('payment_date') as string) || new Date().toISOString(),
        payment_for: paymentFor || "Paiement",
        notes: (formData.get('notes') as string) || "",
        status: PaymentStatus.Paid,
        payment_method: paymentMethod,
        proof_url: proofBase64 || "", 
        cheque_number: (formData.get('ref_num') as string) || "",
        bank_name: (formData.get('bank_name') as string) || ""
    };

    try { 
        await addPayment(data, user.user_id); 
        await fetchData(); 
        setIsModalOpen(false); 
        setProofBase64('');
        setFileInputKey(k => k + 1);
        setNotification({ message: "Encaissement validé.", type: 'success' });
    } catch(error) { console.error(error); }
  }

  const handleUpdateProof = async () => {
    if (!selectedPaymentForDoc) return;
    try {
        await updatePayment(selectedPaymentForDoc.id, { proof_url: proofBase64 });
        await fetchData();
        setIsEditDocModalOpen(false);
        setProofBase64('');
        setFileInputKey(k => k + 1);
        setNotification({ message: "Document archivé avec succès.", type: 'success' });
    } catch(e) { console.error(e); }
  }

  const filteredPayments = useMemo(() => {
      return payments.filter(p => {
          const client = clients.find(c => c.id === p.client_id);
          const nameMatch = (client?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
          const statusMatch = filters.status === 'all' || p.status === filters.status;
          const methodMatch = filters.method === 'all' || p.payment_method === filters.method;
          
          const minAmountMatch = !filters.minAmount || p.amount_dh >= Number(filters.minAmount);
          const maxAmountMatch = !filters.maxAmount || p.amount_dh <= Number(filters.maxAmount);
          
          const startDateMatch = !filters.startDate || new Date(p.payment_date) >= new Date(filters.startDate);
          const endDateMatch = !filters.endDate || new Date(p.payment_date) <= new Date(filters.endDate);

          return nameMatch && statusMatch && methodMatch && minAmountMatch && maxAmountMatch && startDateMatch && endDateMatch;
      });
  }, [payments, clients, searchTerm, filters]);

  const inputClasses = "mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-green-500 focus:border-green-500 text-gray-900 sm:text-sm font-bold transition-all";

  if (loading) return <div className="p-8 text-center text-gray-500 italic">Chargement...</div>;

  return (
    <div>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Comptabilité</h2>
        <button onClick={() => { setSelectedContractId(''); setProofBase64(''); setIsModalOpen(true); }} className="w-full md:w-auto justify-center px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center shadow-lg font-bold transition-all transform active:scale-95 text-sm md:text-base">
          <PlusIcon className="w-5 h-5 mr-2" /> Nouvel Encaissement
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <div className="relative flex-grow">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Rechercher par client..." 
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
                  <option value="all">Tous les statuts</option>
                  <option value={PaymentStatus.Paid}>Payés</option>
                  <option value={PaymentStatus.Pending}>En attente</option>
              </select>
              <select 
                  value={filters.method} 
                  onChange={e => setFilters({...filters, method: e.target.value})} 
                  className="bg-gray-50 px-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700 cursor-pointer text-sm sm:min-w-[150px]"
              >
                  <option value="all">Toutes méthodes</option>
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="virement">Virement</option>
                  <option value="effet">Effet</option>
              </select>
              {(searchTerm || filters.status !== 'all' || filters.method !== 'all' || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) && (
                  <button 
                      onClick={() => { setSearchTerm(''); setFilters({status:'all', method: 'all', minAmount: '', maxAmount: '', startDate: '', endDate: ''}); }} 
                      className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                      title="Réinitialiser"
                  >
                      <XCircleIcon className="w-6 h-6 text-gray-400" />
                  </button>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Période (Encaissé)</label>
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <tr>
                        <th className="px-4 md:px-6 py-4 text-left">Client / Date</th>
                        <th className="px-4 md:px-6 py-4 text-left">Montant</th>
                        <th className="hidden sm:table-cell px-4 md:px-6 py-4 text-left">Objet</th>
                        <th className="px-4 md:px-6 py-4 text-center">Archive</th>
                        <th className="px-4 md:px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-sm">
                    {filteredPayments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                                <div className="font-bold text-gray-900 text-sm">{clients.find(c => c.id === p.client_id)?.full_name}</div>
                                <div className="text-[10px] text-gray-400 font-medium">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                                <div className="font-bold text-black text-sm">{p.amount_dh.toLocaleString()} <span className="text-[10px]">DH</span></div>
                                <div className="sm:hidden text-[10px] text-gray-400 truncate max-w-[100px]">{p.payment_for}</div>
                            </td>
                            <td className="hidden sm:table-cell px-4 md:px-6 py-4 text-gray-500 font-medium text-xs font-bold uppercase tracking-tight">{p.payment_for}</td>
                            <td className="px-4 md:px-6 py-4 text-center">
                                {p.proof_url ? (
                                    <button onClick={() => setPreviewProofUrl(p.proof_url!)} className="p-1.5 md:p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm">
                                        <PaperclipIcon className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                ) : <span className="text-gray-300 italic text-[10px]">Aucun</span>}
                            </td>
                            <td className="px-4 md:px-6 py-4">
                                <div className="flex justify-end items-center space-x-1 md:space-x-2">
                                    <button onClick={() => setReceiptPaymentId(p.id)} className="p-1.5 md:p-2 text-gray-300 hover:text-blue-600 transition-colors" title="Imprimer Reçu">
                                        <PrinterIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => { setSelectedPaymentForDoc(p); setProofBase64(''); setFileInputKey(k => k+1); setIsEditDocModalOpen(true); }} className="p-1.5 md:p-2 text-indigo-300 hover:text-indigo-600 transition-colors" title="Gérer le document">
                                        <EditIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => { setPaymentToDelete(p); setIsDeleteConfirmModalOpen(true); }} className="p-1.5 md:p-2 text-red-200 hover:text-red-600 transition-colors" title="Supprimer">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>

      {/* NEW PAYMENT MODAL */}
      <Modal title="Encaisser un versement" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleAddPayment} className="space-y-6">
             <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Dossier Immobilier</label>
                <select required onChange={e => setSelectedContractId(e.target.value)} value={selectedContractId} className={inputClasses}>
                    <option value="" disabled>Sélectionner le contrat...</option>
                    {contracts.filter(c => c.status !== ContractStatus.Canceled && c.status !== ContractStatus.SaleCanceled).map(c => (
                        <option key={c.id} value={c.id}>{clients.find(cl => cl.id === c.client_id)?.full_name} - {c.amount_dh.toLocaleString()} DH</option>
                    ))}
                </select>
                
                {selectedContractDetails && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white p-2.5 sm:p-3 rounded-xl border flex flex-col shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total</span>
                            <span className="text-xs sm:text-sm font-bold text-black">{selectedContractDetails.contract.amount_dh.toLocaleString()} DH</span>
                        </div>
                        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-amber-100 flex flex-col shadow-sm text-amber-600">
                            <span className="text-[10px] font-bold uppercase mb-1">Reste</span>
                            <span className="text-xs sm:text-sm font-bold">{selectedContractDetails.remaining.toLocaleString()} DH</span>
                        </div>
                    </div>
                )}
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Montant (DH)</label>
                    <input type="number" step="any" required value={currentPaymentAmount} onChange={e => setCurrentPaymentAmount(e.target.value)} className={inputClasses + " text-lg text-green-700 bg-green-50/30 border-green-200"} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Objet</label>
                    <select 
                        value={paymentForOption} 
                        onChange={(e) => setPaymentForOption(e.target.value)} 
                        className={inputClasses}
                    >
                        <option value="Versement initial">Versement initial</option>
                        <option value="avance">Avance</option>
                        <option value="Solde dossier">Solde dossier</option>
                        <option value="Loyer mensuel">Loyer mensuel</option>
                        <option value="autre">Autre (Saisir manuellement)...</option>
                    </select>
                    {paymentForOption === 'autre' && (
                        <input 
                            type="text" 
                            value={customPaymentFor} 
                            onChange={(e) => setCustomPaymentFor(e.target.value)} 
                            required 
                            className={`${inputClasses} mt-2 animate-slide-up-from-bottom`} 
                            placeholder="Préciser l'objet..." 
                        />
                    )}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 sm:p-5 bg-indigo-50/30 rounded-xl sm:rounded-2xl border border-indigo-100">
                <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-1">Méthode</label>
                    <select onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} value={paymentMethod} className={inputClasses}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 sm:p-5 bg-white border-2 border-dashed border-indigo-200 rounded-xl sm:rounded-2xl animate-slide-up-from-bottom">
                    <div>
                        <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">N° Réf</label>
                        <input type="text" name="ref_num" required className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Banque</label>
                        <input type="text" name="bank_name" required className={inputClasses} />
                    </div>
                </div>
             )}

            <div className="p-4 sm:p-6 border-2 border-dashed border-slate-200 rounded-2xl md:rounded-3xl text-center bg-slate-50/50 hover:bg-white transition-all group">
                <label className="block text-xs font-bold text-slate-500 mb-4 uppercase tracking-tighter flex items-center justify-center">
                    <PaperclipIcon className="w-4 h-4 mr-2" /> Justificatif
                </label>
                {!proofBase64 ? (
                    <input 
                        key={`file-input-${fileInputKey}`}
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="text-xs text-slate-500 file:bg-slate-900 file:text-white file:border-0 file:rounded-xl file:px-6 file:py-2.5 file:font-bold hover:file:bg-black cursor-pointer shadow-sm w-full" 
                    />
                ) : (
                    <div className="flex flex-col items-center animate-slide-up-from-bottom">
                        <div className="relative group">
                            <img src={proofBase64} className="h-20 sm:h-28 w-auto rounded-xl shadow-xl border-4 border-white mb-3" alt="Preview" />
                            <button type="button" onClick={handleClearSelection} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700 transform hover:scale-110 transition-all">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <span className="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-3 py-1 rounded-full">Prêt ✓</span>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold order-2 sm:order-1 transition-colors">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-xl hover:bg-green-700 transform active:scale-95 transition-all order-1 sm:order-2">Valider</button>
            </div>
        </form>
      </Modal>

      {/* EDIT DOCUMENT MODAL */}
      <Modal title="Gestion du justificatif" isOpen={isEditDocModalOpen} onClose={() => setIsEditDocModalOpen(false)}>
          <div className="space-y-6">
              {selectedPaymentForDoc?.proof_url ? (
                  <div className="relative overflow-visible">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Document actuel archivé :</p>
                      <div className="bg-slate-100 rounded-[2rem] p-4 flex justify-center border border-slate-200 relative">
                         <img src={selectedPaymentForDoc.proof_url} className="max-h-72 w-auto rounded-xl shadow-2xl" alt="Stored Doc" />
                         <button 
                            type="button" 
                            onClick={handleDeleteExistingDoc} 
                            className="absolute -top-2 -right-2 p-3 bg-red-600 text-white rounded-2xl shadow-2xl hover:bg-red-700 transition-all z-10 hover:scale-110 active:scale-95 ring-4 ring-white"
                            title="Retirer ce document"
                         >
                            <TrashIcon className="w-6 h-6" />
                         </button>
                      </div>
                  </div>
              ) : (
                  <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold italic">Aucun justificatif joint à ce versement.</div>
              )}

              <div className="p-8 border-2 border-dashed border-indigo-200 rounded-3xl bg-indigo-50/20 text-center">
                  <p className="text-sm font-bold text-indigo-900 mb-6 uppercase tracking-tight">{selectedPaymentForDoc?.proof_url ? "Mettre à jour le fichier" : "Ajouter un justificatif"}</p>
                  <input 
                    key={`file-edit-${fileInputKey}`}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="text-sm text-indigo-500 file:bg-indigo-600 file:text-white file:border-0 file:rounded-2xl file:px-8 file:py-3 file:font-bold hover:file:bg-indigo-700 cursor-pointer shadow-md" 
                  />
                  {proofBase64 && (
                      <div className="mt-8 flex flex-col items-center animate-slide-up-from-bottom">
                          <div className="relative inline-block mb-3">
                             <img src={proofBase64} className="h-32 w-auto rounded-2xl border-4 border-white shadow-2xl" alt="Preview selection" />
                             <button type="button" onClick={handleClearSelection} className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 shadow-lg">
                                <XCircleIcon className="w-5 h-5" />
                             </button>
                          </div>
                          <p className="text-green-600 font-bold text-[10px] uppercase bg-green-50 px-3 py-1 rounded-full">Nouveau document prêt ✓</p>
                      </div>
                  )}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button type="button" onClick={() => setIsEditDocModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold">Fermer</button>
                  <button type="button" onClick={handleUpdateProof} disabled={!proofBase64} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold disabled:bg-indigo-200 shadow-xl transition-all">Sauvegarder les modifications</button>
              </div>
          </div>
      </Modal>

      <Modal title="Aperçu du justificatif" isOpen={!!previewProofUrl} onClose={() => setPreviewProofUrl(null)}>
          <div className="flex flex-col items-center">
              <img src={previewProofUrl || ''} className="max-w-full rounded-2xl shadow-2xl border-4 border-white mb-8" alt="Zoom" />
              <div className="flex space-x-4">
                  <a href={previewProofUrl || ''} download="justificatif.png" className="px-8 py-3.5 bg-green-600 text-white rounded-2xl font-bold flex items-center shadow-xl hover:bg-green-700 transition-all"><DownloadIcon className="w-5 h-5 mr-3" /> Télécharger</a>
                  <button onClick={() => setPreviewProofUrl(null)} className="px-8 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold">Quitter</button>
              </div>
          </div>
      </Modal>

      {/* FULL PAYMENT DELETION CONFIRMATION */}
      <ConfirmationModal 
        isOpen={isDeleteConfirmModalOpen} 
        onClose={() => setIsDeleteConfirmModalOpen(false)} 
        onConfirm={handleConfirmFullDelete} 
        title="Supprimer définitivement le versement ?" 
        message="Cette action supprimera toutes les données de ce versement, y compris les documents joints et les reçus. Le solde du contrat sera recalculé immédiatement." 
      />

      {receiptPaymentId && <ReceiptPage paymentId={receiptPaymentId} onClose={() => setReceiptPaymentId(null)} />}
    </div>
  );
};

export default PaymentsPage;
