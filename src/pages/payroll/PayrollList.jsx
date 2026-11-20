import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calculator, CheckCircle, Eye, RefreshCw, Building2,
  TrendingDown, HeartPulse, Clock, Gift, PiggyBank, AlertTriangle, Banknote,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import BoletaFormal from '../../components/BoletaFormal';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/roles';
import BoletaDetalle, { S } from '../../components/BoletaDetalle';
import api from '../../services/api';
import usePaginado from '../../hooks/usePaginado';
import toast from 'react-hot-toast';

const STATUS_MAP = { BORRADOR: 'gray', CALCULADO: 'yellow', APROBADO: 'blue', PAGADO: 'green' };

const periodoActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const PLANILLA_LABEL = { BORRADOR: 'en borrador', CALCULADA: 'por aprobar', APROBADA: 'por pagar', PAGADA: 'pagada', CERRADA: 'cerrada' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const nombrePeriodo = (p) => { const [a, m] = String(p).split('-'); return `${MESES[Number(m) - 1] || m} ${a}`; };

export default function PayrollList() {
  const { usuario } = useAuth();
  const [resumen, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  // El ciclo va un mes detrás del calendario: el período que se abre es el
  // que está en curso según la API, no el mes de hoy (que aún no se calcula)
  const [periodo, setPeriod] = useState('');
  const [planillas, setPlanillas] = useState([]);
  const [calcModal, setCalcModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [vistaBoleta, setVistaBoleta] = useState('detalle');
  const [sinLiquidar, setSinLiquidar] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [recalculate, setRecalculate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pagoModal, setPagoModal] = useState(null);   // boleta suelta, o 'PERIODO'
  const [pago, setPago] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    medioDePago: 'TRANSFERENCIA',
    referenciaPago: '',
  });

  const canWrite = can(usuario, 'payroll', 'write');
  const canApprove = can(usuario, 'payroll', 'approve');

  const cargarPlanillas = useCallback(async () => {
    try {
      const r = await api.get('/payroll/periodos');
      setPlanillas(r.data.data || []);
      return r.data.enCurso;
    } catch { return null; }
  }, []);

  useEffect(() => {
    cargarPlanillas().then((enCurso) => setPeriod((p) => p || enCurso || periodoActual()));
  }, [cargarPlanillas]);

  const boletas = usePaginado('/payroll', { periodo }, { activo: !!periodo, limit: 50 });
  const planilla = planillas.find((p) => p.periodo === periodo);

  const load = useCallback(async () => {
    if (!periodo) return;
    setLoading(true);
    try {
      // Días trabajados que ninguna boleta cubre: sólo aparece si los hay
      api.get(`/payroll/${periodo}/sin-liquidar`)
        .then((r) => setSinLiquidar(r.data?.casos?.length ? r.data : null))
        .catch(() => setSinLiquidar(null));

      const r = await api.get(`/payroll/summary/${periodo}`).catch(() => null);
      setSummary(r?.data || null);
    } finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { load(); }, [load]);

  // Tras cualquier cambio de estado: resumen, boletas y planilla del mes
  const refrescar = () => { load(); boletas.recargar(); cargarPlanillas(); };

  const aprobarPeriodo = async () => {
    if (!window.confirm(`¿Aprobar todas las boletas calculadas de ${nombrePeriodo(periodo)}? Su propia boleta, si la hay, queda para otro aprobador.`)) return;
    setBusy(true);
    try {
      const r = await api.post(`/payroll/${periodo}/approve-all`);
      toast.success(`${r.data.aprobadas} boleta(s) aprobadas`);
      if (r.data.propiaPendiente) toast('Su propia boleta queda pendiente: la aprueba otro responsable.', { icon: 'ℹ️' });
      refrescar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo aprobar el período');
    } finally { setBusy(false); }
  };

  const calcular = async (e) => {
    e.preventDefault();
    setCalculating(true);
    try {
      const r = await api.post(`/payroll/calculate/${periodo}`, { recalculate });
      const { created, updated, skipped, totales } = r.data;
      toast.success(`${created} boleta(s) nueva(s), ${updated} actualizada(s)${skipped ? `, ${skipped} omitida(s)` : ''}`);
      if (totales?.neto) toast(`Neto del período: ${S(totales.neto)}`, { icon: '💰', duration: 5000 });
      setCalcModal(false);
      refrescar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al calcular la planilla');
    } finally { setCalculating(false); }
  };

  const recalcularUna = async (id) => {
    setBusy(true);
    try {
      const r = await api.post(`/payroll/${id}/recalculate`);
      toast.success('Boleta recalculada');
      setDetail(r.data);
      refrescar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo recalcular');
    } finally { setBusy(false); }
  };

  const aprobar = async (id) => {
    try {
      await api.put(`/payroll/${id}/approve`);
      toast.success('Boleta aprobada');
      setDetail(null);
      refrescar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aprobar');
    }
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (pagoModal === 'PERIODO') {
        const r = await api.post(`/payroll/${periodo}/pay-all`, pago);
        toast.success(`${r.data.pagadas} boleta(s) pagadas por ${S(r.data.montoTotal)}`);
      } else {
        await api.put(`/payroll/${pagoModal._id}/pay`, pago);
        toast.success('Pago registrado');
      }
      setPagoModal(null);
      setDetail(null);
      refrescar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar el pago');
    } finally { setBusy(false); }
  };

  const columns = [
    {
      key: 'empleado', etiqueta: 'Empleado',
      render: (v) => v ? (
        <div>
          <p className="font-medium text-slate-700">{v.nombres} {v.apellidos}</p>
          <p className="text-xs text-slate-400">{v.dni}</p>
        </div>
      ) : '—',
    },
    {
      key: 'dias', etiqueta: 'Días', render: (v) => v ? (
        <span className="text-sm tabular-nums">
          {v.remunerados}
          {v.faltas > 0 && <span className="text-red-500 text-xs ml-1">−{v.faltas}f</span>}
          {v.vacaciones > 0 && <span className="text-teal-600 text-xs ml-1">{v.vacaciones}v</span>}
        </span>
      ) : '—',
    },
    {
      key: 'ingresos', etiqueta: 'Ingresos',
      render: (v, row) => (
        <span className="tabular-nums text-slate-700">
          {S(v?.total ?? row.sueldoBasico)}
          {v?.horasExtra?.horas > 0 && (
            <span className="block text-[11px] text-blue-600">+{v.horasExtra.horas}h extra</span>
          )}
        </span>
      ),
    },
    {
      key: 'descuentos', etiqueta: 'Descuentos',
      render: (v) => (
        <span className="tabular-nums text-red-600">
          −{S(v?.total)}
          {v?.pension?.sistema && <span className="block text-[11px] text-slate-400">{v.pension.sistema.replace('AFP_', '')}</span>}
        </span>
      ),
    },
    { key: 'netoAPagar', etiqueta: 'Neto', render: (v) => <span className="font-semibold text-emerald-600 tabular-nums">{S(v)}</span> },
    {
      key: 'aportesEmpleador', etiqueta: 'Aporte empresa',
      render: (v) => <span className="tabular-nums text-slate-500 text-sm">{S(v?.total)}</span>,
    },
    { key: 'estado', etiqueta: 'Estado', render: (v) => <StatusBadge variant={STATUS_MAP[v]}>{v}</StatusBadge> },
  ];

  const actions = (row) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => setDetail(row)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer" title="Ver boleta">
        <Eye size={16} />
      </button>
      {canWrite && ['BORRADOR', 'CALCULADO'].includes(row.estado) && (
        <button onClick={() => recalcularUna(row._id)} className="p-1.5 text-slate-400 hover:text-violet-600 rounded hover:bg-violet-50 cursor-pointer" title="Recalcular">
          <RefreshCw size={16} />
        </button>
      )}
      {canApprove && row.estado === 'CALCULADO' && (
        <button onClick={() => aprobar(row._id)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 cursor-pointer" title="Aprobar">
          <CheckCircle size={16} />
        </button>
      )}
      {canApprove && row.estado === 'APROBADO' && (
        <button onClick={() => setPagoModal(row)} className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-blue-50 cursor-pointer" title="Registrar pago">
          <Banknote size={16} />
        </button>
      )}
    </div>
  );

  const s = resumen?.calculado ? resumen : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planilla</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolida asistencia, horas extra, tardanzas, descansos médicos y vacaciones del período
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={periodo}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Período"
            className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {!planilla && periodo && <option value={periodo}>{nombrePeriodo(periodo)} · sin planilla</option>}
            {planillas.map((p) => (
              <option key={p.periodo} value={p.periodo}>{nombrePeriodo(p.periodo)} · {PLANILLA_LABEL[p.estado] || p.estado}</option>
            ))}
          </select>
          {canApprove && planilla?.estado === 'CALCULADA' && (
            <button onClick={aprobarPeriodo} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
              <CheckCircle size={18} />
              Aprobar período
            </button>
          )}
          {canApprove && ['APROBADA', 'CALCULADA'].includes(planilla?.estado) && (
            <button onClick={() => setPagoModal('PERIODO')} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer">
              <Banknote size={18} />
              Pagar período
            </button>
          )}
          {canWrite && (
            <button onClick={() => setCalcModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
              <Calculator size={18} />
              Calcular período
            </button>
          )}
        </div>
      </div>

      {sinLiquidar && (
        /**
         * El período se pagó antes de terminar y quedaron días trabajados fuera
         * de la liquidación. Recalcular está bloqueado con razón —la boleta ya
         * se entregó y se declaró—, así que estos días se pagan como reintegro.
         */
        <div className="px-5 py-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                {sinLiquidar.casos.length === 1
                  ? 'Un empleado tiene días trabajados sin liquidar'
                  : `${sinLiquidar.casos.length} empleados tienen días trabajados sin liquidar`}
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">{sinLiquidar.aviso}</p>

              <ul className="mt-2.5 space-y-1">
                {sinLiquidar.casos.slice(0, 8).map((c) => (
                  <li key={c.empleado} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-amber-900 truncate">
                      {c.nombre}
                      <span className="text-amber-600"> · {c.dias.join(', ')}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-amber-700 tabular-nums">
                      {c.horas} h{c.horasExtra ? ` + ${c.horasExtra} extra` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {sinLiquidar.casos.length > 8 && (
                <p className="text-xs text-amber-700 mt-1.5">y {sinLiquidar.casos.length - 8} más</p>
              )}
            </div>
          </div>
        </div>
      )}

      {s ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Neto a pagar" value={S(s.netoAPagar)} tone="green" hint={`${s.empleados} empleado(es)`} />
            <StatCard icon={TrendingDown} label="Descuentos" value={S(s.descuentos.total)} tone="red" hint={`Pensión ${S(s.descuentos.pension)}`} />
            <StatCard icon={Building2} label="Aporte del empleador" value={S(s.aportesEmpleador.total)} tone="blue" hint="EsSalud y SCTR, fuera del neto" />
            <StatCard icon={PiggyBank} label="Costo total empresa" value={S(s.costoEmpresa)} tone="primary" hint="Planilla más aportes y provisiones" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Clock} label="Horas extra" value={`${s.horasExtraTotales}h`} tone="violet" hint={S(s.ingresos.horasExtra)} />
            <StatCard icon={HeartPulse} label="Subsidio adelantado" value={S(s.alertas.montoSubsidioPorRecuperar)} tone="rose" hint={`${s.alertas.conSubsidioPorRecuperar} caso(s) por recuperar de EsSalud`} />
            <StatCard icon={AlertTriangle} label="Con descuento por tardanza" value={s.alertas.conDescuentoTardanza} tone="amber" hint={S(s.descuentos.tardanza)} />
            <StatCard
              icon={Gift}
              label={s.gratificacion.empleados ? 'Gratificación' : s.cts.empleados ? 'CTS' : 'Sin conceptos del período'}
              value={s.gratificacion.empleados ? S(s.gratificacion.total) : s.cts.empleados ? S(s.cts.total) : '—'}
              tone="cyan"
              hint={s.gratificacion.empleados ? 'Julio y diciembre, con 9% extraordinario'
                : s.cts.empleados ? 'Depósito de mayo y noviembre' : 'Ni gratificación ni CTS este mes'}
            />
          </div>

          {s.alertas.conSubsidioPorRecuperar > 0 && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
              <HeartPulse size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-900">
                  {S(s.alertas.montoSubsidioPorRecuperar)} adelantados por descanso médico
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  La empresa pagó estos días y debe recuperarlos de EsSalud mediante el canje de CITT.
                  Bienestar Social gestiona el reembolso.
                </p>
              </div>
            </div>
          )}
        </>
      ) : !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
          <Calculator size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">Período sin calcular</h3>
          <p className="text-sm text-slate-400">
            No hay boletas para {periodo ? nombrePeriodo(periodo) : 'este período'}. Use «Calcular período» para consolidar el mes.
          </p>
        </div>
      )}

      {planilla && (
        <p className="text-xs text-slate-500 -mb-3">
          Planilla de {nombrePeriodo(periodo)}: <span className="font-medium text-slate-700">{PLANILLA_LABEL[planilla.estado] || planilla.estado}</span>
          {planilla.estado === 'CALCULADA' && ' — la aprueba Recursos Humanos; después se registra el pago.'}
          {planilla.estado === 'APROBADA' && ' — aprobada; falta registrar el pago.'}
          {' '}Cada trabajador ve su boleta en «Mis boletas» cuando queda aprobada.
        </p>
      )}
      <DataTable columns={columns} {...boletas.tabla} actions={actions} emptyMessage={boletas.error || 'No hay boletas en este período'} />

      {/* ─── Boleta de pago ─── */}
      <Modal
        open={!!detail}
        onClose={() => { setDetail(null); setVistaBoleta('detalle'); }}
        title="Boleta de pago"
        wide
      >
        {detail && (
          <div className="space-y-5">
            {/* El desglose sirve para revisar el cálculo; el documento es lo que se entrega */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {[['detalle', 'Desglose'], ['documento', 'Documento oficial']].map(([id, texto]) => (
                <button
                  key={id}
                  onClick={() => setVistaBoleta(id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    vistaBoleta === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>

            {vistaBoleta === 'detalle'
              ? <BoletaDetalle boleta={detail} />
              : <BoletaFormal payrollId={detail._id} />}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {canWrite && ['BORRADOR', 'CALCULADO'].includes(detail.estado) && (
                <button onClick={() => recalcularUna(detail._id)} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                  <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Recalcular
                </button>
              )}
              {canApprove && detail.estado === 'CALCULADO' && (
                <button onClick={() => aprobar(detail._id)} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 cursor-pointer">
                  Aprobar boleta
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Cálculo del período ─── */}
      {canWrite && (
        <Modal open={calcModal} onClose={() => setCalcModal(false)} title="Calcular planilla del período">
          <form onSubmit={calcular} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Período</label>
              <input type="month" value={periodo} onChange={(e) => setPeriod(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </div>

            <label className="flex items-start gap-2.5 px-4 py-3 bg-slate-50 rounded-lg cursor-pointer">
              <input type="checkbox" checked={recalculate} onChange={(e) => setRecalculate(e.target.checked)} className="w-4 h-4 mt-0.5 cursor-pointer" />
              <span className="text-sm text-slate-700">
                Recalcular las boletas existentes
                <span className="block text-xs text-slate-500">
                  Las boletas ya aprobadas o pagadas nunca se modifican.
                </span>
              </span>
            </label>

            <div className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2.5 space-y-1">
              <p className="font-medium text-blue-900">Qué consolida el cálculo</p>
              <p>Días efectivamente remunerados, horas extra con recargo del 25% y 35%, descuento por tardanza sobre la tolerancia mensual, y el reparto del descanso médico entre empleador y EsSalud.</p>
              <p>Aplica el descuento previsional de cada afiliación y la retención de quinta categoría. EsSalud se registra como aporte del empleador, no como descuento.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCalcModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={calculating} className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {calculating ? 'Calculando...' : 'Calcular'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Registro del pago ─── */}
      <Modal
        open={!!pagoModal}
        onClose={() => setPagoModal(null)}
        title={pagoModal === 'PERIODO' ? `Pagar la planilla de ${nombrePeriodo(periodo)}` : 'Registrar el pago'}
      >
        {pagoModal && (
          <form onSubmit={registrarPago} className="space-y-4">
            {pagoModal === 'PERIODO' ? (
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  Se registrará el pago de <strong>todas las boletas aprobadas</strong> de {nombrePeriodo(periodo)}
                  {planilla?.estado === 'APROBADA' && <> por un neto de <strong>{S(planilla.totalNeto)}</strong></>}.
                  Cada trabajador recibe el aviso de que su boleta está disponible.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Las boletas calculadas sin aprobar quedan fuera.
                </p>
              </div>
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  {pagoModal.empleado?.nombres} {pagoModal.empleado?.apellidos} · {pagoModal.periodo}
                </p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{S(pagoModal.netoAPagar)}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Fecha de pago</label>
                <input
                  type="date" required
                  value={pago.paymentDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPago({ ...pago, paymentDate: e.target.value })}
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
                type="text"
                value={pago.referenciaPago}
                onChange={(e) => setPago({ ...pago, referenciaPago: e.target.value })}
                placeholder="N.º de operación o lote bancario"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <p className="text-xs text-slate-500 bg-blue-50 rounded-lg px-3 py-2.5">
              La fecha de pago es la que se declara en el PLAME y la que cuenta para el cómputo de
              intereses por pago tardío. Una vez registrada, la boleta ya no admite recálculo.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setPagoModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">
                {busy ? 'Registrando...' : 'Registrar pago'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
