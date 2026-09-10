import React, { useState } from 'react';
import { BarChart2, FileText, Zap, RefreshCw } from 'lucide-react';
import NavigadorTemporal  from '../../components/pagos/NavigadorTemporal';
import DashboardCentralTab from './tabs/DashboardCentralTab';
import CxCPrestamosTab    from './tabs/CxCPrestamosTab';
import IngresosExtrasTab  from './tabs/IngresosExtrasTab';

const TABS = [
  { id: 'dashboard',   label: 'Dashboard Central',   Icono: BarChart2  },
  { id: 'prestamos',   label: 'CxC Préstamos',       Icono: FileText   },
  { id: 'extras',      label: 'Otros Ingresos',      Icono: Zap        },
] as const;

type TabId = typeof TABS[number]['id'];

const TABS_CON_PERIODO: TabId[] = ['dashboard', 'prestamos'];

const IngresosDashboard: React.FC = () => {
  const hoy = new Date();
  const [tab,          setTab]         = useState<TabId>('dashboard');
  const [mes,          setMes]         = useState(hoy.getMonth() + 1);
  const [anio,         setAnio]        = useState(hoy.getFullYear());
  const [refreshDash,  setRefreshDash] = useState(0);

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Hub de Ingresos</h2>
        <p className="text-slate-500 mt-0.5 text-sm">
          Rentabilidad real · Préstamos · Otros
        </p>
      </div>

      <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-1 mb-4 bg-slate-100 p-1 rounded-2xl w-fit max-w-full">
        {TABS.map(({ id, label, Icono }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative whitespace-nowrap shrink-0
              ${tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icono size={15} />
            {label}
          </button>
        ))}
      </div>

      {TABS_CON_PERIODO.includes(tab) && (
        <div className="flex items-center gap-3 mb-6">
          <NavigadorTemporal mes={mes} anio={anio} onChange={(m, a) => { setMes(m); setAnio(a); }} />
          {tab === 'dashboard' && (
            <button
              onClick={() => setRefreshDash(k => k + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} /> Actualizar
            </button>
          )}
        </div>
      )}

      {tab === 'dashboard' && <DashboardCentralTab mes={mes} anio={anio} refreshKey={refreshDash} />}
      {tab === 'prestamos' && <CxCPrestamosTab     mes={mes} anio={anio} />}
      {tab === 'extras'    && <IngresosExtrasTab />}
    </div>
  );
};

export default IngresosDashboard;
