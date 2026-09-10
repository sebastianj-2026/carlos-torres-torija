import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NominaPagada } from '../../../types/nominas.types';
import { historialNominas } from '../../../services/nominasService';
import { Empleado } from '../../../types/nominas.types';
import { listarEmpleados } from '../../../services/nominasService';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n));

const HistorialNominasTab: React.FC = () => {
  const [nominas,   setNominas]   = useState<NominaPagada[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filtroEmp, setFiltroEmp] = useState('');
  const [filtroPer, setFiltroPer] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [n, e] = await Promise.all([historialNominas(undefined, 200), listarEmpleados()]);
      setNominas(n);
      setEmpleados(e);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => nominas.filter(n => {
    const matchEmp = !filtroEmp || n.empleado_id === filtroEmp;
    const matchPer = n.semana_inicio.startsWith(filtroPer);
    return matchEmp && matchPer;
  }), [nominas, filtroEmp, filtroPer]);

  const totalMes = useMemo(() =>
    filtradas.reduce((s, n) => s + parseFloat(n.monto_total_pagado), 0),
    [filtradas]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="month" value={filtroPer} onChange={e => setFiltroPer(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
        <select value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white min-w-[180px]">
          <option value="">Todos los empleados</option>
          {empleados.map(e => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        {filtradas.length > 0 && (
          <span className="text-xs text-slate-400">{filtradas.length} registros · Total: <strong className="text-sky-600">{fmt(totalMes)}</strong></span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
        ) : filtradas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Sin registros para este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Empleado</th>
                  <th className="px-4 py-3 text-left">Semana</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Extras</th>
                  <th className="px-4 py-3 text-right">Prima</th>
                  <th className="px-4 py-3 text-right">Desc. préstamo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Forma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{n.empleado_nombre}</p>
                      <p className="text-[11px] text-slate-400">{n.puesto}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {n.semana_inicio}<br />
                      <span className="text-slate-400">al {n.semana_fin}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(n.sueldo_base)}</td>
                    <td className="px-4 py-3 text-right">
                      {parseFloat(n.monto_horas_extras) > 0 ? (
                        <span className="text-emerald-600 font-semibold">+{fmt(n.monto_horas_extras)}</span>
                      ) : <span className="text-slate-300">—</span>}
                      {n.tipo_hora_extra && (
                        <span className="block text-[10px] text-slate-400">{parseFloat(n.horas_extras_cantidad)}h {n.tipo_hora_extra}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {parseFloat(n.monto_prima_vacacional) > 0 ? (
                        <span className="text-blue-600 font-semibold">+{fmt(n.monto_prima_vacacional)}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {parseFloat(n.descuento_prestamo) > 0 ? (
                        <span className="text-red-500">-{fmt(n.descuento_prestamo)}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">{fmt(n.monto_total_pagado)}</td>
                    <td className="px-4 py-3 text-xs capitalize text-slate-500">{n.forma_pago}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-slate-600">Total período</td>
                  <td className="px-4 py-3 text-right font-black text-sky-600">{fmt(totalMes)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialNominasTab;
