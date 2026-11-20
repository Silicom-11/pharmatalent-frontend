import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, PenLine, Check, X, AlertCircle, TrendingUp, MessageSquare,
} from 'lucide-react';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Las evaluaciones propias.
 *
 * Firmar no significa estar de acuerdo: acredita que se comunicó, y por eso el
 * empleado puede dejar su descargo por escrito al firmar. Esa distinción
 * importa cuando la evaluación sustenta una decisión sobre su vínculo laboral.
 */

const TONO_NOTA = (n) => {
  if (n >= 90) return { texto: 'text-emerald-700', fondo: 'bg-emerald-50', borde: 'border-emerald-200' };
  if (n >= 75) return { texto: 'text-blue-700', fondo: 'bg-blue-50', borde: 'border-blue-200' };
  if (n >= 60) return { texto: 'text-slate-700', fondo: 'bg-slate-50', borde: 'border-slate-200' };
  if (n >= 40) return { texto: 'text-amber-700', fondo: 'bg-amber-50', borde: 'border-amber-200' };
  return { texto: 'text-red-700', fondo: 'bg-red-50', borde: 'border-red-200' };
};

const ESTADO = {
  BORRADOR: { variant: 'gray', texto: 'En preparación' },
  ENVIADO: { variant: 'yellow', texto: 'Pendiente de su firma' },
  REVISADO: { variant: 'blue', texto: 'Pendiente de su firma' },
  FIRMADO: { variant: 'green', texto: 'Firmada' },
};

