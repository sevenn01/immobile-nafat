import React, { useState, useEffect, useRef } from 'react';
import { Client, Contract, Apartment, Payment, ContractStatus, PaymentStatus } from '../types';
import { CloseIcon, PrinterIcon, DownloadIcon, FileTextIcon, CoinsIcon } from '../components/icons/Icons';
import { getContracts, getApartments, getPayments } from '../services/api';

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface ClientPdfModalProps {
    client: Client;
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

export const ClientPdfModal: React.FC<ClientPdfModalProps> = ({ client, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadClientData = async () => {
            try {
                setLoading(true);
                const [allContracts, allApartments, allPayments] = await Promise.all([
                    getContracts(),
                    getApartments(),
                    getPayments()
                ]);

                // Filter data for this client
                const clientContracts = allContracts.filter(c => c.client_id === client.id);
                const clientPayments = allPayments.filter(p => p.client_id === client.id);

                setContracts(clientContracts);
                setApartments(allApartments);
                setPayments(clientPayments);
            } catch (err: any) {
                console.error("Error fetching client PDF data:", err);
                setError("Impossible de charger le dossier financier.");
            } finally {
                setLoading(false);
            }
        };

        loadClientData();
    }, [client]);

    const handleDownloadPdf = () => {
        const element = pdfRef.current;
        if (element && window.html2pdf) {
            const filename = `Fiche_Client_${client.full_name.replace(/\s+/g, '_')}.pdf`;
            const opt = {
                margin:       15,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Temporarily add a class to body to isolate print styles if needed
            document.body.classList.add('generating-pdf');
            
            window.html2pdf().from(element).set(opt).save().then(() => {
                document.body.classList.remove('generating-pdf');
            }).catch((err: any) => {
                console.error("PDF generation failed:", err);
                document.body.classList.remove('generating-pdf');
            });
        } else {
            alert("html2pdf n'est pas chargé. Veuillez patienter ou recharger.");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculations
    const activeContractsList = contracts.filter(c => c.status !== ContractStatus.Canceled && c.status !== ContractStatus.SaleCanceled && c.status !== ContractStatus.Ended);
    
    // Total contract values
    const totalContractAmount = activeContractsList.reduce((sum, c) => sum + c.amount_dh, 0);
    
    // Payments that are validated (paid)
    const paidPayments = payments.filter(p => p.status === 'paid');
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount_dh, 0);
    const remainingAmount = Math.max(0, totalContractAmount - totalPaid);

    // Chronologically sort payments
    const sortedPayments = [...payments]
        .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    // Compute running totals for payments list
    let runningTotal = 0;
    const paymentsWithRunningTotals = sortedPayments.map(p => {
        const apt = apartments.find(a => a.id === p.contract_id || a.id === (contracts.find(c => c.id === p.contract_id)?.apartment_id));
        if (p.status === 'paid') {
            runningTotal += p.amount_dh;
        }
        const reliquat = Math.max(0, totalContractAmount - runningTotal);
        return {
            ...p,
            apartmentName: apt?.name || 'Unité',
            runningTotal,
            reliquat
        };
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            {/* Modal Box */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-up">
                
                {/* Header Actions */}
                <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <FileTextIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Fiche Synthèse Client</h3>
                            <p className="text-xs text-slate-400">Générez un dossier de suivi technique &amp; financier au format A4</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={handlePrint}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition duration-150 flex items-center space-x-1 text-sm font-semibold"
                            title="Imprimer directement"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Imprimer</span>
                        </button>
                        <button 
                            onClick={handleDownloadPdf}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition duration-150 flex items-center space-x-1 text-sm font-semibold shadow-lg shadow-green-600/20"
                            title="Télécharger le fichier PDF"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Télécharger PDF</span>
                        </button>
                        <div className="w-px h-6 bg-slate-800 mx-2"></div>
                        <button 
                            onClick={onClose}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition duration-150"
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
                            <p className="text-sm font-bold italic animate-pulse">Calcul des reliquats et compilation du dossier...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-red-500">
                            <p className="font-bold text-lg mb-2">Erreur de chargement</p>
                            <p className="text-sm text-slate-400">{error}</p>
                        </div>
                    ) : (
                        /* A4 Sheet Wrapper on screen (looks like paper sheet) */
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
                                id="printable-client-sheet" 
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
                                        <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                        </svg>
                                        <div className="text-center border-r border-l border-black px-3 py-1">
                                            <h1 className="text-md font-extrabold tracking-wider leading-none">NAFAT IMMO</h1>
                                            <p className="text-[8px] tracking-widest uppercase font-bold text-gray-500">Real Estate Developer</p>
                                        </div>
                                    </div>
                                    <div className="text-center text-[9px] px-4 font-medium text-gray-700">
                                        <p className="font-bold">NAFAT IMMO - Agadir - Maroc</p>
                                        <p>Direction Commerciale &amp; Financière</p>
                                        <p className="text-[8px]">Tél: 06.61.28.33.10 / Email: nafatimmo@gmail.com</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-md font-bold uppercase tracking-tight text-gray-900">Fiche de Compte Client</h2>
                                        <p className="text-[9px] font-mono mt-0.5 text-gray-500">Réf: CL-{client.id.substring(0, 8).toUpperCase()}</p>
                                    </div>
                                </header>

                                {/* 2. SECTION: CLIENT DETAILS */}
                                <section className="mt-6">
                                    <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800">1. État Civil &amp; Coordonnées du Client</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2 text-xs">
                                        <LabeledField frLabel="Nom Complet" value={client.full_name} />
                                        <LabeledField frLabel="N° de Carte d'Identité (CIN)" value={client.cin_number} />
                                        
                                        <LabeledField frLabel="Téléphone" value={client.phone} />
                                        <LabeledField frLabel="Adresse Email" value={client.email || 'N/A'} />
                                        
                                        <LabeledField frLabel="Profession / Fonction" value={client.occupation || 'N/A'} />
                                        <LabeledField frLabel="Adresse Résidentielle" value={client.address || 'N/A'} />
                                    </div>
                                </section>

                                {/* 3. SECTION: ACTIVE CONTRACTS */}
                                <section className="mt-6">
                                    <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800">2. Résumé des Dossiers &amp; Engagements</span>
                                    </div>
                                    {activeContractsList.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic py-3 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50 mt-2">Aucun contrat actif ou dossier en cours enregistré pour ce client.</p>
                                    ) : (
                                        <div className="mt-2 overflow-x-auto">
                                            <table className="w-full text-xs text-left border border-gray-300">
                                                <thead className="bg-gray-50 font-bold text-gray-600 border-b border-gray-300">
                                                    <tr>
                                                        <th className="px-3 py-2 border-r border-gray-300">Réf Contrat</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Propriété / Unité</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Type de Dossier</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Date d'Effet</th>
                                                        <th className="px-3 py-2 text-right">Montant Global</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {activeContractsList.map(c => {
                                                        const apt = apartments.find(a => a.id === c.apartment_id);
                                                        return (
                                                            <tr key={c.id} className="hover:bg-gray-50/50">
                                                                <td className="px-3 py-2 border-r border-gray-200 font-mono text-gray-600">{c.id.substring(c.id.length - 8).toUpperCase()}</td>
                                                                <td className="px-3 py-2 border-r border-gray-200 font-bold text-gray-900">{apt?.name || 'N/A'}</td>
                                                                <td className="px-3 py-2 border-r border-gray-200">{c.type === 'rental' ? 'Bail de Location' : 'Contrat de Réservation/Vente'}</td>
                                                                <td className="px-3 py-2 border-r border-gray-200">{c.start_date ? new Date(c.start_date).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                                                <td className="px-3 py-2 text-right font-bold text-gray-900">{c.amount_dh.toLocaleString('fr-FR')} DH</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                {/* 4. SECTION: FINANCIAL STATUS SUMMARY */}
                                <section className="mt-6">
                                    <div className="bg-gray-100 px-3 py-1.5 flex justify-between items-center border border-gray-300">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800">3. Suivi Financier &amp; Synthèse des Règlements</span>
                                    </div>

                                    {/* Summary Cards of Payments */}
                                    <div className="grid grid-cols-3 gap-4 mt-2 mb-4">
                                        <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Montant Global Engagé</p>
                                            <p className="text-sm font-extrabold text-gray-900 mt-1">{totalContractAmount.toLocaleString('fr-FR')} DH</p>
                                        </div>
                                        <div className="border border-green-300 rounded-lg p-2 bg-green-50/50">
                                            <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Total Cumulé Payé</p>
                                            <p className="text-sm font-extrabold text-green-800 mt-1">{totalPaid.toLocaleString('fr-FR')} DH</p>
                                        </div>
                                        <div className="border border-red-200 rounded-lg p-2 bg-red-50/30">
                                            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Reste à Régler (Reliquat)</p>
                                            <p className="text-sm font-extrabold text-red-800 mt-1">{remainingAmount.toLocaleString('fr-FR')} DH</p>
                                        </div>
                                    </div>

                                    {/* Ledger list */}
                                    <div className="mt-3">
                                        <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">4. Historique Chronologique des Versements</p>
                                        {payments.length === 0 ? (
                                            <p className="text-xs text-gray-500 italic py-2 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">Aucun paiement ou versement n'a encore été enregistré pour ce client.</p>
                                        ) : (
                                            <table className="w-full text-xs text-left border border-gray-300">
                                                <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 border-b border-gray-300">
                                                    <tr>
                                                        <th className="px-3 py-2 border-r border-gray-300">Date</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Propriété</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Description / Objet</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Mode</th>
                                                        <th className="px-3 py-2 border-r border-gray-300">Statut</th>
                                                        <th className="px-3 py-2 border-r border-gray-300 text-right">Montant</th>
                                                        <th className="px-3 py-2 border-r border-gray-300 text-right">Cumul Payé</th>
                                                        <th className="px-3 py-2 text-right">Reliquat</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {paymentsWithRunningTotals.map((p) => (
                                                        <tr key={p.id} className="hover:bg-gray-50/50">
                                                            <td className="px-3 py-2 border-r border-gray-200 text-gray-600">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                                                            <td className="px-3 py-2 border-r border-gray-200 font-bold text-gray-950">{p.apartmentName}</td>
                                                            <td className="px-3 py-2 border-r border-gray-200 font-medium">{p.payment_for}</td>
                                                            <td className="px-3 py-2 border-r border-gray-200 capitalize text-gray-600">{p.payment_method === 'especes' ? 'Espèces' : p.payment_method === 'cheque' ? 'Chèque' : p.payment_method === 'virement' ? 'Virement' : 'Effet'}</td>
                                                            <td className="px-3 py-2 border-r border-gray-200">
                                                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${
                                                                    p.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                    p.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                                    p.status === 'canceled' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
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

                                {/* 5. SIGNATURES & STAMPS */}
                                <footer className="mt-auto pt-10 border-t border-gray-200 text-xs">
                                    <div className="grid grid-cols-2 text-center text-gray-700">
                                        <div>
                                            <p className="font-bold">Le Responsable Financier</p>
                                            <div className="h-16 mt-2 border border-dashed border-gray-200 rounded-lg max-w-[180px] mx-auto bg-gray-50 flex items-center justify-center">
                                                <span className="text-[8px] text-gray-300">Signature &amp; Cachet</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-bold">La Direction NAFAT IMMO</p>
                                            <div className="h-16 mt-2 border border-dashed border-gray-200 rounded-lg max-w-[180px] mx-auto bg-gray-50 flex items-center justify-center">
                                                <span className="text-[8px] text-gray-300">Signature &amp; Cachet</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center text-[8px] text-gray-400 mt-8 border-t border-gray-100 pt-4">
                                        <p>NAFAT IMMO S.A.R.L - Promoteur Immobilier - Siège Social: Agadir, Maroc</p>
                                        <p className="font-mono mt-0.5">Document généré via le Système de Gestion NafatImmo le {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</p>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Print isolated style sheet for A4 rendering */}
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        body {
                            background-color: white !important;
                        }
                        #printable-client-sheet, #printable-client-sheet * {
                            visibility: visible;
                        }
                        #printable-client-sheet {
                            position: absolute !important;
                            left: 15mm !important;
                            top: 15mm !important;
                            width: 180mm !important;
                            margin: 0 !important;
                            box-sizing: border-box !important;
                            box-shadow: none !important;
                        }
                        /* Hide print footer or other browser elements */
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default ClientPdfModal;
