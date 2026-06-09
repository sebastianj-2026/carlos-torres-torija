import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, DollarSign, FileText,
  TrendingDown, AlertTriangle, User, ChevronDown, RefreshCw,
  CheckCircle2, XCircle, Eye, Download,
} from 'lucide-react';
import {
  ExpedientePrestamo as TExpediente, EstatusPrestamo, MoratorioPrestamo,
  ParticipantePrestamo, ArchivoPrestamoMeta, TipoArchivoPrestamo,
  COLORES_ESTATUS_PRESTAMO, ETIQUETAS_ESTATUS_PRESTAMO,
  ETIQUETAS_TIPO_GARANTIA, COLORES_TIPO_GARANTIA, ETIQUETAS_ARCHIVO_PRESTAMO,
} from '../../types/prestamo.types';
import {
  obtenerPrestamo, cambiarEstatusPrestamo,
  listarArchivosPrestamo, fetchArchivoPrestamo,
} from '../../services/prestamosService';
import { useAuth } from '../../context/AuthContext';
import HistorialPagos from '../../components/prestamos/HistorialPagos';
import TarjetaMoratorios from '../../components/prestamos/TarjetaMoratorios';
import ChecklistDocumentosPrestamo from '../../components/prestamos/ChecklistDocumentosPrestamo';
import ModalRegistrarPago from '../../components/prestamos/ModalRegistrarPago';
import ModalPerdonarMoratorio from '../../components/prestamos/ModalPerdonarMoratorio';

const archivosParaTipo = (tipo: string | null): TipoArchivoPrestamo[] => {
  if (tipo === 'pagare') return ['pagare_firmado', 'contrato_firmado'];
  if (tipo === 'otra')   return ['documento_propiedad', 'contrato_terminos'];
  return ['avaluo', 'gastos_notariales', 'escritura', 'contrato_firmado'];
};

const fmt = (valor: string | number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof valor === 'string' ? parseFloat(valor) : valor
  );

type TabId = 'pagos' | 'documentos' | 'moratorios';
const TABS: { id: TabId; label: string; Icono: React.ElementType }[] = [
  { id: 'pagos',      label: 'Historial de pagos', Icono: TrendingDown  },
  { id: 'documentos', label: 'Documentos',          Icono: FileText      },
  { id: 'moratorios', label: 'Moratorios',           Icono: AlertTriangle },
];

