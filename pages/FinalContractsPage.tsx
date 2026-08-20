import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getContracts, getClients, getApartments, getProjects, getPayments, updateContract } from '../services/api';
import { Contract, Client, Apartment, ContractStatus, Project, Payment, PaymentStatus } from '../types';
import { 
    Search, 
    FileText, 
    Printer, 
    Eye, 
    User, 
    CheckCircle2, 
    ChevronRight, 
    AlertCircle, 
    Sparkles, 
    Pencil, 
    Check, 
    X, 
    Download,
    PlusCircle,
    FileCheck,
    Clock,
    Tag,
    Building,
    LayoutGrid,
    Table as TableIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import CreateFinalContractModal from '../components/CreateFinalContractModal';

type FilterTab = 'all' | 'created' | 'pending' | 'completed_paid';
type ViewMode = 'table' | 'cards';

export const FinalContractsPage: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Modal state for previewing the printable legal contract
    const [selectedContractForPreview, setSelectedContractForPreview] = useState<Contract | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // Modal state for Creating / Editing the final contract
    const [selectedContractForAction, setSelectedContractForAction] = useState<Contract | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);

    // Inline notes edit state
    const [editingContractId, setEditingContractId] = useState<string | null>(null);
    const [editingNotesText, setEditingNotesText] = useState<string>('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleSaveNotes = async (contractId: string) => {
        if (!user) return;
        try {
            setUpdatingId(contractId);
            await updateContract(contractId, { notes: editingNotesText }, user.id);
            setContracts(prev => prev.map(c => c.id === contractId ? { ...c, notes: editingNotesText } : c));
            setEditingContractId(null);
        } catch (error) {
            console.error('Error updating contract notes:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ctrs, cls, apts, projs, pays] = await Promise.all([
                getContracts(),
                getClients(),
                getApartments(),
                getProjects(),
                getPayments()
            ]);
            setContracts(ctrs);
            setClients(cls);
            setApartments(apts);
            setProjects(projs);
            setPayments(pays);
        } catch (error) {
            console.error('Error fetching data for contracts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // All active sales/reservations across all clients
    const reservationContracts = useMemo(() => {
        const saleContracts = contracts.filter(c => 
            c.type === 'sale' && 
            c.status !== ContractStatus.Canceled && 
            c.status !== ContractStatus.SaleCanceled
        );
        
        return saleContracts.map(contract => {
            const client = clients.find(cl => cl.id === contract.client_id);
            const apartment = apartments.find(a => a.id === contract.apartment_id);
            const project = projects.find(p => p.id === contract.project_id);
            
            // Sum all PAID payments
            const contractPayments = payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid);
            const totalPaid = contractPayments.reduce((sum, p) => sum + p.amount_dh, 0);
            const remaining = Math.max(0, contract.amount_dh - totalPaid);
            const isFullyPaid = remaining <= 0 || contract.status === ContractStatus.SaleCompleted;
            const isContractCreated = Boolean(contract.final_contract_created);
            const effectiveTitre = contract.contract_titre || apartment?.titre || '';

            return {
                ...contract,
                client,
                apartment,
                project,
                totalPaid,
                remaining,
                isFullyPaid,
                isContractCreated,
                effectiveTitre
            };
        }).filter(item => item.client && item.apartment); // Must have valid client & apartment
    }, [contracts, clients, apartments, projects, payments]);

    // Filtered by Search, Project, and Tab
    const filteredContracts = useMemo(() => {
        return reservationContracts.filter(item => {
            // Project filter
            if (selectedProjectId !== 'all' && item.project_id !== selectedProjectId) {
                return false;
            }

            // Tab filter
            if (activeTab === 'created' && !item.isContractCreated) return false;
            if (activeTab === 'pending' && item.isContractCreated) return false;
            if (activeTab === 'completed_paid' && !item.isFullyPaid) return false;

            // Search filter
            if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                const clientName = item.client?.full_name?.toLowerCase() || '';
                const aptName = item.apartment?.name?.toLowerCase() || '';
                const projectName = item.project?.project_name?.toLowerCase() || '';
                const cin = item.client?.cin_number?.toLowerCase() || '';
                const titre = item.effectiveTitre.toLowerCase();
                const ref = (item.final_contract_reference || '').toLowerCase();

                return clientName.includes(searchLower) ||
                       aptName.includes(searchLower) ||
                       projectName.includes(searchLower) ||
                       cin.includes(searchLower) ||
                       titre.includes(searchLower) ||
                       ref.includes(searchLower);
            }

            return true;
        });
    }, [reservationContracts, selectedProjectId, activeTab, searchTerm]);

    // Counts for tabs
    const counts = useMemo(() => {
        return {
            all: reservationContracts.length,
            created: reservationContracts.filter(c => c.isContractCreated).length,
            pending: reservationContracts.filter(c => !c.isContractCreated).length,
            completed_paid: reservationContracts.filter(c => c.isFullyPaid).length,
        };
    }, [reservationContracts]);

    const projectsList = useMemo(() => {
        const projIds = Array.from(new Set(reservationContracts.map(c => c.project_id).filter(Boolean)));
        return projIds.map(id => projects.find(p => p.id === id)).filter(Boolean) as Project[];
    }, [reservationContracts, projects]);

    const handleOpenCreateModal = (contract: Contract, isEditing = false) => {
        setSelectedContractForAction(contract);
        setIsEditingMode(isEditing);
        setIsCreateModalOpen(true);
    };

    const handleOpenPreviewModal = (contract: Contract) => {
        setSelectedContractForPreview(contract);
        setIsPreviewModalOpen(true);
    };

    const handleExportProject = (projectId: string, projectName: string) => {
        const projectContracts = reservationContracts.filter(c => c.project_id === projectId);
        if (projectContracts.length === 0) return;

        const headers = [
            "Client",
            "CIN",
            "Téléphone",
            "Adresse",
            "Projet",
            "Bien / Appartement",
            "Titre Foncier",
            "Statut Contrat",
            "Réf Acte",
            "Date Acte",
            "Prix Convenu (DH)",
            "Montant Réglé (DH)",
            "Reliquat (DH)",
            "Observations"
        ];

        const rows = projectContracts.map(item => {
            const clientName = item.client?.full_name || '';
            const cin = item.client?.cin_number || '';
            const phone = item.client?.phone || '';
            const address = item.client?.address || '';
            const projName = item.project?.project_name || '';
            const aptName = item.apartment?.name || '';
            const titre = item.effectiveTitre || 'Non renseigné';
            const contractStatus = item.isContractCreated ? 'Contrat Définitif Établi' : 'En Attente';
            const ref = item.final_contract_reference || '';
            const contractDate = item.final_contract_date || item.start_date || '';
            const price = item.amount_dh || 0;
            const totalPaid = item.totalPaid || 0;
            const remaining = item.remaining || 0;
            const notes = item.notes || '';

            const escapeCSV = (val: any) => {
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            };

            return [
                escapeCSV(clientName),
                escapeCSV(cin),
                escapeCSV(phone),
                escapeCSV(address),
                escapeCSV(projName),
                escapeCSV(aptName),
                escapeCSV(titre),
                escapeCSV(contractStatus),
                escapeCSV(ref),
                escapeCSV(contractDate),
                price,
                totalPaid,
                remaining,
                escapeCSV(notes)
            ].join(';');
        });

        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Contrats_${projectName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('legal-contract-print-area');
        if (!printContent) return;
        
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body {
                    background: white !important;
                    color: black !important;
                    font-family: 'Times New Roman', Times, serif !important;
                    padding: 1.5cm !important;
                }
                .no-print {
                    display: none !important;
                }
                .print-card {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                h1, h2, h3 {
                    color: black !important;
                    text-align: center !important;
                }
                hr {
                    border-color: black !important;
                }
            }
        `;
        document.head.appendChild(style);
        window.print();
        document.head.removeChild(style);
    };

    const previewData = selectedContractForPreview 
        ? reservationContracts.find(c => c.id === selectedContractForPreview.id) 
        : null;

    const actionData = selectedContractForAction
        ? reservationContracts.find(c => c.id === selectedContractForAction.id)
        : null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-gray-500 font-medium animate-pulse">Chargement des contrats et dossiers clients...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between border-b border-gray-100 pb-5">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Gestion des Actes & Contrats de Vente
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Contrats de Vente Définitifs
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 max-w-3xl">
                        Retrouvez l'ensemble des clients ayant réservé un bien. Vous pouvez établir l'acte de vente officiel pour chaque client avec intégration automatique du titre foncier, imprimer le document légal et apporter les modifications nécessaires.
                    </p>
                </div>
            </div>

            {/* Filter Tabs & Project Selection */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'all'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>Tous les Dossiers Réservés</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700">
                            {counts.all}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('created')}
                        className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'created'
                                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                                : 'text-slate-600 hover:text-emerald-700'
                        }`}
                    >
                        <FileCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        <span>Contrats Établis</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            {counts.created}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'pending'
                                ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
                                : 'text-slate-600 hover:text-amber-700'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                        <span>En Attente de Création</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800">
                            {counts.pending}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('completed_paid')}
                        className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'completed_paid'
                                ? 'bg-white text-indigo-800 shadow-xs border border-indigo-200'
                                : 'text-slate-600 hover:text-indigo-700'
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                        <span>100% Soldés</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                            {counts.completed_paid}
                        </span>
                    </button>
                </div>

                {/* Project Filter Selector */}
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs w-full sm:w-auto"
                    >
                        <option value="all">Tous les Projets ({projectsList.length})</option>
                        {projectsList.map(p => (
                            <option key={p.id} value={p.id}>{p.project_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Search & Action Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher par client, CIN, appartement, titre foncier, projet..."
                        className="block w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-400 font-medium bg-gray-50/50"
                    />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-xs sm:text-sm font-semibold text-gray-500 whitespace-nowrap">
                        {filteredContracts.length} dossier(s)
                    </div>

                    {/* View Switcher (Table / Cards) */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                                viewMode === 'table'
                                    ? 'bg-white text-emerald-800 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                            title="Vue Tableau (colonnes fixes)"
                        >
                            <TableIcon className="w-4 h-4" />
                            <span className="hidden md:inline text-xs">Tableau</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                                viewMode === 'cards'
                                    ? 'bg-white text-emerald-800 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                            title="Vue Cartes / Grille (très visible)"
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="hidden md:inline text-xs">Cartes</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Export Section separated by project */}
            {projectsList.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-150 p-4 rounded-2xl shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Extraire les dossiers de contrats par projet
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {projectsList.map(proj => {
                            const count = reservationContracts.filter(c => c.project_id === proj.id).length;
                            return (
                                <button
                                    key={proj.id}
                                    onClick={() => handleExportProject(proj.id, proj.project_name)}
                                    className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-emerald-50/60 border border-gray-200 hover:border-emerald-200 text-xs font-semibold text-gray-700 rounded-xl transition-all shadow-2xs space-x-2 cursor-pointer group"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-110 transition-transform"></span>
                                    <span className="font-bold">{proj.project_name}</span>
                                    <span className="bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">{count} dossier(s)</span>
                                    <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Content (Table or Cards View) */}
            {filteredContracts.length > 0 ? (
                viewMode === 'table' ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto overflow-y-auto max-h-[480px] relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            <table className="min-w-full divide-y divide-gray-200 text-left border-collapse">
                                <thead className="sticky top-0 z-30 bg-gray-100 text-gray-700 font-bold text-xs uppercase tracking-wider shadow-xs">
                                    <tr>
                                        <th scope="col" className="px-4 py-3.5 text-left bg-gray-100">
                                            Client & CIN
                                        </th>
                                        <th scope="col" className="px-4 py-3.5 text-left bg-gray-100">
                                            Bien & Titre
                                        </th>
                                        <th scope="col" className="px-4 py-3.5 text-left bg-gray-100">
                                            Prix & Règlements
                                        </th>
                                        <th scope="col" className="px-4 py-3.5 text-center bg-gray-100">
                                            Statut Acte
                                        </th>
                                        <th scope="col" className="px-4 py-3.5 text-left bg-gray-100 hidden lg:table-cell">
                                            Remarques
                                        </th>
                                        {/* STICKY RIGHT ACTIONS COLUMN (Opaque) */}
                                        <th 
                                            scope="col" 
                                            className="sticky right-0 top-0 bg-gray-200 px-4 py-3.5 text-center text-xs font-bold text-gray-800 shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.1)] z-40"
                                        >
                                            Actions Rapides
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredContracts.map((item) => {
                                        const percent = item.amount_dh > 0 ? Math.min(100, Math.round((item.totalPaid / item.amount_dh) * 100)) : 0;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                {/* Client */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2.5">
                                                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 shrink-0">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 leading-tight">{item.client?.full_name}</div>
                                                            <div className="text-xs text-gray-500 font-medium">CIN: {item.client?.cin_number}</div>
                                                            {item.client?.phone && (
                                                                <div className="text-[11px] text-gray-400">{item.client.phone}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Apartment & Project & Titre */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div>
                                                        <div className="flex items-center space-x-1.5">
                                                            <span className="text-sm font-bold text-gray-900">{item.apartment?.name}</span>
                                                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                {item.project?.project_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 mt-0.5">
                                                            {item.apartment?.floor === 'RDC' ? 'Rez-de-chaussée' : `Étage ${item.apartment?.floor}`} • {item.apartment?.surface_m2} m²
                                                        </div>
                                                        <div className="mt-1">
                                                            {item.effectiveTitre ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                                                    <Tag className="w-3 h-3 mr-1 text-amber-600" />
                                                                    {item.effectiveTitre}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                                                    Titre à définir
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Price & Payments */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="space-y-1 min-w-[140px]">
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {item.amount_dh.toLocaleString()} DH
                                                        </div>
                                                        <div className="flex items-center space-x-1.5">
                                                            <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${item.isFullyPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-500">{percent}%</span>
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">
                                                            Payé: <strong className="text-emerald-700">{item.totalPaid.toLocaleString()} DH</strong>
                                                            {item.remaining > 0 && (
                                                                <span> • Reste: <strong className="text-amber-600">{item.remaining.toLocaleString()} DH</strong></span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Contract Status */}
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    {item.isContractCreated ? (
                                                        <div className="inline-flex flex-col items-center space-y-0.5">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> ACTE ÉTABLI
                                                            </span>
                                                            {item.final_contract_date && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {new Date(item.final_contract_date).toLocaleDateString('fr-FR')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex flex-col items-center space-y-0.5">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                <Clock className="w-3 h-3 mr-1 text-amber-500" /> EN ATTENTE
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">À contractualiser</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Notes (hidden on smaller viewports to give space) */}
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    {editingContractId === item.id ? (
                                                        <div className="flex items-center space-x-1.5 min-w-[130px]">
                                                            <input
                                                                type="text"
                                                                value={editingNotesText}
                                                                onChange={(e) => setEditingNotesText(e.target.value)}
                                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                                                placeholder="Observations..."
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => handleSaveNotes(item.id)}
                                                                disabled={updatingId === item.id}
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                                title="Enregistrer"
                                                            >
                                                                {updatingId === item.id ? (
                                                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-600" />
                                                                ) : (
                                                                    <Check className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingContractId(null)}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                                                                title="Annuler"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center space-x-1 group max-w-[140px]">
                                                            <span className="text-xs text-gray-600 truncate font-medium block">
                                                                {item.notes || <span className="text-gray-400 italic font-normal">Aucune</span>}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingContractId(item.id);
                                                                    setEditingNotesText(item.notes || '');
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Modifier"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* STICKY RIGHT ACTIONS (Solid Opaque Background) */}
                                                <td className="sticky right-0 bg-white group-hover:bg-slate-50 px-4 py-3 whitespace-nowrap text-center text-sm font-medium shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.08)] z-20">
                                                    <div className="flex items-center justify-center space-x-1.5 bg-inherit">
                                                        {item.isContractCreated ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenPreviewModal(item)}
                                                                    className="inline-flex items-center px-3 py-1.5 border border-emerald-300 rounded-xl shadow-xs text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer"
                                                                    title="Voir l'acte de vente officiel"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                                    <span>Voir l'Acte</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenCreateModal(item, true)}
                                                                    className="inline-flex items-center p-1.5 border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                                                                    title="Modifier les données de l'acte (titre, date, notaire...)"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleOpenCreateModal(item, false)}
                                                                className="inline-flex items-center px-3.5 py-1.5 rounded-xl shadow-xs text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all hover:shadow cursor-pointer space-x-1"
                                                                title="Établir le contrat officiel pour ce client"
                                                            >
                                                                <PlusCircle className="w-3.5 h-3.5" />
                                                                <span>Créer Contrat</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => navigate(`/clients/${item.client_id}`)}
                                                            className="inline-flex items-center p-1.5 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                                            title="Consulter la fiche client"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Table Footer with count & scroll indicator */}
                        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 font-medium">
                            <span>Affichage de <strong>{filteredContracts.length}</strong> dossiers</span>
                            {filteredContracts.length > 5 && (
                                <span className="text-[11px] text-slate-400 italic">Défilez vers le bas pour voir l'ensemble des dossiers ↓</span>
                            )}
                        </div>
                    </div>
                ) : (
                    /* CARDS VIEW: 100% visible, no horizontal scroll, beautiful & direct */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContracts.map((item) => {
                            const percent = item.amount_dh > 0 ? Math.min(100, Math.round((item.totalPaid / item.amount_dh) * 100)) : 0;
                            return (
                                <div 
                                    key={item.id}
                                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                                >
                                    {/* Top Card Header */}
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center space-x-2.5">
                                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700 shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-extrabold text-gray-900">{item.client?.full_name}</h4>
                                                    <p className="text-xs text-gray-500 font-medium">CIN: {item.client?.cin_number}</p>
                                                </div>
                                            </div>
                                            {item.isContractCreated ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> ACTE ÉTABLI
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                                    <Clock className="w-3 h-3 mr-1 text-amber-500" /> EN ATTENTE
                                                </span>
                                            )}
                                        </div>

                                        {/* Property info */}
                                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900">{item.apartment?.name}</span>
                                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                    {item.project?.project_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{item.apartment?.floor === 'RDC' ? 'RDC' : `Étage ${item.apartment?.floor}`} • {item.apartment?.surface_m2} m²</span>
                                                {item.effectiveTitre ? (
                                                    <span className="inline-flex items-center font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                                        <Tag className="w-2.5 h-2.5 mr-0.5 text-amber-600" /> {item.effectiveTitre}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic">Titre à définir</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial Progress */}
                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-gray-700">Prix total:</span>
                                                <span className="text-gray-900">{item.amount_dh.toLocaleString()} DH</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${item.isFullyPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-gray-500">
                                                <span>Payé: <strong className="text-emerald-700">{item.totalPaid.toLocaleString()} DH</strong> ({percent}%)</span>
                                                {item.remaining > 0 && (
                                                    <span>Reste: <strong className="text-amber-600">{item.remaining.toLocaleString()} DH</strong></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons: Visible & Clear */}
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => navigate(`/clients/${item.client_id}`)}
                                            className="inline-flex items-center px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                            title="Fiche client"
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1" /> Fiche
                                        </button>

                                        {item.isContractCreated ? (
                                            <div className="flex items-center space-x-1.5">
                                                <button
                                                    onClick={() => handleOpenCreateModal(item, true)}
                                                    className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-slate-50 transition-colors"
                                                    title="Modifier l'acte"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenPreviewModal(item)}
                                                    className="inline-flex items-center px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 transition-all shadow-xs"
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                                    <span>Voir l'Acte</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenCreateModal(item, false)}
                                                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:shadow space-x-1.5"
                                            >
                                                <PlusCircle className="w-3.5 h-3.5" />
                                                <span>Créer le Contrat</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun dossier trouvé</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        {searchTerm 
                            ? "Aucun résultat ne correspond à vos critères de recherche. Essayez avec un autre mot-clé."
                            : "Tous les clients ayant réservé un bien immobilier apparaîtront ici pour vous permettre d'établir leurs contrats de vente définitifs."}
                    </p>
                    {searchTerm ? (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-bold rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Effacer la recherche
                        </button>
                    ) : (
                        <Link
                            to="/reservations"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                        >
                            Consulter les Réservations <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                    )}
                </div>
            )}

            {/* Create / Edit Final Contract Modal */}
            {isCreateModalOpen && actionData && (
                <CreateFinalContractModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setSelectedContractForAction(null);
                    }}
                    contract={actionData}
                    client={actionData.client}
                    apartment={actionData.apartment}
                    project={actionData.project}
                    payments={payments}
                    isEditing={isEditingMode}
                    onSuccess={() => {
                        fetchData();
                    }}
                />
            )}

            {/* Legal Contract Preview Modal (Printable) */}
            <Modal
                title="Acte de Vente Définitif"
                isOpen={isPreviewModalOpen}
                onClose={() => {
                    setIsPreviewModalOpen(false);
                    setSelectedContractForPreview(null);
                }}
            >
                {previewData && (
                    <div className="space-y-6">
                        {/* Header toolbar */}
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 no-print flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    {previewData.final_contract_reference || `ACTE-${previewData.apartment?.name}`}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {
                                        setIsPreviewModalOpen(false);
                                        handleOpenCreateModal(previewData, true);
                                    }}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> Modifier l'Acte
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                >
                                    <Printer className="w-4 h-4 mr-1.5" /> Imprimer l'Acte
                                </button>
                            </div>
                        </div>

                        {/* Printable Document Area */}
                        <div 
                            id="legal-contract-print-area" 
                            className="print-card bg-slate-50 border border-gray-200 rounded-2xl p-8 max-h-[600px] overflow-y-auto font-serif text-gray-800 text-sm leading-relaxed shadow-inner"
                        >
                            {/* Document Header */}
                            <div className="text-center space-y-2 mb-8">
                                <h2 className="text-xl font-bold uppercase tracking-wide text-gray-900">
                                    ACTE DE VENTE DÉFINITIF
                                </h2>
                                <p className="text-xs italic text-gray-500">
                                    {previewData.notary_name ? `Rédigé sous la forme : ${previewData.notary_name}` : 'Fait sous seing privé en double exemplaire'}
                                </p>
                                {previewData.final_contract_reference && (
                                    <p className="text-[11px] font-mono font-bold text-gray-700">
                                        Réf : {previewData.final_contract_reference}
                                    </p>
                                )}
                                <div className="w-32 h-1 bg-gray-900 mx-auto mt-2"></div>
                            </div>

                            {/* Section: Parties */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">
                                    ENTRE LES SOUSSIGNÉS :
                                </h3>
                                <div className="pl-4">
                                    <p className="font-bold text-gray-900">1. La société NAFAT IMMOBILIER S.A.R.L</p>
                                    <p className="text-xs text-gray-600 pl-4">
                                        Société au capital de 100 000 DH, dont le siège social est situé à Tétouan, Maroc, 
                                        représentée légalement par son Gérant, ci-après dénommée le <strong>"VENDEUR"</strong>.
                                    </p>
                                </div>
                                <div className="pl-4">
                                    <p className="font-bold text-gray-900">2. M. / Mme. {previewData.client?.full_name}</p>
                                    <p className="text-xs text-gray-600 pl-4">
                                        Titulaire du CIN / Passeport n° <strong>{previewData.client?.cin_number}</strong>, 
                                        demeurant à l'adresse suivante : {previewData.client?.address || 'Non renseignée'}, 
                                        téléphone : {previewData.client?.phone || 'Non renseigné'}, 
                                        ci-après dénommé(e) l'<strong>"ACQUÉREUR"</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Section: Objet */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">
                                    OBJET DE LA VENTE :
                                </h3>
                                <p className="text-xs">
                                    Le VENDEUR vend et cède en toute propriété, sous les garanties ordinaires de droit et de fait, à l'ACQUÉREUR, qui accepte, le bien immobilier désigné ci-après :
                                </p>
                                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-gray-500 font-medium">Projet :</span> <strong className="text-gray-900">{previewData.project?.project_name}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Type :</span> <strong className="text-gray-900 uppercase">{previewData.apartment?.type === 'garage' ? 'Garage' : 'Appartement'}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Désignation :</span> <strong className="text-gray-900">{previewData.apartment?.name}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Étage :</span> <strong className="text-gray-900">{previewData.apartment?.floor === 'RDC' ? 'Rez-de-chaussée' : `Étage ${previewData.apartment?.floor}`}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Surface habitable :</span> <strong className="text-gray-900">{previewData.apartment?.surface_m2} m²</strong></div>
                                        <div>
                                            <span className="text-gray-500 font-medium">TITRE FONCIER :</span>{' '}
                                            <strong className="text-emerald-800 font-bold">
                                                {previewData.effectiveTitre || 'En cours d\'immatriculation / Morcellement'}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Prix */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">
                                    PRIX DE VENTE & MODALITÉS :
                                </h3>
                                <p className="text-xs">
                                    La présente vente est consentie et acceptée moyennant le prix net de <strong>{previewData.amount_dh.toLocaleString()} DH</strong> (Dirhams Marocains).
                                    {previewData.discount_dh && previewData.discount_dh > 0 ? (
                                        <span className="text-gray-600 block mt-1 italic">
                                            (Après application d'une remise commerciale de {previewData.discount_dh.toLocaleString()} DH sur le prix initial de {(previewData.original_price_dh || (previewData.amount_dh + previewData.discount_dh)).toLocaleString()} DH).
                                        </span>
                                    ) : null}
                                </p>
                                {previewData.isFullyPaid ? (
                                    <p className="text-xs bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 italic">
                                        "Le VENDEUR reconnaît expressément et définitivement par les présentes avoir reçu de l'ACQUÉREUR la totalité de la somme de {previewData.amount_dh.toLocaleString()} DH sous forme de versements successifs dument enregistrés. Le VENDEUR en donne quittance entière, définitive et sans réserve à l'ACQUÉREUR."
                                    </p>
                                ) : (
                                    <p className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 italic">
                                        "L'ACQUÉREUR a réglé à ce jour la somme de {previewData.totalPaid.toLocaleString()} DH. Le solde restant dû s'élève à la somme de {previewData.remaining.toLocaleString()} DH, payable selon l'échéancier convenu."
                                    </p>
                                )}
                            </div>

                            {/* Section: Clauses standards */}
                            <div className="space-y-4 mb-8">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">
                                    DISPOSITIONS ET JOUISSANCE :
                                </h3>
                                <p className="text-xs text-gray-700">
                                    {previewData.final_contract_clauses || "L'ACQUÉREUR sera propriétaire du bien immobilier à compter du jour de la signature des présentes et en aura la jouissance immédiate. Le VENDEUR déclare que le bien vendu est libre de toute dette ou hypothèque."}
                                </p>
                            </div>

                            {/* Date of the contract */}
                            <div className="text-right text-xs italic text-gray-700 mb-6">
                                Fait à Tétouan, le {previewData.final_contract_date ? new Date(previewData.final_contract_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>

                            {/* Section: Signatures */}
                            <div className="grid grid-cols-2 gap-4 border-t border-gray-300 pt-6 mt-8">
                                <div className="text-center space-y-12">
                                    <p className="text-xs font-bold text-gray-500 uppercase">La Signature de l'Acquéreur</p>
                                    <div className="h-16"></div>
                                    <p className="text-xs font-serif italic text-gray-400">Lu et approuvé</p>
                                </div>
                                <div className="text-center space-y-12">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Pour Nafat Immobilier (Le Vendeur)</p>
                                    <div className="h-16"></div>
                                    <p className="text-xs font-serif italic text-gray-400">Lu et approuvé</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FinalContractsPage;
