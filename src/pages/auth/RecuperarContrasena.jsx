import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, Check, X, Phone } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Recuperación de contraseña.
 *
 * Dos pasos en una sola pantalla: se pide el código y se canjea. No se dice si
 * el correo existe —eso convertiría esta pantalla en una forma cómoda de
 * averiguar qué cuentas hay en la empresa— y el código llega por el canal que
 * Recursos Humanos tenga configurado.
 */
export default function RecuperarContrasena() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState('solicitar');   // 'solicitar' | 'canjear'
  const [correo, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cuenta = correo.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const simple = nueva.toLowerCase().replace(/[^a-z0-9]/g, '');

  const checks = [
    { ok: nueva.length >= 10, texto: 'Al menos 10 caracteres' },
    { ok: /[a-z]/.test(nueva) && /[A-Z]/.test(nueva), texto: 'Mayúsculas y minúsculas' },
    { ok: /\d/.test(nueva), texto: 'Al menos un número' },
    { ok: nueva.length > 0 && !(cuenta.length >= 4 && simple.includes(cuenta)), texto: 'No contiene el nombre de la cuenta' },
  ];
  const listo = checks.every((c) => c.ok) && nueva === repetida && codigo.length === 6;

  const solicitar = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/auth/recuperar', { correo });
      setAviso(r.data.mensaje);
      setPaso('canjear');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo procesar la solicitud');
    } finally { setBusy(false); }
  };

  const canjear = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/auth/recuperar/canjear', {
        correo, codigo, nuevaContrasena: nueva,
      });
      // El token nuevo llega listo, pero se le pide entrar para que la sesión
      // se construya como cualquier otra
      toast.success(r.data.mensaje);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="text-white/70 mt-1 text-sm">PharmaTalent · InRetail Pharma</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg px-7 py-6">
          {paso === 'solicitar' ? (
            <form onSubmit={solicitar} className="space-y-4">
              <p className="text-sm text-slate-600">
                Indique el correo de su cuenta. Recursos Humanos recibirá su solicitud y le
                entregará un código de seis dígitos.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Correo electrónico</label>
                <input
                  type="email" value={correo} required autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre.apellido@pharmatalent.pe"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit" disabled={busy || !correo}
                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40 cursor-pointer"
              >
                {busy ? 'Enviando...' : 'Solicitar código'}
              </button>
            </form>
          ) : (
            <form onSubmit={canjear} className="space-y-4">
              {aviso && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Phone size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">{aviso}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Código de seis dígitos</label>
                <input
                  type="text" inputMode="numeric" maxLength={6} required autoFocus
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center text-2xl font-mono tracking-[0.4em]"
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
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Repita la contraseña</label>
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
                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40 cursor-pointer"
              >
                {busy ? 'Restableciendo...' : 'Restablecer contraseña'}
              </button>

              <button
                type="button" onClick={() => { setPaso('solicitar'); setError(''); setCodigo(''); }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Pedir un código nuevo
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 hover:text-slate-600 no-underline"
          >
            <ArrowLeft size={13} /> Volver al acceso
          </Link>
        </div>
      </div>
    </div>
  );
}
