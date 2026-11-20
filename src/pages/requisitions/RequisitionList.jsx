import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, Check, X, Search, AlertTriangle, Clock, Eye,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  SOLICITADO: 'yellow', APROBADO_ZONAL: 'blue', EN_BUSQUEDA: 'purple',
  CUBIERTO: 'green', RECHAZADO: 'red', CANCELADO: 'gray',
};
const STATUS_LABEL = {
  SOLICITADO: 'Solicitado', APROBADO_ZONAL: 'Aprobado zonal', EN_BUSQUEDA: 'En búsqueda',
  CUBIERTO: 'Cubierto', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado',
};
const URGENCY_STYLE = {
  CRITICA: 'bg-red-100 text-red-700', ALTA: 'bg-amber-100 text-amber-700',
  MEDIA: 'bg-slate-100 text-slate-600', BAJA: 'bg-slate-100 text-slate-500',
};
const REASON_LABEL = {
  REEMPLAZO: 'Reemplazo', INCREMENTO_DOTACION: 'Incremento de dotación',
  APERTURA_LOCAL: 'Apertura de local', TEMPORADA_ALTA: 'Temporada alta',
  COBERTURA_VACACIONES: 'Cobertura de vacaciones', CESE: 'Cese',
};

const EMPTY = {
  cargo: '', local: '', cantidad: 1, turno: 'ROTATIVO', motivo: 'REEMPLAZO',
  justificacion: '', urgencia: 'MEDIA', requeridoPara: '', sueldoOfrecido: '',
};

