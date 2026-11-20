import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { can, roleLabel, brandOf, ORG_LEVELS, orgLevelOf, isPersonalScope } from '../config/roles';
import NotificationPanel from './NotificationPanel';
import CambioObligatorio from './CambioObligatorio';
import BarreraDeErrores from './BarreraDeErrores';
import GuiaExposicion from './GuiaExposicion';
import ReportarProblema from './ReportarProblema';
import { rutaVisible, VE_TODO } from '../config/exposicion';
import api from '../services/api';
import {
  LayoutDashboard, Users, Briefcase, MapPin, Map, CalendarClock,
  ClipboardCheck, Palmtree, FileText, BarChart3, LogOut, Menu, X,
  Bell, UserCircle, Clock, GraduationCap, DollarSign, Network,
  ClipboardList, UserPlus, HeartPulse, ShieldCheck, Receipt, UserCog, ScrollText, UserMinus, Wrench,
} from 'lucide-react';

/**
 * Navegación declarativa: cada entrada indica el módulo que requiere.
 * La visibilidad se resuelve contra la matriz de permisos del rol,
 * no contra listas de roles codificadas a mano.
 */
const SECTIONS = [
  {
    id: 'personal',
    etiqueta: 'Mi Espacio',
    items: [
      { to: '/mi-perfil', icon: UserCircle, etiqueta: 'Mi Perfil' },
      // Sólo quien trabaja por turnos: en la sede y en la supervisión zonal no
      // hay cronograma, y la pantalla salía siempre «sin turnos asignados»
      { to: '/mi-horario', icon: Clock, etiqueta: 'Mi Horario', soloTurnos: true },
      { to: '/mi-asistencia', icon: ClipboardCheck, etiqueta: 'Mi Asistencia' },
      // El autoservicio no depende del módulo de gestión: pedir las propias
      // vacaciones no es gestionarlas
      { to: '/mis-vacaciones', icon: Palmtree, etiqueta: 'Mis Vacaciones' },
      // Sin módulo, como el resto del autoservicio: es la evaluación de uno
      // mismo. Estaba condicionada a `dashboard`, que es un módulo de gestión
      // y no tiene nada que ver; funcionaba sólo porque los 22 roles lo tienen.
      { to: '/mis-evaluaciones', icon: BarChart3, etiqueta: 'Mis Evaluaciones' },
      { to: '/mi-contrato', icon: FileText, etiqueta: 'Mi Contrato' },
      { to: '/mis-boletas', icon: Receipt, etiqueta: 'Mis Boletas' },
    ],
  },
  {
    id: 'gestion',
    etiqueta: 'Gestión de Personal',
    items: [
      { to: '/employees', icon: Users, etiqueta: 'Empleados', module: 'employees' },
      { to: '/org', icon: Network, etiqueta: 'Organigrama', module: 'org' },
      { to: '/positions', icon: Briefcase, etiqueta: 'Puestos', module: 'positions', action: 'write' },
      { to: '/locations', icon: MapPin, etiqueta: 'Centros de Trabajo', module: 'locations' },
      { to: '/zones', icon: Map, etiqueta: 'Zonas', module: 'zones' },
    ],
  },
  {
    id: 'operaciones',
    etiqueta: 'Operaciones',
    items: [
      { to: '/schedules', icon: CalendarClock, etiqueta: 'Turnos', module: 'schedules', action: 'write' },
      { to: '/attendance', icon: ClipboardCheck, etiqueta: 'Asistencia', module: 'attendance', action: 'write' },
      { to: '/vacations', icon: Palmtree, etiqueta: 'Solicitudes de Descanso', module: 'vacations', action: 'write' },
      { to: '/contracts', icon: FileText, etiqueta: 'Contratos', module: 'contracts' },
      { to: '/liquidaciones', icon: UserMinus, etiqueta: 'Ceses y Liquidaciones', module: 'contracts' },
    ],
  },
  {
    id: 'talento',
    etiqueta: 'Talento',
    items: [
      { to: '/requisitions', icon: ClipboardList, etiqueta: 'Requerimientos', module: 'requisitions' },
      { to: '/recruitment', icon: UserPlus, etiqueta: 'Reclutamiento', module: 'recruitment' },
      { to: '/evaluations', icon: BarChart3, etiqueta: 'Evaluaciones', module: 'evaluations' },
      { to: '/training', icon: GraduationCap, etiqueta: 'Capacitaciones', module: 'training' },
    ],
  },
  {
    id: 'cumplimiento',
    etiqueta: 'Cumplimiento y Bienestar',
    items: [
      { to: '/audits', icon: ShieldCheck, etiqueta: 'Auditoría DIGEMID', module: 'audits' },
      { to: '/welfare', icon: HeartPulse, etiqueta: 'Bienestar Social', module: 'welfare' },
      { to: '/payroll', icon: DollarSign, etiqueta: 'Nómina', module: 'payroll' },
    ],
  },
  {
    id: 'administracion',
    etiqueta: 'Administración',
    items: [
      { to: '/users', icon: UserCog, etiqueta: 'Cuentas de Acceso', module: 'users' },
      { to: '/bitacora', icon: ScrollText, etiqueta: 'Bitácora', module: 'bitacora' },
      { to: '/mantenimiento', icon: Wrench, etiqueta: 'Mantenimiento', module: 'mantenimiento' },
    ],
  },
];

