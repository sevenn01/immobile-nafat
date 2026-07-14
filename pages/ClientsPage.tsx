import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getClients, getContracts, getApartments, addClient, updateClient, deleteClient } from '../services/api';
import { Client, Contract, Apartment, ContractStatus } from '../types';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, AlertTriangleIcon, UsersIcon, GridIcon, ListIcon, XCircleIcon, FileTextIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';
import { ClientPdfModal } from '../components/ClientPdfModal';
import { AllClientsPdfModal } from '../components/AllClientsPdfModal';

const ClientCard: React.FC<{ 
    client: Client; 
    contracts: Contract[]; 
    apartments: Apartment[]; 
    onEdit: (client: Client) => void;
    onDelete: (client: Client) => void;
    onViewPdf: (client: Client) => void;
}> = ({ client, contracts, apartments, onEdit, onDelete, onViewPdf }) => {
  const navigate = useNavigate();
  const clientContracts = contracts.filter(c => c.client_id === client.id);
  const activeContracts = clientContracts.filter(c => c.status === ContractStatus.Active || c.status === ContractStatus.SaleInProgress);

  return (
    <div 
        onClick={() => navigate(`/clients/${client.id}`)}
        className={`bg-white rounded-2xl p-3 shadow-sm border hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden ${client.has_rejection ? 'border-red-100 bg-red-50/10' : 'border-gray-100/80 hover:border-green-100'}`}
    >
      <div className="relative">
        <div className="flex justify-between items-start mb-0.5">
          <div className="flex-grow pr-2">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors truncate max-w-full">{client.full_name}</h3>
                {client.rejection_count && client.rejection_count > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-red-100 text-red-700 uppercase tracking-widest">
                        <AlertTriangleIcon className="w-2.5 h-2.5 mr-1" />
                        {client.rejection_count}
                    </span>
                )}
            </div>
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest">{client.occupation || 'Particulier'}</p>
          </div>
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onViewPdf(client)} className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 transition-all bg-gray-50/50 hover:bg-green-50" title="Fiche Synthèse Client (PDF)">
                <FileTextIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onEdit(client)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 transition-all bg-gray-50/50 hover:bg-blue-50">
                <EditIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(client)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 transition-all bg-gray-50/50 hover:bg-red-50">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">CIN</div>
            <span className="font-semibold text-gray-700">{client.cin_number}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            </div>
            <span className="font-semibold text-gray-700">{client.phone}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-[8px] font-semibold text-gray-400 uppercase tracking-widest">Dossiers</h4>
            <span className="bg-green-100 text-green-700 text-[8px] font-bold px-1 py-0.5 rounded-md">{activeContracts.length}</span>
          </div>
          
          {activeContracts.length > 0 ? (
            <div className="space-y-1.5">
              {activeContracts.slice(0, 2).map(contract => {
                const apartment = apartments.find(a => a.id === contract.apartment_id);
                return (
                  <div key={contract.id} className="flex items-center justify-between p-2 bg-gray-50/50 rounded-xl group-hover:bg-white transition-colors border border-transparent group-hover:border-gray-100">
                    <div className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 shadow-lg shadow-green-200"></div>
                        <span className="text-xs font-semibold text-gray-600 truncate max-w-[120px]">{apartment?.name || 'Unité'}</span>
                    </div>
                    <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-widest">{contract.type === 'sale' ? 'Vente' : 'Loc'}</span>
                  </div>
                );
              })}
            </div>
          ) : ( 
            <div className="p-2 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 font-semibold italic">Aucun dossier actif</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const ClientsPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const savedMode = localStorage.getItem('clientsViewMode');
        return (savedMode as 'grid' | 'list') || 'grid';
    });
    const [pdfClient, setPdfClient] = useState<Client | null>(null);
    const [isAllClientsPdfOpen, setIsAllClientsPdfOpen] = useState(false);
    const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
    const [pdfSelectMode, setPdfSelectMode] = useState<'summary' | 'detailed'>('summary');

    useEffect(() => {
        localStorage.setItem('clientsViewMode', viewMode);
    }, [viewMode]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [clientsData, contractsData, apartmentsData] = await Promise.all([ getClients(), getContracts(), getApartments() ]);
            setClients(clientsData);
            setContracts(contractsData);
            setApartments(apartmentsData);
        } catch (error) { console.error("Failed to fetch data:", error);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const filteredClients = useMemo(() => {
        return clients.filter(client => 
            (client.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.cin_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.phone || '').includes(searchTerm)
        ).sort((a, b) => {
            if ((a.rejection_count || 0) !== (b.rejection_count || 0)) {
                return (b.rejection_count || 0) - (a.rejection_count || 0);
            }
            return a.full_name.localeCompare(b.full_name);
        });
    }, [clients, searchTerm]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        
        const formData = new FormData(e.currentTarget);
        const clientData = {
            full_name: formData.get('full_name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            cin_number: formData.get('cin_number') as string,
            occupation: formData.get('occupation') as string,
        };

        try {
            if (editingClient) {
                await updateClient(editingClient.id, clientData, user.user_id);
            } else {
                await addClient(clientData, user.user_id);
            }
            fetchData();
            closeModal();
        } catch (error) {
            console.error("Failed to save client:", error);
            alert("Erreur lors de l'enregistrement du client.");
        }
    }
    
    const handleDeleteClient = async (client: Client) => {
        if(window.confirm(`Êtes-vous sûr de vouloir supprimer ${client.full_name}?`)){
            try {
                await deleteClient(client.id);
                fetchData();
            } catch (error: any) {
                console.error("Failed to delete client:", error);
                alert(`Erreur: ${error.message}`);
            }
        }
    }

    const openEditModal = (client: Client) => { setEditingClient(client); setIsModalOpen(true); }
    const openAddModal = () => { setEditingClient(null); setIsModalOpen(true); }
    const closeModal = () => { setIsModalOpen(false); setEditingClient(null); }

    const inputClasses = "mt-1 block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 sm:text-sm font-medium transition-all";

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement des clients...</div>;

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Clients</h2>
            <div className="flex items-center space-x-3">
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')} 
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <GridIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)} 
                        className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition duration-200 flex items-center shadow-sm font-bold active:scale-95"
                    >
                        <FileTextIcon className="w-5 h-5 mr-1.5 text-green-600" />
                        Bilan Global PDF
                        <svg className="w-4 h-4 ml-1 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isPdfDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {isPdfDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsPdfDropdownOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-scale-up">
                                <button 
                                    onClick={() => {
                                        setPdfSelectMode('summary');
                                        setIsAllClientsPdfOpen(true);
                                        setIsPdfDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col transition"
                                >
                                    <span className="text-xs font-bold text-gray-900">1. Bilan Financier Simplifié</span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">Synthèse rapide de tous les dossiers (Engagé / Payé / Reste)</span>
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button 
                                    onClick={() => {
                                        setPdfSelectMode('detailed');
                                        setIsAllClientsPdfOpen(true);
                                        setIsPdfDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-green-50/50 flex flex-col transition"
                                >
                                    <span className="text-xs font-bold text-green-700">2. Grand Livre Détaillé</span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">Situation financière avec historique complet des paiements &amp; dates</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
                <button onClick={openAddModal} className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition duration-200 flex items-center shadow-lg font-bold active:scale-95">
                    <PlusIcon className="w-5 h-5 mr-1" />
                    Ajouter
                </button>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-8 flex items-center space-x-2">
            <div className="relative flex-grow">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Rechercher par nom, CIN, téléphone..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-gray-50 pl-12 pr-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none font-medium text-gray-700" 
                />
            </div>
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')} 
                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                    <XCircleIcon className="w-6 h-6 text-gray-400" />
                </button>
            )}
        </div>

      {filteredClients.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClients.map(client => (
                <ClientCard key={client.id} client={client} contracts={contracts} apartments={apartments} onEdit={openEditModal} onDelete={handleDeleteClient} onViewPdf={setPdfClient} />
                ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-bottom border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Client</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">CIN / Passport</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Téléphone</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Dossiers</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredClients.map(client => (
                            <tr 
                                key={client.id} 
                                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                onClick={() => navigate(`/clients/${client.id}`)}
                            >
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">{client.full_name}</div>
                                    <div className="text-[10px] text-gray-400 font-medium">{client.occupation || 'Particulier'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-600">{client.cin_number}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 font-medium">{client.phone}</td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                                        {contracts.filter(c => c.client_id === client.id).length} dossier(s)
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setPdfClient(client)} className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Fiche Synthèse Client (PDF)"><FileTextIcon className="w-5 h-5" /></button>
                                        <button onClick={() => openEditModal(client)} className="p-2 text-gray-400 hover:text-green-600 transition-colors"><EditIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteClient(client)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )
        ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <UsersIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Aucun client trouvé</h3>
                <p className="text-gray-500 mt-1">Essayez d'ajuster votre recherche ou ajoutez un nouveau client.</p>
            </div>
        )}

      <Modal title={editingClient ? "Modifier le Client" : "Ajouter un Nouveau Client"} isOpen={isModalOpen} onClose={closeModal}>
        <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* MANDATORY REQUIREMENTS (Name, Phone, CIN) */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="full_name" className="block text-sm font-bold text-gray-700 flex justify-between">
                        Nom complet <span className="text-red-500 font-bold text-[10px] uppercase">* Requis</span>
                    </label>
                    <input type="text" name="full_name" id="full_name" required defaultValue={editingClient?.full_name} className={inputClasses} placeholder="Ex: Jean Dupont" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-gray-700 flex justify-between">
                            Téléphone <span className="text-red-500 font-bold text-[10px] uppercase">* Requis</span>
                        </label>
                        <input type="tel" name="phone" id="phone" required defaultValue={editingClient?.phone} className={inputClasses} placeholder="Ex: 06 12 34 56 78" />
                    </div>
                    <div>
                        <label htmlFor="cin_number" className="block text-sm font-bold text-gray-700 flex justify-between">
                            N° CIN / Passport <span className="text-red-500 font-bold text-[10px] uppercase">* Requis</span>
                        </label>
                        <input type="text" name="cin_number" id="cin_number" required defaultValue={editingClient?.cin_number} className={inputClasses} placeholder="Ex: AB123456" />
                    </div>
                </div>
            </div>

            {/* OPTIONAL FIELDS (Email, Address, etc.) */}
            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Informations Facultatives</h4>
                <div className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-600">
                            Email <span className="text-gray-400 font-normal italic text-xs ml-1">(Optionnel)</span>
                        </label>
                        <input type="email" name="email" id="email" defaultValue={editingClient?.email} className={inputClasses.replace("text-gray-900", "text-gray-500")} placeholder="Ex: jean.dupont@email.com" />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-bold text-gray-600">
                            Adresse de résidence <span className="text-gray-400 font-normal italic text-xs ml-1">(Optionnel)</span>
                        </label>
                        <input type="text" name="address" id="address" defaultValue={editingClient?.address} className={inputClasses.replace("text-gray-900", "text-gray-500")} placeholder="Ex: 123 Rue de la Paix" />
                    </div>
                    <div>
                        <label htmlFor="occupation" className="block text-sm font-bold text-gray-600">
                            Profession <span className="text-gray-400 font-normal italic text-xs ml-1">(Optionnel)</span>
                        </label>
                        <input type="text" name="occupation" id="occupation" defaultValue={editingClient?.occupation} className={inputClasses.replace("text-gray-900", "text-gray-500")} placeholder="Ex: Ingénieur" />
                    </div>
                </div>
            </div>

             <div className="mt-8 flex justify-end space-x-3 pt-5 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all">Enregistrer le client</button>
            </div>
        </form>
      </Modal>

      {pdfClient && (
          <ClientPdfModal client={pdfClient} onClose={() => setPdfClient(null)} />
      )}

      {isAllClientsPdfOpen && (
          <AllClientsPdfModal initialMode={pdfSelectMode} onClose={() => setIsAllClientsPdfOpen(false)} />
      )}
    </div>
  );
};

export default ClientsPage;