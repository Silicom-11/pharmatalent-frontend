import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Info } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

const STATUS_MAP = {
  VIGENTE: 'green', POR_VENCER: 'yellow', VENCIDO: 'red',
  RENOVADO: 'blue', TERMINADO: 'gray',
};
const TYPE_LABEL = {
  PLAZO_FIJO: 'Plazo fijo', INDETERMINADO: 'Indeterminado',
  PRACTICAS: 'Convenio de prácticas', PART_TIME: 'Tiempo parcial',
};

const money = (n) => (n != null ? `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—');

export default function MiContrato() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/me/contracts')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;

  const contracts = data?.contracts || [];
  const current = data?.current;
  const days = data?.daysToExpiry;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Contrato</h1>
        <p className="text-sm text-slate-500 mt-1">Situación contractual e historial</p>
      </div>

      {data?.alert && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{data.alert}</p>
        </div>
      )}

      {current ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5 pb-5 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contrato vigente</p>
              <h2 className="text-xl font-bold text-slate-800 mt-0.5">{TYPE_LABEL[current.tipo] || current.tipo}</h2>
              <p className="text-sm text-slate-500 mt-1">{current.cargo?.nombre || 'Puesto no especificado'}</p>
            </div>
            <div className="text-right">
              <StatusBadge variant={STATUS_MAP[current.estado]}>{current.estado}</StatusBadge>
              {days != null && (
                <p className={`text-xs mt-1.5 ${days <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                  {days >= 0 ? `Vence en ${days} días` : `Venció hace ${Math.abs(days)} días`}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Inicio</p>
              <p className="font-medium text-slate-700">{current.fechaInicio?.slice(0, 10)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Término</p>
              <p className="font-medium text-slate-700">
                {current.fechaFin?.slice(0, 10) || 'Sin plazo definido'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Remuneración</p>
              <p className="font-medium text-slate-700">{money(current.sueldo)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Renovaciones</p>
              <p className="font-medium text-slate-700">{current.historialRenovaciones?.length || 0}</p>
            </div>
          </div>

          {current.historialRenovaciones?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Renovaciones</p>
              <div className="space-y-1.5">
                {current.historialRenovaciones.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">
                      {r.fechaFinAnterior?.slice(0, 10)} → {r.nuevaFechaFin?.slice(0, 10)}
                    </span>
                    <span className="text-xs text-slate-400">{r.renovadoEn?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">Sin contrato registrado</h3>
          <p className="text-sm text-slate-400">Recursos Humanos aún no ha registrado su contrato.</p>
        </div>
      )}

      {contracts.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Historial contractual</h2>
            <p className="text-xs text-slate-500 mt-0.5">{contracts.length} contrato(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Cargo</th>
                  <th className="px-5 py-3">Período</th>
                  <th className="px-5 py-3">Remuneración</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contracts.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">{TYPE_LABEL[c.tipo] || c.tipo}</td>
                    <td className="px-5 py-3 text-slate-500">{c.cargo?.nombre || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {c.fechaInicio?.slice(0, 10)} → {c.fechaFin?.slice(0, 10) || 'indefinido'}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{money(c.sueldo)}</td>
                    <td className="px-5 py-3"><StatusBadge variant={STATUS_MAP[c.estado]}>{c.estado}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-0.5">¿Quién gestiona los contratos?</p>
          <p>
            La elaboración, renovación y término de contratos corresponde a <strong>{data?.managedBy}</strong>.
            El sistema avisa a Recursos Humanos treinta días antes de cada vencimiento; usted recibe la
            notificación cuando la renovación queda registrada.
          </p>
        </div>
      </div>
    </div>
  );
}
