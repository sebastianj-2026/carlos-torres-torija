import React, { useState } from 'react';
import { Users, TableProperties, BarChart3 } from 'lucide-react';
import EmpleadosTab        from './tabs/EmpleadosTab';
import GeneradorNominaTab  from './tabs/GeneradorNominaTab';
import CostoRealTab        from './tabs/CostoRealTab';
import HistorialNominasTab from './tabs/HistorialNominasTab';

type TabId = 'empleados' | 'generador' | 'costo' | 'historial';

const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'empleados',  label: 'Empleados',         Icon: Users            },
  { id: 'generador',  label: 'Generar Nómina',    Icon: TableProperties  },
  { id: 'costo',      label: 'Costo Real',         Icon: BarChart3        },
  { id: 'historial',  label: 'Historial',          Icon: BarChart3        },
];

const NominasPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>('generador');

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Capital Humano y Nómina</h1>
        <p className="text-sm text-slate-400 mt-0.5">Directorio de empleados, calculadora semanal y reporte de costo real.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'empleados' && <EmpleadosTab />}
      {tab === 'generador' && <GeneradorNominaTab />}
      {tab === 'costo'     && <CostoRealTab />}
      {tab === 'historial' && <HistorialNominasTab />}
    </div>
  );
};

export default NominasPage;
