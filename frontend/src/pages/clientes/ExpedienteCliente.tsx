import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ExpedienteCompleto,
  EstatusCliente,
  COLORES_ESTATUS,
  ETIQUETAS_ESTATUS,
  ReferenciaCliente,
  DocumentoCliente,
} from '../../types/cliente.types';
import { obtenerCliente, cambiarEstatus } from '../../services/clientesService';
import ChecklistDocumentos from '../../components/clientes/ChecklistDocumentos';
import FormReferencias from '../../components/clientes/FormReferencias';
import PanelDeudaCliente from '../../components/pagos/PanelDeudaCliente';

// Header del sistema
const Header: React.FC<{ nombre: string }> = ({ nombre }) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/clientes')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-sky-500 font-black text-xs">PF</span>
            </div>
          </button>
          <span className="text-slate-300 shrink-0">/</span>
          <button
            onClick={() => navigate('/clientes')}
            className="text-sm text-slate-500 hover:text-slate-700 shrink-0"
          >
            Clientes
          </button>
          <span className="text-slate-300 shrink-0">/</span>
          <span className="text-sm font-medium text-slate-700 truncate">{nombre}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
            <span className="text-sky-600 font-bold text-sm uppercase">
              {usuario?.nombre?.charAt(0) ?? 'U'}
            </span>
          </div>
          <button onClick={logout} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

// Fila de dato del expediente
const FilaDato: React.FC<{ etiqueta: string; valor?: string | null }> = ({ etiqueta, valor }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 sm:w-40 shrink-0">{etiqueta}</span>
    <span className="text-sm text-slate-700 font-medium">
      {valor || <span className="text-slate-300 font-normal">—</span>}
    </span>
  </div>
);

