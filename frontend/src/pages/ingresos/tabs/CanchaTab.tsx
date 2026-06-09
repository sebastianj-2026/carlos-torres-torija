import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Banknote } from 'lucide-react';
import { logError } from '../../../utils/logError';
import { CorteCancha } from '../../../types/ingresos.types';
import { listarCortesCancha, crearCorteCancha } from '../../../services/ingresosService';

const TARIFA = 600;

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n));

const hoy = new Date().toISOString().split('T')[0];

interface CorteForm {
  fecha_operacion: string;
  horas_rentadas: string;
  monto_real_recibido: string;
  encargado: string;
  notas: string;
}

const emptyForm = (): CorteForm => ({
  fecha_operacion:     hoy,
  horas_rentadas:      '',
  monto_real_recibido: '',
  encargado:           'Alfredo',
  notas:               '',
});

const CanchaTab: React.FC = () => {
  const [form,      setForm]      = useState<CorteForm>(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const [err,       setErr]       = useState('');
  const [ok,        setOk]        = useState('');
  const [cortes,    setCortes]    = useState<CorteCancha[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [filtroPeriodo, setFiltroPeriodo] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  const set = (k: keyof CorteForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErr(''); setOk('');
  };

  const horas         = parseFloat(form.horas_rentadas) || 0;
  const sugerido      = parseFloat((horas * TARIFA).toFixed(2));
  const real          = parseFloat(form.monto_real_recibido) || 0;
  const hayDescuento  = horas > 0 && real > 0 && real < sugerido;

  const cargar = useCallback(() => {
    setLoading(true);
    listarCortesCancha().then(setCortes).catch(logError).finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cortesFiltrados = useMemo(
    () => cortes.filter(c => c.fecha_operacion.startsWith(filtroPeriodo)),
    [cortes, filtroPeriodo]
  );

  const totalMesReal     = useMemo(() => cortesFiltrados.reduce((s, c) => s + parseFloat(c.monto_real_recibido), 0), [cortesFiltrados]);
  const totalMesEsperado = useMemo(() => cortesFiltrados.reduce((s, c) => s + parseFloat(c.monto_esperado), 0), [cortesFiltrados]);

  const guardar = async () => {
    if (!form.fecha_operacion) { setErr('La fecha de operación es obligatoria.'); return; }
    if (horas <= 0)            { setErr('Las horas rentadas deben ser mayores a 0.'); return; }
    if (real  <= 0)            { setErr('El monto real recibido debe ser mayor a 0.'); return; }
    if (!form.encargado.trim()){ setErr('El encargado es obligatorio.'); return; }

    setGuardando(true);
    try {
      await crearCorteCancha({
        fecha_operacion:    form.fecha_operacion,
        horas_rentadas:     horas,
        monto_real_recibido: real,
        encargado:          form.encargado.trim(),
        notas:              form.notas || undefined,
      });
      setOk(`Corte del ${form.fecha_operacion} guardado. ${fmt(real)} → Caja Chica.`);
      setForm(emptyForm());
      cargar();
    } catch {
      setErr('Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

      {/* ── Formulario ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Target size={16} /> Registrar Corte de Cancha
          </h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Banknote size={12} /> Efectivo
          </span>
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        {ok  && <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">{ok}</p>}

        <div className="space-y-4">
          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Fecha de operación *
            </label>
            <input
              type="date"
              value={form.fecha_operacion}
              max={hoy}
              onChange={e => set('fecha_operacion', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <p className="text-[11px] text-slate-400 mt-1">Permite registrar cortes de días anteriores.</p>
          </div>

          {/* Horas + ayuda visual */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Horas rentadas *
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.horas_rentadas}
              onChange={e => set('horas_rentadas', e.target.value)}
              placeholder="Ej. 2 ó 1.5"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {/* Ayuda visual — solo visible cuando hay horas */}
            <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 transition-all ${horas > 0 ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
              <span className="text-[11px] text-slate-400">Sugerido ($600/hr)</span>
              <span className={`text-sm font-bold ${horas > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                {horas > 0 ? fmt(sugerido) : '—'}
              </span>
            </div>
          </div>

          {/* Monto real */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Monto real recibido *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={form.monto_real_recibido}
                onChange={e => set('monto_real_recibido', e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            {/* Alerta de descuento */}
            {hayDescuento && (
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                ⚠ Descuento de {fmt(sugerido - real)} respecto al sugerido.
              </p>
            )}
          </div>

          {/* Encargado */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Encargado
            </label>
            <input
              type="text"
              value={form.encargado}
              onChange={e => set('encargado', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Notas <span className="text-slate-300 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              rows={2}
              placeholder="Ej. torneo, descuento acordado…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          <button
            onClick={guardar}
            disabled={guardando || horas <= 0 || real <= 0}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
          >
            {guardando ? 'Guardando…' : 'Registrar Corte'}
          </button>
        </div>
      </div>

      {/* ── Historial ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-700">Historial de cortes</h3>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={filtroPeriodo}
              onChange={e => setFiltroPeriodo(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {cortesFiltrados.length > 0 && (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {cortesFiltrados.length} cortes
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
        ) : cortesFiltrados.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Sin cortes para este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha op.</th>
                  <th className="px-4 py-3 text-right">Horas</th>
                  <th className="px-4 py-3 text-right">Esperado</th>
                  <th className="px-4 py-3 text-right">Real</th>
                  <th className="px-4 py-3 text-left">Encargado</th>
                  <th className="px-4 py-3 text-left">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cortesFiltrados.map(c => {
                  const esperado = parseFloat(c.monto_esperado);
                  const cobrado  = parseFloat(c.monto_real_recibido);
                  const descuento = cobrado < esperado;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {c.fecha_operacion}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {parseFloat(c.horas_rentadas)}h
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {fmt(esperado)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${descuento ? 'text-amber-600' : 'text-slate-800'}`}>
                        {fmt(cobrado)}
                        {descuento && (
                          <span className="ml-1 text-[10px] font-normal text-amber-500">
                            -{fmt(esperado - cobrado)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{c.encargado}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">
                        {c.notas ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600">Total mes</td>
                  <td />
                  <td className="px-4 py-3 text-right text-xs font-bold text-slate-400">{fmt(totalMesEsperado)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">{fmt(totalMesReal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanchaTab;
