
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Payment, Client, Contract, Apartment, Project, ReceiptData, PaymentStatus } from '../types';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const parent = containerRef.current.parentElement;
            if (!parent) return;
            
            const padding = window.innerWidth < 640 ? 16 : 64;
            const availableWidth = parent.clientWidth - padding;
            const docWidth = 794; // 210mm in px at 96dpi is ~794px
            const newScale = Math.min(1, availableWidth / docWidth);
            setScale(newScale);
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

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
    
    const totals = useMemo(() => {
        if (!data) return { totalPaid: 0, remaining: 0 };
        const { contract, allContractPayments } = data;
        const totalPaid = allContractPayments
            .filter(p => p.status === PaymentStatus.Paid)
            .reduce((sum, p) => sum + p.amount_dh, 0);
        
        return {
            totalPaid,
            remaining: Math.max(0, contract.amount_dh - totalPaid)
        };
    }, [data]);

    const handleDownloadPdf = () => {
        const element = receiptRef.current;
        if (element && window.html2pdf) {
            const isRental = data?.contract.type === 'rental';
            const filename = `${isRental ? 'quittance' : 'recu'}_${data?.payment.id.substring(data.payment.id.length - 6)}.pdf`;
            const opt = {
                margin:       0,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true, 
                    letterRendering: true,
                    scrollY: -window.scrollY
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            window.html2pdf().from(element).set(opt).save();
        } else {
            console.error("html2pdf library not found or receipt element is missing.");
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

        const { payment, client, contract, apartment, project } = data;
        const isRental = contract.type === 'rental';

        return (
            <div 
                id="printable-receipt" 
                ref={receiptRef} 
                className="bg-white w-full font-sans flex flex-col text-black relative print:shadow-none" 
                style={{ 
                    fontFamily: "'Arial', sans-serif",
                    width: '210mm',
                    height: '297mm',
                    maxHeight: '297mm',
                    margin: '0 auto',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                } as React.CSSProperties}
            >
                {/* SPACER FOR TOP LOGO AREA */}
                <div className="h-[200px] w-full flex-shrink-0 mb-4 flex items-end justify-center">
                     <div className="text-center">
                        <div className="flex items-baseline justify-center space-x-4">
                            {isRental ? (
                                <>
                                    <h2 className="text-3xl font-bold">QUITTANCE DE LOYER</h2>
                                    <p className="text-xl font-semibold" style={{direction: 'rtl'}}>إيصال كراء</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-4xl font-bold">REÇU</h2>
                                    <p className="text-2xl font-semibold" style={{direction: 'rtl'}}>توصيل</p>
                                </>
                            )}
                        </div>
                        <p className="mt-1 text-lg font-mono tracking-widest">{payment.id.substring(payment.id.length - 6).toUpperCase()}</p>
                    </div>
                </div>

                <main className="mt-2 flex-grow space-y-3 text-sm px-14">
                    <div className="space-y-1">
                      <LabeledField frLabel="Dossier N°" arLabel="رقم الملف" value={contract.id.substring(contract.id.length - 6).toUpperCase()} />
                       {isRental ? (
                        <LabeledField frLabel="Loyer Mensuel" arLabel="المبلغ الشهري للكراء" value={`${contract.amount_dh.toLocaleString('fr-FR')} DH`} />
                      ) : (
                        <LabeledField frLabel="Montant Total du Contrat" arLabel="المبلغ الإجمالي للعقد" value={`${contract.amount_dh.toLocaleString('fr-FR')} DH`} />
                      )}
                    </div>
                    
                    <div className="space-y-1 pt-2">
                      <LabeledField frLabel="Nom et Prénom" arLabel="الإسم العائلي و الشخصي" value={client.full_name} />
                      <LabeledField frLabel="Adresse" arLabel="العنوان" value={client.address} />
                    </div>
                    
                    <div className="space-y-1 pt-2">
                        <LabeledField frLabel="Objet" arLabel="الموضوع" value={payment.payment_for} />
                    
                         <div className="flex space-x-8">
                            <div className="flex-1">
                                <LabeledField frLabel="Type" arLabel="النوع" value={apartment.type === 'apartment' ? 'Appartement' : 'Garage'} />
                            </div>
                            <div className="flex-1">
                                <LabeledField frLabel="Programme" arLabel="مشروع" value={project.project_name} />
                            </div>
                        </div>
                        <LabeledField frLabel="Date" arLabel="التاريخ" value={new Date(payment.payment_date).toLocaleDateString('fr-FR')} />
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between items-center text-sm font-medium">
                           <span className="font-bold text-black">{isRental ? "Montant du Loyer Payé" : "Montant Reçu"}</span>
                           <span className="font-bold text-black" style={{direction: 'rtl'}}>{isRental ? "مبلغ الكراء المؤدى" : "المبلغ المستلم"}</span>
                        </div>
                        <div className="border-2 border-black w-full text-center py-2 mt-1 font-bold text-lg text-black bg-slate-50/50">{`${payment.amount_dh.toLocaleString('fr-FR')} DH`} </div>
                    </div>

                    {!isRental && (
                        <div className="pt-2 grid grid-cols-2 gap-x-8">
                             <LabeledField frLabel="Total cumulé payé" arLabel="إجمالي المدفوع" value={`${totals.totalPaid.toLocaleString('fr-FR')} DH`} />
                             <LabeledField frLabel="Reste à payer" arLabel="المبلغ المتبقي" value={`${totals.remaining.toLocaleString('fr-FR')} DH`} />
                        </div>
                    )}


                    <div className="pt-4">
                        <h3 className="font-bold text-black text-sm inline-block border-b-2 border-black pb-px">Mode de Paiement <span style={{direction: 'rtl'}} className="ml-4">طريقة الأداء</span></h3>
                        <div className="mt-2 grid grid-cols-1 gap-y-1 text-sm">
                            <PaymentCheckbox label="Espèces" arLabel="نقدا" checked={payment.payment_method === 'especes'} />
                            <PaymentCheckbox label="Virement" arLabel="تحويل" checked={payment.payment_method === 'virement'} />
                            <PaymentCheckbox label="Chèque" arLabel="شيك" checked={payment.payment_method === 'cheque'} />
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                            <LabeledField frLabel="Compte / Réf N°" value={getPaymentDetailValue(payment, 'account')} arLabel="حساب رقم" />
                            <LabeledField frLabel="Banque" value={getPaymentDetailValue(payment, 'bank')} arLabel="بنك" />
                        </div>
                    </div>
                </main>

                <footer className="mt-auto pb-12 flex items-end justify-between space-x-4 text-sm px-14">
                    <div className="w-1/2 border-2 border-black p-2 text-[10px] leading-tight">
                       {isRental 
                         ? "Cette quittance annule tous les reçus qui auraient pu être donnés précédemment pour acomptes versés sur le présent terme."
                         : "Le présent reçu confirme le versement d'un acompte ou d'un solde dans le cadre du contrat de vente référencé ci-dessus."
                       }
                    </div>
                    <div className="w-1/2 flex justify-end space-x-2">
                        <div className="border-2 border-black w-32 h-20 p-1 bg-white/30">
                            <p className="font-bold text-center text-[10px]">{isRental ? "Locataire" : "Acheteur"} <span style={{direction: 'rtl'}}>{isRental ? "المكتري" : "المشتري"}</span></p>
                        </div>
                        <div className="border-2 border-black w-32 h-20 p-1 bg-white/30">
                             <p className="font-bold text-center text-[10px]">Le Responsable <span style={{direction: 'rtl'}}>المسؤول</span></p>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start p-4 overflow-auto">
            <style>
                {`
                    @media print {
                        body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        
                        /* Hide UI elements */
                        .no-print, header, aside, nav, button, .flex-shrink-0 {
                            display: none !important;
                        }
                        
                        /* Ensure the document is perfectly aligned */
                        #printable-receipt {
                            display: flex !important;
                            visibility: visible !important;
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 210mm !important;
                            height: 297mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                            box-sizing: border-box !important;
                            page-break-after: avoid !important;
                            page-break-before: avoid !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            z-index: 999999 !important;
                        }

                        /* Reset any transforms or offsets */
                        .fixed.inset-0, .overflow-auto, .no-print-padding, .no-print-bg, .print-transform-none {
                            position: static !important;
                            display: block !important;
                            transform: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            overflow: visible !important;
                            background: none !important;
                            box-shadow: none !important;
                        }

                        /* Ensure no scale transform is active during print */
                        .origin-top {
                            transform: none !important;
                        }

                        @page {
                            size: A4;
                            margin: 0;
                        }
                    }
                `}
            </style>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col my-4 md:my-8 max-h-[90vh] no-print-bg" onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b p-4 bg-white rounded-t-lg gap-4 no-print">
                    <h3 className="text-lg font-semibold text-gray-800">Aperçu du Document</h3>
                    <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <button onClick={handlePrint} className="flex-shrink-0 flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold">
                            <PrinterIcon className="w-4 h-4 mr-1.5" /> Imprimer
                        </button>
                         <button onClick={handleDownloadPdf} className="flex-shrink-0 flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold">
                            <FileTextIcon className="w-4 h-4 mr-1.5" /> PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors ml-auto" aria-label="Close modal">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                 <div className="overflow-auto p-2 sm:p-4 md:p-8 bg-slate-100/50 flex justify-center no-print-padding">
                    <div 
                        ref={containerRef}
                        className="shadow-2xl bg-white origin-top transition-transform duration-300 print-transform-none" 
                        style={{ 
                            transform: `scale(${scale})`,
                            width: '210mm',
                            minWidth: '210mm',
                            marginBottom: `-${(1 - scale) * 1123}px`
                        }}
                    >
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    )
};

export default ReceiptPage;
