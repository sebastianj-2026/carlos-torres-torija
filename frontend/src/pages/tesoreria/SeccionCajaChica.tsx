import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '../../utils/logError';
import {
  Plus, X, ArrowDownLeft, ArrowUpRight, Eye, Upload,
  FileText, ChevronLeft, ChevronRight, Tag, Pencil, Trash2,
} from 'lucide-react';
import {
  MovimientoCaja, CategoriaMovimiento, ResumenCaja,
  FormMovimientoData, TipoMovimiento,
} from '../../types/tesoreria.types';
import {
  obtenerResumenCaja, listarMovimientos, crearMovimiento, editarMovimiento, eliminarMovimiento,
  listarCategorias, crearCategoria, fetchVoucherMovimiento,
  listarUsuariosActivos, UsuarioSimple,
} from '../../services/tesoreriaService';
import { useAuth } from '../../context/AuthContext';

const fmt = (v: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof v === 'string' ? parseFloat(v) : v
  );

const fmtFecha = (iso: string) =>
  new Date(iso.substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const inputCls = `w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white
  text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2
  focus:ring-orange-400 focus:border-transparent transition-all`;

const DATOS_VACIOS: FormMovimientoData = {
  tipo: 'salida', concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0],
  encargado: '', categoria_id: '', notas: '',
};

