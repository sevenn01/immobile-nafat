
import { db } from '../firebase/config';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth'; // Ensure auth is imported for error logging
import { 
  Project, Apartment, Client, Contract, Payment, User, ReceiptData,
  ProjectStatus, ApartmentStatus, ContractStatus, PaymentStatus 
} from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const auth = firebase.auth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const convertSnapshot = <T>(doc: firebase.firestore.DocumentSnapshot): T => {
  return { id: doc.id, ...doc.data() } as T;
};

let isDemo = false;

interface MockDB {
    users: User[];
    projects: Project[];
    apartments: Apartment[];
    clients: Client[];
    contracts: Contract[];
    payments: Payment[];
}

let mockDb: MockDB = {
    users: [],
    projects: [],
    apartments: [],
    clients: [],
    contracts: [],
    payments: []
};

export const enableDemoMode = (): User => {
    isDemo = true;
    const now = new Date().toISOString();
    
    const demoUser: User = {
        id: 'demo_user', user_id: 'demo_user', name: 'Admin Démo', email: 'demo@nafat.com', role: 'admin', 
        permissions: { 
            dashboard: { view: true, create: true, edit: true, delete: true },
            projects: { view: true, create: true, edit: true, delete: true },
            apartments: { view: true, create: true, edit: true, delete: true },
            clients: { view: true, create: true, edit: true, delete: true },
            contracts: { view: true, create: true, edit: true, delete: true },
            payments: { view: true, create: true, edit: true, delete: true },
            settings: { view: true, create: true, edit: true, delete: true }
        },
        avatar_url: '', last_login: now
    };

    mockDb.users = [demoUser];
    mockDb.projects = [
        { 
            id: 'p1', project_id: 'p1', project_name: 'Résidence Les Oliviers', location: 'Quartier Riad', 
            description: 'Résidence moderne avec jardin.', total_apartments: 6, status: ProjectStatus.Active, 
            created_at: now, updated_at: now, num_floors: 4, has_rdc: true 
        }
    ];

    mockDb.apartments = [
        { 
            id: 'a1', apartment_id: 'a1', project_id: 'p1', name: 'Appart 201', type: 'apartment', floor: '2', 
            surface_m2: 95, rooms: 3, balcony: true, bathroom: 2, kitchen: true, status: ApartmentStatus.Sold, 
            price_dh: 600000, owner_name: 'Ahmed Benali', description: 'Bel appartement ensoleillé', 
            current_contract_id: 'c1', created_at: now, updated_at: now, intended_for: 'sale' 
        },
        { 
            id: 'a2', apartment_id: 'a2', project_id: 'p1', name: 'Appart 101', type: 'apartment', floor: '1', 
            surface_m2: 85, rooms: 3, balcony: false, bathroom: 1, kitchen: true, status: ApartmentStatus.ForSale, 
            price_dh: 550000, owner_name: 'Nafat', description: 'Près de l\'entrée principale', 
            created_at: now, updated_at: now, intended_for: 'sale' 
        },
        { 
            id: 'a3', apartment_id: 'a3', project_id: 'p1', name: 'Appart 102', type: 'apartment', floor: '1', 
            surface_m2: 75, rooms: 2, balcony: true, bathroom: 1, kitchen: true, status: ApartmentStatus.ForSale, 
            price_dh: 480000, owner_name: 'Nafat', description: 'Idéal couple', 
            created_at: now, updated_at: now, intended_for: 'sale' 
        },
        { 
            id: 'a4', apartment_id: 'a4', project_id: 'p1', name: 'Appart 202', type: 'apartment', floor: '2', 
            surface_m2: 110, rooms: 4, balcony: true, bathroom: 2, kitchen: true, status: ApartmentStatus.ForSale, 
            price_dh: 750000, owner_name: 'Nafat', description: 'Grand salon marocain', 
            created_at: now, updated_at: now, intended_for: 'sale' 
        }
    ];

    mockDb.clients = [
        { id: 'cl1', client_id: 'cl1', full_name: 'Ahmed Benali', phone: '0661123456', email: 'ahmed@demo.com', address: 'Agadir', cin_number: 'J123456', occupation: 'Enseignant', contracts: ['c1'], created_at: now, updated_at: now }
    ];

    mockDb.contracts = [
        { 
            id: 'c1', contract_id: 'c1', client_id: 'cl1', apartment_id: 'a1', project_id: 'p1',
            type: 'sale', amount_dh: 600000, start_date: new Date().toISOString().split('T')[0],
            status: ContractStatus.SaleInProgress, notes: 'Dossier d\'achat - Versement initial effectué', 
            created_at: now, updated_at: now
        }
    ];

    mockDb.payments = [
        { 
            id: 'pay1', payment_id: 'pay1', contract_id: 'c1', client_id: 'cl1', amount_dh: 60000, 
            payment_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), 
            payment_for: 'Versement initial', status: PaymentStatus.Paid, payment_method: 'cheque', 
            cheque_number: 'CH881273', bank_name: 'Attijariwafa Bank', created_at: now, updated_at: now 
        },
        { 
            id: 'pay2', payment_id: 'pay2', contract_id: 'c1', client_id: 'cl1', amount_dh: 30000, 
            payment_date: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString(), 
            payment_for: 'avance', status: PaymentStatus.Paid, payment_method: 'especes', 
            created_at: now, updated_at: now 
        }
    ];

    return demoUser;
};

