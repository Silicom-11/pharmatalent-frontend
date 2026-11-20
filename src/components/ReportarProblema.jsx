import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { LifeBuoy, Bug, Lightbulb, CheckCircle2, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import api from '../services/api';

/**
 * Reportar un problema o sugerir una mejora, desde cualquier pantalla.
 *
 * Es la primera etapa del mantenimiento (GP 08): «recepción del informe de
 * error» en el correctivo y «recolección de sugerencias» en el perfectivo. Lo
 * que la persona no sabe decir —en qué pantalla estaba, qué versión usa, qué
 * código mostró el error— se toma solo.
 */

// En qué parte del sistema está, según la ruta
const AREA_DE_RUTA = [
  [/^\/(mi-|mis-)/, 'autoservicio'], [/^\/employees/, 'employees'], [/^\/schedules/, 'schedules'],
  [/^\/attendance/, 'attendance'], [/^\/vacations/, 'vacations'], [/^\/(contracts|liquidaciones)/, 'contracts'],
  [/^\/evaluations/, 'evaluations'], [/^\/payroll/, 'payroll'], [/^\/training/, 'training'],
  [/^\/requisitions/, 'requisitions'], [/^\/recruitment/, 'recruitment'], [/^\/welfare/, 'welfare'],
  [/^\/audits/, 'audits'], [/^\/users/, 'users'], [/^\/$/, 'dashboard'],
];
const areaDe = (ruta) => AREA_DE_RUTA.find(([re]) => re.test(ruta))?.[1] || 'general';

const IMPACTOS = [
  { valor: 'CRITICA', texto: 'No puedo trabajar' },
  { valor: 'ALTA', texto: 'Un proceso importante falla' },
  { valor: 'MEDIA', texto: 'Puedo seguir con un rodeo' },
  { valor: 'BAJA', texto: 'Es una molestia menor' },
];

const VACIO = { tipo: 'CORRECTIVO', titulo: '', descripcion: '', area: 'general', prioridad: 'MEDIA', incidencia: '' };

function EstadoReporte({ r }) {
  if (r.estado === 'CERRADO') return <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={13} /> Resuelto</span>;
  if (r.estado === 'DESCARTADO') return <span className="flex items-center gap-1 text-xs text-slate-500"><XCircle size={13} /> No procede</span>;
  return <span className="flex items-center gap-1 text-xs text-amber-700"><Clock size={13} /> {r.etapaActual}</span>;
}

export default function ReportarProblema() {
  const ruta = useLocation().pathname;
  const [abierto, setAbierto] = useState(false);
  const [pestana, setPestana] = useState('nuevo');
  const [form, setForm] = useState(VACIO);
  const [areas, setAreas] = useState({});
  const [mios, setMios] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const abrir = useCallback((extra = {}) => {
    let incidencia = '';
    try { incidencia = sessionStorage.getItem('pharmatalent_ultima_incidencia') || ''; } catch { /* sin almacenamiento */ }
    setForm({ ...VACIO, area: areaDe(window.location.pathname), incidencia, ...extra });
    setPestana('nuevo');
    setAbierto(true);
  }, []);

  // La barrera de errores lo abre con el código del fallo de pantalla
  useEffect(() => {
    const alPedir = (e) => abrir(e.detail || {});
    window.addEventListener('pharmatalent:reportar', alPedir);
    return () => window.removeEventListener('pharmatalent:reportar', alPedir);
  }, [abrir]);

  useEffect(() => {
    if (!abierto) return;
    api.get('/mantenimiento/catalogo').then((r) => setAreas(r.data.areas || {})).catch(() => {});
    api.get('/mantenimiento/mis-reportes').then((r) => setMios(r.data || [])).catch(() => {});
  }, [abierto]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const { incidencia, ...resto } = form;
      const { data } = await api.post('/mantenimiento/reportes', {
        ...resto, pagina: ruta, ...(incidencia.trim() ? { incidencia: incidencia.trim() } : {}),
      });
      try { sessionStorage.removeItem('pharmatalent_ultima_incidencia'); } catch { /* sin almacenamiento */ }
      toast.success(`Reporte ${data.codigo} registrado. Le avisaremos cuando se resuelva.`);
      const r = await api.get('/mantenimiento/mis-reportes').catch(() => null);
      if (r) setMios(r.data || []);
      setForm(VACIO);
      setPestana('mios');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar el reporte');
    } finally { setEnviando(false); }
  };

  const esMejora = form.tipo === 'PERFECTIVO';

  return (
    <>
      <button
        onClick={() => abrir()}
        className="flex items-center gap-1.5 p-2 sm:px-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm"
        title="Reportar un problema o sugerir una mejora"
      >
        <LifeBuoy size={19} />
        <span className="hidden md:inline">Reportar</span>
      </button>

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Soporte del sistema">
        <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
          {[['nuevo', 'Nuevo reporte'], ['mios', `Mis reportes${mios.length ? ` (${mios.length})` : ''}`]].map(([id, texto]) => (
            <button key={id} onClick={() => setPestana(id)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium cursor-pointer ${pestana === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              {texto}
            </button>
          ))}
        </div>

        {pestana === 'nuevo' ? (
          <form onSubmit={enviar} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['CORRECTIVO', Bug, 'Algo no funciona', 'border-red-300 bg-red-50 text-red-700'],
                ['PERFECTIVO', Lightbulb, 'Sugerir una mejora', 'border-violet-300 bg-violet-50 text-violet-700'],
              ].map(([tipo, Icono, texto, activo]) => (
                <button type="button" key={tipo} onClick={() => setForm({ ...form, tipo, prioridad: tipo === 'PERFECTIVO' ? 'BAJA' : 'MEDIA' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium cursor-pointer ${form.tipo === tipo ? activo : 'border-slate-200 text-slate-500'}`}>
                  <Icono size={16} /> {texto}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">{esMejora ? '¿Qué mejora propone?' : '¿Qué problema encontró?'}</span>
              <input required minLength={5} maxLength={160} value={form.titulo} onChange={set('titulo')}
                placeholder={esMejora ? 'Ej.: Ver el saldo de vacaciones en el panel' : 'Ej.: No puedo enviar mi solicitud de vacaciones'}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">{esMejora ? '¿Para qué le serviría?' : '¿Qué estaba haciendo y qué pasó?'}</span>
              <textarea required minLength={10} maxLength={4000} rows={4} value={form.descripcion} onChange={set('descripcion')}
                placeholder={esMejora ? 'Cuéntenos qué le ahorraría o qué haría mejor.' : 'Los pasos que siguió, lo que esperaba que pasara y lo que pasó.'}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Parte del sistema</span>
                <select value={form.area} onChange={set('area')} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  {Object.entries(areas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  {!areas[form.area] && <option value={form.area}>{form.area}</option>}
                </select>
              </label>
              {!esMejora && (
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">¿Cuánto le afecta?</span>
                  <select value={form.prioridad} onChange={set('prioridad')} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    {IMPACTOS.map((i) => <option key={i.valor} value={i.valor}>{i.texto}</option>)}
                  </select>
                </label>
              )}
            </div>

            {!esMejora && (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Código de incidencia (si el sistema mostró uno)</span>
                <input maxLength={20} value={form.incidencia} onChange={set('incidencia')} placeholder="Ej.: 3FA9C21B"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase" />
              </label>
            )}

            <p className="text-[11px] text-slate-400">
              Se adjunta la pantalla en que está ({ruta}) y la versión del sistema (v{__VERSION__}).
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAbierto(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button disabled={enviando} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50 cursor-pointer">
                {enviando ? 'Enviando…' : esMejora ? 'Enviar sugerencia' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {mios.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aún no ha enviado reportes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mios.map((r) => (
                  <li key={r._id} className="py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-semibold text-slate-500">{r.codigo}</code>
                      <span className="text-sm text-slate-700 flex-1 truncate">{r.titulo}</span>
                      <EstadoReporte r={r} />
                    </div>
                    {['ABIERTO', 'EN_CURSO'].includes(r.estado) && (
                      <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(6, r.progreso)}%` }} />
                      </div>
                    )}
                    {r.solucion && <p className="text-xs text-slate-500 mt-1">Solución: {r.solucion}</p>}
                    {r.motivoDescarte && <p className="text-xs text-slate-500 mt-1">Motivo: {r.motivoDescarte}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
