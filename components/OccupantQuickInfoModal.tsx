import React from 'react';
import { Apartment, Project, Contract, Client, ContractStatus } from '../types';
import Modal from './Modal';
import { Link } from 'react-router-dom';
import { HomeIcon, BuildingIcon, FileTextIcon } from './icons/Icons';
import { User, Phone, CreditCard, Calendar, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface OccupantQuickInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment | null;
  project?: Project | null;
  contract?: Contract | null;
  client?: Client | null;
  totalPaid?: number;
}

export const OccupantQuickInfoModal: React.FC<OccupantQuickInfoModalProps> = ({
  isOpen,
  onClose,
  apartment,
  project,
  contract,
  client,
  totalPaid = 0
}) => {
  if (!apartment) return null;

  const isSale = apartment.intended_for === 'sale';
  const totalPrice = contract?.amount_dh || apartment.sale_price_dh || apartment.price_dh || 0;
  const remainingAmount = Math.max(0, totalPrice - totalPaid);

  const getContractStatusBadge = (status?: ContractStatus) => {
    if (!status) return null;
    switch (status) {
      case ContractStatus.Active:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-200">Actif (En Cours)</span>;
      case ContractStatus.SaleInProgress:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Vente en cours</span>;
      case ContractStatus.SaleCompleted:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">Vente Finalisée</span>;
      case ContractStatus.Ended:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">Terminé</span>;
      case ContractStatus.Canceled:
      case ContractStatus.SaleCanceled:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800">Annulé</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <Modal title={`Informations de Réservation - ${apartment.name}`} isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {/* Apartment Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
              <HomeIcon className="w-4 h-4" />
              <span>{apartment.type === 'garage' ? 'Garage / Magasin' : 'Appartement'}</span>
              <span>•</span>
              <BuildingIcon className="w-4 h-4" />
              <span>{project?.project_name || 'Projet'}</span>
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight">{apartment.name}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-300 font-medium">
              <span className="bg-slate-700/80 px-2.5 py-0.5 rounded-lg border border-slate-600">
                Étage: <strong className="text-white">{apartment.floor === 'RDC' ? 'RDC' : apartment.floor}</strong>
              </span>
              <span className="bg-slate-700/80 px-2.5 py-0.5 rounded-lg border border-slate-600">
                Surface: <strong className="text-white">{apartment.surface_m2} m²</strong>
              </span>
              {apartment.titre && (
                <span className="bg-indigo-900/60 text-indigo-200 px-2.5 py-0.5 rounded-lg border border-indigo-700">
                  TF: <strong>{apartment.titre}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isSale ? 'PRIX DE VENTE' : 'LOYER MENSUEL'}
            </span>
            <div className="text-xl font-black text-green-400">
              {totalPrice.toLocaleString()} <span className="text-xs text-white">DH</span>
            </div>
          </div>
        </div>

        {/* Client Contact Info Box */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2 text-slate-900">
              <User className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-base">Identité du Client / Acquéreur</h4>
            </div>
            {getContractStatusBadge(contract?.status)}
          </div>

          {client ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nom Complet</p>
                <p className="font-extrabold text-gray-900 text-base">{client.full_name}</p>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Téléphone</p>
                <a href={`tel:${client.phone}`} className="font-extrabold text-green-700 text-base flex items-center hover:underline">
                  <Phone className="w-4 h-4 mr-1.5 shrink-0 text-green-600" />
                  {client.phone}
                </a>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">N° CIN / Passport</p>
                <p className="font-bold text-gray-800 text-sm flex items-center">
                  <CreditCard className="w-4 h-4 mr-1.5 shrink-0 text-gray-400" />
                  {client.cin_number}
                </p>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Profession / Activité</p>
                <p className="font-bold text-gray-800 text-sm">{client.occupation || 'Particulier'}</p>
              </div>

              {client.email && (
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 sm:col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                  <p className="font-semibold text-gray-800 text-sm truncate">{client.email}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              Client non identifié ou dossier non lié.
            </div>
          )}
        </div>

        {/* Financial Summary Box */}
        {contract && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 border-b border-slate-200 pb-3">
              <FileTextIcon className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-base">État Financier de la Réservation</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Montant Contrat</span>
                <span className="text-lg font-black text-gray-900">{totalPrice.toLocaleString()} DH</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block mb-1">Montant Encaissé</span>
                <span className="text-lg font-black text-green-700">{totalPaid.toLocaleString()} DH</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">Reliquat Reste</span>
                <span className={`text-lg font-black ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {remainingAmount.toLocaleString()} DH
                </span>
              </div>
            </div>

            {contract.start_date && (
              <div className="flex items-center text-xs font-semibold text-gray-500 pt-1">
                <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                <span>Date d'engagement: {new Date(contract.start_date).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            Fermer
          </button>

          {client && (
            <Link
              to={`/clients/${client.id}`}
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 group"
            >
              <span>Accéder au Dossier Complet</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </Modal>
  );
};