const ExpedientePrestamo: React.FC = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { usuario } = useAuth();
  const esAdmin     = usuario?.rol === 'administrador';

  const [expediente, setExpediente]           = useState<TExpediente | null>(null);
  const [archivosMeta, setArchivosMeta]       = useState<ArchivoPrestamoMeta[]>([]);
  const [cargando, setCargando]               = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [tabActiva, setTabActiva]             = useState<TabId>('pagos');
  const [modalPago, setModalPago]             = useState(false);
  const [moratorioSelec, setMoratorioSelec]   = useState<MoratorioPrestamo | null>(null);
  const [menuEstatus, setMenuEstatus]         = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      const [datos, metas] = await Promise.all([
        obtenerPrestamo(id),
        listarArchivosPrestamo(id).catch(() => [] as ArchivoPrestamoMeta[]),
      ]);
      setExpediente(datos);
      setArchivosMeta(metas);
    } catch {
      setError('No se pudo cargar el expediente del préstamo.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleVerArchivo = async (tipo: TipoArchivoPrestamo) => {
    if (!id) return;
    try {
      const url = await fetchArchivoPrestamo(id, tipo);
      window.open(url, '_blank');
    } catch { /* silencioso */ }
  };

  const handleDescargarArchivo = async (tipo: TipoArchivoPrestamo, nombre: string | null) => {
    if (!id) return;
    try {
      const url = await fetchArchivoPrestamo(id, tipo);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = nombre ?? `${tipo}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { /* silencioso */ }
  };

  const handleCambiarEstatus = async (estatus: EstatusPrestamo) => {
    if (!id) return;
    try {
      await cambiarEstatusPrestamo(id, estatus);
      setMenuEstatus(false);
      cargar();
    } catch { /* silencio */ }
  };

  if (cargando) {
    return (
      <div className="p-6 lg:p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-slate-200 rounded w-2/3" />)}
        </div>
      </div>
    );
  }

  if (error || !expediente) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-red-600 mb-4">{error ?? 'Préstamo no encontrado.'}</p>
        <button onClick={() => navigate('/prestamos')} className="text-orange-500 underline">
          Volver a la lista
        </button>
      </div>
    );
  }

  const pagosRealizados = (expediente.pagos ?? []).filter(
    (p) => p.tipo_pago !== 'interes_anticipado'
  ).length;
  const pct = expediente.plazo_meses > 0
    ? Math.min(100, (pagosRealizados / expediente.plazo_meses) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/prestamos')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">{expediente.cliente_nombre}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLORES_ESTATUS_PRESTAMO[expediente.estatus]}`}>
                {ETIQUETAS_ESTATUS_PRESTAMO[expediente.estatus]}
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              {expediente.folio ?? 'Sin folio'}
              {expediente.tipo_garantia && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${COLORES_TIPO_GARANTIA[expediente.tipo_garantia]}`}>
                  {ETIQUETAS_TIPO_GARANTIA[expediente.tipo_garantia]}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
          {/* Cambiar estatus — solo admin */}
          {esAdmin && (
            <div className="relative">
              <button
                onClick={() => setMenuEstatus(!menuEstatus)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                           border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Estatus
                <ChevronDown size={14} />
              </button>
              {menuEstatus && (
                <div className="absolute right-0 top-10 z-10 bg-white border border-slate-200
                                rounded-xl shadow-lg py-1 min-w-[160px]">
                  {(['activo','atrasado','en_juicio','liquidado','cancelado'] as EstatusPrestamo[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => handleCambiarEstatus(e)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 capitalize
                        ${expediente.estatus === e ? 'text-orange-600 font-semibold' : 'text-slate-700'}`}
                    >
                      {ETIQUETAS_ESTATUS_PRESTAMO[e]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => navigate(`/prestamos/${id}/editar`)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium
                       border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Pencil size={14} />
            Editar
          </button>

          <button
            onClick={() => setModalPago(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                       bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            <DollarSign size={14} />
            Registrar pago
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna izquierda ── */}
        <div className="space-y-5">
          {/* Resumen financiero */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Resumen financiero</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Monto prestado</p>
                <p className="font-bold text-slate-800">{fmt(expediente.monto_prestado)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Saldo pendiente</p>
                <p className="font-bold text-orange-600">{fmt(expediente.saldo_pendiente)}</p>
              </div>

              {/* Barra de progreso de pagos */}
              <div className="mt-1">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Pagos realizados</span>
                  <span className="font-semibold text-slate-600">
                    {pagosRealizados}&nbsp;/&nbsp;{expediente.plazo_meses}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">Interés mensual</p>
                  <p className="text-sm font-semibold text-green-600">
                    {fmt(parseFloat(expediente.saldo_pendiente) * parseFloat(expediente.tasa_interes_mensual) / 100)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">Interés anticipado</p>
                  <p className="text-sm font-medium text-slate-700">
                    {expediente.interes_anticipado ? fmt(expediente.interes_anticipado) : '—'}
                  </p>
                </div>
                {expediente.valor_propiedad && (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">Valor propiedad</p>
                    <p className="text-sm font-medium text-slate-700">{fmt(expediente.valor_propiedad)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Datos del préstamo */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Condiciones</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Tasa mensual',      `${expediente.tasa_interes_mensual}%`],
                ['Tasa moratoria',    `${expediente.tasa_moratoria_mensual}%`],
                ['Plazo',             `${expediente.plazo_meses} meses`],
                ['Inicio',            new Date(expediente.fecha_inicio.substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })],
                ['Vencimiento',       new Date(expediente.fecha_vencimiento.substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })],
                ...(expediente.tipo_garantia === 'hipotecaria' ? [['Notaría', expediente.notaria ?? '—']] : []),
                ...(expediente.tipo_garantia === 'pagare' && expediente.aval_nombre
                  ? [['Aval en pagaré', expediente.aval_nombre]]
                  : []),
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-2">
                  <span className="text-xs text-slate-400 shrink-0">{etiqueta}</span>
                  <span className="text-xs text-slate-700 font-medium text-right">{valor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Partes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Partes</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Cliente</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{expediente.cliente_nombre}</p>
                  {expediente.cliente_telefono && (
                    <p className="text-xs text-slate-500">{expediente.cliente_telefono}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Distribución del capital */}
          {expediente.participantes && expediente.participantes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 text-sm mb-4">Distribución del capital</h3>
              {parseFloat(expediente.comision_gestion_pct) > 0 && (
                <div className="mb-3 flex items-center justify-between text-xs bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <span className="text-purple-600 font-medium">Comisión de gestión (Oficina TS)</span>
                  <span className="font-bold text-purple-700">{expediente.comision_gestion_pct}%</span>
                </div>
              )}
              {(() => {
                const tasaPrestamo   = parseFloat(expediente.tasa_interes_mensual);
                const comisionPct    = parseFloat(expediente.comision_gestion_pct) || 0;
                const soloInv        = expediente.participantes.filter((p) => !p.es_oficina);
                // Diferencial total: suma de (capital_inv × (tasa_prestamo − tasa_inv) / 100)
                const diferencialTotal = soloInv.reduce((sum, p) => {
                  const m = parseFloat(p.monto_aportado);
                  const t = parseFloat(p.tasa_rendimiento);
                  return sum + m * (tasaPrestamo - t) / 100;
                }, 0);

                return (
                  <div className="space-y-3">
                    {expediente.participantes.map((part: ParticipantePrestamo) => {
                      const monto        = parseFloat(part.monto_aportado);
                      const tasa         = parseFloat(part.tasa_rendimiento);
                      const interesPropio = parseFloat(part.interes_mensual ?? '0');

                      if (part.es_oficina) {
                        const totalOficina = interesPropio + diferencialTotal;
                        return (
                          <div key={part.id} className="rounded-xl p-3 border bg-orange-50/60 border-orange-100">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-orange-700">Oficina TS</p>
                              <span className="text-xs text-slate-400">{tasa}%</span>
                            </div>
                            <div className="space-y-1 text-xs text-slate-500">
                              <div className="flex justify-between">
                                <span>Capital: <span className="font-semibold text-slate-700">{fmt(monto)}</span></span>
                                <span>Interés propio: <span className="font-semibold">{fmt(interesPropio)}/mes</span></span>
                              </div>
                              {diferencialTotal > 0.009 && (
                                <div className="flex justify-between text-orange-600">
                                  <span>+ Diferencial de tasa (inversionistas)</span>
                                  <span className="font-semibold">+ {fmt(diferencialTotal)}/mes</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-green-700 border-t border-orange-100 pt-1 mt-1">
                                <span>Total Oficina TS</span>
                                <span>{fmt(totalOficina)}/mes</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const comision   = interesPropio * comisionPct / 100;
                      const interesNeto = interesPropio - comision;
                      return (
                        <div key={part.id} className="rounded-xl p-3 border bg-slate-50 border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-700">
                              {part.inversionista_nombre ?? 'Inversionista'}
                            </p>
                            <span className="text-xs text-slate-400">{tasa}%</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Capital: <span className="font-semibold text-slate-700">{fmt(monto)}</span></span>
                            {comisionPct > 0 ? (
                              <span>
                                Bruto: <span className="font-semibold">{fmt(interesPropio)}</span>
                                {' — '}Neto: <span className="font-semibold text-green-600">{fmt(interesNeto)}/mes</span>
                              </span>
                            ) : (
                              <span>Interés: <span className="font-semibold text-green-600">{fmt(interesPropio)}/mes</span></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Columna derecha ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                  tabActiva === tab.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.Icono size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            {tabActiva === 'pagos' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700 text-sm">Historial de pagos</h3>
                  <button
                    onClick={() => setModalPago(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                               bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <DollarSign size={12} />
                    Registrar
                  </button>
                </div>
                <HistorialPagos pagos={expediente.pagos} />
              </div>
            )}

            {tabActiva === 'documentos' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-slate-700 text-sm">Documentos del expediente</h3>

                {/* Panel de archivos PDF — dinámico según tipo de garantía */}
                {(() => {
                  const TIPOS_PDF = archivosParaTipo(expediente.tipo_garantia);
                  const subidos = new Set(archivosMeta.map((m) => m.tipo));
                  const completos = TIPOS_PDF.every((t) => subidos.has(t));
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Archivos PDF</p>
                        {completos
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 size={13} /> Completos</span>
                          : <span className="flex items-center gap-1 text-xs font-semibold text-orange-500"><XCircle size={13} /> {TIPOS_PDF.filter((t) => !subidos.has(t)).length} pendiente(s)</span>
                        }
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {TIPOS_PDF.map((tipo) => {
                          const meta    = archivosMeta.find((m) => m.tipo === tipo);
                          const existe  = Boolean(meta);
                          const kb      = meta?.tamano_bytes ? `${(meta.tamano_bytes / 1024).toFixed(0)} KB` : '';
                          return (
                            <div key={tipo} className={`rounded-xl border p-3 flex items-start gap-3 ${
                              existe ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-slate-50'
                            }`}>
                              {existe
                                ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                : <XCircle     size={16} className="text-slate-300 mt-0.5 shrink-0" />
                              }
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold ${existe ? 'text-green-700' : 'text-slate-500'}`}>
                                  {ETIQUETAS_ARCHIVO_PRESTAMO[tipo]}
                                </p>
                                {existe
                                  ? <p className="text-[10px] text-slate-400 mt-0.5">{meta?.nombre_original ?? tipo} · {kb}</p>
                                  : <p className="text-[10px] text-slate-400 mt-0.5">Sin archivo</p>
                                }
                                {existe && (
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => handleVerArchivo(tipo)}
                                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1
                                                 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                                    >
                                      <Eye size={11} /> Ver
                                    </button>
                                    <button
                                      onClick={() => handleDescargarArchivo(tipo, meta?.nombre_original ?? null)}
                                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1
                                                 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      <Download size={11} /> Descargar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Checklist hipotecario (solo garantía hipotecaria) */}
                {(!expediente.tipo_garantia || expediente.tipo_garantia === 'hipotecaria') && (
                  <div className="border-t border-slate-100 pt-4">
                    <ChecklistDocumentosPrestamo
                      prestamoId={expediente.id}
                      documentos={expediente.documentos}
                      onActualizado={(docs) => setExpediente((prev) => prev ? { ...prev, documentos: docs } : prev)}
                    />
                  </div>
                )}

                {/* Descripción de garantía "Otra" */}
                {expediente.tipo_garantia === 'otra' && expediente.descripcion_garantia && (
                  <div className="border-t border-slate-100 pt-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">Descripción de la garantía</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{expediente.descripcion_garantia}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tabActiva === 'moratorios' && (
              <div>
                <h3 className="font-semibold text-slate-700 text-sm mb-4">Moratorios</h3>
                <TarjetaMoratorios
                  prestamoId={expediente.id}
                  moratorios={expediente.moratorios}
                  onPerdonar={(m) => setMoratorioSelec(m)}
                  onRecalculado={cargar}
                />
              </div>
            )}
          </div>

          {/* Renovación — solo admin, solo cuando está activo */}
          {esAdmin && expediente.estatus === 'activo' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm">Renovación</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Extiende o renueva este préstamo creando uno nuevo.
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/prestamos/${id}/renovar`)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                             border border-slate-200 text-slate-600 rounded-xl
                             hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  Renovar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {modalPago && (
        <ModalRegistrarPago
          prestamo={expediente}
          onCerrar={() => setModalPago(false)}
          onExito={() => { setModalPago(false); cargar(); }}
        />
      )}
      {moratorioSelec && (
        <ModalPerdonarMoratorio
          moratorio={moratorioSelec}
          onCerrar={() => setMoratorioSelec(null)}
          onExito={() => { setMoratorioSelec(null); cargar(); }}
        />
      )}

      {/* Overlay para cerrar menú estatus */}
      {menuEstatus && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuEstatus(false)} />
      )}
    </div>
  );
};

export default ExpedientePrestamo;
