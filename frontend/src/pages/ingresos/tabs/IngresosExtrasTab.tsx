import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Paperclip } from 'lucide-react';
import { logError } from '../../../utils/logError';
import { IngresoDirecto, MetodoPago } from '../../../types/ingresos.types';
import { crearIngresoDirecto, listarIngresosDirectos } from '../../../services/ingresosService';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n));

const METODOS: MetodoPago[] = ['efectivo', 'transferencia', 'tarjeta'];
const hoy = new Date().toISOString().split('T')[0];

interface FormData {
  persona_nombre: string;
  notas_explicativas: string;
  monto_ingresado: string;
  semana_corte: string;
  metodo_pago: MetodoPago;
  cuenta_destino: string;
  url_comprobante: string;
}

const emptyForm = (): FormData => ({
  persona_nombre: '',
  notas_explicativas: '',
  monto_ingresado: '',
  semana_corte: hoy,
  metodo_pago: 'efectivo',
  cuenta_destino: '',
  url_comprobante: '',
});

const IngresosExtrasTab: React.FC = () => {
  const [form, setForm]   = useState<FormData>(emptyForm());
  const [guardando, setG] = useState(false);
  const [err, setErr]     = useState('');
  const [ok, setOk]       = useState('');
  const [registros, setRegistros] = useState<IngresoDirecto[]>([]);
  const [loading, setLoading] = useState(true);

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const cargar = useCallback(() => {
    setLoading(true);
    listarIngresosDirectos({ unidad_negocio: 'ingreso_atipico' })
      .then(setRegistros).catch(logError).finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!form.monto_ingresado || !form.semana_corte || !form.cuenta_destino || !form.notas_explicativas) {
      setErr('Monto, semana, cuenta destino y descripción del movimiento son obligatorios.'); return;
    }
    setG(true); setErr(''); setOk('');
    try {
      await crearIngresoDirecto({
        unidad_negocio:     'ingreso_atipico',
        monto_ingresado:    form.monto_ingresado,
        semana_corte:       form.semana_corte,
        metodo_pago:        form.metodo_pago,
        cuenta_destino:     form.cuenta_destino,
        persona_nombre:     form.persona_nombre || null,
        notas_explicativas: form.notas_explicativas,
        url_comprobante:    form.url_comprobante || null,
      });
      setOk('Ingreso extraordinario registrado.');
      setForm(emptyForm());
      cargar();
    } catch { setErr('Error al guardar. Revisa los datos.'); }
    finally { setG(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Zap size={16} /> Registrar Ingreso Extraordinario
        </h3>
        {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        {ok  && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{ok}</p>}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descripción del movimiento *</label>
            <input value={form.notas_explicativas} onChange={e => set('notas_explicativas', e.target.value)}
              placeholder="Ej. Venta de activo, reembolso proveedor…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Persona (opcional)</label>
            <input value={form.persona_nombre} onChange={e => set('persona_nombre', e.target.value)}
              placeholder="Nombre de quien realiza el pago"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monto *</label>
              <input type="number" value={form.monto_ingresado} onChange={e => set('monto_ingresado', e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha *</label>
              <input type="date" value={form.semana_corte} onChange={e => set('semana_corte', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Método de pago *</label>
              <select value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value as MetodoPago)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {METODOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cuenta destino *</label>
              <input value={form.cuenta_destino} onChange={e => set('cuenta_destino', e.target.value)}
                placeholder="Ej. Caja, BBVA ****1234"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>

          {/* URL comprobante — preparado para S3 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Paperclip size={11} /> URL Comprobante (preparado para S3)
            </label>
            <input value={form.url_comprobante} onChange={e => set('url_comprobante', e.target.value)}
              placeholder="https://s3.amazonaws.com/bucket/archivo.pdf"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            <p className="text-[11px] text-slate-400 mt-1">
              Sube el archivo a S3 / Storage y pega la URL aquí.
            </p>
          </div>

          <button onClick={guardar} disabled={guardando}
            className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Registrar Ingreso Extraordinario'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Historial extraordinarios</h3>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Sin ingresos extraordinarios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-left">Persona</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-center">Comp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.slice(0, 20).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={r.notas_explicativas ?? ''}>
                      {r.notas_explicativas ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.persona_nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(r.monto_ingresado)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.semana_corte}</td>
                    <td className="px-4 py-3 text-center">
                      {r.url_comprobante ? (
                        <a href={r.url_comprobante} target="_blank" rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800">
                          <Paperclip size={14} />
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngresosExtrasTab;
