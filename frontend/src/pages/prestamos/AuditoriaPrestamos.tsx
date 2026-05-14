import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, RefreshCw, Upload, CheckCircle, AlertTriangle, XCircle, Info, ChevronDown, ChevronRight, ClipboardPaste } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// ── Types ─────────────────────────────────────────────────────────
interface RegistroSistema {
  id: string;
  folio: string;
  cliente_nombre: string;
  capital_original: number;
  saldo_actual: number;
  tasa: number;
  estatus: string;
  fecha_inicio: string;
}

interface FilaExcel {
  cliente: string;
  dinero: number;
  interes: number;
}

interface ClienteSistema {
  nombre: string;
  prestamos: RegistroSistema[];
  total: number;
}

interface ClienteExcel {
  nombre: string;
  prestamos: FilaExcel[];
  total: number;
}

type TipoResultado = 'match' | 'diferencia' | 'solo_sistema' | 'solo_excel';

interface ResultadoCliente {
  tipo: TipoResultado;
  nombre: string;
  sistema?: ClienteSistema;
  excel?: ClienteExcel;
  delta: number;
}

// ── Helpers ───────────────────────────────────────────────────────
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const TOLERANCIA = 1;

const TIPO_CFG = {
  match:        { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle  size={12} />, label: 'OK'            },
  diferencia:   { bg: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <AlertTriangle size={12} />, label: 'Diferencia'   },
  solo_sistema: { bg: 'bg-blue-50 text-blue-700 border-blue-200',          icon: <Info         size={12} />, label: 'Solo sistema'  },
  solo_excel:   { bg: 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle      size={12} />, label: 'Solo Excel'    },
};

const ESTATUS_COLOR: Record<string, string> = {
  activo:                 'bg-green-100 text-green-700',
  atrasado:               'bg-yellow-100 text-yellow-700',
  en_juicio:              'bg-red-100 text-red-700',
  documentos_incompletos: 'bg-slate-100 text-slate-500',
};

function agruparSistema(rows: RegistroSistema[]): Map<string, ClienteSistema> {
  const map = new Map<string, ClienteSistema>();
  for (const r of rows) {
    const key = norm(r.cliente_nombre);
    const prev = map.get(key);
    if (prev) {
      prev.prestamos.push(r);
      prev.total += r.capital_original;
    } else {
      map.set(key, { nombre: r.cliente_nombre, prestamos: [r], total: r.capital_original });
    }
  }
  return map;
}

function agruparExcel(rows: FilaExcel[]): Map<string, ClienteExcel> {
  const map = new Map<string, ClienteExcel>();
  for (const r of rows) {
    const key = norm(r.cliente);
    const prev = map.get(key);
    if (prev) {
      prev.prestamos.push(r);
      prev.total += r.dinero;
    } else {
      map.set(key, { nombre: r.cliente, prestamos: [r], total: r.dinero });
    }
  }
  return map;
}

function comparar(sistemaMap: Map<string, ClienteSistema>, excelMap: Map<string, ClienteExcel>): ResultadoCliente[] {
  const resultados: ResultadoCliente[] = [];
  const usados = new Set<string>();

  for (const [key, s] of Array.from(sistemaMap.entries())) {
    const e = excelMap.get(key);
    if (e) {
      usados.add(key);
      const delta = s.total - e.total;
      resultados.push({ tipo: Math.abs(delta) <= TOLERANCIA ? 'match' : 'diferencia', nombre: s.nombre, sistema: s, excel: e, delta });
    } else {
      resultados.push({ tipo: 'solo_sistema', nombre: s.nombre, sistema: s, excel: undefined, delta: s.total });
    }
  }
  for (const [key, e] of Array.from(excelMap.entries())) {
    if (!usados.has(key)) {
      resultados.push({ tipo: 'solo_excel', nombre: e.nombre, sistema: undefined, excel: e, delta: -e.total });
    }
  }

  const ord: Record<TipoResultado, number> = { diferencia: 0, solo_excel: 1, solo_sistema: 2, match: 3 };
  return resultados.sort((a, b) => ord[a.tipo] - ord[b.tipo]);
}

