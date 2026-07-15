
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getContracts, getClients, getApartments, getProjects } from '../services/api';
import { Contract, Client, Apartment, ContractStatus, Project } from '../types';
import { FileTextIcon, SearchIcon, AlertTriangleIcon, BuildingIcon, XCircleIcon } from '../components/icons/Icons';

const RejectedSalesPage: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('all');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [ctrs, cls, apts, projs] = await Promise.all([
                getContracts(), 
                getClients(), 
                getApartments(),
                getProjects()
            ]);
            setContracts(ctrs.filter(c => c.status === ContractStatus.SaleCanceled || c.status === ContractStatus.Canceled));
            setClients(cls);
            setApartments(apts);
            setProjects(projs);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            const client = clients.find(cl => cl.id === c.client_id);
            const nameMatch = (client?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = selectedProjectId === 'all' || c.project_id === selectedProjectId;
            return nameMatch && projectMatch;
        });
    }, [contracts, clients, searchTerm, selectedProjectId]);

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold italic">Chargement des dossiers archivés...</div>;

    const inputClasses = "block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold shadow-sm focus:ring-2 focus:ring-red-500 outline-none transition-all";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-3 gap-4">
                <div className="p-3 bg-red-100 rounded-2xl shrink-0">
                    <AlertTriangleIcon className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">Désistements</h2>
                    <p className="text-gray-400 font-medium text-xs md:text-sm">Archive des dossiers annulés.</p>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex-grow relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                    <input type="text" placeholder="Rechercher par client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputClasses + " pl-10 text-sm"} />
                </div>
                <div className="flex space-x-2">
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className={inputClasses + " text-sm"}>
                        <option value="all">Projet: Tous</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                    </select>
                    <button onClick={() => { setSearchTerm(''); setSelectedProjectId('all'); }} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                        <XCircleIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-red-50/50 text-[10px] font-bold text-red-800 uppercase tracking-widest">
                            <tr>
                                <th className="px-4 md:px-6 py-4 text-left">Client</th>
                                <th className="px-4 md:px-6 py-4 text-left">Unité</th>
                                <th className="hidden sm:table-cell px-4 md:px-6 py-4 text-left">Valeur</th>
                                <th className="px-4 md:px-6 py-4 text-left">Remboursement</th>
                                <th className="px-4 md:px-6 py-4 text-left">Motif</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 font-medium text-gray-700">
                            {filteredContracts.map(c => {
                                const client = clients.find(cl => cl.id === c.client_id);
                                const apt = apartments.find(a => a.id === c.apartment_id);
                                const proj = projects.find(p => p.id === c.project_id);
                                return (
                                    <tr key={c.id} className="hover:bg-red-50/10 transition-colors group">
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="font-bold text-gray-900 group-hover:text-red-700 transition-colors text-sm">{client?.full_name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{client?.cin_number}</div>
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="font-bold text-gray-600 text-sm">{apt?.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{proj?.project_name}</div>
                                            <div className="sm:hidden text-xs text-red-600 font-bold mt-1">{c.amount_dh.toLocaleString()} DH</div>
                                        </td>
                                        <td className="hidden sm:table-cell px-4 md:px-6 py-4 font-bold text-black text-sm">{c.amount_dh.toLocaleString()} DH</td>
                                        <td className="px-4 md:px-6 py-4">
                                            {c.refund_status === 'total' ? (
                                                <div className="space-y-0.5">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[9px] font-extrabold rounded-full uppercase tracking-wider">Total</span>
                                                    <div className="font-extrabold text-xs text-green-700">{c.refund_amount?.toLocaleString() || 0} DH</div>
                                                    {c.refund_notes && <div className="text-[9px] text-gray-400 italic max-w-[120px] truncate" title={c.refund_notes}>{c.refund_notes}</div>}
                                                </div>
                                            ) : c.refund_status === 'partial' ? (
                                                <div className="space-y-0.5">
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-full uppercase tracking-wider">Partiel</span>
                                                    <div className="font-extrabold text-xs text-amber-700">{c.refund_amount?.toLocaleString() || 0} DH</div>
                                                    {c.refund_notes && <div className="text-[9px] text-gray-400 italic max-w-[120px] truncate" title={c.refund_notes}>{c.refund_notes}</div>}
                                                </div>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-extrabold rounded-full uppercase tracking-wider">Aucun</span>
                                                    <div className="text-[9px] text-gray-400">0 DH (Conservé)</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] md:text-xs italic text-slate-500 max-w-[150px] md:max-w-sm truncate sm:whitespace-normal">
                                                {c.rejection_reason || 'N/A'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredContracts.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center">
                        <AlertTriangleIcon className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 italic font-bold">Aucun dossier de désistement trouvé dans cette archive.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RejectedSalesPage;
