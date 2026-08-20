import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Contract, Client, Apartment, Project, Payment, PaymentStatus } from '../types';
import { updateContract, updateApartment, updateClient } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { FileText, Building2, User, CheckCircle2, ShieldCheck, Tag, Sparkles, AlertCircle, Calendar, Edit3 } from 'lucide-react';

interface CreateFinalContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    client?: Client | null;
    apartment?: Apartment | null;
    project?: Project | null;
    payments?: Payment[];
    isEditing?: boolean;
    onSuccess: () => void;
}

export const CreateFinalContractModal: React.FC<CreateFinalContractModalProps> = ({
    isOpen,
    onClose,
    contract,
    client,
    apartment,
    project,
    payments = [],
    isEditing = false,
    onSuccess,
}) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [titre, setTitre] = useState('');
    const [contractDate, setContractDate] = useState('');
    const [notaryName, setNotaryName] = useState('');
    const [contractRef, setContractRef] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientCin, setClientCin] = useState('');
    const [clauses, setClauses] = useState('');
    const [notes, setNotes] = useState('');

    // Pre-populate fields whenever modal opens or contract/apartment changes
    useEffect(() => {
        if (contract && isOpen) {
            setError(null);
            
            // Titre foncier: check contract_titre first, then apartment.titre
            const initialTitre = contract.contract_titre || apartment?.titre || '';
            setTitre(initialTitre);

            // Contract Date: existing final_contract_date or today
            const today = new Date().toISOString().split('T')[0];
            setContractDate(contract.final_contract_date || contract.start_date || today);

            // Notary / Writer
            setNotaryName(contract.notary_name || 'Sous seing privé');

            // Reference
            const defaultRef = contract.final_contract_reference || (apartment ? `ACTE-${apartment.name.replace(/\s+/g, '')}-${new Date().getFullYear()}` : '');
            setContractRef(defaultRef);

            // Client Info
            setClientAddress(client?.address || '');
            setClientPhone(client?.phone || '');
            setClientCin(client?.cin_number || '');

            // Clauses & Notes
            setClauses(contract.final_contract_clauses || "Vente en toute propriété libre de toutes charges et hypothèques. Jouissance immédiate à compter de la signature.");
            setNotes(contract.notes || '');
        }
    }, [contract, client, apartment, isOpen]);

    if (!contract || !isOpen) return null;

    // Financial calculations
    const contractPayments = payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid);
    const totalPaid = contractPayments.reduce((sum, p) => sum + p.amount_dh, 0);
    const remaining = Math.max(0, contract.amount_dh - totalPaid);
    const percentPaid = contract.amount_dh > 0 ? Math.min(100, Math.round((totalPaid / contract.amount_dh) * 100)) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setSubmitting(true);
            setError(null);

            // 1. Update the Contract record with final contract details
            const contractDataToUpdate: Partial<Contract> = {
                final_contract_created: true,
                final_contract_date: contractDate,
                contract_titre: titre.trim(),
                notary_name: notaryName.trim(),
                final_contract_reference: contractRef.trim(),
                final_contract_clauses: clauses.trim(),
                notes: notes.trim(),
            };

            await updateContract(contract.id, contractDataToUpdate, user.id);

            // 2. If titre was provided and apartment exists, update apartment titre to keep it permanently synced
            if (apartment && titre.trim() && apartment.titre !== titre.trim()) {
                await updateApartment(apartment.id, { titre: titre.trim() }, user.id);
            }

            // 3. If client info was adjusted, update client
            if (client && (clientAddress.trim() !== client.address || clientPhone.trim() !== client.phone || clientCin.trim() !== client.cin_number)) {
                await updateClient(client.id, {
                    address: clientAddress.trim(),
                    phone: clientPhone.trim(),
                    cin_number: clientCin.trim(),
                }, user.id);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error creating/updating final contract:", err);
            setError(err?.message || "Une erreur est survenue lors de l'enregistrement de l'acte.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputClasses = "block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all font-medium";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Modifier l'Acte de Vente Définitif" : "Établir le Contrat de Vente Définitif"}
        >
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
                {error && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Banner Summary */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 border border-emerald-150 p-4 rounded-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                    {isEditing ? "Modification du Contrat de Vente" : "Création de l'Acte de Vente Officiel"}
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Client : <strong>{client?.full_name || 'Client'}</strong> • Bien : <strong>{apartment?.name} ({project?.project_name})</strong>
                                </p>
                            </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            {isEditing ? "Contrat Établi" : "Nouveau Contrat"}
                        </span>
                    </div>

                    {/* Financial snapshot */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-100/80 text-center">
                        <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prix Convenu</span>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800">{contract.amount_dh.toLocaleString()} DH</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Montant Réglé</span>
                            <span className="text-xs sm:text-sm font-extrabold text-emerald-700">{totalPaid.toLocaleString()} DH ({percentPaid}%)</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reliquat</span>
                            <span className={`text-xs sm:text-sm font-extrabold ${remaining <= 0 ? 'text-emerald-700' : 'text-amber-600'}`}>
                                {remaining <= 0 ? 'Soldé (0 DH)' : `${remaining.toLocaleString()} DH`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section 1: Titre Foncier (Highlighted) */}
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-amber-700" />
                            <label className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                                Titre Foncier de l'Appartement
                            </label>
                        </div>
                        {apartment?.titre && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                Récupéré de la Propriété
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-amber-800">
                        {apartment?.titre 
                            ? "Le titre foncier existant sur la propriété a été automatiquement affecté. Vous pouvez le confirmer ou le modifier."
                            : "Aucun titre n'est encore enregistré sur la propriété. Renseignez-le ici pour l'associer à ce contrat et à la fiche propriété."}
                    </p>
                    <input
                        type="text"
                        value={titre}
                        onChange={(e) => setTitre(e.target.value)}
                        placeholder="Ex: T 12345/56 ou Titre mère morcelé n° ..."
                        className="block w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-slate-900 text-sm font-bold placeholder-amber-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-xs"
                    />
                </div>

                {/* Section 2: Données de l'Acte de Vente */}
                <div className="space-y-4">
                    <h5 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Informations de l'Acte
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                Date de l'Acte de Vente *
                            </label>
                            <input
                                type="date"
                                required
                                value={contractDate}
                                onChange={(e) => setContractDate(e.target.value)}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                Rédacteur / Étude Notariale
                            </label>
                            <input
                                type="text"
                                value={notaryName}
                                onChange={(e) => setNotaryName(e.target.value)}
                                placeholder="Ex: Sous seing privé ou Maître ..."
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Numéro / Référence de l'Acte
                        </label>
                        <input
                            type="text"
                            value={contractRef}
                            onChange={(e) => setContractRef(e.target.value)}
                            placeholder="Ex: ACTE-GH1-APP101-2026"
                            className={inputClasses}
                        />
                    </div>
                </div>

                {/* Section 3: Informations Acquéreur (Vérification / Complétion) */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h5 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Données Acquéreur (Portées sur l'acte)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                CIN / Passeport
                            </label>
                            <input
                                type="text"
                                value={clientCin}
                                onChange={(e) => setClientCin(e.target.value)}
                                className={inputClasses}
                                placeholder="Ex: K123456"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Téléphone
                            </label>
                            <input
                                type="text"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className={inputClasses}
                                placeholder="Ex: 06 12 34 56 78"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Adresse de Résidence
                        </label>
                        <input
                            type="text"
                            value={clientAddress}
                            onChange={(e) => setClientAddress(e.target.value)}
                            className={inputClasses}
                            placeholder="Adresse complète du client"
                        />
                    </div>
                </div>

                {/* Section 4: Clauses & Remarques */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Dispositions & Clauses Particulières
                        </label>
                        <textarea
                            rows={2}
                            value={clauses}
                            onChange={(e) => setClauses(e.target.value)}
                            placeholder="Clauses spécifiques, modalités de jouissance, etc."
                            className={inputClasses}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Observations / Remarques Internes
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes internes pour le suivi administratif..."
                            className={inputClasses}
                        />
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all space-x-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>{isEditing ? "Enregistrer les Modifications" : "Créer et Valider le Contrat"}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateFinalContractModal;
