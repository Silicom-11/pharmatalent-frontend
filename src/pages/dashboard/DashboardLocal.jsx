import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CalendarClock, ShieldAlert, FileText, ClipboardList, ArrowRight,
  ShieldCheck, MapPin, UserPlus, Palmtree,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { brandOf, can } from '../../config/roles';
import api from '../../services/api';

const TYPE_CHIP = {
  QF: 'bg-emerald-100 text-emerald-700',
  TECNICO: 'bg-sky-100 text-sky-700',
  OPERARIO: 'bg-slate-100 text-slate-600',
  JEFE_LOCAL: 'bg-teal-100 text-teal-700',
  ADMINISTRATIVO: 'bg-indigo-100 text-indigo-700',
};

export default function DashboardLocal() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);
  const [staffing, setStaffing] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  const emp = usuario?.empleado || {};
  const locationId = emp.localActual?._id;
  const marca = brandOf(emp.localActual?.marca || emp.locationBrand);

  useEffect(() => {
    const calls = [
      api.get('/dashboard/summary'),
      api.get('/requisitions', { params: { limit: 5 } }),
      api.get('/audits', { params: { limit: 1 } }),
    ];
    if (locationId) calls.push(api.get(`/org/staffing/${locationId}`));

    Promise.allSettled(calls).then(([s, r, a, st]) => {
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (r.status === 'fulfilled') setRequisitions(r.value.data.data || []);
      if (a.status === 'fulfilled') setAudit((a.value.data.data || [])[0] || null);
      if (st?.status === 'fulfilled') setStaffing(st.value.data);
      setLoading(false);
    });
  }, [locationId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando panel del local...</div>;

  const s = stats || {};
  const a = s.alerts || {};
  const local = staffing?.local;
  const team = staffing?.staff || [];
  const activeTeam = team.filter((e) => e.estado !== 'CESADO');
  const locationName = local?.nombre || emp.localActual?.nombre || emp.locationName || 'Mi centro de trabajo';
  const attendanceRate = activeTeam.length ? Math.round(((s.today?.attendance || 0) / activeTeam.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${marca?.soft || 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {local?.tipo === 'CEDI' ? 'Centro de Distribución' : 'Administración de Botica'}
            </p>
            <h1 className="text-2xl font-bold text-slate-800 mt-0.5">{locationName}</h1>
            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" />
              {local?.direccion?.distrito || '—'}
              {local?.zona?.nombre && <span className="text-slate-400">· Zona {local.zona.nombre}</span>}
              {local?.formato && <span className="text-slate-400">· Formato {local.formato}</span>}
            </p>
          </div>
          {local?.directorTecnico && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Director Técnico</p>
              <p className="text-sm font-semibold text-slate-700">
                {local.directorTecnico.nombres} {local.directorTecnico.apellidos}
              </p>
              <p className="text-xs text-slate-400">{local.directorTecnico.numeroCQF}</p>
            </div>
          )}
        </div>
      </div>

      {/* Brecha crítica de dotación */}
      {staffing?.criticalGap && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Dotación de Químico Farmacéutico por debajo del mínimo</p>
            <p className="text-xs text-red-700 mt-0.5">
              La presencia del QF es obligatoria en todo el horario de atención. Levante un requerimiento de personal.
            </p>
          </div>
          {can(usuario, 'requisitions', 'write') && (
            <Link to="/requisitions" className="shrink-0 text-xs font-medium text-red-700 hover:underline no-underline flex items-center gap-1">
              Solicitar <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Mi equipo" value={activeTeam.length} tone="primary" hint={`${staffing?.byType?.QF || 0} QF · ${staffing?.byType?.TECNICO || 0} técnicos`} />
        <StatCard icon={CalendarClock} label="Asistencia hoy" value={`${attendanceRate}%`} tone={attendanceRate >= 85 ? 'green' : 'amber'} hint={`${s.today?.attendance || 0} marcas · ${s.today?.late || 0} tardanzas`} />
        {can(usuario, 'audits') ? (
          <StatCard
            icon={ShieldCheck} label="Última auditoría" value={audit?.puntaje ?? '—'}
            tone={!audit ? 'slate' : audit.puntaje >= 90 ? 'green' : audit.puntaje >= 70 ? 'amber' : 'red'}
            hint={audit ? `${audit.fechaVisita?.slice(0, 10)} · ${audit.hallazgosAbiertos || 0} abierto(s)` : 'Sin visitas'}
          />
        ) : (
          <StatCard icon={ShieldCheck} label="Turnos sin QF hoy" value={a.shiftsWithoutQF ?? 0} tone={a.shiftsWithoutQF ? 'red' : 'green'} hint="DIGEMID exige QF en todo turno" />
        )}
        {can(usuario, 'contracts')
          ? <StatCard icon={FileText} label="Contratos por vencer" value={a.contractsExpiring ?? 0} tone="amber" hint="Próximos 30 días" />
          : <StatCard icon={Palmtree} label="Vacaciones por decidir" value={a.pendingVacations ?? 0} tone="cyan" hint="Solicitudes de su equipo" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dotación real vs. requerida */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Dotación</h2>
          <p className="text-xs text-slate-500 mb-4">Personal asignado frente al mínimo del formato</p>
          {staffing?.gaps ? (
            <div className="space-y-4">
              {staffing.gaps.map((g) => (
                <div key={g.rol}>
                  <div className="flex justify-between items-baseline text-sm mb-1">
                    <span className="text-slate-600">{g.rol}</span>
                    <span className={`font-semibold ${g.cubierto ? 'text-emerald-600' : 'text-red-600'}`}>
                      {g.real}/{g.requerido}
                      {!g.cubierto && <span className="text-xs font-normal ml-1">(faltan {Math.abs(g.brecha)})</span>}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${g.cubierto ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, g.requerido ? (g.real / g.requerido) * 100 : 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin información de dotación para este centro.</p>
          )}
        </div>

        {/* Equipo */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-800">Equipo del centro</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeTeam.length} empleados asignados</p>
            </div>
            <Link to="/employees" className="text-xs text-primary font-medium hover:underline no-underline flex items-center gap-1">
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">Empleado</th>
                  <th className="px-5 py-3">Cargo</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTeam.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">
                      {e.nombres} {e.apellidos}
                      {e.esPracticante && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">TRAINEE</span>}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{e.cargoActual?.nombre || '—'}</td>
                    <td className="px-5 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_CHIP[e.tipoProfesional] || TYPE_CHIP.OPERARIO}`}>
                        {e.tipoProfesional}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        e.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700'
                          : e.estado === 'LICENCIA' ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>{e.estado}</span>
                    </td>
                  </tr>
                ))}
                {activeTeam.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No hay empleados asignados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Requerimientos del local */}
      {can(usuario, 'requisitions') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Mis requerimientos de personal</h2>
              <p className="text-xs text-slate-500 mt-0.5">Solicitudes enviadas al supervisor zonal</p>
            </div>
            <Link to="/requisitions" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark no-underline">
              <UserPlus size={14} /> Solicitar personal
            </Link>
          </div>
          {requisitions.length > 0 ? (
            <div className="space-y-2">
              {requisitions.map((r) => (
                <div key={r._id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-mono text-xs text-slate-400 mr-2">{r.codigo}</span>
                      {r.cargo?.nombre} <span className="text-slate-400">×{r.cantidad}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.diasAbierto ?? 0} días abierto
                      {r.estaVencido && <span className="text-red-500 font-medium ml-1">· fuera de plazo</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.estado === 'SOLICITADO' ? 'bg-amber-100 text-amber-700'
                      : r.estado === 'APROBADO_ZONAL' ? 'bg-blue-100 text-blue-700'
                        : r.estado === 'EN_BUSQUEDA' ? 'bg-violet-100 text-violet-700'
                          : r.estado === 'CUBIERTO' ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                  }`}>{(r.estado || '').replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
              <ClipboardList size={16} />
              No tiene requerimientos abiertos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
