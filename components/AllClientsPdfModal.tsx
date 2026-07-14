import React, { useState, useEffect, useRef } from 'react';
import { Client, Contract, Apartment, Payment, ContractStatus, PaymentStatus } from '../types';
import { CloseIcon, PrinterIcon, DownloadIcon, FileTextIcon, UsersIcon } from '../components/icons/Icons';
import { getClients, getContracts, getApartments, getPayments } from '../services/api';

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface AllClientsPdfModalProps {
    onClose: () => void;
    initialMode?: 'summary' | 'detailed';
}

export const AllClientsPdfModal: React.FC<AllClientsPdfModalProps> = ({ onClose, initialMode = 'summary' }) => {
    const [loading, setLoading] = useState(true);
    const [pdfMode, setPdfMode] = useState<'summary' | 'detailed'>(initialMode);
    const [clients, setClients] = useState<Client[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                setLoading(true);
                const [allClients, allContracts, allApartments, allPayments] = await Promise.all([
                    getClients(),
                    getContracts(),
                    getApartments(),
                    getPayments()
                ]);

                // Sort clients alphabetically
                setClients(allClients.sort((a, b) => a.full_name.localeCompare(b.full_name)));
                setContracts(allContracts);
                setApartments(allApartments);
                setPayments(allPayments);
            } catch (err: any) {
                console.error("Error loading global client index PDF data:", err);
                setError("Impossible de charger le dossier financier.");
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    const handleDownloadPdf = () => {
        const element = pdfRef.current;
        if (element && window.html2pdf) {
            const filename = `Annuaire_Global_Clients_${new Date().toISOString().substring(0, 10)}.pdf`;
            const opt = {
                margin:       10,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape is perfect for lists
            };

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

    // Computations per client
    const compiledClientsList = clients.map(client => {
        const clientContracts = contracts.filter(c => c.client_id === client.id && c.status !== ContractStatus.Canceled && c.status !== ContractStatus.SaleCanceled && c.status !== ContractStatus.Ended);
        const clientPayments = payments.filter(p => p.client_id === client.id && p.status === 'paid');

        const totalCommitted = clientContracts.reduce((sum, c) => sum + c.amount_dh, 0);
        const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount_dh, 0);
        const remaining = Math.max(0, totalCommitted - totalPaid);

        return {
            ...client,
            contractsCount: clientContracts.length,
            totalCommitted,
            totalPaid,
            remaining
        };
    });

    // Global Portfolios Totals
    const portfolioTotalCommitted = compiledClientsList.reduce((sum, c) => sum + c.totalCommitted, 0);
    const portfolioTotalPaid = compiledClientsList.reduce((sum, c) => sum + c.totalPaid, 0);
    const portfolioTotalRemaining = compiledClientsList.reduce((sum, c) => sum + c.remaining, 0);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            {/* Modal Box */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-scale-up">
                
                {/* Header Actions */}
                <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <UsersIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Annuaire Global des Clients</h3>
                            <p className="text-xs text-slate-400">Générez la liste consolidée et situation financière de tous les clients au format Paysage A4</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="mr-3 flex items-center space-x-1.5">
                            <label className="text-xs text-slate-400 font-bold hidden sm:inline">Format:</label>
                            <select 
                                value={pdfMode}
                                onChange={(e) => setPdfMode(e.target.value as 'summary' | 'detailed')}
                                className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer transition-all"
                            >
                                <option value="summary">Bilan Financier Simplifié</option>
                                <option value="detailed">Grand Livre (Avec paiements &amp; dates)</option>
                            </select>
                        </div>
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
                            title="Télécharger le catalogue PDF"
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

                {/* Live Preview scroll container */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-8 bg-slate-900/30 flex flex-col items-center justify-start">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mb-4"></div>
                            <p className="text-sm font-bold italic animate-pulse">Aggregation des bilans financiers des clients...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-red-500">
                            <p className="font-bold text-lg mb-2">Erreur de chargement</p>
                            <p className="text-sm text-slate-400">{error}</p>
                        </div>
                    ) : (
                        /* Landscape A4 Wrapper on screen */
                        <div 
                            className="bg-white shadow-xl overflow-hidden rounded-md flex-shrink-0 text-black font-sans flex flex-col p-[10mm]" 
                            style={{ 
                                fontFamily: "'Arial', sans-serif",
                                width: '297mm', // Landscape A4 size
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Printable container with pdfRef */}
                            <div 
                                id="printable-all-clients-sheet" 
                                ref={pdfRef} 
                                className="w-full text-black font-sans flex flex-col flex-grow" 
                                style={{ 
                                    fontFamily: "'Arial', sans-serif",
                                    width: '277mm'
                                }}
                            >
                                {/* 1. HEADER BRANDING */}
                                <header className="grid grid-cols-[auto_1fr_auto] items-center border-b-2 border-black pb-4">
                                    <div className="flex items-center space-x-2">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                        </svg>
                                        <div className="text-center border-r border-l border-black px-3 py-1">
                                            <h1 className="text-sm font-extrabold tracking-wider leading-none">NAFAT IMMO</h1>
                                            <p className="text-[7px] tracking-widest uppercase font-bold text-gray-500">Real Estate Developer</p>
                                        </div>
                                    </div>
                                    <div className="text-center text-[9px] px-4 font-medium text-gray-700">
                                        <p className="font-bold">NAFAT IMMO - Agadir - Maroc</p>
                                        <p>Direction Commerciale &amp; Financière</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-md font-bold uppercase tracking-tight text-gray-900">Registre Général des Clients</h2>
                                        <p className="text-[8px] font-mono mt-0.5 text-gray-500">Généré le: {new Date().toLocaleDateString('fr-FR')} | Total: {clients.length} clients</p>
                                    </div>
                                </header>

                                {/* 2. PORTFOLIO FINANCIAL SYNTHESIS */}
                                <section className="mt-4 bg-gray-50 border border-gray-300 p-3 rounded-lg grid grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nombre de Clients</p>
                                        <p className="text-md font-extrabold text-gray-900 mt-0.5">{clients.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Valeur Portfolio Engagé</p>
                                        <p className="text-md font-extrabold text-blue-900 mt-0.5">{portfolioTotalCommitted.toLocaleString('fr-FR')} DH</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Total Cumulé Recouvré</p>
                                        <p className="text-md font-extrabold text-green-800 mt-0.5">{portfolioTotalPaid.toLocaleString('fr-FR')} DH</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest">Encours Restant (Reliquat Global)</p>
                                        <p className="text-md font-extrabold text-red-800 mt-0.5">{portfolioTotalRemaining.toLocaleString('fr-FR')} DH</p>
                                    </div>
                                </section>

                                {/* 3. MAIN LEDGER INDEX */}
                                <section className="mt-4 flex-grow">
                                    {pdfMode === 'summary' ? (
                                        <table className="w-full text-[11px] text-left border border-gray-300">
                                            <thead className="bg-gray-100 uppercase font-bold text-gray-600 border-b border-gray-300">
                                                <tr>
                                                    <th className="px-3 py-2 border-r border-gray-300">Nom Complet</th>
                                                    <th className="px-3 py-2 border-r border-gray-300">N° CIN / Passport</th>
                                                    <th className="px-3 py-2 border-r border-gray-300">Téléphone</th>
                                                    <th className="px-3 py-2 border-r border-gray-300">Adresse Email / Ville</th>
                                                    <th className="px-3 py-2 border-r border-gray-300 text-center">Dossiers Actifs</th>
                                                    <th className="px-3 py-2 border-r border-gray-300 text-right">Valeur Engagée</th>
                                                    <th className="px-3 py-2 border-r border-gray-300 text-right">Montant Réglé</th>
                                                    <th className="px-3 py-2 text-right">Reliquat dû</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {compiledClientsList.map((c) => (
                                                    <tr key={c.id} className="hover:bg-gray-50/50">
                                                        <td className="px-3 py-2 border-r border-gray-200 font-bold text-gray-950">{c.full_name}</td>
                                                        <td className="px-3 py-2 border-r border-gray-200 font-mono text-gray-700">{c.cin_number}</td>
                                                        <td className="px-3 py-2 border-r border-gray-200 font-medium text-gray-600">{c.phone}</td>
                                                        <td className="px-3 py-2 border-r border-gray-200 text-gray-500 truncate max-w-[150px]">{c.email || c.address || 'N/A'}</td>
                                                        <td className="px-3 py-2 border-r border-gray-200 text-center font-bold text-gray-700">{c.contractsCount}</td>
                                                        <td className="px-3 py-2 border-r border-gray-200 text-right font-bold text-gray-900">{c.totalCommitted.toLocaleString('fr-FR')} DH</td>
                                                        <td className="px-3 py-2 border-r border-gray-200 text-right font-bold text-green-700">{c.totalPaid.toLocaleString('fr-FR')} DH</td>
                                                        <td className="px-3 py-2 text-right font-bold text-red-700">{c.remaining.toLocaleString('fr-FR')} DH</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            {/* Portfolio Summary footer row inside the sheet */}
                                            <tfoot className="bg-gray-100 font-extrabold border-t border-gray-300">
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-2 text-right border-r border-gray-300 uppercase tracking-wider text-gray-600 text-[10px]">TOTAUX PORTFOLIO NAFAT IMMO</td>
                                                    <td className="px-3 py-2 text-right border-r border-gray-300 text-gray-950">{portfolioTotalCommitted.toLocaleString('fr-FR')} DH</td>
                                                    <td className="px-3 py-2 text-right border-r border-gray-300 text-green-800">{portfolioTotalPaid.toLocaleString('fr-FR')} DH</td>
                                                    <td className="px-3 py-2 text-right text-red-800">{portfolioTotalRemaining.toLocaleString('fr-FR')} DH</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    ) : (
                                        <div className="space-y-6">
                                            {compiledClientsList.map((c) => {
                                                const clientPayments = payments.filter(p => p.client_id === c.id && p.status === 'paid');
                                                const clientContractsList = contracts.filter(con => con.client_id === c.id && con.status !== ContractStatus.Canceled && con.status !== ContractStatus.SaleCanceled && con.status !== ContractStatus.Ended);
                                                
                                                const sortedClientPayments = [...clientPayments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
                                                
                                                let runningSum = 0;

                                                return (
                                                    <div key={c.id} className="border border-gray-300 rounded-lg p-4 bg-white page-break-inside-avoid shadow-sm">
                                                        <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                                                            <div className="flex items-baseline space-x-2">
                                                                <span className="text-sm font-extrabold text-gray-900 tracking-tight">{c.full_name}</span>
                                                                <span className="text-[10px] text-gray-400 font-medium">CIN: {c.cin_number} | Tél: {c.phone}</span>
                                                            </div>
                                                            <div className="text-xs font-semibold text-gray-700">
                                                                Engagé: <span className="font-extrabold text-gray-900">{c.totalCommitted.toLocaleString('fr-FR')} DH</span>
                                                            </div>
                                                        </div>

                                                        {sortedClientPayments.length === 0 ? (
                                                            <p className="text-[10px] text-gray-500 italic px-2 py-1">Aucun versement enregistré pour ce client.</p>
                                                        ) : (
                                                            <table className="w-full text-[10px] text-left border border-gray-200 rounded overflow-hidden">
                                                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-gray-200 text-[9px] uppercase tracking-wider">
                                                                    <tr>
                                                                        <th className="px-3 py-2 border-r border-gray-200">Date Versement</th>
                                                                        <th className="px-3 py-2 border-r border-gray-200">Propriété / Unité</th>
                                                                        <th className="px-3 py-2 border-r border-gray-200">Description / Libellé</th>
                                                                        <th className="px-3 py-2 border-r border-gray-200">Mode de Règlement</th>
                                                                        <th className="px-3 py-2 border-r border-gray-200">Statut</th>
                                                                        <th className="px-3 py-2 border-r border-gray-200 text-right">Montant regle</th>
                                                                        <th className="px-3 py-2 text-right text-green-700">Cummuler</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {sortedClientPayments.map(p => {
                                                                        const conOfPayment = contracts.find(con => con.id === p.contract_id);
                                                                        const apt = apartments.find(a => a.id === conOfPayment?.apartment_id);
                                                                        runningSum += p.amount_dh;
                                                                        return (
                                                                            <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                                                                                <td className="px-3 py-1.5 border-r border-gray-100 text-gray-600 font-medium">{new Date(p.payment_date).toLocaleDateString('fr-FR')}</td>
                                                                                <td className="px-3 py-1.5 border-r border-gray-100 font-bold text-gray-900">{apt?.name || 'Unité'}</td>
                                                                                <td className="px-3 py-1.5 border-r border-gray-100 text-gray-600">{p.payment_for}</td>
                                                                                <td className="px-3 py-1.5 border-r border-gray-100 capitalize text-gray-500 font-medium">{p.payment_method === 'especes' ? 'Espèces' : p.payment_method === 'cheque' ? 'Chèque' : p.payment_method === 'virement' ? 'Virement' : 'Effet'}</td>
                                                                                <td className="px-3 py-1.5 border-r border-gray-100">
                                                                                    <span className="inline-flex items-center px-2 py-0.5 text-[8px] font-extrabold text-green-700 bg-green-50 rounded border border-green-200 uppercase tracking-wider">
                                                                                        PAYÉ
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-3 py-1.5 border-r border-gray-100 text-right font-extrabold text-gray-900">{p.amount_dh.toLocaleString('fr-FR')} DH</td>
                                                                                <td className="px-3 py-1.5 text-right font-extrabold text-green-600">{runningSum.toLocaleString('fr-FR')} DH</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        <div className="flex justify-end mt-3">
                                                            <div className="inline-flex items-stretch bg-gray-50 border border-gray-200 rounded overflow-hidden text-[10px]">
                                                                <div className="px-3 py-1.5 bg-gray-50 border-r border-gray-200 flex items-center space-x-1.5">
                                                                    <span className="text-gray-500 font-semibold">Engagé:</span>
                                                                    <span className="text-gray-950 font-extrabold">{c.totalCommitted.toLocaleString('fr-FR')} DH</span>
                                                                </div>
                                                                <div className="px-3 py-1.5 bg-gray-50 border-r border-gray-200 flex items-center space-x-1.5">
                                                                    <span className="text-green-700 font-semibold">Réglé:</span>
                                                                    <span className="text-green-600 font-extrabold">{c.totalPaid.toLocaleString('fr-FR')} DH</span>
                                                                </div>
                                                                <div className="px-3 py-1.5 bg-gray-50 flex items-center space-x-1.5">
                                                                    <span className="text-red-700 font-semibold">Reste:</span>
                                                                    <span className="text-red-600 font-extrabold">{c.remaining.toLocaleString('fr-FR')} DH</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
 
                                {/* 4. SIGNATURES & STAMPS */}
                                <footer className="mt-8 pt-6 border-t border-gray-200 text-[10px] text-gray-400">
                                    <div className="flex justify-between items-center">
                                        <p>NAFAT IMMO S.A.R.L - Agadir, Maroc</p>
                                        <p className="font-mono">Registre extrait le {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}</p>
                                        <p className="font-bold text-gray-500">Document interne confidentiel</p>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    )}
                </div>
 
                {/* Print isolated style sheet */}
                <style>{`
                    .page-break-inside-avoid {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        body {
                            background-color: white !important;
                        }
                        #printable-all-clients-sheet, #printable-all-clients-sheet * {
                            visibility: visible;
                        }
                        #printable-all-clients-sheet {
                            position: absolute !important;
                            left: 10mm !important;
                            top: 10mm !important;
                            width: 277mm !important;
                            margin: 0 !important;
                            box-sizing: border-box !important;
                            box-shadow: none !important;
                        }
                        @page {
                            size: A4 landscape;
                            margin: 0;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default AllClientsPdfModal;
