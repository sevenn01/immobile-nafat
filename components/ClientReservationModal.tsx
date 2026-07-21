import React, { useState, useEffect } from 'react';
import { getApartments, getProjects, addContract } from '../services/api';
import { Client, Apartment, Contract, ContractStatus, ApartmentStatus, Project, Payment, PaymentStatus, PaymentMethod } from '../types';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';

interface ClientReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    onSuccess: () => void;
}

const inputClasses = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-semibold text-gray-900";

export const ClientReservationModal: React.FC<ClientReservationModalProps> = ({ isOpen, onClose, client, onSuccess }) => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
    const [salePrice, setSalePrice] = useState<string>('0');
    const [amountPaid, setAmountPaid] = useState<string>('0');
    const [initPaymentMethod, setInitPaymentMethod] = useState<PaymentMethod>('especes');
    const [durationMonths, setDurationMonths] = useState<string>('12');
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<string>('');

    // Reference number and bank for check/virement/effet
    const [initRef, setInitRef] = useState<string>('');
    const [initBank, setInitBank] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                try {
                    setLoading(true);
                    const [projs, apts] = await Promise.all([getProjects(), getApartments()]);
                    setProjects(projs);
                    setApartments(apts);
                    
                    if (projs.length > 0) {
                        setSelectedProjectId(projs[0].id);
                    }
                } catch (err) {
                    console.error('Error fetching data for ClientReservationModal:', err);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }
    }, [isOpen]);

    // Filter available apartments for selected project
    const availableApartments = apartments.filter(a => 
        a.project_id === selectedProjectId && 
        (a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale)
    );

    // Sort apartments by floor, then name
    const sortedAvailableApartments = [...availableApartments].sort((a, b) => {
        const floorA = parseInt(a.floor || '0', 10);
        const floorB = parseInt(b.floor || '0', 10);
        if (floorA !== floorB) {
            return floorA - floorB;
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    // Update price when apartment changes
    useEffect(() => {
        if (selectedApartmentId) {
            const apt = apartments.find(a => a.id === selectedApartmentId);
            if (apt) {
                setSalePrice(String(apt.sale_price_dh || apt.price_dh || 0));
                setAmountPaid('0');
                setNotes('');
            }
        } else {
            setSalePrice('0');
            setAmountPaid('0');
        }
    }, [selectedApartmentId, apartments]);

    // Reset apartment selection when project changes
    useEffect(() => {
        setSelectedApartmentId('');
    }, [selectedProjectId]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour effectuer cette action.");
            return;
        }

        if (!selectedApartmentId) {
            setError("Veuillez sélectionner un appartement.");
            return;
        }

        const apt = apartments.find(a => a.id === selectedApartmentId);
        if (!apt) {
            setError("Appartement invalide.");
            return;
        }

        const totalAmount = Number(salePrice);
        const initialDeposit = Number(amountPaid);
        const contractType = apt.intended_for || 'sale';

        const data: Partial<Contract> = {
            client_id: client.id,
            apartment_id: apt.id,
            project_id: apt.project_id,
            type: contractType as any,
            amount_dh: totalAmount,
            start_date: startDate,
            notes: notes,
        };

        let initialPay: Partial<Payment> | undefined;
        if (contractType === 'rental') {
            const months = Number(durationMonths);
            data.duration_months = months;
            const end = new Date(startDate); 
            end.setMonth(end.getMonth() + months);
            data.end_date = end.toISOString().split('T')[0];
            data.status = ContractStatus.Active;
        } else {
            data.status = initialDeposit >= totalAmount ? ContractStatus.SaleCompleted : ContractStatus.SaleInProgress;
            if (initialDeposit > 0) {
                initialPay = { 
                    amount_dh: initialDeposit, 
                    payment_date: startDate, 
                    payment_for: "Versement initial", 
                    payment_method: initPaymentMethod, 
                    status: PaymentStatus.Paid,
                    proof_url: "",
                    cheque_number: initRef || "",
                    bank_name: initBank || ""
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
            console.error('Error reserving apartment from client view:', err);
            setError("Une erreur est survenue lors de l'enregistrement de la réservation.");
        } finally {
            setSubmitting(false);
        }
    };

    const activeApt = apartments.find(a => a.id === selectedApartmentId);
    const isSale = activeApt ? activeApt.intended_for !== 'rental' : true;

    return (
        <Modal 
            title={`Nouvelle Réservation pour ${client.full_name}`} 
            isOpen={isOpen} 
            onClose={onClose}
        >
            {loading ? (
                <div className="py-8 text-center text-slate-500 font-bold italic">Chargement des données...</div>
            ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Projet</label>
                            <select 
                                value={selectedProjectId} 
                                onChange={(e) => setSelectedProjectId(e.target.value)} 
                                required
                                className={inputClasses}
                            >
                                <option value="" disabled>Sélectionner un projet</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.project_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unité / Appartement</label>
                            <select 
                                value={selectedApartmentId} 
                                onChange={(e) => setSelectedApartmentId(e.target.value)} 
                                required
                                className={inputClasses}
                            >
                                <option value="">Choisir une unité disponible</option>
                                {sortedAvailableApartments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} (Étage {a.floor} • {a.intended_for === 'rental' ? 'Location' : 'Vente'} • {a.price_dh.toLocaleString()} DH)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedApartmentId && activeApt && (
                        <div className="space-y-4 border-t border-slate-100 pt-4 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prix de la Transaction (DH)</label>
                                    <input 
                                        type="number" 
                                        value={salePrice} 
                                        onChange={(e) => setSalePrice(e.target.value)} 
                                        required 
                                        className={inputClasses}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date d'effet / Signature</label>
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={(e) => setStartDate(e.target.value)} 
                                        required 
                                        className={inputClasses}
                                    />
                                </div>
                            </div>

                            {isSale ? (
                                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Paiement Initial</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Montant Versé (DH)</label>
                                            <input 
                                                type="number" 
                                                value={amountPaid} 
                                                onChange={(e) => setAmountPaid(e.target.value)} 
                                                required 
                                                className={inputClasses}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mode de règlement</label>
                                            <select 
                                                value={initPaymentMethod} 
                                                onChange={(e) => setInitPaymentMethod(e.target.value as PaymentMethod)} 
                                                required 
                                                className={inputClasses}
                                            >
                                                <option value="especes">💰 Espèces</option>
                                                <option value="cheque">🏦 Chèque</option>
                                                <option value="virement">🔀 Virement</option>
                                                <option value="effet">📄 Effet</option>
                                            </select>
                                        </div>
                                    </div>

                                    {initPaymentMethod !== 'especes' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up bg-white p-3 rounded-xl border border-slate-100">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">N° Réf / Chèque</label>
                                                <input 
                                                    type="text" 
                                                    value={initRef} 
                                                    onChange={(e) => setInitRef(e.target.value)} 
                                                    required 
                                                    className={inputClasses}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Banque émettrice</label>
                                                <input 
                                                    type="text" 
                                                    value={initBank} 
                                                    onChange={(e) => setInitBank(e.target.value)} 
                                                    required 
                                                    className={inputClasses}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Durée du bail (Mois)</label>
                                    <input 
                                        type="number" 
                                        value={durationMonths} 
                                        onChange={(e) => setDurationMonths(e.target.value)} 
                                        required 
                                        className={inputClasses}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Notes / Observations</label>
                                <textarea 
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)} 
                                    rows={3} 
                                    className={inputClasses + " resize-none"}
                                    placeholder="Précisions de paiement, modalités..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit" 
                            disabled={submitting || !selectedApartmentId}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {submitting ? 'Réservation...' : 'Valider la Réservation'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