const SeccionCajaChica: React.FC = () => {
  const { usuario } = useAuth();

  const [resumen, setResumen]           = useState<ResumenCaja | null>(null);
  const [paginacion, setPaginacion]     = useState({ movimientos: [] as MovimientoCaja[], total: 0, pagina: 1, totalPaginas: 1 });
  const [categorias, setCategorias]     = useState<CategoriaMovimiento[]>([]);
  const [cargando, setCargando]         = useState(true);
  const [usuarios, setUsuarios]         = useState<UsuarioSimple[]>([]);

  const [filtroTipo, setFiltroTipo]     = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroDesde, setFiltroDesde]   = useState('');
  const [filtroHasta, setFiltroHasta]   = useState('');
  const [pagina, setPagina]             = useState(1);

  const [modalAbierto, setModal]        = useState(false);
  const [editando, setEditando]         = useState<MovimientoCaja | null>(null);
  const [form, setForm]                 = useState<FormMovimientoData>(DATOS_VACIOS);
  const [voucher, setVoucher]           = useState<File | null>(null);
  const [guardando, setGuardando]       = useState(false);
  const [eliminando, setEliminando]     = useState<string | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<{ id: string; concepto: string; monto: string } | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // Categoría al vuelo
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [creandoCat, setCreandoCat]     = useState(false);
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false);

  const voucherRef = useRef<HTMLInputElement>(null);

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [res, movs, cats] = await Promise.all([
        obtenerResumenCaja(),
        listarMovimientos({
          tipo: filtroTipo || undefined,
          categoria_id: filtroCategoria || undefined,
          desde: filtroDesde || undefined,
          hasta: filtroHasta || undefined,
          pagina, limite: 15,
        }),
        listarCategorias(),
      ]);
      setResumen(res);
      setPaginacion(movs);
      setCategorias(cats);
    } finally {
      setCargando(false);
    }
  }, [filtroTipo, filtroCategoria, filtroDesde, filtroHasta, pagina]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  useEffect(() => {
    listarUsuariosActivos().then(setUsuarios).catch(logError);
  }, []);

  const abrirModal = () => {
    setEditando(null);
    setForm({ ...DATOS_VACIOS, encargado: usuario?.nombre ?? '' });
    setVoucher(null);
    setError(null);
    setMostrarNuevaCat(false);
    setNuevaCategoria('');
    setModal(true);
  };

  const abrirEditar = (m: MovimientoCaja) => {
    setEditando(m);
    setForm({
      tipo: m.tipo,
      concepto: m.concepto,
      monto: m.monto,
      fecha: m.fecha.slice(0, 10),
      encargado: m.encargado,
      categoria_id: m.categoria_id ?? '',
      notas: m.notas ?? '',
    });
    setVoucher(null);
    setError(null);
    setMostrarNuevaCat(false);
    setNuevaCategoria('');
    setModal(true);
  };

  const cerrar = () => { setModal(false); setEditando(null); setError(null); };

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setCreandoCat(true);
    try {
      const { categoria } = await crearCategoria(nuevaCategoria.trim(), 'ambos');
      setCategorias((prev) => [...prev, categoria].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm((p) => ({ ...p, categoria_id: categoria.id }));
      setNuevaCategoria('');
      setMostrarNuevaCat(false);
    } catch { /* silencioso */ } finally {
      setCreandoCat(false);
    }
  };

  const handleGuardar = async () => {
    if (!form.concepto.trim()) { setError('El concepto es obligatorio.'); return; }
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!form.encargado.trim()) { setError('El encargado es obligatorio.'); return; }

    setGuardando(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('tipo',      form.tipo);
      fd.append('concepto',  form.concepto.trim());
      fd.append('monto',     String(monto));
      fd.append('fecha',     form.fecha);
      fd.append('encargado', form.encargado.trim());
      fd.append('categoria_id', form.categoria_id);
      if (form.notas.trim()) fd.append('notas', form.notas.trim());
      if (voucher) fd.append('voucher', voucher);

      if (editando) {
        await editarMovimiento(editando.id, fd);
      } else {
        await crearMovimiento(fd);
      }
      await cargarTodo();
      cerrar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { mensaje?: string } } };
      setError(e?.response?.data?.mensaje ?? 'Error al guardar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (m: MovimientoCaja) => {
    setConfirmEliminar({ id: m.id, concepto: m.concepto, monto: m.monto });
  };

  const confirmarEliminar = async () => {
    if (!confirmEliminar) return;
    const { id } = confirmEliminar;
    setConfirmEliminar(null);
    setEliminando(id);
    try {
      await eliminarMovimiento(id);
      await cargarTodo();
    } catch { /* silencioso */ } finally {
      setEliminando(null);
    }
  };

  const verVoucher = async (id: string) => {
    try {
      const url = await fetchVoucherMovimiento(id);
      window.open(url, '_blank');
    } catch { /* silencioso */ }
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumen */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Saldo de caja',  value: resumen.saldo_actual,   color: resumen.saldo_actual >= 0 ? 'text-green-600' : 'text-red-600', bg: 'bg-green-50 border-green-100' },
            { label: 'Entradas totales', value: resumen.total_entradas, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: 'Salidas totales',  value: resumen.total_salidas,  color: 'text-red-600',  bg: 'bg-red-50 border-red-100' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
              {label === 'Saldo de caja' && (
                <p className="text-xs text-slate-400 mt-1">{resumen.movimientos_mes} movimiento(s) este mes</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">Todos los tipos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
          <select value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input type="date" value={filtroDesde} onChange={(e) => { setFiltroDesde(e.target.value); setPagina(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="date" value={filtroHasta} onChange={(e) => { setFiltroHasta(e.target.value); setPagina(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <button onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600
                     text-white text-sm font-medium rounded-xl shadow-sm transition-colors">
          <Plus size={15} />
          Nuevo movimiento
        </button>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando movimientos...</div>
        ) : paginacion.movimientos.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">Sin movimientos registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Encargado', 'Monto', '', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginacion.movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {m.tipo === 'entrada'
                          ? <ArrowDownLeft size={11} />
                          : <ArrowUpRight size={11} />}
                        {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{m.concepto}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {m.categoria_nombre ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap truncate max-w-[120px]">{m.encargado}</td>
                    <td className={`px-4 py-3 font-bold whitespace-nowrap ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'}{fmt(m.monto)}
                    </td>
                    <td className="px-4 py-3">
                      {m.voucher_nombre && (
                        <button onClick={() => verVoucher(m.id)}
                          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1
                                     text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                          <Eye size={11} /> Ver
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEditar(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleEliminar(m)}
                          disabled={eliminando === m.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {paginacion.totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <p className="text-slate-500 text-xs">{paginacion.total} movimientos</p>
            <div className="flex gap-1">
              <button onClick={() => setPagina((p) => p - 1)} disabled={pagina === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPagina((p) => p + 1)} disabled={pagina === paginacion.totalPaginas}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmar eliminación */}
      {confirmEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirmEliminar(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Eliminar movimiento</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 space-y-0.5">
              <p className="text-sm font-medium text-slate-700 truncate">{confirmEliminar.concepto}</p>
              <p className="text-xs text-slate-500">{fmt(parseFloat(confirmEliminar.monto))}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmEliminar(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600
                           hover:bg-slate-50 transition-colors font-medium">
                Cancelar
              </button>
              <button onClick={confirmarEliminar}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl
                           text-sm font-semibold transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo movimiento */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800">
                {editando ? 'Editar movimiento' : 'Nuevo movimiento de caja'}
              </h3>
              <button onClick={cerrar} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['entrada', 'salida'] as TipoMovimiento[]).map((t) => (
                    <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, tipo: t }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.tipo === t
                          ? t === 'entrada'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {t === 'entrada' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      {t === 'entrada' ? 'Entrada' : 'Salida'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Concepto *</label>
                <input type="text" value={form.concepto}
                  onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
                  placeholder="Descripción del movimiento"
                  className={inputCls} />
              </div>

              {/* Monto y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monto (MXN) *</label>
                  <input type="number" min="0" step="0.01" value={form.monto}
                    onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
                    placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
                  <input type="date" value={form.fecha}
                    onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>

              {/* Encargado */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Encargado *</label>
                <select
                  value={form.encargado}
                  onChange={(e) => setForm((p) => ({ ...p, encargado: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar encargado...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Categoría con "Agregar nueva" al vuelo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Categoría</label>
                  <button type="button" onClick={() => setMostrarNuevaCat((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700">
                    <Tag size={10} />
                    Agregar nueva categoría
                  </button>
                </div>

                {mostrarNuevaCat && (
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={nuevaCategoria}
                      onChange={(e) => setNuevaCategoria(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCrearCategoria(); }}
                      placeholder="Nombre de la categoría"
                      className={`${inputCls} flex-1`} />
                    <button onClick={handleCrearCategoria} disabled={creandoCat || !nuevaCategoria.trim()}
                      className="px-3 py-2 bg-orange-500 text-white text-xs font-medium rounded-lg
                                 hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {creandoCat ? '...' : 'Crear'}
                    </button>
                  </div>
                )}

                <select value={form.categoria_id}
                  onChange={(e) => setForm((p) => ({ ...p, categoria_id: e.target.value }))}
                  className={inputCls}>
                  <option value="">— Sin categoría —</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Voucher */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Comprobante / Voucher <span className="text-slate-400 font-normal">(imagen o PDF, opcional)</span>
                </label>
                {editando?.voucher_nombre && !voucher && (
                  <p className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1">
                    <FileText size={11} className="text-blue-400" />
                    Actual: <span className="font-medium text-slate-700">{editando.voucher_nombre}</span>
                    <span className="text-slate-400">— sube uno nuevo para reemplazarlo</span>
                  </p>
                )}
                <div
                  onClick={() => voucherRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-xl p-3 transition-all
                    hover:border-orange-300 hover:bg-orange-50/20 ${voucher ? 'border-green-300 bg-green-50/30' : 'border-slate-200 bg-white'}`}>
                  <input ref={voucherRef} type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 10 * 1024 * 1024) { alert('El archivo supera 10 MB.'); return; }
                      setVoucher(f ?? null);
                    }} />
                  {voucher ? (
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-green-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-green-700 truncate">{voucher.name}</p>
                        <p className="text-[10px] text-slate-400">{fmtBytes(voucher.size)}</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setVoucher(null); }}
                        className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload size={15} className="text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-500">Clic para seleccionar • Máx. 10 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                <textarea value={form.notas}
                  onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                  rows={2} placeholder="Observaciones opcionales..."
                  className={`${inputCls} resize-none`} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-slate-100">
              <button onClick={cerrar}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={guardando}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium
                           rounded-xl transition-colors disabled:opacity-60">
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar movimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeccionCajaChica;
