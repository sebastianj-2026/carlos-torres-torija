import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Gavel, User, DollarSign, Building2,
  Clock, AlertTriangle, FileText, Save, Plus, Trash2, Upload,
  Eye, BookOpen, Scale,
} from 'lucide-react';
import {
  JuicioDetalle, GastoLegal, DocumentoJuicio, BitacoraEntry,
  ETIQUETAS_ETAPA, COLORES_ETAPA, EtapaProcesal,
} from '../../types/juicio.types';
import {
  obtenerJuicio, actualizarJuicio,
  agregarGastoLegal, eliminarGastoLegal,
  subirDocumentoJuicio, fetchDocumentoJuicio, eliminarDocumentoJuicio,
  agregarBitacora,
} from '../../services/juiciosService';
import { fetchArchivoPrestamo } from '../../services/prestamosService';

const fmt = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof v === 'string' ? parseFloat(v) : v
  );
};

const fmtFecha = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const calcularDiasFecha = (fecha: string | null): { diff: number; clase: string; texto: string } | null => {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const obj = new Date(fecha + 'T12:00:00');
  const diff = Math.ceil((obj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { diff, clase: 'text-red-600 font-bold', texto: `VENCIDA hace ${Math.abs(diff)} días` };
  if (diff === 0) return { diff, clase: 'text-red-500 font-bold', texto: 'HOY' };
  if (diff <= 7)  return { diff, clase: 'text-sky-600 font-bold', texto: `en ${diff} días` };
  if (diff <= 30) return { diff, clase: 'text-yellow-600', texto: `en ${diff} días` };
  return { diff, clase: 'text-slate-600', texto: fmtFecha(fecha) };
};

const ETAPAS: EtapaProcesal[] = ['demanda', 'emplazamiento', 'pruebas', 'sentencia'];

type TabId = 'info' | 'gastos' | 'archivos' | 'bitacora';
const TABS: { id: TabId; label: string; Icono: React.ElementType }[] = [
  { id: 'info',     label: 'Información',    Icono: Scale     },
  { id: 'gastos',   label: 'Gastos Legales', Icono: DollarSign },
  { id: 'archivos', label: 'Archivero',      Icono: FileText  },
  { id: 'bitacora', label: 'Bitácora',       Icono: BookOpen  },
];

// ================================================================
// TAB: Información
// ================================================================
const TabInformacion: React.FC<{
  juicio: JuicioDetalle;
  onGuardado: () => void;
}> = ({ juicio, onGuardado }) => {
  const [form, setForm] = useState({
    abogado_nombre:            juicio.abogado_nombre ?? '',
    abogado_telefono:          juicio.abogado_telefono ?? '',
    abogado_email:             juicio.abogado_email ?? '',
    fecha_asignacion_abogado:  juicio.fecha_asignacion_abogado?.substring(0, 10) ?? '',
    etapa_procesal:            juicio.etapa_procesal,
    proxima_fecha_critica:     juicio.proxima_fecha_critica?.substring(0, 10) ?? '',
    descripcion_fecha_critica: juicio.descripcion_fecha_critica ?? '',
    notas:                     juicio.notas ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje]     = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      await actualizarJuicio(juicio.id, {
        abogado_nombre:            form.abogado_nombre || null,
        abogado_telefono:          form.abogado_telefono || null,
        abogado_email:             form.abogado_email || null,
        fecha_asignacion_abogado:  form.fecha_asignacion_abogado || null,
        etapa_procesal:            form.etapa_procesal,
        proxima_fecha_critica:     form.proxima_fecha_critica || null,
        descripcion_fecha_critica: form.descripcion_fecha_critica || null,
        notas:                     form.notas || null,
      });
      setMensaje({ tipo: 'ok', texto: 'Guardado correctamente.' });
      onGuardado();
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error al guardar.' });
    } finally {
      setGuardando(false);
    }
  };

  const campo = (label: string, key: keyof typeof form, tipo = 'text') => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={tipo}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Etapa */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">Etapa Procesal</label>
        <div className="flex flex-wrap gap-2">
          {ETAPAS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setForm((f) => ({ ...f, etapa_procesal: e }))}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                form.etapa_procesal === e
                  ? `${COLORES_ETAPA[e]} border-transparent shadow`
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {ETIQUETAS_ETAPA[e]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campo('Nombre del abogado', 'abogado_nombre')}
        {campo('Teléfono del abogado', 'abogado_telefono')}
        {campo('Email del abogado', 'abogado_email', 'email')}
        {campo('Fecha de asignación', 'fecha_asignacion_abogado', 'date')}
        {campo('Próxima fecha crítica', 'proxima_fecha_critica', 'date')}
        {campo('Descripción de la fecha crítica', 'descripcion_fecha_critica')}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Notas del expediente</label>
        <textarea
          value={form.notas}
          onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white resize-none"
        />
      </div>

      {mensaje && (
        <div className={`text-sm px-3 py-2 rounded-lg ${
          mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm
                   font-semibold rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
      >
        <Save size={15} />
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
};

// ================================================================
// TAB: Gastos Legales
// ================================================================
const TabGastos: React.FC<{
  juicioId: string;
  gastos: GastoLegal[];
  deudaBase: string;
  onCambio: () => void;
}> = ({ juicioId, gastos, deudaBase, onCambio }) => {
  const [form, setForm] = useState({ concepto: '', monto: '', fecha: '', notas: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalGastos = gastos.reduce((s, g) => s + parseFloat(g.monto), 0);
  const deudaTotal  = parseFloat(deudaBase) + totalGastos;

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.concepto || !form.monto) return;
    setGuardando(true); setError(null);
    try {
      await agregarGastoLegal(juicioId, {
        concepto: form.concepto,
        monto:    parseFloat(form.monto),
        fecha:    form.fecha || undefined,
        notas:    form.notas || undefined,
      });
      setForm({ concepto: '', monto: '', fecha: '', notas: '' });
      onCambio();
    } catch {
      setError('Error al registrar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (gastoId: string) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await eliminarGastoLegal(juicioId, gastoId);
      onCambio();
    } catch {
      setError('Error al eliminar el gasto.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Saldo préstamo</p>
          <p className="text-base font-bold text-slate-700">{fmt(deudaBase)}</p>
        </div>
        <div className="bg-sky-50 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Total gastos legales</p>
          <p className="text-base font-bold text-sky-600">{fmt(totalGastos)}</p>
        </div>
        <div className="bg-red-50 rounded-xl px-4 py-3 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-500">Deuda total del cliente</p>
          <p className="text-lg font-black text-red-600">{fmt(deudaTotal)}</p>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAgregar} className="bg-slate-50 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Registrar gasto</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Concepto (honorarios, notificación, perito...)"
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
            required
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <input
            type="number"
            placeholder="Monto $"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            min="0.01" step="0.01"
            required
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <input
            type="text"
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm
                     font-semibold rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {guardando ? 'Registrando...' : 'Agregar gasto'}
        </button>
      </form>

      {/* List */}
      {gastos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin gastos legales registrados.</p>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-slate-200">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Fecha</th>
                <th className="px-4 py-2.5 text-left">Concepto</th>
                <th className="px-4 py-2.5 text-right">Monto</th>
                <th className="px-4 py-2.5 text-left hidden sm:table-cell">Notas</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{g.concepto}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sky-600">{fmt(g.monto)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">{g.notas ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEliminar(g.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ================================================================
// TAB: Archivero Judicial
// ================================================================
const TabArchivero: React.FC<{
  juicio: JuicioDetalle;
  documentos: DocumentoJuicio[];
  onCambio: () => void;
}> = ({ juicio, documentos, onCambio }) => {
  const [nombre, setNombre]         = useState('');
  const [archivo, setArchivo]       = useState<File | null>(null);
  const [subiendo, setSubiendo]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [abriendo, setAbriendo]     = useState<string | null>(null);

  const handleSubir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) return;
    setSubiendo(true); setError(null);
    try {
      await subirDocumentoJuicio(juicio.id, archivo, nombre || undefined);
      setArchivo(null);
      setNombre('');
      onCambio();
    } catch {
      setError('Error al cargar el documento.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (docId: string) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await eliminarDocumentoJuicio(juicio.id, docId);
      onCambio();
    } catch {
      setError('Error al eliminar el documento.');
    }
  };

  const abrirDocJuicio = async (docId: string) => {
    setAbriendo(docId);
    try {
      const url = await fetchDocumentoJuicio(juicio.id, docId);
      window.open(url, '_blank');
    } catch {
      setError('No se pudo abrir el documento.');
    } finally {
      setAbriendo(null);
    }
  };

  const abrirDocOriginal = async (tipo: 'avaluo' | 'contrato_firmado') => {
    setAbriendo(tipo);
    try {
      const url = await fetchArchivoPrestamo(juicio.prestamo_id, tipo);
      window.open(url, '_blank');
    } catch {
      setError(`El documento "${tipo === 'avaluo' ? 'Avalúo' : 'Contrato'}" no está disponible.`);
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Original docs */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Documentos originales del préstamo</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => abrirDocOriginal('avaluo')}
            disabled={abriendo === 'avaluo'}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white
                       rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50
                       disabled:opacity-50 transition-colors"
          >
            <Eye size={14} className="text-blue-500" />
            {abriendo === 'avaluo' ? 'Abriendo...' : 'Ver Avalúo'}
          </button>
          <button
            onClick={() => abrirDocOriginal('contrato_firmado')}
            disabled={abriendo === 'contrato_firmado'}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white
                       rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50
                       disabled:opacity-50 transition-colors"
          >
            <Eye size={14} className="text-green-500" />
            {abriendo === 'contrato_firmado' ? 'Abriendo...' : 'Ver Contrato'}
          </button>
          <Link
            to={`/prestamos/${juicio.prestamo_id}`}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white
                       rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText size={14} className="text-sky-500" />
            Expediente completo del préstamo
          </Link>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>

      <hr className="border-slate-100" />

      {/* Upload */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Cargar documento del litigio (PDF)</h4>
        <form onSubmit={handleSubir} className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre del documento (ej. Demanda inicial)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300
                              rounded-lg cursor-pointer hover:border-sky-400 transition-colors bg-white">
              <Upload size={14} className="text-slate-400" />
              <span className="text-sm text-slate-500 truncate">
                {archivo ? archivo.name : 'Seleccionar PDF...'}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!archivo || subiendo}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm
                       font-semibold rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            <Upload size={14} />
            {subiendo ? 'Cargando...' : 'Subir documento'}
          </button>
        </form>
      </div>

      {/* Document list */}
      {documentos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin documentos judiciales cargados.</p>
      ) : (
        <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-slate-200">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Documento</th>
                <th className="px-4 py-2.5 text-left hidden sm:table-cell">Archivo original</th>
                <th className="px-4 py-2.5 text-right hidden sm:table-cell">Tamaño</th>
                <th className="px-4 py-2.5 text-left">Fecha</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documentos.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{d.nombre_documento}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono hidden sm:table-cell">{d.nombre_original ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs hidden sm:table-cell">
                    {d.tamano_bytes ? `${(d.tamano_bytes / 1024).toFixed(0)} KB` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {fmtDateTime(d.fecha_registro)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => abrirDocJuicio(d.id)}
                        disabled={abriendo === d.id}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50
                                   rounded-lg transition-colors disabled:opacity-50"
                        title="Ver"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => handleEliminar(d.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50
                                   rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ================================================================
// TAB: Bitácora
// ================================================================
const TabBitacora: React.FC<{
  juicioId: string;
  etapaActual: EtapaProcesal;
  bitacora: BitacoraEntry[];
  onCambio: () => void;
}> = ({ juicioId, etapaActual, bitacora, onCambio }) => {
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setGuardando(true); setError(null);
    try {
      await agregarBitacora(juicioId, { descripcion, etapa: etapaActual });
      setDescripcion('');
      onCambio();
    } catch {
      setError('Error al registrar la entrada.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add entry */}
      <form onSubmit={handleAgregar} className="bg-slate-50 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Nueva entrada en bitácora</h4>
        <textarea
          placeholder="Describe el avance, acuerdo o evento del caso..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          required
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white resize-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm
                     font-semibold rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {guardando ? 'Registrando...' : 'Agregar entrada'}
        </button>
      </form>

      {/* Log */}
      {bitacora.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin entradas en la bitácora.</p>
      ) : (
        <ol className="relative border-l border-slate-200 space-y-6 ml-2 sm:ml-3">
          {bitacora.map((entrada) => (
            <li key={entrada.id} className="ml-4 sm:ml-6">
              <span className="absolute -left-2.5 w-5 h-5 bg-sky-100 rounded-full border-2
                               border-sky-400 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              </span>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <time className="text-xs text-slate-400">{fmtDateTime(entrada.fecha_registro)}</time>
                  {entrada.etapa && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      COLORES_ETAPA[entrada.etapa as EtapaProcesal] ?? 'bg-slate-100 text-slate-500'
                    }`}>
                      {ETIQUETAS_ETAPA[entrada.etapa as EtapaProcesal] ?? entrada.etapa}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{entrada.descripcion}</p>
                {entrada.registrado_por && (
                  <p className="text-xs text-slate-400 mt-1.5">— {entrada.registrado_por}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

// ================================================================
// Página principal
// ================================================================
const ExpedienteJuicio: React.FC = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();

  const [juicio, setJuicio]       = useState<JuicioDetalle | null>(null);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tab, setTab]             = useState<TabId>('info');

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true); setError(null);
    try {
      const data = await obtenerJuicio(id);
      setJuicio(data);
    } catch {
      setError('No se pudo cargar el expediente del juicio.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !juicio) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error ?? 'Juicio no encontrado.'}
        </div>
      </div>
    );
  }

  const alertaFecha = calcularDiasFecha(juicio.proxima_fecha_critica);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/juicios')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={15} /> Juicios
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
                                  px-2.5 py-1 rounded-full ${COLORES_ETAPA[juicio.etapa_procesal]}`}>
                  <Gavel size={11} />
                  {ETIQUETAS_ETAPA[juicio.etapa_procesal]}
                </span>
                {juicio.folio && (
                  <span className="text-xs font-mono text-slate-400">{juicio.folio}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{juicio.cliente_nombre}</h1>
              {juicio.cliente_telefono && (
                <p className="text-sm text-slate-400 mt-0.5">{juicio.cliente_telefono}</p>
              )}
            </div>

            {juicio.proxima_fecha_critica && (
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1 justify-end">
                  <AlertTriangle size={11} /> Próxima fecha crítica
                </p>
                <p className={`text-sm font-bold ${alertaFecha?.clase ?? 'text-slate-600'}`}>
                  {fmtFecha(juicio.proxima_fecha_critica)}
                </p>
                {alertaFecha && (
                  <p className={`text-xs ${alertaFecha.clase}`}>{alertaFecha.texto}</p>
                )}
                {juicio.descripcion_fecha_critica && (
                  <p className="text-xs text-slate-400 italic mt-0.5">{juicio.descripcion_fecha_critica}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Financial strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          <div className="px-3 sm:px-5 py-4">
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <DollarSign size={11} /> Deuda total
            </p>
            <p className="text-lg sm:text-xl font-black text-red-600">{fmt(juicio.deuda_total)}</p>
          </div>
          <div className="px-3 sm:px-5 py-4">
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Building2 size={11} /> Valor propiedad
            </p>
            <p className="text-base font-bold text-slate-700">
              {juicio.valor_propiedad ? fmt(juicio.valor_propiedad) : '—'}
            </p>
          </div>
          <div className="px-3 sm:px-5 py-4">
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <User size={11} /> Abogado asignado
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {juicio.abogado_nombre ?? <span className="text-slate-400 italic font-normal">Sin asignar</span>}
            </p>
            {juicio.fecha_asignacion_abogado && (
              <p className="text-xs text-slate-400">{fmtFecha(juicio.fecha_asignacion_abogado)}</p>
            )}
          </div>
          <div className="px-3 sm:px-5 py-4">
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <Clock size={11} /> Último pago
            </p>
            <p className="text-sm font-semibold text-slate-700">{fmtFecha(juicio.fecha_ultimo_pago)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Inicio: {fmtFecha(juicio.fecha_inicio)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-1 bg-slate-100 rounded-xl p-1 mb-6 max-w-full">
          {TABS.map(({ id: tid, label, Icono }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                tab === tid
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icono size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {tab === 'info' && (
            <TabInformacion juicio={juicio} onGuardado={cargar} />
          )}
          {tab === 'gastos' && (
            <TabGastos
              juicioId={juicio.id}
              gastos={juicio.gastos}
              deudaBase={juicio.saldo_pendiente}
              onCambio={cargar}
            />
          )}
          {tab === 'archivos' && (
            <TabArchivero
              juicio={juicio}
              documentos={juicio.documentos}
              onCambio={cargar}
            />
          )}
          {tab === 'bitacora' && (
            <TabBitacora
              juicioId={juicio.id}
              etapaActual={juicio.etapa_procesal}
              bitacora={juicio.bitacora}
              onCambio={cargar}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpedienteJuicio;
