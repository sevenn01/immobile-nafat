
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { User, AppPermissions, PermissionSet } from '../types';
import { getUsers, addUser, updateUser, deleteUser } from '../services/api';
import { PlusIcon, EditIcon, TrashIcon, LockIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import Notification from '../components/Notification';
import ConfirmationModal from '../components/ConfirmationModal';

const defaultPermissions: PermissionSet = {
    view: true, create: false, edit: false, delete: false
};

const fullPermissions: PermissionSet = {
    view: true, create: true, edit: true, delete: true
};

const defaultAppPermissions: AppPermissions = {
    dashboard: { view: true, create: false, edit: false, delete: false },
    projects: defaultPermissions,
    apartments: defaultPermissions,
    clients: defaultPermissions,
    contracts: defaultPermissions,
    payments: defaultPermissions,
    settings: { view: false, create: false, edit: false, delete: false }
};

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'profile'>('profile');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Delete Confirmation State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Form state
    const [permissionsForm, setPermissionsForm] = useState<AppPermissions>(defaultAppPermissions);
    const [selectedRole, setSelectedRole] = useState<'admin' | 'agent'>('agent');

    // Profile password state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const fetchUsers = useCallback(async () => {
        if (user?.role !== 'admin') return;
        setLoading(true);
        try {
            const data = await getUsers();
            // Filter out the developer account so it's not visible to anyone in the list
            setUsers(data.filter(u => u.email !== 'dev@dev'));
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [activeTab, fetchUsers]);

    const handleUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        // Use selectedRole state instead of form data for consistency
        const role = selectedRole;

        // Admins automatically get full permissions
        const finalPermissions = role === 'admin' 
            ? {
                dashboard: fullPermissions,
                projects: fullPermissions, apartments: fullPermissions, clients: fullPermissions,
                contracts: fullPermissions, payments: fullPermissions, settings: fullPermissions
              }
            : permissionsForm;

        try {
            const userData: Partial<User> = {
                name, email, role,
                permissions: finalPermissions,
                avatar_url: '' 
            };

            if (password) userData.password = password;

            if (editingUser) {
                await updateUser(editingUser.id, userData);
                setNotification({ message: "Utilisateur mis à jour avec succès", type: 'success' });
            } else {
                if (!password) { alert("Mot de passe requis pour un nouvel utilisateur"); return; }
                await addUser(userData);
                setNotification({ message: "Utilisateur créé avec succès", type: 'success' });
            }
            await fetchUsers();
            closeUserModal();
        } catch (error) {
            console.error(error);
            setNotification({ message: "Erreur lors de l'enregistrement", type: 'error' });
        }
    };

    // Open confirmation modal instead of immediate execution
    const handleDeleteClick = (u: User, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (u.id === user?.id) {
            alert("Vous ne pouvez pas supprimer votre propre compte.");
            return;
        }
        setUserToDelete(u);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        
        try {
            await deleteUser(userToDelete.id);
            setNotification({ message: "Utilisateur supprimé", type: 'success' });
            await fetchUsers(); 
        } catch (error) {
            console.error(error);
            setNotification({ message: "Erreur lors de la suppression", type: 'error' });
        } finally {
            setIsDeleteConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (newPassword !== confirmPassword) {
            alert("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }
        if (user.password && oldPassword !== user.password) {
            alert("Ancien mot de passe incorrect.");
            return;
        }

        try {
            await updateUser(user.id, { password: newPassword });
            setNotification({ message: "Mot de passe modifié avec succès", type: 'success' });
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (error) {
            setNotification({ message: "Erreur lors de la modification du mot de passe", type: 'error' });
        }
    };

    const openAddUserModal = () => {
        setEditingUser(null);
        setPermissionsForm(defaultAppPermissions);
        setSelectedRole('agent');
        setIsUserModalOpen(true);
    };

    const openEditUserModal = (u: User) => {
        setEditingUser(u);
        // Ensure default permissions are merged in case the user record is incomplete
        setPermissionsForm({
            ...defaultAppPermissions,
            ...u.permissions
        });
        setSelectedRole(u.role);
        setIsUserModalOpen(true);
    };

    const closeUserModal = () => {
        setIsUserModalOpen(false);
        setEditingUser(null);
    };

    const handlePermissionChange = (section: keyof AppPermissions, type: keyof PermissionSet, value: boolean) => {
        setPermissionsForm(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [type]: value
            }
        }));
    };

    const PermissionCheckbox = ({ section, type, label }: { section: keyof AppPermissions, type: keyof PermissionSet, label: string }) => {
        const isAdmin = selectedRole === 'admin';
        // If admin, visual is always checked. Else, rely on form state.
        const isChecked = isAdmin ? true : (permissionsForm[section]?.[type] || false);
        
        return (
            <label className={`flex items-center space-x-2 text-sm ${isAdmin ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600'}`}>
                <input 
                    type="checkbox" 
                    checked={isChecked}
                    disabled={isAdmin}
                    onChange={(e) => handlePermissionChange(section, type, e.target.checked)}
                    className="rounded text-green-600 focus:ring-green-500 disabled:opacity-50"
                />
                <span>{label}</span>
            </label>
        );
    };

    const SectionPermissions = ({ title, sectionKey, simpleView = false }: { title: string, sectionKey: keyof AppPermissions, simpleView?: boolean }) => (
        <div className="border p-3 rounded-lg bg-gray-50">
            <h4 className="font-semibold text-gray-700 mb-2 capitalize">{title}</h4>
            <div className="flex flex-wrap gap-4">
                <PermissionCheckbox section={sectionKey} type="view" label={simpleView ? "Accès (Voir)" : "Voir"} />
                {!simpleView && (
                    <>
                        <PermissionCheckbox section={sectionKey} type="create" label="Ajouter" />
                        <PermissionCheckbox section={sectionKey} type="edit" label="Modifier" />
                        <PermissionCheckbox section={sectionKey} type="delete" label="Supprimer" />
                    </>
                )}
            </div>
        </div>
    );

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";

    return (
        <div>
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Paramètres</h2>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`px-6 py-4 font-medium text-sm focus:outline-none ${activeTab === 'profile' ? 'border-b-2 border-green-600 text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mon Profil
                    </button>
                    {user?.role === 'admin' && (
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-4 font-medium text-sm focus:outline-none ${activeTab === 'users' ? 'border-b-2 border-green-600 text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Gestion des Utilisateurs
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {activeTab === 'profile' && (
                        <div className="max-w-md">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <LockIcon className="w-5 h-5 mr-2" /> 
                                Sécurité du compte
                            </h3>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ancien mot de passe</label>
                                    <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClasses} required />
                                </div>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Mettre à jour</button>
                            </form>
                            <div className="mt-8 pt-6 border-t">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Informations</h3>
                                <p className="text-sm text-gray-600">Nom: <span className="font-medium text-gray-900">{user?.name}</span></p>
                                <p className="text-sm text-gray-600">Email: <span className="font-medium text-gray-900">{user?.email}</span></p>
                                <p className="text-sm text-gray-600">Rôle: <span className="font-medium text-gray-900 capitalize">{user?.role}</span></p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && user?.role === 'admin' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800">Utilisateurs du système</h3>
                                <button onClick={openAddUserModal} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
                                    <PlusIcon className="w-4 h-4 mr-2" /> Ajouter un utilisateur
                                </button>
                            </div>

                            {loading ? <p>Chargement...</p> : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernière Connexion</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map(u => (
                                                <tr key={u.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                                <div className="text-sm text-gray-500">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Jamais'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => openEditUserModal(u)} 
                                                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-gray-100"
                                                                title="Modifier"
                                                            >
                                                                <EditIcon className="w-5 h-5 pointer-events-none"/>
                                                            </button>
                                                            {u.id !== user.id && (
                                                                <button 
                                                                    type="button" 
                                                                    onClick={(e) => handleDeleteClick(u, e)} 
                                                                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                                                                    title="Supprimer"
                                                                >
                                                                    <TrashIcon className="w-5 h-5 pointer-events-none"/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Modal title={editingUser ? "Modifier Utilisateur" : "Ajouter Utilisateur"} isOpen={isUserModalOpen} onClose={closeUserModal}>
                <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nom Complet</label>
                            <input type="text" name="name" defaultValue={editingUser?.name} required className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" name="email" defaultValue={editingUser?.email} required className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mot de passe {editingUser && '(Laisser vide pour ne pas changer)'}</label>
                            <input type="password" name="password" className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rôle</label>
                            <select 
                                name="role" 
                                value={selectedRole} 
                                onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'agent')} 
                                className={inputClasses}
                            >
                                <option value="agent">Agent</option>
                                <option value="admin">Administrateur</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Les administrateurs ont tous les droits par défaut.</p>
                        </div>
                    </div>

                    <div className="mt-4 border-t pt-4">
                        <h3 className="text-sm font-bold text-gray-800 mb-3">Permissions d'accès et de gestion</h3>
                        <p className="text-xs text-gray-500 mb-3">
                            {selectedRole === 'admin' 
                                ? "Les administrateurs ont accès à toutes les fonctionnalités." 
                                : "Cochez 'Voir' pour autoriser l'accès. Cochez les autres cases pour autoriser les actions."}
                        </p>
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-2 ${selectedRole === 'admin' ? 'opacity-60' : ''}`}>
                            <SectionPermissions title="Tableau de Bord" sectionKey="dashboard" simpleView={true} />
                            <SectionPermissions title="Projets" sectionKey="projects" />
                            <SectionPermissions title="Appartements" sectionKey="apartments" />
                            <SectionPermissions title="Clients" sectionKey="clients" />
                            <SectionPermissions title="Contrats" sectionKey="contracts" />
                            <SectionPermissions title="Paiements" sectionKey="payments" />
                            <SectionPermissions title="Paramètres" sectionKey="settings" simpleView={true} />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeUserModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Annuler</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Sauvegarder</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteUser}
                title="Supprimer l'utilisateur"
                message={`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete?.name} ? Cette action est irréversible.`}
            />
        </div>
    );
};

export default SettingsPage;
