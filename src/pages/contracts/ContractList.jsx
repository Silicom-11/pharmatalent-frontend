import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, AlertTriangle, Clock, Scale, ThumbsUp, ThumbsDown, RefreshCw,
  CheckCircle2, XCircle, Infinity as InfinityIcon, ExternalLink, Inbox, ShieldAlert } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';

const URGENCIA = {
  VENCIDO: { chip: 'bg-red-100 text-red-700', etiqueta: 'Vencido', orden: 0 },
  CRITICA: { chip: 'bg-red-100 text-red-700', etiqueta: 'Esta semana', orden: 1 },
  ALTA: { chip: 'bg-amber-100 text-amber-700', etiqueta: 'Este mes', orden: 2 },
  MEDIA: { chip: 'bg-blue-100 text-blue-700', etiqueta: 'Dos meses', orden: 3 },
  BAJA: { chip: 'bg-slate-100 text-slate-600', etiqueta: 'Con holgura', orden: 4 },
  SIN_PLAZO: { chip: 'bg-emerald-100 text-emerald-700', etiqueta: 'Sin plazo', orden: 5 },
};

const RECOMENDACION = {
  RENOVAR: { chip: 'bg-emerald-100 text-emerald-700', etiqueta: 'Renovar', icon: ThumbsUp },
  NO_RENOVAR: { chip: 'bg-red-100 text-red-700', etiqueta: 'No renovar', icon: ThumbsDown },
  INDETERMINADO: { chip: 'bg-blue-100 text-blue-700', etiqueta: 'Pasar a indeterminado', icon: InfinityIcon },
};

const DECISION = {
  RENOVADO: { chip: 'bg-emerald-100 text-emerald-700', etiqueta: 'Renovado' },
  NO_RENOVADO: { chip: 'bg-red-100 text-red-700', etiqueta: 'No renovado' },
  CONVERTIDO_INDETERMINADO: { chip: 'bg-blue-100 text-blue-700', etiqueta: 'Indeterminado' },
};

