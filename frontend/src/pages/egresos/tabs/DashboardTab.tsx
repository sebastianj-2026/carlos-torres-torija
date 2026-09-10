import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { AlertTriangle, Clock, CalendarX, DollarSign } from 'lucide-react';
import { StatsEgresos, AlertasEgresos, CuentaPorPagar } from '../../../types/egresos.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const COLORES = ['#0ea5e9', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

interface Props {
  stats: StatsEgresos | null;
  alertas: AlertasEgresos | null;
  cargando: boolean;
}

const FilaAlerta: React.FC<{ cuenta: CuentaPorPagar; color: string }> = ({ cuenta, color }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl border ${color}`}>
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-800 truncate">{cuenta.concepto}</p>
      <p className="text-xs text-slate-500">{cuenta.categoria_nombre} · {cuenta.fecha_limite_pago}</p>
    </div>
    <p className="text-sm font-bold text-slate-800 ml-4 shrink-0">
      {fmt(parseFloat(cuenta.monto_total))}
    </p>
  </div>
);

const DashboardTab: React.FC<Props> = ({ stats, alertas, cargando }) => {
  if (cargando) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando datos…</div>
  );

  const gastoCat   = (stats?.gasto_por_categoria ?? []).map(x => ({ name: x.categoria, value: parseFloat(x.total) }));
  const gastoMes   = (stats?.gasto_mensual ?? []).map(x => ({ mes: x.mes.slice(5), total: parseFloat(x.total) }));
  const proximos30 = parseFloat(stats?.compromisos_proximos30?.total ?? '0');
  const cnt30      = parseInt(stats?.compromisos_proximos30?.cantidad ?? '0', 10);
  const totalVenc  = (alertas?.vencidas ?? []).length;
  const totalAlerts = (alertas?.total ?? 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <DollarSign size={18} className="text-sky-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Próximos 30 días</p>
              <p className="text-lg font-bold text-slate-800">{fmt(proximos30)}</p>
              <p className="text-xs text-slate-400">{cnt30} compromisos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <CalendarX size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Vencidas</p>
              <p className="text-lg font-bold text-red-600">{totalVenc}</p>
              <p className="text-xs text-slate-400">sin pagar</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Alertas activas</p>
              <p className="text-lg font-bold text-slate-800">{totalAlerts}</p>
              <p className="text-xs text-slate-400">≤ 5 días</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Categorías activas</p>
              <p className="text-lg font-bold text-slate-800">{gastoCat.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie por categoría */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Gasto por Categoría</h3>
          {gastoCat.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">Sin pagos registrados</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={gastoCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {gastoCat.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Barras mensuales */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Gasto Mensual (últimos 6 meses)</h3>
          {gastoMes.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">Sin pagos registrados</p>
            : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={gastoMes} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Total pagado" />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Panel de alertas */}
      {totalAlerts > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Próximos Vencimientos
          </h3>
          <div className="space-y-2">
            {(alertas?.vencidas ?? []).map(c => <FilaAlerta key={c.id} cuenta={c} color="bg-red-50 border-red-200" />)}
            {(alertas?.hoy ?? []).map(c => <FilaAlerta key={c.id} cuenta={c} color="bg-sky-50 border-sky-200" />)}
            {(alertas?.maniana ?? []).map(c => <FilaAlerta key={c.id} cuenta={c} color="bg-amber-50 border-amber-200" />)}
            {(alertas?.proximas ?? []).map(c => <FilaAlerta key={c.id} cuenta={c} color="bg-slate-50 border-slate-200" />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;
