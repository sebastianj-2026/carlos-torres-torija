import React, { useState } from 'react';
import { Building2, TrendingUp } from 'lucide-react';
import NavigadorTemporal       from '../../components/pagos/NavigadorTemporal';
import CuentasPorPagarTab      from './tabs/CuentasPorPagarTab';
import CuentasInversionistasTab from './tabs/CuentasInversionistasTab';

const TABS = [
  { id: 'oficina',        label: 'Gastos Oficina',    Icono: Building2,  centro: 'Oficina'       },
  { id: 'inversionistas', label: 'CxP Inversionistas', Icono: TrendingUp, centro: 'Inversionistas'},
] as const;

type TabId = typeof TABS[number]['id'];

const EgresosPage: React.FC = () => {
  const hoy = new Date();
  const [tab,  setTab]  = useState<TabId>('oficina');
  const [mes,  setMes]  = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const active = TABS.find(t => t.id === tab)!;

  return (
    <div className="p-6 lg:p-8">
      {/* 1. Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Hub de Egresos</h2>
        <p className="text-slate-500 mt-0.5 text-sm">
          Gastos operativos · Créditos bancarios · Compromisos con inversionistas
        </p>
      </div>

      {/* 2. Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(({ id, label, Icono }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Icono size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* 3. Selector global de periodo */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <NavigadorTemporal
          mes={mes}
          anio={anio}
          onChange={(m, a) => { setMes(m); setAnio(a); }}
        />
      </div>

      {active.id === 'inversionistas' && <CuentasInversionistasTab mes={mes} anio={anio} />}
      {active.id === 'oficina' && (
        <CuentasPorPagarTab centroCosto={active.centro!} mes={mes} anio={anio} key={active.id} />
      )}
    </div>
  );
};

export default EgresosPage;
