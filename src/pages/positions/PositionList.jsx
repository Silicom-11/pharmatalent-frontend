import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY = { nombre: '', codigo: '', departamento: '', nivel: '', requiereQF: false, rangoSueldo: { min: '', max: '' } };

export default function PositionList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/positions'); setItems(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModalOpen(true); };
  const openEdit = (item) => {
    setForm({ nombre: item.nombre, codigo: item.codigo, departamento: item.departamento || '', nivel: item.nivel || '', requiereQF: item.requiereQF || false, rangoSueldo: { min: item.rangoSueldo?.min || '', max: item.rangoSueldo?.max || '' } });
    setSelected(item); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, rangoSueldo: { min: Number(form.rangoSueldo.min) || 0, max: Number(form.rangoSueldo.max) || 0 } };
      if (selected) await api.put(`/positions/${selected._id}`, payload);
      else await api.post('/positions', payload);
      toast.success(selected ? 'Cargo actualizado' : 'Cargo creado');
      setModalOpen(false); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar ${item.nombre}?`)) return;
    try { await api.delete(`/positions/${item._id}`); toast.success('Eliminado'); fetch(); } catch { toast.error('Error'); }
  };

  const columns = [
    { key: 'codigo', etiqueta: 'Código' },
    { key: 'nombre', etiqueta: 'Cargo' },
    { key: 'departamento', etiqueta: 'Departamento' },
    { key: 'nivel', etiqueta: 'Nivel' },
    { key: 'requiereQF', etiqueta: 'Req. QF', render: (v) => v ? <StatusBadge variant="blue">Sí</StatusBadge> : <StatusBadge variant="gray">No</StatusBadge> },
    { key: 'rangoSueldo', etiqueta: 'Rango Salarial', render: (v) => v ? `S/ ${v.min?.toLocaleString()} - ${v.max?.toLocaleString()}` : '—' },
  ];

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-800">Cargos</h1><p className="text-sm text-slate-500">Catálogo de posiciones de InRetail Pharma</p></div>
      <DataTable columns={columns} data={items} loading={loading}
        headerAction={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer"><Plus size={16} /> Nuevo</button>}
        actions={(row) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer"><Pencil size={16} className="text-slate-400" /></button>
            <button onClick={() => handleDelete(row)} className="p-1.5 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={16} className="text-red-400" /></button>
          </div>
        )}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Editar Cargo' : 'Nuevo Cargo'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Código</label><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Departamento</label><input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Nivel</label><input value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Salario Min (S/)</label><input type="number" value={form.rangoSueldo.min} onChange={(e) => setForm({ ...form, rangoSueldo: { ...form.rangoSueldo, min: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Salario Max (S/)</label><input type="number" value={form.rangoSueldo.max} onChange={(e) => setForm({ ...form, rangoSueldo: { ...form.rangoSueldo, max: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.requiereQF} onChange={(e) => setForm({ ...form, requiereQF: e.target.checked })} className="rounded" /><span className="text-sm text-slate-600">Requiere Químico Farmacéutico</span></label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
