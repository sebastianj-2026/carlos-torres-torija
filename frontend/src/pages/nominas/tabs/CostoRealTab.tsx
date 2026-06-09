import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Clock, Gift, Umbrella, ShieldCheck } from 'lucide-react';
import { logError } from '../../../utils/logError';
import { CostoRealResponse } from '../../../types/nominas.types';
import { getCostoReal, historialNominas } from '../../../services/nominasService';
import { NominaPagada } from '../../../types/nominas.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);

interface KPI { label: string; value: number; Icon: React.ElementType; color: string }

const KPICard: React.FC<KPI> = ({ label, value, Icon, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
    <div className={`p-2 rounded-xl ${color}`}>
      <Icon size={16} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-lg font-black text-slate-800">{fmt(value)}</p>
    </div>
  </div>
);

const CostoRealTab: React.FC = () => {
  const now = new Date();
  const [mes,     setMes]     = useState(now.getMonth() + 1);
  const [anio,    setAnio]    = useState(now.getFullYear());
  const [data,    setData]    = useState<CostoRealResponse | null>(null);
  const [nominas, setNominas] = useState<NominaPagada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCostoReal(mes, anio),
      historialNominas(undefined, 200),
    ]).then(([cr, hist]) => {
      setData(cr);
      setNominas(hist);
    }).catch(logError).finally(() => setLoading(false));
  }, [mes, anio]);

  // Aggregate by employee for the selected month
  const porEmpleado = useMemo(() => {
    const mesStr = `${anio}-${String(mes).padStart(2, '0')}`;
    const del = nominas.filter(n => n.semana_inicio.startsWith(mesStr));
    const map: Record<string, { nombre: string; puesto: string; sueldos: number; extras: number; bonos: number; primas: number; total: number; semanas: number }> = {};
    for (const n of del) {
      if (!map[n.empleado_id]) map[n.empleado_id] = { nombre: n.empleado_nombre, puesto: n.puesto, sueldos: 0, extras: 0, bonos: 0, primas: 0, total: 0, semanas: 0 };
      const r = map[n.empleado_id];
      r.sueldos += parseFloat(n.sueldo_base);
      r.extras  += parseFloat(n.monto_horas_extras);
      r.bonos   += parseFloat(n.bonos);
      r.primas  += parseFloat(n.monto_prima_vacacional);
      r.total   += parseFloat(n.monto_total_pagado);
      r.semanas += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [nominas, mes, anio]);

  const periodStr = `${String(mes).padStart(2,'0')}/${anio}`;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
          {Array.from({length:12},(_,i) => i+1).map(m => (
            <option key={m} value={m}>{new Date(2000,m-1).toLocaleString('es-MX',{month:'long'})}</option>
          ))}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {loading && <span className="text-xs text-slate-400">Cargando…</span>}
      </div>

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <KPICard label="Sueldos base"       value={data.totales.total_sueldos} Icon={Users}      color="bg-slate-500" />
            <KPICard label="Horas extras"        value={data.totales.total_extras}  Icon={Clock}      color="bg-emerald-500" />
            <KPICard label="Bonos/Comisiones"    value={data.totales.total_bonos}   Icon={Gift}       color="bg-purple-500" />
            <KPICard label="Primas vacacional"   value={data.totales.total_primas}  Icon={Umbrella}   color="bg-blue-500" />
            <KPICard label={`IMSS (${data.imss.empleados_con_imss} emp.)`} value={data.imss.total_imss} Icon={ShieldCheck} color="bg-teal-500" />
            <div className="bg-orange-500 rounded-2xl shadow-sm p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-orange-600">
                <TrendingUp size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-100 font-medium">Costo Real Total</p>
                <p className="text-lg font-black text-white">{fmt(data.costo_real)}</p>
              </div>
            </div>
          </div>

          {/* Por semana */}
          {data.por_semana.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Pagos por semana — {periodStr}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Semana inicio</th>
                      <th className="px-5 py-2.5 text-right">Empleados</th>
                      <th className="px-5 py-2.5 text-right">Total pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.por_semana.map(s => (
                      <tr key={s.semana_inicio} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{s.semana_inicio}</td>
                        <td className="px-5 py-2.5 text-right text-slate-500">{s.num_empleados}</td>
                        <td className="px-5 py-2.5 text-right font-bold text-slate-800">{fmt(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-5 py-2.5 text-xs font-semibold text-slate-500">Total nóminas</td>
                      <td className="px-5 py-2.5 text-right text-xs font-bold text-slate-500">{data.totales.registros} pagos</td>
                      <td className="px-5 py-2.5 text-right font-black text-orange-600">{fmt(data.totales.total_pagado)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Por empleado */}
          {porEmpleado.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Desglose por empleado — {periodStr}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Empleado</th>
                      <th className="px-4 py-2.5 text-center">Sems.</th>
                      <th className="px-4 py-2.5 text-right">Sueldos</th>
                      <th className="px-4 py-2.5 text-right">Extras</th>
                      <th className="px-4 py-2.5 text-right">Bonos</th>
                      <th className="px-4 py-2.5 text-right">Primas</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {porEmpleado.map(e => (
                      <tr key={e.nombre} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5">
                          <p className="font-semibold text-slate-800">{e.nombre}</p>
                          <p className="text-xs text-slate-400">{e.puesto}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-400 text-xs">{e.semanas}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{fmt(e.sueldos)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{e.extras > 0 ? fmt(e.extras) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-purple-600">{e.bonos > 0 ? fmt(e.bonos) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-blue-600">{e.primas > 0 ? fmt(e.primas) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-800">{fmt(e.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.por_semana.length === 0 && !loading && (
            <p className="text-sm text-slate-400 text-center py-6">Sin nóminas registradas para {periodStr}.</p>
          )}
        </>
      )}
    </div>
  );
};

export default CostoRealTab;
