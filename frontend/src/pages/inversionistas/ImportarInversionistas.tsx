import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Pencil } from 'lucide-react';
import apiClient from '../../services/authService';

// ── Tipos ─────────────────────────────────────────────────────────
interface FilaParsed {
  nombres: string;
  apellido_paterno: string;
  capital: number;
  pago_mensual: number;
  tasa: number;
  dia_pago: number | null;
  fecha_inicio: string;
  raw: string;
}

type ResultadoImport = { ok: boolean; nombre: string; error?: string };

// ── Helpers ───────────────────────────────────────────────────────
const MESES: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
};

function parsearFecha(raw: string): { dia_pago: number | null; fecha_inicio: string } {
  const s = raw.trim().toLowerCase();
  if (!s) return { dia_pago: null, fecha_inicio: new Date().toISOString().split('T')[0] };
  const partes = s.split('-');
  if (partes.length < 3) return { dia_pago: null, fecha_inicio: new Date().toISOString().split('T')[0] };
  const dia   = parseInt(partes[0], 10);
  const mes   = MESES[partes[1]] ?? '01';
  const anio  = parseInt(partes[2], 10) + 2000;
  return {
    dia_pago:    isNaN(dia) ? null : dia,
    fecha_inicio: `${anio}-${mes}-${String(dia).padStart(2, '0')}`,
  };
}

function parsearNombre(nombre: string): { nombres: string; apellido_paterno: string } {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return { nombres: partes[0], apellido_paterno: '' };
  const apellido_paterno = partes[partes.length - 1];
  const nombres = partes.slice(0, -1).join(' ');
  return { nombres, apellido_paterno };
}

function parsearTexto(texto: string): FilaParsed[] {
  const lineas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lineas.length === 0) return [];

  // Skip header row if it starts with a letter and no numbers
  const inicio = /^\d/.test(lineas[0]) || /^\$/.test(lineas[0]) ? 0 : 1;

  return lineas.slice(inicio)
    .map(linea => {
      const cols = linea.split('\t').map(c => c.trim());
      if (cols.length < 2) return null;

      const nombreRaw   = cols[0] ?? '';
      const capitalRaw  = cols[1] ?? '';
      const pagoRaw     = cols[2] ?? '';
      const fechaRaw    = cols[3] ?? '';

      const capital     = parseFloat(capitalRaw.replace(/[$,\s]/g, '')) || 0;
      const pago_mensual = parseFloat(pagoRaw.replace(/[$,\s]/g, '')) || 0;
      const tasa        = capital > 0 ? Math.round((pago_mensual / capital) * 10000) / 100 : 0;
      const { nombres, apellido_paterno } = parsearNombre(nombreRaw);
      const { dia_pago, fecha_inicio }    = parsearFecha(fechaRaw);

      if (!nombres || capital <= 0) return null;
      return { nombres, apellido_paterno, capital, pago_mensual, tasa, dia_pago, fecha_inicio, raw: linea };
    })
    .filter((f): f is FilaParsed => f !== null);
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

