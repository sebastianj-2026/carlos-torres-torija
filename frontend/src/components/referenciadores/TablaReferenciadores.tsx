import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, UserCog, UserX, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PersonaLista, FormaPersona } from '../../types/referenciador.types';

export const PENDIENTE_MOTOR = 'Pendiente de habilitar el motor de comisiones';
const PENDIENTE_REFERENCIAS ='Pendiente: el conteo de referencias llega con el detalle (M7)';

// Badge de la forma de ganar
export const BadgeForma: React.FC<{ forma: FormaPersona }> = ({ forma }) => {
  const estilos: Record<FormaPersona, string> = {
    1: 'bg-green-50 text-green-600',
    2: 'bg-purple-50 text-purple-600',
    3: 'bg-sky-50 text-sky-600',
  };
  const textos: Record<FormaPersona, string> = {
    1: 'Solo inv.',
    2: 'Inv. y ref.',
    3: 'Solo ref.',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${estilos[forma]}`}>
      {textos[forma]}
    </span>
  );
};

// Badge de estado (P6: baja por bandera, nunca DELETE). Forma 1 no tiene bandera.
export const BadgeEstado: React.FC<{ activo: boolean | null }> = ({ activo }) => {
  if (activo === null) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
        activo ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-green-500' : 'bg-slate-400'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
};

// Formatea un NUMERIC como string a MXN sin pasar por float.
const fmtMonto = (v: string): string => {
  const [entero, decimales = ''] = v.split('.');
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${agrupado}.${decimales.padEnd(2, '0').slice(0, 2)}`;
};

// Se le debe: `—` con tooltip mientras el motor (M12) no exista. Nunca 0.00.
export const CeldaDeuda: React.FC<{ valor: string | null; grande?: boolean }> = ({ valor, grande }) => {
  if (valor === null) {
    return (
      <span className={`text-slate-400 ${grande ? 'text-2xl font-bold' : ''}`} title={PENDIENTE_MOTOR}>
        —
      </span>
    );
  }
  return (
    <span className={`text-slate-800 font-semibold ${grande ? 'text-2xl' : ''}`}>
      {fmtMonto(valor)}
    </span>
  );
};

// Al corriente: ✅ / ⚠️ según haya devengos pendientes. `—` mientras no exista el motor.
const CeldaCorriente: React.FC<{ valor: boolean | null }> = ({ valor }) => {
  if (valor === null) return <span className="text-slate-400" title={PENDIENTE_MOTOR}>—</span>;
  return valor ? (
    <CheckCircle2 size={16} className="text-green-500 inline" aria-label="Al corriente" />
  ) : (
    <AlertTriangle size={16} className="text-amber-500 inline" aria-label="Con devengos pendientes" />
  );
};

interface TablaReferenciadoresProps {
  personas: PersonaLista[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  cargando: boolean;
  onCambiarPagina: (pagina: number) => void;
  onDarDeBaja: (id: string) => void;
}

const EsqueletoFila: React.FC = () => (
  <tr className="animate-pulse">
    {[...Array(9)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

const TablaReferenciadores: React.FC<TablaReferenciadoresProps> = ({
  personas,
  total,
  pagina,
  limite,
  totalPaginas,
  cargando,
  onCambiarPagina,
  onDarDeBaja,
}) => {
  const navigate = useNavigate();
  // Baja con confirmación de dos clics: el primero arma, el segundo ejecuta.
  const [bajaPendiente, setBajaPendiente] = useState<string | null>(null);

  const nombreCompleto = (p: PersonaLista) =>
    `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ` ${p.apellido_materno}` : ''}`;

  // Forma 1 abre el perfil de inversionista; 2/3 el detalle de referenciador (M7).
  const rutaDetalle = (p: PersonaLista) =>
    p.forma === 1 ? `/inversionistas/${p.id}` : `/referenciadores/${p.id}`;

  const acciones = (p: PersonaLista) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => navigate(rutaDetalle(p))}
        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
        title={p.forma === 1 ? 'Ver perfil de inversionista' : 'Ver detalle'}
      >
        <Eye size={15} />
      </button>
      {p.forma !== 1 && p.activo === true && (
        bajaPendiente === p.id ? (
          <button
            onClick={() => { setBajaPendiente(null); onDarDeBaja(p.id); }}
            onBlur={() => setBajaPendiente(null)}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            ¿Confirmar baja?
          </button>
        ) : (
          <button
            onClick={() => setBajaPendiente(p.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Dar de baja (cambia estado, no borra)"
          >
            <UserX size={15} />
          </button>
        )
      )}
    </div>
  );

  if (!cargando && personas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserCog className="w-7 h-7 text-slate-400" />
        </div>
        <p className="font-medium text-slate-700">No hay resultados</p>
        <p className="text-sm text-slate-400 mt-1">Prueba con otro filtro o búsqueda.</p>
      </div>
    );
  }

  const paginacion = !cargando && totalPaginas > 1 && (
    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
      <span className="text-slate-500">
        {(pagina - 1) * limite + 1}–{Math.min(pagina * limite, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onCambiarPagina(pagina - 1)}
          disabled={pagina <= 1}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-slate-700 font-medium">
          {pagina} / {totalPaginas}
        </span>
        <button
          onClick={() => onCambiarPagina(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* ≥ sm: tabla */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide w-10">#</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Forma</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Teléfono</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Referidos activos</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Se le debe</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">Al corriente</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cargando
              ? [...Array(8)].map((_, i) => <EsqueletoFila key={i} />)
              : personas.map((p, idx) => (
                  <tr key={`${p.forma}-${p.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-slate-400 font-medium w-10">
                      {(pagina - 1) * limite + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(rutaDetalle(p))}
                        className="font-medium text-slate-800 hover:text-sky-600 transition-colors text-left"
                      >
                        {nombreCompleto(p)}
                      </button>
                    </td>
                    <td className="px-4 py-3"><BadgeForma forma={p.forma} /></td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.telefono ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400" title={PENDIENTE_REFERENCIAS}>—</td>
                    <td className="px-4 py-3 text-right"><CeldaDeuda valor={p.se_le_debe} /></td>
                    <td className="px-4 py-3 text-center"><CeldaCorriente valor={p.al_corriente} /></td>
                    <td className="px-4 py-3"><BadgeEstado activo={p.activo} /></td>
                    <td className="px-4 py-3">{acciones(p)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* < sm (375px): tarjetas — nombre + badge arriba, el resto en dos líneas */}
      <div className="sm:hidden divide-y divide-slate-50">
        {cargando
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))
          : personas.map((p) => (
              <div key={`${p.forma}-${p.id}`} className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <button
                    onClick={() => navigate(rutaDetalle(p))}
                    className="font-semibold text-slate-800 hover:text-sky-600 transition-colors text-left"
                  >
                    {nombreCompleto(p)}
                  </button>
                  <BadgeForma forma={p.forma} />
                </div>
                {/* Se le debe como cifra grande (FLUJOS §1, tarjeta 375px) */}
                <div className="mb-2">
                  <p className="text-xs text-slate-400 font-medium">Se le debe</p>
                  <CeldaDeuda valor={p.se_le_debe} grande />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm mb-1">
                  <span className="text-slate-600">
                    {p.telefono ?? <span className="text-slate-400">Sin teléfono</span>}
                  </span>
                  <BadgeEstado activo={p.activo} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-400" title={PENDIENTE_REFERENCIAS}>
                    Referidos activos: —
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Al corriente:</span>
                    <CeldaCorriente valor={p.al_corriente} />
                  </span>
                  {acciones(p)}
                </div>
              </div>
            ))}
      </div>

      {paginacion}
    </div>
  );
};

export default TablaReferenciadores;
