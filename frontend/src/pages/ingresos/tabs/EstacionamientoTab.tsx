import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Car, Banknote } from 'lucide-react';
import { logError } from '../../../utils/logError';
import { PensionEstacionamiento, CorteEstacionamiento } from '../../../types/ingresos.types';
import {
  listarPensiones, crearPension, editarPension,
  listarMovimientosExtra, crearMovimientoExtra,
  listarCortesEstacionamiento, crearCorteEstacionamiento,
} from '../../../services/ingresosService';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n));


type SubTab = 'pensiones' | 'corte';

interface PensionForm {
  cliente_nombre: string;
  vehiculo_placas: string;
  vehiculo_color: string;
  monto_mensual: string;
  fecha_inicio: string;
  fecha_fin: string;
  notas: string;
  url_comprobante_pago: string;
}

const emptyPensionForm = (): PensionForm => ({
  cliente_nombre: '', vehiculo_placas: '', vehiculo_color: '',
  monto_mensual: '', fecha_inicio: '', fecha_fin: '',
  notas: '', url_comprobante_pago: '',
});

interface CorteForm {
  fecha_operacion: string;
  ingreso_coches: string;
  ingreso_banos: string;
  ingreso_tiendita: string;
  notas: string;
}

const hoy = new Date().toISOString().split('T')[0];
const emptyCorteForm = (): CorteForm => ({
  fecha_operacion: hoy,
  ingreso_coches: '',
  ingreso_banos: '',
  ingreso_tiendita: '',
  notas: '',
});

const diasBadge = (dias?: number) => {
  if (dias == null) return null;
  if (dias <= 0)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Vencida</span>;
  if (dias <= 5)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{dias}d</span>;
  if (dias <= 15) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{dias}d</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{dias}d</span>;
};

