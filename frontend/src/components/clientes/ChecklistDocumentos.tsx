import React, { useState } from 'react';
import {
  DocumentoCliente,
  TipoDocumento,
  ActualizarDocumentoDto,
  ETIQUETAS_DOCUMENTO,
} from '../../types/cliente.types';
import { actualizarDocumentos } from '../../services/clientesService';
import FileDropZone from '../shared/FileDropZone';

interface ChecklistDocumentosProps {
  clienteId: string;
  documentos: DocumentoCliente[];
  soloLectura?: boolean;
  onActualizado?: (documentos: DocumentoCliente[]) => void;
}

const TIPOS_INE: TipoDocumento[] = ['ine_frente', 'ine_reverso'];

const ORDEN_DOCUMENTOS: TipoDocumento[] = [
  'ine_frente',
  'ine_reverso',
  'escritura',
  'r20',
  'recibo_luz',
  'constancia_no_adeudo',
  'predial',
  'curp',
  'rfc',
];

type DocEstado = { entregado: boolean; digitalizado: boolean; url_archivo: string | null };

const ChecklistDocumentos: React.FC<ChecklistDocumentosProps> = ({
  clienteId,
  documentos,
  soloLectura = false,
  onActualizado,
}) => {
  const [estado, setEstado] = useState<Record<TipoDocumento, DocEstado>>(() => {
    const mapa: Partial<Record<TipoDocumento, DocEstado>> = {};
    for (const tipo of ORDEN_DOCUMENTOS) {
      const doc = documentos.find((d) => d.tipo === tipo);
      mapa[tipo] = {
        entregado:    doc?.entregado    ?? false,
        digitalizado: doc?.digitalizado ?? false,
        url_archivo:  doc?.url_archivo  ?? null,
      };
    }
    return mapa as Record<TipoDocumento, DocEstado>;
  });

  const [guardando,  setGuardando]  = useState(false);
  const [mensaje,    setMensaje]    = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [modificado, setModificado] = useState(false);

  const handleCambio = (tipo: TipoDocumento, campo: keyof DocEstado, valor: boolean | string | null) => {
    setEstado((prev) => ({ ...prev, [tipo]: { ...prev[tipo], [campo]: valor } }));
    setModificado(true);
    setMensaje(null);
  };

  const handleUrl = (tipo: TipoDocumento, url: string) => {
    setEstado((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], url_archivo: url || null, digitalizado: Boolean(url) },
    }));
    setModificado(true);
    setMensaje(null);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const payload: ActualizarDocumentoDto[] = ORDEN_DOCUMENTOS.map((tipo) => ({
        tipo,
        entregado:    estado[tipo].entregado,
        digitalizado: estado[tipo].digitalizado,
        url_archivo:  estado[tipo].url_archivo ?? undefined,
      }));

      const resultado = await actualizarDocumentos(clienteId, payload);
      setMensaje({ tipo: 'exito', texto: 'Checklist guardado correctamente.' });
      setModificado(false);
      onActualizado?.(resultado.documentos);
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar. Intenta de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  const entregados    = ORDEN_DOCUMENTOS.filter((t) => estado[t].entregado).length;
  const digitalizados = ORDEN_DOCUMENTOS.filter((t) => estado[t].digitalizado).length;
  const total         = ORDEN_DOCUMENTOS.length;

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-green-600">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span>{entregados}/{total} entregados</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-600">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>{digitalizados}/{total} digitalizados</span>
        </div>
      </div>

      {/* Sección INE — upload zones */}
      {!soloLectura && (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              INE / Identificación oficial
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {TIPOS_INE.map((tipo) => (
              <div key={tipo} className="space-y-2">
                <FileDropZone
                  label={ETIQUETAS_DOCUMENTO[tipo]}
                  value={estado[tipo].url_archivo ?? ''}
                  folder={`clientes/${clienteId}`}
                  onChange={(url) => handleUrl(tipo, url)}
                />
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={estado[tipo].entregado}
                    onChange={(e) => handleCambio(tipo, 'entregado', e.target.checked)}
                    className="w-3.5 h-3.5 accent-sky-500"
                  />
                  Físico entregado
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resto de documentos */}
      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Documento</span>
          <span className="text-center w-24">Entregado</span>
          <span className="text-center w-24">Digitalizado</span>
        </div>
        {ORDEN_DOCUMENTOS.filter((t) => !TIPOS_INE.includes(t)).map((tipo) => (
          <div
            key={tipo}
            className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3.5 bg-white
              ${estado[tipo].entregado ? '' : 'opacity-80'}`}
          >
            <span className="text-sm text-slate-700 font-medium">
              {ETIQUETAS_DOCUMENTO[tipo]}
            </span>
            <div className="flex justify-center w-24">
              <input
                type="checkbox"
                checked={estado[tipo].entregado}
                onChange={(e) => handleCambio(tipo, 'entregado', e.target.checked)}
                disabled={soloLectura}
                className="w-4 h-4 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex justify-center w-24">
              <input
                type="checkbox"
                checked={estado[tipo].digitalizado}
                onChange={(e) => handleCambio(tipo, 'digitalizado', e.target.checked)}
                disabled={soloLectura}
                className="w-4 h-4 accent-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          </div>
        ))}
      </div>

      {/* soloLectura: mostrar INE debajo del checklist */}
      {soloLectura && (TIPOS_INE.some((t) => estado[t].url_archivo)) && (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">INE digitalizado</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {TIPOS_INE.filter((t) => estado[t].url_archivo).map((tipo) => (
              <FileDropZone
                key={tipo}
                label={ETIQUETAS_DOCUMENTO[tipo]}
                value={estado[tipo].url_archivo ?? ''}
                folder={`clientes/${clienteId}`}
                onChange={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Guardar */}
      {!soloLectura && (
        <div className="flex items-center justify-between">
          {mensaje && (
            <p className={`text-sm ${mensaje.tipo === 'exito' ? 'text-green-600' : 'text-red-500'}`}>
              {mensaje.texto}
            </p>
          )}
          <div className="ml-auto">
            <button
              onClick={handleGuardar}
              disabled={guardando || !modificado}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-sky-500 text-white
                         hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors duration-150 flex items-center gap-2"
            >
              {guardando && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Guardar checklist
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistDocumentos;
