import { useState } from 'react';
import { CalendarClock, Check, AlertTriangle, Play } from 'lucide-react';
import {
  previewCorte, generarCorte, sumaMxn,
  PreviewCorte, ResultadoCorte,
} from '../../services/comisionesService';

// T-008 · Corte del mes. Selector de periodo → previsualización (a quién y
// cuánto) → generar devengos. R20: si el periodo ya se corrió y no hay nada
// nuevo, se avisa y se deshabilita el botón.

const nombre = (f: { nombre: string; apellido_paterno: string; apellido_materno?: string | null }) =>
  `${f.nombre} ${f.apellido_paterno}${f.apellido_materno ? ' ' + f.apellido_materno : ''}`;

const money = (s: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(s));

export default function CorteMes() {
  const [periodo, setPeriodo] = useState('');
  const [preview, setPreview] = useState<PreviewCorte | null>(null);
  const [resultado, setResultado] = useState<ResultadoCorte | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const cargarPreview = async () => {
    setError(''); setResultado(null); setPreview(null);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      setError('Elige un periodo válido.');
      return;
    }
    setCargando(true);
    try {
      setPreview(await previewCorte(periodo));
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? 'No se pudo previsualizar el corte.');
    } finally {
      setCargando(false);
    }
  };

  const generar = async () => {
    setError(''); setGenerando(true);
    try {
      const r = await generarCorte(periodo);
      setResultado(r);
      setPreview(await previewCorte(periodo)); // refresca (debería quedar en 0)
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? 'No se pudo generar el corte.');
    } finally {
      setGenerando(false);
    }
  };

  const nadaNuevo = preview !== null && preview.total === 0;
  const yaCorrido = nadaNuevo && preview!.ya_tiene_devengos;
  const totalMonto = preview ? sumaMxn(preview.por_generar.map((f) => f.monto_devengado)) : '0.00';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <CalendarClock size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Corte del mes</h1>
          <p className="text-sm text-slate-500">Genera los devengos de comisiones e intereses del periodo.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Periodo</label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => { setPeriodo(e.target.value); setPreview(null); setResultado(null); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>
          <button
            onClick={cargarPreview}
            disabled={cargando || !periodo}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Cargando…' : 'Previsualizar'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {yaCorrido && (
          <p className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertTriangle size={16} /> Este periodo ya se corrió. No hay devengos nuevos por generar.
          </p>
        )}

        {resultado && (
          <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <Check size={16} /> Corte generado: {resultado.total_generados} devengo(s)
            ({resultado.generados_rendimiento} rendimiento, {resultado.generados_comision} comisión).
          </p>
        )}

        {preview && preview.total > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{preview.total} devengo(s) por generar</span>
              <span className="text-sm font-semibold text-slate-800">Total: {money(totalMonto)}</span>
            </div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-3 py-2 font-medium">Persona</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 font-medium text-right">Base</th>
                    <th className="px-3 py-2 font-medium text-right">Tasa</th>
                    <th className="px-3 py-2 font-medium text-right">Devengo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.por_generar.map((f, i) => (
                    <tr key={`${f.concepto}-${f.origen_id}-${i}`} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-2 text-slate-800">{nombre(f)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${f.concepto === 'rendimiento' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {f.concepto}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{money(f.base_capital)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{(Number(f.tasa) * 100).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">{money(f.monto_devengado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                onClick={generar}
                disabled={generando}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Play size={16} /> {generando ? 'Generando…' : 'Generar devengos'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
