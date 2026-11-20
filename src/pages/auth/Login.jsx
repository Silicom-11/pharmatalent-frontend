import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Presentation, ArrowRight } from 'lucide-react';
import { PASOS } from '../../config/exposicion';
import { reiniciarGuia } from '../../components/GuiaExposicion';

export default function Login() {
  const { usuario, login, exposicion, ingresarComo } = useAuth();
  // Dentro del APK (Capacitor añade esta marca al agente de usuario)
  const enApp = /PharmaTalentApp/.test(navigator.userAgent);
  // Por internet (túnel) el acceso por rol pide el PIN de la exposición
  const [pin, setPin] = useState(() => { try { return sessionStorage.getItem('pharmatalent_exposicion_pin') || ''; } catch { return ''; } });
  const cambiarPin = (v) => { setPin(v); try { sessionStorage.setItem('pharmatalent_exposicion_pin', v); } catch { /* sin almacenamiento */ } };
  const navigate = useNavigate();
  const [correo, setEmail] = useState('');
  const [contrasena, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const entrarComo = async (cuenta, ruta = '/', comenzar = false) => {
    setLoading(true);
    try {
      if (comenzar) reiniciarGuia();
      await ingresarComo(cuenta);
      navigate(ruta);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo ingresar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(correo, contrasena);
      toast.success('Bienvenido a PharmaTalent');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary p-4">
      <div className={`w-full ${exposicion?.activo ? (exposicion.modo === 'completo' ? 'max-w-6xl' : 'max-w-4xl') : 'max-w-md'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-white">PT</span>
          </div>
          <h1 className="text-3xl font-bold text-white">PharmaTalent</h1>
          <p className="text-white/70 mt-1">Sistema de Gestión de RRHH</p>
          <p className="text-white/50 text-sm">InRetail Pharma S.A.</p>
        </div>

        {enApp && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <a href="/terminal" className="text-center py-3 rounded-xl bg-slate-900 text-white font-semibold no-underline">Terminal de marcación</a>
            <button type="button" onClick={() => { window.location.href = 'https://localhost/'; }}
              className="py-3 rounded-xl bg-white/15 text-white font-semibold border border-white/30 cursor-pointer">Cambiar servidor</button>
          </div>
        )}

        {exposicion?.activo && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-5">
            <div className="flex items-center gap-2 text-primary">
              <Presentation size={20} />
              <h2 className="text-lg font-bold">
                {exposicion.modo === 'completo' ? 'Demostración · entre con cualquier rol' : `Exposición · Inkafarma Huancayo Real (${exposicion.region})`}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {exposicion.modo === 'completo'
                ? 'Una cuenta real de cada uno de los 21 roles, con lo que hace. Elija una para entrar; dentro, «Ver como» cambia de rol.'
                : 'Un colaborador marca, pide vacaciones y cobra; cada rol hace sólo su parte. Elija un rol para entrar, o empiece el recorrido guiado.'}
            </p>
            {exposicion.requierePin && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <label className="block text-sm font-semibold text-amber-900 mb-1">PIN de la exposición</label>
                <input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => cambiarPin(e.target.value)}
                  placeholder="••••••" className="w-full sm:w-48 px-3 py-2 border border-amber-300 rounded-lg text-sm" />
                <p className="text-xs text-amber-800 mt-1">Entró por internet: el acceso por rol sin contraseña pide el PIN.</p>
              </div>
            )}
            {[...new Set(exposicion.cuentas.map((c) => c.nivel || ''))].map((nivel) => (
              <div key={nivel} className="mt-4">
                {nivel && <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{nivel}</p>}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${nivel ? 'lg:grid-cols-3' : ''} gap-2.5`}>
                  {exposicion.cuentas.filter((c) => (c.nivel || '') === nivel).map((c) => (
                    <button key={c.cuenta} type="button" disabled={loading} onClick={() => entrarComo(c.cuenta)}
                      className="text-left p-3 rounded-xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50">
                      <p className="font-semibold text-slate-800 text-sm">{c.papel}</p>
                      <p className="text-[11px] text-slate-500">{c.persona}{c.centro ? ` · ${c.centro}` : ''}</p>
                      <p className="text-xs text-slate-600 mt-1.5 leading-snug">{c.hace}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" disabled={loading} onClick={() => entrarComo(PASOS[0].cuenta, PASOS[0].ruta, true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50">
              Empezar el recorrido guiado ({PASOS.length} pasos) <ArrowRight size={18} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`bg-white rounded-2xl shadow-xl p-8 ${exposicion?.activo ? 'max-w-md mx-auto' : ''}`}>
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Iniciar Sesión</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@inretail.com.pe"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <Link
            to="/recuperar"
            className="block mt-3 text-center text-xs text-white/60 hover:text-white/90 no-underline"
          >
            Olvidé mi contraseña
          </Link>

          {import.meta.env.DEV && !exposicion?.activo && (
            <div className="mt-6 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 font-medium mb-1">Cuenta de prueba (solo en desarrollo):</p>
              <p className="text-xs text-slate-400">admin@pharmatalent.pe · contraseña: CLAVE_DEMO del .env del backend</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
