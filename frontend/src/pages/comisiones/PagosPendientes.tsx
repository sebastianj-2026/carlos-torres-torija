import { useEffect, useMemo, useState } from 'react';
import { Wallet, Check, Info } from 'lucide-react';
import {
  listarPendientes, registrarPagoComision, sumaMxn,
  PendienteLinea,
} from '../../services/comisionesService';

// T-009 · Pagos pendientes (la pantalla de Carlos).
// R14: Carlos selecciona qué líneas pagar; el sistema no decide.
// R15/R16: el FIFO dentro de cada línea lo resuelve el backend.
// R17: un pago por concepto (cada línea ya es persona+concepto+origen).
// R19: pide autorizado_por. (Comprobante PDF: pendiente — ver nota.)

const nombre = (l: PendienteLinea) =>
  `${l.nombre} ${l.apellido_paterno}${l.apellido_materno ? ' ' + l.apellido_materno : ''}`;
const money = (s: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(s));
const keyOf = (l: PendienteLinea) => `${l.persona_id}|${l.concepto}|${l.origen_tipo}|${l.origen_id}`;
const hoy = () => new Date().toISOString().slice(0, 10);

export default function PagosPendientes() {
  const [lineas, setLineas] = useState<PendienteLinea[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [autorizadoPor, setAutorizadoPor] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const cargar = async () => {
    setCargando(true); setError('');
    try {
      setLineas(await listarPendientes());
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? 'No se pudieron cargar los pendientes.');
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const toggle = (k: string) => {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const seleccionadas = useMemo(() => lineas.filter((l) => sel.has(keyOf(l))), [lineas, sel]);
  const totalSel = useMemo(() => sumaMxn(seleccionadas.map((l) => l.acumulado)), [seleccionadas]);

  const registrar = async () => {
    setError(''); setOkMsg('');
    if (seleccionadas.length === 0) { setError('Selecciona al menos una línea.'); return; }
    if (!autorizadoPor.trim()) { setError('Indica quién autoriza el pago (R19).'); return; }
    setProcesando(true);
    let ok = 0; const fallos: string[] = [];
    for (const l of seleccionadas) {
      try {
        await registrarPagoComision({
          persona_id: l.persona_id, concepto: l.concepto,
          origen_tipo: l.origen_tipo, origen_id: l.origen_id,
          monto: l.acumulado, fecha, autorizado_por: autorizadoPor.trim(),
        });
        ok++;
      } catch (e: any) {
        fallos.push(`${nombre(l)} (${l.concepto}): ${e?.response?.data?.mensaje ?? 'error'}`);
      }
    }
    setProcesando(false);
    setSel(new Set());
    if (ok) setOkMsg(`${ok} pago(s) registrado(s).`);
    if (fallos.length) setError('No se pudieron registrar: ' + fallos.join(' · '));
    await cargar();
  };

  return (
    <div className="max-w-3xl mx-auto pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Wallet size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Pagos pendientes</h1>
          <p className="text-sm text-slate-500">Selecciona las líneas a pagar. El FIFO por periodo lo aplica el sistema.</p>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg mb-4">
        <Info size={14} /> El comprobante PDF (R19) se adjuntará cuando esté disponible la subida de documentos.
      </p>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
      {okMsg && <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-3"><Check size={16} /> {okMsg}</p>}

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : lineas.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-100 rounded-xl px-4 py-6 text-center">No hay pagos pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {lineas.map((l) => {
            const k = keyOf(l);
            const activo = sel.has(k);
            return (
              <li key={k}>
                <label className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl border cursor-pointer transition-colors ${activo ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-100 hover:border-slate-200'}`}>
                  <input type="checkbox" checked={activo} onChange={() => toggle(k)} className="rounded border-slate-300" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 truncate">{nombre(l)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${l.concepto === 'rendimiento' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{l.concepto}</span>
                    </div>
                    <span className="text-xs text-slate-500">Aportación #{l.origen_id} · {l.meses} mes(es) · desde {new Date(l.desde).toISOString().slice(0, 7)}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 shrink-0">{money(l.acumulado)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {/* Barra fija con total y confirmación */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-100 px-4 py-3">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Seleccionado: <b className="text-slate-800">{money(totalSel)}</b></span>
            <span className="text-slate-400">({seleccionadas.length})</span>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <input
              value={autorizadoPor}
              onChange={(e) => setAutorizadoPor(e.target.value)}
              placeholder="Autorizado por…"
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
            <button
              onClick={registrar}
              disabled={procesando || seleccionadas.length === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {procesando ? 'Registrando…' : 'Registrar pagos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