const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Indicador({ kpi }) {
  const logro = kpi.meta > 0 ? Math.min((kpi.real / kpi.meta) * 100, 150) : 0;
  const tono = TONO_NOTA(logro);
  return (
    <li className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-sm text-slate-700">{kpi.nombre}</span>
        <span className={`text-sm font-semibold tabular-nums ${tono.texto}`}>
          {Math.round(logro)}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${logro >= 75 ? 'bg-emerald-500' : logro >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(logro, 100)}%` }}
          />
        </div>
        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
          {kpi.real} de {kpi.meta}{kpi.unidad || ''} · peso {kpi.peso}%
        </span>
      </div>
      {kpi.descripcion && <p className="text-[11px] text-slate-400 mt-1">{kpi.descripcion}</p>}
    </li>
  );
}

export default function MisEvaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [firmando, setFirmando] = useState(null);
  const [descargo, setDescargo] = useState({ empleadoConforme: true, comentarioEmpleado: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Endpoint de autoservicio: el listado de gestión exige un módulo que el
      // personal operativo no tiene, y la pantalla fallaba para todos ellos
      const r = await api.get('/me/evaluations');
      setEvaluaciones(r.data.data || []);
    } catch {
      toast.error('No se pudieron cargar sus evaluaciones');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const firmar = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const r = await api.put(`/evaluations/${firmando._id}/firmar`, descargo);
      toast.success(r.data.mensaje);
      setFirmando(null);
      setDetalle(null);
      setDescargo({ empleadoConforme: true, comentarioEmpleado: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar la constancia');
    } finally { setBusy(false); }
  };

  const pendientes = evaluaciones.filter(
    (e) => ['ENVIADO', 'REVISADO'].includes(e.estado) && !e.firmadoPorEmpleado
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mis Evaluaciones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Su desempeño evaluado por período
        </p>
      </div>

      {pendientes.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {pendientes.length === 1
                ? 'Tiene una evaluación pendiente de firma'
                : `Tiene ${pendientes.length} evaluaciones pendientes de firma`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Firmar deja constancia de que la conoció. Puede hacerlo aunque no esté de acuerdo.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Cargando...</p>
      ) : evaluaciones.length === 0 ? (
        <div className="py-16 text-center">
          <BarChart3 size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">Todavía no tiene evaluaciones registradas</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {evaluaciones.map((e) => {
            const tono = TONO_NOTA(e.puntajeGlobal ?? 0);
            const est = ESTADO[e.estado] || { variant: 'gray', texto: e.estado };
            const pendiente = ['ENVIADO', 'REVISADO'].includes(e.estado) && !e.firmadoPorEmpleado;

            return (
              <button
                key={e._id}
                onClick={() => setDetalle(e)}
                className={`text-left p-4 bg-white rounded-xl border transition-colors cursor-pointer hover:border-slate-300 ${
                  pendiente ? 'border-amber-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {e.periodo?.nombre || `${fecha(e.periodo?.fechaInicio)} — ${fecha(e.periodo?.fechaFin)}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      Evaluó {e.evaluador?.nombres} {e.evaluador?.apellidos}
                    </p>
                  </div>
                  <StatusBadge variant={est.variant}>{est.texto}</StatusBadge>
                </div>

                {e.puntajeGlobal != null && (
                  <div className={`flex items-baseline gap-2 px-3 py-2 rounded-lg border ${tono.fondo} ${tono.borde}`}>
                    <TrendingUp size={15} className={tono.texto} />
                    <span className={`text-xl font-bold tabular-nums ${tono.texto}`}>{e.puntajeGlobal}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    {e.calificacionCualitativa && (
                      <span className={`ml-auto text-xs font-medium ${tono.texto}`}>
                        {e.calificacionCualitativa.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                )}

                {e.firmadoPorEmpleado && e.empleadoConforme === false && (
                  <p className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-2">
                    <MessageSquare size={12} /> Firmada con su desacuerdo
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Detalle ─── */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title="Evaluación de desempeño" wide>
        {detalle && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">
                  {detalle.periodo?.nombre || 'Período evaluado'}
                </p>
                <p className="text-xs text-slate-500">
                  {fecha(detalle.periodo?.fechaInicio)} — {fecha(detalle.periodo?.fechaFin)}
                  {detalle.evaluador && ` · evaluó ${detalle.evaluador.nombres} ${detalle.evaluador.apellidos}`}
                </p>
                {detalle.enviadoEn && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Comunicada el {fecha(detalle.enviadoEn)}
                    {detalle.revisadoEn && ` · revisada el ${fecha(detalle.revisadoEn)}`}
                  </p>
                )}
              </div>
              {detalle.puntajeGlobal != null && (
                <div className="text-right shrink-0">
                  <p className={`text-3xl font-bold tabular-nums ${TONO_NOTA(detalle.puntajeGlobal).texto}`}>
                    {detalle.puntajeGlobal}
                  </p>
                  <p className="text-[11px] text-slate-400">{detalle.calificacionCualitativa?.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            {detalle.kpis?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Indicadores</h4>
                <ul>{detalle.kpis.map((k) => <Indicador key={k.nombre} kpi={k} />)}</ul>
              </div>
            )}

            {detalle.fortalezas && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fortalezas</h4>
                <p className="text-sm text-slate-600">{detalle.fortalezas}</p>
              </div>
            )}
            {detalle.areasDeMejora && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">A mejorar</h4>
                <p className="text-sm text-slate-600">{detalle.areasDeMejora}</p>
              </div>
            )}
            {detalle.comentarios && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Comentarios</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line">{detalle.comentarios}</p>
              </div>
            )}

            {detalle.firmadoPorEmpleado ? (
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <p className="flex items-center gap-2 text-sm text-slate-700">
                  <Check size={15} className="text-emerald-600" />
                  Firmada el {fecha(detalle.firmadoEn)}
                  {detalle.empleadoConforme === false && ' · con su desacuerdo'}
                </p>
                {detalle.comentarioEmpleado && (
                  <p className="text-xs text-slate-500 mt-1.5 pl-6">«{detalle.comentarioEmpleado}»</p>
                )}
              </div>
            ) : ['ENVIADO', 'REVISADO'].includes(detalle.estado) ? (
              <button
                onClick={() => setFirmando(detalle)}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                <PenLine size={16} /> Dejar constancia
              </button>
            ) : (
              <p className="text-xs text-slate-400 text-center">
                Esta evaluación todavía no le ha sido comunicada formalmente.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Firma ─── */}
      <Modal open={!!firmando} onClose={() => setFirmando(null)} title="Dejar constancia">
        {firmando && (
          <form onSubmit={firmar} className="space-y-4">
            <p className="text-sm text-slate-600">
              Su firma acredita que <strong>conoció</strong> esta evaluación. No implica que esté
              de acuerdo con ella: puede firmarla y dejar su descargo por escrito.
            </p>

            <div className="space-y-2">
              {[
                [true, 'Estoy de acuerdo con la evaluación', Check, 'emerald'],
                [false, 'La conozco pero no estoy de acuerdo', X, 'amber'],
              ].map(([valor, texto, Icono, color]) => (
                <button
                  key={String(valor)}
                  type="button"
                  onClick={() => setDescargo({ ...descargo, empleadoConforme: valor })}
                  className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border text-left cursor-pointer transition-colors ${
                    descargo.empleadoConforme === valor
                      ? `bg-${color}-50 border-${color}-300`
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icono size={16} className={descargo.empleadoConforme === valor ? `text-${color}-600` : 'text-slate-300'} />
                  <span className="text-sm text-slate-700">{texto}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Su comentario
                <span className="font-normal text-slate-400">
                  {descargo.empleadoConforme === false ? ' (recomendable)' : ' (opcional)'}
                </span>
              </label>
              <textarea
                rows={4}
                value={descargo.comentarioEmpleado}
                onChange={(e) => setDescargo({ ...descargo, comentarioEmpleado: e.target.value })}
                placeholder={descargo.empleadoConforme === false
                  ? 'Explique en qué no está de acuerdo. Quedará registrado junto a la evaluación.'
                  : 'Si quiere añadir algo, escríbalo aquí.'}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-none"
              />
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Una vez registrada, la constancia no se puede modificar.
            </p>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setFirmando(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {busy ? 'Registrando...' : 'Firmar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
