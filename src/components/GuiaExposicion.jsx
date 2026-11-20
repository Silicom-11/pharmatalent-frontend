import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Presentation, ExternalLink, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PASOS } from '../config/exposicion';

const CLAVE_PASO = 'pharmatalent_exposicion_paso';
const CLAVE_ABIERTA = 'pharmatalent_exposicion_abierta';
// En el modo completo la guía aparece sólo si se empezó el recorrido
const CLAVE_ACTIVA = 'pharmatalent_exposicion_guia';

const leer = (clave, defecto) => {
  try { const v = localStorage.getItem(clave); return v === null ? defecto : JSON.parse(v); } catch { return defecto; }
};
const guardar = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ } };

/** Guarda el paso desde fuera (la pantalla de ingreso empieza el recorrido) */
export const reiniciarGuia = () => { guardar(CLAVE_PASO, 0); guardar(CLAVE_ABIERTA, true); guardar(CLAVE_ACTIVA, true); };

/**
 * La guía de la exposición: qué rol actúa en cada paso, qué hacer y adónde ir.
 * Pasar al siguiente cambia de rol y abre la pantalla, para que nadie tenga
 * que recordar credenciales ni rutas mientras expone.
 */
export default function GuiaExposicion() {
  const { usuario, exposicion, ingresarComo } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState(() => Math.min(leer(CLAVE_PASO, 0), PASOS.length - 1));
  const [abierta, setAbierta] = useState(() => leer(CLAVE_ABIERTA, true));
  const [cambiando, setCambiando] = useState(false);
  const [activa, setActiva] = useState(() => leer(CLAVE_ACTIVA, false));

  if (!exposicion?.activo) return null;
  if (exposicion.modo === 'completo' && !activa) return null;
  const cerrarGuia = () => { setActiva(false); guardar(CLAVE_ACTIVA, false); };
  const p = PASOS[paso];
  const quien = exposicion.cuentas.find((c) => c.cuenta === p.cuenta);
  const cuentaActual = usuario?.correo?.split('@')[0];
  const esSuTurno = !p.cuenta || p.cuenta === cuentaActual;

  const irA = async (n) => {
    const destino = PASOS[n];
    setPaso(n);
    guardar(CLAVE_PASO, n);
    if (!destino.cuenta) return;                         // el terminal se abre aparte
    try {
      if (destino.cuenta !== cuentaActual) {
        setCambiando(true);
        await ingresarComo(destino.cuenta);
      }
      navigate(destino.ruta);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar de rol');
    } finally {
      setCambiando(false);
    }
  };

  const alternar = () => { setAbierta(!abierta); guardar(CLAVE_ABIERTA, !abierta); };

  return (
    <div className="mb-5 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Presentation size={18} className="text-primary shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Exposición · Paso {paso + 1} de {PASOS.length}
        </p>
        <div className="hidden md:flex items-center gap-1 ml-2">
          {PASOS.map((_, i) => (
            <button key={i} onClick={() => irA(i)} title={`Paso ${i + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === paso ? 'w-6 bg-primary' : i < paso ? 'w-3 bg-primary/50' : 'w-3 bg-slate-300'}`} />
          ))}
        </div>
        <button onClick={alternar} className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
          {abierta ? <>Ocultar <ChevronUp size={14} /></> : <>Mostrar guía <ChevronDown size={14} /></>}
        </button>
        {exposicion.modo === 'completo' && (
          <button onClick={cerrarGuia} className="text-xs text-slate-400 hover:text-red-600 cursor-pointer" title="Terminar el recorrido guiado">
            Cerrar guía
          </button>
        )}
      </div>

      {abierta && (
        <div className="px-4 pb-4">
          <p className="text-xs text-slate-500">
            {p.cuenta ? <>Actúa: <strong className="text-slate-700">{quien?.papel}</strong> — {quien?.persona}</> : <>Actúa: <strong className="text-slate-700">el terminal del local</strong> (Inkafarma Huancayo Real)</>}
          </p>
          <h3 className="text-lg font-bold text-slate-800 mt-0.5">{p.titulo}</h3>
          <p className="text-sm text-slate-600 mt-1 max-w-4xl">{typeof p.texto === 'function' ? p.texto(exposicion.terminal) : p.texto}</p>
          {p.nota && <p className="text-xs text-slate-500 mt-1 italic">{p.nota}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button onClick={() => irA(Math.max(0, paso - 1))} disabled={paso === 0 || cambiando}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-white disabled:opacity-40 cursor-pointer">
              <ChevronLeft size={15} /> Anterior
            </button>
            {p.cuenta ? (
              !esSuTurno ? (
                <button onClick={() => irA(paso)} disabled={cambiando}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 cursor-pointer">
                  Entrar como {quien?.papel}
                </button>
              ) : (
                <button onClick={() => navigate(p.ruta)}
                  className="px-3 py-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 cursor-pointer">
                  Ir a la pantalla
                </button>
              )
            ) : (
              <a href="/terminal" target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 no-underline">
                Abrir el terminal <ExternalLink size={14} />
              </a>
            )}
            <button onClick={() => irA(Math.min(PASOS.length - 1, paso + 1))} disabled={paso === PASOS.length - 1 || cambiando}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-40 cursor-pointer">
              {cambiando ? 'Cambiando de rol…' : <>Siguiente <ChevronRight size={15} /></>}
            </button>
            {paso > 0 && (
              <button onClick={() => irA(0)} disabled={cambiando} title="Volver al primer paso"
                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 cursor-pointer">
                <RotateCcw size={13} /> Empezar de nuevo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
