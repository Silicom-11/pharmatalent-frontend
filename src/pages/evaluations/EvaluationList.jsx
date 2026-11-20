import { useState, useEffect } from 'react';
import { Plus, Eye, Send, ClipboardCheck } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import usePaginado from '../../hooks/usePaginado';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import toast from 'react-hot-toast';

const RATING_MAP = { EXCELENTE: 'green', MUY_BUENO: 'blue', BUENO: 'yellow', REGULAR: 'yellow', DEFICIENTE: 'red' };
const STATUS_MAP = { BORRADOR: 'gray', ENVIADO: 'yellow', REVISADO: 'blue', FIRMADO: 'green' };

const EMPTY = { empleado: '', periodo: { nombre: '', fechaInicio: '', fechaFin: '' }, kpis: [{ nombre: '', meta: 100, real: 0, peso: 100, unidad: '%' }] };

export default function EvaluationList() {
  const { usuario } = useAuth();
  const puedeEvaluar = can(usuario, 'evaluations', 'write');
  const puedeVisar = can(usuario, 'evaluations', 'approve');
  const miLegajo = String(usuario?.empleado?._id || usuario?.empleado || '');
  const esMia = (row) => String(row.evaluador?._id || row.evaluador || '') === miLegajo;
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [busy, setBusy] = useState(false);

  const [estado, setEstado] = useState('');
  const [busca, setBusca] = useState('');
  const lista = usePaginado('/evaluations', { estado });
  const fetch = lista.recargar;

  // A quién evaluar se busca dentro del ámbito propio (la API filtra); el
  // evaluador no se elige: es quien registra la evaluación
  useEffect(() => {
    if (!modalOpen) return undefined;
    const t = setTimeout(() => {
      api.get('/employees', { params: { estado: 'ACTIVO', search: busca || undefined, limit: 30 } })
        .then((r) => setEmployees((r.data.data || []).filter((e) => String(e._id) !== String(usuario?.empleado?._id || usuario?.empleado))))
        .catch(() => setEmployees([]));
    }, 250);
    return () => clearTimeout(t);
  }, [busca, modalOpen, usuario]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        kpis: form.kpis.map((k) => ({ ...k, meta: Number(k.meta), real: Number(k.real), peso: Number(k.peso) })),
      };
      await api.post('/evaluations', payload);
      toast.success('Evaluación creada');
      setModalOpen(false); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };

  const addKpi = () => setForm({ ...form, kpis: [...form.kpis, { nombre: '', meta: 100, real: 0, peso: 0, unidad: '%' }] });
  const removeKpi = (i) => setForm({ ...form, kpis: form.kpis.filter((_, idx) => idx !== i) });
  const updateKpi = (i, field, value) => {
    const kpis = [...form.kpis];
    kpis[i] = { ...kpis[i], [field]: value };
    setForm({ ...form, kpis });
  };

  const columns = [
    { key: 'empleado', etiqueta: 'Empleado', render: (v) => v ? `${v.nombres} ${v.apellidos}` : '—' },
    { key: 'evaluador', etiqueta: 'Evaluador', render: (v) => v ? `${v.nombres} ${v.apellidos}` : '—' },
    { key: 'periodo', etiqueta: 'Periodo', render: (v) => v?.nombre || '—' },
    { key: 'puntajeGlobal', etiqueta: 'Score', render: (v) => v != null ? <span className="font-bold">{v}%</span> : '—' },
    { key: 'calificacionCualitativa', etiqueta: 'Calificación', render: (v) => v ? <StatusBadge variant={RATING_MAP[v]}>{v.replace('_', ' ')}</StatusBadge> : '—' },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{v}</StatusBadge> },
  ];

  /**
   * Comunicar la evaluación al empleado.
   * A partir de aquí ya no se puede retocar: si se pudiera, la firma del
   * empleado no acreditaría nada.
   */
  const comunicar = async (row) => {
    setBusy(true);
    try {
      const r = await api.put(`/evaluations/${row._id}/enviar`);
      toast.success(r.data.mensaje);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo comunicar');
    } finally { setBusy(false); }
  };

  const revisar = async (row) => {
    setBusy(true);
    try {
      await api.put(`/evaluations/${row._id}/revisar`, {});
      toast.success('Evaluación visada');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo visar');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-800">Evaluaciones de Desempeño</h1><p className="text-sm text-slate-500">Sistema de KPIs con calificación automática</p></div>
      <DataTable columns={columns} {...lista.tabla}
        emptyMessage={lista.error || 'No hay evaluaciones con este filtro'}
        headerAction={(
          <div className="flex items-center gap-2">
            <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado" className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador (mías)</option>
              <option value="ENVIADO">Comunicada</option>
              <option value="REVISADO">Visada</option>
              <option value="FIRMADO">Firmada</option>
            </select>
            {puedeEvaluar && <button onClick={() => { setForm(EMPTY); setBusca(''); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer"><Plus size={16} /> Nueva</button>}
          </div>
        )}
        actions={(row) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => { setSelected(row); setDetailModal(true); }} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer" title="Ver"><Eye size={16} className="text-slate-400" /></button>
            {puedeEvaluar && row.estado === 'BORRADOR' && esMia(row) && (
              <button
                onClick={() => comunicar(row)}
                disabled={busy}
                className="p-1.5 hover:bg-blue-50 rounded cursor-pointer disabled:opacity-40"
                title="Comunicar al empleado"
              >
                <Send size={16} className="text-slate-400 hover:text-blue-600" />
              </button>
            )}
            {puedeVisar && row.estado === 'ENVIADO' && !row.revisadoEn && !esMia(row) && (
              <button
                onClick={() => revisar(row)}
                disabled={busy}
                className="p-1.5 hover:bg-emerald-50 rounded cursor-pointer disabled:opacity-40"
                title="Visar como jefatura"
              >
                <ClipboardCheck size={16} className="text-slate-400 hover:text-emerald-600" />
              </button>
            )}
          </div>
        )}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Evaluación" wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Empleado</label>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre o DNI" className="w-full mb-2 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <select value={form.empleado} onChange={(e) => setForm({ ...form, empleado: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="">{employees.length ? '— Seleccionar —' : 'Sin resultados en su ámbito'}</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.apellidos}, {e.nombres}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Evaluador</label>
              <p className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                {usuario?.empleado?.nombres ? `${usuario.empleado.nombres} ${usuario.empleado.apellidos || ''}` : 'Usted'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Quien registra la evaluación es su evaluador; la visa otra jefatura.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Periodo</label><input value={form.periodo.nombre} onChange={(e) => setForm({ ...form, periodo: { ...form.periodo, nombre: e.target.value } })} placeholder="2026-Q3" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Inicio</label><input type="date" value={form.periodo.fechaInicio} onChange={(e) => setForm({ ...form, periodo: { ...form.periodo, fechaInicio: e.target.value } })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Fin</label><input type="date" value={form.periodo.fechaFin} onChange={(e) => setForm({ ...form, periodo: { ...form.periodo, fechaFin: e.target.value } })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-slate-700">KPIs</h4><button type="button" onClick={addKpi} className="text-xs text-primary-light hover:underline cursor-pointer">+ Agregar KPI</button></div>
            {form.kpis.map((kpi, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                <div><label className="block text-xs text-slate-500">Nombre</label><input value={kpi.nombre} onChange={(e) => updateKpi(i, 'nombre', e.target.value)} required className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" /></div>
                <div><label className="block text-xs text-slate-500">Meta</label><input type="number" value={kpi.meta} onChange={(e) => updateKpi(i, 'meta', e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" /></div>
                <div><label className="block text-xs text-slate-500">Real</label><input type="number" value={kpi.real} onChange={(e) => updateKpi(i, 'real', e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" /></div>
                <div><label className="block text-xs text-slate-500">Peso %</label><input type="number" value={kpi.peso} onChange={(e) => updateKpi(i, 'peso', e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" /></div>
                <button type="button" onClick={() => removeKpi(i)} className="text-red-400 hover:text-red-600 text-xs pb-1.5 cursor-pointer">Quitar</button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Detalle de Evaluación" wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Empleado:</span> <strong>{selected.empleado?.nombres} {selected.empleado?.apellidos}</strong></div>
              <div><span className="text-slate-500">Evaluador:</span> <strong>{selected.evaluador?.nombres} {selected.evaluador?.apellidos}</strong></div>
              <div><span className="text-slate-500">Score:</span> <strong className="text-xl">{selected.puntajeGlobal}%</strong></div>
              <div><span className="text-slate-500">Calificación:</span> <StatusBadge variant={RATING_MAP[selected.calificacionCualitativa]}>{selected.calificacionCualitativa?.replace('_', ' ')}</StatusBadge></div>
            </div>
            {selected.kpis?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">KPIs</h4>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50"><th className="px-3 py-2 text-left">KPI</th><th className="px-3 py-2">Meta</th><th className="px-3 py-2">Real</th><th className="px-3 py-2">Peso</th><th className="px-3 py-2">Score</th></tr></thead>
                  <tbody>{selected.kpis.map((k, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2">{k.nombre}</td>
                      <td className="px-3 py-2 text-center">{k.meta}{k.unidad}</td>
                      <td className="px-3 py-2 text-center">{k.real}{k.unidad}</td>
                      <td className="px-3 py-2 text-center">{k.peso}%</td>
                      <td className="px-3 py-2 text-center font-medium">{k.puntaje?.toFixed(1)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
