import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, Users, Palmtree, GraduationCap, Clock,
  AlertTriangle, ArrowRight, MapPin, BadgeCheck,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import MarcadorAsistencia from '../../components/MarcadorAsistencia';
import { useAuth } from '../../context/AuthContext';
import { brandOf } from '../../config/roles';
import api from '../../services/api';
import { nombreTurno } from '../../config/turnos';

const LICENSE_STYLE = {
  VIGENTE: { chip: 'bg-emerald-100 text-emerald-700', tone: 'green', etiqueta: 'Vigente' },
  POR_VENCER: { chip: 'bg-amber-100 text-amber-700', tone: 'amber', etiqueta: 'Por vencer' },
  VENCIDA: { chip: 'bg-red-100 text-red-700', tone: 'red', etiqueta: 'Vencida' },
  SIN_DATO: { chip: 'bg-slate-100 text-slate-600', tone: 'slate', etiqueta: 'Sin registro' },
};

export default function DashboardQF() {
  const { usuario } = useAuth();
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState([]);
  const [audits, setAudits] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [turnos, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/me/profile'),
      api.get('/employees', { params: { limit: 60, estado: 'ACTIVO' } }),
      api.get('/audits', { params: { limit: 5 } }),
      api.get('/me/trainings'),
      api.get('/me/schedule'),
    ]).then(([p, e, a, t, s]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data);
      if (e.status === 'fulfilled') setTeam(e.value.data.data || []);
      if (a.status === 'fulfilled') setAudits(a.value.data.data || []);
      if (t.status === 'fulfilled') setTrainings(t.value.data || []);
      if (s.status === 'fulfilled') setShifts(s.value.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando panel...</div>;

  const emp = profile?.empleado || usuario?.empleado || {};
  const loc = emp.localActual || {};
  const marca = brandOf(loc.marca);
  const license = profile?.licenseStatus;
  const lic = LICENSE_STYLE[license?.estado || 'SIN_DATO'];
  const vac = profile?.vacationBalance || {};

  const qfs = team.filter((e) => e.tipoProfesional === 'QF');
  const tecnicos = team.filter((e) => e.tipoProfesional === 'TECNICO');
  const lastAudit = audits[0];
  const completedTrainings = trainings.filter((t) => t.estado === 'COMPLETADA');
  const digemidCert = completedTrainings.find((t) => t.tipo === 'DIGEMID');

  // Técnicos sin constancia de Buenas Prácticas — responsabilidad del Director Técnico
  const nextShift = turnos.find((s) => new Date(s.fecha) >= new Date(new Date().setHours(0, 0, 0, 0)));

  return (
    <div className="space-y-6">
      {/* Encabezado con identidad de la cadena */}
      <div className={`rounded-xl border p-5 ${marca?.soft || 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dirección Técnica</p>
            <h1 className="text-2xl font-bold text-slate-800 mt-0.5">
              {emp.nombres} {emp.apellidos}
            </h1>
            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
              <MapPin size={14} className="text-slate-400" />
              {loc.nombre || 'Sin local asignado'}
              {emp.zoneName && <span className="text-slate-400">· Zona {emp.zoneName}</span>}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${lic.chip}`}>
              <BadgeCheck size={13} />
              Colegiatura {lic.etiqueta}
            </span>
            {license?.numero && (
              <p className="text-xs text-slate-500 mt-1.5">
                {license.numero}
                {license.expiry && ` · vence ${license.expiry.slice(0, 10)}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de colegiatura próxima a vencer */}
      {license?.estado === 'POR_VENCER' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Su colegiatura vence en {license.daysToExpiry} días</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sin colegiatura vigente el local no puede operar. Gestione la renovación ante el Colegio Químico Farmacéutico.
            </p>
          </div>
        </div>
      )}
      {license?.estado === 'VENCIDA' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Colegiatura vencida</p>
            <p className="text-xs text-red-700 mt-0.5">
              El local se encuentra en riesgo regulatorio crítico ante DIGEMID. Comunique de inmediato a su supervisor zonal.
            </p>
          </div>
        </div>
      )}

      <MarcadorAsistencia />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldCheck} label="Última auditoría"
          value={lastAudit?.puntaje ?? '—'} tone={!lastAudit ? 'slate' : lastAudit.puntaje >= 90 ? 'green' : lastAudit.puntaje >= 70 ? 'amber' : 'red'}
          hint={lastAudit ? `${lastAudit.fechaVisita?.slice(0, 10)} · ${lastAudit.hallazgosAbiertos || 0} hallazgo(s) abierto(s)` : 'Sin visitas registradas'}
        />
        <StatCard icon={Users} label="Equipo del local" value={team.length} tone="blue" hint={`${qfs.length} QF · ${tecnicos.length} técnicos`} />
        <StatCard icon={Palmtree} label="Vacaciones" value={`${vac.diasDisponibles ?? 0} días`} tone="green" hint={`${vac.anosDeServicio ?? 0} años de servicio`} />
        <StatCard icon={GraduationCap} label="Capacitaciones" value={completedTrainings.length} tone="violet" hint={digemidCert ? 'Certificación DIGEMID al día' : 'Sin certificación DIGEMID'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hallazgos regulatorios pendientes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Cumplimiento DIGEMID</h2>
            <Link to="/audits" className="text-xs text-primary font-medium hover:underline no-underline flex items-center gap-1">
              Ver auditorías <ArrowRight size={13} />
            </Link>
          </div>
          {lastAudit ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">{lastAudit.codigo}</p>
                  <p className="text-xs text-slate-500">{lastAudit.fechaVisita?.slice(0, 10)} · {lastAudit.tipo}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  lastAudit.resultado === 'CONFORME' ? 'bg-emerald-100 text-emerald-700'
                    : lastAudit.resultado === 'NO_CONFORME' ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {lastAudit.puntaje}/100
                </span>
              </div>
              {lastAudit.hallazgos?.filter((f) => !f.resuelto).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hallazgos por levantar</p>
                  {lastAudit.hallazgos.filter((f) => !f.resuelto).map((f) => (
                    <div key={f._id} className="border-l-2 border-amber-400 pl-3 py-1">
                      <p className="text-sm text-slate-700 leading-snug">{f.descripcion}</p>
                      {f.fechaVencimiento && <p className="text-xs text-slate-400 mt-0.5">Plazo: {f.fechaVencimiento.slice(0, 10)}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                  Sin hallazgos pendientes. Local conforme.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">Este local aún no registra visitas de auditoría.</p>
          )}
        </div>

        {/* Próximo turno y equipo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Mi próximo turno</h2>
            <Link to="/mi-horario" className="text-xs text-primary font-medium hover:underline no-underline flex items-center gap-1">
              Ver horario <ArrowRight size={13} />
            </Link>
          </div>
          {nextShift ? (
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-lg mb-4">
              <Clock size={20} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(nextShift.fecha).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-slate-500">Turno {nombreTurno(nextShift.tipoTurno).toLowerCase()} · {nextShift.local?.nombre}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 mb-4">No tiene turnos asignados en las próximas dos semanas.</p>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Equipo técnico a su cargo</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {team.filter((e) => e._id !== emp._id).map((e) => (
              <div key={e._id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-slate-700 truncate">{e.nombres} {e.apellidos}</p>
                  <p className="text-xs text-slate-400 truncate">{e.cargoActual?.nombre || e.tipoProfesional}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {e.esPracticante && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">Trainee</span>}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    e.tipoProfesional === 'QF' ? 'bg-emerald-100 text-emerald-700'
                      : e.tipoProfesional === 'TECNICO' ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}>{e.tipoProfesional}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
