import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormularioClienteData } from '../../types/cliente.types';
import { crearCliente, editarCliente, obtenerCliente } from '../../services/clientesService';

// Header del sistema


// Indicador de pasos del stepper
const Stepper: React.FC<{ pasoActual: number; pasos: string[] }> = ({ pasoActual, pasos }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {pasos.map((nombre, idx) => {
      const num = idx + 1;
      const activo = num === pasoActual;
      const completado = num < pasoActual;
      return (
        <React.Fragment key={num}>
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                completado
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : activo
                  ? 'bg-white border-orange-500 text-orange-500'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {completado ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : num}
            </div>
            <span className={`text-xs mt-1.5 font-medium hidden sm:block ${activo ? 'text-orange-600' : 'text-slate-400'}`}>
              {nombre}
            </span>
          </div>
          {idx < pasos.length - 1 && (
            <div className={`h-0.5 w-12 sm:w-16 mx-1 mb-5 transition-colors ${completado ? 'bg-orange-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// Campo de formulario reutilizable
const Campo: React.FC<{
  label: string;
  name: keyof FormularioClienteData;
  value: string;
  onChange: (name: keyof FormularioClienteData, value: string) => void;
  tipo?: string;
  requerido?: boolean;
  placeholder?: string;
  mayusculas?: boolean;
  error?: string;
}> = ({ label, name, value, onChange, tipo = 'text', requerido, placeholder, mayusculas, error }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1.5">
      {label} {requerido && <span className="text-orange-500">*</span>}
    </label>
    <input
      type={tipo}
      value={value}
      onChange={(e) => onChange(name, mayusculas ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-white text-slate-800
                 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent
                 transition-all duration-150 ${
                   error
                     ? 'border-red-300 focus:ring-red-400'
                     : 'border-slate-200 focus:ring-orange-400'
                 }`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

// Campo de fecha con formato DD/MM/AAAA — auto-inserta barras al escribir
const CampoFecha: React.FC<{
  label: string;
  name: keyof FormularioClienteData;
  value: string; // almacenado internamente como DD/MM/AAAA
  onChange: (name: keyof FormularioClienteData, value: string) => void;
  requerido?: boolean;
}> = ({ label, name, value, onChange, requerido }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloDigitos = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formateado = soloDigitos;
    if (soloDigitos.length > 4) {
      formateado = `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2, 4)}/${soloDigitos.slice(4)}`;
    } else if (soloDigitos.length > 2) {
      formateado = `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2)}`;
    }
    onChange(name, formateado);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label} {requerido && <span className="text-orange-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="DD/MM/AAAA"
        maxLength={10}
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800
                   placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400
                   focus:border-transparent transition-all duration-150"
      />
    </div>
  );
};

// Convierte "1990-01-15" (ISO) → "15/01/1990" (display)
const isoADDMMYYYY = (fechaISO: string): string => {
  if (!fechaISO || fechaISO.length < 10) return '';
  const [anio, mes, dia] = fechaISO.split('-');
  if (!dia || !mes || !anio) return '';
  return `${dia}/${mes}/${anio}`;
};

// Convierte "15/01/1990" (display) → "1990-01-15" (ISO para backend)
const ddMMYYYYaISO = (fecha: string): string => {
  const partes = fecha.split('/');
  if (partes.length !== 3 || partes[2].length !== 4) return '';
  const [dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
};

// Datos iniciales del formulario
const DATOS_INICIALES: FormularioClienteData = {
  nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', rfc: '', curp: '',
  telefono_celular: '', telefono_adicional: '', correo: '',
  calle: '', numero_exterior: '', numero_interior: '',
  colonia: '', municipio: '', estado: '', codigo_postal: '',
  ocupacion: '', nombre_trabajo: '', telefono_trabajo: '',
  ubicacion_expediente: '',
};

const PASOS = ['Datos personales', 'Domicilio y trabajo', 'Documentos', 'Referencias'];

// Regex que elimina caracteres no permitidos por campo
const FILTROS_CAMPO: Partial<Record<keyof FormularioClienteData, RegExp>> = {
  curp:               /[^A-Z0-9]/g,
  rfc:                /[^A-Z0-9]/g,
  telefono_celular:   /[^0-9]/g,
  telefono_adicional: /[^0-9]/g,
  estado:             /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
  municipio:          /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
};

// Longitud máxima por campo
const MAX_LONGITUD_CAMPO: Partial<Record<keyof FormularioClienteData, number>> = {
  curp:               18,
  rfc:                13,
  telefono_celular:   10,
  telefono_adicional: 10,
};

// Mensajes de error por campo
const MENSAJES_ERROR_CAMPO: Partial<Record<keyof FormularioClienteData, string>> = {
  curp:               'CURP solo permite letras y números',
  rfc:                'RFC solo permite letras y números',
  telefono_celular:   'El teléfono debe tener 10 dígitos',
  telefono_adicional: 'El teléfono debe tener 10 dígitos',
  estado:             'El estado solo permite letras',
  municipio:          'El municipio solo permite letras',
};

type ErroresValidacion = Partial<Record<keyof FormularioClienteData, string>>;

const FormularioCliente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState<FormularioClienteData>(DATOS_INICIALES);
  const [erroresValidacion, setErroresValidacion] = useState<ErroresValidacion>({});
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(esEdicion);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos si es edición — convierte fechas ISO → DD/MM/AAAA para mostrar
  useEffect(() => {
    if (esEdicion && id) {
      const cargar = async () => {
        try {
          const expediente = await obtenerCliente(id);
          setDatos({
            nombres: expediente.nombres || '',
            apellido_paterno: expediente.apellido_paterno || '',
            apellido_materno: expediente.apellido_materno || '',
            fecha_nacimiento: expediente.fecha_nacimiento
              ? isoADDMMYYYY(expediente.fecha_nacimiento.split('T')[0])
              : '',
            rfc: expediente.rfc || '',
            curp: expediente.curp || '',
            telefono_celular: expediente.telefono_celular || '',
            telefono_adicional: expediente.telefono_adicional || '',
            correo: expediente.correo || '',
            calle: expediente.calle || '',
            numero_exterior: expediente.numero_exterior || '',
            numero_interior: expediente.numero_interior || '',
            colonia: expediente.colonia || '',
            municipio: expediente.municipio || '',
            estado: expediente.estado || '',
            codigo_postal: expediente.codigo_postal || '',
            ocupacion: expediente.ocupacion || '',
            nombre_trabajo: expediente.nombre_trabajo || '',
            telefono_trabajo: expediente.telefono_trabajo || '',
            ubicacion_expediente: expediente.ubicacion_expediente || '',
          });
        } catch {
          setError('No se pudieron cargar los datos del cliente.');
        } finally {
          setCargandoDatos(false);
        }
      };
      cargar();
    }
  }, [esEdicion, id]);

  // Calcula el mensaje de error para un campo dado su valor ya procesado
  const calcularError = (
    name: keyof FormularioClienteData,
    valorProcesado: string,
    valorOriginal: string,
  ): string => {
    const filtro = FILTROS_CAMPO[name];
    const maxLen = MAX_LONGITUD_CAMPO[name];
    const mensaje = MENSAJES_ERROR_CAMPO[name];

    if (!filtro || !mensaje) return '';

    // Detectar si el filtro eliminó algún carácter
    const valorSinInvalidos = valorOriginal.replace(filtro, '');
    const seFiltraron = valorSinInvalidos !== valorOriginal.slice(0, maxLen ?? valorOriginal.length);

    if (seFiltraron) return mensaje;

    // Para teléfonos: error si está parcialmente lleno
    if (
      (name === 'telefono_celular' || name === 'telefono_adicional') &&
      valorProcesado.length > 0 &&
      valorProcesado.length < 10
    ) {
      return mensaje;
    }

    return '';
  };

  const handleCampo = (name: keyof FormularioClienteData, valor: string) => {
    const filtro = FILTROS_CAMPO[name];
    const maxLen = MAX_LONGITUD_CAMPO[name];

    // Aplicar filtro de caracteres y límite de longitud
    let valorProcesado = filtro ? valor.replace(filtro, '') : valor;
    if (maxLen !== undefined) valorProcesado = valorProcesado.slice(0, maxLen);

    setDatos((prev) => ({ ...prev, [name]: valorProcesado }));
    setError(null);

    const mensajeError = calcularError(name, valorProcesado, valor);
    setErroresValidacion((prev) => ({ ...prev, [name]: mensajeError }));
  };

  // Devuelve true si algún campo del paso actual tiene error activo
  const hayErroresEnPaso = (numeroPaso: number): boolean => {
    const camposPaso1: (keyof FormularioClienteData)[] = ['curp', 'rfc', 'telefono_celular', 'telefono_adicional'];
    const camposPaso2: (keyof FormularioClienteData)[] = ['estado', 'municipio'];
    const campos = numeroPaso === 1 ? camposPaso1 : camposPaso2;
    return campos.some((c) => !!erroresValidacion[c]);
  };

  // Validación de campos obligatorios del paso 1
  const validarPaso1 = (): boolean => {
    if (!datos.nombres.trim()) { setError('El campo Nombres es obligatorio.'); return false; }
    if (!datos.apellido_paterno.trim()) { setError('El Apellido Paterno es obligatorio.'); return false; }
    return true;
  };

  const handleSiguiente = () => {
    setError(null);
    if (paso === 1 && !validarPaso1()) return;
    if (paso < 4) setPaso(paso + 1);
  };

  const handleAnterior = () => {
    if (paso > 1) setPaso(paso - 1);
  };

  // Convierte fechas en display (DD/MM/AAAA) a ISO (YYYY-MM-DD) antes de enviar al backend
  const prepararDatosParaEnvio = (): FormularioClienteData => ({
    ...datos,
    fecha_nacimiento: datos.fecha_nacimiento ? ddMMYYYYaISO(datos.fecha_nacimiento) : '',
  });

  // Guardar cliente — ocurre en el último paso (paso 4)
  const handleGuardar = async () => {
    if (!validarPaso1()) return;
    setCargando(true);
    setError(null);
    try {
      const datosParaEnvio = prepararDatosParaEnvio();
      if (esEdicion && id) {
        await editarCliente(id, datosParaEnvio);
        navigate(`/clientes/${id}`);
      } else {
        const resultado = await crearCliente(datosParaEnvio);
        navigate(`/clientes/${resultado.cliente.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="min-h-screen bg-slate-50">
        
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
     

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {esEdicion ? 'Editar expediente' : 'Registrar nuevo cliente'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Completa los datos del expediente del cliente.
          </p>
        </div>

        <Stepper pasoActual={paso} pasos={PASOS} />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">

          {/* ── PASO 1: Datos personales ── */}
          {paso === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-700 mb-5">Datos personales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Nombres" name="nombres" value={datos.nombres} onChange={handleCampo} requerido placeholder="Ej: Juan Carlos" />
                <Campo label="Apellido paterno" name="apellido_paterno" value={datos.apellido_paterno} onChange={handleCampo} requerido placeholder="Ej: García" />
                <Campo label="Apellido materno" name="apellido_materno" value={datos.apellido_materno} onChange={handleCampo} placeholder="Ej: López" />
                <CampoFecha
                  label="Fecha de nacimiento"
                  name="fecha_nacimiento"
                  value={datos.fecha_nacimiento}
                  onChange={handleCampo}
                />
                <Campo
                  label="RFC" name="rfc" value={datos.rfc} onChange={handleCampo}
                  placeholder="XXXX000000XXX" mayusculas
                  error={erroresValidacion.rfc}
                />
                <Campo
                  label="CURP" name="curp" value={datos.curp} onChange={handleCampo}
                  placeholder="XXXX000000XXXXXX00" mayusculas
                  error={erroresValidacion.curp}
                />
                <Campo
                  label="Teléfono celular" name="telefono_celular" value={datos.telefono_celular}
                  onChange={handleCampo} placeholder="10 dígitos"
                  error={erroresValidacion.telefono_celular}
                />
                <Campo
                  label="Teléfono adicional" name="telefono_adicional" value={datos.telefono_adicional}
                  onChange={handleCampo} placeholder="Opcional"
                  error={erroresValidacion.telefono_adicional}
                />
              </div>
              <Campo label="Correo electrónico" name="correo" value={datos.correo} onChange={handleCampo} tipo="email" placeholder="correo@ejemplo.com" />
            </div>
          )}

          {/* ── PASO 2: Domicilio y trabajo ── */}
          {paso === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-700 mb-4">Domicilio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Campo label="Calle" name="calle" value={datos.calle} onChange={handleCampo} placeholder="Nombre de la calle" />
                  </div>
                  <Campo label="Número exterior" name="numero_exterior" value={datos.numero_exterior} onChange={handleCampo} placeholder="Ej: 42" />
                  <Campo label="Número interior" name="numero_interior" value={datos.numero_interior} onChange={handleCampo} placeholder="Ej: Depto 3" />
                  <Campo label="Colonia" name="colonia" value={datos.colonia} onChange={handleCampo} placeholder="Colonia" />
                  <Campo
                    label="Municipio / Alcaldía" name="municipio" value={datos.municipio}
                    onChange={handleCampo} placeholder="Municipio"
                    error={erroresValidacion.municipio}
                  />
                  <Campo
                    label="Estado" name="estado" value={datos.estado}
                    onChange={handleCampo} placeholder="Estado"
                    error={erroresValidacion.estado}
                  />
                  <Campo label="Código postal" name="codigo_postal" value={datos.codigo_postal} onChange={handleCampo} placeholder="00000" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-base font-semibold text-slate-700 mb-4">Trabajo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="Ocupación" name="ocupacion" value={datos.ocupacion} onChange={handleCampo} placeholder="Ej: Comerciante" />
                  <Campo label="Nombre del trabajo / empresa" name="nombre_trabajo" value={datos.nombre_trabajo} onChange={handleCampo} placeholder="Nombre de empresa" />
                  <Campo label="Teléfono del trabajo" name="telefono_trabajo" value={datos.telefono_trabajo} onChange={handleCampo} placeholder="10 dígitos" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-base font-semibold text-slate-700 mb-4">Expediente físico</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Ubicación del expediente</label>
                  <textarea
                    value={datos.ubicacion_expediente}
                    onChange={(e) => handleCampo('ubicacion_expediente', e.target.value)}
                    placeholder="Ej: Archivero 3, cajón B, carpeta naranja..."
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white
                               text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2
                               focus:ring-orange-400 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 3: Documentos ── */}
          {paso === 3 && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-medium text-slate-700">Documentos del expediente</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Los documentos se agregan desde el expediente del cliente una vez que el registro esté completo.
              </p>
            </div>
          )}

          {/* ── PASO 4: Referencias ── */}
          {paso === 4 && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-medium text-slate-700">Referencias personales</p>
              <p className="text-sm text-slate-500 max-w-sm">
                Las referencias se agregan desde el expediente. Puedes guardar el cliente ahora y completarlas después.
              </p>
            </div>
          )}

          {/* Mensaje de error general */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── Navegación del stepper — todos los pasos ── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            {/* Botón izquierdo */}
            <button
              onClick={paso === 1 ? () => navigate('/clientes') : handleAnterior}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:text-slate-700
                         rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {paso === 1 ? 'Cancelar' : 'Anterior'}
            </button>

            {/* Botones derechos */}
            <div className="flex gap-3">
              {/* Paso 2 y 3: Saltar → va directo al paso 4 */}
              {(paso === 2 || paso === 3) && (
                <button
                  onClick={() => setPaso(4)}
                  className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg
                             hover:bg-slate-50 transition-colors"
                >
                  Saltar
                </button>
              )}

              {/* Paso 4: Saltar / Finalizar (secundario) guarda y redirige */}
              {paso === 4 && (
                <button
                  onClick={handleGuardar}
                  disabled={cargando}
                  className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg
                             hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Saltar / Finalizar
                </button>
              )}

              {/* Botón primario: Siguiente (pasos 1-3) o Guardar (paso 4) */}
              <button
                onClick={paso === 4 ? handleGuardar : handleSiguiente}
                disabled={cargando || hayErroresEnPaso(paso)}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600
                           text-white text-sm font-medium rounded-lg shadow-sm
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {cargando && paso === 4 && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {paso === 4
                  ? (esEdicion ? 'Guardar cambios' : 'Guardar')
                  : 'Siguiente'}
                {paso < 4 && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default FormularioCliente;
