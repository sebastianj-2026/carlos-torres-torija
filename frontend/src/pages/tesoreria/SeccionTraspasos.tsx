import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowRightLeft, X, ExternalLink } from 'lucide-react';
import { Traspaso, FormTraspasoData, CuentaBancaria } from '../../types/tesoreria.types';
import {
  listarTraspasos, crearTraspaso, listarCuentas, fetchVoucherTraspaso,
} from '../../services/tesoreriaService';

const fmt = (v: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof v === 'string' ? parseFloat(v) : v
  );

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const inputCls = `w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white
  text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2
  focus:ring-orange-400 focus:border-transparent transition-all`;

const DATOS_VACIOS: FormTraspasoData = {
  cuenta_origen_id: '',
  cuenta_destino_id: '',
  monto: '',
  concepto: '',
  fecha: new Date().toISOString().slice(0, 10),
};

const CAJA_VALUE = '__caja__';

const SeccionTraspasos: React.FC = () => {
  const [traspasos, setTraspasos]     = useState<Traspaso[]>([]);
  const [cuentas, setCuentas]         = useState<CuentaBancaria[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [total, setTotal]             = useState(0);
  const [pagina, setPagina]           = useState(1);
  const LIMITE = 15;

  const [modalAbierto, setModal]      = useState(false);
  const [form, setForm]               = useState<FormTraspasoData>(DATOS_VACIOS);
  const [voucher, setVoucher]         = useState<File | null>(null);
  const [guardando, setGuardando]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const cargar = useCallback(async (pag = pagina) => {
    setCargando(true);
    try {
      const res = await listarTraspasos({ pagina: pag, limite: LIMITE });
      setTraspasos(res.traspasos);
      setTotal(res.total);
    } finally {
      setCargando(false);
    }
  }, [pagina]);

  const cargarCuentas = useCallback(async () => {
    setCuentas(await listarCuentas());
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarCuentas(); }, [cargarCuentas]);

  const abrirModal = () => {
    setForm(DATOS_VACIOS);
    setVoucher(null);
    setError(null);
    setModal(true);
  };

  const cerrar = () => { setModal(false); setError(null); };

  const handleGuardar = async () => {
    if (!form.cuenta_origen_id || !form.cuenta_destino_id) {
      setError('Selecciona origen y destino.'); return;
    }
    if (form.cuenta_origen_id === form.cuenta_destino_id) {
      setError('El origen y el destino no pueden ser iguales.'); return;
    }
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0) { setError('Monto inválido.'); return; }
    if (!form.fecha) { setError('La fecha es obligatoria.'); return; }

    setGuardando(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('cuenta_origen_id',  form.cuenta_origen_id  === CAJA_VALUE ? '' : form.cuenta_origen_id);
      fd.append('cuenta_destino_id', form.cuenta_destino_id === CAJA_VALUE ? '' : form.cuenta_destino_id);
      fd.append('monto',   String(monto));
      fd.append('concepto', form.concepto.trim());
      fd.append('fecha',    form.fecha);
      if (voucher) fd.append('voucher', voucher);

      await crearTraspaso(fd);
      await cargar(1);
      setPagina(1);
      cerrar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { mensaje?: string } } };
      setError(e?.response?.data?.mensaje ?? 'Error al registrar el traspaso.');
    } finally {
      setGuardando(false);
    }
  };

  const verVoucher = async (id: string) => {
    const url = await fetchVoucherTraspaso(id);
    window.open(url, '_blank');
  };

  const totalPaginas = Math.ceil(total / LIMITE);

  const opcionesCuentas = [
    { value: CAJA_VALUE, label: 'Caja Chica' },
    ...cuentas.map((c) => ({ value: c.id, label: `${c.alias} — ${c.banco}` })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <p className="text-sm text-slate-500">
          {total} traspaso{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
        </p>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600
                     text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          <Plus size={15} />
          Nuevo traspaso
        </button>
      </div>

      {/* Table */}
      {cargando ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : traspasos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <ArrowRightLeft size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Sin traspasos registrados.</p>
          <button onClick={abrirModal} className="mt-3 text-orange-500 text-sm font-medium hover:underline">
            Registrar primer traspaso
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Origen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Destino</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Concepto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Monto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {traspasos.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtFecha(t.fecha)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {t.cuenta_origen_alias ?? 'Caja Chica'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {t.cuenta_destino_alias ?? 'Caja Chica'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                    {t.concepto ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-600 whitespace-nowrap">
                    {fmt(t.monto)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.voucher_nombre && (
                      <button
                        onClick={() => verVoucher(t.id)}
                        className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
                        title="Ver comprobante"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Página {pagina} de {totalPaginas} · {total} registros
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => { setPagina((p) => p - 1); cargar(pagina - 1); }}
                  disabled={pagina <= 1}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => { setPagina((p) => p + 1); cargar(pagina + 1); }}
                  disabled={pagina >= totalPaginas}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800">Nuevo traspaso</h3>
              <button onClick={cerrar} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Origen */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Origen <span className="text-orange-500">*</span>
                </label>
                <select
                  value={form.cuenta_origen_id}
                  onChange={(e) => setForm((p) => ({ ...p, cuenta_origen_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar origen...</option>
                  {opcionesCuentas.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Destino <span className="text-orange-500">*</span>
                </label>
                <select
                  value={form.cuenta_destino_id}
                  onChange={(e) => setForm((p) => ({ ...p, cuenta_destino_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar destino...</option>
                  {opcionesCuentas.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Monto (MXN) <span className="text-orange-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fecha <span className="text-orange-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Concepto</label>
                <input
                  type="text"
                  value={form.concepto}
                  onChange={(e) => setForm((p) => ({ ...p, concepto: e.target.value }))}
                  placeholder="Motivo del traspaso..."
                  className={inputCls}
                />
              </div>

              {/* Voucher */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Comprobante (imagen o PDF, máx. 10 MB)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setVoucher(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border-0 file:text-xs file:font-medium
                    file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                />
                {voucher && (
                  <p className="text-[11px] text-slate-400 mt-1 truncate">{voucher.name}</p>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={cerrar}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium
                           rounded-xl transition-colors disabled:opacity-60"
              >
                {guardando ? 'Registrando...' : 'Registrar traspaso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeccionTraspasos;
