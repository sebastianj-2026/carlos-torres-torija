import React from 'react';
import { DollarSign, BarChart3, TrendingDown, CreditCard } from 'lucide-react';
import { KpisEgreso } from '../../services/egresosService';

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));

interface Props {
  data: KpisEgreso | null;
  cargando?: boolean;
}

const ExpensesKPIDashboard: React.FC<Props> = ({ data, cargando }) => {
  const topGasto = data?.top_gastos?.[0];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ${cargando ? 'opacity-60' : ''}`}>
      {/* Total gastado */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Impacto Total</p>
            <p className="text-lg font-bold text-slate-800 truncate">
              {data ? fmt(data.total_gastado) : '—'}
            </p>
            <p className="text-[11px] text-slate-400">
              {data ? `${data.total_movimientos} movimiento${data.total_movimientos !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Ticket promedio */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <BarChart3 size={18} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Ticket Promedio</p>
            <p className="text-lg font-bold text-amber-600 truncate">
              {data ? fmt(data.gasto_promedio) : '—'}
            </p>
            <p className="text-[11px] text-slate-400">por movimiento</p>
          </div>
        </div>
      </div>

      {/* Mayor fuga */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Mayor Fuga</p>
            <p className="text-lg font-bold text-red-600 truncate">
              {topGasto ? fmt(topGasto.monto_total) : '—'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {topGasto?.concepto ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* Total de movimientos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <CreditCard size={18} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Total Movimientos</p>
            <p className="text-lg font-bold text-blue-600 truncate">
              {data ? data.total_movimientos : '—'}
            </p>
            <p className="text-[11px] text-slate-400">registros pagados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesKPIDashboard;
