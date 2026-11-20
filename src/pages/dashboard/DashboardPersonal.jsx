import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Palmtree, GraduationCap, User, Clock, ArrowRight, MapPin, CalendarCheck, BadgeCheck,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import MarcadorAsistencia from '../../components/MarcadorAsistencia';
import { useAuth } from '../../context/AuthContext';
import { roleLabel, brandOf } from '../../config/roles';
import api from '../../services/api';
import { nombreTurno } from '../../config/turnos';

const STATUS_STYLE = {
  PRESENTE: 'bg-emerald-100 text-emerald-700',
  TARDANZA: 'bg-amber-100 text-amber-700',
  VACACIONES: 'bg-teal-100 text-teal-700',
  PERMISO: 'bg-blue-100 text-blue-700',
  LICENCIA: 'bg-violet-100 text-violet-700',
  FERIADO: 'bg-slate-100 text-slate-600',
  AUSENTE: 'bg-red-100 text-red-700',
};

const hhmm = (v) => (v ? new Date(v).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—');

export default function DashboardPersonal() {
  const { usuario, exposicion } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [turnos, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/me/profile'),
      api.get('/me/attendance', { params: { limit: 7 } }),
      api.get('/me/trainings'),
      api.get('/me/schedule'),
    ]).then(([p, a, t, s]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data);
      if (a.status === 'fulfilled') setAttendance(a.value.data.data || []);
      if (t.status === 'fulfilled') setTrainings(t.value.data || []);
      if (s.status === 'fulfilled') setShifts(s.value.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando tu panel...</div>;

  const emp = profile?.empleado || usuario?.empleado || {};
  const loc = emp.localActual || {};
  const marca = brandOf(loc.marca);
  const vac = profile?.vacationBalance || {};
  const license = profile?.licenseStatus;

  // El puesto real del empleado, no una etiqueta genérica por rol
  const positionName = typeof emp.cargoActual === 'object'
    ? emp.cargoActual?.nombre
    : null;
  const jobTitle = positionName || roleLabel(usuario?.rol);
  const locationName = loc.nombre || emp.locationName || 'Sin centro asignado';

  const completed = trainings.filter((t) => t.estado === 'COMPLETADA');
  const upcoming = trainings.filter((t) => ['PROGRAMADA', 'EN_CURSO'].includes(t.estado));
  const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0));
  const nextShift = turnos.find((s) => new Date(s.fecha) >= todayMidnight);

  const punctual = attendance.filter((a) => a.estado === 'PRESENTE').length;
  const withMark = attendance.filter((a) => ['PRESENTE', 'TARDANZA'].includes(a.estado)).length;
  const punctuality = withMark ? Math.round((punctual / withMark) * 100) : null;

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${marca?.soft || 'bg-slate-50 border-slate-200'}`}>
        <h1 className="text-2xl font-bold text-slate-800">Hola, {emp.nombres || 'Empleado'}</h1>
        <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="font-medium">{jobTitle}</span>
          <span className="text-slate-400">·</span>
          <MapPin size={13} className="text-slate-400" />
          {locationName}
          {emp.esPracticante && (
            <span className="ml-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">EN INDUCCIÓN</span>
          )}
        </p>
      </div>

      <MarcadorAsistencia />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Palmtree} label="Días de vacaciones" value={vac.diasDisponibles ?? 0} tone="green" hint="Disponibles según D.L. 713" />
        <StatCard icon={User} label="Antigüedad" value={vac.anosDeServicio != null ? `${vac.anosDeServicio} años` : '—'} tone="blue" hint={emp.fechaIngreso ? `Ingreso ${emp.fechaIngreso.slice(0, 10)}` : 'En la empresa'} />
        <StatCard icon={CalendarCheck} label="Puntualidad" value={punctuality != null ? `${punctuality}%` : '—'} tone={punctuality >= 85 ? 'green' : 'amber'} hint="Últimos registros marcados" />
        {!exposicion?.activo && <StatCard icon={GraduationCap} label="Capacitaciones" value={completed.length} tone="violet" hint={upcoming.length ? `${upcoming.length} programada(s)` : 'Completadas'} />}
      </div>

      {license && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${
          license.estado === 'VIGENTE' ? 'bg-emerald-50 border-emerald-200'
            : license.estado === 'POR_VENCER' ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
        }`}>
          <BadgeCheck size={18} className={license.estado === 'VIGENTE' ? 'text-emerald-600' : license.estado === 'POR_VENCER' ? 'text-amber-600' : 'text-red-600'} />
          <p className="text-sm text-slate-700">
            Colegiatura <strong>{license.numero}</strong> — {license.estado.replace('_', ' ').toLowerCase()}
            {license.expiry && ` · vence ${license.expiry.slice(0, 10)}`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asistencia reciente */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-800">Mi asistencia reciente</h2>
              <p className="text-xs text-slate-500 mt-0.5">Últimos {attendance.length} registros</p>
            </div>
            <Link to="/mi-asistencia" className="text-xs text-primary font-medium hover:underline no-underline flex items-center gap-1">
              Ver todo <ArrowRight size={13} />
            </Link>
          </div>
          {attendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Entrada</th>
                    <th className="px-5 py-3">Salida</th>
                    <th className="px-5 py-3">Horas</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendance.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-700">{a.fecha?.slice(0, 10)}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {hhmm(a.marcaEntrada)}
                        {a.minutosTardanza > 0 && <span className="text-amber-600 text-xs ml-1">+{a.minutosTardanza}′</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{hhmm(a.marcaSalida)}</td>
                      <td className="px-5 py-3 text-slate-700 font-medium">{a.horasTrabajadas ? `${a.horasTrabajadas.toFixed(1)}h` : '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLE[a.estado] || STATUS_STYLE.FERIADO}`}>
                          {a.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-slate-400">Aún no tiene registros de asistencia.</div>
          )}
        </div>

        {/* Turno y formación */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Mi próximo turno</h2>
              <Link to="/mi-horario" className="text-xs text-primary font-medium hover:underline no-underline">Ver horario</Link>
            </div>
            {nextShift ? (
              <div className="flex items-center gap-3 px-3 py-3 bg-slate-50 rounded-lg">
                <Clock size={20} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {new Date(nextShift.fecha).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-slate-500 truncate">Turno {nombreTurno(nextShift.tipoTurno).toLowerCase()}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin turnos asignados en las próximas dos semanas.</p>
            )}
          </div>

          {!exposicion?.activo && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Mi formación</h2>
            {trainings.length > 0 ? (
              <div className="space-y-2">
                {trainings.slice(0, 5).map((t) => (
                  <div key={t._id} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{t.nombre}</p>
                      <p className="text-xs text-slate-400">{t.fechaProgramada?.slice(0, 10)} · {t.horasDuracion || 0}h</p>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700'
                        : t.estado === 'EN_CURSO' ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>{t.estado}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No tiene capacitaciones registradas.</p>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
}
