import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import toast from 'react-hot-toast';

const EMPTY = { nombre: '', codigo: '' };

export default function ZoneList() {
  const { usuario } = useAuth();
  const puedeEditar = can(usuario, 'zones', 'write');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/zones'); setItems(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModalOpen(true); };
  const openEdit = (item) => { setForm({ nombre: item.nombre, codigo: item.codigo }); setSelected(item); setModalOpen(true); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (selected) await api.put(`/zones/${selected._id}`, form);
      else await api.post('/zones', form);
      toast.success(selected ? 'Zona actualizada' : 'Zona creada');
      setModalOpen(false); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'codigo', etiqueta: 'Código' },
    { key: 'nombre', etiqueta: 'Zona' },
    { key: 'responsable', etiqueta: 'Supervisor', render: (v) => v ? `${v.nombres} ${v.apellidos}` : '—' },
    { key: 'locationCount', etiqueta: 'Locales', render: (_, row) => row.locationCount ?? row.locations?.length ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-800">Zonas</h1><p className="text-sm text-slate-500">Organización geográfica de la cadena</p></div>
      <DataTable columns={columns} data={items} loading={loading}
        headerAction={puedeEditar && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer"><Plus size={16} /> Nueva</button>}
        // Una zona no se borra (el servidor no tiene esa ruta: el botón fallaba
        // siempre); se edita. Y sólo quien administra la red ve los botones.
        actions={puedeEditar ? (row) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer" title="Editar"><Pencil size={16} className="text-slate-400" /></button>
          </div>
        ) : undefined}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Editar Zona' : 'Nueva Zona'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Código</label><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
