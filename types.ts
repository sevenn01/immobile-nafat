
export enum ProjectStatus {
  Active = 'active',
  InProgress = 'in_progress',
  Paused = 'paused',
  Completed = 'completed'
}

export enum ApartmentStatus {
  Available = 'available',
  Rented = 'rented',
  Maintenance = 'maintenance',
  ForSale = 'for_sale',
  Sold = 'sold'
}

export enum ContractStatus {
  Active = 'active',
  Ended = 'ended',
  Pending = 'pending',
  Canceled = 'canceled',
  Renewed = 'renewed',
  SaleInProgress = 'sale_in_progress',
  SaleCompleted = 'sale_completed',
  SaleCanceled = 'sale_canceled'
}

export enum PaymentStatus {
  Paid = 'paid',
  Pending = 'pending',
  Late = 'late',
  Canceled = 'canceled'
}

export type PaymentMethod = 'especes' | 'cheque' | 'virement' | 'effet';

export interface Project {
  id: string;
  project_id: string;
  project_name: string;
  location: string;
  description: string;
  total_apartments: number;
  rented_apartments_count?: number;
  sold_apartments_count?: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  num_floors: number;
  has_rdc: boolean;
  registered_count?: number;
}

export interface Apartment {
  id: string;
  apartment_id: string;
  project_id: string;
  name: string;
  type: 'apartment' | 'garage';
  floor?: string;
  surface_m2: number;
  rooms?: number;
  balcony?: boolean;
  bathroom?: number;
  kitchen?: boolean;
  status: ApartmentStatus;
  price_dh: number;
  sale_price_dh?: number;
  owner_name: string;
  description: string;
  current_contract_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  intended_for: 'sale' | 'rental';
}

export interface Client {
  id: string;
  client_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  cin_number: string;
  occupation: string;
  contracts: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  has_rejection?: boolean;
  rejection_count?: number;
}

export interface Contract {
  id: string;
  contract_id: string;
  client_id: string;
  apartment_id: string;
  project_id: string;
  amount_dh: number;
  type: 'rental' | 'sale';
  start_date: string;
  status: ContractStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  duration_months?: number;
  end_date?: string;
  months_left?: number;
  previous_contract_id?: string;
  renewed_contract_id?: string;
  rejection_reason?: string;
}

export interface Payment {
    id: string;
    payment_id: string;
    contract_id: string;
    client_id: string;
    amount_dh: number;
    payment_date: string;
    payment_for: string;
    notes?: string;
    status: PaymentStatus;
    receipt_url?: string;
    proof_url?: string; // New field for uploaded payment evidence
    payment_method: PaymentMethod;
    cheque_number?: string;
    bank_name?: string;
    transfer_series?: string;
    effect_number?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: string;
    updated_by?: string;
}

export interface PermissionSet {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
}

export interface AppPermissions {
    dashboard: PermissionSet;
    projects: PermissionSet;
    apartments: PermissionSet;
    clients: PermissionSet;
    contracts: PermissionSet;
    payments: PermissionSet;
    settings: PermissionSet;
}

export interface User {
    id: string;
    user_id: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'agent';
    permissions: AppPermissions;
    avatar_url: string;
    last_login: string;
    created_at?: string;
}

export interface ReceiptData {
    payment: Payment;
    client: Client;
    contract: Contract;
    apartment: Apartment;
    project: Project;
    allContractPayments: Payment[];
}