const EstacionamientoTab: React.FC = () => {
  const [sub, setSub] = useState<SubTab>('pensiones');

  // --- Pensiones state ---
  const [pensiones, setPensiones] = useState<PensionEstacionamiento[]>([]);
  const [loadingP, setLoadingP] = useState(true);
  const [modoP, setModoP] = useState<'lista' | 'nuevo' | 'editar'>('lista');
  const [formP, setFormP] = useState<PensionForm>(emptyPensionForm());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardandoP, setGuardandoP] = useState(false);
  const [errP, setErrP] = useState('');

  // --- Extras modal ---
  const [extrasModal, setExtrasModal] = useState<PensionEstacionamiento | null>(null);
  const [extras, setExtras] = useState<{ id: string; monto: string; concepto_extra: string; fecha: string }[]>([]);
  const [nuevoExtra, setNuevoExtra] = useState({ monto: '', concepto_extra: '', fecha: hoy });
  const [guardandoExtra, setGuardandoExtra] = useState(false);

  // --- Corte state ---
  const [formC, setFormC] = useState<CorteForm>(emptyCorteForm());
  const [guardandoC, setGuardandoC] = useState(false);
  const [errC, setErrC] = useState('');
  const [cortes, setCortes] = useState<CorteEstacionamiento[]>([]);
  const [loadingC, setLoadingC] = useState(true);
  const [okMsg, setOkMsg] = useState('');

  const cargarPensiones = useCallback(() => {
    setLoadingP(true);
    listarPensiones().then(setPensiones).catch(logError).finally(() => setLoadingP(false));
  }, []);

  const cargarCortes = useCallback(() => {
    setLoadingC(true);
    listarCortesEstacionamiento()
      .then(setCortes).catch(logError).finally(() => setLoadingC(false));
  }, []);

  useEffect(() => { cargarPensiones(); }, [cargarPensiones]);
  useEffect(() => { if (sub === 'corte') cargarCortes(); }, [sub, cargarCortes]);

  const abrirNueva = () => { setFormP(emptyPensionForm()); setEditandoId(null); setErrP(''); setModoP('nuevo'); };
  const abrirEditar = (p: PensionEstacionamiento) => {
    setFormP({
      cliente_nombre: p.cliente_nombre,
      vehiculo_placas: p.vehiculo_placas ?? '',
      vehiculo_color: p.vehiculo_color ?? '',
      monto_mensual: String(p.monto_mensual),
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      notas: p.notas ?? '',
      url_comprobante_pago: p.url_comprobante_pago ?? '',
    });
    setEditandoId(p.id);
    setErrP('');
    setModoP('editar');
  };

  const setFP = (k: keyof PensionForm, v: string) => setFormP(f => ({ ...f, [k]: v }));

  const guardarPension = async () => {
    if (!formP.cliente_nombre || !formP.monto_mensual || !formP.fecha_inicio || !formP.fecha_fin) {
      setErrP('Cliente, monto, fecha inicio y fecha fin son obligatorios.'); return;
    }
    setGuardandoP(true); setErrP('');
    try {
      if (modoP === 'nuevo') {
        await crearPension(formP);
      } else if (editandoId) {
        await editarPension(editandoId, formP);
      }
      setModoP('lista'); cargarPensiones();
    } catch { setErrP('Error al guardar. Revisa los datos.'); }
    finally { setGuardandoP(false); }
  };

  const abrirExtras = async (p: PensionEstacionamiento) => {
    setExtrasModal(p);
    const data = await listarMovimientosExtra(p.id).catch(() => []);
    setExtras(data);
  };

  const guardarExtra = async () => {
    if (!extrasModal || !nuevoExtra.monto || !nuevoExtra.concepto_extra) return;
    setGuardandoExtra(true);
    try {
      const e = await crearMovimientoExtra(extrasModal.id, nuevoExtra);
      setExtras(prev => [e, ...prev]);
      setNuevoExtra({ monto: '', concepto_extra: '', fecha: hoy });
    } catch { /* silencioso */ }
    finally { setGuardandoExtra(false); }
  };

  const setFC = (k: keyof CorteForm, v: string) => setFormC(f => ({ ...f, [k]: v }));

  const totalCorte = (
    (parseFloat(formC.ingreso_coches)   || 0) +
    (parseFloat(formC.ingreso_banos)    || 0) +
    (parseFloat(formC.ingreso_tiendita) || 0)
  );

  // Cortes del mes seleccionado por el selector del historial
  const [filtroPeriodo, setFiltroPeriodo] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  const cortesFiltrados = useMemo(() => {
    return cortes.filter(c => c.fecha_operacion.startsWith(filtroPeriodo));
  }, [cortes, filtroPeriodo]);

  const totalMes = useMemo(
    () => cortesFiltrados.reduce((s, c) => s + parseFloat(c.monto_total), 0),
    [cortesFiltrados]
  );

  const guardarCorte = async () => {
    if (!formC.fecha_operacion) { setErrC('La fecha de operación es obligatoria.'); return; }
    if (totalCorte <= 0) { setErrC('Al menos un concepto debe tener monto mayor a 0.'); return; }
    setGuardandoC(true); setErrC(''); setOkMsg('');
    try {
      await crearCorteEstacionamiento({
        fecha_operacion:  formC.fecha_operacion,
        ingreso_coches:   parseFloat(formC.ingreso_coches)   || 0,
        ingreso_banos:    parseFloat(formC.ingreso_banos)    || 0,
        ingreso_tiendita: parseFloat(formC.ingreso_tiendita) || 0,
        notas:            formC.notas || undefined,
      });
      setOkMsg(`Corte del ${formC.fecha_operacion} guardado.`);
      setFormC(emptyCorteForm());
      cargarCortes();
    } catch { setErrC('Error al guardar el corte.'); }
    finally { setGuardandoC(false); }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pensiones', 'corte'] as SubTab[]).map(s => (
          <button key={s} onClick={() => setSub(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${sub === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {s === 'pensiones' ? 'Pensiones' : 'Corte Diario'}
          </button>
        ))}
      </div>

      {/* ===================== PENSIONES ===================== */}
      {sub === 'pensiones' && (
        <div className="space-y-4">
          {modoP === 'lista' ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{pensiones.length} pensiones registradas</p>
                <button onClick={abrirNueva}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
                  <Plus size={15} /> Nueva Pensión
                </button>
              </div>

              {loadingP ? (
                <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
              ) : pensiones.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Sin pensiones registradas.</p>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Cliente</th>
                          <th className="px-4 py-3 text-left">Placas / Color</th>
                          <th className="px-4 py-3 text-right">Mensual</th>
                          <th className="px-4 py-3 text-center">Vigencia</th>
                          <th className="px-4 py-3 text-center">Vence</th>
                          <th className="px-4 py-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pensiones.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{p.cliente_nombre}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {p.vehiculo_placas ?? '—'}{p.vehiculo_color ? ` · ${p.vehiculo_color}` : ''}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(p.monto_mensual)}</td>
                            <td className="px-4 py-3 text-center text-slate-500 text-xs">
                              {p.fecha_inicio} → {p.fecha_fin}
                            </td>
                            <td className="px-4 py-3 text-center">{diasBadge(p.dias_para_vencer)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => abrirEditar(p)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                                <button onClick={() => abrirExtras(p)}
                                  className="text-xs text-purple-600 hover:text-purple-800 font-medium">Extras</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Form nueva/editar pensión */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 max-w-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{modoP === 'nuevo' ? 'Nueva Pensión' : 'Editar Pensión'}</h3>
                <button onClick={() => setModoP('lista')}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              {errP && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errP}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Nombre del cliente *</label>
                  <input value={formP.cliente_nombre} onChange={e => setFP('cliente_nombre', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Placas</label>
                  <input value={formP.vehiculo_placas} onChange={e => setFP('vehiculo_placas', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Color</label>
                  <input value={formP.vehiculo_color} onChange={e => setFP('vehiculo_color', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Monto mensual *</label>
                  <input type="number" value={formP.monto_mensual} onChange={e => setFP('monto_mensual', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Comprobante URL</label>
                  <input value={formP.url_comprobante_pago} onChange={e => setFP('url_comprobante_pago', e.target.value)}
                    placeholder="https://…"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha inicio *</label>
                  <input type="date" value={formP.fecha_inicio} onChange={e => setFP('fecha_inicio', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha fin *</label>
                  <input type="date" value={formP.fecha_fin} onChange={e => setFP('fecha_fin', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Notas</label>
                  <textarea value={formP.notas} onChange={e => setFP('notas', e.target.value)} rows={2}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={guardarPension} disabled={guardandoP}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  {guardandoP ? 'Guardando…' : 'Guardar'}
                </button>
                <button onClick={() => setModoP('lista')}
                  className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== CORTE DIARIO ===================== */}
      {sub === 'corte' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          {/* ── Formulario ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Car size={16} /> Registrar Corte Diario
              </h3>
              {/* Badge fijo de destino */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <Banknote size={12} /> Efectivo · Caja Chica
              </span>
            </div>

            {errC && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errC}</p>}
            {okMsg && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{okMsg}</p>}

            <div className="space-y-4">
              {/* Fecha de operación */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Fecha de operación *
                </label>
                <input
                  type="date"
                  value={formC.fecha_operacion}
                  max={hoy}
                  onChange={e => { setFC('fecha_operacion', e.target.value); setOkMsg(''); }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Puedes registrar cortes de días anteriores — usa la fecha real de operación.
                </p>
              </div>

              {/* Tres inputs */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Ingresos del día
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'ingreso_coches'   as const, label: 'Coches 🚗' },
                    { key: 'ingreso_banos'    as const, label: 'Baños 🚻' },
                    { key: 'ingreso_tiendita' as const, label: 'Tiendita 🏪' },
                  ]).map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                          type="number" step="1" min="0"
                          value={formC[key]}
                          onChange={e => { setFC(key, e.target.value); setOkMsg(''); }}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totalizador dinámico */}
              <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Total del día</span>
                <span className="text-2xl font-bold text-orange-600">{fmt(totalCorte)}</span>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Notas <span className="text-slate-300 font-normal normal-case">(opcional)</span>
                </label>
                <textarea
                  value={formC.notas}
                  onChange={e => setFC('notas', e.target.value)}
                  rows={2}
                  placeholder="Ej. día festivo, evento especial…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>

              <button
                onClick={guardarCorte}
                disabled={guardandoC || totalCorte <= 0}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {guardandoC ? 'Guardando…' : 'Registrar Corte'}
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
                  <span className="text-xs text-slate-400">
                    {cortesFiltrados.length} cortes · {fmt(totalMes)}
                  </span>
                )}
              </div>
            </div>

            {loadingC ? (
              <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
            ) : cortesFiltrados.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Sin cortes para este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha op.</th>
                      <th className="px-4 py-3 text-right">Coches</th>
                      <th className="px-4 py-3 text-right">Baños</th>
                      <th className="px-4 py-3 text-right">Tiendita</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-left">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cortesFiltrados.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {c.fecha_operacion}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.ingreso_coches)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.ingreso_banos)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.ingreso_tiendita)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(c.monto_total)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[140px] truncate">
                          {c.notas ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">Total mes</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-600">
                        {fmt(cortesFiltrados.reduce((s, c) => s + parseFloat(c.ingreso_coches), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-600">
                        {fmt(cortesFiltrados.reduce((s, c) => s + parseFloat(c.ingreso_banos), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-600">
                        {fmt(cortesFiltrados.reduce((s, c) => s + parseFloat(c.ingreso_tiendita), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">{fmt(totalMes)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== EXTRAS MODAL ===================== */}
      {extrasModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Extras — {extrasModal.cliente_nombre}</h3>
              <button onClick={() => setExtrasModal(null)}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            {/* Form nuevo extra */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Concepto</label>
                  <input value={nuevoExtra.concepto_extra}
                    onChange={e => setNuevoExtra(x => ({ ...x, concepto_extra: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Monto</label>
                  <input type="number" value={nuevoExtra.monto}
                    onChange={e => setNuevoExtra(x => ({ ...x, monto: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                  <input type="date" value={nuevoExtra.fecha}
                    onChange={e => setNuevoExtra(x => ({ ...x, fecha: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <button onClick={guardarExtra} disabled={guardandoExtra}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {guardandoExtra ? '…' : 'Agregar'}
                </button>
              </div>
            </div>

            {/* Lista de extras */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {extras.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin movimientos extras.</p>
              ) : extras.map(e => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm text-slate-800">{e.concepto_extra}</p>
                    <p className="text-xs text-slate-400">{e.fecha}</p>
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{fmt(e.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstacionamientoTab;
