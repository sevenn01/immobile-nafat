import React, { useState, useEffect } from 'react';
import { getClients, addContract } from '../services/api';
import { Client, Apartment, Contract, ContractStatus, ApartmentStatus, Project, Payment, PaymentStatus, PaymentMethod } from '../types';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';
import { Lock } from 'lucide-react';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    apartment: Apartment | null;
    project: Project | null;
    onSuccess: () => void;
}

const inputClasses = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm";

export const ReservationModal: React.FC<ReservationModalProps> = ({ isOpen, onClose, apartment, project, onSuccess }) => {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [salePrice, setSalePrice] = useState<string>('0');
    const [amountPaid, setAmountPaid] = useState<string>('0');
    const [initPaymentMethod, setInitPaymentMethod] = useState<PaymentMethod>('especes');
    const [durationMonths, setDurationMonths] = useState<string>('12');

    useEffect(() => {
        if (isOpen) {
            const fetchClients = async () => {
                try {
                    setLoadingClients(true);
                    const data = await getClients();
                    setClients(data);
                } catch (err) {
                    console.error('Error fetching clients in ReservationModal:', err);
                } finally {
                    setLoadingClients(false);
                }
            };
            fetchClients();
        }
    }, [isOpen]);

    useEffect(() => {
        if (apartment) {
            setSalePrice(String(apartment.sale_price_dh || apartment.price_dh || 0));
            setAmountPaid('0');
            setInitPaymentMethod('especes');
            setDurationMonths('12');
            setError(null);
        }
    }, [apartment]);

    if (!apartment) return null;

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour effectuer cette action.");
            return;
        }

        const formData = new FormData(e.currentTarget);
        const clientId = formData.get('client_id') as string;
        if (!clientId) {
            setError("Veuillez choisir un client.");
            return;
        }

        const totalAmount = Number(salePrice);
        const initialDeposit = Number(amountPaid);

        const contractType = apartment.intended_for || 'sale';

        const data: Partial<Contract> = {
            client_id: clientId,
            apartment_id: apartment.id,
            project_id: apartment.project_id,
            type: contractType as any,
            amount_dh: totalAmount,
            start_date: formData.get('start_date') as string,
            notes: formData.get('notes') as string,
        };

        let initialPay: Partial<Payment> | undefined;
        if (contractType === 'rental') {
            const months = Number(durationMonths);
            data.duration_months = months;
            const end = new Date(data.start_date!); 
            end.setMonth(end.getMonth() + months);
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
                    proof_url: "",
                    cheque_number: (formData.get('init_ref') as string) || "",
                    bank_name: (formData.get('init_bank') as string) || ""
                };
            }
        }

        try {
            setSubmitting(true);
            setError(null);
            await addContract(data as any, user.user_id, initialPay);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error reserving apartment:', err);
            const errMsg = err?.message || "Une erreur est survenue lors de l'enregistrement de la réservation.";
            setError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isSale = apartment.intended_for !== 'rental';

    return (
        <Modal 
            title={`Nouveau Dossier - ${!isSale ? 'Location' : 'Vente'}`} 
            isOpen={isOpen} 
            onClose={onClose}
        >
            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                        {error}
                    </div>
                )}

                {/* Display apartment details */}
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Propriété Sélectionnée</p>
                        <h4 className="font-bold text-gray-800 text-base">{apartment.name}</h4>
                        <p className="text-xs text-gray-500">
                            Projet: {project?.project_name || 'N/A'} • Étage: {apartment.floor}
                        </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-gray-100 shadow-sm text-gray-700">
                        Type: {apartment.intended_for === 'rental' ? 'Location' : 'Vente'}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Client</label>
                    {loadingClients ? (
                        <div className="py-2 text-sm text-gray-400">Chargement des clients...</div>
                    ) : (
                        <select name="client_id" required className={inputClasses} defaultValue="">
                            <option value="" disabled>Choisir un client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                    )}
                </div>

                {!isSale && (
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Durée (Mois)</label>
                        <input 
                            type="number" 
                            required 
                            value={durationMonths} 
                            onChange={e => setDurationMonths(e.target.value)} 
                            className={inputClasses} 
                            placeholder="Durée du contrat" 
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {isSale ? 'Prix Net (DH)' : 'Loyer Mensuel (DH)'}
                            </label>
                            <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Lock className="w-3 h-3 mr-1" />
                                Fixé par la Propriété
                            </span>
                        </div>
                        <div className="relative">
                            <input 
                                type="number" 
                                step="any" 
                                value={salePrice} 
                                readOnly
                                className={inputClasses + " bg-gray-100/80 cursor-not-allowed font-bold text-gray-800"} 
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                                DH
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">Pour modifier le prix de ce bien, rendez-vous dans la section <strong>Propriétés</strong>.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date Signature</label>
                        <input 
                            type="date" 
                            name="start_date" 
                            required 
                            defaultValue={new Date().toISOString().split('T')[0]} 
                            className={inputClasses} 
                        />
                    </div>
                </div>

                <div className="p-4 sm:p-5 bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-100 space-y-4">
                    <h4 className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Acompte Initial</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Montant Reçu (DH)</label>
                            <input 
                                type="number" 
                                step="any" 
                                value={amountPaid} 
                                onChange={e => setAmountPaid(e.target.value)} 
                                className={inputClasses} 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Mode de paiement</label>
                            <select 
                                value={initPaymentMethod} 
                                onChange={e => setInitPaymentMethod(e.target.value as PaymentMethod)} 
                                className={inputClasses}
                            >
                                <option value="especes">Espèces</option>
                                <option value="cheque">Chèque</option>
                                <option value="virement">Virement</option>
                                <option value="effet">Effet</option>
                            </select>
                        </div>
                    </div>

                    {initPaymentMethod !== 'especes' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Référence (N°)</label>
                                <input type="text" name="init_ref" className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Banque</label>
                                <input type="text" name="init_bank" className={inputClasses} />
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes Internes</label>
                    <textarea 
                        name="notes" 
                        rows={2} 
                        className={inputClasses} 
                        placeholder="Observations..."
                    ></textarea>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-5 border-t">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold order-2 sm:order-1 transition-all"
                        disabled={submitting}
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg order-1 sm:order-2 hover:bg-green-700 transition-all disabled:opacity-50"
                        disabled={submitting}
                    >
                        {submitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ReservationModal;
