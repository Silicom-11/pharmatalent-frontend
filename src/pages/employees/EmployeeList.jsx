import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import toast from 'react-hot-toast';

const TYPES = { QF: 'Químico Farmacéutico', TECNICO: 'Técnico', JEFE_LOCAL: 'Jefe de Local', ADMINISTRATIVO: 'Administrativo' };
const TYPE_COLORS = { QF: 'blue', TECNICO: 'gray', JEFE_LOCAL: 'purple', ADMINISTRATIVO: 'green' };

const EMPTY = {
  dni: '', nombres: '', apellidos: '', tipoProfesional: 'TECNICO',
  numeroCQF: '', fechaIngreso: '', sueldoBasico: '', estado: 'ACTIVO',
};

export default function EmployeeList() {
  const { usuario } = useAuth();
  // Leer el legajo no es editarlo: el QF o el Auditor consultan el equipo,
  // pero antes veían también «Nuevo», «Editar» y «Eliminar»
  const puedeEditar = can(usuario, 'employees', 'write');
  const puedeCesar = can(usuario, 'employees', 'approve');
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [zones, setZones] = useState([]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      const res = await api.get('/employees', { params });
      setEmployees(res.data.data);
      setPagination(res.data.pagination || {});
    } catch {
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Los catálogos sólo sirven al formulario de alta y edición: se piden si la
  // cuenta puede usarlo y si puede leerlos. Antes se pedían siempre, y cada
  // rol sin acceso a puestos o zonas recibía errores 403 al abrir la lista
  useEffect(() => {
    if (!puedeEditar) return;
    const pedir = (modulo, ruta, guardar) => {
      if (can(usuario, modulo, 'read')) api.get(ruta).then((r) => guardar(r.data)).catch(() => {});
    };
    pedir('positions', '/positions', setPositions);
    pedir('locations', '/locations', setLocations);
    pedir('zones', '/zones', setZones);
  }, [puedeEditar, usuario]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModalOpen(true); };
  const openEdit = (emp) => {
    setForm({
      dni: emp.dni, nombres: emp.nombres, apellidos: emp.apellidos,
      tipoProfesional: emp.tipoProfesional, numeroCQF: emp.numeroCQF || '',
      fechaIngreso: emp.fechaIngreso?.slice(0, 10) || '', sueldoBasico: emp.sueldoBasico || '',
      estado: emp.estado || 'ACTIVO',
      cargoActual: emp.cargoActual?._id || emp.cargoActual || '',
      localActual: emp.localActual?._id || emp.localActual || '',
      zona: emp.zona?._id || emp.zona || '',
    });
    setSelected(emp);
    setModalOpen(true);
  };
  const openDetail = (emp) => { setSelected(emp); setDetailOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, sueldoBasico: Number(form.sueldoBasico) || 0 };
      if (!payload.numeroCQF) delete payload.numeroCQF;
      if (!payload.cargoActual) delete payload.cargoActual;
      if (!payload.localActual) delete payload.localActual;
      if (!payload.zona) delete payload.zona;

      if (selected) {
        await api.put(`/employees/${selected._id}`, payload);
        toast.success('Empleado actualizado');
      } else {
        await api.post('/employees', payload);
        toast.success('Empleado creado');
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!confirm(`¿Registrar el cese de ${emp.nombres} ${emp.apellidos}?\n\nEl legajo se conserva (la ley obliga a guardarlo), pero su acceso al sistema se cierra de inmediato.`)) return;
    try {
      await api.delete(`/employees/${emp._id}`);
      toast.success('Cese registrado y acceso cerrado');
      fetchEmployees();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const columns = [
    { key: 'dni', etiqueta: 'DNI' },
    { key: 'nombres', etiqueta: 'Nombre', render: (_, row) => `${row.nombres} ${row.apellidos}` },
    { key: 'tipoProfesional', etiqueta: 'Tipo', render: (v) => <StatusBadge variant={TYPE_COLORS[v]}>{TYPES[v] || v}</StatusBadge> },
    { key: 'cargoActual', etiqueta: 'Cargo', render: (v) => v?.nombre || '—' },
    { key: 'localActual', etiqueta: 'Local', render: (v) => v?.nombre || '—' },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={v === 'ACTIVO' ? 'green' : 'gray'}>{v}</StatusBadge> },
  ];

  const field = (etiqueta, nombre, tipo = 'text', opts = {}) => (
    <div className={opts.full ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-600 mb-1">{etiqueta}</label>
      {opts.select ? (
        <select value={form[nombre]} onChange={(e) => setForm({ ...form, [nombre]: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
          {opts.options.map((o) => <option key={o.value} value={o.value}>{o.etiqueta}</option>)}
        </select>
      ) : (
        <input type={tipo} value={form[nombre]} onChange={(e) => setForm({ ...form, [nombre]: e.target.value })} required={opts.req} max={opts.max} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Empleados</h1>
        <p className="text-sm text-slate-500">Gestión de empleados de InRetail Pharma</p>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        searchValue={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        pagination={{ ...pagination, page }}
        onPageChange={setPage}
        headerAction={puedeEditar &&
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
            <Plus size={16} /> Nuevo
          </button>
        }
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => navigate(`/employees/${row._id}`)} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer" title="Ver ficha completa"><Eye size={16} className="text-slate-400" /></button>
            {puedeEditar && <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-slate-100 rounded cursor-pointer" title="Editar"><Pencil size={16} className="text-slate-400" /></button>}
            {puedeCesar && row.estado !== 'CESADO' && <button onClick={() => handleDelete(row)} className="p-1.5 hover:bg-red-50 rounded cursor-pointer" title="Registrar cese"><Trash2 size={16} className="text-red-400" /></button>}
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Editar Empleado' : 'Nuevo Empleado'} wide>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('DNI', 'dni', 'text', { req: true })}
          {field('Nombres', 'nombres', 'text', { req: true })}
          {field('Apellidos', 'apellidos', 'text', { req: true })}
          {field('Tipo Profesional', 'tipoProfesional', 'text', { select: true, options: Object.entries(TYPES).map(([value, etiqueta]) => ({ value, etiqueta })) })}
          {form.tipoProfesional === 'QF' && field('N° CQF', 'numeroCQF')}
          {field('Fecha de Ingreso', 'fechaIngreso', 'date', { req: true, max: new Date().toLocaleDateString('en-CA') })}
          {field('Salario Base (S/)', 'sueldoBasico', 'numero')}
          {field('Estado', 'estado', 'text', { select: true, options: [{ value: 'ACTIVO', etiqueta: 'Activo' }, { value: 'INACTIVO', etiqueta: 'Inactivo' }, { value: 'LICENCIA', etiqueta: 'Licencia' }, { value: 'VACACIONES', etiqueta: 'Vacaciones' }] })}
          {field('Cargo', 'cargoActual', 'text', { select: true, options: [{ value: '', etiqueta: '— Seleccionar —' }, ...positions.map((p) => ({ value: p._id, etiqueta: p.nombre }))] })}
          {field('Local', 'localActual', 'text', { select: true, options: [{ value: '', etiqueta: '— Seleccionar —' }, ...locations.map((l) => ({ value: l._id, etiqueta: l.nombre }))] })}
          {field('Zona', 'zona', 'text', { select: true, options: [{ value: '', etiqueta: '— Seleccionar —' }, ...zones.map((z) => ({ value: z._id, etiqueta: z.nombre }))] })}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Detalle del Empleado" wide>
        {selected && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">DNI:</span> <strong>{selected.dni}</strong></div>
            <div><span className="text-slate-500">Nombre:</span> <strong>{selected.nombres} {selected.apellidos}</strong></div>
            <div><span className="text-slate-500">Tipo:</span> <StatusBadge variant={TYPE_COLORS[selected.tipoProfesional]}>{TYPES[selected.tipoProfesional]}</StatusBadge></div>
            {selected.numeroCQF && <div><span className="text-slate-500">CQF:</span> <strong>{selected.numeroCQF}</strong></div>}
            <div><span className="text-slate-500">Cargo:</span> <strong>{selected.cargoActual?.nombre || '—'}</strong></div>
            <div><span className="text-slate-500">Local:</span> <strong>{selected.localActual?.nombre || '—'}</strong></div>
            <div><span className="text-slate-500">Zona:</span> <strong>{selected.zona?.nombre || '—'}</strong></div>
            <div><span className="text-slate-500">Ingreso:</span> <strong>{selected.fechaIngreso?.slice(0, 10) || '—'}</strong></div>
            <div><span className="text-slate-500">Salario:</span> <strong>S/ {selected.sueldoBasico?.toLocaleString() || '—'}</strong></div>
            <div><span className="text-slate-500">Estado:</span> <StatusBadge variant={selected.estado === 'ACTIVO' ? 'green' : 'gray'}>{selected.estado}</StatusBadge></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
