import React, { useCallback, useEffect, useState } from 'react';
import { Link2, UserCheck } from 'lucide-react';
import { ReferenciaOrigen, SeleccionReferenciador } from '../../types/referenciador.types';
import {
  obtenerReferenciaPorInversion,
  crearReferencia,
  ReferenciaError,
} from '../../services/referenciasService';
import SelectorReferenciador, {
  SELECCION_VACIA,
  validarSeleccionReferenciador,
} from '../shared/SelectorReferenciador';

// ================================================================
// ReferenciaInversion (M50) — referenciador block under an existing
// investment card. There is no "edit investment" screen: this is where an
// existing investment gets its referenciador linked.
//   · with reference  → read-only (name, rate, state, start). Never changes
//                        the referenciador (P3; the API does not allow it).
//   · without         → SelectorReferenciador + "Ligar", admins only (M28).
//   · 409             → backend message, then reload the reference.
// No edit-rate / terminate / cancel buttons: not specified yet.
// ================================================================

interface Props {
  inversionId: string;
  esAdmin: boolean;
}

const formatearFecha = (valor: string): string =>
  new Date(valor.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const ESTADO_CLS: Record<ReferenciaOrigen['estado'], string> = {
  activa:    'bg-green-50 text-green-700',
  terminada: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-50 text-red-600',
};

const ReferenciaInversion: React.FC<Props> = ({ inversionId, esAdmin }) => {
  const [referencia, setReferencia] = useState<ReferenciaOrigen | null>(null);
  const [cargando, setCargando]     = useState(true);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [seleccion, setSeleccion]   = useState<SeleccionReferenciador>(SELECCION_VACIA);
  const [ligando, setLigando]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setReferencia(await obtenerReferenciaPorInversion(inversionId));
    } catch (err) {
      setError(err instanceof ReferenciaError ? err.message : 'No se pudo consultar el referenciador.');
    } finally {
      setCargando(false);
    }
  }, [inversionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const ligar = async () => {
    const invalido = validarSeleccionReferenciador(seleccion);
    if (invalido) { setError(invalido); return; }
    if (!seleccion.referenciador_id) return;
    setLigando(true);
    setError(null);
    try {
      await crearReferencia({
        referenciador_id: seleccion.referenciador_id,
        tipo_referido:    'inversion',
        inversion_id:     inversionId,
        tasa:             seleccion.tasa.trim(),
      });
      setSeleccion(SELECCION_VACIA);
      setMostrarSelector(false);
      await cargar();
    } catch (err) {
      const mensaje = err instanceof ReferenciaError ? err.message : 'No se pudo ligar el referenciador.';
      setError(mensaje);
      // 409: someone linked it meanwhile — show what is there now (P3)
      if (err instanceof ReferenciaError && err.status === 409) await cargar();
    } finally {
      setLigando(false);
    }
  };

  if (cargando) {
    return <p className="mt-1.5 text-xs text-slate-400 px-1">Consultando referenciador…</p>;
  }

  // Read-only: the investment already has its (single) referenciador
  if (referencia) {
    return (
      <div className="mt-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <UserCheck size={14} className="text-sky-500" />
            Referenciador
          </span>
          <span className="text-sm text-slate-800 font-medium">{referencia.referenciador_nombre}</span>
          <span className="text-sm text-slate-600">{referencia.tasa}%</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_CLS[referencia.estado]}`}>
            {referencia.estado}
          </span>
          <span className="text-xs text-slate-400">desde {formatearFecha(referencia.fecha_inicio)}</span>
        </div>
      </div>
    );
  }

  // No reference and not admin: nothing to do here (linking is admin-only)
  if (!esAdmin) return null;

  if (!mostrarSelector) {
    return (
      <div className="mt-1.5 px-1">
        <button
          type="button"
          onClick={() => { setMostrarSelector(true); setError(null); }}
          className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 hover:underline py-1"
        >
          <Link2 size={12} />
          Ligar referenciador
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      <SelectorReferenciador
        valor={seleccion}
        onCambio={(v) => { setSeleccion(v); setError(null); }}
        deshabilitado={ligando}
        error={error ?? undefined}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => { setMostrarSelector(false); setSeleccion(SELECCION_VACIA); setError(null); }}
          disabled={ligando}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200
                     rounded-xl hover:bg-slate-50 disabled:opacity-60 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={ligar}
          disabled={ligando || !seleccion.referenciador_id}
          className="px-4 py-1.5 text-xs font-medium bg-sky-500 text-white rounded-xl
                     hover:bg-sky-600 disabled:opacity-60 transition-colors"
        >
          {ligando ? 'Ligando…' : 'Ligar'}
        </button>
      </div>
    </div>
  );
};

export default ReferenciaInversion;
