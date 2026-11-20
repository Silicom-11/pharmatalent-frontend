import { useState, useEffect, useRef } from 'react';
import { CheckCheck, Inbox } from 'lucide-react';
import api from '../services/api';

const TYPE_STYLES = {
  REQUERIMIENTO: 'bg-violet-100 text-violet-700',
  RECLUTAMIENTO: 'bg-violet-100 text-violet-700',
  AUDITORIA: 'bg-cyan-100 text-cyan-700',
  BIENESTAR: 'bg-rose-100 text-rose-700',
  CONTRATO: 'bg-amber-100 text-amber-700',
  VACACION: 'bg-teal-100 text-teal-700',
  TURNO: 'bg-blue-100 text-blue-700',
  QF_COBERTURA: 'bg-red-100 text-red-700',
  CAPACITACION: 'bg-indigo-100 text-indigo-700',
  NOMINA: 'bg-emerald-100 text-emerald-700',
  SISTEMA: 'bg-slate-100 text-slate-600',
};

const PRIORITY_BAR = {
  URGENTE: 'bg-red-500',
  ALTA: 'bg-amber-500',
  MEDIA: 'bg-slate-300',
  BAJA: 'bg-slate-200',
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dd = Math.floor(h / 24);
  return dd === 1 ? 'ayer' : `hace ${dd} días`;
}

export default function NotificationPanel({ onClose, onRead }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    api.get('/notifications', { params: { limit: 15 } })
      .then((r) => setItems(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cierra al hacer clic fuera del panel
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, leido: true } : n)));
      onRead?.();
    } catch { /* silencioso */ }
  };

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, leido: true })));
      onRead?.();
    } catch { /* silencioso */ }
  };

  const unread = items.filter((n) => !n.leido).length;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-[22rem] max-h-[28rem] bg-white rounded-xl shadow-xl border border-slate-200 z-50 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Notificaciones</h3>
          <p className="text-xs text-slate-400">{unread > 0 ? `${unread} sin leer` : 'Todo al día'}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer">
            <CheckCheck size={14} />
            Marcar todas
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Cargando...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Inbox size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No tiene notificaciones</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n._id}
              onClick={() => !n.leido && markRead(n._id)}
              className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                n.leido ? 'opacity-60' : ''
              }`}
            >
              <div className={`w-1 rounded-full shrink-0 ${PRIORITY_BAR[n.prioridad] || 'bg-slate-200'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TYPE_STYLES[n.tipo] || TYPE_STYLES.SISTEMA}`}>
                    {n.tipo}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0">{relativeTime(n.creadoEn)}</span>
                  {!n.leido && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-sm font-medium text-slate-700 leading-snug">{n.titulo}</p>
                <p className="text-xs text-slate-500 leading-snug mt-0.5">{n.mensaje}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
