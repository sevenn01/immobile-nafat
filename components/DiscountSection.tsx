import React, { useState, useEffect } from 'react';
import { Tag, ShieldCheck, Lock, Percent, DollarSign, AlertCircle, Sparkles } from 'lucide-react';

interface DiscountSectionProps {
    catalogPrice: number;
    canDiscount: boolean;
    initialDiscountDh?: number;
    initialReason?: string;
    onChange: (data: {
        isApplied: boolean;
        discountDh: number;
        discountPercentage: number;
        discountReason: string;
        finalNetPrice: number;
    }) => void;
}

export const DiscountSection: React.FC<DiscountSectionProps> = ({
    catalogPrice,
    canDiscount,
    initialDiscountDh = 0,
    initialReason = '',
    onChange,
}) => {
    const [isApplied, setIsApplied] = useState<boolean>(initialDiscountDh > 0);
    const [mode, setMode] = useState<'amount' | 'percentage'>('amount');
    const [amountValue, setAmountValue] = useState<string>(initialDiscountDh > 0 ? String(initialDiscountDh) : '');
    const [percentageValue, setPercentageValue] = useState<string>(
        initialDiscountDh > 0 && catalogPrice > 0 
            ? String(((initialDiscountDh / catalogPrice) * 100).toFixed(2)) 
            : ''
    );
    const [reason, setReason] = useState<string>(initialReason);

    // Calculate derived discount in DH
    let calculatedDiscountDh = 0;
    if (isApplied && canDiscount && catalogPrice > 0) {
        if (mode === 'amount') {
            const rawVal = parseFloat(amountValue) || 0;
            calculatedDiscountDh = Math.min(catalogPrice, Math.max(0, rawVal));
        } else {
            const rawPct = parseFloat(percentageValue) || 0;
            const validPct = Math.min(100, Math.max(0, rawPct));
            calculatedDiscountDh = (catalogPrice * validPct) / 100;
        }
    }

    const calculatedPercentage = catalogPrice > 0 ? (calculatedDiscountDh / catalogPrice) * 100 : 0;
    const finalNetPrice = Math.max(0, catalogPrice - calculatedDiscountDh);

    // Notify parent whenever calculations change
    useEffect(() => {
        onChange({
            isApplied: isApplied && canDiscount && calculatedDiscountDh > 0,
            discountDh: calculatedDiscountDh,
            discountPercentage: Number(calculatedPercentage.toFixed(2)),
            discountReason: reason,
            finalNetPrice: finalNetPrice,
        });
    }, [isApplied, canDiscount, calculatedDiscountDh, calculatedPercentage, reason, finalNetPrice]);

    const handleAmountChange = (val: string) => {
        setAmountValue(val);
        const num = parseFloat(val) || 0;
        if (catalogPrice > 0) {
            setPercentageValue(num > 0 ? ((num / catalogPrice) * 100).toFixed(2) : '');
        }
    };

    const handlePercentageChange = (val: string) => {
        setPercentageValue(val);
        const pct = parseFloat(val) || 0;
        if (catalogPrice > 0) {
            setAmountValue(pct > 0 ? Math.round((catalogPrice * pct) / 100).toString() : '');
        }
    };

    const applyQuickPreset = (pct: number) => {
        setIsApplied(true);
        setMode('percentage');
        setPercentageValue(String(pct));
        if (catalogPrice > 0) {
            setAmountValue(Math.round((catalogPrice * pct) / 100).toString());
        }
    };

    if (!canDiscount) {
        return (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Remises commerciales : <strong>Réservées aux Administrateurs autorisés</strong></span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200/80 px-2 py-0.5 rounded text-slate-600">
                    Protégé
                </span>
            </div>
        );
    }

    return (
        <div className="border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-teal-50/20 to-white rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <Tag className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Remise Commerciale</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Accès Admin
                            </span>
                        </div>
                        <p className="text-[11px] text-emerald-700/80">Accorder un rabais officiel sur le prix catalogue</p>
                    </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={isApplied} 
                        onChange={(e) => setIsApplied(e.target.checked)} 
                        className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
            </div>

            {isApplied && (
                <div className="space-y-3 pt-3 border-t border-emerald-100/80 animate-fade-in">
                    {/* Mode Selector */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-emerald-100/70 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setMode('amount')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 flex-1 sm:flex-initial ${
                                    mode === 'amount'
                                        ? 'bg-white text-emerald-900 shadow-sm'
                                        : 'text-emerald-700 hover:text-emerald-900'
                                }`}
                            >
                                <DollarSign className="w-3.5 h-3.5" />
                                Montant Fixe (DH)
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('percentage')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 flex-1 sm:flex-initial ${
                                    mode === 'percentage'
                                        ? 'bg-white text-emerald-900 shadow-sm'
                                        : 'text-emerald-700 hover:text-emerald-900'
                                }`}
                            >
                                <Percent className="w-3.5 h-3.5" />
                                Pourcentage (%)
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="hidden sm:flex items-center gap-1.5 ml-auto">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Presets:</span>
                            {[2, 3, 5, 7, 10].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => applyQuickPreset(p)}
                                    className="px-2 py-1 text-[11px] font-bold bg-white hover:bg-emerald-100/60 text-emerald-800 rounded-lg border border-emerald-200/80 transition-colors"
                                >
                                    -{p}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                                {mode === 'amount' ? 'Montant de la remise (DH)' : 'Pourcentage de la remise (%)'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={mode === 'amount' ? catalogPrice : 100}
                                    value={mode === 'amount' ? amountValue : percentageValue}
                                    onChange={(e) => mode === 'amount' ? handleAmountChange(e.target.value) : handlePercentageChange(e.target.value)}
                                    placeholder={mode === 'amount' ? "Ex: 20000" : "Ex: 5"}
                                    className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-sm font-bold text-emerald-950 pr-10"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-emerald-600">
                                    {mode === 'amount' ? 'DH' : '%'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                                Motif / Justification de la remise <span className="text-emerald-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: Geste commercial, Accord Direction, Offre Salon..."
                                className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-sm font-medium text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Quick presets mobile */}
                    <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase shrink-0">Presets:</span>
                        {[2, 3, 5, 7, 10].map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => applyQuickPreset(p)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-white text-emerald-800 rounded border border-emerald-200 shrink-0"
                            >
                                -{p}%
                            </button>
                        ))}
                    </div>

                    {/* Real-time Financial Breakdown */}
                    {calculatedDiscountDh > 0 && (
                        <div className="p-3.5 bg-emerald-900 text-white rounded-xl space-y-2 shadow-inner">
                            <div className="flex items-center justify-between text-xs text-emerald-200">
                                <span>Prix Catalogue Officiel :</span>
                                <span className="font-semibold">{catalogPrice.toLocaleString()} DH</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                    Remise accordée ({calculatedPercentage.toFixed(1)}%) :
                                </span>
                                <span className="font-bold text-amber-300">- {Math.round(calculatedDiscountDh).toLocaleString()} DH</span>
                            </div>
                            <div className="pt-2 border-t border-emerald-800 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Prix Net Final de Vente :</span>
                                <span className="text-base font-extrabold text-emerald-300">
                                    {Math.round(finalNetPrice).toLocaleString()} DH
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DiscountSection;
