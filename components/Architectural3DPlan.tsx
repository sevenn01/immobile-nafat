import React, { useState, useMemo } from 'react';
import { Apartment, Project, Contract, Client, ApartmentStatus, ContractStatus } from '../types';
import { Eye, Building, Layers, Sparkles, Info, CheckCircle, XCircle, Clock, Users, Phone, MapPin } from 'lucide-react';

interface Architectural3DPlanProps {
  project: Project;
  apartments: Apartment[];
  contracts: Contract[];
  clients: Client[];
  onSelectApartment?: (apt: Apartment) => void;
  onQuickInfo?: (apt: Apartment) => void;
  onRentOrSell?: (apt: Apartment) => void;
}

// Exact blueprint layouts definition matching Ghali 1 architect PDFs
interface UnitShape {
  idName: string; // e.g., 'Appt 9', 'Magasin 4'
  altNames: string[];
  areaText: string;
  surface: number;
  roomsText: string;
  features: string;
  type: 'apartment' | 'garage';
  // Relative polygon coordinates in percentage (0-100) on the floor plan bounding box
  x: number;
  y: number;
  width: number;
  height: number;
  rooms: Array<{ name: string; x: number; y: number; w: number; h: number }>;
}

interface FloorPlanData {
  floorKey: string;
  floorTitle: string;
  subtitle: string;
  units: UnitShape[];
  commonAreas: Array<{ name: string; x: number; y: number; w: number; h: number; style?: string }>;
}

