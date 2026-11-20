import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users, TrendingUp, Award, Plus, ChevronRight, ChevronLeft, Briefcase } from 'lucide-react';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FUNNEL = ['POSTULADO', 'FILTRO_CV', 'ENTREVISTA', 'EVALUACION_TECNICA', 'OFERTA', 'CONTRATADO'];
const CLOSED = ['DESCARTADO', 'DESISTIO'];

const STAGE_LABEL = {
  POSTULADO: 'Postulados', FILTRO_CV: 'Filtro de CV', ENTREVISTA: 'Entrevista',
  EVALUACION_TECNICA: 'Evaluación técnica', OFERTA: 'Oferta', CONTRATADO: 'Contratados',
  DESCARTADO: 'Descartados', DESISTIO: 'Desistieron',
};
const STAGE_COLOR = {
  POSTULADO: 'border-t-slate-400', FILTRO_CV: 'border-t-blue-400', ENTREVISTA: 'border-t-violet-400',
  EVALUACION_TECNICA: 'border-t-amber-400', OFERTA: 'border-t-emerald-400', CONTRATADO: 'border-t-emerald-600',
  DESCARTADO: 'border-t-red-400', DESISTIO: 'border-t-slate-300',
};
const TYPE_CHIP = {
  QF: 'bg-emerald-100 text-emerald-700', TECNICO: 'bg-sky-100 text-sky-700',
  OPERARIO: 'bg-slate-100 text-slate-600', ADMINISTRATIVO: 'bg-indigo-100 text-indigo-700',
};
const SOURCE_LABEL = {
  BOLSA_UNIVERSITARIA: 'Bolsa universitaria', PORTAL_WEB: 'Portal web', REFERIDO: 'Referido',
  FERIA_LABORAL: 'Feria laboral', REDES_SOCIALES: 'Redes sociales', BASE_INTERNA: 'Base interna',
};

const EMPTY = {
  dni: '', nombres: '', apellidos: '', correo: '', telefono: '', requerimiento: '',
  tipoProfesional: 'TECNICO', origen: 'PORTAL_WEB', anosExperiencia: 0,
  formacion: '', numeroCQF: '', sueldoEsperado: '',
};

