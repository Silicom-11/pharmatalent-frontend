import { useState, useEffect, useCallback } from 'react';
import {
  UserMinus, Calculator, AlertTriangle, Check, Clock, Banknote,
  FileText, ShieldAlert, Printer,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import api from '../../services/api';
import toast from 'react-hot-toast';

const S = (n) =>
  n != null ? `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const hoy = () => new Date().toISOString().slice(0, 10);

const ESTADO = {
  BORRADOR: { variant: 'yellow', texto: 'Por aprobar' },
  APROBADA: { variant: 'blue', texto: 'Por pagar' },
  PAGADA: { variant: 'green', texto: 'Pagada' },
  ANULADA: { variant: 'gray', texto: 'Anulada' },
};

/**
 * El cálculo, presentado como el documento que se firma.
 * Cada concepto muestra la norma que lo sustenta: es lo que hace que quien
 * aprueba pueda revisar sin tener el D.Leg. 650 al lado.
 */
function DetalleCalculo({ calculo }) {
  if (!calculo) return null;
  const c = calculo.empleado || {};

  return (
    <div className="liquidacion-impresa space-y-4">
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <p className="font-semibold text-slate-800">{c.nombre}</p>
          <p className="text-xs text-slate-500">
            DNI {c.dni} · ingresó {c.fechaIngreso} · cesa {c.fechaCese}
          </p>
          <p className="text-xs text-slate-500">{c.tiempoDeServicio}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Causa</p>
          <p className="text-sm font-medium text-slate-700">{calculo.causa?.etiqueta}</p>
        </div>
      </div>

      {calculo.avisos?.length > 0 && (
        <div className="space-y-1.5">
          {calculo.avisos.map((a) => (
            <div key={a} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{a}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5 pb-1 border-b border-slate-200">
          Conceptos devengados
        </h4>
        {(calculo.conceptos || []).map((l) => (
          <div key={l.concepto} className="py-1.5 border-b border-slate-50 last:border-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-slate-700">{l.concepto}</span>
              <span className="text-[13px] tabular-nums text-slate-800 shrink-0">{S(l.monto)}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">{l.detalle}</p>
            {l.norma && <p className="text-[10px] text-slate-400 italic">{l.norma}</p>}
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 pt-2 mt-1 border-t border-slate-200">
          <span className="text-[12px] font-semibold text-slate-700">Total devengado</span>
          <span className="text-[13px] font-bold tabular-nums">{S(calculo.totales?.bruto)}</span>
        </div>
      </div>

      {calculo.descuentos?.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5 pb-1 border-b border-slate-200">
            Descuentos
          </h4>
          {calculo.descuentos.map((l) => (
            <div key={l.concepto} className="py-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] text-slate-700">{l.concepto}</span>
                <span className="text-[13px] tabular-nums text-red-600 shrink-0">{S(l.monto)}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">{l.detalle}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 bg-slate-800 text-white rounded-lg">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[11px] font-bold tracking-wider uppercase">Neto a pagar</span>
          <span className="text-xl font-bold tabular-nums">{S(calculo.totales?.neto)}</span>
        </div>
      </div>

      {calculo.plazo && (
        <p className="text-[11px] text-slate-500">{calculo.plazo.aviso}</p>
      )}
    </div>
  );
}

export default function SettlementList() {
  const { usuario } = useAuth();
  const puedeAprobar = can(usuario, 'contracts', 'approve');
  const puedeCalcular = can(usuario, 'contracts', 'write');

  const [data, setData] = useState(null);
  const [causas, setCausas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [form, setForm] = useState({ employeeId: '', fechaCese: hoy(), causa: 'RENUNCIA', motivoDetallado: '', adelantos: '' });
  const [simulacion, setSimulacion] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);

  const [detalle, setDetalle] = useState(null);
  const [pagoAbierto, setPagoAbierto] = useState(null);
  const [pago, setPago] = useState({ fechaPago: hoy(), medioDePago: 'TRANSFERENCIA', referenciaPago: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, c, e] = await Promise.allSettled([
        api.get('/liquidaciones', { params: { limit: 50 } }),
        api.get('/liquidaciones/causas'),
        api.get('/employees', { params: { estado: 'ACTIVO', limit: 200 } }),
      ]);
      if (l.status === 'fulfilled') setData(l.value.data);
      if (c.status === 'fulfilled') setCausas(c.value.data || []);
      if (e.status === 'fulfilled') setEmpleados(e.value.data.data || []);
    } catch {
      toast.error('No se pudieron cargar las liquidaciones');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Calcula sin escribir nada, para saber cuánto cuesta antes de decidir */
  const simular = async () => {
    if (!form.employeeId) return toast.error('Elija al empleado');
    setBusy(true);
    setConfirmacion(null);
    try {
      const r = await api.post('/liquidaciones/simular', {
        employeeId: form.employeeId,
        fechaCese: form.fechaCese,
        causa: form.causa,
        adelantos: form.adelantos ? Number(form.adelantos) : undefined,
      });
      setSimulacion(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo simular');
      setSimulacion(null);
    } finally { setBusy(false); }
  };

  const crear = async (confirmando = false) => {
    setBusy(true);
    try {
      const r = await api.post('/liquidaciones', {
        employeeId: form.employeeId,
        fechaCese: form.fechaCese,
        causa: form.causa,
        motivoDetallado: form.motivoDetallado || undefined,
        adelantos: form.adelantos ? Number(form.adelantos) : undefined,
        ...(confirmando ? { confirmarSaldoVacaciones: true } : {}),
      });
      toast.success(r.data.mensaje);
      setNuevaAbierta(false);
      setSimulacion(null);
      setConfirmacion(null);
      setForm({ employeeId: '', fechaCese: hoy(), causa: 'RENUNCIA', motivoDetallado: '', adelantos: '' });
      load();
    } catch (err) {
      const d = err.response?.data;
      // El sistema pide reafirmar algo que revisó y considera arriesgado
      if (d?.requiereConfirmacion) setConfirmacion({ aviso: d.error, calculo: d.calculo });
      else toast.error(d?.error || 'No se pudo crear la liquidación');
    } finally { setBusy(false); }
  };

  const accion = async (id, ruta, cuerpo, exito) => {
    setBusy(true);
    try {
      const r = await api.put(`/liquidaciones/${id}/${ruta}`, cuerpo || {});
      toast.success(r.data.mensaje || exito);
      setDetalle(null);
      setPagoAbierto(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la acción');
    } finally { setBusy(false); }
  };

  const columns = [
    {
      key: 'empleado', etiqueta: 'Empleado',
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-700">{v?.nombres} {v?.apellidos}</p>
          <p className="text-xs text-slate-400">DNI {v?.dni} · {row.tiempoDeServicio}</p>
        </div>
      ),
    },
    { key: 'causa', etiqueta: 'Causa', render: (v) => <span className="text-sm text-slate-600">{causas.find((c) => c.codigo === v)?.etiqueta || v}</span> },
    { key: 'fechaCese', etiqueta: 'Cese', render: (v) => <span className="text-sm text-slate-500">{fecha(v)}</span> },
    {
      key: 'totales', etiqueta: 'Neto',
      render: (v) => <span className="text-sm font-semibold tabular-nums text-slate-800">{S(v?.neto)}</span>,
    },
    {
      key: 'estado', etiqueta: 'Estado',
      render: (v, row) => {
        const e = ESTADO[v] || { variant: 'gray', texto: v };
        const fuera = ['BORRADOR', 'APROBADA'].includes(v) && row.diasDesdeElCese > 2;
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge variant={e.variant}>{e.texto}</StatusBadge>
            {fuera && (
              <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium" title="Pasó el plazo de 48 horas">
                <Clock size={11} /> fuera de plazo
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const r = data?.resumen;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ceses y Liquidaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            La ley da 48 horas para pagar lo devengado desde que termina el vínculo
          </p>
        </div>
        {puedeCalcular && (
          <button
            onClick={() => { setNuevaAbierta(true); setSimulacion(null); setConfirmacion(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
          >
            <UserMinus size={18} /> Calcular liquidación
          </button>
        )}
      </div>

      {r?.fueraDePlazo > 0 && (
        <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-900">
              {r.fueraDePlazo} liquidación(es) fuera del plazo legal
            </h3>
            <p className="text-xs text-red-800 mt-0.5">
              Han pasado más de 48 horas desde el cese sin registrar el pago. El retraso genera
              intereses y es materia de fiscalización de SUNAFIL.
            </p>
          </div>
        </div>
      )}

      {r && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Liquidaciones" value={r.total} tone="slate" hint="En el sistema" />
          <StatCard icon={Calculator} label="Por aprobar" value={r.borradores} tone={r.borradores ? 'amber' : 'green'} hint="Calculadas, sin visar" />
          <StatCard icon={Banknote} label="Por pagar" value={r.porPagar} tone={r.porPagar ? 'blue' : 'green'} hint="Aprobadas, sin abonar" />
          <StatCard icon={Clock} label="Fuera de plazo" value={r.fueraDePlazo} tone={r.fueraDePlazo ? 'red' : 'green'} hint="Más de 48 horas" />
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={loading}
        actions={(row) => (
          <button onClick={() => setDetalle(row)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Ver">
            <FileText size={16} />
          </button>
        )}
        emptyMessage="No hay liquidaciones registradas"
      />

      {/* ─── Nueva liquidación ─── */}
      <Modal
        open={nuevaAbierta}
        onClose={() => { setNuevaAbierta(false); setSimulacion(null); setConfirmacion(null); }}
        title="Calcular liquidación de beneficios sociales"
        wide
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Empleado</label>
              <select
                value={form.employeeId}
                onChange={(e) => { setForm({ ...form, employeeId: e.target.value }); setSimulacion(null); }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Seleccionar...</option>
                {empleados.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.apellidos}, {e.nombres} — DNI {e.dni}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Fecha de cese</label>
              <input
                type="date" value={form.fechaCese} max={hoy()}
                onChange={(e) => { setForm({ ...form, fechaCese: e.target.value }); setSimulacion(null); }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Causa</label>
              <select
                value={form.causa}
                onChange={(e) => { setForm({ ...form, causa: e.target.value }); setSimulacion(null); }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              >
                {causas.map((c) => <option key={c.codigo} value={c.codigo}>{c.etiqueta}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Adelantos a descontar <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                type="number" min="0" step="0.01" value={form.adelantos}
                onChange={(e) => { setForm({ ...form, adelantos: e.target.value }); setSimulacion(null); }}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Detalle <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                type="text" value={form.motivoDetallado}
                onChange={(e) => setForm({ ...form, motivoDetallado: e.target.value })}
                placeholder="Circunstancia del cese"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {form.causa && causas.find((c) => c.codigo === form.causa)?.nota && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2.5">
              {causas.find((c) => c.codigo === form.causa).nota}
            </p>
          )}

          {!simulacion ? (
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setNuevaAbierta(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={simular} disabled={busy || !form.employeeId}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
              >
                <Calculator size={16} /> {busy ? 'Calculando...' : 'Calcular'}
              </button>
            </div>
          ) : (
            <>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-3">
                  Cálculo previo — todavía no se ha registrado nada y el empleado sigue activo
                </p>
                <DetalleCalculo calculo={simulacion} />
              </div>

              {confirmacion && (
                <div className="px-4 py-3 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">Confirme antes de continuar</p>
                      <p className="text-xs text-red-800 mt-1">{confirmacion.aviso}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setSimulacion(null); setConfirmacion(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                  Volver
                </button>
                <button
                  onClick={() => crear(!!confirmacion)} disabled={busy}
                  className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer ${
                    confirmacion ? 'bg-red-600 hover:bg-red-700' : 'bg-primary'
                  }`}
                >
                  {busy ? 'Guardando...' : confirmacion ? 'Confirmo y registro la liquidación' : 'Registrar liquidación'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ─── Detalle y decisiones ─── */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title="Liquidación de beneficios sociales" wide>
        {detalle && (
          <div className="space-y-5">
            <div className="flex justify-end no-imprimir">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Printer size={15} /> Imprimir
              </button>
            </div>

            <DetalleCalculo
              calculo={{
                empleado: {
                  nombre: `${detalle.empleado?.apellidos || ''}, ${detalle.empleado?.nombres || ''}`,
                  dni: detalle.empleado?.dni,
                  fechaIngreso: fecha(detalle.empleado?.fechaIngreso),
                  fechaCese: fecha(detalle.fechaCese),
                  tiempoDeServicio: detalle.tiempoDeServicio,
                },
                causa: causas.find((c) => c.codigo === detalle.causa),
                conceptos: detalle.conceptos,
                descuentos: detalle.descuentos,
                totales: detalle.totales,
                avisos: detalle.avisos,
              }}
            />

            {detalle.estado === 'PAGADA' && (
              <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="flex items-center gap-2 text-sm text-emerald-900">
                  <Check size={15} /> Pagada el {fecha(detalle.pagadaEn)}
                  {detalle.medioDePago && ` · ${detalle.medioDePago.replace('_', ' ').toLowerCase()}`}
                  {detalle.referenciaPago && ` · ref. ${detalle.referenciaPago}`}
                </p>
                {detalle.firmadaPorTrabajador && (
                  <p className="text-xs text-emerald-700 mt-1 pl-6">
                    Firmada por el trabajador el {fecha(detalle.firmadaEn)}
                    {detalle.observacionTrabajador && ` — «${detalle.observacionTrabajador}»`}
                  </p>
                )}
              </div>
            )}

            {puedeAprobar && detalle.estado !== 'PAGADA' && detalle.estado !== 'ANULADA' && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 no-imprimir">
                <button
                  onClick={() => {
                    const motivo = prompt('Motivo de la anulación:');
                    if (motivo) accion(detalle._id, 'anular', { motivo }, 'Anulada');
                  }}
                  disabled={busy}
                  className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                >
                  Anular
                </button>

                {detalle.estado === 'BORRADOR' && (
                  <button
                    onClick={() => accion(detalle._id, 'aprobar', {}, 'Aprobada')}
                    disabled={busy}
                    className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer"
                  >
                    <Check size={15} /> Aprobar
                  </button>
                )}

                {detalle.estado === 'APROBADA' && (
                  <button
                    onClick={() => { setPagoAbierto(detalle); setDetalle(null); }}
                    className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium cursor-pointer"
                  >
                    <Banknote size={15} /> Registrar pago
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Registro del pago ─── */}
      <Modal open={!!pagoAbierto} onClose={() => setPagoAbierto(null)} title="Registrar el pago de la liquidación">
        {pagoAbierto && (
          <form
            onSubmit={(e) => { e.preventDefault(); accion(pagoAbierto._id, 'pagar', pago, 'Pago registrado'); }}
            className="space-y-4"
          >
            <div className="px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700">
                {pagoAbierto.empleado?.nombres} {pagoAbierto.empleado?.apellidos}
              </p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{S(pagoAbierto.totales?.neto)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Fecha de pago</label>
                <input
                  type="date" required value={pago.fechaPago} max={hoy()}
                  onChange={(e) => setPago({ ...pago, fechaPago: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Medio</label>
                <select
                  value={pago.medioDePago}
                  onChange={(e) => setPago({ ...pago, medioDePago: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="DEPOSITO_CUENTA">Depósito en cuenta</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="EFECTIVO">Efectivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Referencia <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                type="text" value={pago.referenciaPago}
                onChange={(e) => setPago({ ...pago, referenciaPago: e.target.value })}
                placeholder="N.º de operación"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Al registrar el pago, el empleado queda <strong>cesado</strong> y su acceso al
                sistema se revoca de inmediato. Recuerde entregar el certificado de trabajo dentro
                de las 48 horas.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPagoAbierto(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {busy ? 'Registrando...' : 'Registrar pago y cesar'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .liquidacion-impresa, .liquidacion-impresa * { visibility: visible; }
          .liquidacion-impresa { position: absolute; left: 0; top: 0; width: 100%; }
          .no-imprimir { display: none !important; }
          .liquidacion-impresa .bg-slate-800 {
            background: #1e293b !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
