import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Campo } from '../inversionistas/FormularioInversionista';
import FileDropZone from '../../components/shared/FileDropZone';
import {
  crearReferenciador,
  editarReferenciador,
  obtenerReferenciador,
} from '../../services/referenciadoresService';

interface DatosForm {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  direccion: string;
  telefono: string;
  correo: string;
  url_ine: string;
  numero_cuenta: string;
  banco: string;
}

const DATOS_INICIALES: DatosForm = {
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  direccion: '',
  telefono: '',
  correo: '',
  url_ine: '',
  numero_cuenta: '',
  banco: '',
};

const FormularioReferenciador: React.FC = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const esEdicion = Boolean(id);

  const [datos, setDatos]         = useState<DatosForm>(DATOS_INICIALES);
  const [cargando, setCargando]   = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [exito, setExito]         = useState(false);

  useEffect(() => {
    if (!esEdicion || !id) return;
    const cargar = async () => {
      try {
        const ref = await obtenerReferenciador(id);
        setDatos({
          nombres:          ref.nombres,
          apellido_paterno: ref.apellido_paterno,
          apellido_materno: ref.apellido_materno ?? '',
          direccion:        ref.direccion        ?? '',
          telefono:         ref.telefono         ?? '',
          correo:           ref.correo           ?? '',
          url_ine:          ref.url_ine          ?? '',
          numero_cuenta:    ref.numero_cuenta    ?? '',
          banco:            ref.banco            ?? '',
        });
      } catch {
        setError('No se pudo cargar el referenciador.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [esEdicion, id]);

  const actualizar = (campo: keyof DatosForm, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  };

  const handleGuardar = async () => {
    if (!datos.nombres.trim()) {
      setError('El campo Nombres es obligatorio.'); return;
    }
    if (!datos.apellido_paterno.trim()) {
      setError('El apellido paterno es obligatorio.'); return;
    }
    // numero_cuenta y banco son opcionales: nunca bloquean el guardado.

    setGuardando(true);
    setError(null);
    try {
      const payload = {
        nombres:          datos.nombres.trim(),
        apellido_paterno: datos.apellido_paterno.trim(),
        apellido_materno: datos.apellido_materno.trim() || undefined,
        direccion:        datos.direccion.trim()        || undefined,
        telefono:         datos.telefono.trim()         || undefined,
        correo:           datos.correo.trim()           || undefined,
        url_ine:          datos.url_ine.trim()          || undefined,
        numero_cuenta:    datos.numero_cuenta.trim()    || undefined,
        banco:            datos.banco.trim()            || undefined,
      };
      if (esEdicion && id) {
        await editarReferenciador(id, payload);
        setExito(true);
        setTimeout(() => navigate(`/referenciadores/${id}`), 1200);
      } else {
        const nuevo = await crearReferenciador(payload);
        setExito(true);
        setTimeout(() => navigate(`/referenciadores/${nuevo.id}`), 1200);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error ?? e?.message ?? 'Error al guardar los datos.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(esEdicion && id ? `/referenciadores/${id}` : '/referenciadores')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {esEdicion ? 'Editar referenciador' : 'Nuevo referenciador'}
          </h2>
          <p className="text-sm text-slate-500">
            {esEdicion ? 'Actualiza los datos personales' : 'Registra un nuevo referenciador'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">

        {/* Nombre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            label="Nombres"
            valor={datos.nombres}
            onChange={(v) => actualizar('nombres', v)}
            requerido
            placeholder="Nombre(s)"
          />
          <Campo
            label="Apellido paterno"
            valor={datos.apellido_paterno}
            onChange={(v) => actualizar('apellido_paterno', v)}
            requerido
            placeholder="Apellido paterno"
          />
          <Campo
            label="Apellido materno"
            valor={datos.apellido_materno}
            onChange={(v) => actualizar('apellido_materno', v)}
            placeholder="Apellido materno"
          />
        </div>

        {/* Contacto */}
        <div className="pt-2 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Contacto</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              label="Teléfono"
              valor={datos.telefono}
              onChange={(v) => actualizar('telefono', v)}
              tipo="tel"
              placeholder="10 dígitos"
            />
            <Campo
              label="Correo electrónico"
              valor={datos.correo}
              onChange={(v) => actualizar('correo', v)}
              tipo="email"
              placeholder="correo@ejemplo.com"
            />
            <div className="sm:col-span-2">
              <Campo
                label="Dirección"
                valor={datos.direccion}
                onChange={(v) => actualizar('direccion', v)}
                placeholder="Calle, número, colonia, ciudad"
              />
            </div>
          </div>
        </div>

        {/* Identificación — INE solo PDF, rechazo antes de subir (M25) */}
        <div className="pt-2 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Identificación (INE)
          </p>
          <FileDropZone
            label="INE / Identificación oficial (solo PDF)"
            value={datos.url_ine}
            folder="referenciadores/ine"
            onChange={(url) => actualizar('url_ine', url)}
            accept={['application/pdf']}
          />
        </div>

        {/* Datos bancarios — opcionales, nunca bloquean el guardado */}
        <div className="pt-2 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Datos bancarios (opcionales)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              label="Número de cuenta"
              valor={datos.numero_cuenta}
              onChange={(v) => actualizar('numero_cuenta', v)}
              placeholder="CLABE o cuenta"
            />
            <Campo
              label="Banco"
              valor={datos.banco}
              onChange={(v) => actualizar('banco', v)}
              placeholder="Nombre del banco"
            />
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
        )}
        {exito && (
          <p className="text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-xl">
            ✓ Guardado correctamente. Redirigiendo...
          </p>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => navigate(esEdicion && id ? `/referenciadores/${id}` : '/referenciadores')}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || exito}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                       bg-sky-500 text-white rounded-xl hover:bg-sky-600
                       transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear referenciador'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormularioReferenciador;
