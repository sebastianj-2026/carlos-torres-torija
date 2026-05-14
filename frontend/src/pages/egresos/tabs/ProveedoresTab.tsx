import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { ProveedorBeneficiario } from '../../../types/egresos.types';
import { listarProveedores, crearProveedor, editarProveedor, eliminarProveedor } from '../../../services/egresosService';

const VACÍO = { nombre_razon_social: '', rfc: '', banco: '', clabe: '', moneda_defecto: 'MXN' };

const ProveedoresTab: React.FC = () => {
  const [lista, setLista]         = useState<ProveedorBeneficiario[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [modal, setModal]         = useState(false);
  const [editando, setEditando]   = useState<ProveedorBeneficiario | null>(null);
  const [form, setForm]           = useState({ ...VACÍO });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const cargar = async () => {
    setCargando(true);
    try { setLista(await listarProveedores()); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (p?: ProveedorBeneficiario) => {
    setEditando(p ?? null);
    setForm(p ? { nombre_razon_social: p.nombre_razon_social, rfc: p.rfc ?? '', banco: p.banco ?? '', clabe: p.clabe ?? '', moneda_defecto: p.moneda_defecto } : { ...VACÍO });
    setError('');
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre_razon_social.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      if (editando) await editarProveedor(editando.id, form as any);
      else          await crearProveedor(form as any);
      setModal(false);
      cargar();
    } catch { setError('Error al guardar.'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (id: string) => {
    if (!window.confirm('¿Desactivar este proveedor?')) return;
    await eliminarProveedor(id);
    cargar();
  };

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={() => abrir()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-orange-500/25">
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Nombre / Razón Social','RFC','Banco','CLABE','Moneda','Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cargando ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Cargando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Sin proveedores registrados</td></tr>
              ) : lista.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{p.nombre_razon_social}</td>
                  <td className="px-4 py-3 text-slate-500">{p.rfc ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.banco ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.clabe ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">{p.moneda_defecto}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrir(p)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => eliminar(p.id)} title="Desactivar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Nombre / Razón Social *</label>
                <input value={form.nombre_razon_social} onChange={e => setForm(f => ({ ...f, nombre_razon_social: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">RFC</label>
                  <input value={form.rfc} onChange={e => setForm(f => ({ ...f, rfc: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Banco</label>
                  <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">CLABE</label>
                  <input value={form.clabe} onChange={e => setForm(f => ({ ...f, clabe: e.target.value }))} maxLength={18}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Moneda</label>
                  <select value={form.moneda_defecto} onChange={e => setForm(f => ({ ...f, moneda_defecto: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option>MXN</option><option>USD</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium disabled:opacity-50">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProveedoresTab;