function CandidateCard({ c, onOpen }) {
  const puntaje = c.puntajeGlobal;
  return (
    <button
      onClick={() => onOpen(c)}
      className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{c.nombres} {c.apellidos}</p>
        {puntaje != null && (
          <span className={`text-xs font-bold shrink-0 ${puntaje >= 85 ? 'text-emerald-600' : puntaje >= 70 ? 'text-amber-600' : 'text-slate-400'}`}>
            {puntaje}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_CHIP[c.tipoProfesional]}`}>
          {c.tipoProfesional}
        </span>
        <span className="text-[10px] text-slate-400">{c.anosExperiencia}a exp.</span>
        {c.numeroCQF && <span className="text-[10px] text-emerald-600 font-medium">CQF</span>}
      </div>
      {c.requerimiento?.cargo?.nombre && (
        <p className="text-[11px] text-slate-400 mt-1.5 truncate">{c.requerimiento.cargo.nombre}</p>
      )}
      <p className="text-[10px] text-slate-300 mt-0.5">{c.diasEnProceso}d en proceso</p>
    </button>
  );
}

export default function RecruitmentPipeline() {
  const { usuario } = useAuth();
  const [pipeline, setPipeline] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openReqs, setOpenReqs] = useState([]);

  const canWrite = can(usuario, 'recruitment', 'write');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.allSettled([
        api.get('/recruitment/pipeline'),
        api.get('/recruitment/stats'),
      ]);
      if (p.status === 'fulfilled') setPipeline(p.value.data.pipeline || []);
      if (s.status === 'fulfilled') setStats(s.value.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canWrite) return;
    api.get('/requisitions', { params: { estado: 'EN_BUSQUEDA', limit: 50 } })
      .then((r) => setOpenReqs(r.data.data || []))
      .catch(() => {});
  }, [canWrite]);

  const stageOf = (s) => pipeline.find((p) => p.etapa === s)?.candidates || [];

  const move = async (candidate, direction) => {
    const idx = FUNNEL.indexOf(candidate.etapa);
    const next = FUNNEL[idx + direction];
    if (!next) return;
    try {
      await api.put(`/recruitment/${candidate._id}/stage`, { etapa: next });
      toast.success(`Movido a ${STAGE_LABEL[next]}`);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo mover al candidato');
    }
  };

  const discard = async (candidate) => {
    try {
      await api.put(`/recruitment/${candidate._id}/stage`, { etapa: 'DESCARTADO', nota: 'No continúa en el proceso' });
      toast.success('Candidato descartado');
      setDetail(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const hire = async (candidate) => {
    try {
      const r = await api.post(`/recruitment/${candidate._id}/hire`, {});
      toast.success(`${r.data.empleado.nombres} ${r.data.empleado.apellidos} incorporado a la planilla`);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la contratación');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/recruitment', {
        ...form,
        anosExperiencia: Number(form.anosExperiencia) || 0,
        sueldoEsperado: form.sueldoEsperado ? Number(form.sueldoEsperado) : undefined,
        numeroCQF: form.numeroCQF || undefined,
      });
      toast.success('Candidato registrado');
      setCreateOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el candidato');
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando embudo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reclutamiento</h1>
          <p className="text-sm text-slate-500 mt-1">Embudo de contratación para boticas, CEDI y sede corporativa</p>
        </div>
        {canWrite && (
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
            <Plus size={18} />
            Registrar candidato
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="En proceso" value={stats.activo} tone="violet" hint="Candidatos activos en el embudo" />
          <StatCard icon={Award} label="Contratados" value={stats.hired} tone="green" hint="Incorporados a la planilla" />
          <StatCard icon={TrendingUp} label="Conversión" value={`${stats.conversionRate}%`} tone="primary" hint="Postulantes que llegan a contrato" />
          <StatCard icon={UserPlus} label="Descartados" value={stats.discarded} tone="slate" hint="No continuaron en el proceso" />
        </div>
      )}

      {/* Tablero del embudo */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {FUNNEL.map((etapa) => {
            const cands = stageOf(etapa);
            return (
              <div key={etapa} className={`w-64 shrink-0 bg-slate-50 rounded-xl border-t-4 ${STAGE_COLOR[etapa]} border border-slate-200`}>
                <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{STAGE_LABEL[etapa]}</p>
                  <span className="text-xs font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded">{cands.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[8rem] max-h-[30rem] overflow-y-auto">
                  {cands.length === 0
                    ? <p className="text-xs text-slate-300 text-center py-6">Sin candidatos</p>
                    : cands.map((c) => <CandidateCard key={c._id} c={c} onOpen={setDetail} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Etapas cerradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CLOSED.map((etapa) => {
          const cands = stageOf(etapa);
          if (!cands.length) return null;
          return (
            <div key={etapa} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                {STAGE_LABEL[etapa]} <span className="text-slate-300">({cands.length})</span>
              </p>
              <div className="space-y-2">
                {cands.map((c) => (
                  <div key={c._id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">{c.nombres} {c.apellidos}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[14rem]">{c.motivoRechazo || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ficha del candidato */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Ficha del candidato" wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{detail.nombres} {detail.apellidos}</h3>
                <p className="text-sm text-slate-500">DNI {detail.dni} · {detail.correo}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_CHIP[detail.tipoProfesional]}`}>{detail.tipoProfesional}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{STAGE_LABEL[detail.etapa]}</span>
                  {detail.tieneCapacitacionDigemid && <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Capacitación DIGEMID</span>}
                </div>
              </div>
              {detail.puntajeGlobal != null && (
                <div className="text-right shrink-0">
                  <p className="text-3xl font-bold text-slate-800">{detail.puntajeGlobal}</p>
                  <p className="text-xs text-slate-400">puntaje global</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><p className="text-xs text-slate-400">Vacante</p><p className="font-medium text-slate-700">{detail.requerimiento?.cargo?.nombre || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Centro de trabajo</p><p className="font-medium text-slate-700">{detail.requerimiento?.local?.nombre || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Formación</p><p className="font-medium text-slate-700">{detail.formacion || '—'}</p></div>
              <div><p className="text-xs text-slate-400">Experiencia</p><p className="font-medium text-slate-700">{detail.anosExperiencia} año(s)</p></div>
              <div><p className="text-xs text-slate-400">Origen</p><p className="font-medium text-slate-700">{SOURCE_LABEL[detail.origen] || detail.origen}</p></div>
              <div><p className="text-xs text-slate-400">Colegiatura CQF</p><p className="font-medium text-slate-700">{detail.numeroCQF || '—'}</p></div>
              {detail.puntajeEntrevista != null && <div><p className="text-xs text-slate-400">Entrevista</p><p className="font-medium text-slate-700">{detail.puntajeEntrevista}/100</p></div>}
              {detail.puntajeTecnico != null && <div><p className="text-xs text-slate-400">Evaluación técnica</p><p className="font-medium text-slate-700">{detail.puntajeTecnico}/100</p></div>}
            </div>

            {detail.tipoProfesional === 'QF' && !detail.numeroCQF && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Briefcase size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Un Químico Farmacéutico requiere número de colegiatura CQF vigente antes de pasar a la etapa de oferta.
                </p>
              </div>
            )}

            {canWrite && !CLOSED.includes(detail.etapa) && (
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => discard(detail)} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">
                  Descartar
                </button>
                <div className="flex gap-2">
                  {FUNNEL.indexOf(detail.etapa) > 0 && (
                    <button onClick={() => move(detail, -1)} className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <ChevronLeft size={16} /> Retroceder
                    </button>
                  )}
                  {detail.etapa === 'OFERTA' ? (
                    <button onClick={() => hire(detail)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer">
                      <Award size={16} /> Contratar e incorporar
                    </button>
                  ) : detail.etapa !== 'CONTRATADO' && (
                    <button onClick={() => move(detail, 1)} className="flex items-center gap-1 px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary-dark cursor-pointer">
                      Avanzar <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Registro de candidato */}
      {canWrite && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Registrar candidato" wide>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Vacante</label>
              <select value={form.requerimiento} onChange={(e) => set('requerimiento', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                <option value="">Seleccionar requerimiento en búsqueda...</option>
                {openReqs.map((r) => (
                  <option key={r._id} value={r._id}>{r.codigo} — {r.cargo?.nombre} · {r.local?.nombre}</option>
                ))}
              </select>
              {openReqs.length === 0 && <p className="text-xs text-amber-600 mt-1">No hay requerimientos en búsqueda. Inicie una búsqueda desde Requerimientos.</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">DNI</label>
                <input value={form.dni} onChange={(e) => set('dni', e.target.value)} required pattern="\d{8}" maxLength={8} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Nombres</label>
                <input value={form.nombres} onChange={(e) => set('nombres', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Apellidos</label>
                <input value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Correo</label>
                <input type="email" value={form.correo} onChange={(e) => set('correo', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Teléfono</label>
                <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Perfil</label>
                <select value={form.tipoProfesional} onChange={(e) => set('tipoProfesional', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  {['TECNICO', 'QF', 'OPERARIO', 'ADMINISTRATIVO'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Origen</label>
                <select value={form.origen} onChange={(e) => set('origen', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Años exp.</label>
                <input type="number" min="0" value={form.anosExperiencia} onChange={(e) => set('anosExperiencia', e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">CQF (si aplica)</label>
                <input value={form.numeroCQF} onChange={(e) => set('numeroCQF', e.target.value)} placeholder="CQF-00000" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Formación</label>
              <input value={form.formacion} onChange={(e) => set('formacion', e.target.value)} placeholder="Ej. Técnico en Farmacia — SENATI" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>

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
