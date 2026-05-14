import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { AlertasContratos, ContratoArrendamiento, EstatusContrato, Inmueble } from '../../../types/inmuebles.types';
import { listarInmuebles, listarContratos, generarRentas, generarServicios } from '../../../services/inmueblesService';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const colorDias = (dias: number) => {
  if (dias <= 0)  return 'bg-red-50 border-red-200';
  if (dias <= 15) return 'bg-red-50 border-red-200';
  if (dias <= 30) return 'bg-orange-50 border-orange-200';
  return 'bg-amber-50 border-amber-200';
};

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

interface Props {
  alertas: AlertasContratos | null;
}

const COLORES_ESTATUS_CONTRATO: Record<EstatusContrato, string> = {
  activo:    'bg-green-100 text-green-700',
  vencido:   'bg-orange-100 text-orange-700',
  terminado: 'bg-slate-100 text-slate-500',
};

const ETIQUETAS_ESTATUS_CONTRATO: Record<EstatusContrato, string> = {
  activo:    'Ocupado',
  vencido:   'Vencido',
  terminado: 'Terminado',
};

const DashboardInmueblesTab: React.FC<Props> = ({ alertas }) => {
  const hoy = new Date();
  const [inmuebles, setInmuebles]       = useState<Inmueble[]>([]);
  const [contratos, setContratos]       = useState<ContratoArrendamiento[]>([]);
  const [mes, setMes]                   = useState(hoy.getMonth() + 1);
  const [anio, setAnio]                 = useState(hoy.getFullYear());
  const [generando, setGenerando]       = useState(false);
  const [resultado, setResultado]       = useState<string | null>(null);

  useEffect(() => {
    listarInmuebles().then(setInmuebles).catch(() => {});
    listarContratos().then(setContratos).catch(() => {});
  }, []);

  const total      = inmuebles.length;
  const rentados   = inmuebles.filter(i => i.estatus === 'rentado').length;
  const disponibles = inmuebles.filter(i => i.estatus === 'disponible').length;
  const alertasTotal = alertas?.total ?? 0;

  const handleGenerar = async (tipo: 'rentas' | 'servicios') => {
    setGenerando(true);
    setResultado(null);
    try {
      const fn = tipo === 'rentas' ? generarRentas : generarServicios;
      const r = await fn(mes, anio);
      setResultado(r.mensaje);
    } catch {
      setResultado('Error al generar. Revisa la consola.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total inmuebles</p>
              <p className="text-lg font-bold text-slate-800">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Rentados</p>
              <p className="text-lg font-bold text-green-600">{rentados}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
              <Clock size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Disponibles</p>
              <p className="text-lg font-bold text-slate-800">{disponibles}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Contratos por vencer</p>
              <p className="text-lg font-bold text-red-600">{alertasTotal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generadores ERP */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-orange-500" /> Generadores ERP
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mes</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Año</label>
            <input
              type="number"
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 w-24 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <button
            disabled={generando}
            onClick={() => handleGenerar('rentas')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {generando ? 'Generando…' : 'Generar Rentas'}
          </button>
          <button
            disabled={generando}
            onClick={() => handleGenerar('servicios')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {generando ? 'Generando…' : 'Generar Servicios (Borradores)'}
          </button>
        </div>
        {resultado && (
          <p className="mt-3 text-sm text-green-600 font-medium">{resultado}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          "Generar Rentas" crea registros en Cuentas por Cobrar. "Generar Servicios" crea borradores en Cuentas por Pagar para que captures el monto del recibo.
        </p>
      </div>

      {/* Alertas de contratos */}
      {alertasTotal > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Contratos próximos a vencer (60 días)
          </h3>
          <div className="space-y-2">
            {alertas?.contratos.map(c => (
              <div
                key={c.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${colorDias(c.dias_para_vencer ?? 0)}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.ubicacion_direccion}</p>
                  <p className="text-xs text-slate-500">
                    {c.inquilino_nombre} · Vence: {c.fecha_fin}
                  </p>
                </div>
                <span className={`shrink-0 ml-4 text-xs font-bold px-2 py-1 rounded-full
                  ${(c.dias_para_vencer ?? 0) <= 0 ? 'bg-red-100 text-red-700' :
                    (c.dias_para_vencer ?? 0) <= 15 ? 'bg-orange-100 text-orange-700' :
                    'bg-amber-100 text-amber-700'}`}
                >
                  {(c.dias_para_vencer ?? 0) <= 0 ? 'Vencido' : `${c.dias_para_vencer} días`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flat list — one row per contract/tenant */}
      {contratos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Unidades / Contratos</h3>
            <span className="text-xs text-slate-400">{contratos.length} contrato(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Inmueble</th>
                  <th className="px-4 py-3 text-left">Local / Unidad</th>
                  <th className="px-4 py-3 text-left">Inquilino</th>
                  <th className="px-4 py-3 text-right">Renta Mensual</th>
                  <th className="px-4 py-3 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contratos.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {c.ubicacion_direccion ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {c.num_local != null ? `Local ${c.num_local}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {c.inquilino_nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                      {fmt(parseFloat(c.monto_renta_mensual))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${COLORES_ESTATUS_CONTRATO[c.estatus]}`}>
                        {ETIQUETAS_ESTATUS_CONTRATO[c.estatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardInmueblesTab;
