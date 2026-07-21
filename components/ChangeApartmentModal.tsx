import React, { useState, useEffect } from 'react';
import { getApartments, getProjects, changeContractApartment } from '../services/api';
import { Contract, Apartment, Project, ApartmentStatus } from '../types';
import Modal from './Modal';
import { useAuth } from '../auth/AuthContext';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface ChangeApartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: any; // Detailed contract object from ClientDetailsPage
    onSuccess: () => void;
}

const inputClasses = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-semibold text-gray-900";

export const ChangeApartmentModal: React.FC<ChangeApartmentModalProps> = ({ isOpen, onClose, contract, onSuccess }) => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
    const [transactionPrice, setTransactionPrice] = useState<number>(0);

    useEffect(() => {
        if (isOpen && contract) {
            const loadData = async () => {
                try {
                    setLoading(true);
                    const [projs, apts] = await Promise.all([getProjects(), getApartments()]);
                    setProjects(projs);
                    setApartments(apts);
                    
                    // Default project to the contract's project
                    setSelectedProjectId(contract.project_id || (projs.length > 0 ? projs[0].id : ''));
                } catch (err) {
                    console.error('Error fetching data for ChangeApartmentModal:', err);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }
    }, [isOpen, contract]);

    // Reset apartment selection when project changes
    useEffect(() => {
        setSelectedApartmentId('');
    }, [selectedProjectId]);

    // Update transaction price when new apartment is selected
    useEffect(() => {
        if (selectedApartmentId && apartments.length > 0) {
            const apt = apartments.find(a => a.id === selectedApartmentId);
            if (apt) {
                setTransactionPrice(apt.sale_price_dh || apt.price_dh || 0);
            }
        } else {
            setTransactionPrice(0);
        }
    }, [selectedApartmentId, apartments]);

    // Filter available apartments for selected project
    // It should also match the contract type (rental or sale)
    const availableApartments = apartments.filter(a => 
        a.project_id === selectedProjectId && 
        (a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale) &&
        a.intended_for === contract.type
    );

    const sortedAvailableApartments = [...availableApartments].sort((a, b) => {
        const floorA = parseInt(a.floor || '0', 10);
        const floorB = parseInt(b.floor || '0', 10);
        if (floorA !== floorB) {
            return floorA - floorB;
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            setError("Vous devez être connecté pour effectuer cette action.");
            return;
        }

        if (!selectedApartmentId) {
            setError("Veuillez sélectionner un nouvel appartement.");
            return;
        }

        if (transactionPrice <= 0) {
            setError("Veuillez saisir un prix de transaction valide.");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await changeContractApartment(contract.id, selectedApartmentId, transactionPrice, user.user_id);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error changing contract apartment:', err);
            setError(err.message || "Une erreur est survenue lors du changement d'appartement.");
        } finally {
            setSubmitting(false);
        }
    };

    const activeNewApt = apartments.find(a => a.id === selectedApartmentId);
    
    // Calculations
    const totalPaid = contract?.totalPaid || 0;
    const newRemaining = Math.max(0, transactionPrice - totalPaid);
    const originalPrice = contract?.amount_dh || 0;
    const priceDifference = transactionPrice - originalPrice;

    return (
        <Modal 
            title="Changer d'Appartement (1er versement maximum)" 
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

                    {/* CURRENT APARTMENT INFO */}
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unité Actuelle</span>
                            <div className="font-bold text-slate-800 text-sm">{contract.apartmentName}</div>
                            <div className="text-xs text-slate-500">Projet: {contract.projectName} • Type: <span className="font-bold text-indigo-600 uppercase text-[10px]">{contract.type === 'rental' ? 'Location' : 'Vente'}</span></div>
                        </div>
                        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prix original contracté</span>
                            <div className="font-extrabold text-slate-800 text-sm">{originalPrice.toLocaleString()} DH</div>
                            <div className="text-[10px] text-green-600 font-bold">Déjà encaissé: {totalPaid.toLocaleString()} DH</div>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 leading-relaxed font-semibold">
                            Cette action libérera automatiquement l'unité <span className="font-extrabold">{contract.apartmentName}</span> pour la rendre disponible à la vente/location, et affectera le dossier actuel à la nouvelle unité sélectionnée.
                        </div>
                    </div>

                    {/* SELECTION GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Projet de destination</label>
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
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nouvelle Unité Libre</label>
                            <select 
                                value={selectedApartmentId} 
                                onChange={(e) => setSelectedApartmentId(e.target.value)} 
                                required
                                className={inputClasses}
                            >
                                <option value="">Choisir une nouvelle unité</option>
                                {sortedAvailableApartments.map(a => {
                                    const price = a.sale_price_dh || a.price_dh || 0;
                                    return (
                                        <option key={a.id} value={a.id}>
                                            {a.name} (Étage {a.floor} • {price.toLocaleString()} DH)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    {/* DYNAMIC CALCULATIONS & PRICE ADJUSTMENT */}
                    {selectedApartmentId && activeNewApt && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 bg-green-50/50 border border-green-100 rounded-2xl space-y-3">
                                <div>
                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Nouvelle affectation sélectionnée</span>
                                    <div className="font-extrabold text-green-900 text-sm">{activeNewApt.name}</div>
                                    <div className="text-xs text-green-700 font-semibold">Prix catalogue: {(activeNewApt.sale_price_dh || activeNewApt.price_dh || 0).toLocaleString()} DH</div>
                                </div>

                                <div className="pt-2 border-t border-green-100">
                                    <label className="block text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5">Nouveau Prix Final de la Transaction (DH)</label>
                                    <input 
                                        type="number"
                                        value={transactionPrice || ''}
                                        onChange={(e) => setTransactionPrice(Number(e.target.value))}
                                        required
                                        className="w-full px-4 py-2 bg-white border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm font-bold text-green-900"
                                        placeholder="Saisissez le prix final"
                                    />
                                    <p className="text-[10px] text-green-600 mt-1 font-medium">Vous pouvez adapter ce prix négocié si nécessaire.</p>
                                </div>
                            </div>

                            {/* FINANCIAL COMPARISON SUMMARY */}
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Simulation financière</span>
                                
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="p-2 bg-white rounded-xl border border-slate-100">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Nouveau Prix</div>
                                        <div className="font-bold text-slate-800 text-xs mt-1">{transactionPrice.toLocaleString()} DH</div>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl border border-slate-100">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Déjà versé (1er)</div>
                                        <div className="font-bold text-green-600 text-xs mt-1">{totalPaid.toLocaleString()} DH</div>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl border border-slate-100">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Nouveau Reliquat</div>
                                        <div className="font-extrabold text-indigo-600 text-xs mt-1">{newRemaining.toLocaleString()} DH</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-1">
                                    <span className="font-semibold text-slate-500">Variation de prix :</span>
                                    {priceDifference === 0 ? (
                                        <span className="font-bold text-slate-600">Aucune différence (Même prix)</span>
                                    ) : priceDifference > 0 ? (
                                        <span className="font-bold text-amber-600 flex items-center">
                                            <TrendingUp className="w-3.5 h-3.5 mr-1 shrink-0" />
                                            +{priceDifference.toLocaleString()} DH (Augmentation)
                                        </span>
                                    ) : (
                                        <span className="font-bold text-green-600 flex items-center">
                                            <TrendingDown className="w-3.5 h-3.5 mr-1 shrink-0" />
                                            {priceDifference.toLocaleString()} DH (Diminution)
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 text-[11px] text-slate-400 justify-center bg-slate-100/50 p-2 rounded-lg font-medium">
                                    <span>{contract.apartmentName} ({originalPrice.toLocaleString()} DH)</span>
                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                    <span className="font-bold text-slate-600">{activeNewApt.name} ({transactionPrice.toLocaleString()} DH)</span>
                                </div>
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
                            disabled={submitting || !selectedApartmentId || transactionPrice <= 0}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {submitting ? 'Modification...' : 'Valider le changement'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