// ── Parser de texto pegado (TSV / copiado de Excel) ───────────────
function parsearTexto(texto: string): FilaExcel[] {
  const lineas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lineas.length < 2) return [];

  // Detect separator: tab or comma
  const sep = lineas[0].includes('\t') ? '\t' : ',';
  const headers = lineas[0].split(sep).map(h => h.trim().toLowerCase());

  const iCliente = headers.findIndex(h => /deudor|cliente|nombre|name/i.test(h));
  const iDinero  = headers.findIndex(h => /capital|dinero|monto|saldo|importe/i.test(h));
  const iInteres = headers.findIndex(h => /inter|tasa|rate/i.test(h));

  // fallback to positional if headers not found
  const ci = iCliente >= 0 ? iCliente : 0;
  const di = iDinero  >= 0 ? iDinero  : 1;
  const ii = iInteres >= 0 ? iInteres : 2;

  return lineas.slice(1)
    .map(l => {
      const cols = l.split(sep);
      const cliente = (cols[ci] ?? '').trim();
      const dinero  = parseFloat((cols[di] ?? '').replace(/[$,\s]/g, '')) || 0;
      const interes = parseFloat((cols[ii] ?? '').replace(/[$,%\s]/g, '')) || 0;
      return { cliente, dinero, interes };
    })
    .filter(r => r.cliente && r.dinero > 0);
}

