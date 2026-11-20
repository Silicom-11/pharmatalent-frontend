import { useState, useEffect, useCallback, useRef } from 'react';
import { Fingerprint, Delete, LogIn, LogOut, RotateCcw, AlertTriangle, Settings, CheckCircle2 } from 'lucide-react';

// El turno con su nombre: «MANANA» es una clave, no una palabra
const NOMBRE_TURNO = { MANANA: 'Turno mañana', TARDE: 'Turno tarde', NOCHE: 'Turno noche', JORNADA: 'Jornada' };

/**
 * Terminal de marcación en modo quiosco.
 *
 * Corre en la computadora de la botica —o en una tablet fija junto a la
 * puerta— y es el único lugar desde donde entra la asistencia. El equipo se
 * registra una vez con el código del local y la clave que entrega el
 * administrador; esa clave queda en este navegador y no en la cuenta de nadie.
 *
 * Un reloj biométrico llama a la misma API (POST /api/terminal/marcar) con
 * `metodo: 'ROSTRO'` o `'HUELLA'` después de reconocer a la persona. Aquí, sin
 * lector, la identificación es por DNI y la marca queda registrada así, para
 * que la jefatura sepa cuáles no pasaron por un control biométrico.
 *
 * No usa el cliente de la API del resto de la aplicación a propósito: aquel
 * adjunta la sesión del usuario y, ante un 401, manda al inicio de sesión. El
 * terminal no tiene usuario.
 */

const CLAVE_ALMACEN = 'pharmatalent_terminal';
const SEGUNDOS_RESULTADO = 6;

const leerCredencial = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE_ALMACEN) || 'null'); } catch { return null; }
};

