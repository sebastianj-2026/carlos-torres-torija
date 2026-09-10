import React, { useState } from 'react';
import { Check, Pencil, X, Save } from 'lucide-react';
import {
  DocumentoPrestamo,
  TipoDocumentoPrestamo,
  ETIQUETAS_DOCUMENTO_PRESTAMO,
  TIPOS_DOCUMENTO_PRESTAMO,
} from '../../types/prestamo.types';
import { actualizarDocumentos } from '../../services/prestamosService';

interface ChecklistDocumentosPrestamoPros {
  prestamoId: string;
  documentos: DocumentoPrestamo[];
  soloLectura?: boolean;
  onActualizado?: (docs: DocumentoPrestamo[]) => void;
}

const ChecklistDocumentosPrestamo: React.FC<ChecklistDocumentosPrestamoPros> = ({
  prestamoId,
  documentos,
  soloLectura = false,
  onActualizado,
}) => {
  const mapaInicial = () => {
    const mapa: Record<TipoDocumentoPrestamo, { entregado: boolean; digitalizado: boolean }> = {} as never;
    TIPOS_DOCUMENTO_PRESTAMO.forEach((tipo) => {
      const doc = documentos.find((d) => d.tipo === tipo);
      mapa[tipo] = {
        entregado:    doc?.entregado    ?? false,
        digitalizado: doc?.digitalizado ?? false,
      };
    });
    return mapa;
  };

  const [estado, setEstado]         = useState(mapaInicial);
  const [modoEditar, setModoEditar] = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [exito, setExito]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const toggleCampo = (tipo: TipoDocumentoPrestamo, campo: 'entregado' | 'digitalizado') => {
    if (!modoEditar || soloLectura) return;
    setEstado((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [campo]: !prev[tipo][campo] },
    }));
    setExito(false);
  };

  const handleCancelar = () => {
    setEstado(mapaInicial());
    setModoEditar(false);
    setExito(false);
    setError(null);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);
    setExito(false);
    try {
      const payload = TIPOS_DOCUMENTO_PRESTAMO.map((tipo) => ({
        tipo,
        entregado:    estado[tipo].entregado,
        digitalizado: estado[tipo].digitalizado,
      }));
      const res = await actualizarDocumentos(prestamoId, payload);
      setExito(true);
      setModoEditar(false);
      onActualizado?.(res.documentos);
    } catch {
      setError('Error al guardar los documentos.');
    } finally {
      setGuardando(false);
    }
  };

  const totalEntregados    = TIPOS_DOCUMENTO_PRESTAMO.filter((t) => estado[t].entregado).length;
  const totalDigitalizados = TIPOS_DOCUMENTO_PRESTAMO.filter((t) => estado[t].digitalizado).length;
  const total              = TIPOS_DOCUMENTO_PRESTAMO.length;

  return (
    <div className="space-y-4">
      {/* Encabezado con toggle Editar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>
            <span className="font-semibold text-slate-700">{totalEntregados}</span>/{total} entregados
          </span>
          <span>
            <span className="font-semibold text-slate-700">{totalDigitalizados}</span>/{total} digitalizados
          </span>
        </div>

        {!soloLectura && (
          modoEditar ? (
            <button
              onClick={handleCancelar}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X size={12} />
              Cancelar
            </button>
          ) : (
            <button
              onClick={() => { setModoEditar(true); setExito(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
            >
              <Pencil size={12} />
              Editar
            </button>
          )
        )}
      </div>

      {/* Lista */}
      <div className="space-y-1">
        {/* Encabezado columnas */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <span>Documento</span>
          <span className="w-24 text-center">Entregado</span>
          <span className="w-24 text-center">Digitalizado</span>
        </div>

        {TIPOS_DOCUMENTO_PRESTAMO.map((tipo) => {
          const { entregado, digitalizado } = estado[tipo];
          return (
            <div
              key={tipo}
              className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-xl transition-colors"
            >
              {/* Nombre del documento */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm truncate ${entregado ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                  {ETIQUETAS_DOCUMENTO_PRESTAMO[tipo]}
                </span>
              </div>

              {/* Entregado */}
              <div className="w-24 flex justify-center">
                <button
                  onClick={() => toggleCampo(tipo, 'entregado')}
                  disabled={!modoEditar || soloLectura}
                  title={modoEditar ? (entregado ? 'Marcar como no entregado' : 'Marcar como entregado') : undefined}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all
                    ${entregado
                      ? 'bg-green-500 border-green-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-transparent'}
                    ${modoEditar && !soloLectura
                      ? 'cursor-pointer hover:border-green-400'
                      : 'cursor-default'}`}
                >
                  {entregado && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>

              {/* Digitalizado */}
              <div className="w-24 flex justify-center">
                <button
                  onClick={() => toggleCampo(tipo, 'digitalizado')}
                  disabled={!modoEditar || soloLectura}
                  title={modoEditar ? (digitalizado ? 'Marcar como no digitalizado' : 'Marcar como digitalizado') : undefined}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all
                    ${digitalizado
                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-transparent'}
                    ${modoEditar && !soloLectura
                      ? 'cursor-pointer hover:border-blue-400'
                      : 'cursor-default'}`}
                >
                  {digitalizado && <Check size={14} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: guardar solo cuando está editando */}
      {modoEditar && !soloLectura && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            {exito && <p className="text-sm text-green-600">✓ Guardado correctamente</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                       bg-sky-500 text-white rounded-xl hover:bg-sky-600
                       transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* Confirmación post-guardado fuera del modo edición */}
      {exito && !modoEditar && (
        <p className="text-sm text-green-600 pt-1">✓ Guardado correctamente</p>
      )}
    </div>
  );
};

export default ChecklistDocumentosPrestamo;
