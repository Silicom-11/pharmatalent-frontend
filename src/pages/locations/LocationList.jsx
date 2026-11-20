import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Fingerprint, Copy } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';

const EMPTY = { nombre: '', codigo: '', marca: 'INKAFARMA', direccion: { calle: '', distrito: '', ciudad: 'Lima' }, zona: '' };

export default function LocationList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [claveEmitida, setClaveEmitida] = useState(null);
  const { usuario } = useAuth();
  // Editar y dar de alta terminales es de quien administra la red de locales;
  // antes estos botones salían a todo el que podía abrir la pantalla y
  // terminaban en un error de permisos
  const puedeEditar = can(usuario, 'locations', 'write');

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/locations'); setItems(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  // Las zonas alimentan el filtro y el formulario: sólo si la cuenta puede leerlas
  useEffect(() => {
    if (can(usuario, 'zones', 'read')) api.get('/zones').then((r) => setZones(r.data)).catch(() => {});
  }, [usuario]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModalOpen(true); };
  const openEdit = (item) => {
    setForm({ nombre: item.nombre, codigo: item.codigo, marca: item.marca, direccion: { calle: item.direccion?.calle || '', distrito: item.direccion?.distrito || '', ciudad: item.direccion?.ciudad || 'Lima' }, zona: item.zona?._id || item.zona || '' });
    setSelected(item); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.zona) delete payload.zona;
      if (selected) await api.put(`/locations/${selected._id}`, payload);
      else await api.post('/locations', payload);
      toast.success(selected ? 'Local actualizado' : 'Local creado');
      setModalOpen(false); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };

  const emitirTerminal = async (item) => {
    const aviso = item.terminal?.activo
      ? `${item.nombre} ya tiene un terminal registrado. Si emite una clave nueva, el equipo actual dejará de marcar hasta que se le instale. ¿Continuar?`
      : `¿Registrar el terminal de marcación de ${item.nombre}?`;
    if (!window.confirm(aviso)) return;
    try {
      const r = await api.post(`/locations/${item._id}/terminal`);
      setClaveEmitida(r.data);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo registrar el terminal'); }
  };

  const columns = [
    { key: 'codigo', etiqueta: 'Código' },
    { key: 'nombre', etiqueta: 'Local' },
    { key: 'marca', etiqueta: 'Marca', render: (v) => <StatusBadge variant={v === 'INKAFARMA' ? 'blue' : 'purple'}>{v}</StatusBadge> },
    { key: 'direccion', etiqueta: 'Distrito', render: (v) => v?.distrito || '—' },
    { key: 'zona', etiqueta: 'Zona', render: (v) => v?.nombre || '—' },
    { key: 'dotacionRequerida', etiqueta: 'Staff/Turno', render: (v) => v ? `QF: ${v.qfPorTurno || 1}, Téc: ${v.tecnicosPorTurno || 2}` : '—' },
    {
      key: 'terminal', etiqueta: 'Terminal',
      render: (v) => (v?.activo ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <Fingerprint size={12} /> Activo
          {v.ultimaMarcaEn && <span className="text-slate-400">· {new Date(v.ultimaMarcaEn).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span>}
        </span>
      ) : <span className="text-xs text-slate-400">Sin terminal</span>),
    },
  ];

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-800">Locales</h1><p className="text-sm text-slate-500">Establecimientos farmacéuticos Inkafarma y Mifarma</p></div>
      <DataTable columns={columns} data={items} loading={loading}
        headerAction={puedeEditar && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer"><Plus size={16} /> Nuevo</button>}
        actions={puedeEditar ? (row) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer" title="Editar"><Pencil size={16} className="text-slate-400" /></button>
            <button onClick={() => emitirTerminal(row)} className="p-1.5 hover:bg-emerald-50 rounded cursor-pointer" title="Registrar terminal de marcación"><Fingerprint size={16} className="text-emerald-600" /></button>
          </div>
        ) : undefined}
      />
      <Modal open={!!claveEmitida} onClose={() => setClaveEmitida(null)} title="Terminal registrado">
        {claveEmitida && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Abra <span className="font-mono font-medium">/terminal</span> en el equipo de <span className="font-semibold">{claveEmitida.local.nombre}</span> e ingrese:
            </p>
            {[['Código del local', claveEmitida.local.codigo], ['Clave del terminal', claveEmitida.clave]].map(([etq, val]) => (
              <div key={etq}>
                <p className="text-xs text-slate-500">{etq}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg font-mono text-sm break-all">{val}</code>
                  <button onClick={() => { navigator.clipboard?.writeText(val); toast.success('Copiado'); }} className="p-2 hover:bg-slate-100 rounded cursor-pointer" title="Copiar"><Copy size={16} /></button>
                </div>
              </div>
            ))}
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              La clave no se volverá a mostrar: el sistema sólo guarda su huella. Si se pierde, se emite otra y la anterior deja de valer.
            </p>
          </div>
        )}
      </Modal>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Editar Local' : 'Nuevo Local'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Código</label><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Marca</label>
            <select value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="INKAFARMA">Inkafarma</option><option value="MIFARMA">Mifarma</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Dirección</label><input value={form.direccion.calle} onChange={(e) => setForm({ ...form, direccion: { ...form.direccion, calle: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Distrito</label><input value={form.direccion.distrito} onChange={(e) => setForm({ ...form, direccion: { ...form.direccion, distrito: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Zona</label>
            <select value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">— Seleccionar —</option>
              {zones.map((z) => <option key={z._id} value={z._id}>{z.nombre}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
