import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getContracts, getClients, getApartments, getProjects, getPayments, updateContract } from '../services/api';
import { Contract, Client, Apartment, ContractStatus, Project, Payment, PaymentStatus } from '../types';
import { Search, FileText, Printer, Eye, User, CheckCircle2, ChevronRight, AlertCircle, Sparkles, Pencil, Check, X, MessageSquare, Download } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';

const FinalContractsPage: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Modal state for previewing the legal contract
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);

    // States for custom remarks / client notes
    const [editingContractId, setEditingContractId] = useState<string | null>(null);
    const [editingNotesText, setEditingNotesText] = useState<string>('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleSaveNotes = async (contractId: string) => {
        if (!user) return;
        try {
            setUpdatingId(contractId);
            await updateContract(contractId, { notes: editingNotesText }, user.id);
            // Update local state
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

    // Compute contracts that are fully paid
    const completedContracts = useMemo(() => {
        const saleContracts = contracts.filter(c => c.type === 'sale');
        
        return saleContracts.map(contract => {
            const client = clients.find(cl => cl.id === contract.client_id);
            const apartment = apartments.find(a => a.id === contract.apartment_id);
            const project = projects.find(p => p.id === contract.project_id);
            
            // Sum all PAID payments
            const contractPayments = payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid);
            const totalPaid = contractPayments.reduce((sum, p) => sum + p.amount_dh, 0);
            const remaining = Math.max(0, contract.amount_dh - totalPaid);
            const isFullyPaid = remaining <= 0 || contract.status === ContractStatus.SaleCompleted;

            return {
                ...contract,
                client,
                apartment,
                project,
                totalPaid,
                remaining,
                isFullyPaid
            };
        }).filter(item => item.isFullyPaid && item.client); // Filter to only show completed ones
    }, [contracts, clients, apartments, projects, payments]);

    // Apply search filter
    const filteredCompletedContracts = useMemo(() => {
        return completedContracts.filter(item => {
            const clientName = item.client?.full_name || '';
            const aptName = item.apartment?.name || '';
            const projectName = item.project?.project_name || '';
            const cin = item.client?.cin_number || '';

            const searchLower = searchTerm.toLowerCase();
            return clientName.toLowerCase().includes(searchLower) ||
                   aptName.toLowerCase().includes(searchLower) ||
                   projectName.toLowerCase().includes(searchLower) ||
                   cin.toLowerCase().includes(searchLower);
        });
    }, [completedContracts, searchTerm]);

    const projectsWithCompletedContracts = useMemo(() => {
        const projIds = Array.from(new Set(completedContracts.map(c => c.project_id).filter(Boolean)));
        return projIds.map(id => projects.find(p => p.id === id)).filter(Boolean) as Project[];
    }, [completedContracts, projects]);

    const handleExportProject = (projectId: string, projectName: string) => {
        const projectContracts = completedContracts.filter(c => c.project_id === projectId);
        if (projectContracts.length === 0) return;

        // Header row with UTF-8 BOM
        const headers = [
            "Client",
            "CIN",
            "Téléphone",
            "Email",
            "Projet",
            "Bien / Appartement",
            "Titre de l'appartement",
            "Prix d'achat (DH)",
            "Montant réglé (DH)",
            "Date de contrat",
            "Remarques / Observations"
        ];

        // Map contracts to CSV rows
        const rows = projectContracts.map(item => {
            const clientName = item.client?.full_name || '';
            const cin = item.client?.cin_number || '';
            const phone = item.client?.phone || '';
            const email = item.client?.email || '';
            const projName = item.project?.project_name || '';
            const aptName = item.apartment?.name || '';
            const aptTitle = item.apartment?.titre || 'Non renseigné';
            const price = item.amount_dh || 0;
            const totalPaid = item.totalPaid || 0;
            const date = item.start_date || '';
            const notes = item.notes || '';

            // Escape double quotes and wrap in double quotes
            const escapeCSV = (val: any) => {
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            };

            return [
                escapeCSV(clientName),
                escapeCSV(cin),
                escapeCSV(phone),
                escapeCSV(email),
                escapeCSV(projName),
                escapeCSV(aptName),
                escapeCSV(aptTitle),
                price,
                totalPaid,
                escapeCSV(date),
                escapeCSV(notes)
            ].join(';');
        });

        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Ventes_Soldees_${projectName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportAll = () => {
        projectsWithCompletedContracts.forEach(proj => {
            handleExportProject(proj.id, proj.project_name);
        });
    };

    const handleOpenContractModal = (contract: Contract) => {
        setSelectedContract(contract);
        setIsContractModalOpen(true);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('legal-contract-print-area');
        if (!printContent) return;
        
        const originalContent = document.body.innerHTML;
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body {
                    background: white !important;
                    color: black !important;
                    font-family: 'Times New Roman', Times, serif !important;
                    padding: 2cm !important;
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

    // Helper to get formatted date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500 font-medium animate-pulse">Chargement des dossiers de contrat...</p>
            </div>
        );
    }

    const modalData = selectedContract ? completedContracts.find(c => c.id === selectedContract.id) : null;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="md:flex md:items-center md:justify-between border-b border-gray-100 pb-5">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Dossiers Soldés
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Contrats de Vente Définitifs
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 max-w-3xl">
                        Dossiers de réservation dont le paiement a été entièrement complété (100% encaissé). Vous pouvez maintenant générer, consulter et imprimer le contrat officiel de vente définitif incluant le titre de l'appartement.
                    </p>
                </div>
            </div>

            {/* Search filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher par client, projet, appartement, CIN..."
                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-gray-400 font-medium bg-gray-50/50"
                    />
                </div>
                <div className="text-sm font-semibold text-gray-500 self-center">
                    {filteredCompletedContracts.length} dossier(s) trouvé(s)
                </div>
            </div>

            {/* Export Section separated by project */}
            {projectsWithCompletedContracts.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/40 border border-indigo-150 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-sm font-bold text-gray-800">Extraire les rapports clients soldés par Projet</h3>
                        </div>
                        <button
                            onClick={handleExportAll}
                            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all space-x-1.5 cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                            <span>Exporter Tous (Fichiers séparés par Projet)</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Téléchargez les listes des clients ayant entièrement soldé leurs paiements. Les fichiers d'extraction sont générés séparément par projet au format CSV (encodage UTF-8 avec BOM, séparateur point-virgule) pour une compatibilité parfaite avec Excel.
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                        {projectsWithCompletedContracts.map(proj => {
                            const count = completedContracts.filter(c => c.project_id === proj.id).length;
                            return (
                                <button
                                    key={proj.id}
                                    onClick={() => handleExportProject(proj.id, proj.project_name)}
                                    className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-indigo-50/50 border border-gray-200 hover:border-indigo-200 text-xs font-semibold text-gray-700 rounded-xl transition-all shadow-sm hover:shadow space-x-2 cursor-pointer group"
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-110 transition-transform"></span>
                                    <span className="font-bold">{proj.project_name}</span>
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold">{count} soldé(s)</span>
                                    <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List Table */}
            {filteredCompletedContracts.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client & CIN</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bien & Projet</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Titre de l'appartement</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Prix & Réglé</th>
                                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Statut Paiement</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remarques / Observations</th>
                                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCompletedContracts.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-indigo-50 rounded-lg">
                                                    <User className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{item.client?.full_name}</div>
                                                    <div className="text-xs text-gray-500 font-medium">CIN: {item.client?.cin_number}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{item.apartment?.name}</div>
                                                <div className="text-xs text-gray-500 font-medium">Projet: {item.project?.project_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.apartment?.titre ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                                                    {item.apartment.titre}
                                                </span>
                                            ) : (
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                        Non renseigné
                                                    </span>
                                                    <div className="text-[10px] text-gray-400">Modifier dans Propriétés</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-bold text-gray-900">{item.amount_dh.toLocaleString()} DH</div>
                                            <div className="text-xs text-green-600 font-bold">Soldé (100%)</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 uppercase tracking-wider">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PAYÉ & VALIDÉ
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingContractId === item.id ? (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={editingNotesText}
                                                        onChange={(e) => setEditingNotesText(e.target.value)}
                                                        className="block w-full min-w-[150px] px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-sans"
                                                        placeholder="Ex: Titre foncier remis, Dossier archivé..."
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveNotes(item.id)}
                                                        disabled={updatingId === item.id}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Enregistrer"
                                                    >
                                                        {updatingId === item.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingContractId(null)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Annuler"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 group max-w-[200px]">
                                                    <span className="text-xs text-gray-600 truncate font-medium max-w-[150px] block">
                                                        {item.notes || <span className="text-gray-400 italic font-normal">Aucune remarque</span>}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingContractId(item.id);
                                                            setEditingNotesText(item.notes || '');
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                                                        title="Modifier la remarque"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex items-center justify-center space-x-3">
                                                <button
                                                    onClick={() => handleOpenContractModal(item)}
                                                    className="inline-flex items-center px-3.5 py-1.5 border border-indigo-200 rounded-xl shadow-sm text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Acte de Vente
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/clients/${item.client_id}`)}
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                                    title="Fiche Client"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" /> Dossier
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun dossier soldé trouvé</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        Les dossiers de contrats définitifs s'affichent automatiquement ici une fois que le client a complété la totalité du paiement de sa réservation (avance + reliquat égal au montant total).
                    </p>
                    <Link
                        to="/reservations"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        Consulter les Réservations <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
            )}

            {/* Legal Contract Modal Preview */}
            <Modal
                title="Aperçu de l'Acte de Vente Définitif"
                isOpen={isContractModalOpen}
                onClose={() => setIsContractModalOpen(false)}
            >
                {modalData && (
                    <div className="space-y-6">
                        <div className="flex justify-end space-x-3 border-b border-gray-100 pb-4 no-print">
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
                            >
                                <Printer className="w-4 h-4 mr-1.5" /> Imprimer l'Acte
                            </button>
                            <button
                                onClick={() => setIsContractModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Fermer
                            </button>
                        </div>

                        {/* Print Layout */}
                        <div 
                            id="legal-contract-print-area" 
                            className="print-card bg-slate-50 border border-gray-200 rounded-2xl p-8 max-h-[600px] overflow-y-auto font-serif text-gray-800 text-sm leading-relaxed shadow-inner"
                        >
                            {/* Document Header */}
                            <div className="text-center space-y-2 mb-8">
                                <h2 className="text-xl font-bold uppercase tracking-wide text-gray-900">ACTE DE VENTE DÉFINITIF</h2>
                                <p className="text-xs italic text-gray-500">Sous seing privé fait en double exemplaire</p>
                                <div className="w-32 h-1 bg-gray-900 mx-auto mt-2"></div>
                            </div>

                            {/* Section: Parties */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">ENTRE LES SOUSSIGNÉS :</h3>
                                <div className="pl-4">
                                    <p className="font-bold text-gray-900">1. La société NAFAT IMMOBILIER S.A.R.L</p>
                                    <p className="text-xs text-gray-600 pl-4">
                                        Société au capital de 100 000 DH, dont le siège social est situé à Tétouan, Maroc, 
                                        représentée légalement par son Gérant, ci-après dénommée le <strong>"VENDEUR"</strong>.
                                    </p>
                                </div>
                                <div className="pl-4">
                                    <p className="font-bold text-gray-900">2. M. / Mme. {modalData.client?.full_name}</p>
                                    <p className="text-xs text-gray-600 pl-4">
                                        Titulaire du CIN / Passeport n° <strong>{modalData.client?.cin_number}</strong>, 
                                        demeurant à l'adresse suivante : {modalData.client?.address || 'Non renseignée'}, 
                                        ci-après dénommé(e) l'<strong>"ACQUÉREUR"</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Section: Objet */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">OBJET DE LA VENTE :</h3>
                                <p className="text-xs">
                                    Le VENDEUR vend et cède en toute propriété, sous les garanties ordinaires de droit et de fait, à l'ACQUÉREUR, qui accepte, le bien immobilier désigné ci-après :
                                </p>
                                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-gray-500 font-medium">Projet :</span> <strong className="text-gray-900">{modalData.project?.project_name}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Type :</span> <strong className="text-gray-900 uppercase">{modalData.apartment?.type === 'garage' ? 'Garage' : 'Appartement'}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Désignation :</span> <strong className="text-gray-900">{modalData.apartment?.name}</strong></div>
                                        <div><span className="text-gray-500 font-medium font-serif">Étage :</span> <strong className="text-gray-900">{modalData.apartment?.floor === 'RDC' ? 'Rez-de-chaussée' : `Étage ${modalData.apartment?.floor}`}</strong></div>
                                        <div><span className="text-gray-500 font-medium">Surface habitable :</span> <strong className="text-gray-900">{modalData.apartment?.surface_m2} m²</strong></div>
                                        <div><span className="text-gray-500 font-medium">TITRE FONCIER :</span> <strong className="text-indigo-700">{modalData.apartment?.titre || 'En cours de morcellement (Morcellement Général du titre foncier mère)'}</strong></div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Prix */}
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">PRIX DE VENTE & QUITTANCE :</h3>
                                <p className="text-xs">
                                    La présente vente est consentie et acceptée moyennant le prix principal de <strong>{modalData.amount_dh.toLocaleString()} DH</strong> (Dirhams Marocains).
                                </p>
                                <p className="text-xs bg-green-50 border border-green-200 rounded-xl p-4 text-green-900 italic">
                                    "Le VENDEUR reconnaît expressément et définitivement par les présentes avoir reçu de l'ACQUÉREUR la somme totale de {modalData.amount_dh.toLocaleString()} DH sous forme de versements successifs. Le VENDEUR en donne quittance entière, définitive et sans réserve à l'ACQUÉREUR."
                                </p>
                            </div>

                            {/* Section: Clauses standards */}
                            <div className="space-y-4 mb-8">
                                <h3 className="font-bold border-b border-gray-300 pb-1 text-gray-900 uppercase">DISPOSITIONS ET JOUISSANCE :</h3>
                                <ul className="list-disc pl-5 text-xs space-y-1.5 text-gray-600">
                                    <li>L'ACQUÉREUR sera propriétaire du bien immobilier à compter du jour de la signature des présentes et en aura la jouissance immédiate.</li>
                                    <li>Le VENDEUR déclare que le bien vendu est libre de toute dette, hypothèque ou charge quelconque, à l'exception de la copropriété ordinaire.</li>
                                    <li>Chacune des parties s'engage à effectuer l'ensemble des formalités d'enregistrement et d'inscription foncière nécessaires auprès des administrations compétentes ou par voie de notaire.</li>
                                </ul>
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