export const GHALI_FLOOR_PLANS: Record<string, FloorPlanData> = {
  'RDC': {
    floorKey: 'RDC',
    floorTitle: 'Rez-de-Chaussée (Magasins)',
    subtitle: 'Commerces & Accès Entrée Principal',
    units: [
      {
        idName: 'Magasin 4',
        altNames: ['Magasin 4', 'Local RDC-1', 'Local 4', 'Magasin 04'],
        areaText: 'S = 62 m²',
        surface: 62,
        roomsText: 'Espace Commercial',
        features: 'Hauteur sous plafond, Façade Rue n°1 & 2',
        type: 'garage',
        x: 8, y: 15, width: 38, height: 48,
        rooms: [{ name: 'Magasin 4 (62m²)', x: 12, y: 20, w: 30, h: 38 }]
      },
      {
        idName: 'Magasin 5',
        altNames: ['Magasin 5', 'Local RDC-2', 'Local 5', 'Magasin 05'],
        areaText: 'S = 58 m²',
        surface: 58,
        roomsText: 'Espace Commercial',
        features: 'Accès Rue n°1 (10m)',
        type: 'garage',
        x: 52, y: 10, width: 40, height: 35,
        rooms: [{ name: 'Magasin 5 (58m²)', x: 56, y: 14, w: 32, h: 28 }]
      },
      {
        idName: 'Magasin 6',
        altNames: ['Magasin 6', 'Local RDC-3', 'Local 6', 'Magasin 06'],
        areaText: 'S = 66 m²',
        surface: 66,
        roomsText: 'Espace Commercial',
        features: 'Avec Lanterneau & Entrée Service',
        type: 'garage',
        x: 52, y: 62, width: 40, height: 32,
        rooms: [{ name: 'Magasin 6 (66m²)', x: 56, y: 65, w: 32, h: 25 }]
      }
    ],
    commonAreas: [
      { name: 'Entrée Principale', x: 28, y: 65, w: 20, h: 12 },
      { name: "Cage d'Escaliers", x: 44, y: 46, w: 12, h: 14, style: 'hatch' },
      { name: 'Ascenseur (ASC)', x: 42, y: 36, w: 7, h: 8, style: 'elevator' },
      { name: 'Vide sur Rampe Garage', x: 28, y: 79, w: 22, h: 15 }
    ]
  },
  'Soupente': {
    floorKey: 'Soupente',
    floorTitle: 'Étage Mezzanine (Soupente)',
    subtitle: 'Soupentes Commerciales & Logement Concierge',
    units: [
      {
        idName: 'Soupente 4A',
        altNames: ['Soupente 4A', 'Soupente 4', 'Local Soupente 4A'],
        areaText: 'S = 24 m²',
        surface: 24,
        roomsText: 'Soupente Magasin 4',
        features: 'Surplomb Magasin 4',
        type: 'garage',
        x: 18, y: 12, width: 25, height: 30,
        rooms: [{ name: 'Soupente 4A (24m²)', x: 20, y: 15, w: 20, h: 22 }]
      },
      {
        idName: 'Soupente 5A',
        altNames: ['Soupente 5A', 'Soupente 5', 'Local Soupente 5A'],
        areaText: 'S = 28 m²',
        surface: 28,
        roomsText: 'Soupente Magasin 5',
        features: 'Vue sur Magasin 5',
        type: 'garage',
        x: 55, y: 22, width: 35, height: 28,
        rooms: [{ name: 'Soupente 5A (28m²)', x: 58, y: 25, w: 28, h: 20 }]
      },
      {
        idName: 'Soupente 6A',
        altNames: ['Soupente 6A', 'Soupente 6', 'Local Soupente 6A'],
        areaText: 'S = 33 m²',
        surface: 33,
        roomsText: 'Soupente Magasin 6',
        features: 'Avec Lanterneau',
        type: 'garage',
        x: 55, y: 55, width: 36, height: 35,
        rooms: [{ name: 'Soupente 6A (33m²)', x: 58, y: 58, w: 30, h: 28 }]
      }
    ],
    commonAreas: [
      { name: 'Logement Concierge (8)', x: 28, y: 52, w: 22, h: 25, style: 'hatch' },
      { name: "Cage d'Escaliers", x: 44, y: 44, w: 12, h: 12, style: 'hatch' },
      { name: 'ASC', x: 41, y: 35, w: 7, h: 7, style: 'elevator' }
    ]
  },
  '1': {
    floorKey: '1',
    floorTitle: '1er Étage',
    subtitle: 'Appartements Résidentiels avec Cours Intérieures',
    units: [
      {
        idName: 'Appt 9',
        altNames: ['Appt 9', 'Appart 9', 'Appt 09', 'Appart 101', 'Appart 11'],
        areaText: 'S = 74 m²',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Balcon',
        features: 'Balcon sur Rue n°2 (20m)',
        type: 'apartment',
        x: 8, y: 12, width: 38, height: 40,
        rooms: [
          { name: 'Chambre 1', x: 10, y: 14, w: 16, h: 12 },
          { name: 'Chambre 2', x: 28, y: 14, w: 16, h: 12 },
          { name: 'Salon', x: 10, y: 32, w: 22, h: 18 },
          { name: 'Cuisine / SDB', x: 33, y: 32, w: 11, h: 18 }
        ]
      },
      {
        idName: 'Appt 10',
        altNames: ['Appt 10', 'Appart 10', 'Appt 10', 'Appart 102'],
        areaText: 'S = 83 m² (dont 8m² de cour)',
        surface: 83,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Cour 8m²',
        features: 'Grande Cour privative 8m²',
        type: 'apartment',
        x: 48, y: 8, width: 44, height: 42,
        rooms: [
          { name: 'Chambre', x: 52, y: 12, w: 20, h: 15 },
          { name: 'Salon', x: 52, y: 28, w: 22, h: 16 },
          { name: 'Cour Privative (8m²)', x: 76, y: 28, w: 14, h: 18 }
        ]
      },
      {
        idName: 'Appt 11',
        altNames: ['Appt 11', 'Appart 11', 'Appt 11a', 'Appart 103'],
        areaText: 'S = 94 m² (dont 9m² de cour)',
        surface: 94,
        roomsText: 'Grand Salon + 3 Chambres + Cuisine + Cour 9m² + Balcon',
        features: 'Cour privative 9m² + Balcon',
        type: 'apartment',
        x: 10, y: 56, width: 82, height: 40,
        rooms: [
          { name: 'Salon Marocain', x: 14, y: 60, w: 28, h: 18 },
          { name: 'Chambre 1', x: 44, y: 60, w: 20, h: 16 },
          { name: 'Chambre 2', x: 66, y: 60, w: 22, h: 16 },
          { name: 'Cour Privative (9m²)', x: 76, y: 78, w: 14, h: 15 }
        ]
      }
    ],
    commonAreas: [
      { name: "Cage d'Escaliers", x: 44, y: 42, w: 11, h: 12, style: 'hatch' },
      { name: 'Hall / ASC', x: 41, y: 35, w: 7, h: 6, style: 'elevator' },
      { name: 'S.A.S', x: 41, y: 42, w: 3, h: 12 }
    ]
  },
  '2': {
    floorKey: '2',
    floorTitle: '2ème Étage',
    subtitle: 'Appartements Résidentiels de Haut Standing',
    units: [
      {
        idName: 'Appt 12',
        altNames: ['Appt 12', 'Appart 12', 'Appart 201'],
        areaText: 'S = 74 m²',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Balcon',
        features: 'Balcon sur Rue n°2',
        type: 'apartment',
        x: 8, y: 12, width: 38, height: 40,
        rooms: [
          { name: 'Chambre 1', x: 10, y: 14, w: 16, h: 12 },
          { name: 'Chambre 2', x: 28, y: 14, w: 16, h: 12 },
          { name: 'Salon', x: 10, y: 32, w: 22, h: 18 }
        ]
      },
      {
        idName: 'Appt 13',
        altNames: ['Appt 13', 'Appart 13', 'Appt 13a', 'Appart 202'],
        areaText: 'S = 74 m²',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Balcon',
        features: 'Balcon Façade Principale',
        type: 'apartment',
        x: 48, y: 8, width: 44, height: 42,
        rooms: [
          { name: 'Chambre', x: 52, y: 12, w: 20, h: 15 },
          { name: 'Salon', x: 52, y: 28, w: 22, h: 16 }
        ]
      },
      {
        idName: 'Appt 14',
        altNames: ['Appt 14', 'Appart 14', 'Appt 14a', 'Appart 203'],
        areaText: 'S = 85 m²',
        surface: 85,
        roomsText: 'Grand Salon + 2 Chambres + Cuisine + 2 SDB + Balcon',
        features: 'Double Salle de Bain & Balcon',
        type: 'apartment',
        x: 10, y: 56, width: 82, height: 40,
        rooms: [
          { name: 'Salon', x: 14, y: 60, w: 28, h: 18 },
          { name: 'Chambre Principal', x: 44, y: 60, w: 20, h: 16 },
          { name: 'Chambre 2', x: 66, y: 60, w: 22, h: 16 }
        ]
      }
    ],
    commonAreas: [
      { name: "Cage d'Escaliers", x: 44, y: 42, w: 11, h: 12, style: 'hatch' },
      { name: 'ASC', x: 41, y: 35, w: 7, h: 6, style: 'elevator' }
    ]
  },
  '3': {
    floorKey: '3',
    floorTitle: '3ème Étage',
    subtitle: 'Appartements Lumineux avec Vue Dégagée',
    units: [
      {
        idName: 'Appt 16',
        altNames: ['Appt 16', 'Appart 16', 'Appt 16a', 'Appart 301'],
        areaText: 'S = 74 m²',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Balcon',
        features: 'Vue Rue n°2',
        type: 'apartment',
        x: 8, y: 12, width: 38, height: 40,
        rooms: [
          { name: 'Chambre 1', x: 10, y: 14, w: 16, h: 12 },
          { name: 'Chambre 2', x: 28, y: 14, w: 16, h: 12 },
          { name: 'Salon', x: 10, y: 32, w: 22, h: 18 }
        ]
      },
      {
        idName: 'Appt 17',
        altNames: ['Appt 17', 'Appart 17', 'Appt 17a', 'Appart 302'],
        areaText: 'S = 74 m²',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Balcon',
        features: 'Vue Rue n°1',
        type: 'apartment',
        x: 48, y: 8, width: 44, height: 42,
        rooms: [
          { name: 'Chambre', x: 52, y: 12, w: 20, h: 15 },
          { name: 'Salon', x: 52, y: 28, w: 22, h: 16 }
        ]
      },
      {
        idName: 'Appt 18',
        altNames: ['Appt 18', 'Appart 18', 'Appt 18a', 'Appart 303'],
        areaText: 'S = 85 m²',
        surface: 85,
        roomsText: 'Grand Salon + 2 Chambres + Cuisine + 2 SDB + Balcon',
        features: 'Orientation Sud-Ouest',
        type: 'apartment',
        x: 10, y: 56, width: 82, height: 40,
        rooms: [
          { name: 'Salon', x: 14, y: 60, w: 28, h: 18 },
          { name: 'Chambre 1', x: 44, y: 60, w: 20, h: 16 },
          { name: 'Chambre 2', x: 66, y: 60, w: 22, h: 16 }
        ]
      }
    ],
    commonAreas: [
      { name: "Cage d'Escaliers", x: 44, y: 42, w: 11, h: 12, style: 'hatch' },
      { name: 'ASC', x: 41, y: 35, w: 7, h: 6, style: 'elevator' }
    ]
  },
  '4': {
    floorKey: '4',
    floorTitle: '4ème Étage (Dernier Étage)',
    subtitle: 'Appartements de Standing avec Terrasse Panoramique',
    units: [
      {
        idName: 'Appt 19',
        altNames: ['Appt 19', 'Appart 19', 'Appt 19a', 'Appart 401'],
        areaText: 'S = 74 m²',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Balcon',
        features: 'Dernier étage vue dégagée',
        type: 'apartment',
        x: 8, y: 12, width: 38, height: 40,
        rooms: [
          { name: 'Chambre 1', x: 10, y: 14, w: 16, h: 12 },
          { name: 'Chambre 2', x: 28, y: 14, w: 16, h: 12 },
          { name: 'Salon', x: 10, y: 32, w: 22, h: 18 }
        ]
      },
      {
        idName: 'Appt 20',
        altNames: ['Appt 20', 'Appart 20', 'Appt 20a', 'Appart 402'],
        areaText: 'S = 74 m² (dont 6m² de terrasse)',
        surface: 74,
        roomsText: 'Salon + 2 Chambres + Cuisine + SDB + Terrasse 6m²',
        features: 'Superbe Terrasse Privative 6m²',
        type: 'apartment',
        x: 48, y: 8, width: 44, height: 42,
        rooms: [
          { name: 'Chambre', x: 52, y: 12, w: 20, h: 15 },
          { name: 'Salon', x: 52, y: 28, w: 22, h: 16 },
          { name: 'Terrasse (6m²)', x: 76, y: 28, w: 14, h: 18 }
        ]
      },
      {
        idName: 'Appt 21',
        altNames: ['Appt 21', 'Appart 21', 'Appt 21a', 'Appart 403'],
        areaText: 'S = 85 m²',
        surface: 85,
        roomsText: 'Grand Salon + 2 Chambres + Cuisine + 2 SDB + Balcon',
        features: 'Luminosité maximale',
        type: 'apartment',
        x: 10, y: 56, width: 82, height: 40,
        rooms: [
          { name: 'Salon', x: 14, y: 60, w: 28, h: 18 },
          { name: 'Chambre 1', x: 44, y: 60, w: 20, h: 16 },
          { name: 'Chambre 2', x: 66, y: 60, w: 22, h: 16 }
        ]
      }
    ],
    commonAreas: [
      { name: "Cage d'Escaliers", x: 44, y: 42, w: 11, h: 12, style: 'hatch' },
      { name: 'ASC', x: 41, y: 35, w: 7, h: 6, style: 'elevator' }
    ]
  }
};

