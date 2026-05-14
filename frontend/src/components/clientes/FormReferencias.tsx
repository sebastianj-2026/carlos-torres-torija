import React, { useState } from 'react';
import {
  ReferenciaCliente,
  CrearReferenciaDto,
  RelacionReferencia,
  ETIQUETAS_RELACION,
} from '../../types/cliente.types';
import { agregarReferencia, eliminarReferencia } from '../../services/clientesService';
import { useAuth } from '../../context/AuthContext';

interface FormReferenciasProps {
  clienteId: string;
  referencias: ReferenciaCliente[];
  onActualizado: (referencias: ReferenciaCliente[]) => void;
}

const RELACIONES: RelacionReferencia[] = ['familiar', 'amigo', 'trabajo', 'otro'];

const FormReferencias: React.FC<FormReferenciasProps> = ({ clienteId, referencias, onActualizado }) => {
  const { usuario } = useAuth();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CrearReferenciaDto>({
    nombre_completo: '',
    telefono: '',
    relacion: '',
  });

  const handleCambio = (campo: keyof CrearReferenciaDto, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  };

  const handleAgregar = async () => {
    if (!form.nombre_completo.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const resultado = await agregarReferencia(clienteId, form);
      onActualizado([...referencias, resultado.referencia]);
      setForm({ nombre_completo: '', telefono: '', relacion: '' });
      setMostrarFormulario(false);
    } catch {
      setError('Error al agregar la referencia. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (refId: string) => {
    if (!window.confirm('¿Eliminar esta referencia?')) return;
    setEliminandoId(refId);
    try {
      await eliminarReferencia(clienteId, refId);
      onActualizado(referencias.filter((r) => r.id !== refId));
    } catch {
      // No mostrar error invasivo, el botón simplemente vuelve a habilitarse
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Lista de referencias */}
      {referencias.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Sin referencias personales registradas.
        </p>
      ) : (
        <div className="space-y-3">
          {referencias.map((ref) => (
            <div
              key={ref.id}
              className="flex items-center justify-between px-4 py-3.5 bg-white border border-slate-100
                         rounded-xl shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{ref.nombre_completo}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {ref.telefono && (
                    <span className="text-xs text-slate-500">{ref.telefono}</span>
                  )}
                  {ref.relacion && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                      {ETIQUETAS_RELACION[ref.relacion]}
                    </span>
                  )}
                </div>
              </div>
              {usuario?.rol === 'administrador' && (
                <button
                  onClick={() => handleEliminar(ref.id)}
                  disabled={eliminandoId === ref.id}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50
                             transition-colors disabled:opacity-50"
                  title="Eliminar referencia"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario inline */}
      {mostrarFormulario && (
        <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Nueva referencia</p>

          <div>
            <input
              type="text"
              placeholder="Nombre completo *"
              value={form.nombre_completo}
              onChange={(e) => handleCambio('nombre_completo', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => handleCambio('telefono', e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <select
              value={form.relacion}
              onChange={(e) => handleCambio('relacion', e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            >
              <option value="">Relación</option>
              {RELACIONES.map((r) => (
                <option key={r} value={r}>{ETIQUETAS_RELACION[r]}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setMostrarFormulario(false); setError(null); }}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg
                         hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAgregar}
              disabled={guardando}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-orange-500 text-white
                         hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {guardando && (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Botón para abrir formulario */}
      {!mostrarFormulario && (
        <button
          onClick={() => setMostrarFormulario(true)}
          className="w-full py-2.5 text-sm text-orange-600 border border-dashed border-orange-300
                     rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar referencia
        </button>
      )}
    </div>
  );
};

export default FormReferencias;
