import { useState, useEffect } from 'react';
import { KeyRound, Check, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Pantalla de paso obligado.
 *
 * Quien entra con la contraseña temporal que le entregó Recursos Humanos no
 * puede usar el sistema hasta definir una propia: mientras la temporal siga
 * viva, esa credencial la conoce también quien se la dio.
 */
export default function CambioObligatorio() {
  const { usuario, logout, marcarContrasenaCambiada } = useAuth();
  const [politica, setPolitica] = useState(null);
  const [real, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/password-policy').then((r) => setPolitica(r.data)).catch(() => {});
  }, []);

  const minimo = politica?.longitudMinima || 10;
  const cuenta = (usuario?.correo || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const simple = nueva.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Se evalúa en vivo para que nadie descubra los requisitos a fuerza de rechazos
  const checks = [
    { ok: nueva.length >= minimo, texto: `Al menos ${minimo} caracteres` },
    { ok: /[a-z]/.test(nueva) && /[A-Z]/.test(nueva), texto: 'Mayúsculas y minúsculas' },
    { ok: /\d/.test(nueva), texto: 'Al menos un número' },
    { ok: nueva.length > 0 && !(cuenta.length >= 4 && simple.includes(cuenta)), texto: 'No contiene el nombre de la cuenta' },
    { ok: nueva.length > 0 && nueva !== real, texto: 'Distinta de la temporal' },
  ];
  const listo = checks.every((c) => c.ok) && nueva === repetida;

  const enviar = async (ev) => {
    ev.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.put('/auth/change-password', { currentPassword: real, newPassword: nueva });
      marcarContrasenaCambiada();
      toast.success('Contraseña actualizada. Bienvenido a PharmaTalent.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la contraseña');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-7 py-6 bg-primary text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <KeyRound size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Defina su contraseña</h1>
              <p className="text-sm text-white/70">{usuario?.correo}</p>
            </div>
          </div>
        </div>

        <form onSubmit={enviar} className="px-7 py-6 space-y-4">
          <p className="text-sm text-slate-500">
            Está usando la contraseña temporal que le entregó Recursos Humanos. Antes de continuar
            debe definir una que sólo usted conozca.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Contraseña temporal</label>
            <input
              type="password" value={real} required autoFocus
              onChange={(e) => setActual(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Nueva contraseña</label>
            <input
              type="password" value={nueva} required
              onChange={(e) => setNueva(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <ul className="space-y-1">
            {checks.map((c) => (
              <li key={c.texto} className={`flex items-center gap-2 text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                {c.ok ? <Check size={13} /> : <X size={13} />} {c.texto}
              </li>
            ))}
          </ul>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Repita la nueva contraseña</label>
            <input
              type="password" value={repetida} required
              onChange={(e) => setRepetida(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm ${
                repetida && nueva !== repetida ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
            {repetida && nueva !== repetida && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={!listo || busy}
            className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? 'Guardando...' : 'Guardar y entrar'}
          </button>

          <button
            type="button" onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <LogOut size={13} /> Salir sin cambiarla
          </button>
        </form>
      </div>
    </div>
  );
}
