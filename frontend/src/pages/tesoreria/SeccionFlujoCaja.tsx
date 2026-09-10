import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { obtenerFlujoCaja } from '../../services/tesoreriaService';
import { ResumenFlujoCaja, FlujoCajaCategoria, FlujoCajaOrigen } from '../../types/tesoreria.types';

const ORIGEN_CFG: Record<string, { label: string; color: string; bar: string }> = {
  Prestamo:        { label: 'Préstamos',      color: 'text-blue-700',   bar: 'bg-blue-500'   },
  Inmueble:        { label: 'Inmobiliaria',   color: 'text-purple-700', bar: 'bg-purple-500' },
  Cancha:          { label: 'Cancha',         color: 'text-sky-700', bar: 'bg-sky-500' },
  Estacionamiento: { label: 'Estacionamiento',color: 'text-emerald-700',bar: 'bg-emerald-500'},
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (v: number) =>
  v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const SeccionFlujoCaja: React.FC = () => {
  const hoy  = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [data, setData]     = useState<ResumenFlujoCaja | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await obtenerFlujoCaja(mes, anio);
      setData(r);
    } finally { setLoading(false); }
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const anioOptions = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - 1 + i);

  const entradas = data?.por_categoria.filter(c => c.tipo === 'entrada') ?? [];
  const salidas  = data?.por_categoria.filter(c => c.tipo === 'salida')  ?? [];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {anioOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={cargar} className="p-2 text-slate-500 hover:text-slate-800">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12 text-slate-400 text-sm">Calculando...</div>
      )}

      {data && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={15} className="text-emerald-600"/>
                <span className="text-xs text-slate-500">Total entradas</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-emerald-700 break-words">{fmt(data.total_entradas)}</p>
            </div>

            <div className="border border-red-200 bg-red-50 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={15} className="text-red-500"/>
                <span className="text-xs text-slate-500">Total salidas</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-red-700 break-words">{fmt(data.total_salidas)}</p>
            </div>

            <div className={`border rounded-xl p-3 sm:p-4 ${
              data.flujo_neto >= 0
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {data.flujo_neto > 0 ? <TrendingUp size={15} className="text-emerald-600"/> :
                 data.flujo_neto < 0 ? <TrendingDown size={15} className="text-red-500"/> :
                                       <Minus size={15} className="text-slate-400"/>}
                <span className="text-xs text-slate-500">Flujo neto</span>
              </div>
              <p className={`text-lg sm:text-xl font-bold break-words ${data.flujo_neto >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmt(data.flujo_neto)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{data.total_movimientos} movimientos</p>
            </div>
          </div>

          {/* Ingresos por fuente */}
          {(data.ingresos_por_origen?.length ?? 0) > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">Ingresos por fuente</h3>
                <span className="text-xs text-slate-500 font-medium">
                  Total {fmt(data.total_ingresos_externos)}
                </span>
              </div>
              <div className="space-y-3">
                {data.ingresos_por_origen.map((o: FlujoCajaOrigen) => {
                  const cfg = ORIGEN_CFG[o.origen] ?? { label: o.origen, color: 'text-slate-700', bar: 'bg-slate-400' };
                  const pct = data.total_ingresos_externos > 0
                    ? Math.round((o.total / data.total_ingresos_externos) * 100)
                    : 0;
                  return (
                    <div key={o.origen}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{o.cantidad} mov.</span>
                          <span className={`text-sm font-bold ${cfg.color}`}>{fmt(o.total)}</span>
                          <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desglose caja chica por categoría */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Entradas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-600"/>
                <h3 className="font-semibold text-slate-800 text-sm">Entradas por categoría</h3>
              </div>
              {entradas.length === 0 ? (
                <p className="text-xs text-slate-400">Sin entradas en este período.</p>
              ) : (
                <div className="space-y-2">
                  {entradas.map((c: FlujoCajaCategoria) => (
                    <div key={c.categoria_id ?? 'sin-cat-e'} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate">{c.categoria_nombre}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{c.cantidad} mov.</span>
                        <span className="font-semibold text-emerald-700">{fmt(c.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Salidas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown size={15} className="text-red-500"/>
                <h3 className="font-semibold text-slate-800 text-sm">Salidas por categoría</h3>
              </div>
              {salidas.length === 0 ? (
                <p className="text-xs text-slate-400">Sin salidas en este período.</p>
              ) : (
                <div className="space-y-2">
                  {salidas.map((c: FlujoCajaCategoria) => (
                    <div key={c.categoria_id ?? 'sin-cat-s'} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate">{c.categoria_nombre}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{c.cantidad} mov.</span>
                        <span className="font-semibold text-red-700">{fmt(c.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SeccionFlujoCaja;
