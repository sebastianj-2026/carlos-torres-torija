import { useEffect, useState } from 'react';
import { Search, Check, X, UserPlus } from 'lucide-react';
import { listarPersonas, crearAportacion } from '../../services/personasService';
import { Persona } from '../../types/persona.types';

// P-004 · Captura de aportación con referidor (pantalla de Carlos).
// Dinero/tasas se manejan como texto (sin aritmética de float en el front) y se
// validan con el mismo formato que el backend antes de enviar.

const MONEY_REGEX = /^(?:0*[1-9][0-9]*|0*[1-9][0-9]*\.[0-9]{1,2}|0*0?\.(?:0[1-9]|[1-9][0-9]?))$/;
const RATE_REGEX = /^[0-9](?:\.[0-9]{1,4})?$/;

const nombreCompleto = (p: Persona) =>
  `${p.nombre} ${p.apellido_paterno}${p.apellido_materno ? ' ' + p.apellido_materno : ''}`;

// Buscador con autocompletar reutilizable (inversionista y referidor).
function PersonaPicker({
  label,
  seleccion,
  onSelect,
  excluirId,
}: {
  label: string;
  seleccion: Persona | null;
  onSelect: (p: Persona | null) => void;
  excluirId?: number;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (seleccion || q.trim().length < 2) {
      setResultados([]);
      return;
    }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await listarPersonas(q.trim());
        if (vivo) setResultados(r.filter((p) => p.id !== excluirId));
      } catch {
        if (vivo) setResultados([]);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [q, seleccion, excluirId]);

  if (seleccion) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-sm text-slate-800">{nombreCompleto(seleccion)}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQ('');
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
            aria-label="Quitar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
          }}
          placeholder="Buscar por nombre…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
        />
      </div>
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setAbierto(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {nombreCompleto(p)}
                <span className="text-slate-400"> · {p.telefono}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300';

export default function CapturaAportacion() {
  const [inversionista, setInversionista] = useState<Persona | null>(null);
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [tasaInv, setTasaInv] = useState('');
  const [tieneReferidor, setTieneReferidor] = useState(false);
  const [referidor, setReferidor] = useState<Persona | null>(null);
  const [tasaRef, setTasaRef] = useState('');

  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const limpiar = () => {
    setInversionista(null);
    setMonto('');
    setFecha('');
    setTasaInv('');
    setTieneReferidor(false);
    setReferidor(null);
    setTasaRef('');
  };

  const validar = (): string | null => {
    if (!inversionista) return 'Selecciona el inversionista.';
    if (!MONEY_REGEX.test(monto.trim())) return 'Monto inválido (positivo, hasta 2 decimales).';
    if (!fecha) return 'La fecha es obligatoria.';
    if (!RATE_REGEX.test(tasaInv.trim())) return 'Tasa del inversionista inválida (ej. 0.0200).';
    if (tieneReferidor) {
      if (!referidor) return 'Selecciona el referidor o desactiva la opción.';
      if (referidor.id === inversionista.id) return 'El referidor no puede ser el mismo inversionista (P7).';
      if (!RATE_REGEX.test(tasaRef.trim())) return 'Tasa del referidor inválida (ej. 0.0050).';
    }
    return null;
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    setEnviando(true);
    try {
      await crearAportacion(inversionista!.id, {
        monto: monto.trim(),
        fecha: fecha,
        tasa_inversionista: tasaInv.trim(),
        referenciador_id: tieneReferidor ? String(referidor!.id) : null,
        tasa_referenciador: tieneReferidor ? tasaRef.trim() : null,
      });
      setOk(true);
      limpiar();
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? 'No se pudo registrar la aportación.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <UserPlus size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Nueva aportación</h1>
          <p className="text-sm text-slate-500">Captura la aportación y, opcionalmente, quién la refirió.</p>
        </div>
      </div>

      <form onSubmit={enviar} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <PersonaPicker label="Inversionista" seleccion={inversionista} onSelect={setInversionista} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto (MXN)</label>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" placeholder="500000.00" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tasa mensual del inversionista</label>
          <input value={tasaInv} onChange={(e) => setTasaInv(e.target.value)} inputMode="decimal" placeholder="0.0200 (= 2%)" className={inputCls} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={tieneReferidor}
            onChange={(e) => {
              setTieneReferidor(e.target.checked);
              if (!e.target.checked) {
                setReferidor(null);
                setTasaRef('');
              }
            }}
            className="rounded border-slate-300"
          />
          Esta aportación tiene referidor
        </label>

        {tieneReferidor && (
          <div className="space-y-4 pl-1 border-l-2 border-blue-100">
            <div className="pl-3">
              <PersonaPicker
                label="Referidor"
                seleccion={referidor}
                onSelect={setReferidor}
                excluirId={inversionista?.id}
              />
            </div>
            <div className="pl-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tasa mensual del referidor</label>
              <input value={tasaRef} onChange={(e) => setTasaRef(e.target.value)} inputMode="decimal" placeholder="0.0050 (= 0.5%)" className={inputCls} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {ok && (
          <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <Check size={16} /> Aportación registrada.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {enviando ? 'Guardando…' : 'Registrar aportación'}
          </button>
        </div>
      </form>
    </div>
  );
}
