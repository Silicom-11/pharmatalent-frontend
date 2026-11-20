import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Briefcase, Calendar, Phone, Mail, ShieldAlert, AlertTriangle,
  Clock, Palmtree, GraduationCap, FileText, HeartPulse, BarChart3, Receipt,
  BadgeCheck, CalendarClock, UserCheck, TrendingUp, Coins, Award,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import BoletaDetalle, { S } from '../../components/BoletaDetalle';
import Modal from '../../components/Modal';
import { brandOf } from '../../config/roles';
import api from '../../services/api';
import { nombreTurno } from '../../config/turnos';

const NIVEL_ALERTA = {
  CRITICA: { chip: 'bg-red-100 text-red-800 border-red-200', icon: ShieldAlert, tone: 'text-red-600' },
  ALTA: { chip: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle, tone: 'text-amber-600' },
  MEDIA: { chip: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertTriangle, tone: 'text-slate-500' },
};

const TIPO_HITO = {
  INGRESO: { icon: UserCheck, tone: 'bg-emerald-100 text-emerald-700' },
  CONTRATO: { icon: FileText, tone: 'bg-blue-100 text-blue-700' },
  CAPACITACION: { icon: GraduationCap, tone: 'bg-violet-100 text-violet-700' },
  AUSENCIA: { icon: Palmtree, tone: 'bg-teal-100 text-teal-700' },
  SALUD: { icon: HeartPulse, tone: 'bg-rose-100 text-rose-700' },
  EVALUACION: { icon: BarChart3, tone: 'bg-indigo-100 text-indigo-700' },
  PUESTO: { icon: Briefcase, tone: 'bg-amber-100 text-amber-700' },
  SUELDO: { icon: Coins, tone: 'bg-cyan-100 text-cyan-700' },
};

const ESTADO_MARCA = {
  PRESENTE: 'bg-emerald-100 text-emerald-700', TARDANZA: 'bg-amber-100 text-amber-700',
  AUSENTE: 'bg-red-100 text-red-700', VACACIONES: 'bg-teal-100 text-teal-700',
  PERMISO: 'bg-blue-100 text-blue-700', LICENCIA: 'bg-violet-100 text-violet-700',
  FERIADO: 'bg-slate-100 text-slate-600',
};

