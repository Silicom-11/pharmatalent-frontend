import { useState, useEffect, useCallback } from 'react';
import {
  Palmtree, Check, X, ShieldAlert, Inbox, Eye, Clock, Repeat,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import CoberturaLocal from '../../components/CoberturaLocal';
import api from '../../services/api';
import usePaginado from '../../hooks/usePaginado';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PENDIENTE: 'yellow', APROBADO_LOCAL: 'blue', APROBADO: 'green',
  RECHAZADO: 'red', EN_CURSO: 'blue', COMPLETADO: 'gray', CANCELADO: 'gray',
};
const STATUS_LABEL = {
  PENDIENTE: 'Pendiente', APROBADO_LOCAL: 'Avalado por el local', APROBADO: 'Autorizado',
  RECHAZADO: 'Rechazado', EN_CURSO: 'En curso', COMPLETADO: 'Gozado', CANCELADO: 'Retirado',
};
const TYPE_LABEL = {
  VACACIONES: 'Vacaciones', PERMISO: 'Permiso',
  LICENCIA_MEDICA: 'Licencia médica', LICENCIA_SIN_GOCE: 'Licencia sin goce',
};

export default function VacationList() {
  const [tab, setTab] = useState('pendientes');
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoHist, setEstadoHist] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando] = useState(false);

  // Los botones no salen de los permisos genéricos del rol sino de la bandeja:
  // el servidor devuelve sólo las solicitudes cuyo paso pendiente le toca
  // decidir a quien consulta, y dice cuál es ese paso. Antes un Jefe de Zona
  // veía «Autorizar» en solicitudes que el local todavía no había avalado, y
  // un administrador veía «Avalar» en las de otra botica.
  const bandeja = new Map(pending.map((p) => [p._id, p]));
  const decisionDe = (row) => {
    const b = bandeja.get(row._id);
    if (!b) return null;
    return {
      ruta: b.esPasoFinal ? 'approve' : 'endorse',
      etiqueta: b.esPasoFinal ? 'Autorizar' : 'Avalar',
      exito: b.esPasoFinal ? 'Descanso autorizado' : 'Descanso avalado — pasa al siguiente paso',
      paso: b.etiquetaPaso,
      suplencia: b.suplencia,
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.get('/vacations/pending').catch(() => null);
      setPending(p?.data?.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // El historial se pide por páginas: antes eran las cincuenta primeras
  const historial = usePaginado('/vacations', { estado: estadoHist }, { limit: 25, activo: tab === 'todas' });

  const act = async (id, path, body, msg) => {
    setBusy(true);
    try {
      await api.put(`/vacations/${id}/${path}`, body || {});
      toast.success(msg);
      setDetail(null);
      setMotivoRechazo('');
      setRechazando(false);
      load();
      if (tab === 'todas') historial.recargar();
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresAcknowledgement) {
        const nota = prompt(`${data.error}\n\nIndique quién cubrirá el puesto para autorizar:`);
        if (nota) {
          return act(id, path, { ...body, acknowledgeCoverage: true, coverageNote: nota }, msg);
        }
        toast.error('Autorización cancelada: falta designar cobertura');
        return;
      }
      toast.error(data?.error || 'No se pudo completar la acción');
    } finally { setBusy(false); }
  };


  const columns = [
    {
      key: 'empleado', etiqueta: 'Empleado',
      render: (v) => v ? (
        <div>
          <p className="font-medium text-slate-700">{v.nombres} {v.apellidos}</p>
          <p className="text-xs text-slate-400">{v.tipoProfesional}</p>
        </div>
      ) : '—',
    },
    { key: 'tipo', etiqueta: 'Tipo', render: (v) => <span className="text-xs text-slate-600">{TYPE_LABEL[v] || v}</span> },
    {
      key: 'fechaInicio', etiqueta: 'Período',
      render: (_, row) => (
        <span className="text-sm">{row.fechaInicio?.slice(0, 10)} → {row.fechaFin?.slice(0, 10)}</span>
      ),
    },
    { key: 'diasTotales', etiqueta: 'Días', render: (v) => <span className="font-semibold">{v}</span> },
    {
      key: 'impact', etiqueta: 'Cobertura del local',
      render: (v) => {
        if (!v) return <span className="text-xs text-slate-300">—</span>;
        if (!v.evaluatesRoster) return <span className="text-xs text-slate-400">No aplica</span>;

        // Un puesto legalmente exigido sin cubrir bloquea la operación
        if (v.blocking) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700"
                  title={v.legalGaps.map((g) => `Falta ${g.brecha} ${g.etiqueta}`).join(' · ')}>
              <ShieldAlert size={11} /> Sin {v.legalGaps[0]?.etiqueta || 'QF'}
            </span>
          );
        }
        // Huecos en puestos no exigidos por ley
        if (v.otherGaps?.length) {
          return (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"
                  title={v.otherGaps.map((g) => `${g.etiqueta}: ${g.available} de ${g.requerido}`).join(' · ')}>
              Falta {v.otherGaps.map((g) => g.etiqueta).join(', ')}
            </span>
          );
        }
        // La ausencia se absorbe con polivalencia
        if (v.coveredBySubstitution > 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700"
                  title={v.substitutes.map((s) => `${s.count} ${s.etiqueta}`).join(' · ')}>
              <Repeat size={11} /> Polivalencia
            </span>
          );
        }
        return <span className="text-xs text-emerald-600">Dotación cubierta</span>;
      },
    },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{STATUS_LABEL[v] || v}</StatusBadge> },
    ...(tab === 'pendientes' ? [{
      key: 'etiquetaPaso', etiqueta: 'Le toca',
      render: (v, row) => (
        <span className="text-xs font-medium text-slate-700">
          {v}{row.suplencia && <span className="block text-[10px] text-amber-600">en suplencia</span>}
        </span>
      ),
    }] : []),
  ];

  const actions = (row) => {
    const d = decisionDe(row);
    return (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => { setDetail(row); setRechazando(false); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Ver detalle">
          <Eye size={16} />
        </button>
        {d && (
          <>
            <button
              onClick={() => act(row._id, d.ruta, {}, d.exito)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer"
              title={`${d.etiqueta} (${d.paso})`}
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => { setDetail(row); setRechazando(true); }}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
              title="Rechazar"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
    );
  };

  const blocking = pending.filter((p) => p.impact?.blocking).length;
  const atRisk = pending.filter((p) => p.balance?.riesgoTriplePago).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Autorización de Descansos</h1>
        <p className="text-sm text-slate-500 mt-1">
          El local avala la cobertura y la zona autoriza — D.L. 713
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox} label="En trámite" value={pending.length} tone="primary" hint="Esperan una decisión" />
        <StatCard icon={ShieldAlert} label="Bloquean por norma" value={blocking} tone={blocking ? 'red' : 'green'} hint="Dejan al local sin Director Técnico" />
        <StatCard icon={Clock} label="Riesgo de triple pago" value={atRisk} tone={atRisk ? 'amber' : 'green'} hint="Vacaciones vencidas sin gozar" />
        <StatCard icon={Palmtree} label="Registros" value={historial.pagination?.total ?? '—'} tone="slate" hint={historial.pagination ? 'Historial en su ámbito' : 'Abra el historial para contarlos'} />
      </div>

      {blocking > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              {blocking} solicitud(es) dejarían un local sin Químico Farmacéutico
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              El sistema exige designar quién cubrirá la dirección técnica antes de autorizar.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {[['pendientes', `En trámite (${pending.length})`], ['todas', 'Historial completo']].map(([k, etiqueta]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === k ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {tab === 'pendientes' ? (
        <DataTable
          columns={columns}
          data={pending}
          loading={loading}
          actions={actions}
          emptyMessage="No hay solicitudes esperando su decisión"
        />
      ) : (
        <DataTable
          columns={columns}
          {...historial.tabla}
          actions={actions}
          emptyMessage={historial.error || 'No hay registros con este filtro'}
          headerAction={(
            <select value={estadoHist} onChange={(e) => setEstadoHist(e.target.value)} aria-label="Estado" className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
        />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Solicitud de descanso" wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">
                  {detail.empleado?.nombres} {detail.empleado?.apellidos}
                </h3>
                <p className="text-sm text-slate-500">
                  {detail.empleado?.dni} · {detail.empleado?.tipoProfesional} · {TYPE_LABEL[detail.tipo]}
                </p>
              </div>
              <StatusBadge variant={STATUS_MAP[detail.estado]}>{STATUS_LABEL[detail.estado]}</StatusBadge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-slate-400">Desde</p><p className="font-medium text-slate-700">{detail.fechaInicio?.slice(0, 10)}</p></div>
              <div><p className="text-xs text-slate-400">Hasta</p><p className="font-medium text-slate-700">{detail.fechaFin?.slice(0, 10)}</p></div>
              <div><p className="text-xs text-slate-400">Días</p><p className="font-medium text-slate-700">{detail.diasTotales}</p></div>
            </div>

            {detail.balance && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Saldo D.L. 713</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-700">{detail.balance.diasAcumulados}</p>
                    <p className="text-[10px] text-slate-500">acumulados</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{detail.balance.diasGozados}</p>
                    <p className="text-[10px] text-slate-500">gozados</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{detail.balance.diasDisponibles}</p>
                    <p className="text-[10px] text-slate-500">disponibles</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{detail.balance.anosDeServicio}</p>
                    <p className="text-[10px] text-slate-500">años de servicio</p>
                  </div>
                </div>
                {detail.balance.riesgoTriplePago && (
                  <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-3">
                    Acumula vacaciones vencidas: cada día no gozado genera derecho a triple remuneración.
                  </p>
                )}
              </div>
            )}

            {detail.impact && <CoberturaLocal impact={detail.impact} />}

            {detail.motivo && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Motivo</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{detail.motivo}</p>
              </div>
            )}

            {detail.aprobaciones?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Historial de decisiones</p>
                <div className="space-y-2">
                  {detail.aprobaciones.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3 py-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${
                        a.decision === 'APROBADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>{a.paso}</span>
                      <div className="min-w-0">
                        <p className="text-slate-700">{a.comentario || a.decision}</p>
                        <p className="text-xs text-slate-400">{a.usuario?.correo} · {a.fecha?.slice(0, 10)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {decisionDe(detail) && (() => {
              const d = decisionDe(detail);
              return (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <p className="text-xs text-slate-500">
                    Le corresponde decidir: <span className="font-semibold text-slate-700">{d.paso}</span>
                    {d.suplencia && <span className="ml-1 text-amber-600">(en suplencia: queda registrado)</span>}
                  </p>
                  {rechazando && (
                    <textarea
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      rows={2}
                      placeholder="Motivo del rechazo — el colaborador lo verá"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-200 outline-none"
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    {rechazando ? (
                      <>
                        <button onClick={() => setRechazando(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                          Volver
                        </button>
                        <button
                          onClick={() => act(detail._id, 'reject', { motivo: motivoRechazo.trim() }, 'Solicitud rechazada')}
                          disabled={busy || motivoRechazo.trim().length < 5}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          Confirmar rechazo
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setRechazando(true)}
                          disabled={busy}
                          className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => act(detail._id, d.ruta, {}, d.exito)}
                          disabled={busy}
                          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          {d.etiqueta}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
