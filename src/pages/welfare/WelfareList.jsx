import { useState, useEffect, useCallback } from 'react';
import { HeartPulse, Plus, Eye, FileCheck, AlertTriangle, Wallet, CalendarDays } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_LABEL = {
  ENFERMEDAD_COMUN: 'Enfermedad común', ACCIDENTE_TRABAJO: 'Accidente de trabajo',
  ACCIDENTE_COMUN: 'Accidente común', MATERNIDAD: 'Maternidad',
  LACTANCIA: 'Lactancia', ENFERMEDAD_PROFESIONAL: 'Enfermedad profesional',
};
const STATUS_MAP = { REGISTRADO: 'yellow', VALIDADO: 'blue', RECHAZADO: 'red', CERRADO: 'green' };
const CLAIM_MAP = { NO_APLICA: 'gray', PENDIENTE: 'yellow', PRESENTADO: 'blue', OBSERVADO: 'red', REEMBOLSADO: 'green' };
const CLAIM_LABEL = {
  NO_APLICA: 'No aplica', PENDIENTE: 'Pendiente de canje', PRESENTADO: 'Presentado',
  OBSERVADO: 'Observado', REEMBOLSADO: 'Reembolsado',
};

const EMPTY = {
  empleado: '', tipo: 'ENFERMEDAD_COMUN', diagnostico: '', centroMedico: '',
  nombreMedico: '', cmpMedico: '', fechaInicio: '', fechaFin: '',
};