const S = (n) => (n != null ? `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—');
const fecha = (v) => (v ? String(v).slice(0, 10) : '—');
const enUnAnio = (desde) => {
  const d = desde ? new Date(desde) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ContractList() {
  const { usuario } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [horizonte, setHorizonte] = useState(90);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [desnaturalizados, setDesnaturalizados] = useState(null);
  const [form, setForm] = useState({ nuevaFechaFin: '', sueldo: '', notas: '' });

  const puedeRecomendar = can(usuario, 'contracts', 'read');
  const puedeResolver = can(usuario, 'contracts', 'write');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/contracts/pipeline', { params: { dias: horizonte } });
      // Los ya vencidos con la persona en planilla no salen del pipeline
      api.get('/contracts/alerts')
        .then((a) => setDesnaturalizados(a.data.desnaturalizacion))
        .catch(() => {});
      setData(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cargar la cartera');
    } finally { setLoading(false); }
  }, [horizonte]);

  useEffect(() => { load(); }, [load]);

  const abrir = (c) => {
    setDetail(c);
    setForm({ nuevaFechaFin: enUnAnio(c.fechaFin), sueldo: c.sueldo || '', notas: '' });
  };

  const recomendar = async (recomendacion) => {
    setBusy(true);
    try {
      await api.put(`/contracts/${detail._id}/recommend`, { recomendacion, nota: form.notas });
      toast.success('Recomendación registrada — Recursos Humanos resolverá');
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar');
    } finally { setBusy(false); }
  };

  const renovar = async (convertToIndefinite = false, acknowledgeLegalCap = false) => {
    setBusy(true);
    try {
      const r = await api.put(`/contracts/${detail._id}/renew`, {
        nuevaFechaFin: convertToIndefinite ? undefined : form.nuevaFechaFin,
        sueldo: form.sueldo ? Number(form.sueldo) : undefined,
        notas: form.notas,
        convertToIndefinite,
        acknowledgeLegalCap,
      });
      toast.success(r.data.mensaje || 'Contrato renovado');
      setDetail(null);
      load();
    } catch (err) {
      const d = err.response?.data;
      if (d?.requiresConversion) {
        if (confirm(`${d.error}\n\n¿Convertirlo a plazo indeterminado?`)) return renovar(true);
        toast.error('Renovación cancelada');
        return;
      }
      toast.error(d?.error || 'No se pudo renovar');
    } finally { setBusy(false); }
  };

  const noRenovar = async () => {
    const motivo = prompt('Motivo de la no renovación:');
    if (!motivo) return;
    setBusy(true);
    try {
      const r = await api.put(`/contracts/${detail._id}/terminate`, { motivo: motivo });
      toast.success(r.data.mensaje);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar');
    } finally { setBusy(false); }
  };

  const filas = (data?.data || []).slice().sort(
    (a, b) => (URGENCIA[a.urgencia.nivel]?.orden ?? 9) - (URGENCIA[b.urgencia.nivel]?.orden ?? 9)
  );

  const columns = [
    {
      key: 'empleado', etiqueta: 'Empleado',
      render: (v) => v ? (
        <Link to={`/employees/${v._id}`} className="group no-underline">
          <p className="font-medium text-slate-700 group-hover:text-primary flex items-center gap-1">
            {v.nombres} {v.apellidos}
            <ExternalLink size={11} className="opacity-0 group-hover:opacity-100" />
          </p>
          <p className="text-xs text-slate-400">{v.localActual?.nombre || v.tipoProfesional}</p>
        </Link>
      ) : '—',
    },
    {
      key: 'urgencia', etiqueta: 'Vence',
      render: (v, row) => {
        const u = URGENCIA[v.nivel] || URGENCIA.BAJA;
        return (
          <div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.chip}`}>{u.etiqueta}</span>
            <p className="text-xs text-slate-400 mt-0.5">
              {fecha(row.fechaFin)}{v.dias != null && ` · ${v.dias >= 0 ? `${v.dias}d` : `hace ${Math.abs(v.dias)}d`}`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'legal', etiqueta: 'Acumulado',
      render: (v) => (
        <div>
          <span className={`text-sm font-semibold ${v.debeSerIndeterminado ? 'text-blue-600' : 'text-slate-700'}`}>
            {v.acumuladoAnios} años
          </span>
          {v.debeSerIndeterminado && (
            <p className="text-[11px] text-blue-600">supera el tope legal</p>
          )}
        </div>
      ),
    },
    {
      key: 'antecedentes', etiqueta: 'Antecedentes',
      render: (v) => (
        <div className="text-xs">
          <span className={v.puntualidad >= 85 ? 'text-emerald-600' : v.puntualidad >= 70 ? 'text-amber-600' : 'text-red-600'}>
            {v.puntualidad != null ? `${v.puntualidad}% puntual` : 'sin marcas'}
          </span>
          {v.faltas > 0 && <span className="text-red-500 ml-1.5">{v.faltas} falta(s)</span>}
          {v.evaluacion?.puntaje != null && (
            <p className="text-slate-400">evaluación {v.evaluacion.puntaje}</p>
          )}
        </div>
      ),
    },
    // La API no la envía a quien no administra remuneraciones; la columna tampoco se muestra
    ...(can(usuario, 'payroll', 'read') ? [{ key: 'sueldo', etiqueta: 'Remuneración', render: (v) => <span className="tabular-nums text-slate-700">{S(v)}</span> }] : []),
    {
      key: 'decisionRenovacion', etiqueta: 'Estado',
      render: (v) => {
        if (v?.decision) {
          const d = DECISION[v.decision];
          return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.chip}`}>{d.etiqueta}</span>;
        }
        if (v?.recomendacion) {
          const r = RECOMENDACION[v.recomendacion];
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${r.chip}`}>
              <r.icon size={11} /> {r.etiqueta}
            </span>
          );
        }
        return <span className="text-xs text-slate-400">Sin recomendación</span>;
      },
    },
  ];

  const actions = (row) => (
    <button onClick={() => abrir(row)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Resolver">
      <FileText size={16} />
    </button>
  );

  const porNivel = data?.porNivel || {};
  const urgentes = (porNivel.VENCIDO || 0) + (porNivel.CRITICA || 0);

  return (
    <div className="space-y-6">
      {desnaturalizados?.count > 0 && (
        /**
         * El aviso más urgente de esta pantalla.
         * Un contrato modal vencido con el trabajador aún laborando convierte
         * el vínculo en indeterminado por el artículo 77 de la LPCL, se quiera
         * o no. Cada día que pasa consolida esa situación.
         */
        <div className="px-5 py-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-red-900">
                {desnaturalizados.count === 1
                  ? 'Un empleado trabaja con el contrato vencido'
                  : `${desnaturalizados.count} empleados trabajan con el contrato vencido`}
              </h3>
              <p className="text-xs text-red-800 mt-0.5">
                Artículo 77 de la LPCL: si el plazo venció y la persona sigue laborando, el vínculo
                se considera de duración indeterminada. Regularícelo o formalice el cese.
              </p>

              <ul className="mt-2.5 space-y-1">
                {desnaturalizados.contracts.slice(0, 8).map((c) => (
                  <li key={c._id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-red-900 truncate">
                      {c.empleado?.nombres} {c.empleado?.apellidos}
                      <span className="text-red-600"> · DNI {c.empleado?.dni}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-red-700 tabular-nums">
                      {c.diasDesdeElVencimiento} día(s) vencido
                    </span>
                  </li>
                ))}
              </ul>
              {desnaturalizados.count > 8 && (
                <p className="text-xs text-red-700 mt-1.5">y {desnaturalizados.count - 8} más</p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Renovación de Contratos</h1>
          <p className="text-sm text-slate-500 mt-1">
            El centro recomienda y Recursos Humanos resuelve — tope legal de cinco años en contratos a plazo fijo
          </p>
        </div>
        <select
          value={horizonte}
          onChange={(e) => setHorizonte(Number(e.target.value))}
          className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm"
        >
          {[30, 60, 90, 180].map((d) => <option key={d} value={d}>Próximos {d} días</option>)}
        </select>
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Inbox} label="En cartera" value={data.total} tone="primary" hint={`${data.sinDecidir} sin resolver`} />
          <StatCard icon={AlertTriangle} label="Urgentes" value={urgentes} tone={urgentes ? 'red' : 'green'} hint="Vencidos o de esta semana" />
          <StatCard icon={Clock} label="Sin recomendación" value={data.sinRecomendacion} tone="amber" hint="Esperan opinión del centro" />
          <StatCard icon={Scale} label="Superan el tope legal" value={data.requierenIndeterminado} tone={data.requierenIndeterminado ? 'blue' : 'slate'} hint="Corresponde plazo indeterminado" />
        </div>
      )}

      {data?.requierenIndeterminado > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Scale size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {data.requierenIndeterminado} empleado(es) superaron los cinco años bajo contrato modal
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              La Ley de Productividad y Competitividad Laboral considera indeterminada la relación que excede
              ese plazo. Renovar bajo modalidad ya no procede: corresponde formalizar el cambio.
            </p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns} data={filas} loading={loading} actions={actions}
        emptyMessage="No hay contratos por resolver en este horizonte"
      />

      {/* ─── Resolución ─── */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Resolver contrato" wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <Link to={`/employees/${detail.empleado._id}`} className="font-bold text-slate-800 hover:text-primary no-underline">
                  {detail.empleado.nombres} {detail.empleado.apellidos}
                </Link>
                <p className="text-sm text-slate-500">
                  {detail.cargo?.nombre} · {detail.empleado.localActual?.nombre}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {detail.tipo.replace('_', ' ')} desde {fecha(detail.fechaInicio)} · {detail.historialRenovaciones?.length || 0} renovación(es)
                </p>
              </div>
              <StatusBadge variant={detail.estado === 'VIGENTE' ? 'green' : detail.estado === 'POR_VENCER' ? 'yellow' : 'red'}>
                {detail.estado}
              </StatusBadge>
            </div>

            {/* Lo que sustenta la decisión */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Antecedentes (6 meses)</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Puntualidad</span>
                    <span className={`font-medium ${detail.antecedentes.puntualidad >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {detail.antecedentes.puntualidad != null ? `${detail.antecedentes.puntualidad}%` : 'sin marcas'}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-slate-500">Tardanzas</span><span className="text-slate-700">{detail.antecedentes.tardanzas}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Faltas</span><span className={detail.antecedentes.faltas ? 'text-red-600 font-medium' : 'text-slate-700'}>{detail.antecedentes.faltas}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Horas extra</span><span className="text-slate-700">{detail.antecedentes.horasExtra}h</span></div>
                  {detail.antecedentes.evaluacion && (
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-slate-500">Evaluación {detail.antecedentes.evaluacion.periodo}</span>
                      <span className="font-semibold text-slate-800">{detail.antecedentes.evaluacion.puntaje}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`rounded-xl p-4 ${detail.legal.debeSerIndeterminado ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Situación legal</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-slate-800">{detail.legal.acumuladoAnios}</span>
                  <span className="text-sm text-slate-500">de {detail.legal.topeAnios} años bajo modalidad</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${detail.legal.debeSerIndeterminado ? 'bg-blue-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (detail.legal.acumuladoAnios / detail.legal.topeAnios) * 100)}%` }} />
                </div>
                {detail.legal.avisos.map((a, i) => (
                  <p key={i} className="text-xs text-blue-800 leading-snug">{a}</p>
                ))}
              </div>
            </div>

            {detail.decisionRenovacion?.recomendacion && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
                {(() => { const R = RECOMENDACION[detail.decisionRenovacion.recomendacion]; return <R.icon size={16} className="text-slate-500 shrink-0 mt-0.5" />; })()}
                <div>
                  <p className="text-sm text-slate-700">
                    El centro recomienda <strong>{RECOMENDACION[detail.decisionRenovacion.recomendacion].etiqueta.toLowerCase()}</strong>
                  </p>
                  {detail.decisionRenovacion.notaRecomendacion && (
                    <p className="text-xs text-slate-500 mt-0.5">{detail.decisionRenovacion.notaRecomendacion}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {detail.decisionRenovacion.recomendadoPor?.correo} · {fecha(detail.decisionRenovacion.recomendadoEn)}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Comentario</label>
              <textarea
                value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={2} placeholder="Sustento de la decisión"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-none"
              />
            </div>

            {/* Paso 1: recomendación del centro */}
            {!detail.decisionRenovacion?.recomendacion && puedeRecomendar && !puedeResolver && (
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => recomendar('NO_RENOVAR')} disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                  <ThumbsDown size={15} /> Recomendar no renovar
                </button>
                <button onClick={() => recomendar('RENOVAR')} disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                  <ThumbsUp size={15} /> Recomendar renovar
                </button>
              </div>
            )}

            {/* Paso 2: resolución de Recursos Humanos */}
            {puedeResolver && !detail.decisionRenovacion?.decision && (
              <div className="pt-3 border-t border-slate-100 space-y-4">
                {!detail.legal.debeSerIndeterminado && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Nueva fecha de término</label>
                      <input type="date" value={form.nuevaFechaFin} onChange={(e) => setForm({ ...form, nuevaFechaFin: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Remuneración</label>
                      <input type="number" value={form.sueldo} onChange={(e) => setForm({ ...form, sueldo: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 flex-wrap">
                  <button onClick={noRenovar} disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                    <XCircle size={15} /> No renovar
                  </button>
                  <button onClick={() => renovar(true)} disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
                    <InfinityIcon size={15} /> Pasar a indeterminado
                  </button>
                  {!detail.legal.debeSerIndeterminado && (
                    <button onClick={() => renovar(false)} disabled={busy || !form.nuevaFechaFin}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                      <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Renovar
                    </button>
                  )}
                </div>
              </div>
            )}

            {detail.decisionRenovacion?.decision && (
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <p className="text-sm text-slate-700">
                  Resuelto como <strong>{DECISION[detail.decisionRenovacion.decision].etiqueta}</strong>
                  {detail.decisionRenovacion.decididoPor?.correo && ` por ${detail.decisionRenovacion.decididoPor.correo}`}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
