import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function MiAsistencia() {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/me/attendance', { params: { page, limit: 15 } });
      setItems(r.data.data || []);
      setPagination(r.data.pagination || {});
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const emp = usuario?.empleado || {};
  const totalHours = items.reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0);
  const onTimeCount = items.filter((a) => a.estado === 'PRESENTE').length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Asistencia</h1>
        <p className="text-sm text-slate-500 mt-1">Historial de marcaciones y horas trabajadas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3"><ClipboardCheck size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">{items.length}</p>
          <p className="text-sm text-slate-500">Registros en página</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3"><TrendingUp size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">{items.length > 0 ? Math.round((onTimeCount / items.length) * 100) : 0}%</p>
          <p className="text-sm text-slate-500">Puntualidad</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3"><Clock size={20} /></div>
          <p className="text-2xl font-bold text-slate-800">{totalHours.toFixed(1)}h</p>
          <p className="text-sm text-slate-500">Horas en página</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Local</th>
                <th className="px-5 py-3">Entrada</th>
                <th className="px-5 py-3">Salida</th>
                <th className="px-5 py-3">Horas</th>
                <th className="px-5 py-3">Tardanza</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : items.length > 0 ? items.map((a) => (
                <tr key={a._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700 font-medium">{a.fecha?.slice(0, 10)}</td>
                  <td className="px-5 py-3 text-slate-500">{a.local?.nombre || '—'}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {a.marcaEntrada ? new Date(a.marcaEntrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {a.marcaSalida ? new Date(a.marcaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-medium">{a.horasTrabajadas ? `${a.horasTrabajadas.toFixed(1)}h` : '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{a.minutosTardanza ? `${a.minutosTardanza} min` : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      a.estado === 'PRESENTE' ? 'bg-emerald-100 text-emerald-700' :
                      a.estado === 'TARDANZA' ? 'bg-amber-100 text-amber-700' :
                      a.estado === 'AUSENTE' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{a.estado}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No hay registros de asistencia</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-400">Página {page} de {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-default cursor-pointer">Anterior</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-default cursor-pointer">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