const fecha = (v) => (v ? String(v).slice(0, 10) : '—');
const hhmm = (v) => (v ? new Date(v).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—');

function Dato({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon size={15} className="text-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

const TABS = [
  ['resumen', 'Resumen'],
  ['trayectoria', 'Trayectoria'],
  ['asistencia', 'Asistencia'],
  ['ausencias', 'Ausencias'],
  ['formacion', 'Formación'],
  ['remuneracion', 'Remuneración'],
];

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [boleta, setBoleta] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/employees/${id}/dossier`)
      .then((r) => setD(r.data))
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar la ficha'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando ficha...</div>;
  if (error) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-slate-200 p-8 text-center">
        <ShieldAlert size={36} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">{error}</p>
        <button onClick={() => navigate('/employees')} className="mt-4 text-sm text-primary hover:underline cursor-pointer">
          Volver a empleados
        </button>
      </div>
    );
  }

  const e = d.empleado;
  const loc = e.localActual || {};
  const marca = brandOf(loc.marca);
  const iniciales = `${e.nombres?.[0] || ''}${e.apellidos?.[0] || ''}`.toUpperCase();
  const asis = d.asistencia;
  const vac = d.vacaciones.balance;

  return (
    <div className="space-y-6">
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 no-underline">
        <ArrowLeft size={15} /> Empleados
      </Link>

      {/* Encabezado con la identidad de la cadena */}
      <div className={`rounded-xl border p-5 ${marca?.soft || 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-800">{e.nombres} {e.apellidos}</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {e.cargoActual?.nombre || d.puestoTurno.etiqueta}
              {loc.nombre && <> · <MapPin size={12} className="inline text-slate-400" /> {loc.nombre}</>}
              {e.zona?.nombre && <span className="text-slate-400"> · Zona {e.zona.nombre}</span>}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge variant={e.estado === 'ACTIVO' ? 'green' : e.estado === 'LICENCIA' ? 'purple' : 'gray'}>
                {e.estado}
              </StatusBadge>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                {e.tipoProfesional}
              </span>
              {e.esPracticante && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">EN INDUCCIÓN</span>
              )}
              {e.esDirectorTecnico && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">DIRECTOR TÉCNICO</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500">Antigüedad</p>
            <p className="text-2xl font-bold text-slate-800">{d.antiguedad.anios} años</p>
            <p className="text-xs text-slate-400">desde {fecha(e.fechaIngreso)}</p>
          </div>
        </div>
      </div>

      {/* Lo que exige atención, arriba de todo */}
      {d.alertas.length > 0 && (
        <div className="space-y-2">
          {d.alertas.map((a, i) => {
            const cfg = NIVEL_ALERTA[a.nivel] || NIVEL_ALERTA.MEDIA;
            return (
              <div key={i} className={`flex items-start gap-2.5 px-4 py-2.5 rounded-xl border ${cfg.chip}`}>
                <cfg.icon size={16} className={`shrink-0 mt-0.5 ${cfg.tone}`} />
                <p className="text-sm">{a.mensaje}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock} label="Puntualidad"
          value={asis.puntualidad != null ? `${asis.puntualidad}%` : '—'}
          tone={asis.puntualidad >= 90 ? 'green' : asis.puntualidad >= 75 ? 'amber' : 'red'}
          hint={asis.diasConDatos ? `${asis.registros} marcas en ${asis.diasConDatos} días` : "Sin marcas registradas"}
        />
        <StatCard icon={Palmtree} label="Vacaciones" value={`${vac.diasDisponibles} días`} tone="primary" hint={`${vac.diasGozados} gozados de ${vac.diasAcumulados}`} />
        <StatCard
          icon={Award} label="Desempeño"
          value={d.desempeno.puntaje ?? '—'} tone={d.desempeno.puntaje >= 85 ? 'green' : 'amber'}
          hint={d.desempeno.ultima?.periodo?.nombre || 'Sin evaluación'}
        />
        <StatCard icon={Receipt} label="Último neto" value={S(d.remuneracion.ultimoNeto)} tone="blue" hint={d.remuneracion.boletas[0]?.periodo || 'Sin boletas'} />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(([k, etiqueta]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === k ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >{etiqueta}</button>
        ))}
      </div>

      {/* ─── Resumen ─── */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-2">Datos del empleado</h2>
            <div className="grid grid-cols-2 gap-x-6">
              <Dato icon={UserCheck} label="DNI" value={e.dni} />
              <Dato icon={Mail} label="Correo" value={e.correo} />
              <Dato icon={Phone} label="Teléfono" value={e.telefono} />
              <Dato icon={Calendar} label="Ingreso" value={fecha(e.fechaIngreso)} />
              <Dato icon={Briefcase} label="Puesto en turno" value={d.puestoTurno.etiqueta} />
              <Dato icon={MapPin} label="Distrito" value={e.direccion?.distrito} />
              {d.formacion.colegiatura && (
                <Dato icon={BadgeCheck} label="Colegiatura CQF"
                  value={`${d.formacion.colegiatura.numero} · ${d.formacion.colegiatura.estado.replace('_', ' ').toLowerCase()}`} />
              )}
              <Dato icon={Coins} label="Afiliación previsional" value={e.sistemaPensiones?.replace('_', ' ')} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Situación contractual</h2>
              {d.contrato.diasParaVencer != null && (
                <span className={`text-xs font-semibold ${d.contrato.diasParaVencer <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {d.contrato.diasParaVencer >= 0 ? `vence en ${d.contrato.diasParaVencer} días` : 'vencido'}
                </span>
              )}
            </div>
            {d.contrato.vigente ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className="font-medium text-slate-700">{d.contrato.vigente.tipo.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vigencia</span><span className="text-slate-700">{fecha(d.contrato.vigente.fechaInicio)} → {fecha(d.contrato.vigente.fechaFin) || 'indefinido'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Remuneración</span><span className="font-medium text-slate-700">{S(d.contrato.vigente.sueldo)}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">Estado</span><StatusBadge variant={d.contrato.vigente.estado === 'VIGENTE' ? 'green' : 'yellow'}>{d.contrato.vigente.estado}</StatusBadge></div>
                <div className="flex justify-between"><span className="text-slate-500">Renovaciones</span><span className="text-slate-700">{d.contrato.vigente.historialRenovaciones?.length || 0}</span></div>
              </div>
            ) : <p className="text-sm text-slate-400">Sin contrato registrado.</p>}

            {d.proximosTurnos.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Próximos turnos</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.proximosTurnos.slice(0, 8).map((t) => (
                    <span key={t._id} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      {fecha(t.fecha).slice(5)} · {nombreTurno(t.tipoTurno)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Trayectoria ─── */}
      {tab === 'trayectoria' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Trayectoria en la empresa</h2>
          <p className="text-xs text-slate-500 mb-5">{d.lineaDeTiempo.length} hitos registrados</p>
          <div className="space-y-0">
            {d.lineaDeTiempo.map((h, i) => {
              const cfg = TIPO_HITO[h.tipo] || TIPO_HITO.CONTRATO;
              const ultimo = i === d.lineaDeTiempo.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.tone}`}>
                      <cfg.icon size={15} />
                    </div>
                    {!ultimo && <div className="w-px flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className={`min-w-0 flex-1 ${ultimo ? '' : 'pb-5'}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800 first-letter:uppercase">{h.titulo}</p>
                      <span className="text-xs text-slate-400 shrink-0 tabular-nums">{fecha(h.fecha)}</span>
                    </div>
                    {h.detalle && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{h.detalle}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Asistencia ─── */}
      {tab === 'asistencia' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CalendarClock} label="Horas trabajadas" value={`${asis.horasTrabajadas}h`} tone="primary"
              hint={asis.desde ? `Desde ${fecha(asis.desde)}` : "Sin datos"} />
            <StatCard icon={TrendingUp} label="Horas extra" value={`${asis.horasExtra}h`} tone="violet" hint="Se pagan con recargo" />
            <StatCard icon={Clock} label="Tardanzas" value={asis.tardanzas} tone={asis.tardanzas ? 'amber' : 'green'} hint={`${asis.minutosTardanzaTotal} minutos acumulados`} />
            <StatCard icon={AlertTriangle} label="Faltas" value={asis.faltas} tone={asis.faltas ? 'red' : 'green'} hint="Ausencias sin justificar" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Marcas recientes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Centro</th>
                    <th className="px-5 py-3">Entrada</th><th className="px-5 py-3">Salida</th>
                    <th className="px-5 py-3">Horas</th><th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {asis.recientes.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5 text-slate-700">{fecha(m.fecha)}</td>
                      <td className="px-5 py-2.5 text-slate-500">{m.local?.nombre || '—'}</td>
                      <td className="px-5 py-2.5 text-slate-500">
                        {hhmm(m.marcaEntrada)}
                        {m.minutosTardanza > 0 && <span className="text-amber-600 text-xs ml-1">+{m.minutosTardanza}′</span>}
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">{hhmm(m.marcaSalida)}</td>
                      <td className="px-5 py-2.5 text-slate-700">{m.horasTrabajadas ? `${m.horasTrabajadas}h` : '—'}</td>
                      <td className="px-5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_MARCA[m.estado] || ESTADO_MARCA.FERIADO}`}>{m.estado}</span>
                      </td>
                    </tr>
                  ))}
                  {asis.recientes.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Sin marcas en los últimos 90 días</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Ausencias ─── */}
      {tab === 'ausencias' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-1">Descanso vacacional</h2>
            <p className="text-xs text-slate-500 mb-4">D.L. 713 — 30 días por año de servicio</p>
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              {[['Acumulados', vac.diasAcumulados], ['Gozados', vac.diasGozados],
                ['Disponibles', vac.diasDisponibles], ['Comprometidos', vac.pendingDays]].map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded-lg py-2">
                  <p className="text-lg font-bold text-slate-800">{v}</p>
                  <p className="text-[10px] text-slate-500">{l}</p>
                </div>
              ))}
            </div>
            {vac.riesgoTriplePago && (
              <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
                Acumula vacaciones vencidas: cada día no gozado genera derecho a triple remuneración.
              </p>
            )}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {d.vacaciones.solicitudes.map((v) => (
                <div key={v._id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-slate-700">{v.tipo.replace('_', ' ').toLowerCase()} · {v.diasTotales} días</p>
                    <p className="text-xs text-slate-400">{fecha(v.fechaInicio)} → {fecha(v.fechaFin)}</p>
                  </div>
                  <StatusBadge variant={v.estado === 'APROBADO' ? 'green' : v.estado === 'RECHAZADO' ? 'red' : 'yellow'}>{v.estado}</StatusBadge>
                </div>
              ))}
              {d.vacaciones.solicitudes.length === 0 && <p className="text-sm text-slate-400 py-3">Sin solicitudes registradas.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-1">Descansos médicos</h2>
            <p className="text-xs text-slate-500 mb-4">
              {d.salud.diasAcumuladosAnio} días acumulados este año
              {d.salud.diasAcumuladosAnio > 20 && ' · supera el tramo a cargo del empleador'}
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {d.salud.descansos.map((m) => (
                <div key={m._id} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-slate-700">{m.diagnostico || m.tipo.replace('_', ' ').toLowerCase()}</p>
                    <span className="text-xs text-slate-400 shrink-0">{m.diasTotales} días</span>
                  </div>
                  <p className="text-xs text-slate-400">{fecha(m.fechaInicio)} → {fecha(m.fechaFin)}</p>
                  {m.subsidio?.aplica && (
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {m.subsidio.diasEssalud} días subsidiados por EsSalud · {S(m.subsidio.montoEstimado)}
                    </p>
                  )}
                </div>
              ))}
              {d.salud.descansos.length === 0 && <p className="text-sm text-slate-400 py-3">Sin descansos médicos registrados.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ─── Formación ─── */}
      {tab === 'formacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">
              Capacitaciones <span className="text-slate-400 font-normal">({d.formacion.completadas} completadas)</span>
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {d.formacion.capacitaciones.map((t) => (
                <div key={t._id} className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 leading-snug">{t.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {t.tipo} · {fecha(t.fechaCompletado || t.fechaProgramada)}
                      {t.horasDuracion ? ` · ${t.horasDuracion}h` : ''}
                      {t.puntaje != null ? ` · nota ${t.puntaje}` : ''}
                    </p>
                  </div>
                  <StatusBadge variant={t.estado === 'COMPLETADA' ? 'green' : t.estado === 'EN_CURSO' ? 'blue' : 'gray'}>{t.estado}</StatusBadge>
                </div>
              ))}
              {d.formacion.capacitaciones.length === 0 && <p className="text-sm text-slate-400 py-3">Sin capacitaciones registradas.</p>}
            </div>
          </div>

          <div className="space-y-6">
            {d.formacion.colegiatura && (
              <div className={`rounded-xl border p-5 ${
                d.formacion.colegiatura.estado === 'VIGENTE' ? 'bg-emerald-50 border-emerald-200'
                  : d.formacion.colegiatura.estado === 'POR_VENCER' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <BadgeCheck size={18} className="text-slate-600" />
                  <h2 className="font-semibold text-slate-800">Habilitación profesional</h2>
                </div>
                <p className="text-sm text-slate-700">Colegiatura {d.formacion.colegiatura.numero}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vence {fecha(d.formacion.colegiatura.vence)}
                  {d.formacion.colegiatura.diasParaVencer > 0 && ` · ${d.formacion.colegiatura.diasParaVencer} días`}
                </p>
                {d.formacion.certificacionDigemid && (
                  <p className="text-xs text-emerald-700 mt-2">
                    Certificación DIGEMID: {d.formacion.certificacionDigemid.nombre} ({fecha(d.formacion.certificacionDigemid.fechaCompletado)})
                  </p>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Evaluaciones de desempeño</h2>
              {d.desempeno.evaluaciones.map((ev) => (
                <div key={ev._id} className="mb-4 last:mb-0">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">{ev.periodo?.nombre}</p>
                    <StatusBadge variant={ev.estado === 'REVISADO' ? 'green' : 'yellow'}>{ev.estado}</StatusBadge>
                  </div>
                  <div className="space-y-1.5">
                    {(ev.kpis || []).map((k, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-600">{k.nombre}</span>
                          <span className={`font-medium ${k.real >= k.meta ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {k.real}{k.unidad} <span className="text-slate-400">de {k.meta}{k.unidad}</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${k.real >= k.meta ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, (k.real / (k.meta || 100)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {ev.areasDeMejora && (
                    <p className="text-xs text-slate-500 mt-2 leading-snug">A mejorar: {ev.areasDeMejora}</p>
                  )}
                </div>
              ))}
              {d.desempeno.evaluaciones.length === 0 && <p className="text-sm text-slate-400">Sin evaluaciones registradas.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ─── Remuneración ─── */}
      {tab === 'remuneracion' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Boletas</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sueldo base vigente {S(d.remuneracion.sueldoBase)}</p>
          </div>
          {d.remuneracion.boletas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Sin boletas emitidas.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {d.remuneracion.boletas.map((b) => (
                <button key={b._id} onClick={() => setBoleta(b)}
                  className="w-full text-left flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{b.periodo}</p>
                    <p className="text-xs text-slate-500">
                      {b.dias?.remunerados ?? 30} días
                      {b.ingresos?.horasExtra?.horas > 0 && ` · ${b.ingresos.horasExtra.horas}h extra`}
                      {b.gratificacion?.aplica && ' · con gratificación'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-600 tabular-nums">{S(b.netoAPagar)}</span>
                    <StatusBadge variant={b.estado === 'PAGADO' ? 'green' : b.estado === 'APROBADO' ? 'blue' : 'yellow'}>{b.estado}</StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!boleta} onClose={() => setBoleta(null)} title={`Boleta ${boleta?.periodo || ''}`} wide>
        {boleta && <BoletaDetalle boleta={{ ...boleta, empleado: e }} />}
      </Modal>
    </div>
  );
}