// ── Componente ────────────────────────────────────────────────────
const ImportarInversionistas: React.FC = () => {
  const navigate = useNavigate();

  const [texto, setTexto]           = useState('');
  const [filas, setFilas]           = useState<FilaParsed[]>([]);
  const [editando, setEditando]     = useState<number | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoImport[] | null>(null);

  const parsear = () => {
    const parsed = parsearTexto(texto);
    setFilas(parsed);
    setResultados(null);
    setEditando(null);
  };

  const actualizarFila = (idx: number, campo: keyof FilaParsed, valor: string | number | null) => {
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));
  };

  const importar = async () => {
    if (!filas.length) return;
    setImportando(true);
    try {
      const res = await apiClient.post('/inversionistas/importar', {
        filas: filas.map(f => ({
          nombres:          f.nombres,
          apellido_paterno: f.apellido_paterno,
          capital:          f.capital,
          tasa:             f.tasa,
          dia_pago:         f.dia_pago,
          fecha_inicio:     f.fecha_inicio,
        })),
      });
      setResultados(res.data.resultados);
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { resultados?: ResultadoImport[] } } }).response?.data;
      if (data?.resultados) setResultados(data.resultados);
      else setResultados([{ ok: false, nombre: 'Error general', error: String(e) }]);
    } finally {
      setImportando(false);
    }
  };

  const exitosos = resultados?.filter(r => r.ok).length ?? 0;
  const fallidos = resultados?.filter(r => !r.ok).length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/inversionistas')} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Importar Inversionistas</h2>
          <p className="text-sm text-slate-500">Pega tu tabla de Excel para cargar masivamente</p>
        </div>
      </div>

      {/* Paso 1: pegar */}
      {!resultados && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <p className="text-xs text-slate-400">
            Copia las filas de tu Excel (sin encabezado o con él) y pégalas aquí.<br />
            Columnas esperadas: <span className="font-mono">DEUDOR · CAPITAL · PAGO MENSUAL · FECHA</span>
          </p>
          <textarea
            value={texto}
            onChange={e => { setTexto(e.target.value); setFilas([]); }}
            placeholder={`FABIO TORRESINI\t1010000\t12650\t2-ene-26\nJOSE VERDUZCO\t4000000\t40000\t9-ene-26`}
            rows={10}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-700
                       placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
          <button
            onClick={parsear}
            disabled={!texto.trim()}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40
                       text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Previsualizar ({parsearTexto(texto).length} filas detectadas)
          </button>
        </div>
      )}

      {/* Paso 2: previsualización y edición */}
      {filas.length > 0 && !resultados && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{filas.length} inversionistas listos para importar</p>
              <p className="text-xs text-slate-400">Haz clic en <Pencil size={11} className="inline" /> para corregir nombres</p>
            </div>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm">Nombres</th>
                    <th className="px-4 py-3 text-left text-xs sm:text-sm">Apellido paterno</th>
                    <th className="px-4 py-3 text-right text-xs sm:text-sm">Capital</th>
                    <th className="px-4 py-3 text-right text-xs sm:text-sm">Pago mens.</th>
                    <th className="px-4 py-3 text-right text-xs sm:text-sm">Tasa</th>
                    <th className="px-4 py-3 text-center text-xs sm:text-sm">Día pago</th>
                    <th className="px-4 py-3 text-center w-8 text-xs sm:text-sm" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((f, i) => (
                    <tr key={i} className={`hover:bg-slate-50 ${editando === i ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-2 text-xs sm:text-sm">
                        {editando === i
                          ? <input
                              autoFocus
                              value={f.nombres}
                              onChange={e => actualizarFila(i, 'nombres', e.target.value)}
                              className="w-full border border-orange-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                            />
                          : <span className="font-medium text-slate-800">{f.nombres}</span>
                        }
                      </td>
                      <td className="px-4 py-2 text-xs sm:text-sm">
                        {editando === i
                          ? <input
                              value={f.apellido_paterno}
                              onChange={e => actualizarFila(i, 'apellido_paterno', e.target.value)}
                              className="w-full border border-orange-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
                            />
                          : <span className="text-slate-700">{f.apellido_paterno}</span>
                        }
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-800 text-xs sm:text-sm">{fmt(f.capital)}</td>
                      <td className="px-4 py-2 text-right text-slate-500 text-xs sm:text-sm">{fmt(f.pago_mensual)}</td>
                      <td className="px-4 py-2 text-right text-xs sm:text-sm">
                        {f.tasa > 0
                          ? <span className="font-semibold text-orange-600">{f.tasa.toFixed(2)}%</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-2 text-center text-xs sm:text-sm">
                        {f.dia_pago
                          ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                              {f.dia_pago}
                            </span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-2 text-center text-xs sm:text-sm">
                        <button
                          onClick={() => setEditando(editando === i ? null : i)}
                          className="p-1 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          {editando === i ? <CheckCircle size={14} className="text-green-500" /> : <Pencil size={13} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {fmt(filas.reduce((s, f) => s + f.capital, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">
                      {fmt(filas.reduce((s, f) => s + f.pago_mensual, 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setFilas([]); setTexto(''); }}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
            >
              Volver a pegar
            </button>
            <button
              onClick={importar}
              disabled={importando}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                         text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {importando ? 'Importando…' : `Importar ${filas.length} inversionistas`}
            </button>
          </div>
        </>
      )}

      {/* Paso 3: resultado */}
      {resultados && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <CheckCircle size={24} className="text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-700">{exitosos}</p>
                <p className="text-xs text-emerald-600">importados correctamente</p>
              </div>
            </div>
            <div className={`${fallidos > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'} border rounded-2xl px-5 py-4 flex items-center gap-3`}>
              <XCircle size={24} className={fallidos > 0 ? 'text-red-500' : 'text-slate-300'} />
              <div>
                <p className={`text-2xl font-bold ${fallidos > 0 ? 'text-red-700' : 'text-slate-400'}`}>{fallidos}</p>
                <p className="text-xs text-slate-500">con error</p>
              </div>
            </div>
          </div>

          {fallidos > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 space-y-2">
              <p className="text-sm font-semibold text-red-700">Errores</p>
              {resultados.filter(r => !r.ok).map((r, i) => (
                <div key={i} className="text-xs text-red-600 font-mono bg-red-50 rounded-lg px-3 py-2">
                  {r.nombre}: {r.error}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {fallidos > 0 && (
              <button
                onClick={() => setResultados(null)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Corregir y reintentar
              </button>
            )}
            <button
              onClick={() => navigate('/inversionistas')}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Ver inversionistas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarInversionistas;