export const disableDemoMode = () => {
    isDemo = false;
    mockDb = { users: [], projects: [], apartments: [], clients: [], contracts: [], payments: [] };
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const login = async (email: string, password: string): Promise<User> => {
    if (isDemo) disableDemoMode();
    if (!email) throw new Error("Email requis");
    try {
        const snapshot = await db.collection('users').where('email', '==', email.trim()).get();
        if (snapshot.empty) throw new Error("Utilisateur non trouvé.");
        const userData = convertSnapshot<User>(snapshot.docs[0]);
        if (userData.password && userData.password !== password) throw new Error("Mot de passe incorrect.");
        await snapshot.docs[0].ref.update({ last_login: new Date().toISOString() });
        return userData;
    } catch (error) {
        if (error instanceof Error && (error.message === "Utilisateur non trouvé." || error.message === "Mot de passe incorrect.")) {
            throw error;
        }
        if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
        handleFirestoreError(error, OperationType.GET, 'users');
    }
    return {} as User; // Should not reach here
};

export const getUsers = async (): Promise<User[]> => {
    if (isDemo) { await delay(100); return [...mockDb.users]; }
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => convertSnapshot<User>(doc));
};

export const addUser = async (userData: Partial<User>) => {
    if (isDemo) {
        mockDb.users.push({ ...userData, id: generateId(), user_id: generateId(), created_at: new Date().toISOString() } as User);
        return;
    }
    await db.collection('users').add({ ...userData, created_at: new Date().toISOString(), last_login: new Date().toISOString() });
};

export const updateUser = async (userId: string, data: Partial<User>) => {
    if (isDemo) {
        const idx = mockDb.users.findIndex(u => u.id === userId);
        if (idx !== -1) mockDb.users[idx] = { ...mockDb.users[idx], ...data };
        return;
    }
    await db.collection('users').doc(userId).update(data);
};

export const deleteUser = async (userId: string) => {
    if (isDemo) { mockDb.users = mockDb.users.filter(u => u.id !== userId); return; }
    await db.collection('users').doc(userId).delete();
};

