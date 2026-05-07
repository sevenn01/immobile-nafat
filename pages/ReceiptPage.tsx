import React, { useState, useEffect, useRef } from 'react';
import { Payment, Client, Contract, Apartment, Project, ReceiptData } from '../types';
import { CloseIcon, PrinterIcon, FileTextIcon } from '../components/icons/Icons';
import { getReceiptData } from '../services/api';

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface ReceiptProps {
    paymentId: string;
    onClose: () => void;
}

const LabeledField = ({ frLabel, arLabel, value }: { frLabel: string, arLabel: string, value: string | number | null | undefined }) => (
    <div className="relative flex items-end h-8 text-sm">
        <span className="bg-white pr-2 font-medium text-black">{frLabel}</span>
        <div className="flex-grow border-b border-dotted border-black text-center font-semibold text-black">
            <span className="bg-white px-2">{value || ''}</span>
        </div>
        <span className="bg-white pl-2 font-medium text-black" style={{ direction: 'rtl' }}>{arLabel}</span>
    </div>
);

const PaymentCheckbox = ({ label, arLabel, checked }: { label: string, arLabel: string, checked: boolean }) => (
    <div className="flex items-center text-sm">
        <div className="flex items-center">
            <div className="w-4 h-4 border border-black flex justify-center items-center mr-2">
                {checked && <div className="font-bold text-black -translate-y-px">X</div>}
            </div>
            <span className="font-medium text-black w-20">{label}</span>
        </div>
        <div className="flex-grow border-b border-dotted border-black mx-2"></div>
        <span className="font-medium text-black text-right" style={{ direction: 'rtl' }}>{arLabel}</span>
    </div>
);


