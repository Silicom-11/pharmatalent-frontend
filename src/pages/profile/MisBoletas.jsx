import { useState, useEffect } from 'react';
import { Receipt, Clock, TrendingUp, Wallet } from 'lucide-react';
import Modal from '../../components/Modal';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import BoletaDetalle, { S } from '../../components/BoletaDetalle';
import BoletaFormal from '../../components/BoletaFormal';
import api from '../../services/api';

const STATUS_MAP = { BORRADOR: 'gray', CALCULADO: 'yellow', APROBADO: 'blue', PAGADO: 'green' };
const STATUS_LABEL = {
  BORRADOR: 'En preparación', CALCULADO: 'Calculada',
  APROBADO: 'Aprobada', PAGADO: 'Pagada',
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

const nombrePeriodo = (p) => {
  const [y, m] = (p || '').split('-').map(Number);
  return m ? `${MESES[m - 1]} de ${y}` : p;
};

export default function MisBoletas() {
  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [vista, setVista] = useState('detalle');   // 'detalle' | 'documento'

  useEffect(() => {
    api.get('/me/payroll', { params: { limit: 24 } })
      .then((r) => setBoletas(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  // Sólo lo que el trabajador puede considerar firme
  const firmes = boletas.filter((b) => ['APROBADO', 'PAGADO'].includes(b.estado));
  const ultima = boletas[0];
  const horasExtraAcumuladas = boletas.reduce((a, b) => a + (b.ingresos?.horasExtra?.horas || 0), 0);
  const netoAcumulado = firmes.reduce((a, b) => a + (b.netoAPagar || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mis Boletas</h1>
        <p className="text-sm text-slate-500 mt-1">Historial de remuneraciones y descuentos</p>
      </div>

      {boletas.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Wallet} label="Último neto" value={S(ultima?.netoAPagar)} tone="green"
            hint={nombrePeriodo(ultima?.periodo)}
          />
          <StatCard icon={Receipt} label="Boletas" value={boletas.length} tone="primary" hint={`${firmes.length} aprobada(s)`} />
          <StatCard icon={Clock} label="Horas extra" value={`${Math.round(horasExtraAcumuladas * 10) / 10}h`} tone="violet" hint="Acumuladas en el historial" />
          <StatCard icon={TrendingUp} label="Neto acumulado" value={S(netoAcumulado)} tone="blue" hint="Sólo boletas aprobadas" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Historial</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Toque una boleta para ver su desglose completo
          </p>
        </div>

        {boletas.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Receipt size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              Aún no hay boletas emitidas a su nombre.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              El Analista de Planillas las genera al cierre de cada período.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {boletas.map((b) => (
              <button
                key={b._id}
                onClick={() => setDetail(b)}
                className="w-full text-left flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 first-letter:uppercase">{nombrePeriodo(b.periodo)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {b.dias?.remunerados ?? 30} días
                    {b.ingresos?.horasExtra?.horas > 0 && ` · ${b.ingresos.horasExtra.horas}h extra`}
                    {b.gratificacion?.aplica && ' · con gratificación'}
                    {b.cts?.aplica && ' · con CTS'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-emerald-600 tabular-nums">{S(b.netoAPagar)}</span>
                  <StatusBadge variant={STATUS_MAP[b.estado]}>{STATUS_LABEL[b.estado] || b.estado}</StatusBadge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!detail}
        onClose={() => { setDetail(null); setVista('detalle'); }}
        title={`Boleta de ${nombrePeriodo(detail?.periodo)}`}
        wide
      >
        {detail && (
          <>
            {['BORRADOR', 'CALCULADO'].includes(detail.estado) && (
              <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  Esta boleta aún no ha sido aprobada por Recursos Humanos. Los montos pueden variar.
                </p>
              </div>
            )}

            {/* El desglose explica el cálculo; el documento es lo que se entrega e imprime */}
            <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
              {[['detalle', 'Desglose'], ['documento', 'Documento oficial']].map(([id, texto]) => (
                <button
                  key={id}
                  onClick={() => setVista(id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    vista === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>

            {vista === 'detalle' ? (
              /* El empleado ve su remuneración, no lo que la empresa aporta por él */
              <BoletaDetalle boleta={detail} mostrarEmpleado={false} mostrarCostoEmpresa={false} />
            ) : (
              <BoletaFormal payrollId={detail._id} propia />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
