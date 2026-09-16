import React, { useEffect, useState } from 'react';
import { Search, X, UserCheck } from 'lucide-react';
import { listarReferenciadores } from '../../services/referenciadoresService';
import { ReferenciadorResumen, SeleccionReferenciador } from '../../types/referenciador.types';

// ================================================================
// SelectorReferenciador (M48) — shared by inversiones and préstamos.
//
// Autocomplete over GET /api/referenciadores, active ones only (P6).
// Linking is optional (P4). It never calls /api/referencias: it only reports
// { referenciador_id, tasa } and the parent decides when to persist.
// Knows nothing about roles — hiding it from non-admins is the parent's job.
// ================================================================

interface Props {
  valor: SeleccionReferenciador;
  onCambio: (valor: SeleccionReferenciador) => void;
  // Investor whose own referenciador row must not be offered (no self-reference)
  excluirInversionistaId?: string;
  deshabilitado?: boolean;
  // Error owned by the parent (e.g. from the backend). Shown below the field.
  error?: string;
}

export const SELECCION_VACIA: SeleccionReferenciador = { referenciador_id: null, tasa: '' };

// Percentage with up to 2 decimals, > 0 and ≤ 999.99 — mirrors NUMERIC(5,2)
// and the backend's tasaValida. String-only: no parseFloat for money/rates.
const REGEX_TASA = /^\d{1,3}(\.\d{1,2})?$/;

const tasaEnRango = (tasa: string): boolean => {
  if (!REGEX_TASA.test(tasa)) return false;
  const [entero, dec = ''] = tasa.split('.');
  const centesimas = parseInt(entero, 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
  return centesimas > 0 && centesimas <= 99999;
};

// Returns the Spanish error for a selection, or null when it is valid.
// Without referenciador the selection is always valid (linking is optional).
export const validarSeleccionReferenciador = (valor: SeleccionReferenciador): string | null => {
  if (!valor.referenciador_id) return null;
  const tasa = valor.tasa.trim();
  if (!tasa) return 'Indica la tasa mensual del referenciador.';
  if (!tasaEnRango(tasa)) return 'La tasa debe ser mayor a cero, hasta 999.99, con máximo 2 decimales.';
  return null;
};

const nombreCompleto = (r: ReferenciadorResumen): string =>
  [r.nombres, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' ');

const inputCls = `w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm
  text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400
  focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400`;

const BadgeForma: React.FC<{ inversionistaId: string | null }> = ({ inversionistaId }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                   bg-sky-50 text-sky-700 border border-sky-100">
    {inversionistaId ? 'Ambos' : 'Referenciador'}
  </span>
);

const SelectorReferenciador: React.FC<Props> = ({
  valor, onCambio, excluirInversionistaId, deshabilitado = false, error,
}) => {
  const [seleccionado, setSeleccionado] = useState<ReferenciadorResumen | null>(null);
  const [consulta, setConsulta]         = useState('');
  const [resultados, setResultados]     = useState<ReferenciadorResumen[]>([]);
  const [buscando, setBuscando]         = useState(false);
  const [tocado, setTocado]             = useState(false);

  // Keep local selection in sync when the parent clears the value
  useEffect(() => {
    if (!valor.referenciador_id) setSeleccionado(null);
  }, [valor.referenciador_id]);

  // Debounced search; active only; excludes the investor's own row
  useEffect(() => {
    if (seleccionado || consulta.trim().length < 2) { setResultados([]); return; }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const r = await listarReferenciadores({ buscar: consulta.trim(), limite: 100 });
        if (!vivo) return;
        setResultados(
          r.referenciadores.filter((x) =>
            x.activo && (!excluirInversionistaId || x.inversionista_id !== excluirInversionistaId)
          )
        );
      } catch {
        if (vivo) setResultados([]);
      } finally {
        if (vivo) setBuscando(false);
      }
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [consulta, seleccionado, excluirInversionistaId]);

  const elegir = (r: ReferenciadorResumen) => {
    setSeleccionado(r);
    setResultados([]);
    setConsulta('');
    onCambio({ referenciador_id: r.id, tasa: valor.tasa });
  };

  const quitar = () => {
    setSeleccionado(null);
    setConsulta('');
    setTocado(false);
    onCambio(SELECCION_VACIA);
  };

  const cambiarTasa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    let limpio = partes[0].slice(0, 3);
    if (partes.length > 1) limpio += '.' + partes[1].slice(0, 2);
    setTocado(true);
    onCambio({ referenciador_id: valor.referenciador_id, tasa: limpio });
  };

  const errorTasa = tocado ? validarSeleccionReferenciador(valor) : null;
  const mensajeError = error ?? errorTasa;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Referenciador</p>
        <span className="text-xs text-slate-400">opcional</span>
      </div>

      {valor.referenciador_id && seleccionado ? (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5
                          bg-sky-50 rounded-xl border border-sky-100 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck size={16} className="text-sky-600 shrink-0" />
              <span className="text-sm text-slate-800 truncate">{nombreCompleto(seleccionado)}</span>
              <BadgeForma inversionistaId={seleccionado.inversionista_id} />
            </div>
            <button
              type="button"
              onClick={quitar}
              disabled={deshabilitado}
              aria-label="Quitar referenciador"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white
                         disabled:opacity-50 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="sm:w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tasa mensual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={valor.tasa}
                onChange={cambiarTasa}
                onBlur={() => setTocado(true)}
                disabled={deshabilitado}
                placeholder="0.50"
                className={`${inputCls} pr-8`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">0.50 = 0.5% mensual</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            disabled={deshabilitado}
            placeholder="Buscar referenciador por nombre, teléfono o correo…"
            className={`${inputCls} pl-9`}
          />
          {consulta.trim().length >= 2 && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-100 rounded-xl
                           shadow-lg max-h-56 overflow-y-auto">
              {buscando && resultados.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-slate-400">Buscando…</li>
              )}
              {!buscando && resultados.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-slate-400">Sin referenciadores activos con ese dato.</li>
              )}
              {resultados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => elegir(r)}
                    className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5
                               text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="truncate">{nombreCompleto(r)}</span>
                    <BadgeForma inversionistaId={r.inversionista_id} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mensajeError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{mensajeError}</p>
      )}
    </div>
  );
};

export default SelectorReferenciador;
