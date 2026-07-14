import React, { useState, useEffect, useRef } from 'react';
import { Apartment, Project, Client, Contract, Payment, ApartmentStatus, ContractStatus } from '../types';
import { CloseIcon, PrinterIcon, DownloadIcon, FileTextIcon } from '../components/icons/Icons';
import { getContracts, getClients, getPayments } from '../services/api';

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface AllPropertiesPdfModalProps {
    selectedApartments: Apartment[];
    projects: Project[];
    onClose: () => void;
}

export const AllPropertiesPdfModal: React.FC<AllPropertiesPdfModalProps> = ({ 
    selectedApartments, 
    projects, 
    onClose 
}) => {
    const [loading, setLoading] = useState(true);
    const [allContracts, setAllContracts] = useState<Contract[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                setLoading(true);
                const [contractsData, clientsData, paymentsData] = await Promise.all([
                    getContracts(),
                    getClients(),
                    getPayments()
                ]);
                setAllContracts(contractsData);
                setAllClients(clientsData);
                setAllPayments(paymentsData);
            } catch (err: any) {
                console.error("Error loading data for multi-fiche PDF:", err);
                setError("Impossible de charger les dossiers pour la génération collective.");
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, []);

    const handleDownloadPdf = () => {
        const element = pdfRef.current;
        if (element && window.html2pdf) {
            const filename = `Catalogue_Fiches_Techniques_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '_')}.pdf`;
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

    // Helper to get contract and client details for an apartment
    const getApartmentDetails = (apt: Apartment) => {
        const matchedProject = projects.find(p => p.id === apt.project_id);
        
        let matchedContract = allContracts.find(c => c.id === apt.current_contract_id);
        if (!matchedContract) {
            matchedContract = allContracts
                .filter(c => c.apartment_id === apt.id && c.status !== ContractStatus.Ended && c.status !== ContractStatus.Canceled)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        }

        let clientName = 'N/A (Libre)';
        let contractRef = 'N/A';
        let totalContractAmount = 0;
        let totalPaid = 0;
        let remainingAmount = 0;

        if (matchedContract) {
            const matchedClient = allClients.find(cl => cl.id === matchedContract.client_id);
            if (matchedClient) {
                clientName = matchedClient.full_name;
            }
            contractRef = matchedContract.id.substring(matchedContract.id.length - 8).toUpperCase();
            totalContractAmount = matchedContract.amount_dh || 0;
            
            const matchedPayments = allPayments.filter(p => p.contract_id === matchedContract.id && p.status === 'paid');
            totalPaid = matchedPayments.reduce((sum, p) => sum + p.amount_dh, 0);
            remainingAmount = Math.max(0, totalContractAmount - totalPaid);
        }

        return {
            project_name: matchedProject?.project_name || 'N/A',
            clientName,
            contractRef,
            totalContractAmount,
            totalPaid,
            remainingAmount,
            hasContract: !!matchedContract,
            contractType: matchedContract?.type === 'rental' ? 'Location' : 'Vente'
        };
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-3xl w-full max-w-[230mm] shadow-2xl flex flex-col h-[90vh] text-white">
                
                {/* Header Actions */}
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-900/40 rounded-t-3xl">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                            <FileTextIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Fiche Multiple ({selectedApartments.length} Unités)</h2>
                            <p className="text-xs text-slate-400">Générer un catalogue complet des fiches d'informations</p>
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

                {/* Live Preview Scroll Area */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-8 bg-slate-900/30 flex flex-col items-center justify-start">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
                            <p className="font-semibold text-sm">Chargement des dossiers et contrats...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-red-400">
                            <p className="font-bold text-lg mb-2">Erreur</p>
                            <p className="text-sm text-slate-400">{error}</p>
                        </div>
                    ) : (
                        /* A4 Sheet Wrapper on screen */
                        <div 
                            className="bg-white shadow-xl overflow-hidden rounded-md flex-shrink-0 text-black font-sans flex flex-col p-[15mm]" 
                            style={{ 
                                fontFamily: "'Arial', sans-serif",
                                width: '210mm', 
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Inner printable container referenced by pdfRef */}
                            <div 
                                id="printable-multi-property-sheet" 
                                ref={pdfRef} 
                                className="w-full text-black font-sans flex flex-col flex-grow" 
                                style={{ 
                                    fontFamily: "'Arial', sans-serif",
                                    width: '180mm'
                                }}
                            >
                                {/* Header Branding for Catalogue */}
                                <header className="grid grid-cols-[auto_1fr_auto] items-center border-b-2 border-black pb-4 mb-6">
                                    <div className="flex items-center space-x-2">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                        </svg>
                                        <div className="text-center border-r border-l border-black px-2 py-0.5">
                                            <h1 className="text-sm font-bold tracking-wider leading-none">NAFAT IMMO</h1>
                                            <p className="text-[7px] tracking-widest uppercase font-semibold text-gray-500">Real Estate</p>
                                        </div>
                                    </div>
                                    <div className="text-center text-[9px] px-4 font-medium text-gray-700">
                                        <p className="font-bold">FICHE TECHNIQUE COLLECTIVE ET RECAPITULATIF DES BIENS</p>
                                        <p className="text-[8px] text-gray-500">Document de synthèse généré le {new Date().toLocaleDateString('fr-FR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-mono text-gray-500">Total: {selectedApartments.length} Unités</p>
                                    </div>
                                </header>

                                {/* Sequential list of Apartments styled with a clean grid table like the user's reference */}
                                <div className="space-y-10">
                                    {selectedApartments.map((apt, index) => {
                                        const details = getApartmentDetails(apt);
                                        return (
                                            <div key={apt.id} className="page-break-avoid flex flex-col border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
                                                {/* Header with Title */}
                                                <div className="flex justify-between items-baseline mb-3">
                                                    <h3 className="text-md font-extrabold text-black uppercase tracking-tight">
                                                        {index + 1}. {apt.name}
                                                    </h3>
                                                    <span className="text-[9px] font-mono text-gray-400">Réf: {apt.id.substring(0, 8).toUpperCase()}</span>
                                                </div>

                                                {/* Structured Table Grid representing the "INFO" image reference */}
                                                <div className="border border-black grid grid-cols-4 text-xs">
                                                    {/* Row 1 */}
                                                    <div className="border-r border-b border-black p-2 bg-gray-50">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Désignation</p>
                                                        <p className="font-bold text-gray-900 mt-0.5">{apt.name}</p>
                                                    </div>
                                                    <div className="border-r border-b border-black p-2">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Type</p>
                                                        <p className="font-semibold text-gray-800 mt-0.5">{apt.type === 'apartment' ? 'Appartement' : 'Garage'}</p>
                                                    </div>
                                                    <div className="border-r border-b border-black p-2 bg-gray-50">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Étage</p>
                                                        <p className="font-semibold text-gray-800 mt-0.5">{apt.floor === 'RDC' ? 'RDC' : `Étage ${apt.floor}`}</p>
                                                    </div>
                                                    <div className="border-b border-black p-2">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Surface</p>
                                                        <p className="font-bold text-gray-900 mt-0.5">{apt.surface_m2} m²</p>
                                                    </div>

                                                    {/* Row 2 */}
                                                    <div className="border-r border-b border-black p-2">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Projet</p>
                                                        <p className="font-semibold text-gray-800 mt-0.5 truncate">{details.project_name}</p>
                                                    </div>
                                                    <div className="border-r border-b border-black p-2 bg-gray-50">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Usage</p>
                                                        <p className="font-semibold text-gray-800 mt-0.5">{apt.intended_for === 'sale' ? 'Vente / À Vendre' : 'Location / À Louer'}</p>
                                                    </div>
                                                    <div className="border-r border-b border-black p-2">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Prix de base</p>
                                                        <p className="font-bold text-green-800 mt-0.5">
                                                            {(apt.intended_for === 'sale' ? (apt.sale_price_dh || apt.price_dh) : apt.price_dh).toLocaleString('fr-FR')} DH
                                                        </p>
                                                    </div>
                                                    <div className="border-b border-black p-2 bg-gray-50">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Statut</p>
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase mt-0.5 border ${
                                                            (apt.status === ApartmentStatus.Available || apt.status === ApartmentStatus.ForSale)
                                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                                : (apt.status === ApartmentStatus.Rented ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200')
                                                        }`}>
                                                            {apt.status === ApartmentStatus.Rented ? 'Loué' : 
                                                             apt.status === ApartmentStatus.Sold ? 'Vendu' :
                                                             (apt.status === ApartmentStatus.Available || apt.status === ApartmentStatus.ForSale) ? 'Disponible' : 'Réservé'}
                                                        </span>
                                                    </div>

                                                    {/* Row 3 */}
                                                    <div className="border-r border-black p-2 bg-gray-50">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Contrat</p>
                                                        <p className="font-semibold text-gray-800 mt-0.5">{details.contractRef}</p>
                                                    </div>
                                                    <div className="border-r border-black p-2">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Acquéreur / Locataire</p>
                                                        <p className="font-semibold text-gray-800 mt-0.5 truncate">{details.clientName}</p>
                                                    </div>
                                                    <div className="border-r border-black p-2 bg-gray-50">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Total Payé</p>
                                                        <p className="font-bold text-green-700 mt-0.5">{details.totalPaid.toLocaleString('fr-FR')} DH</p>
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase">Reste (Reliquat)</p>
                                                        <p className="font-bold text-red-700 mt-0.5">{details.remainingAmount.toLocaleString('fr-FR')} DH</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Signature panel */}
                                <footer className="mt-12 pt-6 border-t border-gray-200 text-xs">
                                    <div className="grid grid-cols-2 text-center text-gray-700">
                                        <div>
                                            <p className="font-bold">L'Agent Commercial</p>
                                            <div className="h-12 mt-1 border border-dashed border-gray-200 rounded-lg max-w-[150px] mx-auto bg-gray-50"></div>
                                        </div>
                                        <div>
                                            <p className="font-bold">La Direction NAFAT IMMO</p>
                                            <div className="h-12 mt-1 border border-dashed border-gray-200 rounded-lg max-w-[150px] mx-auto bg-gray-50"></div>
                                        </div>
                                    </div>
                                    <div className="text-center text-[7px] text-gray-400 mt-6">
                                        <p>NAFAT IMMO S.A.R.L - Agadir - Tél: 06.61.28.33.10</p>
                                        <p className="font-mono mt-0.5">Généré collectivement le {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</p>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-700 flex justify-end bg-slate-900/40 rounded-b-3xl flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    >
                        Fermer la vue
                    </button>
                </div>

            </div>

            {/* Print Media Query styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-multi-property-sheet, #printable-multi-property-sheet * {
                        visibility: visible !important;
                    }
                    #printable-multi-property-sheet {
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
                    .page-break-avoid {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                }
            `}} />
        </div>
    );
};
