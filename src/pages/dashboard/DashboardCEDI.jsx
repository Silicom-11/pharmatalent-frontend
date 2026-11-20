import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Users, PackageCheck, Clock, MapPin, ClipboardList, FileText,
  ArrowRight, Warehouse,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import MarcadorAsistencia from '../../components/MarcadorAsistencia';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';

const ESTADO_CHIP = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  VACACIONES: 'bg-teal-100 text-teal-700',
  LICENCIA: 'bg-violet-100 text-violet-700',
  INACTIVO: 'bg-slate-100 text-slate-600',
};

export default function DashboardCEDI() {
  const { usuario } = useAuth();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/cedi-overview')
      .then((r) => setD(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando panel logístico...</div>;
  if (!d) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <Warehouse size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No hay centro de distribución asociado a su cuenta.</p>
      </div>
    );
  }

  const { centro, plantilla, jornada, abastecimiento, alertas } = d;

  return (
    <div className="space-y-6">
      {/* El CEDI no lleva marca comercial: es infraestructura de la cadena */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Centro de Distribución</p>
            <h1 className="text-2xl font-bold text-slate-800 mt-0.5">{centro.nombre}</h1>
            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" />
              {centro.distrito}
              {centro.horario && (
                <span className="text-slate-400">· operación {centro.horario.apertura}–{centro.horario.cierre}</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Abastece</p>
            <p className="text-2xl font-bold text-slate-800">{abastecimiento.boticas}</p>
            <p className="text-xs text-slate-400">boticas a nivel nacional</p>
          </div>
        </div>
      </div>

      <MarcadorAsistencia />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Plantilla" value={plantilla.activos} tone="primary"
          hint={plantilla.ausentesHoy ? `${plantilla.ausentesHoy} ausente(s) hoy` : 'Sin ausencias hoy'}
        />
        <StatCard
          icon={PackageCheck} label="Cobertura del turno" value={`${jornada.cobertura}%`}
          tone={jornada.cobertura >= 85 ? 'green' : jornada.cobertura >= 60 ? 'amber' : 'red'}
          hint={`${jornada.marcaron} de ${plantilla.activos} marcaron`}
        />
        <StatCard
          icon={Clock} label="Horas del día" value={`${jornada.horasAcumuladas}h`} tone="violet"
          hint={jornada.tardanzas ? `${jornada.tardanzas} tardanza(s)` : 'Sin tardanzas'}
        />
        <StatCard
          icon={Truck} label="Turnos programados" value={jornada.turnosProgramados} tone="blue"
          hint={`${jornada.asignacionesHoy} asignaciones hoy`}
        />
      </div>

      {(alertas.requerimientosAbiertos > 0 || alertas.contratosPorVencer > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {alertas.requerimientosAbiertos > 0 && can(usuario, 'requisitions') && (
            <Link to="/requisitions" className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200 hover:border-violet-300 transition-colors no-underline">
              <div className="flex items-center gap-2.5">
                <ClipboardList size={18} className="text-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-violet-900">{alertas.requerimientosAbiertos} requerimiento(s) abierto(s)</p>
                  <p className="text-xs text-violet-700">Posiciones por cubrir en el almacén</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-violet-400" />
            </Link>
          )}
          {alertas.contratosPorVencer > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <FileText size={18} className="text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">{alertas.contratosPorVencer} contrato(s) por vencer</p>
                <p className="text-xs text-amber-700">Recursos Humanos gestiona la renovación</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composición de la plantilla logística */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Dotación por cargo</h2>
          <p className="text-xs text-slate-500 mb-4">{plantilla.total} empleados asignados</p>
          <div className="space-y-2.5">
            {Object.entries(plantilla.porPuesto)
              .sort(([, a], [, b]) => b - a)
              .map(([cargo, n]) => {
                const pct = Math.round((n / plantilla.total) * 100);
                return (
                  <div key={cargo}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 truncate">{cargo}</span>
                      <span className="font-medium text-slate-700 shrink-0 ml-2">{n}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Red que abastece */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Red abastecida</h2>
          <p className="text-xs text-slate-500 mb-4">Boticas por zona de reparto</p>
          <div className="space-y-1.5">
            {abastecimiento.porZona.map((z) => (
              <div key={z._id || 'sin-zona'} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                <span className="text-slate-600 truncate">{z._id || 'Sin zona'}</span>
                <span className="font-semibold text-slate-800 shrink-0 ml-2">{z.boticas}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quién está y quién no */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Equipo</h2>
            <p className="text-xs text-slate-500 mt-0.5">Estado real de la plantilla</p>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {plantilla.detalle.map((p) => (
              <Link
                key={p._id}
                to={`/employees/${p._id}`}
                className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50 no-underline"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate">{p.nombre}</p>
                  <p className="text-xs text-slate-400 truncate">{p.cargo}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${ESTADO_CHIP[p.estado] || ESTADO_CHIP.INACTIVO}`}>
                  {p.estado}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