/** Línea de tiempo del flujo de aprobación */
function ApprovalFlow({ item }) {
  const steps = [
    { key: 'SOLICITADO', etiqueta: 'Solicitud', actor: 'Administrador de Botica' },
    { key: 'APROBADO_ZONAL', etiqueta: 'Aprobación zonal', actor: 'Supervisor de Zona' },
    { key: 'EN_BUSQUEDA', etiqueta: 'Búsqueda', actor: 'Analista de Selección' },
    { key: 'CUBIERTO', etiqueta: 'Cubierto', actor: 'Incorporación' },
  ];
  const order = ['SOLICITADO', 'APROBADO_ZONAL', 'EN_BUSQUEDA', 'CUBIERTO'];
  const rejected = ['RECHAZADO', 'CANCELADO'].includes(item.estado);
  const currentIdx = rejected ? 0 : order.indexOf(item.estado);

  return (
    <div className="flex items-start">
      {steps.map((s, i) => {
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx && !rejected;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div className={`absolute top-3.5 right-1/2 w-full h-0.5 ${i <= currentIdx ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
            <div
              className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold z-10 ${
                rejected && i === 0 ? 'bg-red-500 text-white'
                  : done ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-500'
              } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
            >
              {done && !rejected ? <Check size={14} /> : rejected && i === 0 ? <X size={14} /> : i + 1}
            </div>
            <p className={`text-[11px] font-medium mt-1.5 text-center ${done ? 'text-slate-700' : 'text-slate-400'}`}>{s.etiqueta}</p>
            <p className="text-[10px] text-slate-400 text-center leading-tight">{s.actor}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function RequisitionList() {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);

  const canCreate = can(usuario, 'requisitions', 'write');
  const canApprove = can(usuario, 'requisitions', 'approve');
  const canRecruit = can(usuario, 'recruitment', 'write');

  // El motivo lo escribe quien rechaza: se le comunica a quien pidió el personal.
  // Antes se enviaba siempre «Sin presupuesto disponible», fuera cual fuera la razón
  const rechazar = (id) => {
    const motivo = window.prompt('Motivo del rechazo (se le comunica a quien lo pidió):');
    if (!motivo || !motivo.trim()) return;
    act(id, 'reject', { comentario: motivo.trim() }, 'Requerimiento rechazado');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.allSettled([
        api.get('/requisitions', { params: { estado: statusFilter || undefined, limit: 50 } }),
        api.get('/requisitions/stats'),
      ]);
      if (list.status === 'fulfilled') setItems(list.value.data.data || []);
      if (st.status === 'fulfilled') setStats(st.value.data);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canCreate) return;
    Promise.allSettled([api.get('/positions'), api.get('/locations')]).then(([p, l]) => {
      if (p.status === 'fulfilled') setPositions(p.value.data || []);
      if (l.status === 'fulfilled') setLocations(l.value.data || []);
    });
  }, [canCreate]);

  const act = async (id, path, body, msg) => {
    try {
      await api.put(`/requisitions/${id}/${path}`, body || {});
      toast.success(msg);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la acción');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/requisitions', {
        ...form,
        cantidad: Number(form.cantidad) || 1,
        sueldoOfrecido: form.sueldoOfrecido ? Number(form.sueldoOfrecido) : undefined,
      });
      toast.success('Requerimiento enviado al supervisor zonal');
      setModalOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el requerimiento');
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const columns = [
    { key: 'codigo', etiqueta: 'Código', render: (v) => <span className="font-mono text-xs font-semibold text-slate-600">{v}</span> },
    { key: 'cargo', etiqueta: 'Cargo', render: (v) => v?.nombre || '—' },
    {
      key: 'local', etiqueta: 'Centro de trabajo',
      render: (v) => v ? (
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${v.marca === 'MIFARMA' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`} />
          {v.nombre}
        </span>
      ) : '—',
    },
    { key: 'cantidad', etiqueta: 'Cant.', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'motivo', etiqueta: 'Motivo', render: (v) => <span className="text-xs text-slate-500">{REASON_LABEL[v] || v}</span> },
    { key: 'urgencia', etiqueta: 'Urgencia', render: (v) => <span className={`px-2 py-0.5 rounded text-xs font-semibold ${URGENCY_STYLE[v]}`}>{v}</span> },
    {
      key: 'diasAbierto', etiqueta: 'Días', render: (v, row) => (
        <span className={row.estaVencido ? 'text-red-600 font-semibold' : 'text-slate-500'}>
          {v ?? 0}{row.estaVencido && ' ⚠'}
        </span>
      ),
    },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{STATUS_LABEL[v] || v}</StatusBadge> },
  ];

  const actions = (row) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => setDetail(row)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Ver detalle">
        <Eye size={16} />
      </button>
      {canApprove && row.estado === 'SOLICITADO' && (
        <>
          <button onClick={() => act(row._id, 'approve', {}, 'Requerimiento aprobado')} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer" title="Aprobar">
            <Check size={16} />
          </button>
          <button onClick={() => rechazar(row._id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer" title="Rechazar">
            <X size={16} />
          </button>
        </>
      )}
      {canRecruit && row.estado === 'APROBADO_ZONAL' && (
        <button onClick={() => act(row._id, 'start-search', {}, 'Búsqueda iniciada')} className="p-1.5 text-slate-400 hover:text-violet-600 rounded hover:bg-violet-50 cursor-pointer" title="Iniciar búsqueda">
          <Search size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Requerimientos de Personal</h1>
          <p className="text-sm text-slate-500 mt-1">
            El local solicita, el supervisor zonal aprueba y Selección inicia la búsqueda
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
            <Plus size={18} />
            Nuevo requerimiento
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} label="Abiertos" value={stats.apertura} tone="primary" hint="Requerimientos sin cubrir" />
          <StatCard icon={AlertTriangle} label="Por aprobar" value={stats.pendingApproval} tone="amber" hint="Esperan al supervisor zonal" />
          <StatCard icon={Search} label="En búsqueda" value={stats.inSearch} tone="violet" hint="Convocatoria abierta" />
          <StatCard icon={Clock} label="Días de cobertura" value={stats.avgDaysToFill ?? '—'} tone="green" hint="Promedio histórico" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'SOLICITADO', 'APROBADO_ZONAL', 'EN_BUSQUEDA', 'CUBIERTO'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {s ? STATUS_LABEL[s] : 'Todos'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={items} loading={loading} actions={actions} emptyMessage="No hay requerimientos registrados" />

      {/* Detalle con línea de tiempo del flujo */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Requerimiento ${detail?.codigo || ''}`} wide>
        {detail && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-5">
              <ApprovalFlow item={detail} />
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><p className="text-xs text-slate-400">Cargo solicitado</p><p className="font-medium text-slate-700">{detail.cargo?.nombre || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Centro de trabajo</p><p className="font-medium text-slate-700">{detail.local?.nombre || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Cantidad</p><p className="font-medium text-slate-700">{detail.cantidad} posición(es)</p></div>
              <div><p className="text-xs text-slate-400">Turno</p><p className="font-medium text-slate-700">{detail.turno}</p></div>
              <div><p className="text-xs text-slate-400">Motivo</p><p className="font-medium text-slate-700">{REASON_LABEL[detail.motivo] || detail.motivo}</p></div>
              <div><p className="text-xs text-slate-400">Necesario para</p><p className="font-medium text-slate-700">{detail.requeridoPara?.slice(0, 10) || '—'}</p></div>
              {detail.sueldoOfrecido && (
                <div><p className="text-xs text-slate-400">Sueldo ofrecido</p><p className="font-medium text-slate-700">S/ {detail.sueldoOfrecido.toLocaleString('es-PE')}</p></div>
              )}
              <div><p className="text-xs text-slate-400">Solicitado por</p><p className="font-medium text-slate-700">{detail.solicitadoPor?.correo || '—'}</p></div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Justificación</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed">{detail.justificacion}</p>
            </div>

            {detail.aprobaciones?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Historial de aprobaciones</p>
                <div className="space-y-2">
                  {detail.aprobaciones.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3 py-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.decision === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {a.paso}
                      </span>
                      <div className="min-w-0">
                        <p className="text-slate-700">{a.comentario || a.decision}</p>
                        <p className="text-xs text-slate-400">{a.fecha?.slice(0, 10)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {canApprove && detail.estado === 'SOLICITADO' && (
                <>
                  <button onClick={() => rechazar(detail._id)} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">
                    Rechazar
                  </button>
                  <button onClick={() => act(detail._id, 'approve', {}, 'Requerimiento aprobado')} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer">
                    Aprobar
                  </button>
                </>
              )}
              {canRecruit && detail.estado === 'APROBADO_ZONAL' && (
                <button onClick={() => act(detail._id, 'start-search', {}, 'Búsqueda iniciada')} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 cursor-pointer">
                  Iniciar búsqueda
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Alta de requerimiento */}
      {canCreate && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo requerimiento de personal" wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Cargo</label>
                <select value={form.cargo} onChange={(e) => set('cargo', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="">Seleccionar...</option>
                  {positions.map((p) => <option key={p._id} value={p._id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Centro de trabajo</label>
                <select value={form.local} onChange={(e) => set('local', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="">Mi centro de trabajo</option>
                  {locations.map((l) => <option key={l._id} value={l._id}>{l.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Cantidad</label>
                <input type="number" min="1" value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Turno</label>
                <select value={form.turno} onChange={(e) => set('turno', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  {['ROTATIVO', 'MANANA', 'TARDE', 'NOCHE', 'COMPLETO'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Urgencia</label>
                <select value={form.urgencia} onChange={(e) => set('urgencia', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  {['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Necesario para</label>
                <input type="date" value={form.requeridoPara} onChange={(e) => set('requiredPara', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Motivo</label>
                <select value={form.motivo} onChange={(e) => set('motivo', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  {Object.entries(REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Sueldo ofrecido (opcional)</label>
                <input type="number" value={form.sueldoOfrecido} onChange={(e) => set('sueldoOfrecido', e.target.value)} placeholder="S/" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Justificación</label>
              <textarea
                value={form.justificacion} onChange={(e) => set('justificacion', e.target.value)} required rows={3}
                placeholder="Explique por qué se necesita esta posición: carga operativa, cobertura de turno, riesgo regulatorio..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {saving ? 'Enviando...' : 'Enviar al supervisor zonal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
