
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPayments, getClients, getContracts, getProjects, updatePayment } from '../services/api';
import { Payment, Client, Contract, Project } from '../types';
import { SearchIcon, DownloadIcon, PaperclipIcon, XCircleIcon, TrashIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';

const DocumentCard: React.FC<{ 
    payment: Payment, 
    client?: Client, 
    contract?: Contract, 
    project?: Project, 
    onPreview: (url: string) => void,
    onDelete: (paymentId: string) => void
}> = ({ payment, client, contract, project, onPreview, onDelete }) => {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl transition-all duration-300 relative flex flex-col">
            <div className="aspect-[4/3] bg-slate-100 relative cursor-pointer overflow-hidden" onClick={() => onPreview(payment.proof_url!)}>
                <img src={payment.proof_url} alt="Preuve" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                    <div className="p-4 bg-white/90 rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-2xl transform translate-y-4 group-hover:translate-y-0">
                        <PaperclipIcon className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </div>
            
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(payment.id); }}
                className="absolute top-3 right-3 p-2.5 bg-red-600/90 text-white rounded-xl hover:bg-red-700 shadow-2xl transition-all opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100"
                title="Retirer ce document de l'archive"
            >
                <TrashIcon className="w-4 h-4" />
            </button>

            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-3">
                    <div className="max-w-[70%]">
                        <h4 className="font-bold text-slate-900 truncate leading-tight">{client?.full_name || 'Client inconnu'}</h4>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-1">{project?.project_name || 'Projet N/A'}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{payment.amount_dh.toLocaleString()} DH</span>
                </div>
                <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(payment.payment_date).toLocaleDateString('fr-FR')}</span>
                    <div className="flex items-center space-x-2">
                        <a href={payment.proof_url} download={`preuve_${payment.id.substring(0,6)}.png`} className="p-2 text-slate-300 hover:text-green-600 transition-colors">
                            <DownloadIcon className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentDocumentsPage: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [filterProject, setFilterProject] = useState('all');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [pays, cls, ctrs, projs] = await Promise.all([ getPayments(), getClients(), getContracts(), getProjects() ]);
            setPayments(pays.filter(p => !!p.proof_url).sort((a,b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()));
            setClients(cls); setContracts(ctrs); setProjects(projs);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteDocument = async (paymentId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT ce justificatif ? L'archive sera mise à jour immédiatement.")) {
            try {
                await updatePayment(paymentId, { proof_url: "" });
                await fetchData();
            } catch (error) { 
                console.error(error); 
                alert("Erreur lors de la suppression.");
            }
        }
    };

    const filteredDocs = useMemo(() => {
        return payments.filter(p => {
            const client = clients.find(c => c.id === p.client_id);
            const contract = contracts.find(c => c.id === p.contract_id);
            const searchMatch = (client?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = filterProject === 'all' || contract?.project_id === filterProject;
            return searchMatch && projectMatch;
        });
    }, [payments, clients, contracts, searchTerm, filterProject]);

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold italic">Accès à l'archive documentaire...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Justificatifs de Paiement</h2>
                    <p className="text-slate-400 font-bold mt-1 text-sm md:text-base">Archive numérique des preuves de versement bancaires et physiques.</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex-grow relative">
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                        type="text" 
                        placeholder="Rechercher par client..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-14 pr-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-bold focus:ring-4 focus:ring-green-500/10 focus:bg-white outline-none transition-all text-sm md:text-base" 
                    />
                </div>
                <select 
                    value={filterProject} 
                    onChange={e => setFilterProject(e.target.value)} 
                    className="px-4 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-green-500/10 transition-all cursor-pointer"
                >
                    <option value="all">Tous les Projets</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
                {searchTerm || filterProject !== 'all' ? (
                    <button 
                        onClick={() => { setSearchTerm(''); setFilterProject('all'); }} 
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                        title="Réinitialiser"
                    >
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                ) : null}
            </div>

            {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredDocs.map(p => {
                        const client = clients.find(c => c.id === p.client_id);
                        const contract = contracts.find(c => c.id === p.contract_id);
                        const project = projects.find(proj => proj.id === contract?.project_id);
                        return <DocumentCard key={p.id} payment={p} client={client} contract={contract} project={project} onPreview={setPreviewUrl} onDelete={handleDeleteDocument} />;
                    })}
                </div>
            ) : (
                <div className="text-center py-40 bg-white rounded-[40px] border border-slate-100 flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                        <PaperclipIcon className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Aucun justificatif</h3>
                    <p className="text-slate-400 font-medium mt-2">L'archive est vide pour cette sélection.</p>
                </div>
            )}

            <Modal title="Aperçu du justificatif" isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)}>
                <div className="flex flex-col items-center max-w-full">
                    <div className="bg-slate-900 rounded-2xl sm:rounded-[32px] p-1 sm:p-2 shadow-2xl mb-6 md:mb-8 w-full">
                        <img src={previewUrl || ''} alt="Justificatif" className="w-full h-auto max-h-[70vh] object-contain rounded-xl sm:rounded-[24px] border-2 sm:border-4 border-slate-800" />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                        <a href={previewUrl || ''} download="preuve.png" className="px-6 md:px-10 py-3 md:py-4 bg-green-600 text-white rounded-xl md:rounded-2xl font-bold flex items-center justify-center shadow-xl hover:bg-green-700 transition-all transform active:scale-95 text-sm md:text-base">
                            <DownloadIcon className="w-5 h-5 mr-2 md:mr-3" /> Télécharger
                        </a>
                        <button onClick={() => setPreviewUrl(null)} className="px-6 md:px-8 py-3 md:py-4 bg-slate-100 text-slate-700 rounded-xl md:rounded-2xl font-bold hover:bg-slate-200 transition-colors text-sm md:text-base">Quitter</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PaymentDocumentsPage;
