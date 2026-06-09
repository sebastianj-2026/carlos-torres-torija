import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, TrendingUp, RotateCcw, AlertTriangle,
  Building2, Car, Target, CreditCard, Banknote,
} from 'lucide-react';
import { DashboardCentralData, ModuloEstado } from '../../../types/ingresos.types';
import { dashboardCentral } from '../../../services/ingresosService';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const fmtFecha = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const COLORES: Record<string, string> = {
  Prestamo:        '#3b82f6',
  Inmueble:        '#a855f7',
  Cancha:          '#f97316',
  Estacionamiento: '#64748b',
  Pension:         '#10b981',
};
const colorOrigen = (o: string) => COLORES[o] ?? '#94a3b8';

// ── KPI Card ──────────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; sub?: string; valor: number;
  color: string; bg: string;
  Icono: React.FC<{ size?: number; className?: string }>;
  badge?: { label: string; valor: number };
}> = ({ label, sub, valor, color, bg, Icono, badge }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-5 shadow-sm flex flex-col gap-2">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icono size={18} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-300 leading-tight">{sub}</p>}
      </div>
      {badge && badge.valor > 0 && (
        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
          <AlertTriangle size={10} /> {fmt(badge.valor)} atrasado
        </span>
      )}
    </div>
    <p className={`text-2xl font-bold ${color}`}>{fmt(valor)}</p>
  </div>
);