async function llamar(cred, metodo, ruta, cuerpo) {
  const r = await fetch(`/api/terminal${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'X-Terminal-Local': cred.codigo,
      'X-Terminal-Clave': cred.clave,
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = {};
  try { datos = await r.json(); } catch { /* respuesta vacía */ }
  return { status: r.status, datos };
}

const hora = (d) => new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

export default function Terminal() {
  const [cred, setCred] = useState(leerCredencial);
  const [local, setLocal] = useState(null);
  const [errorConfig, setErrorConfig] = useState('');
  const [ahora, setAhora] = useState(new Date());
  const [dni, setDni] = useState('');
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Comprueba la credencial guardada al abrir
  useEffect(() => {
    if (!cred) return;
    llamar(cred, 'GET', '/estado').then(({ status, datos }) => {
      if (status === 200) { setLocal(datos.local); setErrorConfig(''); }
      else { setLocal(null); setErrorConfig(datos.error || 'No se pudo verificar el terminal'); }
    }).catch(() => setErrorConfig('Sin conexión con el servidor'));
  }, [cred]);

  const limpiar = useCallback(() => {
    clearTimeout(temporizador.current);
    setResultado(null);
    setDni('');
  }, []);

  const marcar = useCallback(async () => {
    if (dni.length !== 8 || enviando) return;
    setEnviando(true);
    try {
      const { status, datos } = await llamar(cred, 'POST', '/marcar', { dni, metodo: 'DNI' });
      setResultado(status < 300 ? { ok: true, ...datos } : { ok: false, error: datos.error || 'No se pudo registrar la marca' });
    } catch {
      setResultado({ ok: false, error: 'Sin conexión con el servidor. Intente de nuevo.' });
    } finally {
      setEnviando(false);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(limpiar, SEGUNDOS_RESULTADO * 1000);
    }
  }, [dni, enviando, cred, limpiar]);

  // Teclado físico además del de pantalla
  useEffect(() => {
    if (!local) return undefined;
    const tecla = (e) => {
      if (resultado) { limpiar(); return; }
      if (/^\d$/.test(e.key)) setDni((d) => (d.length < 8 ? d + e.key : d));
      else if (e.key === 'Backspace') setDni((d) => d.slice(0, -1));
      else if (e.key === 'Enter') marcar();
      else if (e.key === 'Escape') setDni('');
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [local, resultado, marcar, limpiar]);

  // ── Registro del equipo ─────────────────────────────────────────────────────
  if (!cred || !local) {
    return (
      <ConfigurarTerminal
        error={errorConfig}
        inicial={cred}
        onGuardar={(c) => {
          localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(c));
          setErrorConfig('');
          setCred(c);
        }}
      />
    );
  }

  const fecha = ahora.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-[#0f2a44] text-white flex flex-col select-none">
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div>
          <p className="text-xs uppercase tracking-widest text-sky-300">{local.marca}</p>
          <p className="text-xl font-semibold">{local.nombre}</p>
          <p className="text-xs text-slate-400">{[local.distrito, local.ciudad].filter(Boolean).join(', ')}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums">{ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          <p className="text-sm text-slate-300 capitalize">{fecha}</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {resultado ? (
          <Resultado r={resultado} onCerrar={limpiar} />
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Fingerprint size={28} className="text-sky-300" />
              <p className="text-lg text-slate-200">Ingrese su DNI para marcar</p>
            </div>

            <div className="flex justify-center gap-2 mb-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`w-9 h-12 rounded-lg flex items-center justify-center text-2xl font-bold tabular-nums
                  ${i < dni.length ? 'bg-white text-[#0f2a44]' : 'bg-white/10'}`}>
                  {dni[i] || ''}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <Tecla key={n} onClick={() => setDni((d) => (d.length < 8 ? d + n : d))}>{n}</Tecla>
              ))}
              <Tecla onClick={() => setDni('')} tenue><RotateCcw size={22} /></Tecla>
              <Tecla onClick={() => setDni((d) => (d.length < 8 ? `${d}0` : d))}>0</Tecla>
              <Tecla onClick={() => setDni((d) => d.slice(0, -1))} tenue><Delete size={22} /></Tecla>
            </div>

            <button
              onClick={marcar}
              disabled={dni.length !== 8 || enviando}
              className="w-full mt-5 py-4 rounded-xl bg-emerald-500 text-white text-lg font-semibold disabled:opacity-30 cursor-pointer active:scale-[0.99]"
            >
              {enviando ? 'Registrando…' : 'Marcar'}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              El sistema decide si es entrada o salida según su turno.
            </p>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between px-8 py-3 border-t border-white/10 text-xs text-slate-400">
        <span>PharmaTalent · Terminal de marcación · Registro de control de asistencia (D.S. 004-2006-TR)</span>
        <button
          onClick={() => { if (window.confirm('¿Quitar el registro de este equipo como terminal?')) { localStorage.removeItem(CLAVE_ALMACEN); setCred(null); setLocal(null); } }}
          className="flex items-center gap-1 hover:text-white cursor-pointer"
        >
          <Settings size={13} /> Equipo
        </button>
      </footer>
    </div>
  );
}

function Tecla({ children, onClick, tenue }) {
  return (
    <button
      onClick={onClick}
      className={`h-16 rounded-xl text-2xl font-semibold flex items-center justify-center cursor-pointer active:scale-95 transition
        ${tenue ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white/10 hover:bg-white/20'}`}
    >
      {children}
    </button>
  );
}

function Resultado({ r, onCerrar }) {
  if (!r.ok) {
    return (
      <button onClick={onCerrar} className="w-full max-w-lg rounded-2xl bg-red-600/90 p-10 text-center cursor-pointer">
        <AlertTriangle size={56} className="mx-auto mb-4" />
        <p className="text-2xl font-semibold leading-snug">{r.error}</p>
        <p className="text-sm text-red-100 mt-6">Toque para volver</p>
      </button>
    );
  }
  const entrada = r.accion === 'ENTRADA';
  const repetida = r.accion === 'REPETIDA';
  const fondo = repetida ? 'bg-slate-600' : entrada ? 'bg-emerald-600' : 'bg-sky-700';
  const Icono = repetida ? CheckCircle2 : entrada ? LogIn : LogOut;
  const titulo = repetida ? 'Marca ya registrada' : entrada ? 'Entrada registrada' : 'Salida registrada';
  const iniciales = `${r.persona?.nombres?.[0] || ''}${r.persona?.apellidos?.[0] || ''}`;

  return (
    <button onClick={onCerrar} className={`w-full max-w-lg rounded-2xl ${fondo} p-10 text-center cursor-pointer`}>
      <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center text-3xl font-bold mb-4">
        {iniciales}
      </div>
      <p className="text-2xl font-semibold">{r.persona?.nombres} {r.persona?.apellidos}</p>
      <p className="text-sm text-white/80">{r.persona?.cargo}</p>

      <div className="flex items-center justify-center gap-3 mt-6">
        <Icono size={30} />
        <p className="text-3xl font-bold">{titulo}</p>
      </div>
      <p className="text-5xl font-bold tabular-nums mt-2">{hora(r.hora)}</p>

      {r.turno && (
        <p className="text-sm text-white/80 mt-4">
          {NOMBRE_TURNO[r.turno.tipo] || 'Turno'} · {r.turno.horaInicio}–{r.turno.horaFin}{r.turno.puesto ? ` · ${r.turno.puesto}` : ''}
        </p>
      )}
      {entrada && r.minutosTardanza > 0 && (
        <p className="mt-3 inline-block px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-sm font-semibold">
          {r.minutosTardanza} minutos de tardanza
        </p>
      )}
      {r.accion === 'SALIDA' && (
        <p className="text-sm text-white/90 mt-3">
          {r.horasTrabajadas} horas trabajadas{r.horasExtra > 0 ? ` · ${r.horasExtra} de sobretiempo` : ''}
        </p>
      )}
    </button>
  );
}

function ConfigurarTerminal({ error, inicial, onGuardar }) {
  const [codigo, setCodigo] = useState(inicial?.codigo || '');
  const [clave, setClave] = useState('');
  return (
    <div className="min-h-screen bg-[#0f2a44] flex items-center justify-center p-6">
      <form
        onSubmit={(e) => { e.preventDefault(); onGuardar({ codigo: codigo.trim().toUpperCase(), clave: clave.trim() }); }}
        className="w-full max-w-sm bg-white rounded-2xl p-7 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
            <Fingerprint size={22} className="text-sky-700" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Registrar terminal de marcación</p>
            <p className="text-xs text-slate-500">Se hace una sola vez en este equipo</p>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Código del local</span>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="IKF-736"
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase" required />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Clave del terminal</span>
          <input value={clave} onChange={(e) => setClave(e.target.value)} type="password" autoComplete="off"
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" required />
        </label>
        <p className="text-xs text-slate-500">
          La entrega el administrador del sistema desde <span className="font-medium">Centros de Trabajo</span>.
          Queda guardada en este equipo, no en la cuenta de nadie.
        </p>
        <button className="w-full py-2.5 rounded-lg bg-[#0f2a44] text-white font-medium cursor-pointer">Registrar</button>
      </form>
    </div>
  );
}
