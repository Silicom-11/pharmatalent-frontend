import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, MapPin, FileText, AlertTriangle, ShieldAlert, CalendarClock,
  ClipboardList, HeartPulse, ArrowRight, Network, TrendingUp } from 'lucide-react';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { roleLabel, can } from '../../config/roles';
import api from '../../services/api';

const TYPE_LABEL = {
  QF: 'Químicos Farmacéuticos', TECNICO: 'Técnicos en Farmacia', OPERARIO: 'Personal operativo',
  ADMINISTRATIVO: 'Administrativos', JEFE_LOCAL: 'Administradores de Botica',
  JEFE_ZONA: 'Supervisores de Zona', GERENCIA: 'Gerencia',
};

const RISK_STYLE = {
  CRITICO: 'bg-red-100 text-red-700', MEDIO: 'bg-amber-100 text-amber-700', BAJO: 'bg-emerald-100 text-emerald-700',
};

export default function Dashboard() {
  const { usuario, exposicion } = useAuth();
  const [resumen, setSummary] = useState(null);
  const [risk, setRisk] = useState(null);
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/dashboard/summary'),
      api.get('/audits/risk-map'),
      api.get('/org/chart'),
    ]).then(([s, r, c]) => {
      if (s.status === 'fulfilled') setSummary(s.value.data);
      if (r.status === 'fulfilled') setRisk(r.value.data);
      if (c.status === 'fulfilled') setChart(c.value.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando panel...</div>;

  const s = resumen || {};
  const a = s.alerts || {};
  const total = chart?.totalHeadcount || s.employees?.activo || 1;

  const criticalRisk = risk?.resumen?.CRITICO || 0;
  const attendanceRate = s.employees?.activo ? Math.round((s.today?.attendance / s.employees.activo) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-sm text-slate-500 mt-1">
          {roleLabel(usuario?.rol)} · {exposicion?.activo ? 'Vista de Junín: 13 boticas en dos zonas' : 'Vista nacional de InRetail Pharma S.A.'}
        </p>
      </div>

      {/* Alertas que exigen decisión */}
      {((can(usuario, 'audits') && (criticalRisk > 0 || a.nonCompliantAudits > 0)) || a.shiftsWithoutQF > 0 || s.locations?.withoutTechnicalDirector > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-900 text-sm">Riesgo regulatorio activo</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-red-800">
                {can(usuario, 'audits') && criticalRisk > 0 && <span><strong>{criticalRisk}</strong> botica(s) en riesgo crítico DIGEMID</span>}
                {s.locations?.withoutTechnicalDirector > 0 && <span><strong>{s.locations.withoutTechnicalDirector}</strong> sin Director Técnico asignado</span>}
                {a.shiftsWithoutQF > 0 && <span><strong>{a.shiftsWithoutQF}</strong> turno(s) hoy sin QF</span>}
                {can(usuario, 'audits') && a.nonCompliantAudits > 0 && <span><strong>{a.nonCompliantAudits}</strong> auditoría(s) no conforme(s) abierta(s)</span>}
              </div>
              {can(usuario, 'audits') && (
                <Link to="/audits" className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline no-underline mt-2">
                  Ver mapa de riesgo <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Empleados" value={s.employees?.activo} tone="primary" hint={`${s.employees?.qfs || 0} QF · ${s.employees?.trainees || 0} en inducción`} />
        <StatCard icon={MapPin} label="Centros de trabajo" value={s.locations?.total} tone="green" hint="Boticas, CEDI y sede" />
        <StatCard icon={CalendarClock} label="Asistencia hoy" value={`${attendanceRate}%`} tone={attendanceRate >= 85 ? 'green' : 'amber'} hint={`${s.today?.attendance || 0} marcas · ${s.today?.late || 0} tardanzas`} />
        {can(usuario, 'audits') && <StatCard icon={TrendingUp} label="Cumplimiento DIGEMID" value={risk ? `${risk.compliance}%` : '—'} tone={risk?.compliance >= 80 ? 'green' : 'amber'} hint={`${risk?.total || 0} boticas evaluadas`} />}
        {can(usuario, 'contracts') && <StatCard icon={FileText} label="Contratos por vencer" value={a.contractsExpiring} tone="amber" hint="Próximos 30 días" />}
        {can(usuario, 'requisitions') && <StatCard icon={ClipboardList} label="Requerimientos abiertos" value={a.openRequisitions} tone="violet" hint="Posiciones por cubrir" />}
        <StatCard icon={AlertTriangle} label="Vacaciones pendientes" value={a.pendingVacations} tone="cyan" hint="Esperan aprobación" />
        {can(usuario, 'welfare') && <StatCard icon={HeartPulse} label="Descansos médicos" value={a.activeLeaves} tone="rose" hint="Empleados de licencia hoy" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composición de la dotación */}
        {chart && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-800">Estructura organizacional</h2>
                <p className="text-xs text-slate-500 mt-0.5">Dotación por nivel</p>
              </div>
              {can(usuario, 'org') && <Link to="/org" className="text-xs text-primary font-medium hover:underline no-underline flex items-center gap-1">
                <Network size={13} /> Organigrama
              </Link>}
            </div>
            <div className="space-y-3">
              {chart.levels.map((lvl) => {
                const pct = Math.round((lvl.headcount / total) * 100);
                return (
                  <div key={lvl.codigo}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{lvl.etiqueta}</span>
                      <span className="font-medium text-slate-700">{lvl.headcount} <span className="text-slate-400 text-xs">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          { CORPORATIVO: 'bg-indigo-500', ZONAL: 'bg-blue-500', CEDI: 'bg-orange-500', BOTICA: 'bg-emerald-500' }[lvl.codigo]
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Por tipo profesional</p>
              <div className="grid grid-cols-2 gap-2">
                {(s.employees?.byType || []).slice().sort((a, b) => b.count - a.count).map((t) => (
                  <div key={t._id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 text-sm">
                    <span className="text-slate-600 truncate">{TYPE_LABEL[t._id] || t._id}</span>
                    <span className="font-semibold text-slate-800 shrink-0 ml-2">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Boticas en riesgo */}
        {risk && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-800">Semáforo regulatorio</h2>
                <p className="text-xs text-slate-500 mt-0.5">Boticas que requieren atención</p>
              </div>
              {can(usuario, 'audits') && (
                <Link to="/audits" className="text-xs text-primary font-medium hover:underline no-underline flex items-center gap-1">
                  Ver todo <ArrowRight size={13} />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[['CRITICO', 'Crítico'], ['MEDIO', 'Medio'], ['BAJO', 'Conforme']].map(([k, etiqueta]) => (
                <div key={k} className={`rounded-lg px-3 py-2.5 text-center ${RISK_STYLE[k]}`}>
                  <p className="text-xl font-bold">{risk.resumen[k]}</p>
                  <p className="text-[11px] font-medium">{etiqueta}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {risk.items.filter((i) => i.risk !== 'BAJO').slice(0, 8).map((l) => (
                <div key={l._id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.marca === 'MIFARMA' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`} />
                      {l.nombre}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {!l.directorTecnico ? 'Sin Director Técnico'
                        : l.licenseExpired ? 'Colegiatura vencida'
                          : l.puntaje == null ? 'Sin auditar'
                            : `Puntaje ${l.puntaje}/100`}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_STYLE[l.risk]}`}>
                    {l.risk}
                  </span>
                </div>
              ))}
              {risk.items.filter((i) => i.risk !== 'BAJO').length === 0 && (
                <p className="text-sm text-emerald-600 text-center py-6">Toda la red se encuentra conforme.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
