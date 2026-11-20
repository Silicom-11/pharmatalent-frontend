import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, ShieldAlert, Activity, UserCheck, Filter, X, ChevronDown,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MODULOS = {
  employees: 'Empleados', contracts: 'Contratos', payroll: 'Planilla',
  vacations: 'Descansos', schedules: 'Turnos', attendance: 'Asistencia',
  evaluations: 'Evaluaciones', training: 'Capacitaciones', users: 'Cuentas',
  requisitions: 'Requerimientos', recruitment: 'Reclutamiento', welfare: 'Bienestar',
  audits: 'Auditoría', locations: 'Centros', positions: 'Puestos', zones: 'Zonas',
  me: 'Autoservicio', notifications: 'Notificaciones', mantenimiento: 'Mantenimiento',
};

const TONO_ACCION = {
  CREAR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MODIFICAR: 'bg-blue-50 text-blue-700 border-blue-200',
  ELIMINAR: 'bg-red-50 text-red-700 border-red-200',
  APROBAR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECHAZAR: 'bg-red-50 text-red-700 border-red-200',
  PUBLICAR: 'bg-violet-50 text-violet-700 border-violet-200',
  ANULAR: 'bg-amber-50 text-amber-700 border-amber-200',
  RESTABLECER_CLAVE: 'bg-amber-50 text-amber-700 border-amber-200',
  CAMBIAR_ROL: 'bg-amber-50 text-amber-700 border-amber-200',
  CAMBIAR_ESTADO: 'bg-amber-50 text-amber-700 border-amber-200',
  MARCAR: 'bg-slate-50 text-slate-600 border-slate-200',
};