export const clearDatabase = async () => {
    if (isDemo) { disableDemoMode(); enableDemoMode(); return; }
    const collections = ['projects', 'apartments', 'clients', 'contracts', 'payments'];
    for (const name of collections) {
        const snap = await db.collection(name).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
};

export const getProjects = async (): Promise<Project[]> => {
  if (isDemo) { await delay(100); return [...mockDb.projects]; }
  const snapshot = await db.collection('projects').get();
  return snapshot.docs.map(doc => convertSnapshot<Project>(doc));
};

export const addProject = async (project: Partial<Project>, userId: string) => {
  if (isDemo) {
      mockDb.projects.push({ ...project, id: generateId(), project_id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId, num_floors: project.num_floors || 0, has_rdc: project.has_rdc ?? true } as Project);
      return;
  }
  await db.collection('projects').add({ ...project, created_by: userId, updated_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
};

export const updateProject = async (projectId: string, data: Partial<Project>, userId: string) => {
  if (isDemo) {
      const idx = mockDb.projects.findIndex(p => p.id === projectId);
      if (idx !== -1) mockDb.projects[idx] = { ...mockDb.projects[idx], ...data, updated_at: new Date().toISOString() };
      return;
  }
  await db.collection('projects').doc(projectId).update({ ...data, updated_by: userId, updated_at: new Date().toISOString() });
};

export const deleteProject = async (projectId: string) => {
    if (isDemo) {
        const hasApts = mockDb.apartments.some(a => a.project_id === projectId);
        if (hasApts) throw new Error("Impossible de supprimer : ce projet contient encore des propriétés enregistrées. Veuillez d'abord supprimer toutes les propriétés du projet.");
        mockDb.projects = mockDb.projects.filter(p => p.id !== projectId);
        return;
    }
    if (!projectId) return;

    // Check if project has any apartments
    const aptsSnap = await db.collection('apartments').where('project_id', '==', projectId).get();
    if (!aptsSnap.empty) {
        throw new Error("Impossible de supprimer : ce projet contient encore des propriétés enregistrées. Veuillez d'abord supprimer toutes les propriétés du projet.");
    }

    await db.collection('projects').doc(projectId).delete();
};

export const getApartments = async (): Promise<Apartment[]> => {
  if (isDemo) { await delay(100); return [...mockDb.apartments]; }
  const snapshot = await db.collection('apartments').get();
  return snapshot.docs.map(doc => convertSnapshot<Apartment>(doc));
};

export const addApartment = async (apartment: Partial<Apartment>, userId: string) => {
  const status = apartment.intended_for === 'rental' ? ApartmentStatus.Available : ApartmentStatus.ForSale;
  if (isDemo) {
      mockDb.apartments.push({ ...apartment, id: generateId(), apartment_id: generateId(), status, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId } as Apartment);
      return;
  }
  await db.collection('apartments').add({ ...apartment, status, created_by: userId, updated_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
};

export const updateApartment = async (apartmentId: string, data: Partial<Apartment>, userId: string) => {
  if (isDemo) {
      const idx = mockDb.apartments.findIndex(a => a.id === apartmentId);
      if (idx !== -1) mockDb.apartments[idx] = { ...mockDb.apartments[idx], ...data, updated_at: new Date().toISOString() };
      return;
  }
  await db.collection('apartments').doc(apartmentId).update({ ...data, updated_by: userId, updated_at: new Date().toISOString() });
};

export const deleteApartment = async (apartment: Apartment) => {
    if (isDemo) {
        const hasHistory = mockDb.contracts.some(c => c.apartment_id === apartment.id);
        if (hasHistory) throw new Error("Impossible de supprimer car historique de contrats existant.");
        mockDb.apartments = mockDb.apartments.filter(a => a.id !== apartment.id);
        return;
    }
    if (!apartment.id) throw new Error("ID d'appartement manquant.");
    const snap = await db.collection("contracts").where("apartment_id", "==", apartment.id).get();
    if (!snap.empty) throw new Error("Impossible de supprimer car historique de contrats existant.");
    await db.collection('apartments').doc(apartment.id).delete();
};

export const getClients = async (): Promise<Client[]> => {
  if (isDemo) { await delay(100); return [...mockDb.clients]; }
  const snapshot = await db.collection('clients').get();
  return snapshot.docs.map(doc => convertSnapshot<Client>(doc));
};

export const addClient = async (client: Partial<Client>, userId: string) => {
  if (isDemo) {
      mockDb.clients.push({ ...client, id: generateId(), client_id: generateId(), contracts: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId } as Client);
      return;
  }
  await db.collection('clients').add({ ...client, contracts: [], created_by: userId, updated_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
};

export const deleteClient = async (clientId: string) => {
    if (isDemo) {
        const hasHistory = mockDb.contracts.some(c => c.client_id === clientId);
        if (hasHistory) throw new Error("Client avec historique de contrats existant.");
        mockDb.clients = mockDb.clients.filter(c => c.id !== clientId);
        return;
    }
    if (!clientId) throw new Error("ID de client manquant.");
    const snap = await db.collection("contracts").where("client_id", "==", clientId).get();
    if (!snap.empty) throw new Error("Client avec historique de contrats existant.");
    await db.collection("clients").doc(clientId).delete();
};

export const updateClient = async (clientId: string, data: Partial<Client>, userId: string) => {
  if (isDemo) {
      const idx = mockDb.clients.findIndex(c => c.id === clientId);
      if (idx !== -1) mockDb.clients[idx] = { ...mockDb.clients[idx], ...data, updated_at: new Date().toISOString() };
      return;
  }
  await db.collection('clients').doc(clientId).update({ ...data, updated_by: userId, updated_at: new Date().toISOString() });
};

export const getContracts = async (): Promise<Contract[]> => {
  if (isDemo) { await delay(100); return [...mockDb.contracts]; }
  const snapshot = await db.collection('contracts').get();
  return snapshot.docs.map(doc => convertSnapshot<Contract>(doc));
};

export const addContract = async (
    contractData: Partial<Contract>, 
    userId: string, 
    initialPaymentData?: Partial<Payment>
) => {
    if (isDemo) {
        const newId = generateId();
        let status = contractData.type === 'sale' ? ContractStatus.SaleInProgress : ContractStatus.Active;
        if (initialPaymentData && contractData.type === 'sale' && initialPaymentData.amount_dh! >= (contractData.amount_dh || 0)) {
            status = ContractStatus.SaleCompleted;
        }
        mockDb.contracts.push({ ...contractData, id: newId, contract_id: newId, status, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId } as Contract);
        const aptIdx = mockDb.apartments.findIndex(a => a.id === contractData.apartment_id);
        if (aptIdx !== -1) { 
            mockDb.apartments[aptIdx].status = contractData.type === 'rental' ? ApartmentStatus.Rented : ApartmentStatus.Sold; 
            mockDb.apartments[aptIdx].current_contract_id = newId; 
        }
        if (initialPaymentData) {
            mockDb.payments.push({ ...initialPaymentData, id: generateId(), payment_id: generateId(), contract_id: newId, client_id: contractData.client_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId } as Payment);
        }
        return;
    }
    try {
        const batch = db.batch();
        const contractRef = db.collection('contracts').doc();
        let status = contractData.type === 'sale' ? ContractStatus.SaleInProgress : ContractStatus.Active;
        if (initialPaymentData && contractData.type === 'sale' && initialPaymentData.amount_dh! >= contractData.amount_dh!) {
            status = ContractStatus.SaleCompleted;
        }
        batch.set(contractRef, { ...contractData, contract_id: contractRef.id, status, created_by: userId, updated_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        batch.update(db.collection('apartments').doc(contractData.apartment_id!), { status: contractData.type === 'rental' ? ApartmentStatus.Rented : ApartmentStatus.Sold, current_contract_id: contractRef.id });
        batch.update(db.collection('clients').doc(contractData.client_id!), { contracts: firebase.firestore.FieldValue.arrayUnion(contractRef.id) });
        if (initialPaymentData) {
            const payRef = db.collection('payments').doc();
            batch.set(payRef, { ...initialPaymentData, contract_id: contractRef.id, client_id: contractData.client_id, payment_id: payRef.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId });
        }
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'contracts/batch');
    }
};

export const updateContract = async (contractId: string, data: Partial<Contract>, userId: string) => {
  if (isDemo) {
      const idx = mockDb.contracts.findIndex(c => c.id === contractId);
      if (idx !== -1) mockDb.contracts[idx] = { ...mockDb.contracts[idx], ...data, updated_at: new Date().toISOString() };
      return;
  }
  await db.collection('contracts').doc(contractId).update({ ...data, updated_by: userId, updated_at: new Date().toISOString() });
};

export const changeContractApartment = async (contractId: string, newApartmentId: string, newAmountDh: number, userId: string) => {
    if (isDemo) {
        const contractIdx = mockDb.contracts.findIndex(c => c.id === contractId);
        if (contractIdx === -1) throw new Error("Dossier non trouvé.");
        const contract = mockDb.contracts[contractIdx];
        const oldApartmentId = contract.apartment_id;

        const oldAptIdx = mockDb.apartments.findIndex(a => a.id === oldApartmentId);
        const newAptIdx = mockDb.apartments.findIndex(a => a.id === newApartmentId);
        if (newAptIdx === -1) throw new Error("Nouvel appartement non trouvé.");

        const oldApt = mockDb.apartments[oldAptIdx];
        const newApt = mockDb.apartments[newAptIdx];

        // Restore old apartment status
        if (oldAptIdx !== -1) {
            mockDb.apartments[oldAptIdx].status = oldApt.intended_for === 'rental' ? ApartmentStatus.Available : ApartmentStatus.ForSale;
            mockDb.apartments[oldAptIdx].current_contract_id = "";
        }

        // Set new apartment status
        mockDb.apartments[newAptIdx].status = contract.type === 'rental' ? ApartmentStatus.Rented : ApartmentStatus.Sold;
        mockDb.apartments[newAptIdx].current_contract_id = contractId;

        // Update contract
        mockDb.contracts[contractIdx] = {
            ...contract,
            apartment_id: newApartmentId,
            project_id: newApt.project_id,
            amount_dh: newAmountDh,
            updated_at: new Date().toISOString(),
            updated_by: userId
        };
        return;
    }

    const batch = db.batch();
    const contractRef = db.collection('contracts').doc(contractId);
    const contractSnap = await contractRef.get();
    if (!contractSnap.exists) throw new Error("Dossier non trouvé.");
    const contract = contractSnap.data() as Contract;
    const oldApartmentId = contract.apartment_id;

    const oldAptRef = db.collection('apartments').doc(oldApartmentId);
    const newAptRef = db.collection('apartments').doc(newApartmentId);

    const oldAptSnap = await oldAptRef.get();
    const newAptSnap = await newAptRef.get();
    if (!newAptSnap.exists) throw new Error("Nouvel appartement non trouvé.");
    const oldApt = oldAptSnap.exists ? (oldAptSnap.data() as Apartment) : null;
    const newApt = newAptSnap.data() as Apartment;

    if (oldApt) {
        const restoredStatus = oldApt.intended_for === 'rental' ? ApartmentStatus.Available : ApartmentStatus.ForSale;
        batch.update(oldAptRef, { status: restoredStatus, current_contract_id: "" });
    }

    const newStatus = contract.type === 'rental' ? ApartmentStatus.Rented : ApartmentStatus.Sold;
    batch.update(newAptRef, { status: newStatus, current_contract_id: contractId });

    batch.update(contractRef, {
        apartment_id: newApartmentId,
        project_id: newApt.project_id,
        amount_dh: newAmountDh,
        updated_at: new Date().toISOString(),
        updated_by: userId
    });

    await batch.commit();
};

export const cancelContract = async (
    contract: Contract, 
    userId: string, 
    reason?: string,
    refundStatus?: 'none' | 'total' | 'partial',
    refundAmount?: number,
    refundNotes?: string
) => {
    if (isDemo) {
        const idx = mockDb.contracts.findIndex(c => c.id === contract.id);
        if (idx !== -1) {
            mockDb.contracts[idx].status = contract.type === 'sale' ? ContractStatus.SaleCanceled : ContractStatus.Canceled;
            mockDb.contracts[idx].rejection_reason = reason;
            mockDb.contracts[idx].refund_status = refundStatus;
            mockDb.contracts[idx].refund_amount = refundAmount;
            mockDb.contracts[idx].refund_notes = refundNotes;
        }
        const aptIdx = mockDb.apartments.findIndex(a => a.id === contract.apartment_id);
        if (aptIdx !== -1) { 
            const apt = mockDb.apartments[aptIdx];
            apt.status = apt.intended_for === 'sale' ? ApartmentStatus.ForSale : ApartmentStatus.Available; 
            apt.current_contract_id = ""; 
        }
        const clIdx = mockDb.clients.findIndex(c => c.id === contract.client_id);
        if (clIdx !== -1) {
            mockDb.clients[clIdx].has_rejection = true;
            mockDb.clients[clIdx].rejection_count = (mockDb.clients[clIdx].rejection_count || 0) + 1;
        }
        return;
    }
    const batch = db.batch();
    const newStatus = contract.type === 'sale' ? ContractStatus.SaleCanceled : ContractStatus.Canceled;
    batch.update(db.collection('contracts').doc(contract.id), { 
        status: newStatus,
        rejection_reason: reason || 'Non spécifié',
        refund_status: refundStatus || 'none',
        refund_amount: refundAmount || 0,
        refund_notes: refundNotes || '',
        updated_at: new Date().toISOString()
    });
    
    // Close recovery by canceling all pending payments
    if (!contract.id) return;
    const pendingPays = await db.collection('payments').where('contract_id', '==', contract.id).where('status', '==', PaymentStatus.Pending).get();
    pendingPays.forEach(p => batch.update(p.ref, { status: PaymentStatus.Canceled }));

    if (!contract.apartment_id) throw new Error("Contract missing apartment_id");
    if (!contract.client_id) throw new Error("Contract missing client_id");
    
    const aptSnap = await db.collection('apartments').doc(contract.apartment_id).get();
    if (!aptSnap.exists) throw new Error("Apartment not found");
    const aptData = aptSnap.data() as Apartment;
    const restoredStatus = aptData.intended_for === 'rental' ? ApartmentStatus.Available : ApartmentStatus.ForSale;
    
    batch.update(db.collection('apartments').doc(contract.apartment_id), { status: restoredStatus, current_contract_id: "" });
    
    const clientRef = db.collection('clients').doc(contract.client_id);
    const clientSnap = await clientRef.get();
    const clientData = clientSnap.data() as Client;
    batch.update(clientRef, { 
        has_rejection: true, 
        rejection_count: (clientData.rejection_count || 0) + 1 
    });
    
    await batch.commit();
};

export const endContract = async (contract: Contract, userId: string) => {
    if (isDemo) {
        const idx = mockDb.contracts.findIndex(c => c.id === contract.id);
        if (idx !== -1) mockDb.contracts[idx].status = ContractStatus.Ended;
        const aptIdx = mockDb.apartments.findIndex(a => a.id === contract.apartment_id);
        if (aptIdx !== -1) { mockDb.apartments[aptIdx].status = ApartmentStatus.Available; mockDb.apartments[aptIdx].current_contract_id = ""; }
        return;
    }
    const batch = db.batch();
    batch.update(db.collection('contracts').doc(contract.id), { status: ContractStatus.Ended });
    batch.update(db.collection('apartments').doc(contract.apartment_id), { status: ApartmentStatus.Available, current_contract_id: "" });
    await batch.commit();
};

export const renewContract = async (oldContract: Contract, newContractData: Partial<Contract>, userId: string) => {
    if (isDemo) {
        const oldIdx = mockDb.contracts.findIndex(c => c.id === oldContract.id);
        if (oldIdx !== -1) mockDb.contracts[oldIdx].status = ContractStatus.Renewed;
        const newId = generateId();
        mockDb.contracts.push({ ...newContractData, id: newId, contract_id: newId, previous_contract_id: oldContract.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId } as Contract);
        const aptIdx = mockDb.apartments.findIndex(a => a.id === oldContract.apartment_id);
        if (aptIdx !== -1) {
            mockDb.apartments[aptIdx].current_contract_id = newId;
        }
        return;
    }
    const batch = db.batch();
    batch.update(db.collection('contracts').doc(oldContract.id), { status: ContractStatus.Renewed });
    const newRef = db.collection('contracts').doc();
    batch.set(newRef, { ...newContractData, contract_id: newRef.id, previous_contract_id: oldContract.id, created_by: userId, created_at: new Date().toISOString() });
    batch.update(db.collection('apartments').doc(oldContract.apartment_id), { current_contract_id: newRef.id });
    await batch.commit();
};

export const deleteContract = async (contractId: string) => {
    if (isDemo) {
        mockDb.payments = mockDb.payments.filter(p => p.contract_id !== contractId);
        const c = mockDb.contracts.find(c => c.id === contractId);
        if (c) {
            const aptIdx = mockDb.apartments.findIndex(a => a.id === c.apartment_id);
            if (aptIdx !== -1) {
                mockDb.apartments[aptIdx].current_contract_id = "";
                mockDb.apartments[aptIdx].status = ApartmentStatus.Available;
            }
        }
        mockDb.contracts = mockDb.contracts.filter(c => c.id !== contractId);
        return;
    }
    const batch = db.batch();
    if (!contractId) { await batch.commit(); return; }
    const pays = await db.collection("payments").where("contract_id", "==", contractId).get();
    pays.forEach(d => batch.delete(d.ref));
    const cSnap = await db.collection("contracts").doc(contractId).get();
    if (cSnap.exists) {
        const data = cSnap.data() as Contract;
        batch.update(db.collection("apartments").doc(data.apartment_id), { current_contract_id: "", status: ApartmentStatus.Available });
    }
    batch.delete(db.collection("contracts").doc(contractId));
    await batch.commit();
};

export const getExpiringContracts = async (): Promise<Contract[]> => {
    const limit = new Date(); limit.setDate(limit.getDate() + 60);
    if (isDemo) return mockDb.contracts.filter(c => c.status === ContractStatus.Active && c.end_date && new Date(c.end_date) <= limit);
    const snap = await db.collection('contracts').where('status', '==', ContractStatus.Active).where('type', '==', 'rental').get();
    return snap.docs.map(doc => convertSnapshot<Contract>(doc)).filter(c => c.end_date && new Date(c.end_date) <= limit);
};

export const syncContractsAndApartments = async (userId: string) => {};

export const getPayments = async (): Promise<Payment[]> => {
  if (isDemo) { await delay(100); return [...mockDb.payments]; }
  const snapshot = await db.collection('payments').get();
  return snapshot.docs.map(doc => convertSnapshot<Payment>(doc));
};

export const addPayment = async (payment: Partial<Payment>, userId: string) => {
  if (isDemo) {
      const newPay = { ...payment, id: generateId(), payment_id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId } as Payment;
      mockDb.payments.push(newPay);
      const contract = mockDb.contracts.find(c => c.id === payment.contract_id);
      if (contract?.type === 'sale') {
          const total = mockDb.payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid).reduce((sum, p) => sum + p.amount_dh, 0);
          if (total >= contract.amount_dh) contract.status = ContractStatus.SaleCompleted;
      }
      return;
  }
  await db.collection('payments').add({ ...payment, created_by: userId, updated_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  const cSnap = await db.collection('contracts').doc(payment.contract_id!).get();
  if (cSnap.exists) {
      const c = cSnap.data() as Contract;
      if (c.type === 'sale') {
          const pays = await db.collection('payments').where('contract_id', '==', cSnap.id).where('status', '==', PaymentStatus.Paid).get();
          const total = pays.docs.reduce((sum, d) => sum + (d.data().amount_dh || 0), 0);
          if (total >= c.amount_dh) await cSnap.ref.update({ status: ContractStatus.SaleCompleted });
      }
  }
};

export const updatePayment = async (paymentId: string, data: Partial<Payment>) => {
    if (isDemo) {
        const idx = mockDb.payments.findIndex(p => p.id === paymentId);
        if (idx !== -1) mockDb.payments[idx] = { ...mockDb.payments[idx], ...data, updated_at: new Date().toISOString() };
        return;
    }
    await db.collection('payments').doc(paymentId).update({ ...data, updated_at: new Date().toISOString() });
};

export const deletePayment = async (paymentId: string) => {
    if (isDemo) {
        mockDb.payments = mockDb.payments.filter(p => p.id !== paymentId);
        return;
    }
    await db.collection('payments').doc(paymentId).delete();
};

export const cancelPayment = async (paymentId: string, userId: string) => {
    if (isDemo) {
        const idx = mockDb.payments.findIndex(p => p.id === paymentId);
        if (idx !== -1) mockDb.payments[idx].status = PaymentStatus.Canceled;
        return;
    }
    await db.collection('payments').doc(paymentId).update({ status: PaymentStatus.Canceled });
};

export const markPaymentAsLate = async (paymentId: string, userId: string) => {
    if (isDemo) {
        const idx = mockDb.payments.findIndex(p => p.id === paymentId);
        if (idx !== -1) mockDb.payments[idx].status = PaymentStatus.Late;
        return;
    }
    await db.collection('payments').doc(paymentId).update({ status: PaymentStatus.Late });
};

export const getReceiptData = async (paymentId: string): Promise<ReceiptData> => {
    if (isDemo) {
        const payment = mockDb.payments.find(p => p.id === paymentId);
        const contract = mockDb.contracts.find(c => c.id === payment?.contract_id);
        const client = mockDb.clients.find(c => c.id === payment?.client_id);
        const apartment = mockDb.apartments.find(a => a.id === contract?.apartment_id);
        const project = mockDb.projects.find(p => p.id === contract?.project_id);
        const allContractPayments = mockDb.payments.filter(p => p.contract_id === contract?.id && p.status === PaymentStatus.Paid);
        if (!payment || !client || !contract || !apartment || !project) throw new Error("Missing data");
        return { payment, client, contract, apartment, project, allContractPayments };
    }
    const pSnap = await db.collection("payments").doc(paymentId).get();
    if (!pSnap.exists) throw new Error("Payment not found");
    const payment = convertSnapshot<Payment>(pSnap);
    
    if (!payment.contract_id) throw new Error("Contract ID missing in payment");
    const cSnap = await db.collection("contracts").doc(payment.contract_id).get();
    if (!cSnap.exists) throw new Error("Contract not found");
    const contract = convertSnapshot<Contract>(cSnap);
    
    if (!payment.client_id) throw new Error("Payment missing client_id");
    const clientSnap = await db.collection("clients").doc(payment.client_id).get();
    if (!clientSnap.exists) throw new Error("Client not found");
    const client = convertSnapshot<Client>(clientSnap);

    if (!contract.apartment_id) throw new Error("Contract missing apartment_id");
    const apartmentSnap = await db.collection("apartments").doc(contract.apartment_id).get();
    if (!apartmentSnap.exists) throw new Error("Apartment not found");
    const apartment = convertSnapshot<Apartment>(apartmentSnap);

    if (!contract.project_id) throw new Error("Contract missing project_id");
    const projectSnap = await db.collection("projects").doc(contract.project_id).get();
    if (!projectSnap.exists) throw new Error("Project not found");
    const project = convertSnapshot<Project>(projectSnap);
    
    if (!contract.id) throw new Error("Contract ID missing");
    const pays = await db.collection("payments").where("contract_id", "==", contract.id).where("status", "==", PaymentStatus.Paid).get();
    const allContractPayments = pays.docs.map(doc => convertSnapshot<Payment>(doc));
    return { payment, client, contract, apartment, project, allContractPayments };
};

export interface ReservationData {
    contract: Contract; client: Client; apartment: Apartment; project: Project; totalPaid: number; payments: Payment[];
}

export const getReservationData = async (contractId: string): Promise<ReservationData> => {
    if (!contractId) throw new Error("ID de contrat manquant.");
    if (isDemo) {
        const contract = mockDb.contracts.find(c => c.id === contractId);
        const client = mockDb.clients.find(c => c.id === contract?.client_id);
        const apartment = mockDb.apartments.find(a => a.id === contract?.apartment_id);
        const project = mockDb.projects.find(p => p.id === contract?.project_id);
        const payments = mockDb.payments.filter(p => p.contract_id === contractId && p.status === PaymentStatus.Paid);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount_dh, 0);
        if (!contract || !client || !apartment || !project) throw new Error("Missing data");
        return { contract, client, apartment, project, totalPaid, payments };
    }
    const contractSnap = await db.collection("contracts").doc(contractId).get();
    if (!contractSnap.exists) throw new Error("Contract not found");
    const contract = convertSnapshot<Contract>(contractSnap);

    if (!contract.client_id) throw new Error("Contract missing client_id");
    const clientSnap = await db.collection("clients").doc(contract.client_id).get();
    if (!clientSnap.exists) throw new Error("Client not found");
    const client = convertSnapshot<Client>(clientSnap);

    if (!contract.apartment_id) throw new Error("Contract missing apartment_id");
    const apartmentSnap = await db.collection("apartments").doc(contract.apartment_id).get();
    if (!apartmentSnap.exists) throw new Error("Apartment not found");
    const apartment = convertSnapshot<Apartment>(apartmentSnap);

    if (!contract.project_id) throw new Error("Contract missing project_id");
    const projectSnap = await db.collection("projects").doc(contract.project_id).get();
    if (!projectSnap.exists) throw new Error("Project not found");
    const project = convertSnapshot<Project>(projectSnap);

    const pays = await db.collection("payments").where("contract_id", "==", contractId).where("status", "==", PaymentStatus.Paid).get();
    const payments = pays.docs.map(doc => convertSnapshot<Payment>(doc));
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_dh || 0), 0);
    return { contract, client, apartment, project, totalPaid, payments };
};
