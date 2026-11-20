import { useState, useEffect } from 'react';
import { CalendarClock, Clock, Users, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { nombreTurno } from '../../config/turnos';

const SHIFT_STYLE = {
  MANANA: 'bg-amber-50 text-amber-800 border-amber-200',
  TARDE: 'bg-blue-50 text-blue-800 border-blue-200',
  NOCHE: 'bg-indigo-900 text-indigo-50 border-indigo-800',
};
const ROLE_LABEL = {
  QF: 'Químico Farmacéutico', QF_ASISTENTE: 'QF Asistente', TECNICO: 'Técnico en Farmacia',
  TRAINEE: 'En inducción', CAJERO: 'Caja', DERMOCONSULTOR: 'Dermoconsultoría',
  AUX_ALMACEN: 'Almacén', PREVENCIONISTA: 'Prevención', MOTORIZADO: 'Reparto',
  ADMIN_BOTICA: 'Administración',
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const iso = (d) => d.toISOString().slice(0, 10);

/** Domingo de la semana que contiene la fecha */
function weekStartOf(fecha) {
  const d = new Date(fecha);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function WeekGrid({ label, start, shiftsByDate, employeeId }) {
  const fin = new Date(start);
  fin.setDate(fin.getDate() + 6);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold text-slate-800">{label}</h2>
        <span className="text-sm text-slate-400">{iso(start)} — {iso(fin)}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const day = new Date(start);
          day.setDate(day.getDate() + i);
          const dayShifts = shiftsByDate.get(iso(day)) || [];
          const isToday = iso(day) === iso(new Date());

          return (
            <div key={i} className={`rounded-xl border p-2.5 min-h-[6.5rem] ${
              dayShifts.length ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'
            } ${isToday ? 'ring-2 ring-primary/40' : ''}`}>
              <div className="text-center mb-2">
                <p className="text-xs font-bold uppercase text-slate-600">{DAYS[day.getDay()]}</p>
                <p className="text-[10px] text-slate-400">{iso(day).slice(5)}</p>
              </div>

              {dayShifts.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center mt-2">Descanso</p>
              ) : (
                <div className="space-y-1.5">
                  {dayShifts.map((s) => {
                    const mine = s.asignaciones?.find((a) => String(a.empleado?._id || a.empleado) === String(employeeId));
                    return (
                      <div key={s._id} className={`rounded-lg border px-1.5 py-1 ${SHIFT_STYLE[s.tipoTurno] || SHIFT_STYLE.MANANA}`}>
                        <p className="text-[11px] font-bold">{nombreTurno(s.tipoTurno)}</p>
                        <p className="text-[10px] opacity-80">{s.horaInicio}–{s.horaFin}</p>
                        {mine?.rol && (
                          <p className="text-[10px] opacity-90 mt-0.5 leading-tight">{ROLE_LABEL[mine.rol] || mine.rol}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 opacity-75">
                          <Users size={9} />
                          <span className="text-[9px]">{s.asignaciones?.length || 0}</span>
                          {s.tieneQF && <ShieldCheck size={9} className="ml-auto" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MiHorario() {
  const { usuario } = useAuth();
  const [turnos, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/me/schedule')
      .then((r) => setShifts(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const emp = usuario?.empleado || {};
  const employeeId = emp._id || usuario?.employeeId;
  const locationName = emp.localActual?.nombre || emp.locationName || 'Mi centro de trabajo';

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando horario...</div>;

  // Agrupa los turnos por fecha
  const byDate = new Map();
  for (const s of turnos) {
    const key = s.fecha?.slice(0, 10);
    if (!key) continue;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(s);
  }

  const thisWeek = weekStartOf(new Date());
  const nextWeek = new Date(thisWeek);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Horas programadas en la semana en curso
  const weekHours = turnos
    .filter((s) => {
      const d = new Date(s.fecha);
      return d >= thisWeek && d < nextWeek;
    })
    .reduce((total, s) => {
      const [sh, sm] = (s.horaInicio || '0:0').split(':').map(Number);
      const [eh, em] = (s.horaFin || '0:0').split(':').map(Number);
      let h = (eh + em / 60) - (sh + sm / 60);
      if (h < 0) h += 24;
      return total + h;
    }, 0);

  const upcoming = turnos.find((s) => new Date(s.fecha) >= new Date(new Date().setHours(0, 0, 0, 0)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mi Horario</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            {locationName}
          </p>
        </div>
        {turnos.length > 0 && (
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-xl font-bold text-slate-800">{turnos.length}</p>
              <p className="text-xs text-slate-400">turnos programados</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${weekHours > 48 ? 'text-red-600' : 'text-slate-800'}`}>
                {weekHours.toFixed(0)} h
              </p>
              <p className="text-xs text-slate-400">esta semana</p>
            </div>
          </div>
        )}
      </div>

      {upcoming && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <Clock size={20} className="text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800 capitalize">
              Próximo turno: {new Date(upcoming.fecha).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-slate-500">
              {nombreTurno(upcoming.tipoTurno)} · {upcoming.horaInicio}–{upcoming.horaFin} · {upcoming.local?.nombre || locationName}
            </p>
          </div>
        </div>
      )}

      {turnos.length > 0 ? (
        <>
          <WeekGrid label="Semana actual" start={thisWeek} shiftsByDate={byDate} employeeId={employeeId} />
          <WeekGrid label="Próxima semana" start={nextWeek} shiftsByDate={byDate} employeeId={employeeId} />
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
          <CalendarClock size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">Sin horario programado</h3>
          <p className="text-sm text-slate-400">
            No tiene turnos asignados en las próximas dos semanas. Consulte con el Administrador de Botica.
          </p>
        </div>
      )}
    </div>
  );
}
