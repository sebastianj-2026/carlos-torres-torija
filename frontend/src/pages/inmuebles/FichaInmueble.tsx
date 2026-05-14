import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign,
  CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { ROIData, CuentaPorCobrar } from '../../types/inmuebles.types';
import { obtenerROI, listarCobros, marcarCobrado } from '../../services/inmueblesService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const ESTATUS_BADGE: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-700',
  cobrado:    'bg-green-100 text-green-700',
  vencido:    'bg-red-100 text-red-700',
  cancelado:  'bg-slate-100 text-slate-500',
};

const FichaInmueble: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [roi, setRoi]                 = useState<ROIData | null>(null);
  const [cobros, setCobros]           = useState<CuentaPorCobrar[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [cobrando, setCobrando]       = useState<string | null>(null);

  const cargar = () => {
    if (!id) return;
    setCargando(true);
    Promise.all([
      obtenerROI(id),
      listarCobros({ inmueble_id: id }),
    ])
      .then(([r, c]) => { setRoi(r); setCobros(c); })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCobrar = async (cobro: CuentaPorCobrar) => {
    setCobrando(cobro.id);
    try {
      await marcarCobrado(cobro.id, { forma_cobro: 'efectivo' });
      cargar();
    } catch {
    } finally {
      setCobrando(null);
    }
  };

  if (cargando) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center py-20 text-slate-400 text-sm">
        Cargando ficha…
      </div>
    );
  }

  if (!roi) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-500 text-sm">Inmueble no encontrado.</p>
        <Link to="/inmuebles" className="text-orange-500 text-sm hover:underline mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const { inmueble, total_cobrado, total_pagado, utilidad, cobros_por_mes, pagos_por_mes } = roi;

  // Merge cobros/pagos por mes for chart
  const meses = Array.from(new Set([
    ...cobros_por_mes.map(c => c.periodo),
    ...pagos_por_mes.map(p => p.periodo),
  ])).sort();

  const chartData = meses.map(m => ({
    mes: m.slice(5),
    ingresos: cobros_por_mes.find(c => c.periodo === m)?.monto ?? 0,
    gastos:   pagos_por_mes.find(p => p.periodo === m)?.monto ?? 0,
  }));

  const pendientes = cobros.filter(c => c.estatus === 'pendiente');
  const cobrados   = cobros.filter(c => c.estatus === 'cobrado');

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div>
        <Link to="/inmuebles" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-orange-500 mb-3">
          <ArrowLeft size={14} /> Gestión Inmobiliaria
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{inmueble.ubicacion_direccion}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{inmueble.ciudad}, {inmueble.estado}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize
            ${inmueble.estatus === 'rentado' ? 'bg-blue-100 text-blue-700' :
              inmueble.estatus === 'disponible' ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-500'}`}
          >
            {inmueble.estatus.replace('_', ' ')}
          </span>
        </div>
        {inmueble.valor_propiedad && (
          <p className="text-xs text-slate-400 mt-1">Valor: {fmt(parseFloat(inmueble.valor_propiedad))}</p>
        )}
      </div>

      {/* Mini dashboard financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Ingresos totales</p>
              <p className="text-xl font-bold text-green-600">{fmt(total_cobrado)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Gastos totales</p>
              <p className="text-xl font-bold text-red-500">{fmt(total_pagado)}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${utilidad >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${utilidad >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign size={18} className={utilidad >= 0 ? 'text-green-600' : 'text-red-600'} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Utilidad Real</p>
              <p className={`text-xl font-bold ${utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmt(utilidad)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica histórica */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Ingresos vs Gastos por Mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="ingresos" fill="#10b981" radius={[4,4,0,0]} name="Ingresos" />
              <Bar dataKey="gastos"   fill="#ef4444" radius={[4,4,0,0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rentas pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Rentas Pendientes de Cobro</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pendientes.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-slate-800">{c.concepto}</p>
                  <p className="text-xs text-slate-400">Vence: {c.fecha_limite_cobro}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-slate-700">{fmt(parseFloat(c.monto))}</p>
                  <button
                    disabled={cobrando === c.id}
                    onClick={() => handleCobrar(c)}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {cobrando === c.id ? '…' : 'Cobrar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de cobros */}
      {cobrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle size={15} className="text-green-500" />
            <h3 className="text-sm font-semibold text-slate-700">Historial de Rentas Cobradas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-left">Cobrado</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cobros.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{c.concepto}</td>
                    <td className="px-4 py-3 text-slate-500">{c.periodo_mes}/{c.periodo_anio}</td>
                    <td className="px-4 py-3 text-slate-500">{c.fecha_cobro_real ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(parseFloat(c.monto))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTATUS_BADGE[c.estatus]}`}>
                        {c.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cobros.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center">
          <Clock size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Sin rentas generadas. Usa el generador en el Dashboard.</p>
        </div>
      )}
    </div>
  );
};

export default FichaInmueble;