const money = (n) => (n != null ? `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—');

export default function WelfareList() {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [cittNumber, setCittNumber] = useState('');

  const canWrite = can(usuario, 'welfare', 'write');
  const canApprove = can(usuario, 'welfare', 'approve');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.allSettled([
        api.get('/welfare/leaves', { params: { limit: 50 } }),
        api.get('/welfare/stats'),
      ]);
      if (l.status === 'fulfilled') setItems(l.value.data.data || []);
      if (s.status === 'fulfilled') setStats(s.value.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (canWrite) api.get('/employees', { params: { limit: 200 } }).then((r) => setEmployees(r.data.data || [])).catch(() => {});
  }, [canWrite]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/welfare/leaves', form);
      toast.success('Descanso médico registrado');
      setCreateOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el descanso');
    } finally { setSaving(false); }
  };

  const validate = async (id) => {
    try {
      await api.put(`/welfare/leaves/${id}/validate`, {});
      toast.success('Descanso validado');
      setDetail(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const updateClaim = async (id, estadoReembolso) => {
    try {
      const r = await api.put(`/welfare/leaves/${id}/claim`, { estadoReembolso, cittNumber: cittNumber || undefined });
      toast.success(`Subsidio: ${CLAIM_LABEL[estadoReembolso]}`);
      setDetail(r.data);
      setCittNumber('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const columns = [
    { key: 'empleado', etiqueta: 'Empleado', render: (v) => v ? `${v.nombres} ${v.apellidos}` : '—' },
    { key: 'tipo', etiqueta: 'Tipo', render: (v) => <span className="text-xs text-slate-600">{TYPE_LABEL[v] || v}</span> },
    { key: 'diagnostico', etiqueta: 'Diagnóstico', render: (v) => <span className="text-xs text-slate-500 truncate block max-w-[16rem]">{v || '—'}</span> },
    { key: 'fechaInicio', etiqueta: 'Desde', render: (v) => v?.slice(0, 10) || '—' },
    { key: 'diasTotales', etiqueta: 'Días', render: (v) => <span className="font-semibold">{v}</span> },
    {
      key: 'subsidio', etiqueta: 'Subsidio EsSalud',
      render: (v) => v?.aplica
        ? <span className="text-xs"><span className="font-semibold text-emerald-600">{v.diasEssalud}d</span> <span className="text-slate-400">· {money(v.montoEstimado)}</span></span>
        : <span className="text-xs text-slate-300">No aplica</span>,
    },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{v}</StatusBadge> },
  ];

  const actions = (row) => (
    <button onClick={() => setDetail(row)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Ver detalle">
      <Eye size={16} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bienestar Social</h1>
          <p className="text-sm text-slate-500 mt-1">Descansos médicos, canje de CITT y subsidios EsSalud</p>
        </div>
        {canWrite && (
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
            <Plus size={18} />
            Registrar descanso
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={HeartPulse} label="Descansos activos" value={stats.activeLeaves} tone="rose" hint="Empleados de licencia hoy" />
          <StatCard icon={FileCheck} label="Canjes pendientes" value={stats.pendingClaims} tone="amber" hint="CITT por tramitar ante EsSalud" />
          <StatCard icon={Wallet} label="Subsidio estimado" value={money(stats.estimatedSubsidy)} tone="green" hint="Recuperable en el año" />
          <StatCard icon={CalendarDays} label="Días de incapacidad" value={stats.totalDaysYear} tone="slate" hint={`${stats.totalLeavesYear} descansos este año`} />
        </div>
      )}

      {stats?.expiringClaims?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Plazo de canje próximo a vencer</p>
              <p className="text-xs text-amber-700 mt-0.5 mb-2">
                El reembolso ante EsSalud debe solicitarse dentro de los 6 meses posteriores al alta.
              </p>
              <div className="space-y-1">
                {stats.expiringClaims.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs bg-white/60 rounded px-2.5 py-1.5">
                    <span className="font-medium text-amber-900">{c.empleado}</span>
                    <span className="text-amber-700">Vence {c.deadline?.slice(0, 10)} · {money(c.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={items} loading={loading} actions={actions} emptyMessage="No hay descansos médicos registrados" />

      {/* Detalle */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Descanso médico" wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">
                  {detail.empleado?.nombres} {detail.empleado?.apellidos}
                </h3>
                <p className="text-sm text-slate-500">
                  DNI {detail.empleado?.dni} · {TYPE_LABEL[detail.tipo] || detail.tipo}
                </p>
              </div>
              <StatusBadge variant={STATUS_MAP[detail.estado]}>{detail.estado}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><p className="text-xs text-slate-400">Diagnóstico</p><p className="font-medium text-slate-700">{detail.diagnostico || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Centro médico</p><p className="font-medium text-slate-700">{detail.centroMedico || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Médico tratante</p><p className="font-medium text-slate-700">{detail.nombreMedico || '—'} {detail.cmpMedico && `· ${detail.cmpMedico}`}</p></div>
              <div><p className="text-xs text-slate-400">Período</p><p className="font-medium text-slate-700">{detail.fechaInicio?.slice(0, 10)} → {detail.fechaFin?.slice(0, 10)} ({detail.diasTotales} días)</p></div>
            </div>

            {/* Reparto del costo entre empleador y EsSalud */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Reparto del subsidio</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-700">{detail.subsidio?.diasEmpleador ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">días a cargo del empleador</p>
                  <p className="text-[10px] text-slate-400">(primeros 20 del año)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{detail.subsidio?.diasEssalud ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">días subsidiados por EsSalud</p>
                  <p className="text-[10px] text-slate-400">(a partir del día 21)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{money(detail.subsidio?.montoEstimado)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">monto estimado</p>
                  {detail.subsidio?.montoReembolsado != null && (
                    <p className="text-[10px] text-emerald-600 font-semibold">Reembolsado: {money(detail.subsidio.montoReembolsado)}</p>
                  )}
                </div>
              </div>
            </div>

            {detail.subsidio?.aplica && (
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Trámite del CITT</p>
                  <StatusBadge variant={CLAIM_MAP[detail.subsidio.estadoReembolso]}>
                    {CLAIM_LABEL[detail.subsidio.estadoReembolso]}
                  </StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div><p className="text-xs text-slate-400">N° CITT</p><p className="font-medium text-slate-700">{detail.citt?.numero || 'Sin emitir'}</p></div>
                  <div><p className="text-xs text-slate-400">Plazo de canje</p><p className="font-medium text-slate-700">{detail.fechaLimiteReembolso?.slice(0, 10) || '—'}</p></div>
                </div>
                {canApprove && detail.subsidio.estadoReembolso !== 'REEMBOLSADO' && (
                  <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-slate-100">
                    {!detail.citt?.numero && (
                      <input
                        value={cittNumber}
                        onChange={(e) => setCittNumber(e.target.value)}
                        placeholder="N° CITT"
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-40"
                      />
                    )}
                    <button onClick={() => updateClaim(detail._id, 'PRESENTADO')} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer">
                      Marcar presentado
                    </button>
                    <button onClick={() => updateClaim(detail._id, 'REEMBOLSADO')} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer">
                      Registrar reembolso
                    </button>
                    <button onClick={() => updateClaim(detail._id, 'OBSERVADO')} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">
                      Observado
                    </button>
                  </div>
                )}
              </div>
            )}

            {canApprove && detail.estado === 'REGISTRADO' && (
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button onClick={() => validate(detail._id)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary-dark cursor-pointer">
                  Validar descanso
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Alta */}
      {canWrite && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Registrar descanso médico" wide>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Empleado</label>
                <select value={form.empleado} onChange={(e) => set('empleado', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="">Seleccionar...</option>
                  {employees.map((e) => <option key={e._id} value={e._id}>{e.nombres} {e.apellidos} — {e.dni}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipo de contingencia</label>
                <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Diagnóstico (CIE-10 o descripción)</label>
              <input value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} placeholder="Ej. J06.9 — Infección respiratoria aguda" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Desde</label>
                <input type="date" value={form.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Hasta</label>
                <input type="date" value={form.fechaFin} onChange={(e) => set('fechaFin', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Centro médico</label>
                <input value={form.centroMedico} onChange={(e) => set('centroMedico', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Médico</label>
                <input value={form.nombreMedico} onChange={(e) => set('nombreMedico', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">CMP</label>
                <input value={form.cmpMedico} onChange={(e) => set('cmpMedico', e.target.value)} placeholder="CMP-00000" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              El sistema reparte automáticamente los días entre el empleador (primeros 20 del año) y EsSalud,
              y estima el monto del subsidio a partir de la remuneración diaria.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
