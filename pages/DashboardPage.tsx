
import React, { useState, useEffect, useMemo } from 'react';
import { getContracts, getClients, getPayments, getExpiringContracts, getProjects, getApartments, syncContractsAndApartments } from '../services/api';
import { Contract, Client, Payment, ContractStatus, Project, Apartment, ApartmentStatus, PaymentStatus } from '../types';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import DashboardSection from '../components/DashboardSection';
import { DollarSignIcon, AlertTriangleIcon, TrendingUpIcon, HomeIcon, FileTextIcon, BuildingIcon, CoinsIcon, ClockIcon, PlusIcon } from '../components/icons/Icons';
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
        </div>
    );
};

export default DashboardPage;