const cuando = (iso) => {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Una entrada del registro, plegable para ver el detalle enviado */
function Entrada({ r }) {
  const [abierta, setAbierta] = useState(false);
  const tieneDetalle = r.despues && Object.keys(r.despues).length > 0;

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[11px] font-bold text-slate-500">
            {r.actorCorreo.slice(0, 2).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${TONO_ACCION[r.accion] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {r.accion.replace(/_/g, ' ')}
            </span>
            <span className="text-[11px] text-slate-400">{MODULOS[r.modulo] || r.modulo}</span>
            {r.sensible && (
              <span className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                <ShieldAlert size={11} /> dato sensible
              </span>
            )}
          </div>

          <p className="text-sm text-slate-700 mt-1">{r.descripcion}</p>

          <p className="text-xs text-slate-400 mt-0.5">
            {r.actorCorreo}
            {r.afectado && ` · sobre ${r.afectado.nombres} ${r.afectado.apellidos}`}
            {' · '}{cuando(r.creadoEn)}
          </p>

          {abierta && (
            <div className="mt-2 px-3 py-2 bg-slate-900 rounded-lg overflow-x-auto">
              <p className="text-[10px] text-slate-400 mb-1">
                {r.metodo} {r.ruta} → {r.estado} · desde {r.ip}
              </p>
              <pre className="text-[11px] text-emerald-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(r.despues, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {tieneDetalle && (
          <button
            onClick={() => setAbierta(!abierta)}
            className="p-1 text-slate-300 hover:text-slate-500 cursor-pointer shrink-0"
            title={abierta ? 'Ocultar detalle' : 'Ver detalle'}
          >
            <ChevronDown size={16} className={abierta ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        )}
      </div>
    </li>
  );
}

export default function Bitacora() {
  const [registros, setRegistros] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [paginacion, setPaginacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ modulo: '', accion: '', sensible: false });
  const [pagina, setPagina] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagina, limit: 40 };
      if (filtros.modulo) params.modulo = filtros.modulo;
      if (filtros.accion) params.accion = filtros.accion;
      if (filtros.sensible) params.sensible = 'true';

      const [l, s] = await Promise.allSettled([
        api.get('/bitacora', { params }),
        api.get('/bitacora/resumen', { params: { dias: 30 } }),
      ]);
      if (l.status === 'fulfilled') {
        setRegistros(l.value.data.data || []);
        setPaginacion(l.value.data.pagination);
      }
      if (s.status === 'fulfilled') setResumen(s.value.data);
    } catch {
      toast.error('No se pudo cargar la bitácora');
    } finally { setLoading(false); }
  }, [filtros, pagina]);

  useEffect(() => { load(); }, [load]);

  const hayFiltro = filtros.modulo || filtros.accion || filtros.sensible;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bitácora de Cambios</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quién modificó qué y cuándo. Las consultas no se registran, sólo los cambios.
        </p>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Cambios" value={resumen.total} tone="blue" hint={`Últimos ${resumen.dias} días`} />
          <StatCard icon={ShieldAlert} label="Sobre datos sensibles" value={resumen.sensibles} tone={resumen.sensibles ? 'amber' : 'green'} hint="Planilla, contratos, cuentas, salud" />
          <StatCard icon={UserCheck} label="Personas que operaron" value={resumen.porActor.length} tone="green" hint="Cuentas con actividad" />
          <StatCard icon={ScrollText} label="Módulos tocados" value={resumen.porModulo.length} tone="slate" hint={resumen.porModulo[0] ? `Más movimiento: ${MODULOS[resumen.porModulo[0].modulo] || resumen.porModulo[0].modulo}` : ''} />
        </div>
      )}

      {resumen?.porActor?.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quién opera más</h3>
            <ul className="space-y-2">
              {resumen.porActor.slice(0, 5).map((a) => (
                <li key={a.correo} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 flex-1 truncate">{a.correo}</span>
                  <span className="text-[10px] text-slate-400">{a.rol}</span>
                  <span className="text-xs font-semibold text-slate-700 w-10 text-right">{a.total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Dónde se concentra</h3>
            <ul className="space-y-2">
              {resumen.porModulo.slice(0, 5).map((m) => {
                const pct = Math.round((m.total / resumen.total) * 100);
                return (
                  <li key={m.modulo}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{MODULOS[m.modulo] || m.modulo}</span>
                      <span className="text-slate-400">{m.total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ─── Filtros ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-slate-400" />
        <select
          value={filtros.modulo}
          onChange={(e) => { setFiltros({ ...filtros, modulo: e.target.value }); setPagina(1); }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
        >
          <option value="">Todos los módulos</option>
          {(resumen?.porModulo || []).map((m) => (
            <option key={m.modulo} value={m.modulo}>{MODULOS[m.modulo] || m.modulo} ({m.total})</option>
          ))}
        </select>

        <select
          value={filtros.accion}
          onChange={(e) => { setFiltros({ ...filtros, accion: e.target.value }); setPagina(1); }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
        >
          <option value="">Toda acción</option>
          {(resumen?.porAccion || []).map((a) => (
            <option key={a.accion} value={a.accion}>{a.accion.replace(/_/g, ' ')} ({a.total})</option>
          ))}
        </select>

        <button
          onClick={() => { setFiltros({ ...filtros, sensible: !filtros.sensible }); setPagina(1); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
            filtros.sensible ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200'
          }`}
        >
          <ShieldAlert size={13} /> Sólo datos sensibles
        </button>

        {hayFiltro && (
          <button
            onClick={() => { setFiltros({ modulo: '', accion: '', sensible: false }); setPagina(1); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={13} /> Limpiar
          </button>
        )}

        {paginacion && (
          <span className="text-xs text-slate-400 ml-auto">
            {paginacion.total} entrada(s)
          </span>
        )}
      </div>

      {/* ─── Registro ─── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            {hayFiltro ? 'Ningún cambio coincide con el filtro' : 'Todavía no hay cambios registrados'}
          </p>
        ) : (
          <ul>{registros.map((r) => <Entrada key={r._id} r={r} />)}</ul>
        )}
      </div>

      {paginacion && paginacion.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">Página {pagina} de {paginacion.pages}</span>
          <button
            disabled={pagina >= paginacion.pages} onClick={() => setPagina(pagina + 1)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
