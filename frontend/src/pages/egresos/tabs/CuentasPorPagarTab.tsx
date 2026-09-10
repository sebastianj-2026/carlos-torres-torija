import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, CheckCircle, Clock, FileText, Pencil,
  Timer, AlertTriangle, ListOrdered,
} from 'lucide-react';
import { logError } from '../../../utils/logError';
import {
  CuentaPorPagar, CategoriaEgreso, EstatusCP, ProveedorBeneficiario, StatsEgresos,
} from '../../../types/egresos.types';
import {
  listarCuentas, cambiarEstatusCuenta, crearCuenta, editarCuenta,
  listarCategorias, crearCategoria, listarProveedores, crearSerie,
  obtenerStats, obtenerKpisOficina, obtenerKpisAbril, KpisEgreso,
} from '../../../services/egresosService';
import ExpensesKPIDashboard from '../../../components/egresos/ExpensesKPIDashboard';
import MiniPieChart from '../../../components/egresos/MiniPieChart';

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));

const fmtFecha = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const BADGE_CFG: Record<EstatusCP, { cls: string; icon: React.ReactNode }> = {
  borrador:    { cls: 'bg-slate-50   text-slate-500   border-slate-200',   icon: <FileText      size={11} /> },
  por_aprobar: { cls: 'bg-blue-50    text-blue-700    border-blue-200',    icon: <Timer         size={11} /> },
  programado:  { cls: 'bg-amber-50   text-amber-700   border-amber-200',   icon: <Clock         size={11} /> },
  pagado:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle   size={11} /> },
  vencido:     { cls: 'bg-red-50     text-red-700     border-red-200',     icon: <AlertTriangle size={11} /> },
};

const LABEL: Record<EstatusCP, string> = {
  borrador: 'Borrador', por_aprobar: 'Por aprobar', programado: 'Programado',
  pagado: 'Pagado', vencido: 'Vencido',
};

const EstatusChipCP: React.FC<{ estatus: EstatusCP }> = ({ estatus }) => {
  const { cls, icon } = BADGE_CFG[estatus];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>
      {icon} {LABEL[estatus]}
    </span>
  );
};

const FLUJO: Record<EstatusCP, EstatusCP[]> = {
  borrador: ['por_aprobar'], por_aprobar: ['programado', 'borrador'],
  programado: ['pagado'], pagado: [], vencido: ['pagado'],
};

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'] as const;
type MetodoPago = typeof METODOS_PAGO[number];

const VACÍO = {
  proveedor_id: '', categoria_id: '', concepto: '',
  monto_total: '', moneda: 'MXN', tipo_cambio: '1',
  monto_capital: '0', monto_interes: '0', monto_iva: '0',
  fecha_limite_pago: '', notas: '', metodo_pago: '' as MetodoPago | '',
};

const VACÍO_SERIE = {
  categoria_id: '', proveedor_id: '', concepto: '',
  monto_por_cuota: '', total_cuotas: '', fecha_inicio: '',
  frecuencia_dias: '30', notas: '',
};

interface Props { centroCosto: string; mes: number; anio: number; }

const INPUT = 'w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400';

