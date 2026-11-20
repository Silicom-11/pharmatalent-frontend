import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Plus, Eye, MapPin, Check, TrendingUp } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';

const RESULT_MAP = { CONFORME: 'green', CONFORME_CON_OBSERVACIONES: 'yellow', NO_CONFORME: 'red' };
const RESULT_LABEL = {
  CONFORME: 'Conforme', CONFORME_CON_OBSERVACIONES: 'Con observaciones', NO_CONFORME: 'No conforme',
};
const RISK_STYLE = {
  CRITICO: { chip: 'bg-red-100 text-red-700', dot: 'bg-red-500', etiqueta: 'Crítico' },
  MEDIO: { chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', etiqueta: 'Medio' },
  BAJO: { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', etiqueta: 'Bajo' },
};
const SEVERITY_STYLE = {
  CRITICA: 'bg-red-100 text-red-700 border-red-200',
  MAYOR: 'bg-amber-100 text-amber-700 border-amber-200',
  MENOR: 'bg-blue-100 text-blue-700 border-blue-200',
  OBSERVACION: 'bg-slate-100 text-slate-600 border-slate-200',
};
const CATEGORY_LABEL = {
  PRESENCIA_QF: 'Presencia del Director Técnico',
  CADENA_FRIO: 'Cadena de frío',
  PRODUCTOS_CONTROLADOS: 'Productos controlados',
  ROTULADO_VENCIMIENTOS: 'Rotulado y vencimientos',
  DOCUMENTACION: 'Documentación',
  BPA_DISPENSACION: 'BPA / Dispensación',
  INFRAESTRUCTURA: 'Infraestructura',
  PERSONAL_CAPACITADO: 'Personal capacitado',
};

const EMPTY_FINDING = { categoria: 'CADENA_FRIO', severidad: 'MENOR', descripcion: '', accionCorrectiva: '', fechaVencimiento: '' };

export default function AuditList() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState('mapa');
  const [riskMap, setRiskMap] = useState(null);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ local: '', fechaVisita: new Date().toISOString().slice(0, 10), directorTecnicoPresente: true, resumen: '' });
  const [hallazgos, setFindings] = useState([]);

  const canWrite = can(usuario, 'audits', 'write');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.allSettled([
        api.get('/audits/risk-map'),
        api.get('/audits', { params: { limit: 50 } }),
      ]);
      if (m.status === 'fulfilled') setRiskMap(m.value.data);
      if (a.status === 'fulfilled') setAudits(a.value.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (canWrite) api.get('/locations').then((r) => setLocations((r.data || []).filter((l) => l.tipo !== 'SEDE_CORPORATIVA'))).catch(() => {});
  }, [canWrite]);

  const resolveFinding = async (auditId, findingId) => {
    try {
      const r = await api.put(`/audits/${auditId}/findings/${findingId}/resolve`, {});
      toast.success('Hallazgo levantado');
      setDetail(r.data);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const submitAudit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/audits', {
        ...form,
        hallazgos: hallazgos.map((f) => ({ ...f, fechaVencimiento: f.fechaVencimiento || undefined })),
        cierre: true,
      });
      toast.success('Visita de auditoría registrada');
      setCreateOpen(false);
      setFindings([]);
      setForm({ local: '', fechaVisita: new Date().toISOString().slice(0, 10), directorTecnicoPresente: true, resumen: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar la visita');
    } finally { setSaving(false); }
  };

  const columns = [
    { key: 'codigo', etiqueta: 'Código', render: (v) => <span className="font-mono text-xs font-semibold text-slate-600">{v}</span> },
    {
      key: 'local', etiqueta: 'Local',
      render: (v) => v ? (
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${v.marca === 'MIFARMA' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`} />
          {v.nombre}
        </span>
      ) : '—',
    },
    { key: 'fechaVisita', etiqueta: 'Visita', render: (v) => v?.slice(0, 10) || '—' },
    { key: 'tipo', etiqueta: 'Tipo', render: (v) => <span className="text-xs text-slate-500">{v}</span> },
    {
      key: 'directorTecnicoPresente', etiqueta: 'Director Técnico',
      render: (v) => v
        ? <span className="text-xs text-emerald-600 font-medium">Presente</span>
        : <span className="text-xs text-red-600 font-bold">Ausente</span>,
    },
    { key: 'puntaje', etiqueta: 'Puntaje', render: (v) => <span className={`font-bold ${v >= 90 ? 'text-emerald-600' : v >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{v ?? '—'}</span> },
    { key: 'hallazgosAbiertos', etiqueta: 'Abiertos', render: (v) => v > 0 ? <span className="font-semibold text-amber-600">{v}</span> : <span className="text-slate-400">0</span> },
    { key: 'resultado', etiqueta: 'Resultado', render: (v) => <StatusBadge variant={RESULT_MAP[v]}>{RESULT_LABEL[v] || v}</StatusBadge> },
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
          <h1 className="text-2xl font-bold text-slate-800">Auditoría de Calidad</h1>
          <p className="text-sm text-slate-500 mt-1">Cumplimiento regulatorio DIGEMID y visitas inopinadas</p>
        </div>
        {canWrite && (
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
            <Plus size={18} />
            Registrar visita
          </button>
        )}
      </div>

      {riskMap && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ShieldAlert} label="Riesgo crítico" value={riskMap.resumen.CRITICO} tone="red" hint="Requieren acción inmediata" />
          <StatCard icon={ShieldCheck} label="Riesgo medio" value={riskMap.resumen.MEDIO} tone="amber" hint="Auditoría pendiente o con observaciones" />
          <StatCard icon={ShieldCheck} label="Conformes" value={riskMap.resumen.BAJO} tone="green" hint="Sin hallazgos vigentes" />
          <StatCard icon={TrendingUp} label="Cumplimiento" value={`${riskMap.compliance}%`} tone="primary" hint={`${riskMap.total} boticas evaluadas`} />
        </div>
      )}

      <div className="flex gap-2">
        {[['mapa', 'Mapa de riesgo'], ['visitas', 'Visitas realizadas']].map(([k, etiqueta]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === k ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {tab === 'mapa' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Semáforo regulatorio por botica</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              La ausencia de Director Técnico o una colegiatura vencida sitúan al local en riesgo crítico por norma DIGEMID
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Riesgo', 'Botica', 'Zona', 'Director Técnico', 'CQF', 'Puntaje', 'Última visita'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Cargando...</td></tr>
                ) : (riskMap?.items || []).map((l) => {
                  const r = RISK_STYLE[l.risk];
                  return (
                    <tr key={l._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${r.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                          {r.etiqueta}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${l.marca === 'MIFARMA' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`} />
                          {l.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{l.zona}</td>
                      <td className="px-4 py-3">
                        {l.directorTecnico
                          ? <span className="text-slate-700">{l.directorTecnico}</span>
                          : <span className="text-red-600 font-semibold">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3">
                        {l.numeroCQF
                          ? <span className={l.licenseExpired ? 'text-red-600 font-semibold' : 'text-slate-500'}>{l.numeroCQF}{l.licenseExpired && ' (vencida)'}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${l.puntaje == null ? 'text-slate-300' : l.puntaje >= 90 ? 'text-emerald-600' : l.puntaje >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                          {l.puntaje ?? 'Sin auditar'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {l.fechaUltimaAuditoria ? `${l.fechaUltimaAuditoria.slice(0, 10)} (${l.daysSinceAudit}d)` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={audits} loading={loading} actions={actions} emptyMessage="No hay visitas registradas" />
      )}

      {/* Detalle de la visita */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Visita ${detail?.codigo || ''}`} wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  {detail.local?.nombre}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {detail.tipo} · {detail.fechaVisita?.slice(0, 10)} · Auditor: {detail.auditor?.correo}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-3xl font-bold ${detail.puntaje >= 90 ? 'text-emerald-600' : detail.puntaje >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {detail.puntaje}
                </p>
                <StatusBadge variant={RESULT_MAP[detail.resultado]}>{RESULT_LABEL[detail.resultado]}</StatusBadge>
              </div>
            </div>

            {!detail.directorTecnicoPresente && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Local sin Director Técnico durante la visita</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    La presencia del Químico Farmacéutico es obligatoria durante todo el horario de atención.
                    Su ausencia limita el puntaje máximo a 49 y constituye no conformidad ante DIGEMID.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Hallazgos ({detail.hallazgos?.length || 0})
              </p>
              {detail.hallazgos?.length ? (
                <div className="space-y-2">
                  {detail.hallazgos.map((f) => (
                    <div key={f._id} className={`rounded-lg border p-3 ${f.resuelto ? 'bg-slate-50 border-slate-200 opacity-70' : SEVERITY_STYLE[f.severidad]}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wide">{f.severidad}</span>
                            <span className="text-[11px] opacity-75">{CATEGORY_LABEL[f.categoria] || f.categoria}</span>
                            {f.resuelto && <span className="text-[10px] font-bold text-emerald-600">LEVANTADO</span>}
                          </div>
                          <p className="text-sm font-medium leading-snug">{f.descripcion}</p>
                          {f.accionCorrectiva && (
                            <p className="text-xs mt-1 opacity-80">Acción correctiva: {f.accionCorrectiva}</p>
                          )}
                          {f.fechaVencimiento && !f.resuelto && (
                            <p className="text-xs mt-0.5 opacity-70">Plazo: {f.fechaVencimiento.slice(0, 10)}</p>
                          )}
                        </div>
                        {canWrite && !f.resuelto && (
                          <button
                            onClick={() => resolveFinding(detail._id, f._id)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-white border border-current/20 rounded-lg text-xs font-medium hover:bg-white/70 cursor-pointer"
                          >
                            <Check size={13} /> Levantar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  Visita sin hallazgos. Local conforme.
                </p>
              )}
            </div>

            {detail.resumen && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Resumen</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{detail.resumen}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Registro de visita */}
      {canWrite && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Registrar visita inopinada" wide>
          <form onSubmit={submitAudit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Botica</label>
                <select value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="">Seleccionar...</option>
                  {locations.map((l) => <option key={l._id} value={l._id}>{l.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Fecha de visita</label>
                <input type="date" value={form.fechaVisita} onChange={(e) => setForm({ ...form, fechaVisita: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <label className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.directorTecnicoPresente}
                onChange={(e) => setForm({ ...form, directorTecnicoPresente: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-slate-700">
                El Director Técnico se encontraba presente durante la visita
                <span className="block text-xs text-slate-500">Su ausencia genera no conformidad automática</span>
              </span>
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-600">Hallazgos</label>
                <button
                  type="button"
                  onClick={() => setFindings([...hallazgos, { ...EMPTY_FINDING }])}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  + Agregar hallazgo
                </button>
              </div>
              {hallazgos.length === 0 && <p className="text-xs text-slate-400 py-2">Sin hallazgos — la visita se registrará como conforme.</p>}
              <div className="space-y-3">
                {hallazgos.map((f, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      <select value={f.categoria} onChange={(e) => setFindings(hallazgos.map((x, j) => j === i ? { ...x, categoria: e.target.value } : x))} className="px-3 py-2 border border-slate-300 rounded-lg text-xs">
                        {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <select value={f.severidad} onChange={(e) => setFindings(hallazgos.map((x, j) => j === i ? { ...x, severidad: e.target.value } : x))} className="px-3 py-2 border border-slate-300 rounded-lg text-xs">
                        {['CRITICA', 'MAYOR', 'MENOR', 'OBSERVACION'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="date" value={f.fechaVencimiento} onChange={(e) => setFindings(hallazgos.map((x, j) => j === i ? { ...x, fechaVencimiento: e.target.value } : x))} className="px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                    </div>
                    <input
                      value={f.descripcion}
                      onChange={(e) => setFindings(hallazgos.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
                      placeholder="Descripción del hallazgo" required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        value={f.accionCorrectiva}
                        onChange={(e) => setFindings(hallazgos.map((x, j) => j === i ? { ...x, accionCorrectiva: e.target.value } : x))}
                        placeholder="Acción correctiva"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <button type="button" onClick={() => setFindings(hallazgos.filter((_, j) => j !== i))} className="px-3 text-xs text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Resumen</label>
              <textarea value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-none" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {saving ? 'Guardando...' : 'Registrar visita'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
