import { useState, useEffect } from 'react';
import {
  Store, Users, ClipboardCheck, AlertTriangle, ShieldAlert, ClipboardList, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { can } from '../../config/roles';

const ALERT_INFO = {
  SIN_DIRECTOR_TECNICO: { etiqueta: 'Sin Director Técnico', style: 'bg-red-100 text-red-700', icon: ShieldAlert },
  QF_INSUFICIENTE: { etiqueta: 'QF insuficiente', style: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  AUDITORIA: { etiqueta: 'Auditoría baja', style: 'bg-amber-100 text-amber-700', icon: ShieldAlert },
};

export default function DashboardZonal() {
  const { usuario } = useAuth();
  const [resumen, setSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.get('/dashboard/summary'), api.get('/dashboard/zone-overview')])
      .then(([s, o]) => {
        if (s.status === 'fulfilled') setSummary(s.value.data);
        if (o.status === 'fulfilled') setOverview(o.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando panel zonal...</div>;

  const zoneName = usuario?.empleado?.zoneName;
  const t = overview?.totals || {};
  const a = resumen?.alerts || {};
  const attendanceRate = t.headcount ? Math.round((t.present / t.headcount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Supervisión Zonal{zoneName ? ` — ${zoneName}` : ''}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t.locations || 0} boticas bajo su supervisión · {t.headcount || 0} empleados
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Store} label="Boticas" value={t.locations} tone="primary" hint={`${t.withAlert || 0} con alerta activa`} />
        <StatCard icon={Users} label="Dotación" value={t.headcount} tone="blue" hint={`${resumen?.employees?.qfs || 0} Químicos Farmacéuticos`} />
        <StatCard icon={ClipboardCheck} label="Asistencia hoy" value={`${attendanceRate}%`} tone={attendanceRate >= 85 ? 'green' : 'amber'} hint={`${t.present || 0} de ${t.headcount || 0} marcaron`} />
        {can(usuario, 'requisitions')
          ? <StatCard icon={ClipboardList} label="Requerimientos" value={a.openRequisitions} tone="violet" hint="Posiciones por cubrir en su zona" />
          : <StatCard icon={ClipboardList} label="Vacaciones por autorizar" value={a.pendingVacations ?? 0} tone="violet" hint="Avaladas o pedidas en su zona" />}
      </div>

      {/* Acciones que esperan su decisión */}
      {(a.pendingVacations > 0 || a.openRequisitions > 0 || a.contractsExpiring > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Pendientes de su aprobación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {can(usuario, 'requisitions') && a.openRequisitions > 0 && (
              <Link to="/requisitions" className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-violet-50 border border-violet-200 hover:border-violet-300 transition-colors no-underline">
                <div>
                  <p className="text-2xl font-bold text-violet-700">{a.openRequisitions}</p>
                  <p className="text-xs text-violet-600">requerimientos de personal</p>
                </div>
                <ArrowRight size={18} className="text-violet-400" />
              </Link>
            )}
            {a.pendingVacations > 0 && (
              <Link to="/vacations" className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-teal-50 border border-teal-200 hover:border-teal-300 transition-colors no-underline">
                <div>
                  <p className="text-2xl font-bold text-teal-700">{a.pendingVacations}</p>
                  <p className="text-xs text-teal-600">solicitudes de vacaciones</p>
                </div>
                <ArrowRight size={18} className="text-teal-400" />
              </Link>
            )}
            {can(usuario, 'contracts') && a.contractsExpiring > 0 && (
              <Link to="/contracts" className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors no-underline">
                <div>
                  <p className="text-2xl font-bold text-amber-700">{a.contractsExpiring}</p>
                  <p className="text-xs text-amber-600">contratos por vencer</p>
                </div>
                <ArrowRight size={18} className="text-amber-400" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tablero de boticas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Boticas de la zona</h2>
          <p className="text-xs text-slate-500 mt-0.5">Los locales con alerta se muestran primero</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Botica', 'Administrador', 'Director Técnico', 'Dotación', 'Asistencia hoy', 'Req.', 'Auditoría', 'Alerta'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(overview?.locations || []).map((l) => {
                const alert = ALERT_INFO[l.alert];
                return (
                  <tr key={l._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${l.marca === 'MIFARMA' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`} />
                        {l.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.responsable || <span className="text-slate-300">Sin asignar</span>}</td>
                    <td className="px-4 py-3">
                      {l.directorTecnico
                        ? <span className={l.licenseExpired ? 'text-red-600 font-medium' : 'text-slate-600'}>
                            {l.directorTecnico}{l.licenseExpired && ' (CQF vencida)'}
                          </span>
                        : <span className="text-red-600 font-semibold">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{l.headcount}</span>
                      <span className="text-xs text-slate-400 ml-1">({l.conteoQF} QF)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={l.present === 0 ? 'text-slate-300' : 'text-slate-700'}>
                        {l.present}/{l.headcount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {l.openReqs > 0
                        ? <span className="font-semibold text-violet-600">{l.openReqs}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${l.auditScore == null ? 'text-slate-300' : l.auditScore >= 90 ? 'text-emerald-600' : l.auditScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {l.auditScore ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {alert ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${alert.style}`}>
                          <alert.icon size={12} />
                          {alert.etiqueta}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">Sin alertas</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
