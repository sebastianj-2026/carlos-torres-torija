import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Wallet, Upload, FileText, X, ExternalLink } from 'lucide-react';
import { FormularioInversionistaData } from '../../types/inversionista.types';
import {
  crearInversionista,
  editarInversionista,
  obtenerInversionista,
} from '../../services/inversionistasService';
import { subirArchivo, validarArchivo } from '../../services/storageService';

const DATOS_INICIALES: FormularioInversionistaData = {
  nombres:               '',
  apellido_paterno:      '',
  apellido_materno:      '',
  telefono:              '',
  correo:                '',
  url_ine:               '',
  monto_aportado_inicial: '',
  fecha_aportacion:      new Date().toISOString().split('T')[0],
};

// ── Helpers ───────────────────────────────────────────────────────
const mostrarMoneda = (raw: string): string => {
  if (!raw) return '';
  const tieneDecimal = raw.includes('.');
  const partes = raw.split('.');
  const entero = parseInt(partes[0] || '0', 10);
  if (isNaN(entero)) return '';
  const formatted = entero.toLocaleString('es-MX');
  return tieneDecimal ? `${formatted}.${(partes[1] || '').slice(0, 2)}` : formatted;
};

interface CampoProps {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  requerido?: boolean;
  placeholder?: string;
}
// Shared with FormularioReferenciador (P5: reuse, don't duplicate)
export const Campo: React.FC<CampoProps> = ({
  label, valor, onChange, tipo = 'text', requerido = false, placeholder,
}) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label}{requerido && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      type={tipo}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm
                 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
    />
  </div>
);

const CampoMoneda: React.FC<Omit<CampoProps, 'tipo'>> = ({
  label, valor, onChange, requerido = false, placeholder = '0.00',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw    = e.target.value.replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    let limpio   = partes[0];
    if (partes.length > 1) limpio += '.' + partes[1].slice(0, 2);
    onChange(limpio);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{requerido && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={mostrarMoneda(valor)}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
        />
      </div>
    </div>
  );
};

const fmtBytes = (b: number): string => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const FormularioInversionista: React.FC = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const esEdicion  = Boolean(id);
  const inputIneRef = useRef<HTMLInputElement>(null);

  const [datos, setDatos]         = useState<FormularioInversionistaData>(DATOS_INICIALES);
  const [archivoINE, setArchivoINE] = useState<File | null>(null);
  const [cargando, setCargando]   = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [exito, setExito]         = useState(false);

  useEffect(() => {
    if (!esEdicion || !id) return;
    const cargar = async () => {
      try {
        const perfil = await obtenerInversionista(id);
        setDatos({
          nombres:               perfil.nombres,
          apellido_paterno:      perfil.apellido_paterno,
          apellido_materno:      perfil.apellido_materno ?? '',
          telefono:              perfil.telefono         ?? '',
          correo:                perfil.correo           ?? '',
          url_ine:               perfil.url_ine          ?? '',
          monto_aportado_inicial: '',
          fecha_aportacion:      '',
        });
      } catch {
        setError('No se pudo cargar los datos del inversionista.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [esEdicion, id]);

  const actualizar = (campo: keyof FormularioInversionistaData, valor: string) => {
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

    setGuardando(true);
    setError(null);
    try {
      if (esEdicion && id) {
        let urlINE = datos.url_ine.trim() || undefined;
        if (archivoINE) {
          urlINE = await subirArchivo(archivoINE, `inversionistas/${id}/ine`);
        }
        await editarInversionista(id, {
          nombres:          datos.nombres.trim(),
          apellido_paterno: datos.apellido_paterno.trim(),
          apellido_materno: datos.apellido_materno.trim() || undefined,
          telefono:         datos.telefono.trim()         || undefined,
          correo:           datos.correo.trim()           || undefined,
          url_ine:          urlINE,
        });
        setExito(true);
        setTimeout(() => navigate(`/inversionistas/${id}`), 1200);
      } else {
        const montoNum = parseFloat((datos.monto_aportado_inicial || '').replace(/,/g, '')) || 0;
        const res = await crearInversionista({
          nombres:               datos.nombres.trim(),
          apellido_paterno:      datos.apellido_paterno.trim(),
          apellido_materno:      datos.apellido_materno.trim() || undefined,
          telefono:              datos.telefono.trim()         || undefined,
          correo:                datos.correo.trim()           || undefined,
          monto_aportado_inicial: montoNum > 0 ? montoNum : undefined,
          fecha_aportacion:      datos.fecha_aportacion || undefined,
        });
        const newId = res.inversionista.id;
        if (archivoINE) {
          const urlINE = await subirArchivo(archivoINE, `inversionistas/${newId}/ine`);
          await editarInversionista(newId, { url_ine: urlINE });
        }
        setExito(true);
        setTimeout(() => navigate(`/inversionistas/${newId}`), 1200);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosError?.response?.data?.mensaje ?? 'Error al guardar los datos.');
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
          onClick={() => navigate(esEdicion && id ? `/inversionistas/${id}` : '/inversionistas')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {esEdicion ? 'Editar inversionista' : 'Nuevo inversionista'}
          </h2>
          <p className="text-sm text-slate-500">
            {esEdicion ? 'Actualiza los datos personales' : 'Registra un nuevo inversionista'}
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
          </div>
        </div>

        {/* Documentos — INE */}
        <div className="pt-2 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Identificación (INE)
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              INE / Identificación oficial
              <span className="text-slate-400 font-normal ml-1">(PDF, JPG o PNG · máx. 5 MB)</span>
            </label>

            {/* Si ya hay URL guardada y no se seleccionó nuevo archivo */}
            {datos.url_ine && !archivoINE && (
              <div className="flex items-center gap-2 mb-2 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                <FileText size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs text-blue-700 font-medium truncate flex-1">Archivo guardado</span>
                <a
                  href={datos.url_ine}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-blue-500 hover:text-blue-700"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => actualizar('url_ine', '')}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Área de drop/click */}
            <div
              onClick={() => inputIneRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-4 transition-all
                          hover:border-sky-300 hover:bg-sky-50/20
                          ${archivoINE
                            ? 'border-green-300 bg-green-50/40'
                            : 'border-slate-200 bg-white'}`}
            >
              <input
                ref={inputIneRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const err = validarArchivo(file);
                  if (err) { setError(err); return; }
                  setArchivoINE(file);
                  setError(null);
                }}
                className="hidden"
              />
              {archivoINE ? (
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-green-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-green-700 truncate">{archivoINE.name}</p>
                    <p className="text-[10px] text-slate-400">{fmtBytes(archivoINE.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setArchivoINE(null); }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Clic para seleccionar archivo</p>
                    <p className="text-[10px] text-slate-400">PDF, JPG o PNG</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Capital Inicial — solo en creación */}
        {!esEdicion && (
          <div className="pt-2 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={14} className="text-sky-500" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Bolsa de Capital Inicial
              </p>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              El monto ingresa directamente al Capital Disponible del inversionista.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoMoneda
                label="Monto Aportado (Capital Inicial)"
                valor={datos.monto_aportado_inicial}
                onChange={(v) => actualizar('monto_aportado_inicial', v)}
                placeholder="0.00 (opcional)"
              />
              <Campo
                label="Fecha de Aportación"
                valor={datos.fecha_aportacion}
                onChange={(v) => actualizar('fecha_aportacion', v)}
                tipo="date"
              />
            </div>
          </div>
        )}

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
            onClick={() => navigate(esEdicion && id ? `/inversionistas/${id}` : '/inversionistas')}
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
            {guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear inversionista'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormularioInversionista;
