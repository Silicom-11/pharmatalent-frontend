import { useState, useEffect } from 'react';
import { Plus, Shield, Pencil, HardHat, Pill, Search } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import usePaginado from '../../hooks/usePaginado';
import { can } from '../../config/roles';
import toast from 'react-hot-toast';

const STATUS_MAP = { PROGRAMADA: 'yellow', EN_CURSO: 'blue', COMPLETADA: 'green', CANCELADA: 'red' };
const STATUS_LABELS = { PROGRAMADA: 'Programada', EN_CURSO: 'En curso', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' };
const TYPE_LABELS = { INDUCCION: 'Inducción', BPA: 'BPA / BPD', DIGEMID: 'DIGEMID', SEGURIDAD: 'SST', LIDERAZGO: 'Liderazgo', OTRO: 'Otro' };
const TYPE_STYLE = {
  DIGEMID: 'bg-emerald-100 text-emerald-700',
  BPA: 'bg-blue-100 text-blue-700',
  SEGURIDAD: 'bg-orange-100 text-orange-700',
  INDUCCION: 'bg-violet-100 text-violet-700',
};
const EMPTY = {
  nombre: '', tipo: 'BPA', proveedor: '', fechaProgramada: '', horasDuracion: '', empleado: '', notas: '',
  estado: 'PROGRAMADA', fechaCompletado: '', puntaje: '', numeroCertificado: '', venceEn: '',
};
const dia = (v) => (v ? String(v).slice(0, 10) : '');
const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white';

export default function TrainingList() {
  const { usuario } = useAuth();
  const [filtros, setFiltros] = useState({ tipo: '', estado: '' });
  const lista = usePaginado('/training', filtros);

  const [compliance, setCompliance] = useState(null);
  const [compModal, setCompModal] = useState(false);
  const [vista, setVista] = useState('DT');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [employees, setEmployees] = useState([]);

  // Del permiso, no de una lista de roles escrita a mano: con la lista, el
  // Analista de Capacitación —el dueño del módulo— no podía editar nada
  const isAdmin = can(usuario, 'training', 'write');

  // El alta busca a la persona en lugar de listar las cien primeras: con
  // cuatrocientas en planilla, la mayoría no aparecía en el selector
  useEffect(() => {
    if (!modalOpen || selected) return undefined;
    const t = setTimeout(() => {
      api.get('/employees', { params: { search: busqueda || undefined, estado: 'ACTIVO', limit: 30 } })
        .then((r) => setEmployees(r.data.data || []))
        .catch(() => setEmployees([]));
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda, modalOpen, selected]);

  const loadCompliance = async () => {
    try {
      const r = await api.get('/training/compliance');
      setCompliance(r.data);
      setCompModal(true);
    } catch { toast.error('No se pudo cargar el cumplimiento'); }
  };

  const openCreate = () => { setForm(EMPTY); setSelected(null); setBusqueda(''); setModalOpen(true); };
  const openEdit = (item) => {
    setForm({
      nombre: item.nombre, tipo: item.tipo, proveedor: item.proveedor || '',
      fechaProgramada: dia(item.fechaProgramada), horasDuracion: item.horasDuracion ?? '',
      empleado: item.empleado?._id || item.empleado || '', notas: item.notas || '',
      estado: item.estado || 'PROGRAMADA', fechaCompletado: dia(item.fechaCompletado),
      puntaje: item.puntaje ?? '', numeroCertificado: item.numeroCertificado || '', venceEn: dia(item.venceEn),
    });
    setSelected(item); setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Sólo se envía lo que tiene valor: una fecha vacía no es «sin fecha»
      const payload = Object.fromEntries(Object.entries({
        ...form,
        horasDuracion: form.horasDuracion === '' ? undefined : Number(form.horasDuracion),
        puntaje: form.puntaje === '' ? undefined : Number(form.puntaje),
      }).filter(([, v]) => v !== '' && v !== undefined));
      if (form.estado !== 'COMPLETADA') {
        for (const k of ['fechaCompletado', 'puntaje', 'numeroCertificado', 'venceEn']) delete payload[k];
      }
      if (selected) {
        delete payload.empleado;
        await api.put(`/training/${selected._id}`, payload);
        toast.success('Capacitación actualizada');
      } else {
        await api.post('/training', payload);
        toast.success('Capacitación registrada');
      }
      setModalOpen(false); lista.recargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const filtrar = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  const columns = [
    { key: 'empleado', etiqueta: 'Empleado', render: (v) => (v ? `${v.nombres || ''} ${v.apellidos || ''}`.trim() : '—') },
    { key: 'nombre', etiqueta: 'Capacitación', render: (v) => <span className="whitespace-normal block max-w-xs">{v}</span> },
    { key: 'tipo', etiqueta: 'Tipo', render: (v) => <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_STYLE[v] || 'bg-slate-100 text-slate-600'}`}>{TYPE_LABELS[v] || v}</span> },
    { key: 'fechaProgramada', etiqueta: 'Fecha', render: (v) => fecha(v) },
    { key: 'horasDuracion', etiqueta: 'Horas', render: (v) => (v ? `${v} h` : '—') },
    { key: 'puntaje', etiqueta: 'Nota', render: (v) => (v != null ? `${v}/100` : '—') },
    { key: 'venceEn', etiqueta: 'Vence', render: (v) => (v ? <span className={new Date(v) < new Date() ? 'text-red-600 font-medium' : ''}>{fecha(v)}</span> : '—') },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{STATUS_LABELS[v] || v}</StatusBadge> },
  ];

  const actions = (row) => (
    <button onClick={() => openEdit(row)} aria-label="Editar" className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer"><Pencil size={16} /></button>
  );

  const filtrosUI = (
    <div className="flex flex-wrap items-center gap-2">
      <select value={filtros.tipo} onChange={(e) => filtrar('tipo', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
        <option value="">Todos los tipos</option>
        {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select value={filtros.estado} onChange={(e) => filtrar('estado', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
        <option value="">Todos los estados</option>
        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Capacitaciones</h1>
          <p className="text-sm text-slate-500 mt-1">Formación obligatoria: inducción, seguridad y salud en el trabajo, y certificaciones de la Dirección Técnica</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadCompliance} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer">
            <Shield size={18} />
            Cumplimiento
          </button>
          {isAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
              <Plus size={18} />
              Nueva
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        {...lista.tabla}
        title={lista.pagination ? `${lista.pagination.total} registros` : undefined}
        headerAction={filtrosUI}
        actions={isAdmin ? actions : undefined}
        emptyMessage={lista.error || 'No hay capacitaciones con estos filtros'}
      />

      {isAdmin && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Editar capacitación' : 'Nueva capacitación'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {selected ? (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                {selected.empleado ? `${selected.empleado.nombres} ${selected.empleado.apellidos}` : 'Empleado'}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Empleado</label>
                <div className="relative mb-2">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, apellido o DNI" className={`${inputCls} pl-9`} />
                </div>
                <select value={form.empleado} onChange={(e) => set('empleado', e.target.value)} required className={inputCls}>
                  <option value="">{employees.length ? 'Seleccionar...' : 'Sin resultados'}</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.apellidos}, {e.nombres} — {e.dni}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nombre</label>
                <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required minLength={3} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipo</label>
                <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} className={inputCls}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Fecha programada</label>
                <input type="date" value={form.fechaProgramada} onChange={(e) => set('fechaProgramada', e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Duración (h)</label>
                <input type="number" min="0" step="0.5" value={form.horasDuracion} onChange={(e) => set('horasDuracion', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Proveedor</label>
                <input value={form.proveedor} onChange={(e) => set('proveedor', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Estado</label>
                <select value={form.estado} onChange={(e) => set('estado', e.target.value)} className={inputCls}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {form.estado === 'COMPLETADA' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Completada el</label>
                  <input type="date" value={form.fechaCompletado} onChange={(e) => set('fechaCompletado', e.target.value)} required className={inputCls} />
                </div>
              )}
            </div>
            {form.estado === 'COMPLETADA' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Nota (0–100)</label>
                  <input type="number" min="0" max="100" value={form.puntaje} onChange={(e) => set('puntaje', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">N.º de certificado</label>
                  <input value={form.numeroCertificado} onChange={(e) => set('numeroCertificado', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Vence</label>
                  <input type="date" value={form.venceEn} onChange={(e) => set('venceEn', e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Notas</label>
              <textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} rows={2} className={inputCls} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      <Modal open={compModal} onClose={() => setCompModal(false)} title="Cumplimiento de la formación obligatoria" wide>
        {compliance && (
          <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {[['DT', 'Dirección Técnica', Pill], ['SST', 'Seguridad y salud', HardHat]].map(([k, label, Icon]) => (
                <button key={k} onClick={() => setVista(k)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer ${vista === k ? 'bg-white shadow-sm font-medium text-slate-800' : 'text-slate-500'}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {vista === 'DT' ? (
              <>
                <p className="text-sm text-slate-500">
                  Todo químico farmacéutico, titular o asistente, con Buenas Prácticas de Dispensación y la actualización normativa DIGEMID completadas y vigentes (vencen al año).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[['QF', compliance.resumen.totalQF, 'text-slate-700'], ['Cumplen', compliance.resumen.cumplen, 'text-emerald-700'],
                    ['No cumplen', compliance.resumen.noCumplen, 'text-red-700'], ['CQF vencido', compliance.resumen.cqfVencido, 'text-amber-700']].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[11px] text-slate-400">{l}</p>
                      <p className={`text-xl font-semibold tabular-nums ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {compliance.details.length ? compliance.details.map((qf) => (
                    <div key={qf.empleado._id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${qf.cumple ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{qf.empleado.nombreCompleto}</p>
                        <p className="text-xs text-slate-500 truncate">{qf.empleado.local?.nombre || 'Sin local asignado'} · {qf.empleado.numeroCQF || 'sin CQF'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          BPA: {qf.bpa ? `${qf.bpa.vencido ? 'vencida' : 'vigente'} hasta ${fecha(qf.bpa.venceEn)}` : 'sin registro'}
                          {' · '}DIGEMID: {qf.digemid ? `${qf.digemid.vencido ? 'vencida' : 'vigente'} hasta ${fecha(qf.digemid.venceEn)}` : 'sin registro'}
                        </p>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${qf.cumple ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {qf.cumple ? 'AL DÍA' : 'PENDIENTE'}
                      </span>
                    </div>
                  )) : <p className="text-sm text-slate-400 text-center py-4">No hay químicos farmacéuticos en su ámbito</p>}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  {compliance.sst.base}: no menos de {compliance.sst.exigidasPorAnio} capacitaciones al año. Se mide lo programado hasta hoy en {compliance.sst.anio}.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[['Personal', compliance.sst.personal, 'text-slate-700'], ['Al día', compliance.sst.alDia, 'text-emerald-700'],
                    ['Con pendientes', compliance.sst.conPendientes, 'text-red-700'], ['Promedio completadas', compliance.sst.promedioCompletadas, 'text-slate-700']].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[11px] text-slate-400">{l}</p>
                      <p className={`text-xl font-semibold tabular-nums ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                {compliance.sst.sinRegistro > 0 && (
                  <p className="text-xs text-amber-700">{compliance.sst.sinRegistro} persona(s) sin ninguna sesión registrada este año.</p>
                )}
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {compliance.sst.pendientes.length ? compliance.sst.pendientes.map((p) => (
                    <div key={p.empleado._id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{p.empleado.nombreCompleto}</p>
                        <p className="text-xs text-slate-500 truncate">{p.empleado.local?.nombre || 'Sede / campo'}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <p className="text-slate-600">{p.completadas} completada(s)</p>
                        {p.recuperaciones > 0 && <p className="text-amber-700">{p.recuperaciones} en recuperación</p>}
                        {p.atrasadas > 0 && <p className="text-red-700">{p.atrasadas} atrasada(s)</p>}
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-400 text-center py-4">Todo el personal de su ámbito está al día</p>}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
