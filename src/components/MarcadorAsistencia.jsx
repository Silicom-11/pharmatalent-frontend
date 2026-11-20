import { useState, useEffect, useCallback } from 'react';
import { Clock, CalendarX, CheckCircle2, AlertTriangle, Fingerprint, BadgeCheck } from 'lucide-react';
import api from '../services/api';
import { nombreTurno } from '../config/turnos';

const SHIFT_STYLE = {
  MANANA: 'bg-amber-100 text-amber-800',
  TARDE: 'bg-blue-100 text-blue-800',
  NOCHE: 'bg-indigo-900 text-indigo-50',
  JORNADA: 'bg-slate-100 text-slate-700',
};

const hhmm = (v) => (v ? new Date(v).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—');

/**
 * La jornada de hoy del propio empleado: turno, marcas y horas.
 *
 * Antes este componente tenía los botones «Marcar entrada» y «Marcar salida»,
 * con lo que cualquiera registraba su asistencia desde el celular, estuviera
 * donde estuviera. La marca la toma ahora el terminal del centro de trabajo;
 * aquí sólo se ve el resultado, y se dice dónde marcar si todavía no lo hizo.
 */
export default function MarcadorAsistencia() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const r = await api.get('/me/attendance/today');
      setState(r.data);
    } catch {
      setState(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Las horas corren mientras la jornada está abierta; la marca se refresca
  // por si la persona acaba de pasar por el terminal
  useEffect(() => {
    const reloj = setInterval(() => setNow(new Date()), 30000);
    const refresco = setInterval(load, 60000);
    return () => { clearInterval(reloj); clearInterval(refresco); };
  }, [load]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-400">Cargando jornada...</div>;
  }
  if (!state) return null;

  const { scheduled, record, hasShift, exento } = state;

  // Dirección y trabajo de campo no registran asistencia (D.S. 004-2006-TR)
  if (exento) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <BadgeCheck size={20} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Su puesto no registra asistencia</p>
            <p className="text-xs text-slate-500 mt-0.5">{exento}. D.S. 004-2006-TR, artículo 1.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasShift) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <CalendarX size={20} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Hoy no tiene turno asignado</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Si debe cubrir un turno, su administrador lo registra en el cronograma.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const closed = record?.marcaEntrada && record?.marcaSalida;
  const openShift = record?.marcaEntrada && !record?.marcaSalida;
  const rawHours = openShift
    ? (now - new Date(record.marcaEntrada)) / 3600000
    : record?.horasTrabajadas;
  const liveHours = rawHours != null ? Math.round(rawHours * 10) / 10 : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${SHIFT_STYLE[scheduled.tipoTurno] || SHIFT_STYLE.MANANA}`}>
              {nombreTurno(scheduled.tipoTurno)}
            </span>
            <span className="text-xs text-slate-500">{scheduled.horaInicio}–{scheduled.horaFin}</span>
            {scheduled.roleLabel && <span className="text-xs text-slate-400">· {scheduled.roleLabel}</span>}
            {scheduled.local && <span className="text-xs text-slate-400">· {scheduled.local}</span>}
          </div>

          <div className="flex items-center gap-5 text-sm">
            <div>
              <p className="text-[11px] text-slate-400">Entrada</p>
              <p className={`font-semibold ${record?.minutosTardanza > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {hhmm(record?.marcaEntrada)}
                {record?.minutosTardanza > 0 && <span className="text-xs font-normal ml-1">+{record.minutosTardanza}′</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Salida</p>
              <p className="font-semibold text-slate-700">{hhmm(record?.marcaSalida)}</p>
            </div>
            {liveHours != null && (
              <div>
                <p className="text-[11px] text-slate-400">Horas</p>
                <p className="font-semibold text-slate-700">
                  {liveHours}h
                  {openShift && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {closed ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
              <CheckCircle2 size={18} />
              Jornada completa
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-lg text-sm">
              <Fingerprint size={18} className="text-slate-500" />
              <span>
                {openShift ? 'Marque su salida' : 'Marque su entrada'} en el terminal
                <span className="block text-[11px] text-slate-400">de {scheduled.local || 'su centro de trabajo'}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {record?.minutosTardanza > 0 && (
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-amber-700">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Marcó {record.minutosTardanza} minutos después del inicio del turno {nombreTurno(scheduled.tipoTurno).toLowerCase()} ({scheduled.horaInicio}).
        </div>
      )}
      {record?.horasExtra > 0 && (
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-blue-700">
          <Clock size={14} className="shrink-0 mt-0.5" />
          {record.horasExtra} horas de sobretiempo registradas sobre el término del turno.
        </div>
      )}
    </div>
  );
}
