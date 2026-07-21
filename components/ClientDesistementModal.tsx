import React, { useState, useEffect } from 'react';
import { cancelContract } from '../services/api';
import { Contract } from '../types';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ClientDesistementModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: any; // Detailed contract object with totalPaid and remainingAmount
    onSuccess: () => void;
}

const inputClasses = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-semibold text-gray-900";

export const ClientDesistementModal: React.FC<ClientDesistementModalProps> = ({ isOpen, onClose, contract, onSuccess }) => {
    const { user } = useAuth();
    const [cancelReason, setCancelReason] = useState<string>('');
    const [refundStatus, setRefundStatus] = useState<'none' | 'total' | 'partial'>('none');
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [refundNotes, setRefundNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalPaid = contract?.totalPaid || 0;

    useEffect(() => {
        if (isOpen) {
            setCancelReason('');
            setRefundStatus('none');
            setRefundAmount(0);
            setRefundNotes('');
            setError(null);
        }
    }, [isOpen]);

    if (!contract) return null;

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour effectuer cette action.");
            return;
        }

        if (!cancelReason.trim()) {
            setError("Veuillez saisir un motif pour le désistement.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            
            // Call cancelContract with all details
            await cancelContract(
                contract,
                user.user_id,
                cancelReason,
                refundStatus,
                refundAmount,
                refundNotes
            );

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error desisting contract:', err);
            setError("Une erreur est survenue lors de l'enregistrement du désistement.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal 
            title="Désistement / Annulation du Dossier" 
            isOpen={isOpen} 
            onClose={onClose}
        >
            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                        {error}
                    </div>
                )}

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-gray-600 space-y-1.5">
                    <div className="font-bold text-gray-800 text-sm mb-1.5 flex items-center justify-between">
                        <span>Dossier à annuler :</span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-extrabold uppercase text-[9px]">{contract.type === 'rental' ? 'Location' : 'Vente'}</span>
                    </div>
                    <div><span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Propriété:</span> <span className="font-extrabold text-gray-800 text-xs">{contract.apartmentName} ({contract.projectName})</span></div>
                    <div><span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Valeur Dossier:</span> <span className="font-extrabold text-gray-800 text-xs">{contract.amount_dh.toLocaleString()} DH</span></div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">Total encaissé à ce jour:</span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-extrabold text-xs">{totalPaid.toLocaleString()} DH</span>
                    </div>
                </div>

                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-800 leading-relaxed font-semibold">
                        Cette action annulera définitivement le dossier, libérera la propriété, et classera ce dossier dans l'archive <span className="font-extrabold underline">Désistements</span>. Le client pourra ensuite faire une nouvelle réservation s'il le souhaite.
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Motif du désistement <span className="text-red-500">*</span></label>
                    <textarea 
                        value={cancelReason} 
                        onChange={(e) => setCancelReason(e.target.value)} 
                        rows={2} 
                        required
                        className={inputClasses + " resize-none"}
                        placeholder="Ex: Changement d'avis, problème de financement, etc."
                    />
                </div>

                {/* REFUND OPTIONS */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Traitement des avances encaissées ({totalPaid.toLocaleString()} DH)</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setRefundStatus('none');
                                setRefundAmount(0);
                            }}
                            className={`px-2 py-2 rounded-xl font-bold text-center text-xs border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
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
                                setRefundAmount(totalPaid);
                            }}
                            className={`px-2 py-2 rounded-xl font-bold text-center text-xs border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                refundStatus === 'total'
                                    ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500/20'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span className="font-extrabold uppercase">Total</span>
                            <span className="text-[9px] opacity-75">{totalPaid.toLocaleString()} DH</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRefundStatus('partial');
                                setRefundAmount(0);
                            }}
                            className={`px-2 py-2 rounded-xl font-bold text-center text-xs border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                refundStatus === 'partial'
                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700 ring-2 ring-yellow-500/20'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span className="font-extrabold uppercase">Partiel</span>
                            <span className="text-[9px] opacity-75">Libre</span>
                        </button>
                    </div>

                    {refundStatus !== 'none' && (
                        <div className="pt-3 space-y-3 border-t border-gray-200 animate-fade-in">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Montant à rembourser (DH)</label>
                                <input
                                    type="number"
                                    disabled={refundStatus === 'total'}
                                    value={refundAmount || ''}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (val > totalPaid) {
                                            setRefundAmount(totalPaid);
                                        } else {
                                            setRefundAmount(val);
                                        }
                                    }}
                                    max={totalPaid}
                                    min={0}
                                    placeholder="Montant en DH"
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Notes de remboursement</label>
                                <input
                                    type="text"
                                    value={refundNotes}
                                    onChange={(e) => setRefundNotes(e.target.value)}
                                    placeholder="Ex: Remboursé par chèque N°..."
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                    )}
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
                        className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {submitting ? 'Validation...' : 'Valider le Désistement'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
