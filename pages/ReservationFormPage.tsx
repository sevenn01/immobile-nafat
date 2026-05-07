
import React, { useState, useEffect, useRef } from 'react';
import { ReservationData } from '../services/api';
import { CloseIcon, PrinterIcon, FileTextIcon } from '../components/icons/Icons';
import { getReservationData } from '../services/api';

const numberToFrenchWords = (n: number): string => {
    if (n === 0) return "ZÉRO";

    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];

    const convert = (num: number): string => {
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 70) {
            const t = Math.floor(num / 10);
            const u = num % 10;
            if (u === 0) return tens[t];
            if (u === 1) return tens[t] + "-et-un";
            return tens[t] + "-" + units[u];
        }
        if (num < 80) {
            const u = num % 10;
            if (u === 1) return "soixante-et-onze";
            return "soixante-" + teens[u];
        }
        if (num < 100) {
            const u = num % 10;
            if (num === 80) return "quatre-vingts";
            if (num < 90) return "quatre-vingt-" + units[u];
            return "quatre-vingt-" + teens[u];
        }
        if (num < 1000) {
            const h = Math.floor(num / 100);
            const r = num % 100;
            let res = "";
            if (h > 1) res += units[h] + " ";
            res += "cent";
            if (h > 1 && r === 0) res += "s";
            if (r > 0) res += " " + convert(r);
            return res;
        }
        if (num < 1000000) {
            const k = Math.floor(num / 1000);
            const r = num % 1000;
            let res = "";
            if (k === 1) {
                res += "mille";
            } else {
                res += convert(k) + " mille";
            }
            if (r > 0) res += " " + convert(r);
            return res;
        }
        if (num < 1000000000) {
            const m = Math.floor(num / 1000000);
            const r = num % 1000000;
            let res = "";
            res += convert(m) + " million";
            if (m > 1) res += "s";
            if (r > 0) res += " " + convert(r);
            return res;
        }
        return num.toString();
    };

    return convert(Math.floor(n)).toUpperCase() + " DIRHAMS";
};

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface ReservationFormProps {
    contractId: string;
    onClose: () => void;
}

