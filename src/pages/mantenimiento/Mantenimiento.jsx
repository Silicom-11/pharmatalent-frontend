import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Bug, RefreshCcw, Sparkles, ShieldCheck, Plus, Search, Activity, Database,
  HardDriveDownload, AlertTriangle, Scale, CheckCircle2, Circle, CircleDot, Clock, X, Server,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';

/**
 * Fase de mantenimiento (GP 08): cada solicitud con el proceso de su tipo,
 * el monitoreo del sistema y el plan preventivo.
 */

const TONO_TIPO = {
  CORRECTIVO: { icono: Bug, chip: 'bg-red-50 text-red-700 border-red-200', barra: 'bg-red-500', stat: 'red' },
  ADAPTATIVO: { icono: RefreshCcw, chip: 'bg-blue-50 text-blue-700 border-blue-200', barra: 'bg-blue-500', stat: 'blue' },
  PERFECTIVO: { icono: Sparkles, chip: 'bg-violet-50 text-violet-700 border-violet-200', barra: 'bg-violet-500', stat: 'violet' },
  PREVENTIVO: { icono: ShieldCheck, chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', barra: 'bg-emerald-500', stat: 'green' },
};
const TONO_PRIORIDAD = {
  CRITICA: 'text-red-700 bg-red-50', ALTA: 'text-amber-700 bg-amber-50', MEDIA: 'text-slate-600 bg-slate-100', BAJA: 'text-slate-500 bg-slate-50',
};
const ESTADO = { ABIERTO: 'Abierto', EN_CURSO: 'En curso', CERRADO: 'Cerrado', DESCARTADO: 'Descartado' };
const CAMPOS = [
  ['analisis', 'Análisis (causa o impacto)'], ['solucion', 'Solución aplicada'],
  ['pruebas', 'Pruebas realizadas y resultado'], ['version', 'Versión desplegada'],
];

const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fechaHora = (d) => (d ? new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function ChipTipo({ tipo, catalogo }) {
  const t = TONO_TIPO[tipo];
  const Icono = t?.icono || Wrench;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${t?.chip || ''}`}>
      <Icono size={11} /> {catalogo?.tipos?.[tipo]?.etiqueta?.toUpperCase() || tipo}
    </span>
  );
}

/** Las etapas del proceso, marcando las cumplidas y la actual */
function Proceso({ r }) {
  return (
    <ol className="space-y-2">
      {r.etapas.map((e, i) => {
        const hecha = i < r.etapa || r.estado === 'CERRADO';
        const actual = i === r.etapa && !['CERRADO', 'DESCARTADO'].includes(r.estado);
        const Icono = hecha ? CheckCircle2 : actual ? CircleDot : Circle;
        return (
          <li key={e.codigo} className={`flex gap-2.5 ${actual ? 'bg-amber-50 border border-amber-200 rounded-lg p-2' : 'px-2'}`}>
            <Icono size={17} className={`shrink-0 mt-0.5 ${hecha ? 'text-emerald-600' : actual ? 'text-amber-600' : 'text-slate-300'}`} />
            <div className="min-w-0">
              <p className={`text-sm ${hecha ? 'text-slate-600' : actual ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{i + 1}. {e.etiqueta}</p>
              {actual && <p className="text-xs text-slate-500 mt-0.5">{e.detalle}{e.exige ? ' Para cerrarla hay que registrar: ' + CAMPOS.find(([c]) => c === e.exige)?.[1].toLowerCase() + '.' : ''}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Detalle({ id, catalogo, puedeEscribir, onClose, onCambio }) {
  const [r, setR] = useState(null);
  const [campos, setCampos] = useState({});
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');
  const [descartando, setDescartando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await api.get(`/mantenimiento/${id}`);
    setR(data);
    setCampos(Object.fromEntries(CAMPOS.map(([c]) => [c, data[c] || ''])));
  }, [id]);
  useEffect(() => { cargar().catch(() => toast.error('No se pudo abrir el mantenimiento')); }, [cargar]);

  if (!r) return <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>;
  const abierto = ['ABIERTO', 'EN_CURSO'].includes(r.estado);
  const ultimaEtapa = r.etapa === r.etapas.length - 1;

  const ejecutar = async (fn, exito) => {
    setOcupado(true);
    try {
      const { data } = await fn();
      setR(data);
      setCampos(Object.fromEntries(CAMPOS.map(([c]) => [c, data[c] || ''])));
      toast.success(exito);
      onCambio();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar');
      return false;
    } finally { setOcupado(false); }
  };
  const cambiados = () => Object.fromEntries(CAMPOS.map(([c]) => [c, campos[c]]).filter(([c, v]) => v !== (r[c] || '') && v.trim()));

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-semibold text-slate-500">{r.codigo}</code>
          <ChipTipo tipo={r.tipo} catalogo={catalogo} />
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TONO_PRIORIDAD[r.prioridad]}`}>{catalogo?.prioridades?.[r.prioridad]?.etiqueta}</span>
          <span className="text-xs text-slate-500">{ESTADO[r.estado]}</span>
          {r.vencido && <span className="text-[10px] font-semibold text-red-600">FUERA DE PLAZO</span>}
        </div>
        <h4 className="text-base font-semibold text-slate-800 mt-1.5">{r.titulo}</h4>
        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.descripcion}</p>
        <p className="text-xs text-slate-400 mt-2">
          {catalogo?.origenes?.[r.origen]} · {catalogo?.areas?.[r.area] || r.area} · {r.reportadoPor?.correo || '—'} · {fecha(r.creadoEn)}
          {r.fechaLimite && abierto ? ` · plazo ${fecha(r.fechaLimite)}` : ''}
          {r.contexto?.pagina ? ` · pantalla ${r.contexto.pagina}` : ''}
          {r.contexto?.incidencia ? ` · incidencia ${r.contexto.incidencia}` : ''}
        </p>
        <p className="text-xs text-slate-400 mt-1">Objetivo del tipo: {catalogo?.tipos?.[r.tipo]?.objetivo}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Proceso ({r.progreso}%)</h5>
          <Proceso r={r} />
        </div>
        <div className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documentación</h5>
          {CAMPOS.map(([c, etiqueta]) => (
            <label key={c} className="block">
              <span className="text-xs font-medium text-slate-600">{etiqueta}</span>
              {c === 'version' ? (
                <input value={campos[c] || ''} disabled={!abierto || !puedeEscribir} onChange={(e) => setCampos({ ...campos, [c]: e.target.value })}
                  placeholder="1.1.0" className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
              ) : (
                <textarea rows={2} value={campos[c] || ''} disabled={!abierto || !puedeEscribir} onChange={(e) => setCampos({ ...campos, [c]: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-600" />
              )}
            </label>
          ))}
          {r.archivos?.length > 0 && (
            <p className="text-[11px] text-slate-500">Archivos: <span className="font-mono">{r.archivos.join(', ')}</span></p>
          )}
          {r.tareas?.length > 0 && (
            <ul className="text-xs space-y-1">
              {r.tareas.map((t) => (
                <li key={t.codigo} className="flex gap-1.5">
                  {t.ok ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />}
                  <span><b>{t.codigo}</b> — {t.detalle}</span>
                </li>
              ))}
            </ul>
          )}
          {abierto && puedeEscribir && Object.keys(cambiados()).length > 0 && (
            <button disabled={ocupado} onClick={() => ejecutar(() => api.put(`/mantenimiento/${id}`, cambiados()), 'Documentación guardada')}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
              Guardar documentación
            </button>
          )}
        </div>
      </div>

      {abierto && puedeEscribir && (
        <div className="border-t border-slate-100 pt-4 space-y-2">
          {!descartando ? (
            <>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Nota de la etapa «{r.etapaActual?.etiqueta}»</span>
                <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué se hizo en esta etapa"
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
              </label>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => setDescartando(true)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">No procede</button>
                <button disabled={ocupado || nota.trim().length < 3}
                  onClick={async () => { if (await ejecutar(() => api.post(`/mantenimiento/${id}/avanzar`, { nota, ...cambiados() }), ultimaEtapa ? 'Mantenimiento cerrado' : 'Etapa cumplida')) setNota(''); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-40 cursor-pointer">
                  {ultimaEtapa ? 'Cerrar mantenimiento' : 'Cumplir etapa y avanzar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">¿Por qué no procede?</span>
                <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="No es un error: el sistema aplica la regla de 7 días mínimos"
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDescartando(false)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">Volver</button>
                <button disabled={ocupado || motivo.trim().length < 5}
                  onClick={() => ejecutar(() => api.post(`/mantenimiento/${id}/descartar`, { motivo }), 'Marcado como no procede')}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg disabled:opacity-40 cursor-pointer">Descartar</button>
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Historial</h5>
        <ul className="space-y-1.5">
          {r.historial.map((h, i) => (
            <li key={i} className="text-xs text-slate-600 flex gap-2">
              <span className="text-slate-400 w-28 shrink-0">{fechaHora(h.en)}</span>
              <span className="flex-1">{h.nota}</span>
              <span className="text-slate-400 truncate max-w-[10rem]">{h.porNombre}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end"><button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">Cerrar</button></div>
    </div>
  );
}

function Nuevo({ catalogo, onClose, onCreado }) {
  const [f, setF] = useState({ tipo: 'CORRECTIVO', titulo: '', descripcion: '', area: 'general', prioridad: 'MEDIA', origen: 'EQUIPO' });
  const [ocupado, setOcupado] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const enviar = async (e) => {
    e.preventDefault();
    setOcupado(true);
    try {
      const { data } = await api.post('/mantenimiento', f);
      toast.success(`${data.codigo} registrado`);
      onCreado(data._id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar');
    } finally { setOcupado(false); }
  };
  const sel = 'mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white';
  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-xs font-medium text-slate-600">Tipo</span>
          <select value={f.tipo} onChange={set('tipo')} className={sel}>
            {Object.entries(catalogo.tipos).map(([k, t]) => <option key={k} value={k}>{t.etiqueta} — {t.objetivo.toLowerCase()}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Origen</span>
          <select value={f.origen} onChange={set('origen')} className={sel}>
            {Object.entries(catalogo.origenes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
      </div>
      <label className="block"><span className="text-xs font-medium text-slate-600">Título</span>
        <input required minLength={5} maxLength={160} value={f.titulo} onChange={set('titulo')} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>
      <label className="block"><span className="text-xs font-medium text-slate-600">Descripción</span>
        <textarea required minLength={10} rows={4} value={f.descripcion} onChange={set('descripcion')} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-xs font-medium text-slate-600">Parte del sistema</span>
          <select value={f.area} onChange={set('area')} className={sel}>
            {Object.entries(catalogo.areas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Prioridad</span>
          <select value={f.prioridad} onChange={set('prioridad')} className={sel}>
            {Object.entries(catalogo.prioridades).map(([k, p]) => <option key={k} value={k}>{p.etiqueta} — {p.plazoDias} día(s)</option>)}
          </select></label>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
        <button disabled={ocupado} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50 cursor-pointer">Registrar</button>
      </div>
    </form>
  );
}

function Solicitudes({ catalogo, puedeEscribir, refrescar, abrir }) {
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ tipo: '', estado: '', q: '' });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { limit: 60 };
      for (const [k, v] of Object.entries(f)) if (v) params[k] = v;
      const { data } = await api.get('/mantenimiento', { params });
      setLista(data.data);
      setTotal(data.pagination.total);
    } catch { toast.error('No se pudieron cargar los mantenimientos'); } finally { setCargando(false); }
  }, [f]);
  useEffect(() => { cargar(); }, [cargar, refrescar]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar por código o título"
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-56" />
        </div>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="">Todos los tipos</option>
          {Object.entries(catalogo.tipos).map(([k, t]) => <option key={k} value={k}>{t.etiqueta}</option>)}
        </select>
        <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="">Todo estado</option>
          <option value="PENDIENTES">Pendientes</option>
          {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(f.tipo || f.estado || f.q) && (
          <button onClick={() => setF({ tipo: '', estado: '', q: '' })} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"><X size={13} /> Limpiar</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{total} registro(s)</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {cargando ? <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
          : lista.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">Ningún mantenimiento coincide{puedeEscribir ? '. Registre uno con «Nuevo mantenimiento».' : '.'}</p>
            : (
              <ul className="divide-y divide-slate-100">
                {lista.map((r) => (
                  <li key={r._id}>
                    <button onClick={() => abrir(r._id)} className="w-full text-left px-5 py-3.5 hover:bg-slate-50/70 cursor-pointer">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] font-semibold text-slate-500">{r.codigo}</code>
                        <ChipTipo tipo={r.tipo} catalogo={catalogo} />
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TONO_PRIORIDAD[r.prioridad]}`}>{catalogo.prioridades[r.prioridad]?.etiqueta}</span>
                        {r.vencido && <span className="text-[10px] font-semibold text-red-600">FUERA DE PLAZO</span>}
                        <span className="text-[11px] text-slate-400 ml-auto">{catalogo.origenes[r.origen]} · {fecha(r.creadoEn)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-1">{r.titulo}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.estado === 'DESCARTADO' ? 'bg-slate-300' : TONO_TIPO[r.tipo].barra}`} style={{ width: `${Math.max(4, r.progreso)}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 w-56 truncate text-right">
                          {r.estado === 'CERRADO' ? `Cerrado ${fecha(r.cerradoEn)}${r.version ? ` · v${r.version}` : ''}` : r.estado === 'DESCARTADO' ? 'No procede' : `${r.etapa + 1}/${r.etapas.length} · ${r.etapaActual?.etiqueta}`}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
      </div>
    </div>
  );
}

function Monitoreo({ puedeEscribir, refrescar, onRegistrado }) {
  const [s, setS] = useState(null);
  const [errores, setErrores] = useState([]);
  const cargar = useCallback(async () => {
    const [a, b] = await Promise.allSettled([api.get('/mantenimiento/salud'), api.get('/mantenimiento/errores', { params: { limit: 15 } })]);
    if (a.status === 'fulfilled') setS(a.value.data);
    if (b.status === 'fulfilled') setErrores(b.value.data.data);
  }, []);
  useEffect(() => { cargar(); }, [cargar, refrescar]);
  if (!s) return <p className="py-10 text-center text-sm text-slate-400">Revisando el sistema…</p>;

  const semaforo = { VERDE: 'bg-emerald-500', AMBAR: 'bg-amber-400', ROJO: 'bg-red-500' }[s.semaforo];
  const registrar = async (id) => {
    try {
      const { data } = await api.post(`/mantenimiento/errores/${id}/registrar`);
      toast.success(`${data.codigo}: correctivo registrado desde el monitoreo`);
      onRegistrado(data._id);
      cargar();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo registrar'); }
  };
  const legal = s.parametrosLegales;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <span className={`w-3.5 h-3.5 rounded-full ${semaforo}`} />
          <h3 className="text-sm font-semibold text-slate-700">
            {s.alertas.length === 0 ? 'Todo en orden' : `${s.alertas.length} punto(s) por atender`}
          </h3>
          <span className="text-xs text-slate-400 ml-auto">v{s.version} · {s.entorno} · Node {s.node} · MongoDB {s.mongo}</span>
        </div>
        {s.alertas.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {s.alertas.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${a.nivel === 'ALTA' ? 'text-red-500' : a.nivel === 'MEDIA' ? 'text-amber-500' : 'text-slate-400'}`} />
                {a.texto}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HardDriveDownload} label="Última copia" value={s.respaldo.ultima ? fecha(s.respaldo.ultima.fecha) : 'Ninguna'}
          tone={s.respaldo.reciente ? 'green' : 'red'}
          hint={`${s.respaldo.total} copia(s)${s.respaldo.ultima ? ` · ${s.respaldo.ultima.tamanoMB} MB` : ''}`} />
        <StatCard icon={Bug} label="Errores (7 días)" value={s.errores.ultimos7Dias} tone={s.errores.sinAtender ? 'amber' : 'green'} hint={`${s.errores.sinAtender} sin atender`} />
        <StatCard icon={Database} label="Base de datos" value={`${s.base?.datosMB ?? '—'} MB`} tone="slate" hint={`${s.base?.documentos?.toLocaleString('es-PE')} documentos · ${s.base?.colecciones} colecciones`} />
        <StatCard icon={Server} label="Mantenimientos abiertos" value={s.mantenimientos.abiertos} tone={s.mantenimientos.vencidos ? 'red' : 'blue'} hint={`${s.mantenimientos.vencidos} fuera de plazo`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Parámetros legales que usa el sistema hoy</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">RMV</p><p className="font-semibold text-slate-800">S/ {legal.rmv.valor.toLocaleString('es-PE')}</p><p className="text-[11px] text-slate-500">desde {legal.rmv.desde.split('-').reverse().join('/')} · {legal.rmv.norma}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">UIT {legal.uit.anio}</p><p className="font-semibold text-slate-800">S/ {legal.uit.valor.toLocaleString('es-PE')}</p><p className="text-[11px] text-slate-500">{legal.uit.norma}{legal.uit.registrada ? '' : ' · falta la del año'}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">Asignación familiar</p><p className="font-semibold text-slate-800">S/ {legal.asignacionFamiliar.toFixed(2)}</p><p className="text-[11px] text-slate-500">10 % de la RMV · Ley 25129</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
          <Activity size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Errores inesperados registrados</h3>
          <span className="text-xs text-slate-400 ml-auto">Se conservan 90 días</span>
        </div>
        {errores.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin errores registrados. Cada error 500 queda aquí con el código que vio el usuario.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {errores.map((e) => (
              <li key={e._id} className="px-5 py-3 flex items-start gap-3">
                <code className="text-xs font-semibold text-slate-600 w-20 shrink-0">{e.incidencia}</code>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate"><span className="font-mono text-xs text-slate-500">{e.metodo}</span> {e.ruta}</p>
                  <p className="text-xs text-slate-500 truncate">{e.mensaje}</p>
                  <p className="text-[11px] text-slate-400">{fechaHora(e.creadoEn)}{e.usuario ? ` · ${e.usuario.correo}` : ''}</p>
                </div>
                {e.mantenimiento ? (
                  <span className="text-[11px] text-emerald-700 shrink-0">{e.mantenimiento.codigo}</span>
                ) : puedeEscribir && (
                  <button onClick={() => registrar(e._id)} className="text-xs font-medium text-primary hover:underline cursor-pointer shrink-0">Registrar correctivo</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Plan({ refrescar }) {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/mantenimiento/salud').then((r) => setS(r.data)).catch(() => {}); }, [refrescar]);
  if (!s) return <p className="py-10 text-center text-sm text-slate-400">Cargando el plan…</p>;
  const cada = (d) => (d === 1 ? 'Diaria' : d === 7 ? 'Semanal' : d === 30 ? 'Mensual' : d === 90 ? 'Trimestral' : `Cada ${d} días`);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Revisiones programadas para evitar fallos futuros. <code className="text-xs bg-slate-100 px-1 rounded">npm run preventivo</code> ejecuta
        las marcadas como rutina y deja su resultado como un mantenimiento preventivo.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr><th className="text-left px-4 py-2.5 font-medium">Revisión</th><th className="text-left px-4 py-2.5 font-medium">Frecuencia</th>
              <th className="text-left px-4 py-2.5 font-medium">Comando</th><th className="text-left px-4 py-2.5 font-medium">Última vez</th>
              <th className="text-left px-4 py-2.5 font-medium">Próxima</th><th className="text-left px-4 py-2.5 font-medium">Estado</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {s.plan.map((t) => (
              <tr key={t.codigo}>
                <td className="px-4 py-2.5 text-slate-700">{t.etiqueta}{t.rutina && <span className="ml-1.5 text-[10px] text-slate-400">rutina</span>}
                  {t.ultima?.detalle && <p className="text-[11px] text-slate-400 truncate max-w-md">{t.ultima.detalle}</p>}</td>
                <td className="px-4 py-2.5 text-slate-500">{cada(t.cadaDias)}</td>
                <td className="px-4 py-2.5"><code className="text-xs text-slate-500">{t.comando}</code></td>
                <td className="px-4 py-2.5 text-slate-500">{t.ultima ? fechaHora(t.ultima.en) : 'Nunca'}</td>
                <td className="px-4 py-2.5 text-slate-500">{t.proxima ? fecha(t.proxima) : 'Hoy'}</td>
                <td className="px-4 py-2.5">
                  {t.vencida ? <span className="flex items-center gap-1 text-xs text-amber-700"><Clock size={13} /> Por hacer</span>
                    : t.ultima?.ok === false ? <span className="flex items-center gap-1 text-xs text-red-700"><AlertTriangle size={13} /> Con observaciones</span>
                      : <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={13} /> Al día</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Mantenimiento() {
  const { usuario } = useAuth();
  const puedeEscribir = can(usuario, 'mantenimiento', 'write');
  const [catalogo, setCatalogo] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [pestana, setPestana] = useState('solicitudes');
  const [abierto, setAbierto] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [refrescar, setRefrescar] = useState(0);

  const actualizar = useCallback(() => {
    api.get('/mantenimiento/resumen').then((r) => setResumen(r.data)).catch(() => {});
    setRefrescar((n) => n + 1);
  }, []);
  useEffect(() => {
    api.get('/mantenimiento/catalogo').then((r) => setCatalogo(r.data)).catch(() => toast.error('No se pudo cargar el módulo'));
    api.get('/mantenimiento/resumen').then((r) => setResumen(r.data)).catch(() => {});
  }, []);

  if (!catalogo) return <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mantenimiento del Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">
            Correctivo, adaptativo, perfectivo y preventivo: cada solicitud sigue el proceso de su tipo hasta quedar documentada · versión {catalogo.version}
          </p>
        </div>
        {puedeEscribir && (
          <button onClick={() => setNuevo(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark cursor-pointer">
            <Plus size={16} /> Nuevo mantenimiento
          </button>
        )}
      </div>

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(catalogo.tipos).map(([k, t]) => {
            const r = resumen.porTipo[k];
            const pendientes = r.ABIERTO + r.EN_CURSO;
            const medio = resumen.tiempoMedioDias[k];
            return (
              <StatCard key={k} icon={TONO_TIPO[k].icono} label={t.etiqueta} value={r.total} tone={TONO_TIPO[k].stat}
                hint={`${r.CERRADO} cerrados · ${pendientes} pendientes${medio !== undefined ? ` · ${medio} d de atención` : ''}`} />
            );
          })}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {[['solicitudes', 'Solicitudes'], ['monitoreo', 'Monitoreo'], ['plan', 'Plan preventivo']].map(([id, texto]) => (
          <button key={id} onClick={() => setPestana(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer ${pestana === id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'solicitudes' && <Solicitudes catalogo={catalogo} puedeEscribir={puedeEscribir} refrescar={refrescar} abrir={setAbierto} />}
      {pestana === 'monitoreo' && <Monitoreo puedeEscribir={puedeEscribir} refrescar={refrescar} onRegistrado={(id) => { actualizar(); setAbierto(id); }} />}
      {pestana === 'plan' && <Plan refrescar={refrescar} />}

      <Modal open={!!abierto} onClose={() => setAbierto(null)} title="Mantenimiento" wide>
        {abierto && <Detalle id={abierto} catalogo={catalogo} puedeEscribir={puedeEscribir} onClose={() => setAbierto(null)} onCambio={actualizar} />}
      </Modal>
      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo mantenimiento">
        {nuevo && <Nuevo catalogo={catalogo} onClose={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); actualizar(); setAbierto(id); }} />}
      </Modal>
    </div>
  );
}