const CuentasPorPagarTab: React.FC<Props> = ({ centroCosto, mes, anio }) => {
  const mostrarKpis = centroCosto === 'Oficina' || centroCosto === 'Abril';

  const [cuentas, setCuentas]           = useState<CuentaPorPagar[]>([]);
  const [total, setTotal]               = useState(0);
  const [pagina, setPagina]             = useState(1);
  const [cargando, setCargando]         = useState(true);
  const [categorias, setCategorias]     = useState<CategoriaEgreso[]>([]);
  const [proveedores, setProveedores]   = useState<ProveedorBeneficiario[]>([]);
  const [kpis, setKpis]                 = useState<KpisEgreso | null>(null);
  const [cargandoKpis, setCargandoKpis] = useState(false);
  const [stats, setStats]               = useState<StatsEgresos | null>(null);

  const [modalForm, setModalForm]       = useState(false);
  const [editando, setEditando]         = useState<CuentaPorPagar | null>(null);
  const [form, setForm]                 = useState<typeof VACÍO>({ ...VACÍO });
  const [guardando, setGuardando]       = useState(false);
  const [error, setError]               = useState('');

  const [modalSerie, setModalSerie]     = useState(false);
  const [formSerie, setFormSerie]       = useState({ ...VACÍO_SERIE });
  const [guardandoSerie, setGuardandoSerie] = useState(false);
  const [errorSerie, setErrorSerie]     = useState('');

  const [modalCat, setModalCat]         = useState(false);
  const [nuevaCat, setNuevaCat]         = useState('');
  const [nuevaCatColor, setNuevaCatColor] = useState('#94a3b8');
  const [guardandoCat, setGuardCat]     = useState(false);

  const [modalDocs, setModalDocs]       = useState<CuentaPorPagar | null>(null);
  const [urlComp, setUrlComp]           = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPagina(1); }, [mes, anio]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await listarCuentas({ pagina, limite: 20, centro_costo: centroCosto, mes, anio });
      setCuentas(d.cuentas);
      setTotal(d.total);
    } finally {
      setCargando(false);
    }
  }, [pagina, centroCosto, mes, anio]);

  const cargarKpis = useCallback(async () => {
    if (!mostrarKpis) return;
    setCargandoKpis(true);
    try {
      const fn = centroCosto === 'Abril' ? obtenerKpisAbril : obtenerKpisOficina;
      setKpis(await fn(mes, anio));
    } catch { setKpis(null); }
    finally { setCargandoKpis(false); }
  }, [mostrarKpis, centroCosto, mes, anio]);

  const cargarStats = useCallback(async () => {
    if (!mostrarKpis) return;
    try {
      setStats(await obtenerStats({ centro_costo: centroCosto, mes, anio }));
    } catch { setStats(null); }
  }, [mostrarKpis, centroCosto, mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarKpis(); }, [cargarKpis]);
  useEffect(() => { cargarStats(); }, [cargarStats]);
  useEffect(() => {
    listarCategorias(centroCosto).then(setCategorias).catch(logError);
    listarProveedores().then(setProveedores).catch(logError);
  }, [centroCosto]);

  const cambiarEstatus = async (id: string, estatus: EstatusCP) => {
    await cambiarEstatusCuenta(id, { estatus });
    cargar();
    cargarKpis();
    cargarStats();
  };

  const abrirNueva = () => {
    setEditando(null);
    setForm({ ...VACÍO });
    setError('');
    setModalForm(true);
  };

  const abrirEditar = (c: CuentaPorPagar) => {
    setEditando(c);
    setForm({
      proveedor_id: c.proveedor_id ?? '', categoria_id: c.categoria_id, concepto: c.concepto,
      monto_total: c.monto_total, moneda: c.moneda, tipo_cambio: c.tipo_cambio,
      monto_capital: c.monto_capital, monto_interes: c.monto_interes, monto_iva: c.monto_iva,
      fecha_limite_pago: c.fecha_limite_pago, notas: c.notas ?? '',
      metodo_pago: (c as any).metodo_pago ?? '',
    });
    setError('');
    setModalForm(true);
  };

  const guardar = async () => {
    if (!form.categoria_id || !form.concepto || !form.monto_total || !form.fecha_limite_pago) {
      setError('Categoría, concepto, monto y fecha son obligatorios.');
      return;
    }
    if (!editando && !form.metodo_pago) {
      setError('El método de pago es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await editarCuenta(editando.id, form as any);
      } else {
        await crearCuenta({ ...form, centro_costo: centroCosto } as any);
      }
      setModalForm(false);
      cargar();
      cargarKpis();
      cargarStats();
    } catch {
      setError('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarSerie = async () => {
    if (!formSerie.categoria_id || !formSerie.concepto || !formSerie.monto_por_cuota
        || !formSerie.total_cuotas || !formSerie.fecha_inicio) {
      setErrorSerie('Todos los campos marcados con * son obligatorios.');
      return;
    }
    setGuardandoSerie(true);
    try {
      await crearSerie({
        categoria_id:    formSerie.categoria_id,
        proveedor_id:    formSerie.proveedor_id || undefined,
        concepto:        formSerie.concepto,
        monto_por_cuota: parseFloat(formSerie.monto_por_cuota),
        total_cuotas:    parseInt(formSerie.total_cuotas, 10),
        fecha_inicio:    formSerie.fecha_inicio,
        frecuencia_dias: parseInt(formSerie.frecuencia_dias, 10) || 30,
        centro_costo:    centroCosto,
        notas:           formSerie.notas || undefined,
      });
      setModalSerie(false);
      setFormSerie({ ...VACÍO_SERIE });
      setErrorSerie('');
      cargar();
    } catch {
      setErrorSerie('Error al crear la serie. Verifica los datos.');
    } finally {
      setGuardandoSerie(false);
    }
  };

  const guardarCategoria = async () => {
    if (!nuevaCat.trim()) return;
    setGuardCat(true);
    try {
      const cat = await crearCategoria({ nombre: nuevaCat.trim(), color: nuevaCatColor, modulo: centroCosto });
      setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm(f => ({ ...f, categoria_id: cat.id }));
      setNuevaCat('');
      setNuevaCatColor('#94a3b8');
      setModalCat(false);
    } catch (e) { logError(e); }
    finally { setGuardCat(false); }
  };

  const adjuntarDocs = async () => {
    if (!modalDocs) return;
    await cambiarEstatusCuenta(modalDocs.id, { estatus: modalDocs.estatus, url_comprobante_pago: urlComp });
    setModalDocs(null);
    cargar();
  };

  const pieSlices = (stats?.gasto_por_categoria ?? []).map(x => ({
    label: x.categoria,
    value: parseFloat(x.total),
    color: x.color,
  }));

  return (
    <div>
      {/* ── KPIs dashboard ── */}
      {mostrarKpis && <ExpensesKPIDashboard data={kpis} cargando={cargandoKpis} />}

      {/* ── Mini Pie Chart ── */}
      {mostrarKpis && pieSlices.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Distribución por categoría — {centroCosto}
          </p>
          <MiniPieChart slices={pieSlices} size={110} />
        </div>
      )}

      {/* ── Cabecera tabla ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-5">
        <p className="text-sm text-slate-500">
          {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'registro' : 'registros'}`}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFormSerie({ ...VACÍO_SERIE }); setErrorSerie(''); setModalSerie(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl shadow-sm"
          >
            <ListOrdered size={15} /> + Serie
          </button>
          <button
            onClick={abrirNueva}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-sky-500/25"
          >
            <Plus size={16} /> + Gasto
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Categoría</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Proveedor</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Fecha Pago</th>
                <th className="px-4 py-3 text-center">Estatus</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">Cargando…</td></tr>
              ) : cuentas.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">Sin registros para este periodo</td></tr>
              ) : cuentas.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  {/* Concepto — includes X/Y badge for installment series */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-slate-700 truncate">{c.concepto}</p>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {c.total_cuotas > 1 && (
                        <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {c.num_cuota}/{c.total_cuotas}
                        </span>
                      )}
                      {c.inmueble_id && (
                        <>
                          {c.imm_es_renta_externa
                            ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Ext.</span>
                            : c.imm_total_locales
                              ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Local</span>
                              : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Casa</span>
                          }
                          {c.imm_es_renta_externa && c.imm_comision_pct && (
                            <span className="text-[10px] text-purple-500">
                              {Number(c.imm_comision_pct)}% = {fmt(Number(c.monto_total) * Number(c.imm_comision_pct) / 100)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* Categoría — colored badge */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap"
                      style={{ background: c.categoria_color ?? '#94a3b8' }}
                    >
                      {c.categoria_nombre}
                    </span>
                  </td>

                  {/* Proveedor */}
                  <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate hidden sm:table-cell">{c.proveedor_nombre ?? '—'}</td>

                  {/* Monto */}
                  <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap text-right">{fmt(c.monto_total)}</td>

                  {/* Fecha Pago */}
                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                    {c.estatus === 'pagado' && c.fecha_pago_real
                      ? <span className="text-emerald-600">{fmtFecha(c.fecha_pago_real)}</span>
                      : <span className="text-slate-500">{fmtFecha(c.fecha_limite_pago)}</span>}
                  </td>

                  {/* Estatus */}
                  <td className="px-4 py-3 text-center"><EstatusChipCP estatus={c.estatus} /></td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {FLUJO[c.estatus].map(sig => (
                        <button key={sig} onClick={() => cambiarEstatus(c.id, sig)}
                          title={`Mover a ${LABEL[sig]}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          {sig === 'pagado' ? <CheckCircle size={15} className="text-green-500" /> : <Clock size={15} />}
                        </button>
                      ))}
                      <button onClick={() => abrirEditar(c)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { setModalDocs(c); setUrlComp(c.url_comprobante_pago ?? ''); }}
                        title="Documentos"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <FileText size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">{total} registros</p>
            <div className="flex gap-2">
              <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                Anterior
              </button>
              <button disabled={pagina * 20 >= total} onClick={() => setPagina(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal nueva/editar cuenta ── */}
      {modalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                {editando ? 'Editar cuenta' : `Nueva cuenta — ${centroCosto}`}
              </h3>
              <button onClick={() => setModalForm(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Concepto *</label>
                <input value={form.concepto}
                  onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                  className={INPUT} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Categoría *</label>
                  <div className="flex gap-1 mt-1">
                    <select value={form.categoria_id}
                      onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                      <option value="">Seleccionar</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button type="button" onClick={() => { setNuevaCat(''); setNuevaCatColor('#94a3b8'); setModalCat(true); }}
                      title="Nueva categoría"
                      className="px-2 py-2 border border-slate-200 rounded-xl hover:bg-sky-50 hover:border-sky-300 text-slate-400 hover:text-sky-500 transition-colors">
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Proveedor</label>
                  <select value={form.proveedor_id}
                    onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_razon_social}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Monto total *</label>
                  <input type="number" value={form.monto_total}
                    onChange={e => setForm(f => ({ ...f, monto_total: e.target.value }))}
                    className={INPUT} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Fecha límite *</label>
                  <input type="date" value={form.fecha_limite_pago}
                    onChange={e => setForm(f => ({ ...f, fecha_limite_pago: e.target.value }))}
                    className={INPUT} />
                </div>
              </div>
              {!editando && (
                <div>
                  <label className="text-xs text-slate-500">Método de Pago *</label>
                  <select value={form.metodo_pago}
                    onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value as MetodoPago }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                    <option value="">Seleccionar método</option>
                    {METODOS_PAGO.map(m => (
                      <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['monto_capital', 'monto_interes', 'monto_iva'] as const).map(k => (
                  <div key={k}>
                    <label className="text-xs text-slate-500">
                      {k === 'monto_capital' ? 'Capital' : k === 'monto_interes' ? 'Interés' : 'IVA'}
                    </label>
                    <input type="number" value={form[k]}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      className={INPUT} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-500">Notas</label>
                <textarea value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalForm(false)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium disabled:opacity-50">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal serie de cuotas ── */}
      {modalSerie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Nueva serie — {centroCosto}</h3>
              <button onClick={() => setModalSerie(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            {errorSerie && <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{errorSerie}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Concepto *</label>
                <input value={formSerie.concepto}
                  onChange={e => setFormSerie(f => ({ ...f, concepto: e.target.value }))}
                  placeholder="Ej. Pago préstamo Banorte" className={INPUT} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Categoría *</label>
                  <div className="flex gap-1 mt-1">
                    <select value={formSerie.categoria_id}
                      onChange={e => setFormSerie(f => ({ ...f, categoria_id: e.target.value }))}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                      <option value="">Seleccionar</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Proveedor</label>
                  <select value={formSerie.proveedor_id}
                    onChange={e => setFormSerie(f => ({ ...f, proveedor_id: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_razon_social}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Monto por cuota *</label>
                  <input type="number" value={formSerie.monto_por_cuota}
                    onChange={e => setFormSerie(f => ({ ...f, monto_por_cuota: e.target.value }))}
                    placeholder="5000" className={INPUT} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Total cuotas *</label>
                  <input type="number" min="2" max="120" value={formSerie.total_cuotas}
                    onChange={e => setFormSerie(f => ({ ...f, total_cuotas: e.target.value }))}
                    placeholder="12" className={INPUT} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Frecuencia (días)</label>
                  <input type="number" value={formSerie.frecuencia_dias}
                    onChange={e => setFormSerie(f => ({ ...f, frecuencia_dias: e.target.value }))}
                    className={INPUT} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Fecha primera cuota *</label>
                <input type="date" value={formSerie.fecha_inicio}
                  onChange={e => setFormSerie(f => ({ ...f, fecha_inicio: e.target.value }))}
                  className={INPUT} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Notas</label>
                <textarea value={formSerie.notas}
                  onChange={e => setFormSerie(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
              </div>
              {formSerie.total_cuotas && formSerie.monto_por_cuota && (
                <p className="text-xs text-slate-400 bg-blue-50 px-3 py-2 rounded-lg">
                  Se crearán <strong>{formSerie.total_cuotas}</strong> cuotas de{' '}
                  <strong>{fmt(parseFloat(formSerie.monto_por_cuota) || 0)}</strong> c/u →
                  Total: <strong>{fmt((parseFloat(formSerie.monto_por_cuota) || 0) * (parseInt(formSerie.total_cuotas, 10) || 0))}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalSerie(false)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarSerie} disabled={guardandoSerie}
                className="flex-1 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">
                {guardandoSerie ? 'Generando…' : `Crear ${formSerie.total_cuotas || '?'} cuotas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva categoría ── */}
      {modalCat && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm">Nueva categoría</h3>
              <button onClick={() => setModalCat(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardarCategoria()}
              placeholder="Nombre de la categoría" autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3" />
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs text-slate-500 shrink-0">Color:</label>
              <input type="color" value={nuevaCatColor}
                onChange={e => setNuevaCatColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
              <span className="text-xs font-mono text-slate-500">{nuevaCatColor}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalCat(false)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarCategoria} disabled={!nuevaCat.trim() || guardandoCat}
                className="flex-1 py-2 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium disabled:opacity-50">
                {guardandoCat ? 'Guardando…' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal documentos ── */}
      {modalDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Adjuntar documentos</h3>
              <button onClick={() => setModalDocs(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">{modalDocs.concepto}</p>
            <div className="space-y-3">
              {([
                ['url_factura_pdf', 'URL Factura PDF'],
                ['url_factura_xml', 'URL Factura XML'],
              ] as const).map(([field, lbl]) => (
                <div key={field}>
                  <label className="text-xs text-slate-500">{lbl}</label>
                  <input defaultValue={(modalDocs as any)[field] ?? ''}
                    onBlur={e => editarCuenta(modalDocs.id, { [field]: e.target.value } as any)}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="https://…" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500">URL Comprobante de pago</label>
                <input value={urlComp} onChange={e => setUrlComp(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="https://…" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalDocs(null)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">
                Cerrar
              </button>
              <button onClick={adjuntarDocs}
                className="flex-1 py-2 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium">
                Guardar URLs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasPorPagarTab;
