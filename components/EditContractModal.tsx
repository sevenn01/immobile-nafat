import React, { useState, useEffect } from 'react';
import { updateContract, getApartments } from '../services/api';
import { Contract, Apartment } from '../types';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';
import { Lock } from 'lucide-react';

interface EditContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: any | null; // Detailed contract object
    onSuccess: () => void;
}

const inputClasses = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-semibold text-gray-900";

export const EditContractModal: React.FC<EditContractModalProps> = ({ isOpen, onClose, contract, onSuccess }) => {
    const { user } = useAuth();
    const [amountDh, setAmountDh] = useState<string>('0');
    const [propertyCatalogPrice, setPropertyCatalogPrice] = useState<number | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [durationMonths, setDurationMonths] = useState<string>('12');
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (contract && isOpen) {
            setAmountDh(String(contract.amount_dh));
            setStartDate(contract.start_date || '');
            setDurationMonths(String(contract.duration_months || 12));
            setNotes(contract.notes || '');
            setError(null);

            // Fetch property catalog price
            const fetchApt = async () => {
                try {
                    const apts = await getApartments();
                    const matchedApt = apts.find(a => a.id === contract.apartment_id || a.apartment_id === contract.apartment_id);
                    if (matchedApt) {
                        const price = matchedApt.sale_price_dh || matchedApt.price_dh || null;
                        setPropertyCatalogPrice(price);
                    }
                } catch (e) {
                    console.error("Error fetching property price:", e);
                }
            };
            fetchApt();
        }
    }, [contract, isOpen]);

    if (!contract) return null;

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour effectuer cette action.");
            return;
        }

        const data: Partial<Contract> = {
            amount_dh: Number(amountDh),
            start_date: startDate,
            notes: notes,
        };

        if (contract.type === 'rental') {
            const months = Number(durationMonths);
            data.duration_months = months;
            const end = new Date(startDate);
            end.setMonth(end.getMonth() + months);
            data.end_date = end.toISOString().split('T')[0];
        }

        try {
            setSubmitting(true);
            setError(null);
            await updateContract(contract.id, data, user.user_id);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating contract:', err);
            setError("Une erreur est survenue lors de la mise à jour du dossier.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={`Modifier le Dossier - ${contract.apartmentName}`}
            isOpen={isOpen}
            onClose={onClose}
        >
            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                        {error}
                    </div>
                )}

                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unité</p>
                    <h4 className="font-bold text-gray-800 text-base">{contract.apartmentName}</h4>
                    <p className="text-xs text-gray-500">Projet: {contract.projectName}</p>
                    {propertyCatalogPrice !== null && (
                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600">Prix catalogue propriété:</span>
                            <span className="text-xs font-bold text-emerald-700">{propertyCatalogPrice.toLocaleString()} DH</span>
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5 ml-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Valeur de la Transaction (DH)</label>
                        <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Lock className="w-3 h-3 mr-1" />
                            Fixé par la Propriété
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={propertyCatalogPrice !== null ? propertyCatalogPrice : amountDh}
                            readOnly
                            className={inputClasses + " bg-gray-100/80 cursor-not-allowed font-bold text-gray-800"}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                            DH
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Pour modifier le prix de ce bien, rendez-vous dans la section <strong>Propriétés</strong>.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date d'effet / Début</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            className={inputClasses}
                        />
                    </div>

                    {contract.type === 'rental' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Durée (Mois)</label>
                            <input
                                type="number"
                                value={durationMonths}
                                onChange={(e) => setDurationMonths(e.target.value)}
                                required
                                className={inputClasses}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes / Observations</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={inputClasses + " resize-none"}
                        placeholder="Détails supplémentaires..."
                    />
                </div>

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
                        disabled={submitting}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
