import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCog, UserPlus, KeyRound, Lock, Unlock, ShieldCheck, ShieldOff,
  Copy, Check, AlertTriangle, UserX, Users, UsersRound, Download, Phone, LogOut,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import api from '../../services/api';
import usePaginado from '../../hooks/usePaginado';
import toast from 'react-hot-toast';

const fecha = (v) => (v ? String(v).slice(0, 10) : '—');

/** Muestra una credencial temporal una sola vez, con copia al portapapeles */
function CredencialTemporal({ valor, onCerrar }) {
  const [copiada, setCopiada] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Anótela manualmente.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Esta contraseña <strong>no volverá a mostrarse</strong>. Entréguela al empleado por un
          medio seguro; deberá cambiarla en su primer ingreso.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 px-4 py-3 bg-slate-900 text-emerald-300 rounded-lg font-mono text-lg tracking-wider text-center select-all">
          {valor}
        </code>
        <button
          onClick={copiar}
          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          title="Copiar"
        >
          {copiada ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} className="text-slate-500" />}
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={onCerrar} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium cursor-pointer">
          Ya la entregué
        </button>
      </div>
    </div>
  );
}

export default function UserList() {
  const [data, setData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [temporal, setTemporal] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ employeeId: '', correo: '', rol: '' });
  const [masiva, setMasiva] = useState(null);        // null | 'abierto'
  const [simulacion, setSimulacion] = useState(null);
  const [resultadoMasivo, setResultadoMasivo] = useState(null);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [codigoEntregado, setCodigoEntregado] = useState(null);
  const [filtros, setFiltros] = useState({ rol: '', activo: '' });
  const [texto, setTexto] = useState('');
  const [search, setSearch] = useState('');

  // La lista se pide por páginas; antes eran las cien primeras de 432 cuentas
  useEffect(() => {
    const t = setTimeout(() => setSearch(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);
  const cuentas = usePaginado('/users', { ...filtros, search }, { limit: 50 });
  const filtrar = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, p, rec] = await Promise.allSettled([
        api.get('/users', { params: { limit: 1 } }),
        api.get('/users/roles'),
        api.get('/users/pendientes'),
        api.get('/users/recuperaciones'),
      ]);
      if (u.status === 'fulfilled') setData(u.value.data);
      if (r.status === 'fulfilled') setRoles(r.value.data || []);
      if (p.status === 'fulfilled') setPendientes(p.value.data.data || []);
      if (rec.status === 'fulfilled') setRecuperaciones(rec.value.data.data || []);
    } catch {
      toast.error('No se pudieron cargar las cuentas');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Al elegir al empleado se proponen su correo y el rol de su puesto
  const elegirColaborador = (id) => {
    const e = pendientes.find((x) => x._id === id);
    setForm({
      employeeId: id,
      correo: e?.correo || '',
      rol: e?.cargoActual?.rolPorDefecto || '',
    });
  };

  const crear = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/users', form);
      setAltaAbierta(false);
      setForm({ employeeId: '', correo: '', rol: '' });
      if (r.data.contrasenaTemporal) setTemporal(r.data.contrasenaTemporal);
      else toast.success(r.data.mensaje);
      load(); cuentas.recargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo crear la cuenta');
    } finally { setBusy(false); }
  };

  const accion = async (ruta, cuerpo, exito) => {
    setBusy(true);
    try {
      const r = await api.put(`/users/${detalle._id}/${ruta}`, cuerpo || {});
      if (r.data.contrasenaTemporal) {
        setDetalle(null);
        setTemporal(r.data.contrasenaTemporal);
      } else {
        toast.success(r.data.mensaje || exito);
        setDetalle(null);
      }
      load(); cuentas.recargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la acción');
    } finally { setBusy(false); }
  };

  const simularMasiva = async () => {
    setBusy(true);
    try {
      const r = await api.post('/users/alta-masiva', { soloSimular: true, limite: 500 });
      setSimulacion(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo simular');
      setMasiva(null);
    } finally { setBusy(false); }
  };

  const ejecutarMasiva = async () => {
    setBusy(true);
    try {
      const r = await api.post('/users/alta-masiva', { limite: 500 });
      setResultadoMasivo(r.data);
      setMasiva(null);
      setSimulacion(null);
      load(); cuentas.recargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar el alta');
    } finally { setBusy(false); }
  };

  /**
   * Descarga la planilla de credenciales.
   *
   * Es la única oportunidad de guardarlas: el sistema no las almacena en claro,
   * así que si se cierra esta ventana sin descargarlas hay que restablecerlas
   * una por una.
   */
  const descargarCredenciales = (credenciales) => {
    const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [
      ['Apellidos y nombres', 'DNI', 'Cargo', 'Centro', 'Correo', 'Rol', 'Contraseña temporal'],
      ...credenciales.map((c) => [c.nombre, c.dni, c.cargo, c.centro, c.correo, c.rol, c.contrasenaTemporal]),
    ];
    // El BOM hace que Excel abra las tildes correctamente
    const csv = '\uFEFF' + filas.map((f) => f.map(escapar).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { tipo: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `credenciales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Genera el código y lo muestra una sola vez.
   * El sistema guarda su huella, no el código: alguien tiene que poder dictarlo.
   */
  const generarCodigo = async (cuentaId) => {
    setBusy(true);
    try {
      const r = await api.put(`/users/${cuentaId}/codigo-recuperacion`);
      setCodigoEntregado(r.data);
      load(); cuentas.recargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo generar el código');
    } finally { setBusy(false); }
  };

  const columns = [
    {
      key: 'correo', etiqueta: 'Cuenta',
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-700">{v}</p>
          {row.empleado && (
            <Link to={`/employees/${row.empleado._id}`} className="text-xs text-slate-400 hover:text-primary no-underline">
              {row.empleado.nombres} {row.empleado.apellidos}
              {row.empleado.localActual?.nombre && ` · ${row.empleado.localActual.nombre}`}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'rol', etiqueta: 'Rol',
      render: (v) => {
        const r = roles.find((x) => x.codigo === v);
        return (
          <div>
            <p className="text-sm text-slate-700">{r?.etiqueta || v}</p>
            <p className="text-[11px] text-slate-400">{r?.nivelOrganizacional} · {r?.modulos} módulos</p>
          </div>
        );
      },
    },
    { key: 'ultimoIngreso', etiqueta: 'Último ingreso', render: (v) => <span className="text-sm text-slate-500">{fecha(v) === '—' ? 'nunca' : fecha(v)}</span> },
    {
      key: 'activo', etiqueta: 'Estado',
      render: (v, row) => {
        if (!v) return <StatusBadge variant="red">Desactivada</StatusBadge>;
        if (row.bloqueadoHasta && new Date(row.bloqueadoHasta) > new Date()) {
          return <StatusBadge variant="yellow">Bloqueada</StatusBadge>;
        }
        if (row.debeCambiarContrasena) return <StatusBadge variant="blue">Cambio pendiente</StatusBadge>;
        return <StatusBadge variant="green">Activa</StatusBadge>;
      },
    },
  ];

  const actions = (row) => (
    <button onClick={() => setDetalle(row)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Administrar">
      <UserCog size={16} />
    </button>
  );

  const r = data?.resumen;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cuentas de Acceso</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quién puede entrar al sistema y con qué rol
          </p>
        </div>
        <div className="flex items-center gap-2">
          {r?.empleadosSinCuenta > 0 && (
            <button
              onClick={() => { setMasiva('abierto'); simularMasiva(); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <UsersRound size={18} />
              Dar acceso a todos ({r.empleadosSinCuenta})
            </button>
          )}
          <button
            onClick={() => setAltaAbierta(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
          >
            <UserPlus size={18} />
            Dar acceso
          </button>
        </div>
      </div>

      {r && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ShieldCheck} label="Cuentas activas" value={r.activas} tone="green" hint={`${r.total} en total`} />
          <StatCard icon={Users} label="Sin acceso" value={r.empleadosSinCuenta} tone={r.empleadosSinCuenta ? 'amber' : 'green'} hint="Empleados activos sin cuenta" />
          <StatCard icon={KeyRound} label="Cambio pendiente" value={r.conCambioPendiente} tone="blue" hint="Aún usan la contraseña temporal" />
          <StatCard icon={Lock} label="Bloqueadas" value={r.bloqueadas} tone={r.bloqueadas ? 'red' : 'green'} hint="Por intentos fallidos" />
        </div>
      )}

      {r?.empleadosSinCuenta > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <UserX size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {r.empleadosSinCuenta} empleados activos no pueden entrar al sistema
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sin cuenta no marcan asistencia, no ven su boleta ni solicitan vacaciones.
            </p>
          </div>
        </div>
      )}

      {recuperaciones.length > 0 && (
        /**
         * Quien olvidó su contraseña está esperando. El código no se guarda en
         * claro, así que hay que generarlo aquí y dictárselo.
         */
        <div className="px-5 py-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <KeyRound size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-blue-900">
                {recuperaciones.length === 1
                  ? 'Una persona está esperando su código de recuperación'
                  : `${recuperaciones.length} personas están esperando su código de recuperación`}
              </h3>
              <p className="text-xs text-blue-800 mt-0.5">
                Genere el código y dígaselo por teléfono. No se almacena en claro, así que sólo se
                muestra una vez.
              </p>

              <ul className="mt-3 space-y-1.5">
                {recuperaciones.map((s) => (
                  <li key={s._id} className="flex items-center justify-between gap-3 px-3 py-2 bg-white rounded-lg border border-blue-100">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {s.empleado?.nombre || s.correo}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {s.correo}
                        {s.intentosFallidos > 0 && ` · ${s.intentosFallidos} intento(s) fallido(s)`}
                      </p>
                    </div>
                    <button
                      onClick={() => generarCodigo(s._id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Phone size={13} /> Generar código
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        {...cuentas.tabla}
        actions={actions}
        searchValue={texto}
        onSearch={setTexto}
        emptyMessage={cuentas.error || 'No hay cuentas con estos filtros'}
        headerAction={(
          <div className="flex flex-wrap items-center gap-2">
            <select value={filtros.rol} onChange={(e) => filtrar('rol', e.target.value)} aria-label="Rol" className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Todos los roles</option>
              {roles.map((x) => <option key={x.codigo} value={x.codigo}>{x.etiqueta || x.codigo}</option>)}
            </select>
            <select value={filtros.activo} onChange={(e) => filtrar('activo', e.target.value)} aria-label="Estado" className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Activas e inactivas</option>
              <option value="true">Sólo activas</option>
              <option value="false">Sólo inactivas</option>
            </select>
          </div>
        )}
      />

      {/* ─── Alta ─── */}
      <Modal open={altaAbierta} onClose={() => setAltaAbierta(false)} title="Dar acceso al sistema" wide>
        <form onSubmit={crear} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Empleado</label>
            <select
              value={form.employeeId}
              onChange={(e) => elegirColaborador(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Seleccionar entre los que aún no tienen cuenta...</option>
              {pendientes.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.apellidos}, {e.nombres} — {e.cargoActual?.nombre || e.tipoProfesional}
                  {e.localActual?.nombre ? ` · ${e.localActual.nombre}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">{pendientes.length} empleado(es) sin acceso</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Correo de la cuenta</label>
              <input
                type="email" value={form.correo} required
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                placeholder="nombre.apellido@pharmatalent.pe"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Rol en el sistema</label>
              <select
                value={form.rol} required
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Seleccionar...</option>
                {roles.map((x) => (
                  <option key={x.codigo} value={x.codigo}>{x.etiqueta}</option>
                ))}
              </select>
            </div>
          </div>

          {form.rol && (
            <div className="px-4 py-2.5 bg-slate-50 rounded-lg text-xs text-slate-600">
              {(() => {
                const x = roles.find((y) => y.codigo === form.rol);
                if (!x) return null;
                const alcance = { NATIONAL: 'toda la cadena', ZONE: 'su zona', LOCATION: 'su centro de trabajo', SELF: 'sólo su propia información' }[x.scope];
                return <>Verá <strong>{x.modulos} módulos</strong> y su alcance de datos será <strong>{alcance}</strong>.</>;
              })()}
            </div>
          )}

          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            Se generará una contraseña temporal que deberá entregar al empleado. El sistema le
            exigirá definir una propia en su primer ingreso.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAltaAbierta(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
              {busy ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Credencial temporal ─── */}
      <Modal open={!!temporal} onClose={() => setTemporal(null)} title="Contraseña temporal">
        {temporal && <CredencialTemporal valor={temporal} onCerrar={() => setTemporal(null)} />}
      </Modal>

      {/* ─── Administrar cuenta ─── */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title="Administrar cuenta">
        {detalle && (
          <div className="space-y-5">
            <div className="pb-4 border-b border-slate-100">
              <p className="font-semibold text-slate-800">{detalle.correo}</p>
              {detalle.empleado && (
                <p className="text-sm text-slate-500">
                  {detalle.empleado.nombres} {detalle.empleado.apellidos} · {detalle.empleado.dni}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Creada {fecha(detalle.creadoEn)}
                {detalle.creadoPor?.correo && ` por ${detalle.creadoPor.correo}`}
                {' · '}último ingreso {fecha(detalle.ultimoIngreso) === '—' ? 'nunca' : fecha(detalle.ultimoIngreso)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Rol</label>
              <select
                defaultValue={detalle.rol}
                onChange={(e) => accion('rol', { rol: e.target.value }, 'Rol actualizado')}
                disabled={busy}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              >
                {roles.map((x) => <option key={x.codigo} value={x.codigo}>{x.etiqueta}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => accion('reset-password', {}, 'Contraseña restablecida')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <KeyRound size={15} /> Restablecer contraseña
              </button>

              <button
                onClick={() => accion('cerrar-sesiones', {}, 'Sesiones cerradas')}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                title="Corta el acceso al instante sin cambiar la contraseña"
              >
                <LogOut size={15} /> Cerrar sesiones
              </button>

              {detalle.bloqueadoHasta && new Date(detalle.bloqueadoHasta) > new Date() && (
                <button
                  onClick={() => accion('desbloquear', {}, 'Cuenta desbloqueada')}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 cursor-pointer"
                >
                  <Unlock size={15} /> Desbloquear
                </button>
              )}

              {detalle.activo ? (
                <button
                  onClick={() => {
                    const motivo = prompt('Motivo de la revocación de acceso:');
                    if (motivo !== null) accion('estado', { activo: false, motivo }, 'Acceso revocado');
                  }}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer ml-auto"
                >
                  <ShieldOff size={15} /> Revocar acceso
                </button>
              ) : (
                <button
                  onClick={() => accion('estado', { activo: true }, 'Cuenta reactivada')}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer ml-auto"
                >
                  <ShieldCheck size={15} /> Reactivar
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Alta masiva: primero se muestra qué va a pasar ─── */}
      <Modal
        open={!!masiva}
        onClose={() => { setMasiva(null); setSimulacion(null); }}
        title="Dar acceso a todos los empleados"
        wide
      >
        {!simulacion ? (
          <p className="py-8 text-center text-sm text-slate-400">Revisando quiénes no tienen cuenta...</p>
        ) : (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700">
                Se crearán <strong>{simulacion.seCrearian} cuentas</strong>, cada una con el rol que
                corresponde a su cargo y una contraseña temporal de un solo uso.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Nadie podrá usar el sistema hasta definir una contraseña propia.
              </p>
            </div>

            {simulacion.omitidos.length > 0 && (
              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 mb-1.5">
                  {simulacion.omitidos.length} quedarán fuera
                </p>
                <ul className="space-y-0.5">
                  {simulacion.omitidos.slice(0, 5).map((o) => (
                    <li key={o.dni} className="text-xs text-amber-800">
                      {o.nombre} — {o.motivo}
                    </li>
                  ))}
                </ul>
                {simulacion.omitidos.length > 5 && (
                  <p className="text-xs text-amber-700 mt-1">y {simulacion.omitidos.length - 5} más</p>
                )}
              </div>
            )}

            {simulacion.muestra?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Así quedarán los correos</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                  {simulacion.muestra.map((m) => (
                    <div key={m.correo} className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-600 truncate">{m.correo}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{m.rolLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Las contraseñas se muestran <strong>una sola vez</strong> al terminar. Descargue la
                planilla antes de cerrar: después habría que restablecerlas de una en una.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setMasiva(null); setSimulacion(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarMasiva}
                disabled={busy || !simulacion.seCrearian}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Creando cuentas...' : `Crear ${simulacion.seCrearian} cuentas`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Código de recuperación, visible una sola vez ─── */}
      <Modal open={!!codigoEntregado} onClose={() => setCodigoEntregado(null)} title="Código de recuperación">
        {codigoEntregado && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{codigoEntregado.mensaje}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">
                Para <strong>{codigoEntregado.destinatario}</strong>
                {codigoEntregado.telefono && ` · ${codigoEntregado.telefono}`}
              </p>
              <code className="block px-4 py-5 bg-slate-900 text-emerald-300 rounded-lg font-mono text-4xl tracking-[0.3em] text-center select-all">
                {codigoEntregado.codigo}
              </code>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCodigoEntregado(null)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium cursor-pointer"
              >
                Ya se lo dicté
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Resultado con las credenciales, visibles una sola vez ─── */}
      <Modal
        open={!!resultadoMasivo}
        onClose={() => setResultadoMasivo(null)}
        title="Cuentas creadas"
        wide
      >
        {resultadoMasivo && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {resultadoMasivo.creadas} cuentas creadas
                </p>
                <p className="text-xs text-amber-800 mt-0.5">{resultadoMasivo.mensaje}</p>
              </div>
            </div>

            <button
              onClick={() => descargarCredenciales(resultadoMasivo.credenciales)}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold cursor-pointer"
            >
              <Download size={16} /> Descargar la planilla de credenciales
            </button>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              {resultadoMasivo.credenciales.map((c) => (
                <div key={c.correo} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{c.nombre}</p>
                    <p className="text-[11px] text-slate-400 truncate">{c.correo}</p>
                  </div>
                  <code className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded shrink-0 select-all">
                    {c.contrasenaTemporal}
                  </code>
                </div>
              ))}
            </div>

            {resultadoMasivo.fallidas?.length > 0 && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  {resultadoMasivo.fallidas.length} no se pudieron crear
                </p>
                {resultadoMasivo.fallidas.slice(0, 5).map((f) => (
                  <p key={f.dni} className="text-xs text-red-800">{f.nombre} — {f.motivo}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