// ── Componente ────────────────────────────────────────────────────
const AuditoriaPrestamos: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [sistemaRows, setSistemaRows]   = useState<RegistroSistema[] | null>(null);
  const [excelRows, setExcelRows]       = useState<FilaExcel[] | null>(null);
  const [resultados, setResultados]     = useState<ResultadoCliente[] | null>(null);
  const [cargando, setCargando]         = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [abiertos, setAbiertos]         = useState<Set<string>>(new Set());
  const [filtro, setFiltro]             = useState<TipoResultado | 'todos'>('todos');
  const [modoEntrada, setModoEntrada]   = useState<'archivo' | 'pegar'>('pegar');
  const [textoPegado, setTextoPegado]   = useState('');

  const cargarSistema = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/prestamos/auditoria`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: RegistroSistema[] = await res.json();
      const parsed = data.map(r => ({
        ...r,
        capital_original: parseFloat(r.capital_original as unknown as string),
        saldo_actual:     parseFloat(r.saldo_actual      as unknown as string),
        tasa:             parseFloat(r.tasa              as unknown as string),
      }));
      setSistemaRows(parsed);
      return parsed;
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarSistema(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = (file: File) => {
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb   = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      if (rows.length === 0) return;

      // Auto-detect columns (case-insensitive)
      const cols = Object.keys(rows[0]);
      const colCliente = cols.find(c => /cliente|nombre|name|deudor/i.test(c)) ?? cols[0];
      const colDinero  = cols.find(c => /dinero|capital|monto|saldo|importe|amount/i.test(c)) ?? cols[1];
      const colInteres = cols.find(c => /inter[eé]s|interes|tasa|rate/i.test(c)) ?? cols[2];

      const parsed: FilaExcel[] = rows
        .map(r => ({
          cliente: String(r[colCliente] ?? '').trim(),
          dinero:  parseFloat(String(r[colDinero]  ?? '').replace(/[$,\s]/g, '')) || 0,
          interes: parseFloat(String(r[colInteres] ?? '').replace(/[$,%\s]/g, '')) || 0,
        }))
        .filter(r => r.cliente && r.dinero > 0);

      setExcelRows(parsed);
      setResultados(null);
      setFiltro('todos');
    };
    reader.readAsArrayBuffer(file);
  };

  const toggle = (nombre: string) =>
    setAbiertos(prev => {
      const next = new Set(prev);
      next.has(norm(nombre)) ? next.delete(norm(nombre)) : next.add(norm(nombre));
      return next;
    });

  // Totales
  const totalSistema = sistemaRows ? sistemaRows.reduce((s, r) => s + r.capital_original, 0) : 0;
  const totalExcel   = excelRows   ? excelRows.reduce((s, r) => s + r.dinero, 0) : 0;

  const counts = resultados
    ? {
        match:        resultados.filter(r => r.tipo === 'match').length,
        diferencia:   resultados.filter(r => r.tipo === 'diferencia').length,
        solo_sistema: resultados.filter(r => r.tipo === 'solo_sistema').length,
        solo_excel:   resultados.filter(r => r.tipo === 'solo_excel').length,
      }
    : null;

  const filas = resultados
    ? (filtro === 'todos' ? resultados : resultados.filter(r => r.tipo === filtro))
    : [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/prestamos')} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Auditoría de Capital</h2>
            <p className="text-sm text-slate-500">Sistema vs tu Excel</p>
          </div>
        </div>
        <button
          onClick={cargarSistema}
          disabled={cargando}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar sistema
        </button>
      </div>

      {/* Totales globales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Total sistema</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalSistema)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{sistemaRows?.length ?? '—'} préstamos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Total Excel</p>
          <p className="text-xl font-bold text-slate-700">{excelRows ? fmt(totalExcel) : '—'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{excelRows ? `${excelRows.length} filas` : 'Sin archivo'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Diferencia</p>
          {excelRows
            ? <p className={`text-xl font-bold ${Math.abs(totalSistema - totalExcel) < 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(totalSistema - totalExcel)}
              </p>
            : <p className="text-xl font-bold text-slate-300">—</p>
          }
        </div>
      </div>

      {/* Panel de entrada */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Pestañas */}
        <div className="flex border-b border-slate-100">
          {(['pegar', 'archivo'] as const).map(modo => (
            <button
              key={modo}
              onClick={() => setModoEntrada(modo)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                modoEntrada === modo
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {modo === 'pegar' ? <><ClipboardPaste size={14} /> Pegar desde Excel</> : <><Upload size={14} /> Subir archivo</>}
            </button>
          ))}
        </div>

        <div className="p-5">
          {modoEntrada === 'pegar' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Copia las celdas de tu Excel (incluyendo encabezados) y pégalas aquí</p>
              <textarea
                value={textoPegado}
                onChange={e => setTextoPegado(e.target.value)}
                placeholder={`DEUDORES\tCAPITAL\tTASA INTERES\nJUAN PEREZ\t100,000\t3.00%\n...`}
                rows={8}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-700
                           placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              {textoPegado.trim() && (
                <p className="text-xs text-slate-400">
                  {parsearTexto(textoPegado).length} filas detectadas
                </p>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              <Upload size={28} className="mx-auto text-slate-300 mb-2" />
              {nombreArchivo
                ? <p className="text-sm font-medium text-blue-700">{nombreArchivo} — {excelRows?.length} filas</p>
                : <p className="text-sm text-slate-400">Arrastra tu Excel aquí o haz clic</p>
              }
              <p className="text-xs text-slate-300 mt-1">.xlsx · .xls · .csv</p>
            </div>
          )}

          <button
            onClick={() => {
              const filas = modoEntrada === 'pegar'
                ? parsearTexto(textoPegado)
                : excelRows ?? [];
              if (!filas.length || !sistemaRows) return;
              setExcelRows(filas);
              const sm = agruparSistema(sistemaRows);
              const em = agruparExcel(filas);
              const res = comparar(sm, em);
              setResultados(res);
              const autoAbrir = new Set(res.filter(r => r.tipo !== 'match').map(r => norm(r.nombre)));
              setAbiertos(autoAbrir);
              setFiltro('todos');
            }}
            disabled={cargando || (modoEntrada === 'pegar' ? !textoPegado.trim() : !excelRows)}
            className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
          >
            Comparar sistema vs Excel
          </button>
        </div>
      </div>

      {/* Resumen de resultados */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['diferencia', 'solo_excel', 'solo_sistema', 'match'] as TipoResultado[]).map(tipo => {
            const cfg = TIPO_CFG[tipo];
            return (
              <button
                key={tipo}
                onClick={() => setFiltro(filtro === tipo ? 'todos' : tipo)}
                className={`bg-white rounded-xl border shadow-sm p-4 text-left transition-all ${
                  filtro === tipo ? 'ring-2 ring-blue-400' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className="text-xs text-slate-400">{cfg.label}</p>
                <p className="text-2xl font-bold mt-0.5">{counts[tipo]}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabla de resultados */}
      {resultados && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {filas.length} cliente{filas.length !== 1 ? 's' : ''}
              {filtro !== 'todos' && <span className="text-slate-400 font-normal"> · filtrado por {TIPO_CFG[filtro].label}</span>}
            </p>
            {filtro !== 'todos' && (
              <button onClick={() => setFiltro('todos')} className="text-xs text-blue-600 hover:underline">Ver todos</button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left w-8" />
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-center">Préstamos</th>
                <th className="px-4 py-3 text-right text-blue-600">Sistema</th>
                <th className="px-4 py-3 text-right">Excel</th>
                <th className="px-4 py-3 text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(r => {
                const key = norm(r.nombre);
                const abierto = abiertos.has(key);
                const cntSis = r.sistema?.prestamos.length ?? 0;
                const cntExc = r.excel?.prestamos.length ?? 0;
                const cfg = TIPO_CFG[r.tipo];

                return (
                  <React.Fragment key={r.nombre}>
                    <tr
                      className={`hover:bg-slate-50 cursor-pointer ${r.tipo === 'match' ? 'opacity-60' : ''}`}
                      onClick={() => toggle(r.nombre)}
                    >
                      <td className="pl-4 py-3 text-slate-400">
                        {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{r.nombre}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.bg}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-500">
                          {cntSis > 0 && <span className="text-blue-600 font-semibold">{cntSis}</span>}
                          {cntSis > 0 && cntExc > 0 && <span className="text-slate-300"> / </span>}
                          {cntExc > 0 && <span className="text-slate-600 font-semibold">{cntExc}</span>}
                          {cntSis !== cntExc && cntSis > 0 && cntExc > 0 &&
                            <span className="ml-1 text-amber-500">!</span>
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">
                        {r.sistema ? fmt(r.sistema.total) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.excel ? fmt(r.excel.total) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.tipo === 'diferencia'
                          ? <span className="font-semibold text-amber-600">{fmt(Math.abs(r.delta))}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    </tr>

                    {/* Detalle expandido */}
                    {abierto && (
                      <tr>
                        <td colSpan={6} className="px-0 py-0">
                          <div className="bg-slate-50 border-t border-slate-100 px-8 py-3 grid grid-cols-2 gap-6">
                            {/* Columna sistema */}
                            <div>
                              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-2">Sistema</p>
                              {r.sistema
                                ? r.sistema.prestamos.map(p => (
                                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                                      <div>
                                        <span className="font-mono text-xs text-slate-500">{p.folio}</span>
                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium ${ESTATUS_COLOR[p.estatus] ?? 'bg-slate-100 text-slate-500'}`}>
                                          {p.estatus.replace('_', ' ')}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-semibold text-blue-700">{fmt(p.capital_original)}</p>
                                        <p className="text-[10px] text-slate-400">{p.tasa}% mens.</p>
                                      </div>
                                    </div>
                                  ))
                                : <p className="text-xs text-slate-400">No está en el sistema</p>
                              }
                            </div>
                            {/* Columna Excel */}
                            <div>
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Excel</p>
                              {r.excel
                                ? r.excel.prestamos.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                                      <span className="text-xs text-slate-500">Fila {i + 1}</span>
                                      <div className="text-right">
                                        <p className="text-xs font-semibold text-slate-700">{fmt(p.dinero)}</p>
                                        <p className="text-[10px] text-slate-400">{p.interes}% mens.</p>
                                      </div>
                                    </div>
                                  ))
                                : <p className="text-xs text-slate-400">No está en tu Excel</p>
                              }
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditoriaPrestamos;