// La prop se llama `etiqueta` y no `label` porque los ítems del menú llegan
// con `{...item}` y ese es el nombre que traen. Con `label` el título salía
// vacío en todas las entradas de sección y el menú se veía como una columna
// de iconos sueltos.
function SidebarLink({ to, icon: Icon, etiqueta, active, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg mx-2 text-sm font-medium transition-colors ${
        active ? 'bg-sidebar-active text-white' : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
      }`}
    >
      <Icon size={18} />
      <span className="truncate">{etiqueta}</span>
    </Link>
  );
}

export default function Layout() {
  const { usuario, logout, exposicion, ingresarComo } = useAuth();
  const local = useLocation();
  const navigate = useNavigate();
  const enExposicion = !!exposicion?.activo;
  // En la exposición se limita el menú de los cuatro roles del recorrido, no el del administrador
  const limitar = enExposicion && exposicion.modo === 'junin' && !VE_TODO(usuario);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = () =>
    api.get('/notifications/count').then((r) => setUnreadCount(r.data.unread ?? 0)).catch(() => {});

  useEffect(() => { refreshCount(); }, [local.pathname]);

  if (!usuario) return <Navigate to="/login" replace />;
  // Con la contraseña temporal viva no se entra a ninguna pantalla
  if (usuario.debeCambiarContrasena) return <CambioObligatorio />;
  // En la exposición, lo que no se muestra no se abre ni escribiendo la ruta
  if (limitar && !rutaVisible(local.pathname)) return <Navigate to="/" replace />;

  const cuentaActual = usuario.correo?.split('@')[0];
  const cambiarRol = async (cuenta) => {
    try {
      await ingresarComo(cuenta);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar de rol');
    }
  };

  const emp = usuario.empleado || {};
  const brandCode = emp.locationBrand || emp.localActual?.marca;
  const marca = brandOf(brandCode);
  const displayName = emp.nombres ? `${emp.nombres} ${emp.apellidos || ''}`.trim() : usuario.correo;
  const locationName = emp.localActual?.nombre || emp.locationName;
  const zoneName = emp.zoneName;
  const nivel = ORG_LEVELS[orgLevelOf(usuario.rol)];
  const initials = emp.nombres
    ? `${emp.nombres[0]}${(emp.apellidos || '')[0] || ''}`.toUpperCase()
    : (usuario.correo?.[0] || 'U').toUpperCase();

  const dashboardLabel = isPersonalScope(usuario) ? 'Mi Panel' : 'Panel de Control';

  const sections = SECTIONS
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => (!i.module || can(usuario, i.module, i.action || 'read'))
        && (!i.soloTurnos || ['BOTICA', 'CEDI'].includes(orgLevelOf(usuario.rol)))
        && (!limitar || rutaVisible(i.to))),
    }))
    .filter((s) => s.items.length > 0);

  const isActive = (to) => (to === '/' ? local.pathname === '/' : local.pathname.startsWith(to));
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={closeSidebar} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold text-lg no-underline">
            <span className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center text-white font-bold text-sm">PT</span>
            <span>PharmaTalent</span>
          </Link>
          <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Contexto: cadena, centro de trabajo y nivel organizacional */}
        <div className="mx-4 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${marca?.dot || 'bg-slate-500'}`} />
            <span className={`text-xs font-semibold ${marca?.text || 'text-slate-300'}`}>
              {marca?.nombre || 'InRetail Pharma'}
            </span>
            <span className="text-[10px] text-slate-500 ml-auto uppercase tracking-wide">{nivel?.short}</span>
          </div>
          {(locationName || zoneName) && (
            <p className="text-[11px] text-slate-400 mt-1 truncate">{locationName || `Zona ${zoneName}`}</p>
          )}
        </div>

        <nav className="flex-1 py-3 overflow-y-auto space-y-4">
          <div className="space-y-0.5">
            <SidebarLink to="/" icon={LayoutDashboard} etiqueta={dashboardLabel} active={isActive('/')} onNavigate={closeSidebar} />
          </div>
          {sections.map((section) => (
            <div key={section.id}>
              <p className="px-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{section.etiqueta}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} {...item} active={isActive(item.to)} onNavigate={closeSidebar} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate" title={roleLabel(usuario.rol)}>{roleLabel(usuario.rol)}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-sidebar-hover hover:text-white transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-2">PharmaTalent v{__VERSION__}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 hover:text-slate-900">
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          {enExposicion && (
            <label className="flex items-center gap-2 mr-3 text-xs text-slate-500">
              <span className="hidden md:inline font-medium uppercase tracking-wide">Ver como</span>
              <select value={cuentaActual} onChange={(e) => cambiarRol(e.target.value)}
                className="max-w-[12rem] sm:max-w-xs px-2.5 py-1.5 border-2 border-primary/40 rounded-lg text-sm font-medium text-slate-700 bg-white cursor-pointer">
                {!exposicion.cuentas.some((c) => c.cuenta === cuentaActual) && <option value={cuentaActual}>{usuario.correo}</option>}
                {[...new Set(exposicion.cuentas.map((c) => c.nivel || ''))].map((nivel) => {
                  const opciones = exposicion.cuentas.filter((c) => (c.nivel || '') === nivel).map((c) => (
                    <option key={c.cuenta} value={c.cuenta}>{c.papel} — {c.persona}</option>
                  ));
                  return nivel ? <optgroup key={nivel} label={nivel}>{opciones}</optgroup> : opciones;
                })}
              </select>
            </label>
          )}
          <div className="flex items-center gap-3">
            {/* Cualquier rol reporta un error o sugiere una mejora (fase de mantenimiento) */}
            <ReportarProblema />
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Notificaciones"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} onRead={refreshCount} />}
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              {marca && <div className={`w-2 h-2 rounded-full ${marca.dot}`} />}
              <span className="text-xs text-slate-400">
                {marca && brandCode !== 'CORPORATIVO' ? `${marca.nombre} — InRetail Pharma` : 'InRetail Pharma S.A.'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-surface">
          {/* La clave es la ruta: al navegar, la barrera se reinicia sola */}
          <GuiaExposicion />
          <BarreraDeErrores key={local.pathname}>
            <Outlet />
          </BarreraDeErrores>
        </main>
      </div>
    </div>
  );
}
