import React, { useState, useEffect, useRef } from 'react';
import { Apartment, Project, Client, Contract, Payment, ApartmentStatus, ContractStatus } from '../types';
import { CloseIcon, PrinterIcon, DownloadIcon, BuildingIcon, HomeIcon, FileTextIcon } from '../components/icons/Icons';
import { getContracts, getClients, getPayments } from '../services/api';

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface PropertyPdfModalProps {
    apartment: Apartment;
    project?: Project;
    onClose: () => void;
}

const LabeledField = ({ frLabel, value }: { frLabel: string, value: string | number | null | undefined }) => (
    <div className="relative flex items-end h-8 text-sm">
        <span className="bg-white pr-2 font-medium text-black">{frLabel}</span>
        <div className="flex-grow border-b border-dotted border-black text-center font-semibold text-black">
            <span className="bg-white px-2">{value !== undefined && value !== null ? value : ''}</span>
        </div>
    </div>
);

export const PropertyPdfModal: React.FC<PropertyPdfModalProps> = ({ apartment, project, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [activeContract, setActiveContract] = useState<Contract | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [contractPayments, setContractPayments] = useState<Payment[]>([]);
    const [propertyContracts, setPropertyContracts] = useState<Contract[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPropertyData = async () => {
            try {
                setLoading(true);
                const [allContracts, fetchedClients, fetchedPayments] = await Promise.all([
                    getContracts(),
                    getClients(),
                    getPayments()
                ]);

                setAllClients(fetchedClients);
                setAllPayments(fetchedPayments);

                // Find all contracts associated with this property
                const filteredContracts = allContracts.filter(c => c.apartment_id === apartment.id);
                setPropertyContracts(filteredContracts);

                // Find the default contract associated with this property
                let matchedContract = filteredContracts.find(c => c.id === apartment.current_contract_id);
                if (!matchedContract) {
                    // Try finding any active or pending contract for this property as backup
                    matchedContract = filteredContracts
                        .filter(c => c.status !== ContractStatus.Ended && c.status !== ContractStatus.Canceled)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                }

                // If still nothing, fallback to the most recent contract if any exist
                if (!matchedContract && filteredContracts.length > 0) {
                    matchedContract = [...filteredContracts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                }

                if (matchedContract) {
                    setActiveContract(matchedContract);
                    const matchedClient = fetchedClients.find(cl => cl.id === matchedContract.client_id);
                    if (matchedClient) {
                        setClient(matchedClient);
                    }
                    const matchedPayments = fetchedPayments.filter(p => p.contract_id === matchedContract.id);
                    setContractPayments(matchedPayments);
                } else {
                    setActiveContract(null);
                    setClient(null);
                    setContractPayments([]);
                }
            } catch (err: any) {
                console.error("Error fetching property dossier data:", err);
                setError("Impossible de charger le dossier financier.");
            } finally {
                setLoading(false);
            }
        };

        loadPropertyData();
    }, [apartment]);

    const handleContractChange = (contractId: string) => {
        const selected = propertyContracts.find(c => c.id === contractId);
        if (selected) {
            setActiveContract(selected);
            const matchedClient = allClients.find(cl => cl.id === selected.client_id);
            setClient(matchedClient || null);
            const matchedPayments = allPayments.filter(p => p.contract_id === selected.id);
            setContractPayments(matchedPayments);
        } else {
            setActiveContract(null);
            setClient(null);
            setContractPayments([]);
        }
    };

    const handleDownloadPdf = () => {
        const element = pdfRef.current;
        if (element && window.html2pdf) {
            const filename = `Fiche_${apartment.name.replace(/\s+/g, '_')}.pdf`;
            const opt = {
                margin:       15,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };
            window.html2pdf().from(element).set(opt).save();
        } else {
            console.error("html2pdf library not found. Printing instead.");
            window.print();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const totalPaid = contractPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount_dh, 0);

    const isOccupied = activeContract && client;
    const isRental = activeContract?.type === 'rental';
    const totalContractAmount = activeContract?.amount_dh || 0;
    const remainingAmount = Math.max(0, totalContractAmount - totalPaid);

    // Chronologically sort payments
    const sortedPayments = [...contractPayments]
        .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    // Compute running totals
    let runningTotal = 0;
    const paymentsWithRunningTotals = sortedPayments.map(p => {
        if (p.status === 'paid') {
            runningTotal += p.amount_dh;
        }
        const reliquat = Math.max(0, totalContractAmount - runningTotal);
        return {
            ...p,
            runningTotal,
            reliquat
        };
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            {/* Modal Box */}
            <div className="bg-slate-800 rounded-3xl w-full max-w-[230mm] shadow-2xl flex flex-col h-[90vh] text-white">
                
                {/* Header Actions */}
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-900/40 rounded-t-3xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                            <FileTextIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Fiche Technique & Dossier</h2>
                            <p className="text-xs text-slate-400">Générer, visualiser et exporter la fiche PDF</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all active:scale-95"
                            title="Imprimer"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Imprimer</span>
                        </button>
                        <button 
                            onClick={handleDownloadPdf}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all active:scale-95 shadow-lg shadow-green-900/20"
                            title="Télécharger PDF"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Télécharger PDF</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 hover:text-white transition-all active:scale-95"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Live Preview area */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-8 bg-slate-900/30 flex flex-col items-center justify-start">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
                            <p className="font-semibold text-sm">Chargement des détails de la propriété...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-red-400">
                            <p className="font-bold text-lg mb-2">Erreur</p>
                            <p className="text-sm text-slate-400">{error}</p>
                        </div>
                    ) : (
                        <>
                            {propertyContracts.length > 0 && (
                                <div className="mb-6 w-full max-w-[210mm] bg-slate-800 border border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center space-x-2.5">
                                        <span className="text-sm font-bold text-slate-300">Sélectionner le dossier client de cette propriété :</span>
                                        <span className="bg-green-500/10 text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                            {propertyContracts.length} dossier(s)
                                        </span>
                                    </div>
                                    <select
                                        value={activeContract?.id || ''}
                                        onChange={(e) => handleContractChange(e.target.value)}
                                        className="w-full sm:w-auto min-w-[280px] bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                                    >
                                        {propertyContracts.map(c => {
                                            const cl = allClients.find(cl => cl.id === c.client_id);
                                            const typeLabel = c.type === 'rental' ? 'Location' : 'Vente';
                                            const statusLabel = c.status === ContractStatus.Active ? 'En Cours' : c.status === ContractStatus.Ended ? 'Terminé' : c.status === ContractStatus.Canceled ? 'Annulé' : c.status;
                                            return (
                                                <option key={c.id} value={c.id}>
                                                    {cl?.full_name || 'Acquéreur'} - {typeLabel} ({statusLabel})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            {/* A4 Sheet Wrapper on screen (looks like paper sheet) */}
                            <div 
                                className="bg-white shadow-xl overflow-hidden rounded-md flex-shrink-0 text-black font-sans flex flex-col p-[15mm]" 
                                style={{ 
                                    fontFamily: "'Arial', sans-serif",
                                    width: '210mm', 
                                    minHeight: '297mm', 
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* Inner printable container referenced by pdfRef */}
                                <div 
                                    id="printable-property-sheet" 
                                    ref={pdfRef} 
                                    className="w-full text-black font-sans flex flex-col flex-grow" 
                                    style={{ 
                                        fontFamily: "'Arial', sans-serif",
                                        width: '180mm'
                                    }}
                                >
                                    {/* 1. HEADER BRANDING */}
                                    <header className="grid grid-cols-[auto_1fr_auto] items-center border-b-2 border-black pb-4">
                                        <div className="flex items-center space-x-2">
                                            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                            </svg>
                                            <div className="text-center border-r border-l border-black px-2 py-0.5">
                                                <h1 className="text-lg font-bold tracking-wider leading-none">NAFAT IMMO</h1>
                                                <p className="text-[8px] tracking-widest uppercase font-semibold text-gray-500">Real Estate</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center h-full px-4 text-black">
                                            <div className="w-px h-[30px] bg-black"></div>
                                            <div className="text-center text-[9px] px-4 leading-tight font-medium text-gray-700">
                                                <p>314 D, 2 éme étage</p>
                                                <p>Riad Salam - Agadir</p>
                                                <p>Tél.: 06.61.28.33.10</p>
                                            </div>
                                            <div className="w-px h-[30px] bg-black"></div>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-md font-bold uppercase tracking-tight text-gray-900">Fiche de Propriété</h2>
                                            <p className="text-[9px] font-mono mt-0.5 text-gray-500">Réf: {apartment.id.substring(0, 8).toUpperCase()}</p>
                                        </div>
                                    </header>

                                    {/* 2. SECTION: PROPERTY TECHNICAL DETAILS */}
                                    <section className="mt-6">
                                        <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-800">1. Caractéristiques de l'Unité</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs">
                                            <LabeledField frLabel="Désignation" value={apartment.name} />
                                            <LabeledField frLabel="Projet Immobilier" value={project?.project_name || 'N/A'} />
                                            
                                            <LabeledField frLabel="Type de Bien" value={apartment.type === 'apartment' ? 'Appartement' : 'Garage'} />
                                            <LabeledField frLabel="Étage" value={apartment.floor === 'RDC' ? 'Rez-de-chaussée (RDC)' : `Étage ${apartment.floor}`} />
                                            
                                            <LabeledField frLabel="Surface Habitable" value={`${apartment.surface_m2} m²`} />
                                            <LabeledField frLabel="Destination" value={apartment.intended_for === 'sale' ? 'Vente / À Vendre' : 'Location / À Louer'} />

                                            {apartment.type === 'apartment' && (
                                                <>
                                                    <LabeledField frLabel="Nombre de Pièces" value={apartment.rooms || 'N/A'} />
                                                    <LabeledField frLabel="Salles de Bain" value={apartment.bathroom || 'N/A'} />
                                                    <LabeledField frLabel="Cuisine Équipée" value={apartment.kitchen ? 'Oui' : 'Non'} />
                                                    <LabeledField frLabel="Balcon / Terrasse" value={apartment.balcony ? 'Oui' : 'Non'} />
                                                </>
                                            )}
                                            
                                            <LabeledField frLabel="Localisation / Adresse" value={project?.location || 'Agadir, Maroc'} />
                                            <LabeledField 
                                                frLabel={apartment.intended_for === 'sale' ? 'Prix de Vente' : 'Prix de Location'} 
                                                value={`${(apartment.intended_for === 'sale' ? (apartment.sale_price_dh || apartment.price_dh) : apartment.price_dh).toLocaleString('fr-FR')} DH`} 
                                            />
                                        </div>

                                        <div className="mt-2 text-[10px] text-gray-500 italic flex space-x-2">
                                            <span className="font-bold">Description:</span>
                                            <span>{apartment.description || 'Aucune description particulière enregistrée pour cette propriété.'}</span>
                                        </div>
                                    </section>

                                    {/* 3. STATUS DISPLAY */}
                                    <div className="mt-4 border border-dashed border-gray-300 p-3 flex justify-between items-center rounded-lg bg-gray-50">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs font-bold text-gray-700">Statut de Disponibilité:</span>
                                            <span className={`px-3 py-1 rounded text-xs font-extrabold uppercase tracking-widest border ${
                                                (apartment.status === ApartmentStatus.Available || apartment.status === ApartmentStatus.ForSale)
                                                    ? (apartment.intended_for === 'sale' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-green-100 text-green-700 border-green-200')
                                                    : (apartment.status === ApartmentStatus.Rented ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200')
                                            }`}>
                                                {apartment.status === ApartmentStatus.Rented ? 'Loué' : 
                                                 apartment.intended_for === 'sale' 
                                                    ? ((apartment.status === ApartmentStatus.Available || apartment.status === ApartmentStatus.ForSale) ? 'A VENDRE' : 'RESERVE')
                                                    : ((apartment.status === ApartmentStatus.Available || apartment.status === ApartmentStatus.ForSale) ? 'Disponible (Location)' : 'Vendu')}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-semibold text-gray-500">Mise à jour le: {new Date(apartment.updated_at || apartment.created_at).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    </div>

                                    {/* 4. SECTION: DOSSIER & OCCUPIER DETAILS (IF RESERVED/RENTED) */}
                                    {isOccupied ? (
                                        <>
                                            <section className="mt-6">
                                                <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800">2. Informations de l'Acquéreur ou Locataire</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs">
                                                    <LabeledField frLabel="Nom Complet" value={client?.full_name} />
                                                    <LabeledField frLabel="N° de Carte d'Identité (CIN)" value={client?.cin_number} />
                                                    
                                                    <LabeledField frLabel="Téléphone" value={client?.phone} />
                                                    <LabeledField frLabel="Adresse Email" value={client?.email || 'N/A'} />
                                                    
                                                    <LabeledField frLabel="Profession / Fonction" value={client?.occupation || 'N/A'} />
                                                    <LabeledField frLabel="Adresse Résidentielle" value={client?.address} />
                                                </div>
                                            </section>

                                            <section className="mt-6">
                                                <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800">3. Conditions du Contrat</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs">
                                                    <LabeledField frLabel="Contrat Référence" value={activeContract?.id.substring(activeContract.id.length - 8).toUpperCase()} />
                                                    <LabeledField frLabel="Type de Dossier" value={isRental ? 'Bail de Location' : 'Contrat de Réservation/Vente'} />
                                                    
                                                    <LabeledField frLabel="Date d'effet / Début" value={activeContract?.start_date ? new Date(activeContract.start_date).toLocaleDateString('fr-FR') : 'N/A'} />
                                                    <LabeledField frLabel="Date de Fin / Échéance" value={activeContract?.end_date ? new Date(activeContract.end_date).toLocaleDateString('fr-FR') : (isRental ? 'Indéterminé' : 'À la livraison')} />
                                                    
                                                    <LabeledField 
                                                        frLabel={isRental ? "Montant Loyer Mensuel" : "Montant Global de Vente"} 
                                                        value={`${totalContractAmount.toLocaleString('fr-FR')} DH`} 
                                                    />
                                                    <LabeledField frLabel="Statut du Contrat" value={activeContract?.status === ContractStatus.Active ? 'En Cours' : 'En attente de validation / Réservé'} />
                                                </div>
                                            </section>

                                            {/* 5. FINANCIAL STATUS & TRANSACTION UPDATES */}
                                            <section className="mt-6">
                                                <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-800">4. Suivi Financier & Historique de Paiements</span>
                                                </div>

                                                {/* Summary Cards of Payments */}
                                                <div className="grid grid-cols-3 gap-4 mt-3 text-center">
                                                    <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Montant Total Convenu</p>
                                                        <p className="text-sm font-extrabold text-gray-900 mt-1">{totalContractAmount.toLocaleString('fr-FR')} DH</p>
                                                    </div>
                                                    <div className="border border-green-300 rounded-lg p-2 bg-green-50/50">
                                                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Total Cumulé Payé</p>
                                                        <p className="text-sm font-extrabold text-green-800 mt-1">{totalPaid.toLocaleString('fr-FR')} DH</p>
                                                    </div>
                                                    <div className="border border-red-200 rounded-lg p-2 bg-red-50/30">
                                                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Reste à Régler</p>
                                                        <p className="text-sm font-extrabold text-red-800 mt-1">{remainingAmount.toLocaleString('fr-FR')} DH</p>
                                                    </div>
                                                </div>

                                                {/* Payments list table */}
                                                <div className="mt-4">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Mises à jour des versements enregistrés:</p>
                                                    {contractPayments.length === 0 ? (
                                                        <p className="text-xs text-gray-500 italic py-2 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">Aucun paiement ou dépôt n'a encore été enregistré pour ce dossier.</p>
                                                    ) : (
                                                        <table className="w-full text-xs text-left border border-gray-300">
                                                            <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 border-b border-gray-300">
                                                                <tr>
                                                                    <th className="px-3 py-2 border-r border-gray-300">Date</th>
                                                                    <th className="px-3 py-2 border-r border-gray-300">Description / Objet</th>
                                                                    <th className="px-3 py-2 border-r border-gray-300">Mode</th>
                                                                    <th className="px-3 py-2 border-r border-gray-300">Statut</th>
                                                                    <th className="px-3 py-2 border-r border-gray-300 text-right">Montant</th>
                                                                    <th className="px-3 py-2 border-r border-gray-300 text-right">Cumul Payé</th>
                                                                    <th className="px-3 py-2 text-right">Reste (Reliquat)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200">
                                                                {paymentsWithRunningTotals.map((p) => (
                                                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                                                        <td className="px-3 py-2 border-r border-gray-200 text-gray-600">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                                                                        <td className="px-3 py-2 border-r border-gray-200 font-medium">{p.payment_for}</td>
                                                                        <td className="px-3 py-2 border-r border-gray-200 capitalize text-gray-600">{p.payment_method === 'especes' ? 'Espèces' : p.payment_method === 'cheque' ? 'Chèque' : p.payment_method === 'virement' ? 'Virement' : 'Effet'}</td>
                                                                        <td className="px-3 py-2 border-r border-gray-200">
                                                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${
                                                                                p.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                                p.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                                                p.status === 'canceled' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700'
                                                                            }`}>
                                                                                {p.status === 'paid' ? 'Payé' : p.status === 'pending' ? 'En attente' : p.status === 'canceled' ? 'Annulé' : p.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-3 py-2 border-r border-gray-200 text-right font-bold text-gray-900">{p.amount_dh.toLocaleString('fr-FR')} DH</td>
                                                                        <td className="px-3 py-2 border-r border-gray-200 text-right font-bold text-green-700">{p.runningTotal.toLocaleString('fr-FR')} DH</td>
                                                                        <td className="px-3 py-2 text-right font-bold text-red-700">{p.reliquat.toLocaleString('fr-FR')} DH</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </section>
                                        </>
                                    ) : (
                                        /* IF PROPERTY IS FREE / AVAILABLE */
                                        <section className="mt-8 border border-dashed border-gray-300 p-6 rounded-xl bg-gray-50 text-center">
                                            <HomeIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                            <h3 className="text-sm font-bold text-gray-900">Aucun dossier ou contrat en cours</h3>
                                            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">Cette propriété est libre de tout engagement. Il n'y a aucun acquéreur ou locataire actif rattaché à cette unité.</p>
                                            <div className="mt-4 pt-4 border-t border-gray-200 max-w-sm mx-auto text-[10px] text-gray-400">
                                                <p>Pour lier un dossier ou un versement financier à cette unité, veuillez initier une nouvelle transaction (Vente ou Location) depuis l'onglet des Contrats.</p>
                                            </div>
                                        </section>
                                    )}

                                    {/* 6. SIGNATURE BLOCK */}
                                    <footer className="mt-auto pt-10 border-t border-gray-100 text-xs">
                                        <div className="grid grid-cols-2 text-center text-gray-700">
                                            <div>
                                                <p className="font-bold">L'Agent Commercial</p>
                                                <p className="text-[10px] text-gray-400 uppercase">Signature & Cachet</p>
                                                <div className="h-16 mt-2 border border-dashed border-gray-200 rounded-lg max-w-[200px] mx-auto bg-gray-50/50"></div>
                                            </div>
                                            <div>
                                                <p className="font-bold">La Direction NAFAT IMMO</p>
                                                <p className="text-[10px] text-gray-400 uppercase">Signature & Cachet</p>
                                                <div className="h-16 mt-2 border border-dashed border-gray-200 rounded-lg max-w-[200px] mx-auto bg-gray-50/50"></div>
                                            </div>
                                        </div>
                                        <div className="text-center text-[8px] text-gray-400 mt-8">
                                            <p>NAFAT IMMO S.A.R.L - Capital Social 100,000 DH - I.F 45903022 - Patente 3491290 - R.C 23091 Agadir</p>
                                            <p className="font-mono mt-0.5">Généré via le Système de Gestion NafatImmo le {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</p>
                                        </div>
                                    </footer>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer close */}
                <div className="px-6 py-4 border-t border-slate-700 flex justify-end bg-slate-900/40 rounded-b-3xl flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    >
                        Fermer la vue
                    </button>
                </div>

            </div>

            {/* Print Media Query styles (injected specifically for this component) */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* Hide everything except the print target */
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-property-sheet, #printable-property-sheet * {
                        visibility: visible !important;
                    }
                    
                    /* Position printable container absolutely at top-left of page */
                    #printable-property-sheet {
                        position: absolute !important;
                        left: 15mm !important;
                        top: 15mm !important;
                        width: 180mm !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        z-index: 999999 !important;
                    }
                    
                    /* Hide browser header and footer */
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                }
            `}} />
        </div>
    );
};
