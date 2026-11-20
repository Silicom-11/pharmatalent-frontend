import { useState, useEffect, useCallback } from 'react';
import {
  Palmtree, Plus, AlertTriangle, Check, X, Clock, CalendarDays, Trash2, Info,
} from 'lucide-react';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import CoberturaLocal from '../../components/CoberturaLocal';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PENDIENTE: 'yellow', APROBADO_LOCAL: 'blue', APROBADO: 'green',
  RECHAZADO: 'red', EN_CURSO: 'blue', COMPLETADO: 'gray', CANCELADO: 'gray',
};
const STATUS_LABEL = {
  PENDIENTE: 'Pendiente', APROBADO_LOCAL: 'Avalado por el local', APROBADO: 'Autorizado',
  RECHAZADO: 'Rechazado', EN_CURSO: 'En curso', COMPLETADO: 'Gozado', CANCELADO: 'Retirado',
};
const TYPE_LABEL = {
  VACACIONES: 'Vacaciones', PERMISO: 'Permiso',
  LICENCIA_MEDICA: 'Licencia médica', LICENCIA_SIN_GOCE: 'Licencia sin goce',
};

const EMPTY = { tipo: 'VACACIONES', fechaInicio: '', fechaFin: '', motivo: '' };

/** Recorrido de la solicitud por la cadena de autorización */
function ApprovalTrail({ request }) {
  const steps = [
    { key: 'PENDIENTE', etiqueta: 'Solicitud', actor: 'Empleado' },
    { key: 'APROBADO_LOCAL', etiqueta: 'Aval del local', actor: 'Administrador de Botica' },
    { key: 'APROBADO', etiqueta: 'Autorización', actor: 'Supervisor de Zona / RRHH' },
  ];
  const order = ['PENDIENTE', 'APROBADO_LOCAL', 'APROBADO'];
  const rejected = ['RECHAZADO', 'CANCELADO'].includes(request.estado);
  const current = rejected ? 0 : order.indexOf(request.estado);

  return (
    <div className="flex items-start">
      {steps.map((s, i) => {
        const done = i <= current;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= current ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              rejected && i === 0 ? 'bg-red-500 text-white'
                : done ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {rejected && i === 0 ? <X size={12} /> : done ? <Check size={12} /> : i + 1}
            </div>
            <p className={`text-[11px] font-medium mt-1.5 text-center ${done ? 'text-slate-700' : 'text-slate-400'}`}>{s.etiqueta}</p>
            <p className="text-[10px] text-slate-400 text-center leading-tight">{s.actor}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function MisVacaciones() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/me/vacations');
      setData(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cargar su información');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Simulación en vivo: el empleado ve el efecto antes de enviar
  useEffect(() => {
    if (!form.fechaInicio || !form.fechaFin) { setPreview(null); return; }
    const t = setTimeout(() => {
      api.post('/me/vacations/preview', form)
        .then((r) => setPreview(r.data))
        .catch(() => setPreview(null));
    }, 350);
    return () => clearTimeout(t);
  }, [form.fechaInicio, form.fechaFin, form.tipo]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/me/vacations', form);
      toast.success('Solicitud enviada al Administrador de Botica');
      r.data.warnings?.forEach((w) => toast(w, { icon: '⚠️', duration: 6000 }));
      setModalOpen(false);
      setForm(EMPTY);
      setPreview(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar la solicitud');
    } finally { setSaving(false); }
  };

  const withdraw = async (id) => {
    if (!confirm('¿Retirar esta solicitud?')) return;
    try {
      await api.delete(`/me/vacations/${id}`);
      toast.success('Solicitud retirada');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo retirar');
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  const b = data?.balance || {};
  const requests = data?.requests || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Vacaciones</h1>
          <p className="text-sm text-slate-500 mt-1">Descanso vacacional según el D.L. 713</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
        >
          <Plus size={18} />
          Solicitar descanso
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Palmtree} label="Días disponibles" value={b.diasDisponibles ?? 0} tone="green" hint={`${b.diasAcumulados ?? 0} acumulados · ${b.diasGozados ?? 0} gozados`} />
        <StatCard icon={Clock} label="Comprometidos" value={b.pendingDays ?? 0} tone="amber" hint="En solicitudes sin resolver" />
        <StatCard icon={CalendarDays} label="Puede solicitar" value={Math.max(0, b.requestableDays ?? 0)} tone="primary" hint="Disponibles menos comprometidos" />
        <StatCard icon={Palmtree} label="Antigüedad" value={`${b.anosDeServicio ?? 0} años`} tone="blue" hint="30 días por año de servicio" />
      </div>

      {b.riesgoTriplePago && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Vacaciones vencidas</p>
            <p className="text-xs text-red-700 mt-0.5">
              Acumula descanso no gozado más allá del plazo legal. El D.L. 713 obliga al empleador a pagar
              una remuneración adicional. Coordine sus fechas con el Administrador de Botica.
            </p>
          </div>
        </div>
      )}
      {!b.riesgoTriplePago && b.daysToDeadline != null && b.daysToDeadline < 120 && b.diasDisponibles > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Tiene <strong>{b.daysToDeadline} días</strong> para programar su descanso antes del {b.fechaLimite?.slice(0, 10)}.
            Pasado ese plazo se genera el derecho a triple remuneración.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Mis solicitudes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {requests.length} registro(s){data?.pending ? ` · ${data.pending} en trámite` : ''}
          </p>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Palmtree size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Aún no ha solicitado descansos.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {requests.map((r) => (
              <button
                key={r._id}
                onClick={() => setDetail(r)}
                className="w-full text-left flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">
                    {TYPE_LABEL[r.tipo] || r.tipo} · {r.diasTotales} días
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.fechaInicio?.slice(0, 10)} → {r.fechaFin?.slice(0, 10)}
                    {r.motivo && <span className="text-slate-400"> · {r.motivo}</span>}
                  </p>
                  {r.avisosCobertura?.length > 0 && ['PENDIENTE', 'APROBADO_LOCAL'].includes(r.estado) && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={11} /> {r.avisosCobertura[0]}
                    </p>
                  )}
                </div>
                <StatusBadge variant={STATUS_MAP[r.estado]}>{STATUS_LABEL[r.estado] || r.estado}</StatusBadge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detalle con el recorrido de aprobación */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Solicitud de descanso" wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">{TYPE_LABEL[detail.tipo] || detail.tipo}</h3>
                <p className="text-sm text-slate-500">
                  {detail.fechaInicio?.slice(0, 10)} → {detail.fechaFin?.slice(0, 10)} · {detail.diasTotales} días
                </p>
              </div>
              <StatusBadge variant={STATUS_MAP[detail.estado]}>{STATUS_LABEL[detail.estado]}</StatusBadge>
            </div>

            <div className="bg-slate-50 rounded-xl p-5">
              <ApprovalTrail request={detail} />
            </div>

            {detail.motivo && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Motivo</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{detail.motivo}</p>
              </div>
            )}

            {detail.avisosCobertura?.length > 0 && (
              <div className="space-y-1.5">
                {detail.avisosCobertura.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-800">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {detail.motivoRechazo && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-900">Motivo del rechazo</p>
                <p className="text-sm text-red-700 mt-0.5">{detail.motivoRechazo}</p>
              </div>
            )}

            {detail.aprobaciones?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Historial</p>
                <div className="space-y-2">
                  {detail.aprobaciones.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3 py-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${
                        a.decision === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>{a.paso}</span>
                      <div className="min-w-0">
                        <p className="text-slate-700">{a.comentario || a.decision}</p>
                        <p className="text-xs text-slate-400">
                          {a.usuario?.correo} · {a.fecha?.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {['PENDIENTE', 'APROBADO_LOCAL'].includes(detail.estado) && (
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => withdraw(detail._id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 size={15} /> Retirar solicitud
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Nueva solicitud con simulación previa */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setPreview(null); }} title="Solicitar descanso" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Desde</label>
              <input type="date" value={form.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Hasta</label>
              <input type="date" value={form.fechaFin} onChange={(e) => set('fechaFin', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Motivo (opcional)</label>
            <input value={form.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Ej. descanso familiar" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
          </div>

          {/* Validación en vivo antes de enviar */}
          {preview && (
            <div className={`rounded-lg border p-4 ${preview.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-semibold ${preview.valid ? 'text-emerald-900' : 'text-red-900'}`}>
                  {preview.diasTotales} día(s) solicitados
                </p>
                <span className="text-xs text-slate-500">
                  quedarían {Math.max(0, (preview.balance?.requestableDays ?? 0) - preview.diasTotales)} disponibles
                </span>
              </div>

              {preview.errors?.map((e, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-red-700 mt-1">
                  <X size={13} className="shrink-0 mt-0.5" /> {e}
                </p>
              ))}
              {preview.warnings?.map((w, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-amber-700 mt-1">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {w}
                </p>
              ))}

              {preview.impact && (
                <div className="mt-3">
                  <CoberturaLocal impact={preview.impact} compact />
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            La solicitud llega primero al Administrador de Botica, que evalúa el impacto en la dotación del local,
            y luego al Supervisor de Zona para su autorización final.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalOpen(false); setPreview(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button
              type="submit"
              disabled={saving || (preview && !preview.valid)}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
