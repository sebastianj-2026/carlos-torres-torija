import React, { useState } from 'react';
import { Landmark, Wallet, ArrowRightLeft, BarChart2 } from 'lucide-react';
import SeccionCuentas from './SeccionCuentas';
import SeccionCajaChica from './SeccionCajaChica';
import SeccionTraspasos from './SeccionTraspasos';
import SeccionFlujoCaja from './SeccionFlujoCaja';

type Tab = 'cuentas' | 'caja' | 'traspasos' | 'flujo_caja';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'cuentas',    label: 'Cuentas Bancarias', icon: <Landmark size={15} /> },
  { id: 'caja',       label: 'Caja Chica',         icon: <Wallet size={15} /> },
  { id: 'traspasos',  label: 'Traspasos',           icon: <ArrowRightLeft size={15} /> },
  { id: 'flujo_caja', label: 'Flujo de Caja',       icon: <BarChart2 size={15} /> },
];

const Tesoreria: React.FC = () => {
  const [tab, setTab] = useState<Tab>('cuentas');

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tesorería</h1>
        <p className="text-sm text-slate-500 mt-0.5">Cuentas, caja chica, traspasos y flujo de caja</p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="flex flex-nowrap gap-1 bg-slate-100 rounded-xl p-1 w-max mx-3 sm:mx-0">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === 'cuentas'    && <SeccionCuentas />}
      {tab === 'caja'       && <SeccionCajaChica />}
      {tab === 'traspasos'  && <SeccionTraspasos />}
      {tab === 'flujo_caja' && <SeccionFlujoCaja />}
    </div>
  );
};

export default Tesoreria;
