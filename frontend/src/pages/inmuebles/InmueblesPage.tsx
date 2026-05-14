import React, { useState, useEffect } from 'react';
import { Building2, Users, FileText, LayoutDashboard } from 'lucide-react';
import { alertasContratos } from '../../services/inmueblesService';
import { AlertasContratos } from '../../types/inmuebles.types';
import DashboardInmueblesTab from './tabs/DashboardInmueblesTab';
import InmueblesListTab      from './tabs/InmueblesListTab';
import InquilinosTab         from './tabs/InquilinosTab';
import ContratosTab          from './tabs/ContratosTab';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   Icono: LayoutDashboard },
  { id: 'inmuebles',  label: 'Inmuebles',   Icono: Building2 },
  { id: 'inquilinos', label: 'Inquilinos',  Icono: Users },
  { id: 'contratos',  label: 'Contratos',   Icono: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

const InmueblesPage: React.FC = () => {
  const [tab, setTab]       = useState<TabId>('dashboard');
  const [alertas, setAlertas] = useState<AlertasContratos | null>(null);

  useEffect(() => {
    alertasContratos().then(setAlertas).catch(() => {});
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gestión Inmobiliaria</h2>
        <p className="text-slate-500 mt-0.5 text-sm">Inmuebles, inquilinos, contratos y rentabilidad</p>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(({ id, label, Icono }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative
              ${tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icono size={15} />
            {label}
            {id === 'dashboard' && (alertas?.total ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {(alertas?.total ?? 0) > 9 ? '9+' : alertas?.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dashboard'  && <DashboardInmueblesTab alertas={alertas} />}
      {tab === 'inmuebles'  && <InmueblesListTab />}
      {tab === 'inquilinos' && <InquilinosTab />}
      {tab === 'contratos'  && <ContratosTab />}
    </div>
  );
};

export default InmueblesPage;
