
import React, { useState, useEffect, useMemo } from 'react';
import { getContracts, getClients, getPayments, getExpiringContracts, getProjects, getApartments, syncContractsAndApartments } from '../services/api';
import { Contract, Client, Payment, ContractStatus, Project, Apartment, ApartmentStatus, PaymentStatus } from '../types';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import DashboardSection from '../components/DashboardSection';
import { DollarSignIcon, AlertTriangleIcon, TrendingUpIcon, HomeIcon, FileTextIcon, BuildingIcon, CoinsIcon, ClockIcon, PlusIcon, BedIcon, BathIcon, SunIcon, FlameIcon, GarageIcon, ListIcon, GridIcon } from '../components/icons/Icons';
import { useAuth } from '../auth/AuthContext';

interface OverduePaymentInfo {
    client: Client;
    contract: Contract;
    monthsOverdue: number;
    apartment?: Apartment;
    totalOwed: number;
}

interface UnpaidExpiredInfo {
    client?: Client;
    contract: Contract;
    apartment?: Apartment;
    unpaidMonths: number;
}

interface UnsettledSaleInfo {
    client?: Client;
    contract: Contract;
    apartment?: Apartment;
    totalPaid: number;
    remaining: number;
}

type TimePeriod = 'this_month' | 'last_month' | 'last_3_months' | 'custom_month' | 'all_time';

const DashboardPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('this_month');
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [activeDboardProjectTab, setActiveDboardProjectTab] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const { user } = useAuth();

    useEffect(() => {
        const fetchDataAndSync = async () => {
            if (!user) return;
            try {
                setLoading(true);
                await syncContractsAndApartments(user.user_id);
                const [apartmentsData, contractsData, clientsData, paymentsData, expiringData, projectsData] = await Promise.all([
                    getApartments(), getContracts(), getClients(), getPayments(), getExpiringContracts(), getProjects()
                ]);
                setApartments(apartmentsData);
                setContracts(contractsData);
                setClients(clientsData);
                setPayments(paymentsData);
                setExpiringContracts(expiringData);
                setProjects(projectsData);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDataAndSync();
    }, [user]);

    const activeContracts = useMemo(() => contracts.filter(c => c.status === ContractStatus.Active), [contracts]);

    const timeFilteredPayments = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (timePeriod) {
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                 return payments.filter(p => {
                    const paymentDate = new Date(p.payment_date);
                    return p.status === PaymentStatus.Paid && paymentDate >= startDate && paymentDate <= lastMonthEndDate;
                });
            case 'last_3_months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                return payments.filter(p => {
                    const paymentDate = new Date(p.payment_date);
                    return p.status === PaymentStatus.Paid && paymentDate >= startDate;
                });
            case 'custom_month':
                const [year, month] = selectedMonth.split('-').map(Number);
                startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);
                return payments.filter(p => {
                    const paymentDate = new Date(p.payment_date);
                    return p.status === PaymentStatus.Paid && paymentDate >= startDate && paymentDate <= endDate;
                });
            case 'all_time':
                return payments.filter(p => p.status === PaymentStatus.Paid);
            case 'this_month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                return payments.filter(p => {
                    const paymentDate = new Date(p.payment_date);
                    return p.status === PaymentStatus.Paid && paymentDate >= startDate;
                });
        }
    }, [payments, timePeriod, selectedMonth]);
    
    const stats = useMemo(() => {
        const filteredContracts = contracts.filter(c => {
            const contractDate = new Date(c.start_date);
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            switch (timePeriod) {
                case 'this_month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    return contractDate >= startDate;
                case 'last_month':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                    return contractDate >= startDate && contractDate <= endDate;
                case 'last_3_months':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                    return contractDate >= startDate;
                case 'custom_month':
                    const [year, month] = selectedMonth.split('-').map(Number);
                    startDate = new Date(year, month - 1, 1);
                    endDate = new Date(year, month, 0, 23, 59, 59);
                    return contractDate >= startDate && contractDate <= endDate;
                case 'all_time':
                default:
                    return true;
            }
        });

        return {
            rented: filteredContracts.filter(c => c.type === 'rental').length,
            sold: filteredContracts.filter(c => c.type === 'sale').length
        };
    }, [contracts, timePeriod, selectedMonth]);

    const rentalRevenue = useMemo(() => {
        const rentalContractIds = new Set(contracts.filter(c => c.type === 'rental').map(c => c.id));
        return timeFilteredPayments
            .filter(p => rentalContractIds.has(p.contract_id))
            .reduce((sum, p) => sum + p.amount_dh, 0);
    }, [timeFilteredPayments, contracts]);

    const salesRevenue = useMemo(() => {
        const saleContractIds = new Set(contracts.filter(c => c.type === 'sale').map(c => c.id));
        return timeFilteredPayments
            .filter(p => saleContractIds.has(p.contract_id))
            .reduce((sum, p) => sum + p.amount_dh, 0);
    }, [timeFilteredPayments, contracts]);

    const overduePaymentsInfo = useMemo<OverduePaymentInfo[]>(() => {
        const today = new Date();
        const overdue: OverduePaymentInfo[] = [];
        
        activeContracts.filter(c => c.type === 'rental').forEach(contract => {
            const startDate = new Date(contract.start_date + 'T00:00:00Z');
            const expectedTotal = contract.amount_dh;
            const totalPaid = payments
                .filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid)
                .reduce((sum, p) => sum + p.amount_dh, 0);
            if (totalPaid < expectedTotal) {
                const client = clients.find(c => c.id === contract.client_id);
                if (client) overdue.push({ client, contract, monthsOverdue: 1, totalOwed: expectedTotal - totalPaid });
            }
        });
        return overdue;
    }, [activeContracts, payments, clients]);

    const unsettledSalesInfo = useMemo<UnsettledSaleInfo[]>(() => {
        return contracts.filter(c => c.type === 'sale' && c.status === ContractStatus.SaleInProgress).map(contract => {
            const totalPaid = payments.filter(p => p.contract_id === contract.id && p.status === PaymentStatus.Paid).reduce((sum, p) => sum + p.amount_dh, 0);
            return {
                contract,
                client: clients.find(cl => cl.id === contract.client_id),
                apartment: apartments.find(a => a.id === contract.apartment_id),
                totalPaid,
                remaining: contract.amount_dh - totalPaid
            };
        });
    }, [contracts, payments, clients, apartments]);

    const availableApartments = useMemo(() => {
        return apartments.filter(a => {
            const contract = contracts.find(c => 
                c.id === a.current_contract_id || 
                (c.apartment_id === a.id && c.status !== ContractStatus.Canceled && c.status !== ContractStatus.SaleCanceled)
            );
            const isOccupied = a.status === ApartmentStatus.Rented || a.status === ApartmentStatus.Sold || !!contract;
            return !isOccupied && (a.status === ApartmentStatus.Available || a.status === ApartmentStatus.ForSale);
        });
    }, [apartments, contracts]);

    const projectsWithAvailableCount = useMemo(() => {
        return projects.map(p => {
            const count = availableApartments.filter(a => a.project_id === p.id).length;
            return {
                ...p,
                availableCount: count
            };
        });
    }, [projects, availableApartments]);

    const displayedAvailableApartments = useMemo(() => {
        if (activeDboardProjectTab === 'all') {
            return availableApartments;
        }
        return availableApartments.filter(a => a.project_id === activeDboardProjectTab);
    }, [availableApartments, activeDboardProjectTab]);

    if (loading) return <div className="flex justify-center items-center h-64 text-gray-500 font-bold italic">Chargement du tableau de bord...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold text-gray-900">Tableau de Bord</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {timePeriod === 'custom_month' && (
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl bg-white shadow-sm font-semibold text-green-600 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                    )}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-sm">
                        <button 
                            onClick={() => setTimePeriod('this_month')} 
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${timePeriod === 'this_month' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Ce mois
                        </button>
                        <button 
                            onClick={() => setTimePeriod('custom_month')} 
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${timePeriod === 'custom_month' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Mois précis
                        </button>
                        <button 
                            onClick={() => setTimePeriod('all_time')} 
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${timePeriod === 'all_time' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Global
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Recettes Locatives" value={`${rentalRevenue.toLocaleString()} DH`} icon={<DollarSignIcon />} color="green" />
                <StatCard title="Recettes Ventes" value={`${salesRevenue.toLocaleString()} DH`} icon={<DollarSignIcon />} color="purple" />
                <StatCard title="Nouv. Locations" value={stats.rented} icon={<HomeIcon />} color="blue" />
                <StatCard title="Nouv. Ventes" value={stats.sold} icon={<TrendingUpIcon />} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <DashboardSection title="Impayés Récents" icon={<AlertTriangleIcon className="text-red-500"/>}>
                    {overduePaymentsInfo.length > 0 ? (
                        <ul className="divide-y divide-gray-100 -mx-6 -my-6">
                            {overduePaymentsInfo.map(({ client, contract, totalOwed }) => (
                                <li key={`${client.id}-${contract.id}`} className="py-3 px-6 hover:bg-gray-50 flex justify-between items-center group transition-colors">
                                    <span className="text-sm font-semibold text-gray-800 group-hover:text-green-600">{client.full_name}</span>
                                    <span className="text-sm font-semibold text-gray-900">{totalOwed.toLocaleString()} DH</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-500 text-sm italic">Aucun retard à signaler.</p>}
                </DashboardSection>

                <DashboardSection title="Reliquats de Vente" icon={<CoinsIcon className="text-indigo-500" />}>
                     {unsettledSalesInfo.length > 0 ? (
                        <ul className="divide-y divide-gray-100 -mx-6 -my-6">
                            {unsettledSalesInfo.map(({ client, contract, remaining }) => (
                                <li key={`${client?.id || 'unknown'}-${contract.id}`} className="py-3 px-6 hover:bg-gray-50 flex justify-between items-center group transition-colors">
                                    <span className="text-sm font-semibold text-gray-800 group-hover:text-green-600">{client?.full_name}</span>
                                    <span className="text-sm font-semibold text-gray-900">{remaining.toLocaleString()} DH</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center text-gray-500 text-sm italic">Toutes les ventes sont réglées.</p>}
                </DashboardSection>
            </div>

            <div className="mt-6 md:mt-8">
                <DashboardSection title="Appartements Disponibles par Projet" icon={<BuildingIcon className="text-green-600" />}>
                    {/* Horizontal scrollable tab list of projects and grid/list toggler */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-gray-150 pb-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setActiveDboardProjectTab('all')}
                                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                                    activeDboardProjectTab === 'all'
                                        ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                            >
                                Tous ({availableApartments.length})
                            </button>
                            {projectsWithAvailableCount.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActiveDboardProjectTab(p.id)}
                                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                                        activeDboardProjectTab === p.id
                                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100'
                                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                                    }`}
                                >
                                    {p.project_name} ({p.availableCount})
                                </button>
                            ))}
                        </div>

                        {/* List / Grid Toggles */}
                        <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-white text-green-700 shadow-sm border border-gray-150'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                                title="Vue Liste"
                            >
                                <ListIcon className="w-3.5 h-3.5" />
                                <span>Liste</span>
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-white text-green-700 shadow-sm border border-gray-150'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                                title="Vue Grille"
                            >
                                <GridIcon className="w-3.5 h-3.5" />
                                <span>Grille</span>
                            </button>
                        </div>
                    </div>

                    {displayedAvailableApartments.length > 0 ? (
                        viewMode === 'list' ? (
                            <div className="overflow-x-auto -mx-6">
                                <div className="inline-block min-w-full align-middle px-6">
                                    <div className="overflow-hidden border border-gray-100 rounded-2xl bg-white shadow-sm">
                                        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th scope="col" className="py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Bien</th>
                                                    <th scope="col" className="py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Projet</th>
                                                    <th scope="col" className="py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Usage</th>
                                                    <th scope="col" className="py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Détails</th>
                                                    <th scope="col" className="py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Prix</th>
                                                    <th scope="col" className="py-3 px-4 font-bold text-gray-400 uppercase tracking-wider text-[10px] text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {displayedAvailableApartments.map(apt => {
                                                    const project = projects.find(p => p.id === apt.project_id);
                                                    const isSale = apt.intended_for === 'sale';
                                                    return (
                                                        <tr key={apt.id} className="hover:bg-green-50/30 transition-colors group">
                                                            {/* Name / Icon */}
                                                            <td className="py-4 px-4 whitespace-nowrap">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100/50 text-green-600 group-hover:bg-green-100/50 transition-colors">
                                                                        {apt.type === 'garage' ? <GarageIcon className="w-5 h-5 text-gray-500" /> : <HomeIcon className="w-5 h-5 text-green-600" />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 group-hover:text-green-700 transition-colors text-sm">{apt.name}</div>
                                                                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                                                                            {apt.type === 'garage' ? 'Garage' : `Étage: ${apt.floor}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {/* Project */}
                                                            <td className="py-4 px-4 whitespace-nowrap">
                                                                <span className="text-gray-700 font-semibold text-xs">{project?.project_name || 'N/A'}</span>
                                                            </td>
                                                            {/* Usage */}
                                                            <td className="py-4 px-4 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                                                                    isSale 
                                                                        ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                                                        : 'bg-green-50 text-green-700 border border-green-100'
                                                                }`}>
                                                                    {isSale ? 'A Vendre' : 'A Louer'}
                                                                </span>
                                                            </td>
                                                            {/* Specifications */}
                                                            <td className="py-4 px-4">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                                                                        {apt.surface_m2} m²
                                                                    </span>
                                                                    {apt.type === 'apartment' && apt.rooms !== undefined && (
                                                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded flex items-center space-x-1">
                                                                            <BedIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                            <span>{apt.rooms}</span>
                                                                        </span>
                                                                    )}
                                                                    {apt.type === 'apartment' && apt.bathroom !== undefined && (
                                                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded flex items-center space-x-1">
                                                                            <BathIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                            <span>{apt.bathroom}</span>
                                                                        </span>
                                                                    )}
                                                                    {apt.type === 'apartment' && apt.balcony && (
                                                                        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded bg-orange-50 text-orange-600 border border-orange-100">
                                                                            <SunIcon className="w-3 h-3 text-orange-400" />
                                                                            <span>Balcon</span>
                                                                        </span>
                                                                    )}
                                                                    {apt.type === 'apartment' && apt.kitchen && (
                                                                        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded bg-red-50 text-red-600 border border-red-100">
                                                                            <FlameIcon className="w-3 h-3 text-red-400" />
                                                                            <span>Cuisine</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {/* Price */}
                                                            <td className="py-4 px-4 whitespace-nowrap text-right">
                                                                <div className="font-extrabold text-gray-900 text-sm">
                                                                    {apt.price_dh.toLocaleString()} <span className="text-[10px] font-bold">DH</span>
                                                                </div>
                                                                {!isSale && <span className="text-[10px] text-gray-400">/ mois</span>}
                                                            </td>
                                                            {/* Action */}
                                                            <td className="py-4 px-4 whitespace-nowrap text-right">
                                                                <Link 
                                                                    to={`/projets/${apt.project_id}`}
                                                                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all active:scale-95 shadow-md shadow-green-100"
                                                                >
                                                                    Gérer
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {displayedAvailableApartments.map(apt => {
                                    const project = projects.find(p => p.id === apt.project_id);
                                    const isSale = apt.intended_for === 'sale';
                                    return (
                                        <div 
                                            key={apt.id} 
                                            className="bg-white rounded-2xl border border-gray-100 hover:border-green-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col p-5 group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center space-x-1.5 text-green-600">
                                                    {apt.type === 'garage' ? <GarageIcon className="w-3.5 h-3.5 text-gray-500" /> : <HomeIcon className="w-3.5 h-3.5 text-green-600" />}
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${apt.type === 'garage' ? 'text-gray-500' : 'text-green-600'}`}>
                                                        {apt.type === 'garage' ? 'Garage' : 'Appartement'}
                                                    </span>
                                                </div>
                                                <span className={`px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                                                    isSale 
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                                        : 'bg-green-50 text-green-700 border border-green-100'
                                                }`}>
                                                    {isSale ? 'A Vendre' : 'A Louer'}
                                                </span>
                                            </div>

                                            <h4 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-1 truncate">
                                                {apt.name}
                                            </h4>
                                            
                                            {project && (
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-4 flex items-center space-x-1">
                                                    <BuildingIcon className="w-3 h-3 text-gray-300" />
                                                    <span>{project.project_name}</span>
                                                </p>
                                            )}

                                            {/* Specifications Grid */}
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-4 pt-3 border-t border-gray-50">
                                                <div className="flex items-center space-x-2 text-gray-500">
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 w-5 h-5 rounded flex items-center justify-center">m²</span>
                                                    <div className="flex items-baseline space-x-0.5">
                                                        <span className="font-medium text-gray-500">Surface:</span>
                                                        <span className="font-semibold text-gray-800">{apt.surface_m2} m²</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 text-gray-500">
                                                    <BuildingIcon className="w-4 h-4 text-gray-400" />
                                                    <div className="flex items-baseline space-x-0.5">
                                                        <span className="font-medium text-gray-500">Étage:</span>
                                                        <span className="font-semibold text-gray-800">{apt.floor === 'RDC' ? 'RDC' : `${apt.floor}`}</span>
                                                    </div>
                                                </div>

                                                {apt.type === 'apartment' && apt.rooms !== undefined && (
                                                    <div className="flex items-center space-x-2 text-gray-500">
                                                        <BedIcon className="w-4 h-4 text-gray-400" />
                                                        <div className="flex items-baseline space-x-0.5">
                                                            <span className="font-medium text-gray-500">Pièces:</span>
                                                            <span className="font-semibold text-gray-800">{apt.rooms}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {apt.type === 'apartment' && apt.bathroom !== undefined && (
                                                    <div className="flex items-center space-x-2 text-gray-500">
                                                        <BathIcon className="w-4 h-4 text-gray-400" />
                                                        <div className="flex items-baseline space-x-0.5">
                                                            <span className="font-medium text-gray-500">S. Bain:</span>
                                                            <span className="font-semibold text-gray-800">{apt.bathroom}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Amenities Row */}
                                            {apt.type === 'apartment' && (apt.balcony || apt.kitchen || apt.titre) && (
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {apt.balcony && (
                                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-semibold rounded bg-orange-50 text-orange-600 border border-orange-100">
                                                            <SunIcon className="w-2.5 h-2.5 text-orange-400" />
                                                            <span>Balcon</span>
                                                        </span>
                                                    )}
                                                    {apt.kitchen && (
                                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-semibold rounded bg-red-50 text-red-600 border border-red-100">
                                                            <FlameIcon className="w-2.5 h-2.5 text-red-400" />
                                                            <span>Cuisine</span>
                                                        </span>
                                                    )}
                                                    {apt.titre && (
                                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-semibold rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                            <span className="text-[8px] font-bold text-indigo-400">TF:</span>
                                                            <span>{apt.titre}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Price and Action Footer */}
                                            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">PRIX</span>
                                                    <div className="flex items-baseline space-x-0.5">
                                                        <span className="text-lg font-extrabold text-gray-900">
                                                            {apt.price_dh.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-900">DH</span>
                                                        {!isSale && <span className="text-[10px] text-gray-400 ml-1">/ mois</span>}
                                                    </div>
                                                </div>
                                                <Link 
                                                    to={`/projets/${apt.project_id}`}
                                                    className="px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all active:scale-95 shadow-md shadow-green-100"
                                                >
                                                    Gérer
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                            <HomeIcon className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-sm font-semibold text-gray-500">Aucun bien disponible trouvé.</p>
                            <p className="text-xs text-gray-400 mt-1">Tous les biens de ce projet sont actuellement vendus ou loués.</p>
                        </div>
                    )}
                </DashboardSection>
            </div>
        </div>
    );
};

export default DashboardPage;
