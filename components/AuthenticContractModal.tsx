import React, { useRef, useState } from 'react';
import { Contract, Client, Apartment, Project, Payment, PaymentStatus } from '../types';
import { numberToFrenchWords } from '../utils/frenchNumbers';
import { Printer, Copy, Check, FileDown, Download, FileText, Loader2, X } from 'lucide-react';

declare global {
    interface Window {
        html2pdf: any;
    }
}

interface AuthenticContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    client?: Client | null;
    apartment?: Apartment | null;
    project?: Project | null;
    payments?: Payment[];
    onEdit?: () => void;
}

export const AuthenticContractModal: React.FC<AuthenticContractModalProps> = ({
    isOpen,
    onClose,
    contract,
    client,
    apartment,
    project,
    payments = [],
    onEdit
}) => {
    const [copied, setCopied] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingDoc, setDownloadingDoc] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !contract) return null;

    // Financial calculations
    const priceDh = contract.amount_dh || 0;
    const priceInWords = numberToFrenchWords(priceDh);

    const validatedPayments = payments.filter(p => p.status === PaymentStatus.Paid || (p.status as string) === 'paid');
    const totalPaidCalculated = validatedPayments.reduce((sum, p) => sum + p.amount_dh, 0);

    const actualAdvance = totalPaidCalculated > 0 ? totalPaidCalculated : ((contract as any).advance_amount_dh || (priceDh * 0.2));
    const advanceInWords = numberToFrenchWords(actualAdvance);

    const actualRemaining = Math.max(0, priceDh - actualAdvance);
    const remainingInWords = numberToFrenchWords(actualRemaining);

    // Property specs
    const surfaceM2 = apartment?.surface_m2 || 85;
    const surfaceInWords = numberToFrenchWords(surfaceM2).toUpperCase();
    const balconM2 = (apartment as any)?.balcony_surface_m2 || 6;
    const surplombM2 = Math.round(surfaceM2 * 0.12);

    const propertyTitle = apartment?.titre || (apartment as any)?.property_title || contract.contract_titre || '42598/66';
    const originalMotherTitle = (project as any)?.mother_property_title || (project as any)?.titre_mere || 'Titre Mère N° 12458/CAS';

    const rawFloor = apartment?.floor ?? '1';
    const floorLabel = rawFloor === '0' || rawFloor === 'RDC' ? 'Rez-de-chaussée' : (rawFloor === '1' ? '1er étage' : `${rawFloor}ème étage`);

    // Dates
    const contractDateStr = contract.final_contract_date || contract.start_date || contract.created_at || new Date().toISOString();
    const contractDateObj = new Date(contractDateStr);
    const formattedContractDate = !isNaN(contractDateObj.getTime())
        ? contractDateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('fr-FR');

    const firstPaymentDate = validatedPayments.length > 0
        ? new Date(validatedPayments[0].payment_date).toLocaleDateString('fr-FR')
        : formattedContractDate;

    const city = (project as any)?.city || project?.location?.split(',')[0] || 'Casablanca';

    // Client formatting
    const clientName = client?.full_name || 'Monsieur / Madame';
    const clientCin = client?.cin_number || 'CIN Non Renseigné';
    const clientPhone = client?.phone || '';
    const clientAddress = client?.address || 'Casablanca, Maroc';

    const cleanFileBase = `Compromis_Vente_${(clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}_${(apartment?.name || 'Bien').replace(/[^a-zA-Z0-9]/g, '_')}`;

    const handlePrint = () => {
        window.print();
    };

    const handleCopyText = () => {
        if (!docRef.current) return;
        const text = docRef.current.innerText;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadPdf = async () => {
        if (!docRef.current) return;
        try {
            setDownloadingPdf(true);
            const filename = `${cleanFileBase}.pdf`;

            // Clone container specifically for clean 4-page PDF export
            const exportContainer = document.createElement('div');
            exportContainer.style.width = '790px';
            exportContainer.style.backgroundColor = '#ffffff';
            exportContainer.style.color = '#000000';
            exportContainer.style.fontFamily = "'Times New Roman', Times, serif";
            exportContainer.style.fontSize = '11px';
            exportContainer.style.lineHeight = '1.36';

            const pages = docRef.current.querySelectorAll('.authentic-page');
            pages.forEach((page, idx) => {
                const pageClone = page.cloneNode(true) as HTMLElement;
                pageClone.style.padding = '20px 30px 14px 30px';
                pageClone.style.boxSizing = 'border-box';
                pageClone.style.backgroundColor = '#ffffff';
                pageClone.style.boxShadow = 'none';
                pageClone.style.border = 'none';
                pageClone.style.borderRadius = '0';
                pageClone.style.margin = '0';
                pageClone.style.display = 'flex';
                pageClone.style.flexDirection = 'column';
                pageClone.style.justifyContent = 'space-between';

                if (idx < pages.length - 1) {
                    pageClone.style.pageBreakAfter = 'always';
                    pageClone.classList.add('authentic-page-break');
                } else {
                    pageClone.style.pageBreakAfter = 'auto';
                }
                exportContainer.appendChild(pageClone);
            });

            if (typeof window !== 'undefined' && window.html2pdf) {
                const opt = {
                    margin: [4, 5, 4, 5],
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                        scale: 2, 
                        useCORS: true, 
                        letterRendering: true,
                        scrollY: 0,
                        backgroundColor: '#ffffff'
                    },
                    jsPDF: { 
                        unit: 'mm', 
                        format: 'a4', 
                        orientation: 'portrait' 
                    },
                    pagebreak: { 
                        mode: ['css', 'legacy'],
                        after: '.authentic-page-break'
                    }
                };

                await window.html2pdf().from(exportContainer).set(opt).save();
            } else {
                window.print();
            }
        } catch (error) {
            console.error("PDF generation failed:", error);
            window.print();
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleDownloadWordDoc = () => {
        if (!docRef.current) return;
        try {
            setDownloadingDoc(true);
            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset="utf-8">
                    <title>Compromis de Vente</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.45; color: #000; }
                        .authentic-page { page-break-after: always; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${docRef.current.innerHTML}
                </body>
                </html>
            `;
            const blob = new Blob(['\ufeff', htmlContent], {
                type: 'application/msword;charset=utf-8'
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${cleanFileBase}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Word export failed:", e);
        } finally {
            setDownloadingDoc(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-scale-up">
                
                {/* Header Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border-b border-slate-800 text-white shrink-0 no-print">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>Compromis de Vente Authentique</span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Loi Notariale 32-09 (4 Pages)
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                {clientName} — {apartment?.name || 'Appartement'} ({project?.project_name || 'Projet'})
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Modifier Données
                            </button>
                        )}
                        <button
                            onClick={handleCopyText}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            title="Copier le texte intégral"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? 'Copié !' : 'Copier Texte'}</span>
                        </button>
                        <button
                            onClick={handleDownloadWordDoc}
                            disabled={downloadingDoc}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-900/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            title="Télécharger au format Word (.doc)"
                        >
                            {downloadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-blue-400" />}
                            <span>Word</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            title="Imprimer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimer</span>
                        </button>
                        {/* Primary PDF Download Action */}
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                            title="Télécharger directement le document PDF sur 4 pages"
                        >
                            {downloadingPdf ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Génération PDF...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span>Télécharger PDF</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Document Container (4 Dedicated A4 Pages) */}
                <div 
                    ref={docRef}
                    id="authentic-contract-docx-container"
                    className="p-4 sm:p-8 overflow-y-auto space-y-6 bg-slate-200/90 text-slate-950 font-serif"
                    style={{ fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif" }}
                >
                    {/* ================= PAGE 1 ================= */}
                    <div className="authentic-page bg-white p-6 sm:p-9 rounded-lg shadow-md border border-slate-300 text-[12px] sm:text-[12.5px] leading-[1.42] relative flex flex-col justify-between min-h-[960px]">
                        <div className="space-y-2">
                            {/* Page 1 Header */}
                            <div className="font-bold text-slate-950 tracking-wide text-justify">
                                PARDEVANT Maître Saida DERRAJI, Notaire à Casablanca, soussignée. -------------------------
                            </div>
                            <div className="text-right font-bold text-slate-950 tracking-wider">
                                ------------------------------------------------------------------------------------------------ONT COMPARU
                            </div>

                            {/* Party 1: Seller */}
                            <div className="space-y-0.5 pt-0.5">
                                <p className="font-bold text-slate-950 text-justify">
                                    1- Monsieur Rahal NAFAT, titulaire de la carte nationale d’identité N° W9767, valable jusqu’au 04/07/2031.-----------------------------------------------------------------------------------------------
                                </p>
                                <p className="text-justify">
                                    <strong>AGISSANT:</strong> en qualité de gérant unique de la société dite <strong>«NAFAT IMMO» SARL à Associé Unique</strong>, au capital de 100.000,00 Dirhams, dont le siège social est à Agadir, Bureau N°3, 2ème Etage, Lot 314 D Riad Salam, inscrite au registre de commerce d’Agadir, sous le n° 44329, Identifiant Fiscal n°45975370. -----------------------------------------------------------------------------------------
                                </p>
                                <p className="text-justify">
                                    <strong>EN VERTU:</strong> des pouvoirs qui lui sont conférés à cet effet, -----------------------------------------
                                </p>
                                <p className="text-right font-bold tracking-wide">
                                    -------------------------------------------------------«LE PROMETTANT ES QUALITE» D’UNE PART
                                </p>
                            </div>

                            {/* Party 2: Buyer */}
                            <div className="space-y-0.5 pt-0.5">
                                <p className="font-bold text-slate-950 text-justify">
                                    2- Monsieur/Madame {clientName.toUpperCase()}, titulaire de la carte nationale d’identité N° {clientCin}, valable jusqu’au 07/04/2035.---------------------------------------------------------------------------------------
                                </p>
                                <p className="text-justify">
                                    <strong>AGISSANT:</strong> {client?.occupation?.toLowerCase().includes('société') || client?.occupation?.toLowerCase().includes('sarl') 
                                        ? `en qualité de gérant de la société «${clientName}»` 
                                        : `en son nom personnel, demeurant à ${clientAddress}${clientPhone ? `, Tél : ${clientPhone}` : ''}`}. ----------------------------------------------------------------------------------------------------------------------------------
                                </p>
                                <p className="text-justify">
                                    <strong>EN VERTU:</strong> des pouvoirs qui lui sont conférés à cet effet, -----------------------------------------
                                </p>
                                <p className="text-right font-bold tracking-wide">
                                    ------------------------------------------------- «LE BENEFICIAIRE ES QUALITE » D’AUTRE PART
                                </p>
                            </div>

                            {/* Opening Preamble */}
                            <p className="text-justify pt-0.5">
                                lesquels es qualité, ici présentes, ont requis Maître Saida DERRAJI, notaire soussigné, d'établir en la forme authentique et par la langue française conformément aux dispositions de la loi n° 32-09 organisant le Notariat Moderne, la convention ci-après, directement et librement arrêtée entre elles sans le concours ni la participation dudit notaire, qui n'en est que le rédacteur et ce, conformément au principe de l’autonomie de la volonté, tel que défini par la loi. --------------------------------------
                            </p>

                            {/* COMPROMIS DE VENTE IMMOBILIERE */}
                            <div className="text-center font-bold text-slate-950 tracking-wider py-0.5">
                                ------------------------ COMPROMIS DE VENTE IMMOBILIERE ------------------------
                            </div>

                            <p className="text-justify">
                                <strong>LA SOCIETE «NAFAT IMMO» S.A.R.L AU</strong>, représentée par Monsieur Rahal NAFAT, comparant d’une part, <strong>S’ENGAGE ET PROMET DE VENDRE</strong> en s’obligeant, à toutes les garanties ordinaires de fait et de droit les plus étendues en pareille matière, et notamment les dispositions du Dahir du 03 Octobre 2002, portant promulgation de la loi numéro 18-00 relative au statut de la copropriété des immeubles bâtis.tel qu’il a été modifié et complété par le dahir n° 1.16.49 du 27 Avril 2016 portant promulgation de la loi numéro 12-106. -------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                A <strong>{clientName.toUpperCase()}</strong>, comparant es qualité d’autre part, qui <strong>ACCEPTE D’ACQUERIR</strong> la totalité du bien immobilier ci-après désigné: ----------------------------------------------------------------------------------------------------
                            </p>

                            {/* DESIGNATION */}
                            <div className="text-center font-bold text-slate-950 tracking-wider py-0.5">
                                ----------------------------------------- DESIGNATION -----------------------------------------
                            </div>

                            <p className="text-justify">
                                La totalité de la propriété dite « <strong>{project?.project_name || 'MIMOSA'} - {apartment?.name}</strong> « sise à {city}, {project?.location || 'Lotissement Mimosa 2 Lot N° 15 Préfecture Ain Sebaâ- Hay Mohammadi Arrondissement Ain Sebaâ'}, faisant partie d’un immeuble sise à la même adresse, consistant en un appartement, en copropriété à usage d’habitation, situé au <strong>{floorLabel}, {project?.project_name || 'Immeuble'} {apartment?.name}</strong>, composé d’un hall, un salon, deux chambres, deux Salles de Bains, une cuisine, une chambre parents et un balcon, d’une superficie de <strong>{surfaceInWords} METRES CARRES ({surfaceM2} M²)</strong> dont ({surplombM2}m²) en surplomb y compris ({balconM2}m²) de balcon, portant la fraction divise N° 12-12a. ----------------------------------------------------------------------------
                            </p>
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                -------------------------------------------- Faisant l’objet du Titre Foncier numéro: {propertyTitle}
                            </div>
                            <p className="text-justify">
                                A titre indivis les 611/10000èmes des parties communes de l’immeuble, objet du titre foncier original numéro: {originalMotherTitle}. ------------------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Telle que ladite propriété existe, se poursuit et se comporte avec toutes ses appartenances et dépendances et tous les droits qui y sont rattachés sans aucune exception ni réserve, le bénéficiaire es qualité déclare bien connaître, le tout pour l’avoir vu et visitée en vue de la présente acquisition et n’en a pas demandé plus ample désignation. ----------------------------------------------------------
                            </p>

                            {/* ORIGINE DE PROPRIETE */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ---------------------- ----- ORIGINE DE PROPRIETE --------------------------------------------
                            </div>
                            <p className="text-justify">
                                Pour l’origine de propriété, les parties et qualité entendent expressément se référer aux énonciations portées au dossier du titre foncier précité, toutefois pour les besoins de l’enregistrement seulement, une origine de propriété complète sera établie dans l’acte de vente définitif. ------------------------
                            </p>
                        </div>

                        {/* Page 1 Footer */}
                        <div className="text-right pt-2 font-bold text-slate-950 text-sm">
                            1
                        </div>
                    </div>

                    {/* ================= PAGE 2 ================= */}
                    <div className="authentic-page bg-white p-6 sm:p-9 rounded-lg shadow-md border border-slate-300 text-[12px] sm:text-[12.5px] leading-[1.42] relative flex flex-col justify-between min-h-[960px]">
                        <div className="space-y-2">
                            {/* PROPRIETE – JOUISSANCE */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ------------------------------------------ PROPRIETE – JOUISSANCE ---------------------------------
                            </div>
                            <p className="text-justify">
                                Le bénéficiaire es qualité aura la pleine propriété des biens présentement vendus à compter du jour de l’inscription de l’acte définitif de vente sur les livres fonciers, conformément aux dispositions des articles 66 et 67 du dahir du 12 août 1913 relatifs aux immeubles immatriculés, tel qu’il a été modifié et complété par la loi N°14-07 du 22/11/2011. ----------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Et il en aura la jouissance par la prise de possession réelle et effective à leur profit, libre de toute location ou occupation quelconque à compter du jour de la signature de l’acte de compromis de vente. ------------------------------------------------------------------------------------------------------
                            </p>

                            {/* CHARGES ET CONDITIONS */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                -------------------------------- CHARGES ET CONDITIONS ------------------------------------------
                            </div>
                            <p className="text-justify">
                                Le présent compromis de vente a lieu sous les charges et conditions ordinaires de fait et de droit les plus étendues en pareille matière. -----------------------------------------------------------------------
                            </p>

                            {/* P R I X */}
                            <div className="text-center font-bold text-slate-950 tracking-widest py-0.5">
                                ---------------------------------------------- P R I X ---------------------------------------------
                            </div>
                            <p className="text-justify">
                                En outre, la vente aura lieu moyennant le prix principal et global de <strong>{priceInWords} Dirhams ({priceDh.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DHS)</strong>. -------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Sur lequel prix, le bénéficiaire es qualité à payer à titre d’avance la somme de <strong>{advanceInWords} Dirhams ({actualAdvance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DHS)</strong>, par virement en date du {firstPaymentDate}, hors la vue du Notaire soussigné et sans passer par sa comptabilité. -----------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Au promettant es qualité qui le reconnaît et lui en consent bonne et valable quittance d’autant. ----
                            </p>
                            <div className="text-right font-bold text-slate-950 tracking-wide">
                                --------------------------------------------------------------------------DONT QUITTANCE D’AUTANT
                            </div>
                            <p className="text-justify">
                                Quand au solde, soit la somme de <strong>{remainingInWords} Dirhams ({actualRemaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DHS)</strong>, le bénéficiaire es qualité s’engage à le payer au plus tard le jour fixé pour la réalisation de l’acte définitif de vente et sous réserve de la réalisation et l’obtention des conditions ci-après énoncées, ce qui est accepté par les parties es qualité--------------------------------------------------------------------------
                            </p>

                            {/* CONDITIONS SUSPENSIVES */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ---------------------------------------- CONDITIONS SUSPENSIVES --------------------------------
                            </div>
                            <p className="text-justify">
                                La réalisation du compromis de vente est soumise aux conditions suspensives ci-après énoncées, expressément acceptées par les parties es qualité. -------------------------------------------------
                            </p>
                            <div className="space-y-0.5 pl-1">
                                <p className="font-bold text-slate-950">*Pour le promettant es qualité: -----------------------------------------------------------------------</p>
                                <p className="text-justify">- de produire la mainlevée citée en dessous. -----------------------------------------------------------</p>
                                <p className="text-justify">- De produire l’attestation de paiement des impôts et taxes grevant la propriété sus désigné (Quitus fiscal).-------------------------------------------------------------------------------------------------------</p>
                                <p className="text-justify">- De payer tout impôt où taxe grevant la propriété dont il s’agit. ---------------------------------------</p>
                            </div>
                            <div className="space-y-0.5 pl-1 pt-0.5">
                                <p className="font-bold text-slate-950">*Pour le bénéficiaire es qualité : ----------------------------------------------------------------------</p>
                                <p className="text-justify">Le paiement du reliquat du prix de vente, soit au moyen de ses deniers personnels, soit au moyen d’un crédit destiné à financer l’acquisition de ladite propriété. -----------------------------------------</p>
                            </div>

                            {/* REALISATION DE L’ACTE DEFINITIF DE VENTE */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ---------------------- REALISATION DE L’ACTE DEFINITIF DE VENTE ---------------------------
                            </div>
                            <p className="text-justify">
                                L’acte définitif de vente doit se réaliser, soit au plus tard dans un délai de <strong>Deux Mois</strong> à compter de la signature des présentes, sous la condition suspensive de la réalisation et l’obtention des conditions ci-dessus énoncées. ---------------------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Passé ce délai le présent compromis de vente devient nul et sans effet et les parties es nom et qualité seront déliées de tout engagement. ---------------------------------------------------------------------
                            </p>
                        </div>

                        {/* Page 2 Footer */}
                        <div className="text-right pt-2 font-bold text-slate-950 text-sm">
                            2
                        </div>
                    </div>

                    {/* ================= PAGE 3 ================= */}
                    <div className="authentic-page bg-white p-6 sm:p-9 rounded-lg shadow-md border border-slate-300 text-[11.5px] sm:text-[12px] leading-[1.38] relative flex flex-col justify-between min-h-[960px]">
                        <div className="space-y-1.5">
                            {/* DECLARATION */}
                            <div className="text-center font-bold text-slate-950 tracking-widest py-0.5">
                                ---------------------------------------------- DECLARATION -------------------------------------------
                            </div>
                            <p className="text-justify">
                                Le promettant es qualité déclare que le bien présentement vendu n’est grevé d’aucune dette ou charge et qu’il ne fait l’objet d’aucune mesure conservatoire ou exécutoire. autre qu’une hypothèque en premier rang prise au profit du Crédit Agricole du Maroc pour sûreté et garantie d’un montant de <strong>Onze Millions de Dirhams (11.000.000,00 DHS)</strong>, inscrite à la conservation foncière le 01/07/2026, Dépôt Volume 148 N° 309------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Pour laquelle hypothèque, le promettant es qualité, s’oblige à en rapporter les mainlevées sur première sommation que lui en fera le notaire soussignée, le tout à la parfaite connaissance du bénéficiaire, qui déclare être parfaitement au courant de ces hypothèques et maintenir la présente acquisition. -------------------------------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Si contrairement aux déclarations qui précédent, lesdits biens étaient grevés d’une ou plusieurs inscriptions du chef du promettant és-qualité ou des précédents propriétaires, ce dernier s’oblige à en rapporter à ses frais la justification de leur radiation préalablement à l’inscription des présentes sur les livres fonciers et en tous les cas dans le mois de la dénonciation amiable qui lui en sera faite au siège social ci-après élu.--------------------------------------------------------------------------------
                            </p>

                            {/* INTERDICTION D'ALIENER OU D'HYPOTHEQUER */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ----------------- INTERDICTION D'ALIENER OU D'HYPOTHEQUER ------------------------------
                            </div>
                            <p className="text-justify">
                                Le promettant es qualité s'interdit tout acte de disposition ou acte conférant un droit réel, d'aliéner ou d'hypothéquer la propriété objet des présentes et ce jusqu'à la réalisation de la présente vente. -
                            </p>
                            <p className="text-justify">
                                Dans le cas où une hypothèque ou toute autre charge viendrait à être mentionnée au dossier du titre foncier précité, le promettant es qualité s'engage à en rapporter la justification de sa radiation au jour de la réalisation de l'acte définitif de vente. ---------------------------------------------------------
                            </p>

                            {/* ARTICLE 38 DE LA LOI 32-09 */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ------------------------------ ARTICLE 38 DE LA LOI 32-09 -----------------------------------------
                            </div>
                            <p className="text-justify">
                                Les comparants es qualité reconnaissent que la réception et l’assimilation du présent acte ne soulève pas la moindre difficulté, qu’ils dispensent le Notaire soussignée de se faire assister d’un interprète agrée prés les juridictions ou simplement ad hoc et se contentent de la lecture par eux–mêmes de la teneur de cet acte et de la traduction qui leur été donnée par ledit Notaire en Arabe dialectal. Ils reconnaissent que l’acte exprime leurs volontés réelles et s’interdisent de n’élever aucune contestation dans l’avenir. -------------------------------------------------------------------------------
                            </p>

                            {/* ARTICLE 42 DE LA LOI 32-09 */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ------------------------------- ARTICLE 42 DE LA LOI 32-09 ----------------------------------------
                            </div>
                            <p className="text-justify">
                                Usant de la faculté que leur est offerte d’exiger la rédaction du contrat en une autre langue que l’Arabe, les comparants es qualité ont demandé au Notaire soussignée de libeller leurs volontés et déclarations en langue Française, le déchargeant ainsi de toute responsabilité quant à l’application de l’article 42 de la loi 32-09. Ces mêmes comparants es qualité déclare expressément et dès à présent ne jamais vouloir se prévaloir de l’alinéa 4 de l’article 49 de la loi sus évoquée. -------------
                            </p>

                            {/* RECONNAISSANCE DE CONSEILS DONNES */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                -------------------------- RECONNAISSANCE DE CONSEILS DONNES ------------------------------
                            </div>
                            <p className="text-justify">
                                Conformément aux dispositions de la loi n° 32-09 organisant le Notariat Moderne, les parties es qualité reconnaissent expressément que le Notaire soussignée, leur a éclairci sur le contenu et les conséquences de leur transaction, et ce, sur les explications et les conseils, qui les leur ont été fait et donnés par le notaire soussigné, et déclarent qu’elles les approuvent sans aucune exception, ni réserve. -----------------------------------------------------------------------------------------------------
                            </p>

                            {/* ELECTION DE DOMICILE */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                -------------------------------- ELECTION DE DOMICILE ---------------------------------------------
                            </div>
                            <p className="text-justify">
                                Pour l'exécution des présentes et de leurs suites, les parties es qualité, déclarent élire domicile savoir:
                            </p>
                            <p className="text-justify">
                                --------------------------------------------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                - Le Promettant es qualité en son siège social. -----------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                - Le Bénéficiaire es qualité en son siège social. ----------------------------------------------------------
                            </p>

                            {/* LECTURE DES LOIS FISCALES */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                ------------------------------- LECTURE DES LOIS FISCALES ----------------------------------------
                            </div>
                            <p className="text-justify">
                                Avant de clore et conformément à la loi, Maître Saida DERRAJI, Notaire soussignée a donné lecture aux parties es qualité qui le reconnaissent des dispositions des articles 186, 187, 208, 217 et 220 du Code Générale des impôts, se rapportant aux sanctions applicables en cas de rectification de la base imposable et les sanctions pour fraude ou complicité de fraude et celles relatives au paiement tardif des impôts, ainsi que celles relatives au contrôle des prix ou déclarations estimatives.---------------
                            </p>
                            <p className="text-justify">
                                A cet égard, elles déclarent que le présent acte exprime l'intégralité du prix convenu et elles reconnaissent expressément avoir été informées par le Notaire soussigné des pénalités et sanctions encourues en cas d'inexactitude de cette affirmation. ---------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Il a été également donné aux parties es qualité lecture de l’article 143 et 218 du code général des impôts, instituant et réglementant les conditions d’exercice du droit de préemption au profit de L’ETAT, en cas d’insuffisance du prix de vente déclaré. -------------------------------------------------
                            </p>

                            {/* DISPENSE D’INTERPRETE */}
                            <div className="text-center font-bold text-slate-950 tracking-wide py-0.5">
                                -------------------------------- DISPENSE D’INTERPRETE --------------------------------------------
                            </div>
                            <p className="text-justify">
                                Les parties es qualité dispensent le Notaire soussignée de se faire assister par un Interprète Traducteur Assermenté, déclarant avoir parfaitement pris connaissance de la teneur des présentes,
                            </p>
                        </div>

                        {/* Page 3 Footer */}
                        <div className="text-right pt-2 font-bold text-slate-950 text-sm">
                            3
                        </div>
                    </div>

                    {/* ================= PAGE 4 ================= */}
                    <div className="authentic-page bg-white p-6 sm:p-9 rounded-lg shadow-md border border-slate-300 text-[12px] sm:text-[12.5px] leading-[1.42] relative flex flex-col justify-between min-h-[960px]">
                        <div className="space-y-2">
                            <p className="text-justify">
                                tant par elles-mêmes, que par la lecture et les explications, que leur en a faites le Notaire soussigné. Elles déclarent par conséquent, approuver les présentes sans réserve. --------------------------------
                            </p>

                            {/* DONT ACTE */}
                            <div className="text-right font-bold text-slate-950 tracking-wider py-1">
                                ------------------------------------------------------------------------------------------------DONT ACTE-
                            </div>

                            <p className="text-justify">
                                Fait et Passé à {city} ---------------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                En l’étude du notaire soussignée --------------------------------------------------------------------------
                            </p>
                            <p className="text-justify">
                                Et après lecture faite, les Parties es qualité ont signé avec le notaire soussignée.---------------------
                            </p>
                            <p className="text-justify font-semibold py-1">
                                Acte rédigé sur <strong>Quatre (04) pages</strong>, sans mot ni chiffre annulé et sans renvoi ni blanc avec Soixante Neuf (69) traits sur les blancs.
                            </p>

                            {/* Authentic Signatures Table (3 distinct columns) */}
                            <div className="border border-slate-950 mt-4">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-950">
                                            <th className="w-[34%] border-r border-slate-950 p-1.5"></th>
                                            <th className="w-[33%] border-r border-slate-950 p-1.5 font-bold text-center text-slate-950 text-xs">
                                                <span className="underline">Signatures</span>
                                            </th>
                                            <th className="w-[33%] p-1.5 font-bold text-center text-slate-950 text-xs">
                                                <span className="underline">Date et l’heure du signature</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-950">
                                        {/* Row 1: Promettant */}
                                        <tr>
                                            <td className="p-2.5 border-r border-slate-950 align-top text-center text-xs">
                                                <div className="font-bold space-y-0.5 text-slate-950">
                                                    <p><span className="underline">Le promettant</span></p>
                                                    <p><span className="underline">La Société «NAFAT IMMO »Sarl Au</span></p>
                                                    <p><span className="underline font-normal">Représentée par</span></p>
                                                    <p><span className="underline">Monsieur Rahal NAFAT</span></p>
                                                    <p><span className="underline">Es Qualité</span></p>
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-slate-950 h-24 align-middle text-center">
                                                {/* Space for physical signature / stamp */}
                                            </td>
                                            <td className="p-2 h-24 align-middle text-center">
                                                {/* Space for date and time */}
                                            </td>
                                        </tr>

                                        {/* Row 2: Bénéficiaire */}
                                        <tr>
                                            <td className="p-2.5 border-r border-slate-950 align-top text-center text-xs">
                                                <div className="font-bold space-y-0.5 text-slate-950">
                                                    <p><span className="underline">Le bénéficiaire</span></p>
                                                    {(client as any)?.type === 'Entreprise' || (client as any)?.company_name ? (
                                                        <>
                                                            <p><span className="underline">La Société « {(client as any)?.company_name || clientName}» SARL</span></p>
                                                            <p><span className="underline font-normal">Représentée par</span></p>
                                                            <p><span className="underline">{clientName}</span></p>
                                                            <p><span className="underline">Es Qualité</span></p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p><span className="underline">{clientName.toUpperCase()}</span></p>
                                                            <p><span className="underline font-normal">Représentée par</span></p>
                                                            <p><span className="underline">{clientName}</span></p>
                                                            <p><span className="underline">Es Qualité</span></p>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-slate-950 h-24 align-middle text-center">
                                                {/* Space for physical signature / stamp */}
                                            </td>
                                            <td className="p-2 h-24 align-middle text-center">
                                                {/* Space for date and time */}
                                            </td>
                                        </tr>

                                        {/* Row 3: Notaire */}
                                        <tr>
                                            <td className="p-2.5 border-r border-slate-950 align-top text-center text-xs">
                                                <div className="font-bold space-y-1 text-slate-950">
                                                    <p><span className="underline">Le Notaire</span></p>
                                                    <p>Maître Saida DERRAJI</p>
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-slate-950 h-24 align-middle text-center">
                                                {/* Space for notary signature & seal */}
                                            </td>
                                            <td className="p-2 h-24 align-middle text-center">
                                                {/* Space for date and time */}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Page 4 Footer */}
                        <div className="text-right pt-3 font-bold text-slate-950 text-sm">
                            4
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthenticContractModal;
