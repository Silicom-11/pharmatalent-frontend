import { useState, useEffect } from 'react';
import { LogOut, Fingerprint, PenLine, Plus } from 'lucide-react';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import api from '../../services/api';
import usePaginado from '../../hooks/usePaginado';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PRESENTE: 'green', AUSENTE: 'red', TARDANZA: 'yellow', PERMISO: 'blue',
  VACACIONES: 'purple', LICENCIA: 'gray', FERIADO: 'blue',
};
const METODO = { ROSTRO: 'rostro', HUELLA: 'huella', DNI: 'DNI' };
const hhmm = (v) => (v ? new Date(v).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—');
const hoyYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const selectCls = 'px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white';

/**
 * Control de asistencia de la jefatura.
 *
 * La asistencia entra por el terminal del local. Aquí se consulta y, cuando
 * alguien no pudo marcar, se registra a mano diciendo por qué. Esa marca queda
 * distinguida de las del terminal: es lo que se mira primero en una
 * fiscalización.
 */
export default function AttendanceList() {
  const [texto, setTexto] = useState('');
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({ fecha: hoyYMD(), estado: '', origen: '' });
  const [manual, setManual] = useState(null);   // { empleado, nombre, accion } o { nuevo: true }
  const [equipo, setEquipo] = useState([]);
  const [buscaEquipo, setBuscaEquipo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  // Se consulta cuando la persona deja de escribir, no en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setSearch(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const lista = usePaginado('/attendance', { ...filtros, search });
  const filtrar = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  // El colaborador se busca: una jefatura nacional tiene cientos
  useEffect(() => {
    if (!manual?.nuevo) return undefined;
    const t = setTimeout(() => {
      api.get('/employees', { params: { estado: 'ACTIVO', search: buscaEquipo || undefined, limit: 30 } })
        .then((r) => setEquipo(r.data.data || []))
        .catch(() => toast.error('No se pudo cargar su equipo'));
    }, 250);
    return () => clearTimeout(t);
  }, [buscaEquipo, manual?.nuevo]);

  const abrirNuevo = () => {
    setManual({ nuevo: true, empleado: '' });
    setBuscaEquipo('');
    setMotivo('');
  };

  const registrar = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/attendance/clock-in', { empleado: manual.empleado, motivo: motivo.trim() });
      toast.success(r.data.accion === 'SALIDA' ? 'Salida registrada' : 'Entrada registrada');
      setManual(null);
      lista.recargar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar');
    } finally { setBusy(false); }
  };

  const columns = [
    { key: 'empleado', etiqueta: 'Empleado', render: (v) => v ? `${v.nombres} ${v.apellidos}` : '—' },
    { key: 'local', etiqueta: 'Local', render: (v) => v?.nombre || '—' },
    { key: 'fecha', etiqueta: 'Fecha', render: (v) => (v ? new Date(v).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' }) : '—') },
    { key: 'marcaEntrada', etiqueta: 'Entrada', render: (v) => hhmm(v) },
    { key: 'marcaSalida', etiqueta: 'Salida', render: (v) => hhmm(v) },
    { key: 'horasTrabajadas', etiqueta: 'Horas', render: (v) => v ? `${v.toFixed(1)}h` : '—' },
    { key: 'minutosTardanza', etiqueta: 'Tardanza', render: (v) => v > 0 ? <StatusBadge variant="yellow">{v} min</StatusBadge> : '—' },
    {
      key: 'origen', etiqueta: 'Origen',
      render: (v, row) => (v === 'CORRECCION' ? (
        <span className="inline-flex items-center gap-1 text-xs text-amber-700" title={row.correccion?.motivo || ''}>
          <PenLine size={12} /> Manual
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <Fingerprint size={12} /> Terminal{row.metodo ? ` · ${METODO[row.metodo] || row.metodo}` : ''}
        </span>
      )),
    },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_COLORS[v] || 'gray'}>{v}</StatusBadge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control de Asistencia</h1>
          <p className="text-sm text-slate-500">
            Las marcas entran por el terminal del local. El registro manual queda señalado con su motivo.
          </p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light cursor-pointer">
          <Plus size={16} /> Registro manual
        </button>
      </div>

      <DataTable
        columns={columns}
        {...lista.tabla}
        searchValue={texto}
        onSearch={setTexto}
        emptyMessage={lista.error || 'No hay marcas con estos filtros'}
        headerAction={(
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={filtros.fecha} onChange={(e) => filtrar('fecha', e.target.value)} className={selectCls} aria-label="Día" />
            <select value={filtros.estado} onChange={(e) => filtrar('estado', e.target.value)} className={selectCls} aria-label="Estado">
              <option value="">Todos los estados</option>
              {['PRESENTE', 'TARDANZA', 'AUSENTE'].map((v) => <option key={v} value={v}>{v.charAt(0) + v.slice(1).toLowerCase()}</option>)}
            </select>
            <select value={filtros.origen} onChange={(e) => filtrar('origen', e.target.value)} className={selectCls} aria-label="Origen">
              <option value="">Terminal y manual</option>
              <option value="TERMINAL">Sólo terminal</option>
              <option value="CORRECCION">Sólo registro manual</option>
            </select>
          </div>
        )}
        actions={(row) => (
          <div className="flex gap-1 justify-end">
            {row.marcaEntrada && !row.marcaSalida && (
              <button
                onClick={() => { setManual({ empleado: row.empleado?._id, nombre: `${row.empleado?.nombres} ${row.empleado?.apellidos}`, accion: 'salida' }); setMotivo(''); }}
                className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs font-medium hover:bg-slate-100 cursor-pointer"
                title="No marcó su salida en el terminal"
              >
                <LogOut size={14} /> Registrar salida
              </button>
            )}
          </div>
        )}
      />

      <Modal open={!!manual} onClose={() => setManual(null)} title="Registro manual de asistencia">
        {manual && (
          <form onSubmit={registrar} className="space-y-4">
            {manual.nuevo ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Colaborador</span>
                <input
                  value={buscaEquipo}
                  onChange={(e) => setBuscaEquipo(e.target.value)}
                  placeholder="Buscar por nombre o DNI"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <select
                  value={manual.empleado}
                  onChange={(e) => setManual({ ...manual, empleado: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                >
                  <option value="">Seleccione…</option>
                  {equipo.map((e) => <option key={e._id} value={e._id}>{e.apellidos}, {e.nombres}</option>)}
                </select>
              </label>
            ) : (
              <p className="text-sm text-slate-700">
                Se registrará la <span className="font-semibold">{manual.accion}</span> de <span className="font-semibold">{manual.nombre}</span> con la hora actual.
              </p>
            )}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Motivo</span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="Corte de luz, el lector no lo reconoció, terminal fuera de servicio…"
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                required
                minLength={5}
              />
              <span className="text-xs text-slate-500">
                Queda en el registro de asistencia con su nombre. El sistema decide si es entrada o salida.
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setManual(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg cursor-pointer">Cancelar</button>
              <button disabled={busy || motivo.trim().length < 5 || !manual.empleado} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {busy ? 'Registrando…' : 'Registrar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