// ── Bloque estado módulo ──────────────────────────────────────────
const EstadoBloque: React.FC<{
  titulo: string; Icono: React.FC<{ size?: number; className?: string }>;
  color: string; bg: string; barColor: string; estado: ModuloEstado;
}> = ({ titulo, Icono, color, bg, barColor, estado }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
        <Icono size={15} className={color} />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-slate-700">{titulo}</p>
      {estado.count_atrasados > 0 && (
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
          {estado.count_atrasados} atrasado{estado.count_atrasados > 1 ? 's' : ''}
        </span>
      )}
    </div>

    {/* Conteo visual */}
    <div className="flex items-center gap-2 mb-3">
      <span className="text-2xl font-bold text-slate-800">{estado.count_pagados}</span>
      <span className="text-slate-300 text-lg">/</span>
      <span className="text-lg text-slate-500">{estado.count_total}</span>
      <span className="text-xs text-slate-400 ml-1">pagaron</span>
    </div>

    {/* Barra de progreso */}
    {estado.count_total > 0 && (
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round((estado.count_pagados / estado.count_total) * 100)}%`,
            background: barColor,
          }}
        />
      </div>
    )}

    <div className="space-y-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-400">Esperado</span>
        <span className="font-medium text-slate-600">{fmt(estado.monto_esperado)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Cobrado</span>
        <span className="font-medium text-emerald-600">{fmt(estado.monto_cobrado)}</span>
      </div>
      <div className="flex justify-between border-t border-slate-50 pt-1.5">
        <span className="text-slate-400">Pendiente</span>
        <span className={`font-semibold ${estado.monto_pendiente > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          {fmt(estado.monto_pendiente)}
        </span>
      </div>
      {estado.monto_atrasado > 0 && (
        <div className="flex justify-between">
          <span className="text-red-400">Atrasado</span>
          <span className="font-semibold text-red-600">{fmt(estado.monto_atrasado)}</span>
        </div>
      )}
    </div>
  </div>
);

const ORIGENES = ['Todos', 'Prestamo', 'Inmueble', 'Cancha', 'Estacionamiento'] as const;
type FiltroOrigen = typeof ORIGENES[number];

// ── Componente principal ──────────────────────────────────────────
const DashboardCentralTab: React.FC<{ mes: number; anio: number; refreshKey?: number }> = ({ mes, anio, refreshKey }) => {
  const [datos,        setDatos]       = useState<DashboardCentralData | null>(null);
  const [cargando,     setCargando]    = useState(true);
  const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>('Todos');

  const cargar = useCallback(() => {
    setCargando(true);
    dashboardCentral(mes, anio)
      .then(setDatos)
      .catch(() => setDatos(null))
      .finally(() => setCargando(false));
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar, refreshKey]);

  if (cargando) return <p className="text-sm text-slate-400 text-center py-20">Cargando…</p>;

  const d = datos;
  const logFiltrado = (d?.log_pagos ?? []).filter(p =>
    filtroOrigen === 'Todos' || p.origen === filtroOrigen
  );

  return (
    <div className="space-y-5">

      {/* ── Row 1: KPIs principales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total en Caja" sub="Utilidad + Capital"
          valor={d?.cobrado.total ?? 0}
          color="text-emerald-600" bg="bg-emerald-50" Icono={Wallet}
        />
        <KpiCard
          label="Utilidad Neta" sub="Intereses · Rentas · Otros"
          valor={d?.cobrado.utilidad ?? 0}
          color="text-orange-500" bg="bg-orange-50" Icono={TrendingUp}
        />
        <KpiCard
          label="Retorno Capital" sub="Abonos a capital"
          valor={d?.cobrado.retorno_capital ?? 0}
          color="text-blue-600" bg="bg-blue-50" Icono={RotateCcw}
        />
        <KpiCard
          label="Por Cobrar" sub={`Total esperado − cobrado`}
          valor={d?.estado_mes.gran_total_pendiente ?? 0}
          color="text-amber-600" bg="bg-amber-50" Icono={AlertTriangle}
          badge={d && d.estado_mes.gran_total_atrasado > 0
            ? { label: 'atrasado', valor: d.estado_mes.gran_total_atrasado }
            : undefined}
        />
      </div>

      {/* ── Row 2: Estado por módulo ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EstadoBloque
          titulo="Préstamos" Icono={Wallet}
          color="text-blue-600" bg="bg-blue-50" barColor="#3b82f6"
          estado={d?.estado_mes.prestamos ?? { count_total:0,count_pagados:0,count_pendientes:0,count_atrasados:0,monto_esperado:0,monto_cobrado:0,monto_pendiente:0,monto_atrasado:0 }}
        />
        <EstadoBloque
          titulo="Rentas" Icono={Building2}
          color="text-purple-600" bg="bg-purple-50" barColor="#a855f7"
          estado={d?.estado_mes.rentas ?? { count_total:0,count_pagados:0,count_pendientes:0,count_atrasados:0,monto_esperado:0,monto_cobrado:0,monto_pendiente:0,monto_atrasado:0 }}
        />
        <EstadoBloque
          titulo="Pensiones Estacionamiento" Icono={Car}
          color="text-slate-600" bg="bg-slate-100" barColor="#64748b"
          estado={d?.estado_mes.pensiones ?? { count_total:0,count_pagados:0,count_pendientes:0,count_atrasados:0,monto_esperado:0,monto_cobrado:0,monto_pendiente:0,monto_atrasado:0 }}
        />
      </div>

      {/* ── Row 3: Efectivo/Tarjeta + Vs Mes Anterior ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Efectivo vs Tarjeta */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Método de pago</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Banknote size={15} className="text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Efectivo</span>
                <span className="ml-auto font-bold text-emerald-600">{fmt(d?.metodo_pago.efectivo.total ?? 0)}</span>
              </div>
              {(d?.metodo_pago.efectivo.detalle ?? []).map(x => (
                <div key={x.origen} className="flex justify-between text-xs text-slate-400 pl-6">
                  <span>{x.origen}</span>
                  <span>{fmt(x.monto)}</span>
                </div>
              ))}
            </div>
            {(d?.metodo_pago.tarjeta.total ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={15} className="text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">Tarjeta</span>
                  <span className="ml-auto font-bold text-blue-600">{fmt(d?.metodo_pago.tarjeta.total ?? 0)}</span>
                </div>
                {(d?.metodo_pago.tarjeta.detalle ?? []).map(x => (
                  <div key={x.cuenta} className="flex justify-between text-xs text-slate-400 pl-6">
                    <span>{x.cuenta || 'Sin especificar'}</span>
                    <span>{fmt(x.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vs mes anterior */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm font-semibold text-slate-700">Vs mes anterior</p>
            {d && (
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                d.vs_mes_anterior.variacion_pct >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}>
                {d.vs_mes_anterior.variacion_pct >= 0 ? '+' : ''}{d.vs_mes_anterior.variacion_pct}%
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs mb-3">
            <div className="flex justify-between">
              <span className="text-slate-400">{MESES[mes]} {anio}</span>
              <span className="font-semibold text-slate-700">{fmt(d?.vs_mes_anterior.cobrado_actual ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mes anterior</span>
              <span className="text-slate-500">{fmt(d?.vs_mes_anterior.cobrado_anterior ?? 0)}</span>
            </div>
          </div>
          {(d?.vs_mes_anterior.por_origen ?? []).length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left py-1">Origen</th>
                  <th className="text-right">Anterior</th>
                  <th className="text-right">Actual</th>
                  <th className="text-right">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d!.vs_mes_anterior.por_origen.map(r => (
                  <tr key={r.origen}>
                    <td className="py-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: colorOrigen(r.origen) }} />
                      {r.origen}
                    </td>
                    <td className="text-right text-slate-400">{fmt(r.anterior)}</td>
                    <td className="text-right text-slate-600 font-medium">{fmt(r.actual)}</td>
                    <td className={`text-right font-semibold ${r.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.delta >= 0 ? '+' : ''}{fmt(r.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Row 5: Mejor día ── */}
      {d?.mejor_dia.global && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">
            <Target size={14} className="inline mr-1.5 text-orange-500" />
            Mejor día del mes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-xl px-4 py-3">
              <p className="text-xs text-orange-400 mb-0.5">Total global</p>
              <p className="text-lg font-bold text-orange-600">{fmt(d.mejor_dia.global.monto)}</p>
              <p className="text-xs text-orange-400">{fmtFecha(d.mejor_dia.global.fecha)}</p>
            </div>
            {d.mejor_dia.por_origen.map(o => (
              <div key={o.origen} className="bg-slate-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: colorOrigen(o.origen) }} />
                  <p className="text-xs text-slate-400">{o.origen}</p>
                </div>
                <p className="text-base font-bold text-slate-700">{fmt(o.monto)}</p>
                <p className="text-xs text-slate-400">{fmtFecha(o.fecha)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Log de movimientos ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-700 mr-2">
            Movimientos — {MESES[mes]} {anio}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ORIGENES.map(o => (
              <button
                key={o}
                onClick={() => setFiltroOrigen(o)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
                  filtroOrigen === o
                    ? 'text-white border-transparent'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
                style={filtroOrigen === o ? { background: o === 'Todos' ? '#64748b' : colorOrigen(o), borderColor: 'transparent' } : {}}
              >
                {o}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400">{logFiltrado.length} registro{logFiltrado.length !== 1 ? 's' : ''}</span>
        </div>
        {logFiltrado.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Sin movimientos{filtroOrigen !== 'Todos' ? ` de ${filtroOrigen}` : ''} en {MESES[mes]} {anio}.</p>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Origen</th>
                  <th className="px-4 py-2 text-left">Descripción</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2 text-right hidden sm:table-cell">Capital</th>
                  <th className="px-4 py-2 text-left hidden sm:table-cell">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logFiltrado.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs sm:text-sm">{fmtFecha(p.fecha)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                        style={{ background: colorOrigen(p.origen) }}>
                        {p.origen}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[220px] truncate text-xs sm:text-sm">{p.descripcion}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700 text-xs sm:text-sm">{fmt(p.monto)}</td>
                    <td className="px-4 py-2.5 text-right text-blue-500 text-xs hidden sm:table-cell">
                      {p.capital > 0 ? fmt(p.capital) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs capitalize hidden sm:table-cell">{p.metodo_pago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estado vacío */}
      {!cargando && !d && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-400 text-sm">Sin datos para {MESES[mes]} {anio}.</p>
        </div>
      )}

    </div>
  );
};

export default DashboardCentralTab;