const ReservationFormPage: React.FC<ReservationFormProps> = ({ contractId, onClose }) => {
    const [data, setData] = useState<ReservationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const parent = containerRef.current.parentElement;
            if (!parent) return;
            
            const padding = window.innerWidth < 640 ? 16 : 64;
            const availableWidth = parent.clientWidth - padding;
            const docWidth = 800; 
            const newScale = Math.min(1, availableWidth / docWidth);
            setScale(newScale);
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!contractId) {
                setError("ID de contrat manquant.");
                setLoading(false);
                return;
            }
            try {
                const resData = await getReservationData(contractId);
                setData(resData);
            } catch (err: any) {
                setError(err.message || "Une erreur est survenue.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [contractId]);
    
    const handleDownloadPdf = () => {
        const element = printRef.current;
        if (element && window.html2pdf) {
            const filename = `Reservation_${data?.contract.id.substring(0, 6).toUpperCase()}.pdf`;
            const opt = {
                margin:       0,
                filename:     filename,
                image:        { type: 'jpeg', quality: 1 },
                html2canvas:  { 
                    scale: 3, 
                    useCORS: true, 
                    letterRendering: true,
                    scrollY: -window.scrollY
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            window.html2pdf().from(element).set(opt).save();
        }
    };
    
    const handlePrint = () => { window.print(); };

    if (!contractId) return null;

    const renderDocument = () => {
        if (loading) return <div className="p-10 text-center font-sans text-gray-600">Chargement du document...</div>;
        if (error) return <div className="p-10 text-center font-sans text-red-500 font-bold">Erreur: {error}</div>;
        if (!data) return <div className="p-10 text-center font-sans">Aucune donnée trouvée.</div>;

        const { contract, client, apartment, project, totalPaid } = data;
        const signatureDate = new Date(contract.start_date);
        const day = signatureDate.getDate().toString().padStart(2, '0');
        const month = (signatureDate.getMonth() + 1).toString().padStart(2, '0');
        const year = signatureDate.getFullYear();
        
        const formattedTotal = contract.amount_dh.toLocaleString('fr-FR');
        const formattedPaid = totalPaid.toLocaleString('fr-FR');
        const reliquatValue = contract.amount_dh - totalPaid;
        const formattedReliquat = reliquatValue.toLocaleString('fr-FR');

        const consistanceText = apartment.type === 'apartment' 
            ? `Salon + ${apartment.rooms || 1} Chambres, SDB & Balcon.`
            : 'Local Commercial / Garage';

        return (
            <div 
                id="reservation-document"
                ref={printRef} 
                className="bg-white mx-auto flex flex-col print:m-0 font-sans relative print:shadow-none" 
                style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    padding: '0',
                    backgroundImage: 'url("/nafat_letterhead.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                } as React.CSSProperties}
            >
                
                {/* SPACER FOR TOP LOGO AREA */}
                <div className="h-[210px] w-full flex-shrink-0"></div>

                {/* MAIN CONTENT PADDING */}
                <div className="px-16 flex-grow flex flex-col">
                    {/* RESERVATION NUMBER */}
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 uppercase">
                            RESERVATION N° <span className="ml-4 font-mono">{contract.id.substring(contract.id.length - 6).toUpperCase()}/{year}</span>
                        </h2>
                    </div>

                    {/* LOCATION & DATE */}
                    <div className="flex justify-between items-center text-[13px] font-bold mb-8 italic">
                        <div className="ml-56">A <span className="border-b border-black px-10 ml-1 not-italic">Casablanca</span></div>
                        <div className="mr-8">LE : <span className="border-b border-black px-10 ml-1 not-italic">{day}/{month}/{year}</span></div>
                    </div>

                    {/* FIELDS */}
                    <div className="space-y-3 text-[13px] font-bold text-gray-900">
                        <div className="flex items-baseline">
                            <span className="min-w-[120px] italic font-medium">Reçu de :</span>
                            <span className="flex-grow border-b border-dotted border-black pb-0.5 uppercase pl-2 font-bold">{client.full_name}</span>
                        </div>
                        
                        <div className="flex items-baseline">
                            <span className="min-w-[120px] italic font-medium">Domicile légal ¹ :</span>
                            <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 font-semibold text-gray-700">{client.address}</span>
                        </div>
                        
                        <div className="flex gap-12">
                            <div className="flex items-baseline flex-grow">
                                <span className="min-w-[120px] italic font-medium">Téléphone :</span>
                                <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 font-semibold text-gray-700">{client.phone}</span>
                            </div>
                            <div className="flex items-baseline min-w-[300px]">
                                <span className="min-w-[60px] italic font-medium">C.I.N :</span>
                                <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase font-semibold text-gray-700">{client.cin_number}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-baseline">
                            <span className="min-w-[120px] italic font-medium">E-mail :</span>
                            <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 lowercase font-medium text-gray-500">{client.email || '.......................................................................................'}</span>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-baseline">
                                <span className="min-w-[160px] italic font-medium">La somme (en DHS) ² :</span>
                                <span className="min-w-[120px] border-b border-dotted border-black pb-0.5 pl-2 font-bold text-lg">
                                    {formattedPaid} dh
                                </span>
                                <span className="ml-4 flex-grow border-b border-dotted border-black pb-0.5 text-[10px] font-semibold uppercase">{numberToFrenchWords(totalPaid)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col text-[10px] py-1 border-y border-gray-100/30 uppercase font-bold text-gray-500">
                            <div className="flex justify-between px-10 mb-1 opacity-60 italic">
                                <span className="w-1/3">Mode de Paiement</span>
                                <span className="w-1/3 text-center">Numéro / Référence</span>
                                <span className="w-1/3 text-right">Banque / Organisme</span>
                            </div>
                            {data.payments.length > 0 ? (
                                data.payments.map(p => (
                                    <div key={p.id} className="flex justify-between px-10 text-gray-900 font-bold border-b border-gray-50 last:border-0 py-0.5">
                                        <span className="w-1/3">{p.payment_method === 'especes' ? 'ESPÈCES' : p.payment_method === 'cheque' ? 'CHÈQUE' : p.payment_method === 'virement' ? 'VIREMENT' : 'EFFET'}</span>
                                        <span className="w-1/3 text-center">
                                            {p.payment_method === 'cheque' ? (p.cheque_number || '-') : 
                                             p.payment_method === 'virement' ? (p.transfer_series || '-') : 
                                             p.payment_method === 'effet' ? (p.effect_number || '-') : '-'}
                                        </span>
                                        <span className="w-1/3 text-right">{p.bank_name || '-'}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center italic opacity-40">MODE DE PAIEMENT : ESPÈCES / CHÈQUE / VIREMENT / EFFET</div>
                            )}
                        </div>

                        {/* PROPERTY DETAILS */}
                        <div className="pt-2 space-y-3">
                            <div className="flex gap-8">
                                <div className="flex items-baseline flex-grow">
                                    <span className="min-w-[150px] italic font-medium">A valoir sur l'achat de :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase">{apartment.name}</span>
                                </div>
                                <div className="flex items-baseline min-w-[350px]">
                                    <span className="min-w-[60px] italic font-medium">Sis à :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase text-[11px]">{project.location}</span>
                                </div>
                            </div>

                            <div className="flex gap-12">
                                <div className="flex items-baseline flex-grow">
                                    <span className="min-w-[60px] italic font-medium">Ville :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase">Casablanca</span>
                                </div>
                                <div className="flex items-baseline flex-grow">
                                    <span className="min-w-[60px] italic font-medium">Projet :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase text-gray-600">{project.project_name}</span>
                                </div>
                            </div>

                            <div className="flex justify-end pr-10">
                                 <div className="flex items-baseline min-w-[320px]">
                                    <span className="min-w-[100px] italic font-medium">Niveau :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase text-center">{apartment.floor || 'RDC'} ETAGE</span>
                                    <span className="ml-4 italic font-medium">N°:</span>
                                    <span className="min-w-[100px] border-b border-dotted border-black pb-0.5 text-center">{apartment.name.replace(/\D/g,'')}</span>
                                </div>
                            </div>

                            <div className="flex items-baseline">
                                <span className="min-w-[120px] italic font-medium">Consistance :</span>
                                <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 uppercase text-gray-700">{consistanceText}</span>
                            </div>

                            <div className="flex gap-12">
                                <div className="flex items-baseline flex-grow">
                                    <span className="min-w-[180px] italic font-medium">Surfaces approximatives :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 text-center text-lg">{apartment.surface_m2}</span>
                                    <span className="ml-2 uppercase">m²</span>
                                </div>
                                <div className="flex items-baseline flex-grow">
                                    <span className="min-w-[140px] italic font-medium">Usage envisagé ³ :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-0.5 pl-2 text-center uppercase">{apartment.intended_for === 'rental' ? 'LOCATION' : 'HABITATION'}</span>
                                </div>
                            </div>

                            {/* PRICING */}
                            <div className="pt-4 space-y-4">
                                <div className="flex items-baseline">
                                    <span className="min-w-[220px] italic font-medium">Au prix global et de (en DHS) :</span>
                                    <span className="min-w-[120px] border-b border-dotted border-black pb-1 pl-2 text-lg font-bold">{formattedTotal} dh</span>
                                    <span className="ml-4 flex-grow border-b border-dotted border-black pb-1 text-[10px] font-semibold uppercase">{numberToFrenchWords(contract.amount_dh)}</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="min-w-[300px] italic font-medium">Le reliquat, soit la somme de (en DHS) ² :</span>
                                    <span className="min-w-[120px] border-b border-dotted border-black pb-1 pl-2 text-lg font-bold">{formattedReliquat} dh</span>
                                    <span className="ml-4 flex-grow border-b border-dotted border-black pb-1 text-[10px] font-semibold uppercase">{numberToFrenchWords(reliquatValue)}</span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="min-w-[300px] italic font-medium">Sera payé selon les modalités ci-après :</span>
                                    <span className="flex-grow border-b border-dotted border-black pb-1 pl-2 text-center uppercase tracking-widest font-bold">A LA LIVRAISON</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SIGNATURE SECTION - PUSHED TO BOTTOM OF CONTENT AREA */}
                    <div className="mt-auto pt-8 pb-32 flex justify-between gap-20 px-5 text-gray-800">
                        <div className="text-center w-[200px]">
                            <p className="font-bold underline text-[15px] uppercase mb-24">LE BENEFICIAIRE</p>
                        </div>

                        <div className="text-center w-[200px]">
                            <p className="font-bold underline text-[15px] uppercase mb-24">NAFAT IMMO</p>
                        </div>
                    </div>
                </div>

            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/85 z-50 flex justify-center items-start p-4 overflow-auto backdrop-blur-sm">
            <style>
                {`
                    @media print {
                        body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        
                        /* Standard approach: hide everything and show only the document */
                        body > * {
                            visibility: hidden !important;
                        }
                        
                        #reservation-document, #reservation-document * {
                            visibility: visible !important;
                        }
                        
                        #reservation-document {
                            display: flex !important;
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 210mm !important;
                            height: 297mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            border: none !important;
                            box-shadow: none !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            z-index: 10000 !important;
                        }
                        
                        @page {
                            size: A4;
                            margin: 0;
                        }
                    }
                `}
            </style>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col my-4 md:my-6 overflow-hidden border border-white/10 max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 px-6 sm:px-8 py-4 sm:py-5 no-print gap-4">
                    <div className="flex items-center">
                        <div className="p-2 sm:p-3 bg-blue-500/15 rounded-2xl mr-4">
                            <FileTextIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-none uppercase">Bon de Réservation</h3>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 sm:mt-1.5">Édition Document Officiel</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <button onClick={handlePrint} className="flex-shrink-0 flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl sm:rounded-2xl hover:bg-indigo-700 text-xs sm:text-sm font-bold shadow-xl transition-all transform active:scale-95">
                            <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> Imprimer
                        </button>
                        <button onClick={handleDownloadPdf} className="flex-shrink-0 flex items-center px-4 py-2.5 bg-green-600 text-white rounded-xl sm:rounded-2xl hover:bg-green-700 text-xs sm:text-sm font-bold shadow-xl transition-all transform active:scale-95">
                            <FileTextIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> PDF
                        </button>
                        <button onClick={onClose} className="flex-shrink-0 p-2 sm:p-3 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-full ml-auto">
                            <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                </div>
                 <div className="overflow-auto bg-slate-100/50 p-2 sm:p-4 md:p-8 modal-print-container flex justify-center">
                    <div 
                        ref={containerRef}
                        className="shadow-2xl bg-white origin-top transition-transform duration-300" 
                        style={{ 
                            transform: `scale(${scale})`,
                            width: '210mm',
                            minWidth: '210mm',
                            marginBottom: `-${(1 - scale) * 1123}px`
                        }}
                    >
                        {renderDocument()}
                    </div>
                </div>
            </div>
        </div>
    )
};

export default ReservationFormPage;
