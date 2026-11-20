import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock, Play, Eye, AlertTriangle, ShieldAlert, ShieldCheck,
  Users, RefreshCw, Info, Store,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { nombreTurno } from '../../config/turnos';

const STATUS_MAP = { BORRADOR: 'yellow', PUBLICADO: 'green', COMPLETADO: 'blue' };
const SHIFT_STYLE = {
  MANANA: 'bg-amber-50 border-amber-200 text-amber-800',
  TARDE: 'bg-blue-50 border-blue-200 text-blue-800',
  NOCHE: 'bg-indigo-50 border-indigo-200 text-indigo-800',
};
const SEVERITY = {
  CRITICA: { chip: 'bg-red-100 text-red-700', bar: 'bg-red-500', etiqueta: 'Crítica' },
  MAYOR: { chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', etiqueta: 'Mayor' },
  MENOR: { chip: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400', etiqueta: 'Menor' },
};
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const coverageTone = (pct) => (pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600');
const coverageBar = (pct) => (pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500');

/** Ficha de cobertura de un turno concreto */
function ShiftCard({ shift, onSelect }) {
  const pct = shift.cobertura?.porcentajeCobertura ?? 0;
  const tone = shift.cumpleNormativa ? 'bg-white border-slate-200'
    : shift.cobertura?.severidad === 'CRITICA' ? 'bg-red-50 border-red-200'
      : 'bg-amber-50 border-amber-200';
  return (
    <button
      onClick={() => onSelect(shift)}
      className={`w-full text-left rounded-lg border p-2 transition-shadow cursor-pointer hover:shadow-sm ${tone}`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${SHIFT_STYLE[shift.tipoTurno]}`}>
          {nombreTurno(shift.tipoTurno)}
        </span>
        <span className={`text-xs font-bold ${coverageTone(pct)}`}>{pct}%</span>
      </div>
      <p className="text-[10px] text-slate-400">{shift.horaInicio}–{shift.horaFin}</p>
      <div className="flex items-center gap-1 mt-1">
        <Users size={11} className="text-slate-400" />
        <span className="text-[11px] text-slate-600">{shift.asignaciones?.length || 0}</span>
        {!shift.tieneQF && <ShieldAlert size={11} className="text-red-500 ml-auto" />}
      </div>
    </button>
  );
}

export default function ScheduleList() {
  const { usuario } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [formats, setFormats] = useState([]);
  const [genModal, setGenModal] = useState(false);
  const [formatModal, setFormatModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [shiftDetail, setShiftDetail] = useState(null);
  const [requisitos, setRequirements] = useState(null);
  const [genForm, setGenForm] = useState({ locationId: '', inicioSemana: '' });
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const canWrite = can(usuario, 'schedules', 'write');
  const canPublish = can(usuario, 'schedules', 'approve');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data);
    } catch {
      toast.error('Error al cargar los cronogramas');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.allSettled([api.get('/locations'), api.get('/schedules/formats')]).then(([l, f]) => {
      if (l.status === 'fulfilled') setLocations((l.value.data || []).filter((x) => x.tipo !== 'SEDE_CORPORATIVA'));
      if (f.status === 'fulfilled') setFormats(f.value.data.formats || []);
    });
  }, []);

  // Dotación requerida del local elegido, para anticipar lo que generará el motor
  useEffect(() => {
    if (!genForm.locationId) { setRequirements(null); return; }
    api.get(`/schedules/requirements/${genForm.locationId}`)
      .then((r) => setRequirements(r.data))
      .catch(() => setRequirements(null));
  }, [genForm.locationId]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const r = await api.post('/schedules/generate', genForm);
      const v = r.data.validacion;
      toast.success(`Cronograma ${r.data.formato.etiqueta} generado — cobertura ${v.porcentajeCobertura}%`);
      if (v.conteoCriticas > 0) {
        toast.error(`${v.conteoCriticas} turno(s) sin Químico Farmacéutico`, { duration: 5000 });
      }
      setGenModal(false);
      setGenForm({ locationId: '', inicioSemana: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar el cronograma');
    } finally { setGenerating(false); }
  };

  const openDetail = async (horario) => {
    setDetail({ ...horario, turnos: [] });
    try {
      const res = await api.get(`/schedules/${horario._id}`);
      setDetail(res.data);
    } catch { toast.error('No se pudo cargar el detalle'); }
  };

  const revalidate = async (id) => {
    setBusy(true);
    try {
      const r = await api.post(`/schedules/${id}/validate`);
      toast.success(`Revalidado — cobertura ${r.data.validacion.porcentajeCobertura}%`);
      const res = await api.get(`/schedules/${id}`);
      setDetail(res.data);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al revalidar');
    } finally { setBusy(false); }
  };

  const publish = async (horario, acknowledgeGaps = false) => {
    try {
      await api.put(`/schedules/${horario._id}/publish`, { acknowledgeGaps });
      toast.success('Cronograma publicado');
      setDetail(null);
      load();
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresAcknowledgement) {
        if (confirm(`${data.error}\n\n¿Publicar de todos modos?`)) return publish(horario, true);
        return;
      }
      toast.error(data?.error || 'No se pudo publicar');
    }
  };

  // Agrupa los turnos por día para la vista semanal
  const shiftsByDay = (turnos = []) => {
    const map = new Map();
    for (const s of turnos) {
      const key = s.fecha?.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const columns = [
    {
      key: 'local', etiqueta: 'Centro de trabajo',
      render: (v) => v ? (
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className={`w-1.5 h-1.5 rounded-full ${v.marca === 'MIFARMA' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`} />
          {v.nombre}
        </span>
      ) : '—',
    },
    {
      key: 'formato', etiqueta: 'Formato',
      render: (v, row) => {
        const codigo = v || row.local?.formato;
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">{codigo || '—'}</span>;
      },
    },
    { key: 'inicioSemana', etiqueta: 'Semana', render: (_, row) => `${row.inicioSemana?.slice(0, 10) || ''} → ${row.finSemana?.slice(0, 10) || ''}` },
    {
      key: 'validacion', etiqueta: 'Cobertura',
      render: (v) => {
        const pct = v?.porcentajeCobertura ?? 0;
        return (
          <div className="flex items-center gap-2 min-w-[7rem]">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${coverageBar(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className={`text-xs font-bold ${coverageTone(pct)}`}>{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'conflictos', etiqueta: 'Incumplimientos',
      render: (_, row) => {
        const v = row.validacion || {};
        if (!v.conteoCriticas && !v.conteoMayores && !v.conteoMenores) {
          return <span className="text-xs text-emerald-600 font-medium">Sin brechas</span>;
        }
        return (
          <div className="flex gap-1">
            {v.conteoCriticas > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">{v.conteoCriticas} crít.</span>}
            {v.conteoMayores > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{v.conteoMayores} may.</span>}
            {v.conteoMenores > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{v.conteoMenores} men.</span>}
          </div>
        );
      },
    },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{v}</StatusBadge> },
  ];

  const totals = schedules.reduce((a, s) => ({
    critical: a.critical + (s.validacion?.conteoCriticas || 0),
    cobertura: a.cobertura + (s.validacion?.porcentajeCobertura || 0),
    published: a.published + (s.estado === 'PUBLICADO' ? 1 : 0),
  }), { critical: 0, cobertura: 0, published: 0 });
  const avgCoverage = schedules.length ? Math.round(totals.cobertura / schedules.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Programación de Turnos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dotación por formato de local con validación de Químico Farmacéutico
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFormatModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:border-slate-300 transition-colors cursor-pointer">
            <Store size={18} />
            Formatos
          </button>
          {canWrite && (
            <button onClick={() => setGenModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
              <CalendarClock size={18} />
              Generar cronograma
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarClock} label="Cronogramas" value={schedules.length} tone="primary" hint={`${totals.published} publicado(s)`} />
        <StatCard icon={ShieldCheck} label="Cobertura media" value={`${avgCoverage}%`} tone={avgCoverage >= 90 ? 'green' : 'amber'} hint="Frente a la dotación del formato" />
        <StatCard icon={ShieldAlert} label="Turnos sin QF" value={totals.critical} tone={totals.critical ? 'red' : 'green'} hint="Bloquean la publicación" />
        <StatCard icon={Store} label="Formatos" value={formats.length} tone="slate" hint="Express, Estándar, Flagship y 24 h" />
      </div>

      <DataTable
        columns={columns}
        data={schedules}
        loading={loading}
        emptyMessage="No hay cronogramas registrados"
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => openDetail(row)} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer" title="Ver detalle">
              <Eye size={16} className="text-slate-400" />
            </button>
            {canPublish && row.estado === 'BORRADOR' && (
              <button onClick={() => publish(row)} className="p-1.5 hover:bg-emerald-50 rounded cursor-pointer" title="Publicar">
                <Play size={16} className="text-emerald-500" />
              </button>
            )}
          </div>
        )}
      />

      {/* ─── Detalle semanal ─── */}
      <Modal open={!!detail} onClose={() => { setDetail(null); setShiftDetail(null); }} title="Cronograma semanal" wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">{detail.local?.nombre}</h3>
                <p className="text-sm text-slate-500">
                  {detail.inicioSemana?.slice(0, 10)} → {detail.finSemana?.slice(0, 10)}
                  {detail.formato?.etiqueta && <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold">{detail.formato.etiqueta}</span>}
                </p>
                {detail.formato?.descripcion && <p className="text-xs text-slate-400 mt-1">{detail.formato.descripcion}</p>}
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${coverageTone(detail.validacion?.porcentajeCobertura ?? 0)}`}>
                  {detail.validacion?.porcentajeCobertura ?? 0}%
                </p>
                <p className="text-xs text-slate-400">cobertura de dotación</p>
              </div>
            </div>

            {detail.validacion?.conteoCriticas > 0 && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    {detail.validacion.conteoCriticas} turno(s) sin Químico Farmacéutico
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    El local no puede operar sin Director Técnico presente. La publicación está bloqueada hasta cubrirlos.
                  </p>
                </div>
              </div>
            )}

            {/* Rejilla semanal */}
            {detail.turnos?.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {shiftsByDay(detail.turnos).map(([day, dayShifts]) => {
                    const fecha = new Date(day + 'T00:00:00');
                    return (
                      <div key={day} className="w-32 shrink-0">
                        <div className="text-center mb-2">
                          <p className="text-xs font-bold text-slate-600">{DAYS[fecha.getDay()]}</p>
                          <p className="text-[10px] text-slate-400">{day.slice(5)}</p>
                        </div>
                        <div className="space-y-1.5">
                          {dayShifts.map((s) => <ShiftCard key={s._id} shift={s} onSelect={setShiftDetail} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Cargando turnos...</p>
            )}

            {/* Incumplimientos agrupados */}
            {detail.validacion?.conflictos?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Incumplimientos de dotación ({detail.validacion.conflictos.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detail.validacion.conflictos.slice(0, 20).map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className={`shrink-0 w-1 self-stretch rounded-full ${SEVERITY[c.severidad]?.bar}`} />
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${SEVERITY[c.severidad]?.chip}`}>
                        {SEVERITY[c.severidad]?.etiqueta}
                      </span>
                      <div className="min-w-0">
                        <p className="text-slate-700 leading-snug">{c.hallazgo}</p>
                        <p className="text-xs text-slate-400">
                          {c.fecha?.slice(0, 10)} · turno {nombreTurno(c.tipoTurno).toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {detail.validacion.conflictos.length > 20 && (
                    <p className="text-xs text-slate-400 pt-2">
                      y {detail.validacion.conflictos.length - 20} incumplimiento(s) más...
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              {canWrite && (
                <button onClick={() => revalidate(detail._id)} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                  <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
                  Revalidar
                </button>
              )}
              {canPublish && detail.estado === 'BORRADOR' && (
                <button onClick={() => publish(detail)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer">
                  <Play size={15} /> Publicar
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Detalle de un turno ─── */}
      <Modal open={!!shiftDetail} onClose={() => setShiftDetail(null)} title="Cobertura del turno">
        {shiftDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">
                  {shiftDetail.fecha?.slice(0, 10)} · Turno {nombreTurno(shiftDetail.tipoTurno).toLowerCase()}
                </p>
                <p className="text-sm text-slate-500">{shiftDetail.horaInicio} – {shiftDetail.horaFin}</p>
              </div>
              <span className={`text-2xl font-bold ${coverageTone(shiftDetail.cobertura?.porcentajeCobertura ?? 0)}`}>
                {shiftDetail.cobertura?.porcentajeCobertura ?? 0}%
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Dotación por cargo</p>
              <div className="space-y-1.5">
                {(shiftDetail.cobertura?.roles || []).map((r) => (
                  <div key={r.rol} className={`flex items-center justify-between px-3 py-2 rounded-lg ${r.cubierto ? 'bg-slate-50' : 'bg-red-50'}`}>
                    <span className="text-sm text-slate-700 flex items-center gap-1.5">
                      {r.etiqueta}
                      {r.legal && <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">DIGEMID</span>}
                    </span>
                    <span className={`text-sm font-semibold ${r.cubierto ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.asignados}/{r.requerido}
                      {r.sustituidos > 0 && <span className="text-xs font-normal text-slate-400 ml-1">({r.sustituidos} sust.)</span>}
                      {!r.cubierto && <span className="text-xs font-normal ml-1">faltan {r.brecha}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Personal asignado ({shiftDetail.asignaciones?.length || 0})
              </p>
              {shiftDetail.asignaciones?.length ? (
                <div className="space-y-1">
                  {shiftDetail.asignaciones.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-700">
                        {a.empleado?.nombres} {a.empleado?.apellidos}
                        {a.empleado?.esPracticante && <span className="ml-1.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">TRAINEE</span>}
                      </span>
                      <span className="text-xs text-slate-500">
                        {a.rol}
                        {a.esSustituto && <span className="ml-1 text-violet-600 font-medium">· sustituto</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Turno sin personal asignado.
                </p>
              )}
            </div>

            {shiftDetail.conflictos?.length > 0 && (
              <div className="space-y-1.5">
                {shiftDetail.conflictos.map((c, i) => (
                  <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${c.severidad === 'CRITICA' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {c.hallazgo}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Generación ─── */}
      {canWrite && (
        <Modal open={genModal} onClose={() => setGenModal(false)} title="Generar cronograma semanal" wide>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Centro de trabajo</label>
                <select value={genForm.locationId} onChange={(e) => setGenForm({ ...genForm, locationId: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="">Seleccionar...</option>
                  {locations.map((l) => <option key={l._id} value={l._id}>{l.nombre} — {l.formato}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Inicio de semana</label>
                <input type="date" value={genForm.inicioSemana} onChange={(e) => setGenForm({ ...genForm, inicioSemana: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            {requisitos && (
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <Store size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">
                    Formato {requisitos.formato.etiqueta}
                  </p>
                  {requisitos.formato.allowSubstitution && (
                    <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-bold">
                      admite polivalencia
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-3">{requisitos.formato.descripcion}</p>
                <div className="space-y-2">
                  {requisitos.turnos.map((s) => (
                    <div key={s.tipoTurno} className="flex items-start gap-3 text-xs">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold border ${SHIFT_STYLE[s.tipoTurno]}`}>
                        {nombreTurno(s.tipoTurno)}
                      </span>
                      <span className="text-slate-500 shrink-0">{s.total} personas</span>
                      <span className="text-slate-600">
                        {s.roster.map((r) => `${r.count} ${r.etiqueta}${r.legal ? '*' : ''}`).join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-3">* Obligatorio por norma DIGEMID en todo el horario de atención.</p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                El motor reparte al personal respetando la jornada de 48 horas semanales, un día de descanso,
                un máximo de seis días consecutivos y los días no disponibles de cada empleado.
                Los turnos que queden sin Químico Farmacéutico bloquearán la publicación.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setGenModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={generating} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {generating ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Referencia de formatos ─── */}
      <Modal open={formatModal} onClose={() => setFormatModal(false)} title="Formatos de botica y su dotación" wide>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            La cantidad de personas por turno varía según el tamaño del local. El Químico Farmacéutico
            es obligatorio en todos los formatos por norma DIGEMID.
          </p>
          {formats.map((f) => (
            <div key={f.codigo} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{f.etiqueta}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{f.descripcion}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-slate-800">{f.totalPerShift}</p>
                  <p className="text-[10px] text-slate-400">por turno</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(f.roster).map(([rol, n]) => (
                  <span key={rol} className="px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-600">
                    {n} × {rol.toLowerCase().replace('_', ' ')}
                  </span>
                ))}
              </div>
              {f.nightRoster && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Madrugada:</span>
                  {Object.entries(f.nightRoster).map(([rol, n]) => (
                    <span key={rol} className="px-2 py-0.5 rounded bg-indigo-50 text-xs text-indigo-700">
                      {n} × {rol.toLowerCase().replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                <span>Turnos: {f.shiftTypes.join(', ')}</span>
                <span>{f.allowSubstitution ? 'Admite polivalencia entre puestos' : 'Cada puesto con titular propio'}</span>
                <span>Máx. {f.maxTraineesPerShift} trainee(s) por turno</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