// Selector de estatus
const SelectorEstatus: React.FC<{
  clienteId: string;
  estatusActual: EstatusCliente;
  onCambiado: (nuevoEstatus: EstatusCliente) => void;
}> = ({ clienteId, estatusActual, onCambiado }) => {
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ESTATUS_LISTA: EstatusCliente[] = ['activo', 'atrasado', 'negociado', 'en_juicio', 'inactivo'];

  const handleCambio = async (nuevoEstatus: EstatusCliente) => {
    if (nuevoEstatus === estatusActual) return;
    setCambiando(true);
    setError(null);
    try {
      await cambiarEstatus(clienteId, nuevoEstatus);
      onCambiado(nuevoEstatus);
    } catch {
      setError('Error al cambiar estatus.');
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mt-2">
        {ESTATUS_LISTA.map((est) => (
          <button
            key={est}
            onClick={() => handleCambio(est)}
            disabled={cambiando || est === estatusActual}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${est === estatusActual
                ? `${COLORES_ESTATUS[est]} ring-2 ring-offset-1 ring-current cursor-default`
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50'
              }`}
          >
            {ETIQUETAS_ESTATUS[est]}
          </button>
        ))}
        {cambiando && (
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin self-center" />
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
};

// Tabs para las secciones del expediente
type TabId = 'datos' | 'documentos' | 'referencias' | 'deudas';
const TABS: { id: TabId; label: string }[] = [
  { id: 'datos',       label: 'Datos del expediente' },
  { id: 'documentos',  label: 'Documentos' },
  { id: 'referencias', label: 'Referencias' },
  { id: 'deudas',      label: 'Deudas y Pagos' },
];

const ExpedienteCliente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expediente, setExpediente] = useState<ExpedienteCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabId>('datos');

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerCliente(id);
      setExpediente(datos);
    } catch {
      setError('No se pudo cargar el expediente del cliente.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const nombreCompleto = expediente
    ? [expediente.apellido_paterno, expediente.apellido_materno, expediente.nombres]
        .filter(Boolean)
        .join(' ')
    : '';

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header nombre="Cargando..." />
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !expediente) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header nombre="Error" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-medium">{error || 'Cliente no encontrado.'}</p>
            <button
              onClick={() => navigate('/clientes')}
              className="mt-4 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fechaFormato = (fecha: string | null) =>
    fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header nombre={nombreCompleto} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Encabezado del expediente */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4 w-full sm:w-auto">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center shrink-0">
                <span className="text-sky-600 font-black text-xl uppercase">
                  {expediente.nombres.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{nombreCompleto}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {expediente.rfc && (
                    <span className="text-sm text-slate-500">RFC: <strong className="text-slate-700">{expediente.rfc}</strong></span>
                  )}
                  {expediente.telefono_celular && (
                    <span className="text-sm text-slate-500">{expediente.telefono_celular}</span>
                  )}
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${COLORES_ESTATUS[expediente.estatus]}`}>
                    {ETIQUETAS_ESTATUS[expediente.estatus]}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón editar */}
            <button
              onClick={() => navigate(`/clientes/${expediente.id}/editar`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200
                         text-slate-600 rounded-xl hover:bg-slate-50 transition-colors self-start"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          </div>

          {/* Cambio de estatus */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">Cambiar estatus:</p>
            <SelectorEstatus
              clienteId={expediente.id}
              estatusActual={expediente.estatus}
              onCambiado={(nuevoEstatus) =>
                setExpediente((prev) => prev ? { ...prev, estatus: nuevoEstatus } : prev)
              }
            />
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 mb-6 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tabActiva === tab.id
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

          {/* ── TAB: Datos ── */}
          {tabActiva === 'datos' && (
            <div className="space-y-8">
              {/* Datos personales */}
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Datos personales
                </h3>
                <div>
                  <FilaDato etiqueta="Nombre completo" valor={nombreCompleto} />
                  <FilaDato etiqueta="Fecha de nacimiento" valor={fechaFormato(expediente.fecha_nacimiento)} />
                  <FilaDato etiqueta="RFC" valor={expediente.rfc} />
                  <FilaDato etiqueta="CURP" valor={expediente.curp} />
                  <FilaDato etiqueta="Teléfono celular" valor={expediente.telefono_celular} />
                  <FilaDato etiqueta="Teléfono adicional" valor={expediente.telefono_adicional} />
                  <FilaDato etiqueta="Correo electrónico" valor={expediente.correo} />
                </div>
              </section>

              {/* Domicilio */}
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Domicilio
                </h3>
                <div>
                  <FilaDato
                    etiqueta="Dirección"
                    valor={[
                      expediente.calle,
                      expediente.numero_exterior && `#${expediente.numero_exterior}`,
                      expediente.numero_interior && `Int. ${expediente.numero_interior}`,
                    ].filter(Boolean).join(' ') || null}
                  />
                  <FilaDato etiqueta="Colonia" valor={expediente.colonia} />
                  <FilaDato etiqueta="Municipio" valor={expediente.municipio} />
                  <FilaDato etiqueta="Estado" valor={expediente.estado} />
                  <FilaDato etiqueta="Código postal" valor={expediente.codigo_postal} />
                </div>
              </section>

              {/* Trabajo */}
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Trabajo
                </h3>
                <div>
                  <FilaDato etiqueta="Ocupación" valor={expediente.ocupacion} />
                  <FilaDato etiqueta="Empresa / negocio" valor={expediente.nombre_trabajo} />
                  <FilaDato etiqueta="Teléfono del trabajo" valor={expediente.telefono_trabajo} />
                </div>
              </section>

              {/* Expediente físico */}
              <section>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Expediente físico
                </h3>
                <div>
                  <FilaDato etiqueta="Ubicación" valor={expediente.ubicacion_expediente} />
                  <FilaDato etiqueta="Fecha de registro" valor={fechaFormato(expediente.fecha_registro)} />
                  <FilaDato etiqueta="Última actualización" valor={fechaFormato(expediente.fecha_actualizacion)} />
                </div>
              </section>
            </div>
          )}

          {/* ── TAB: Documentos ── */}
          {tabActiva === 'documentos' && (
            <ChecklistDocumentos
              clienteId={expediente.id}
              documentos={expediente.documentos}
              onActualizado={(docs: DocumentoCliente[]) =>
                setExpediente((prev) => prev ? { ...prev, documentos: docs } : prev)
              }
            />
          )}

          {/* ── TAB: Referencias ── */}
          {tabActiva === 'referencias' && (
            <FormReferencias
              clienteId={expediente.id}
              referencias={expediente.referencias}
              onActualizado={(refs: ReferenciaCliente[]) =>
                setExpediente((prev) => prev ? { ...prev, referencias: refs } : prev)
              }
            />
          )}

          {/* ── TAB: Deudas y Pagos ── */}
          {tabActiva === 'deudas' && (
            <PanelDeudaCliente
              clienteId={expediente.id}
              nombreCliente={nombreCompleto}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ExpedienteCliente;
