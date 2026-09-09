import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  UserX,
  ExternalLink,
  Phone,
  Landmark,
  Link2,
} from 'lucide-react';
import { ReferenciadorDetalle, ReferenciaConOrigen } from '../../types/referenciador.types';
import {
  obtenerReferenciador,
  darDeBajaReferenciador,
} from '../../services/referenciadoresService';
import {
  BadgeForma,
  BadgeEstado,
  PENDIENTE_MOTOR,
} from '../../components/referenciadores/TablaReferenciadores';

// Monto sin calcular: `—` con tooltip mientras el motor (M12) no exista. Nunca 0.00.
const MontoPendiente: React.FC<{ grande?: boolean }> = ({ grande }) => (
  <span className={`text-slate-400 ${grande ? 'text-2xl font-bold' : ''}`} title={PENDIENTE_MOTOR}>
    —
  </span>
);

// pg serializa DATE como ISO; con los primeros 10 caracteres alcanza.
const fmtFecha = (f: string) => String(f).slice(0, 10);

const etiquetaOrigen = (r: ReferenciaConOrigen) =>
  `${r.tipo_referido === 'inversion' ? 'Inversión de' : 'Préstamo de'} ${r.origen_nombre}`;

const DetalleReferenciador: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [datos, setDatos]       = useState<ReferenciadorDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      setDatos(await obtenerReferenciador(id));
    } catch {
      setError('No se pudo cargar el referenciador.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleBaja = async () => {
    if (!id) return;
    setConfirmandoBaja(false);
    try {
      await darDeBajaReferenciador(id);
      await cargarDatos();
    } catch {
      setError('No se pudo dar de baja al referenciador.');
    }
  };

  // Cada fila es su propia línea de FIFO (R16): el origen navega a su pantalla.
  const abrirOrigen = (r: ReferenciaConOrigen) => {
    if (r.tipo_referido === 'inversion' && r.origen_inversionista_id) {
      navigate(`/inversionistas/${r.origen_inversionista_id}`);
    } else if (r.tipo_referido === 'prestamo' && r.prestamo_id) {
      navigate(`/prestamos/${r.prestamo_id}`);
    }
  };

  if (cargando) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-24 bg-slate-100 rounded-2xl" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-red-600 flex-1">{error ?? 'Referenciador no encontrado.'}</p>
          <button onClick={cargarDatos} className="text-sm text-red-600 underline hover:no-underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const nombreCompleto =
    `${datos.nombres} ${datos.apellido_paterno}${datos.apellido_materno ? ` ${datos.apellido_materno}` : ''}`;
  const forma = datos.inversionista_id === null ? 3 : 2;

  return (
    <div className="p-6 lg:p-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate('/referenciadores')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            <ArrowLeft size={15} />
            Referenciadores
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{nombreCompleto}</h2>
            <BadgeForma forma={forma} />
            <BadgeEstado activo={datos.activo} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
            {datos.telefono && (
              <span className="flex items-center gap-1.5"><Phone size={14} />{datos.telefono}</span>
            )}
            {/* Cuenta y banco a la mano, para el momento de pagar (FLUJOS §4) */}
            {(datos.numero_cuenta || datos.banco) && (
              <span className="flex items-center gap-1.5">
                <Landmark size={14} />
                {[datos.banco, datos.numero_cuenta].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          {/* El formulario de edición llega en M22 */}
          <button
            disabled
            title="Pendiente: formulario de edición de referenciador (M22)"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-400
                       text-sm font-medium rounded-xl cursor-not-allowed"
          >
            <Pencil size={15} />
            Editar
          </button>
          {datos.activo && (
            confirmandoBaja ? (
              <button
                onClick={handleBaja}
                onBlur={() => setConfirmandoBaja(false)}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600
                           rounded-xl transition-colors"
              >
                ¿Confirmar baja?
              </button>
            ) : (
              <button
                onClick={() => setConfirmandoBaja(true)}
                title="Dar de baja (cambia estado, no borra)"
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200
                           text-slate-600 hover:text-red-600 hover:bg-red-50 text-sm font-medium
                           rounded-xl transition-colors"
              >
                <UserX size={15} />
                Dar de baja
              </button>
            )
          )}
        </div>
      </div>

      {/* Tres totales — sin calcular hasta que exista el motor (M12) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {['Devengado', 'Pagado', 'Se le debe'].map((etiqueta) => (
          <div key={etiqueta} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-medium mb-1">{etiqueta}</p>
            <MontoPendiente grande />
          </div>
        ))}
      </div>

      {/* Desglose — una fila por origen, nunca agregado por persona (R16).
          Sin botón de pagar: el pago vive en cuentas por pagar. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Referencias por origen</h3>
        </div>

        {datos.referencias.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Sin referencias ligadas.</p>
          </div>
        ) : (
          <>
            {/* ≥ sm: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">A qué está ligado</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">%</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Desde</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Devengado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Pagado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Se le debe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {datos.referencias.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => abrirOrigen(r)}
                          className="flex items-center gap-1.5 font-medium text-slate-800
                                     hover:text-sky-600 transition-colors text-left"
                        >
                          {etiquetaOrigen(r)}
                          <ExternalLink size={13} className="text-slate-400 shrink-0" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.tipo_referido === 'inversion' ? 'inversión' : 'préstamo'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.tasa}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(r.fecha_inicio)}</td>
                      <td className="px-4 py-3 text-right"><MontoPendiente /></td>
                      <td className="px-4 py-3 text-right"><MontoPendiente /></td>
                      <td className="px-4 py-3 text-right"><MontoPendiente /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* < sm (375px): tarjetas */}
            <div className="sm:hidden divide-y divide-slate-50">
              {datos.referencias.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      onClick={() => abrirOrigen(r)}
                      className="flex items-center gap-1.5 font-semibold text-slate-800
                                 hover:text-sky-600 transition-colors text-left"
                    >
                      {etiquetaOrigen(r)}
                      <ExternalLink size={13} className="text-slate-400 shrink-0" />
                    </button>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 font-medium">Se le debe</p>
                    <MontoPendiente grande />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{r.tipo_referido === 'inversion' ? 'inversión' : 'préstamo'}</span>
                    <span>{r.tasa} %</span>
                    <span>desde {fmtFecha(r.fecha_inicio)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetalleReferenciador;