const ReceiptPage: React.FC<ReceiptProps> = ({ paymentId, onClose }) => {
    const [data, setData] = useState<ReceiptData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchReceiptData = async () => {
            if (!paymentId) {
                setError("ID de paiement manquant.");
                setLoading(false);
                return;
            }
            try {
                const receiptData = await getReceiptData(paymentId);
                setData(receiptData);
            } catch (err: any) {
                setError(err.message || "Une erreur est survenue.");
            } finally {
                setLoading(false);
            }
        };

        fetchReceiptData();
    }, [paymentId]);
    
    const handleDownloadPdf = () => {
        const element = receiptRef.current;
        if (element && window.html2pdf) {
            const isRental = data?.contract.type === 'rental';
            const filename = `${isRental ? 'quittance' : 'recu'}_${data?.payment.id.substring(data.payment.id.length - 6)}.pdf`;
            const opt = {
                margin:       0.5,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'cm', format: 'a4', orientation: 'portrait' }
            };
            window.html2pdf().from(element).set(opt).save();
        } else {
            console.error("html2pdf library not found or receipt element is missing.");
            // Fallback to print if they click download but don't have the lib
            window.print();
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    if (!paymentId) return null;
    
    const getPaymentDetailValue = (p: Payment, detail: 'account' | 'bank') => {
        if (detail === 'account') {
            switch (p.payment_method) {
                case 'cheque': return p.cheque_number;
                case 'virement': return p.transfer_series;
                case 'effet': return p.effect_number;
                default: return null;
            }
        }
        if (detail === 'bank') {
            return p.payment_method === 'cheque' ? p.bank_name : null;
        }
        return null;
    };


    const renderContent = () => {
        if (loading) return <div className="p-10 text-center font-sans">Chargement du reçu...</div>;
        if (error) return <div className="p-10 text-center font-sans text-red-500">Erreur: {error}</div>;
        if (!data) return <div className="p-10 text-center font-sans">Aucune donnée à afficher.</div>;

        const { payment, client, contract, apartment, project, allContractPayments } = data;
        const isRental = contract.type === 'rental';

        // Calculate totals
        // total cumulé payé: include all paid payments plus current one
        const totalPaid = allContractPayments
            .filter(p => p.status === 'paid' || p.id === payment.id)
            .reduce((sum, p) => sum + p.amount_dh, 0);
        
        const resteAPayer = Math.max(0, contract.amount_dh - totalPaid);

        return (
            <div id="printable-receipt" ref={receiptRef} className="bg-white p-6 sm:p-10 w-full font-sans flex flex-col text-black mx-auto" style={{ fontFamily: "'Arial', sans-serif", width: '210mm', minHeight: '297mm' }}>
                <header className="grid grid-cols-[auto_1fr_auto] items-center border-b-2 border-black pb-4">
                    <div className="flex items-center space-x-2">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        <div className="text-center border-r-2 border-l-2 border-black px-2 py-1">
                            <h1 className="text-xl font-bold tracking-wider">NAFAT IMMO</h1>
                            <p className="text-[10px] tracking-widest uppercase font-semibold">Real Estate</p>
                        </div>
                    </div>
                     <div className="flex items-center h-full px-4 text-black">
                        <div className="w-px h-[40px] bg-black"></div>
                        <div className="text-center text-[10px] px-6 leading-tight font-medium">
                            <p>314 D, 2 éme étage</p>
                            <p>Riad Salam - Agadir</p>
                            <p>Tél.: 06.61.28.33.10</p>
                        </div>
                        <div className="w-px h-[40px] bg-black"></div>
                    </div>
                    <div className="text-center min-w-[200px]">
                        <div className="flex flex-col items-center justify-center">
                            {isRental ? (
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold">QUITTANCE DE LOYER</h2>
                                    <span className="text-lg font-bold" style={{direction: 'rtl'}}>إيصال كراء</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-extrabold uppercase tracking-tighter">REÇU</h2>
                                    <span className="text-2xl font-bold" style={{direction: 'rtl'}}>توصيل</span>
                                </div>
                            )}
                            <p className="mt-1 text-base font-mono font-bold tracking-[0.2em]">{payment.id.substring(payment.id.length - 6).toUpperCase()}</p>
                        </div>
                    </div>
                </header>

                <main className="mt-8 flex-grow space-y-6 text-sm px-2">
                    <div className="space-y-2">
                      <LabeledField frLabel="Dossier N°" arLabel="رقم الملف" value={contract.id.substring(contract.id.length - 6).toUpperCase()} />
                       {isRental ? (
                        <LabeledField frLabel="Loyer Mensuel" arLabel="المبلغ الشهري للكراء" value={`${contract.amount_dh.toLocaleString('fr-FR')} DH`} />
                      ) : (
                        <LabeledField frLabel="Montant Total du Contrat" arLabel="المبلغ الإجمالي للعقد" value={`${contract.amount_dh.toLocaleString('fr-FR')} DH`} />
                      )}
                    </div>
                    
                    <div className="space-y-2 pt-2">
                      <LabeledField frLabel="Nom et Prénom" arLabel="الإسم العائلي و الشخصي" value={client.full_name} />
                      <LabeledField frLabel="Adresse" arLabel="العنوان" value={client.address} />
                    </div>
                    
                    <div className="space-y-2 pt-2">
                        <LabeledField frLabel="Objet" arLabel="الموضوع" value={payment.payment_for} />
                    
                         <div className="flex space-x-12">
                            <div className="flex-1">
                                <LabeledField frLabel="Type" arLabel="النوع" value={apartment.type === 'apartment' ? 'Appartement' : 'Garage'} />
                            </div>
                            <div className="flex-1">
                                <LabeledField frLabel="Programme" arLabel="مشروع" value={project.project_name} />
                            </div>
                        </div>
                        <LabeledField frLabel="Date" arLabel="التاريخ" value={new Date(payment.payment_date).toLocaleDateString('fr-FR')} />
                    </div>

                    <div className="pt-6">
                        <div className="flex justify-between items-center text-sm font-bold mb-1">
                           <span>{isRental ? "Montant du Loyer Payé" : "Montant Reçu"}</span>
                           <span style={{direction: 'rtl'}}>{isRental ? "مبلغ الكراء المؤدى" : "المبلغ المستلم"}</span>
                        </div>
                        <div className="border-2 border-black w-full text-center py-4 font-bold text-3xl text-black uppercase tracking-[0.1em]">{`${payment.amount_dh.toLocaleString('fr-FR')} DH`} </div>
                    </div>

                    {!isRental && (
                        <div className="flex space-x-12 pt-4">
                             <div className="flex-1">
                                <LabeledField frLabel="Total cumulé payé" arLabel="إجمالي المدفوع" value={`${totalPaid.toLocaleString('fr-FR')} DH`} />
                            </div>
                            <div className="flex-1">
                                <LabeledField frLabel="Reste à payer" arLabel="المبلغ المتبقي" value={`${resteAPayer.toLocaleString('fr-FR')} DH`} />
                            </div>
                        </div>
                    )}


                    <div className="pt-8">
                        <h3 className="font-bold text-black text-sm inline-block border-b-2 border-black pb-0.5 mb-4">Mode de Paiement <span style={{direction: 'rtl'}} className="ml-4 font-bold">طريقة الأداء</span></h3>
                        <div className="space-y-3">
                            <PaymentCheckbox label="Espèces" arLabel="نقدا" checked={payment.payment_method === 'especes'} />
                            <PaymentCheckbox label="Virement" arLabel="تحويل" checked={payment.payment_method === 'virement'} />
                            <PaymentCheckbox label="Chèque" arLabel="شيك" checked={payment.payment_method === 'cheque'} />
                        </div>
                        <div className="mt-6 space-y-2">
                            <LabeledField frLabel="Compte / Réf N°" value={getPaymentDetailValue(payment, 'account')} arLabel="حساب رقم" />
                            <LabeledField frLabel="Banque" value={getPaymentDetailValue(payment, 'bank')} arLabel="بنك" />
                        </div>
                    </div>
                </main>

                <footer className="mt-auto pt-12 flex items-end justify-between space-x-8 text-[11px] font-bold px-2 mb-4">
                    <div className="w-[55%] border-2 border-black p-4 min-h-[100px] flex items-center justify-center text-center leading-relaxed text-black italic">
                       {isRental 
                         ? "Cette quittance annule tous les reçus qui auraient pu être donnés précédemment pour acomptes versés sur le présent terme."
                         : "Le présent reçu confirme le versement d'un acompte ou d'un solde dans le cadre du contrat de vente référencé ci-dessus."
                       }
                    </div>
                    <div className="w-[45%] flex justify-end space-x-4">
                        <div className="border-2 border-black w-44 h-32 p-2 flex flex-col items-center">
                            <p className="text-center font-bold">{isRental ? "Locataire" : "Acheteur"} <span style={{direction: 'rtl'}} className="block mt-1 font-bold">{isRental ? "المكتري" : "المشتري"}</span></p>
                        </div>
                        <div className="border-2 border-black w-44 h-32 p-2 flex flex-col items-center">
                             <p className="text-center font-bold">Le Responsable <span style={{direction: 'rtl'}} className="block mt-1 font-bold">المسؤول</span></p>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
    
    return (
        <div id="print-modal-overlay" className="fixed inset-0 bg-black/70 z-[9999] flex justify-center items-start p-4 overflow-auto backdrop-blur-sm no-print-bg" onClick={onClose}>
            <style>
                {`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }

                        /* 1. Global Reset */
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            height: 100% !important;
                            width: 100% !important;
                            overflow: hidden !important;
                            background-color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        /* 2. Hide Everything by using visibility */
                        body * {
                            visibility: hidden !important;
                        }

                        /* 3. Show ONLY the target receipt and its contents */
                        #printable-receipt,
                        #printable-receipt * {
                            visibility: visible !important;
                        }

                        /* 4. Force the receipt to the exact top-left of the first page */
                        #printable-receipt {
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 210mm !important;
                            height: 297mm !important;
                            padding: 15mm !important;
                            margin: 0 !important;
                            box-sizing: border-box !important;
                            background-color: white !important;
                            z-index: 1000000 !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }
                        
                        /* 5. Ensure no other content blocks the print area */
                        .no-print, nav, aside, header, button {
                            display: none !important;
                        }
                    }
                `}
            </style>
            <div id="print-modal-content" className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col my-4 md:my-10 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b p-4 sm:px-6 bg-slate-50 rounded-t-xl gap-4 no-print">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Aperçu du Document</h3>
                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest mt-1">Édition Officielle</p>
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-xs shadow-md">
                            <PrinterIcon className="w-4 h-4 mr-2" /> Imprimer
                        </button>
                         <button onClick={handleDownloadPdf} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-bold text-xs shadow-md">
                            <FileTextIcon className="w-4 h-4 mr-2" /> PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 transition-colors" aria-label="Close modal">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                 <div id="printable-receipt-container" className="overflow-auto p-4 sm:p-10 bg-slate-200/50 flex justify-center">
                    <div className="shadow-2xl bg-white border border-slate-200">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    )
};

export default ReceiptPage;
