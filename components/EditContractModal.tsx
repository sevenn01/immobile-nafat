import React, { useState, useEffect } from 'react';
import { updateContract } from '../services/api';
import { Contract } from '../types';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';

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
    const [startDate, setStartDate] = useState<string>('');
    const [durationMonths, setDurationMonths] = useState<string>('12');
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (contract) {
            setAmountDh(String(contract.amount_dh));
            setStartDate(contract.start_date || '');
            setDurationMonths(String(contract.duration_months || 12));
            setNotes(contract.notes || '');
            setError(null);
        }
    }, [contract]);

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
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valeur de la Transaction (DH)</label>
                    <input
                        type="number"
                        value={amountDh}
                        onChange={(e) => setAmountDh(e.target.value)}
                        required
                        className={inputClasses}
                    />
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