export const Architectural3DPlan: React.FC<Architectural3DPlanProps> = ({
  project,
  apartments,
  contracts,
  clients,
  onSelectApartment,
  onQuickInfo,
  onRentOrSell
}) => {
  const [selectedFloorKey, setSelectedFloorKey] = useState<string>('2');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [viewStackMode, setViewStackMode] = useState<boolean>(false);
  const [hoveredUnitName, setHoveredUnitName] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold' | 'rented'>('all');

  // Match real apartment objects from database to blueprint unit shapes
  const findMatchingApartment = (shape: UnitShape): Apartment | undefined => {
    return apartments.find(a => {
      const aptNameClean = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const shapeIdClean = shape.idName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (aptNameClean === shapeIdClean || aptNameClean.includes(shapeIdClean)) return true;
      return shape.altNames.some(alt => {
        const altClean = alt.toLowerCase().replace(/[^a-z0-9]/g, '');
        return aptNameClean === altClean || aptNameClean.includes(altClean);
      });
    });
  };

  const getUnitStatusInfo = (apt?: Apartment) => {
    if (!apt) {
      return {
        statusText: 'Disponible',
        colorClass: 'bg-emerald-500 border-emerald-400 text-white',
        strokeColor: '#10b981',
        fillColor: 'rgba(16, 185, 129, 0.25)',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        badgeLabel: 'Libre à la vente',
        contract: undefined,
        client: undefined
      };
    }

    const contract = contracts.find(c => 
      c.id === apt.current_contract_id || 
      c.contract_id === apt.current_contract_id ||
      ((c.apartment_id === apt.id || c.apartment_id === apt.apartment_id) && c.status !== ContractStatus.Canceled && c.status !== ContractStatus.SaleCanceled)
    );
    let client = clients.find(cl => 
      (contract?.client_id && (cl.id === contract.client_id || cl.client_id === contract.client_id)) ||
      (contract && cl.contracts && (cl.contracts.includes(contract.id) || cl.contracts.includes(contract.contract_id))) ||
      (apt.owner_name && cl.full_name && cl.full_name.toLowerCase().trim() === apt.owner_name.toLowerCase().trim())
    );

    if (!client && apt.owner_name && (apt.status === ApartmentStatus.Sold || apt.status === ApartmentStatus.Rented)) {
      client = {
        id: 'owner_' + apt.id,
        client_id: 'owner_' + apt.id,
        full_name: apt.owner_name,
        phone: 'Dossier Enregistré',
        email: '',
        address: '',
        cin_number: '-',
        occupation: 'Acquéreur / Locataire',
        contracts: [],
        created_at: '',
        updated_at: ''
      };
    }

    if (apt.status === ApartmentStatus.Sold || contract?.type === 'sale') {
      return {
        statusText: 'Vendu',
        colorClass: 'bg-red-500 border-red-400 text-white',
        strokeColor: '#ef4444',
        fillColor: 'rgba(239, 68, 68, 0.3)',
        badgeColor: 'bg-red-100 text-red-800 border-red-300',
        badgeLabel: 'Vendu (Acquis)',
        contract,
        client
      };
    }
    if (apt.status === ApartmentStatus.Rented || contract?.type === 'rental') {
      return {
        statusText: 'Loué',
        colorClass: 'bg-amber-500 border-amber-400 text-white',
        strokeColor: '#f59e0b',
        fillColor: 'rgba(245, 158, 11, 0.3)',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        badgeLabel: 'Sous location',
        contract,
        client
      };
    }
    return {
      statusText: 'Disponible',
      colorClass: 'bg-emerald-500 border-emerald-400 text-white',
      strokeColor: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.25)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeLabel: apt.intended_for === 'sale' ? 'À Vendre' : 'À Louer',
      contract,
      client
    };
  };

  const currentFloorPlan = GHALI_FLOOR_PLANS[selectedFloorKey] || GHALI_FLOOR_PLANS['2'];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const hoveredShape = useMemo(() => {
    if (!hoveredUnitName) return null;
    return currentFloorPlan.units.find(u => u.idName === hoveredUnitName);
  }, [hoveredUnitName, currentFloorPlan]);

  const hoveredApartment = useMemo(() => {
    if (!hoveredShape) return undefined;
    return findMatchingApartment(hoveredShape);
  }, [hoveredShape]);

  const hoveredStatusInfo = useMemo(() => {
    return getUnitStatusInfo(hoveredApartment);
  }, [hoveredApartment]);

  return (
    <div className="bg-white text-slate-800 rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 relative overflow-hidden">
      {/* Background CAD Grid Effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px), linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '24px 24px, 48px 48px, 48px 48px'
        }}
      />

      {/* Header Controls */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Building className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Plan Architecte 3D Interactif
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-widest">
                  {project.project_name}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Plans certifiés d'architecte — Survoler les appartements pour voir l'occupant & infos
              </p>
            </div>
          </div>
        </div>

        {/* View Toggles & Floor Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => { setIs3DMode(false); setViewStackMode(false); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                !is3DMode && !viewStackMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Blueprint 2D</span>
            </button>
            <button
              onClick={() => { setIs3DMode(true); setViewStackMode(false); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                is3DMode && !viewStackMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Perspective 3D</span>
            </button>
            <button
              onClick={() => setViewStackMode(!viewStackMode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                viewStackMode ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Vue Immeuble Stack</span>
            </button>
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="available">Libres (Disponibles)</option>
            <option value="sold">Vendus (Acquis)</option>
            <option value="rented">Loués</option>
          </select>
        </div>
      </div>

      {/* Floor Buttons bar */}
      {!viewStackMode && (
        <div className="relative z-10 flex flex-wrap gap-2 mb-6">
          {Object.entries(GHALI_FLOOR_PLANS).map(([key, plan]) => (
            <button
              key={key}
              onClick={() => setSelectedFloorKey(key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center space-x-2 ${
                selectedFloorKey === key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md shadow-indigo-200 scale-105'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{plan.floorTitle}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Interactive Blueprint Canvas Area */}
      <div 
        className="relative z-10 min-h-[520px] bg-slate-50/80 rounded-2xl border border-slate-200 p-4 md:p-6 overflow-hidden flex flex-col items-center justify-center cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredUnitName(null)}
      >
        {viewStackMode ? (
          /* 3D Stack View of All Floors */
          <div className="w-full max-w-4xl py-8 flex flex-col items-center space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-600 mb-2">
              Vue 3D Extrudée de la Structure Multi-Étages Ghali 1
            </h4>
            <div className="w-full space-y-6 flex flex-col items-center">
              {['4', '3', '2', '1', 'Soupente', 'RDC'].map((fKey, index) => {
                const plan = GHALI_FLOOR_PLANS[fKey];
                const isSelected = selectedFloorKey === fKey;
                return (
                  <div
                    key={fKey}
                    onClick={() => { setSelectedFloorKey(fKey); setViewStackMode(false); }}
                    className={`w-full max-w-2xl bg-white border rounded-2xl p-4 transition-all duration-300 cursor-pointer transform hover:-translate-y-2 hover:shadow-xl hover:border-indigo-400 ${
                      isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-lg' : 'border-slate-200'
                    }`}
                    style={{
                      transform: `perspective(1000px) rotateX(25deg) rotateZ(-2deg) translateY(${index * -4}px)`,
                      boxShadow: '0 15px 25px -10px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                        {plan.floorTitle}
                      </span>
                      <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {plan.units.length} Unités sur ce niveau
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {plan.units.map((u) => {
                        const apt = findMatchingApartment(u);
                        const status = getUnitStatusInfo(apt);
                        return (
                          <div 
                            key={u.idName}
                            className={`p-2.5 rounded-xl border text-center transition-all ${status.badgeColor}`}
                          >
                            <div className="text-xs font-extrabold">{u.idName}</div>
                            <div className="text-[10px] opacity-80">{u.areaText}</div>
                            {status.client && (
                              <div className="text-[10px] font-bold text-slate-900 truncate mt-1">
                                👤 {status.client.full_name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Single Floor Detailed Blueprint SVG Viewer (2D CAD & 3D Isometric) */
          <div className="w-full flex flex-col items-center">
            {/* Title & Subtitle banner */}
            <div className="w-full flex justify-between items-center mb-4 text-slate-600 text-xs font-bold border-b border-slate-200 pb-2">
              <span className="flex items-center space-x-2 text-indigo-700">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Niveau : <strong className="text-slate-900">{currentFloorPlan.floorTitle}</strong> — {currentFloorPlan.subtitle}</span>
              </span>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
                Projet Ghali 1 • Rue n°1 (10m) & Rue n°2 (20m)
              </span>
            </div>

            {/* SVG Render Canvas */}
            <div 
              className={`relative w-full max-w-4xl aspect-[4/3] md:aspect-[16/10] bg-white rounded-2xl border border-slate-200 shadow-xl transition-all duration-500 overflow-hidden ${
                is3DMode ? 'perspective-3d-active' : ''
              }`}
            >
              <svg 
                viewBox="0 0 1000 700" 
                className={`w-full h-full transition-transform duration-500 ${
                  is3DMode ? 'transform scale-95 origin-center' : ''
                }`}
                style={is3DMode ? {
                  transform: 'perspective(1200px) rotateX(28deg) rotateZ(-3deg) scale(0.92)',
                  filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))'
                } : undefined}
              >
                <defs>
                  {/* Hatch Pattern for Stairwells & Elevator */}
                  <pattern id="hatchPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#cbd5e1" strokeWidth="1.5" />
                  </pattern>

                  {/* Wall hatch */}
                  <pattern id="wallPattern" width="8" height="8" patternTransform="rotate(30 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#e2e8f0" strokeWidth="1" />
                  </pattern>

                  {/* Radial Glow for Hover */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer Building Boundary Frame */}
                <rect x="50" y="40" width="900" height="620" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="6,6" />

                {/* Street Annotations matching architect PDF */}
                <text x="140" y="30" fill="#475569" fontSize="16" fontFamily="sans-serif" fontWeight="bold">
                  Rue n° 1 de 10m ↗
                </text>
                <text x="10" y="350" fill="#475569" fontSize="16" fontFamily="sans-serif" fontWeight="bold" transform="rotate(-90 20 350)">
                  Rue n° 2 de 20m ↗
                </text>

                {/* Common Areas (Stairs, Elevator, Hall) */}
                {currentFloorPlan.commonAreas.map((area, idx) => {
                  const x = (area.x / 100) * 900 + 50;
                  const y = (area.y / 100) * 620 + 40;
                  const w = (area.w / 100) * 900;
                  const h = (area.h / 100) * 620;
                  const isHatch = area.style === 'hatch';
                  const isElevator = area.style === 'elevator';

                  return (
                    <g key={idx}>
                      <rect
                        x={x} y={y} width={w} height={h}
                        fill={isHatch ? 'url(#hatchPattern)' : isElevator ? '#e2e8f0' : '#f8fafc'}
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />
                      {isElevator && (
                        <text x={x + w/2} y={y + h/2 + 4} fill="#334155" fontSize="11" fontWeight="bold" textAnchor="middle">
                          ASC
                        </text>
                      )}
                      {!isElevator && (
                        <text x={x + w/2} y={y + h/2 + 4} fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">
                          {area.name}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Units & Apartments Polygons */}
                {currentFloorPlan.units.map((unit) => {
                  const apt = findMatchingApartment(unit);
                  const statusInfo = getUnitStatusInfo(apt);

                  // Filter out if statusFilter applied
                  if (statusFilter === 'available' && statusInfo.statusText !== 'Disponible') return null;
                  if (statusFilter === 'sold' && statusInfo.statusText !== 'Vendu') return null;
                  if (statusFilter === 'rented' && statusInfo.statusText !== 'Loué') return null;

                  const x = (unit.x / 100) * 900 + 50;
                  const y = (unit.y / 100) * 620 + 40;
                  const w = (unit.width / 100) * 900;
                  const h = (unit.height / 100) * 620;
                  const isHovered = hoveredUnitName === unit.idName;

                  return (
                    <g 
                      key={unit.idName}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredUnitName(unit.idName)}
                      onClick={() => {
                        if (apt) {
                          if (statusInfo.client && onQuickInfo) onQuickInfo(apt);
                          else if (onRentOrSell) onRentOrSell(apt);
                          else if (onSelectApartment) onSelectApartment(apt);
                        }
                      }}
                    >
                      {/* 3D Wall Thickness Effect if 3D mode */}
                      {is3DMode && (
                        <rect
                          x={x + 10} y={y + 10} width={w} height={h}
                          fill="rgba(0,0,0,0.06)"
                          rx="4"
                        />
                      )}

                      {/* Main Apartment Bounding Box */}
                      <rect
                        x={x} y={y} width={w} height={h}
                        fill={isHovered ? statusInfo.strokeColor : statusInfo.fillColor}
                        fillOpacity={isHovered ? 0.45 : 0.25}
                        stroke={isHovered ? '#4338ca' : statusInfo.strokeColor}
                        strokeWidth={isHovered ? 4 : 2}
                        filter={isHovered ? 'url(#glow)' : undefined}
                        rx="6"
                      />

                      {/* Interior Room Partition Layout Lines */}
                      {unit.rooms.map((room, rIdx) => {
                        const rx = (room.x / 100) * 900 + 50;
                        const ry = (room.y / 100) * 620 + 40;
                        const rw = (room.w / 100) * 900;
                        const rh = (room.h / 100) * 620;

                        return (
                          <g key={rIdx}>
                            <rect
                              x={rx} y={ry} width={rw} height={rh}
                              fill="none"
                              stroke={isHovered ? 'rgba(67, 56, 202, 0.5)' : 'rgba(100, 116, 139, 0.35)'}
                              strokeWidth="1.5"
                              strokeDasharray={room.name.includes('Cour') || room.name.includes('Terrasse') ? '4,4' : undefined}
                            />
                            <text
                              x={rx + rw/2}
                              y={ry + rh/2 + 4}
                              fill={isHovered ? '#1e1b4b' : '#334155'}
                              fontSize={rw < 100 ? "10" : "12"}
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {room.name}
                            </text>
                          </g>
                        );
                      })}

                      {/* Red/Cloud Surface Tag Badge matching exact architect drawing */}
                      <g transform={`translate(${x + w/2 - 50}, ${y + 15})`}>
                        <rect
                          x="0" y="0" width="100" height="26"
                          fill="#ef4444"
                          fillOpacity="0.9"
                          rx="13"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text x="50" y="17" fill="#ffffff" fontSize="12" fontWeight="extrabold" textAnchor="middle">
                          {unit.areaText}
                        </text>
                      </g>

                      {/* Main Unit Title & Occupant Name on Card */}
                      <text
                        x={x + w/2}
                        y={y + h - 25}
                        fill="#0f172a"
                        fontSize="14"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        {unit.idName}
                      </text>

                      {/* Status indicator pill on unit */}
                      <g transform={`translate(${x + w/2 - 45}, ${y + h - 18})`}>
                        <rect
                          x="0" y="0" width="90" height="16"
                          fill={statusInfo.strokeColor}
                          rx="8"
                        />
                        <text x="45" y="12" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                          {statusInfo.statusText.toUpperCase()}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Floating Interactive Cursor Hover Tooltip & Card */}
      {hoveredShape && (
        <div
          className="fixed z-50 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-4 w-80 bg-white/95 border-2 border-indigo-600 text-slate-900 p-4 rounded-2xl shadow-2xl backdrop-blur-md"
          style={{
            left: `${mousePos.x + 40}px`,
            top: `${mousePos.y + 120}px`
          }}
        >
          {/* Status Badge */}
          <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
            <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>🏠</span> {hoveredShape.idName}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${hoveredStatusInfo.badgeColor}`}>
              {hoveredStatusInfo.badgeLabel}
            </span>
          </div>

          {/* Details & Surface */}
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Surface Habitable:</span>
              <span className="font-bold text-amber-600">{hoveredShape.areaText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Étage / Niveau:</span>
              <span className="font-bold text-slate-900">{currentFloorPlan.floorTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Composition:</span>
              <span className="font-bold text-slate-900 truncate max-w-[160px]" title={hoveredShape.roomsText}>
                {hoveredShape.roomsText}
              </span>
            </div>
            {hoveredShape.features && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Particularités:</span>
                <span className="font-bold text-purple-700">{hoveredShape.features}</span>
              </div>
            )}

            {/* Price if available */}
            {hoveredApartment && (
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Prix Estimé / Loyer:</span>
                <span className="font-black text-emerald-600">
                  {hoveredApartment.intended_for === 'sale'
                    ? `${hoveredApartment.sale_price_dh?.toLocaleString()} DH`
                    : `${hoveredApartment.price_dh?.toLocaleString()} DH/mois`}
                </span>
              </div>
            )}

            {/* Occupant / Client Info */}
            <div className="pt-2 border-t border-slate-200 mt-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Occupant & Statut Dossier :
              </span>
              {hoveredStatusInfo.client ? (
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-1.5 text-slate-900 font-bold">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{hoveredStatusInfo.client.full_name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-600 mt-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{hoveredStatusInfo.client.phone}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-center">
                  ✨ Aucun occupant actuel (Disponible à la réservation)
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-center italic">
            Cliquer sur l'appartement pour ouvrir la fiche rapide
          </div>
        </div>
      )}
    </div>
  );
};

export default Architectural3DPlan;
