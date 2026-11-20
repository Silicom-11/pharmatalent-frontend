import { useState, useEffect } from 'react';
import { Network, Building2, Users, MapPin, Truck, Store } from 'lucide-react';
import StatCard from '../../components/StatCard';
import api from '../../services/api';

const LEVEL_ICON = {
  CORPORATIVO: Building2, ZONAL: MapPin, CEDI: Truck, BOTICA: Store,
};
const LEVEL_TONE = {
  CORPORATIVO: { bar: 'bg-indigo-500', soft: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-700' },
  ZONAL: { bar: 'bg-blue-500', soft: 'bg-blue-50 border-blue-200', text: 'text-blue-700', chip: 'bg-blue-100 text-blue-700' },
  CEDI: { bar: 'bg-orange-500', soft: 'bg-orange-50 border-orange-200', text: 'text-orange-700', chip: 'bg-orange-100 text-orange-700' },
  BOTICA: { bar: 'bg-emerald-500', soft: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-700' },
};
const TYPE_LABEL = {
  QF: 'Químicos Farmacéuticos', TECNICO: 'Técnicos en Farmacia', OPERARIO: 'Personal operativo',
  ADMINISTRATIVO: 'Administrativos', JEFE_LOCAL: 'Administradores de Botica',
  JEFE_ZONA: 'Supervisores de Zona', GERENCIA: 'Gerencia',
};

export default function OrgChart() {
  const [chart, setChart] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('estructura');

  useEffect(() => {
    Promise.allSettled([api.get('/org/chart'), api.get('/org/catalog')])
      .then(([c, k]) => {
        if (c.status === 'fulfilled') setChart(c.value.data);
        if (k.status === 'fulfilled') setCatalog(k.value.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando organigrama...</div>;
  if (!chart) return <div className="text-slate-400">No fue posible cargar el organigrama.</div>;

  const total = chart.totalHeadcount || 1;
  const boticas = chart.locationTypes?.filter((t) => t._id.tipo === 'BOTICA') || [];
  const inkafarma = boticas.find((b) => b._id.marca === 'INKAFARMA')?.count || 0;
  const mifarma = boticas.find((b) => b._id.marca === 'MIFARMA')?.count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Organigrama</h1>
        <p className="text-sm text-slate-500 mt-1">
          Estructura de InRetail Pharma: sede corporativa, supervisión zonal, centro de distribución y red de boticas
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Dotación total" value={chart.totalHeadcount} tone="primary" hint="Empleados activos" />
        <StatCard icon={Store} label="Inkafarma" value={inkafarma} tone="green" hint="Boticas de la cadena" />
        <StatCard icon={Store} label="Mifarma" value={mifarma} tone="fuchsia" hint="Boticas de la cadena" />
        <StatCard icon={MapPin} label="Zonas" value={chart.zones?.length} tone="blue" hint="Ámbitos de supervisión" />
      </div>

      <div className="flex gap-2">
        {[['estructura', 'Estructura'], ['zonas', 'Zonas'], ['roles', 'Catálogo de roles']].map(([k, etiqueta]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === k ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {tab === 'estructura' && (
        <div className="space-y-4">
          {chart.levels.map((lvl) => {
            const Icon = LEVEL_ICON[lvl.codigo] || Network;
            const tone = LEVEL_TONE[lvl.codigo] || LEVEL_TONE.BOTICA;
            const pct = Math.round((lvl.headcount / total) * 100);
            return (
              <div key={lvl.codigo} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`h-1 ${tone.bar}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone.soft} border`}>
                        <Icon size={20} className={tone.text} />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-800">{lvl.etiqueta}</h2>
                        <p className="text-xs text-slate-500">{lvl.positions.length} puestos distintos</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-slate-800">{lvl.headcount}</p>
                      <p className="text-xs text-slate-400">{pct}% de la dotación</p>
                    </div>
                  </div>

                  {lvl.positions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {lvl.positions.map((p) => (
                        <div key={p._id || p.codigo} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="min-w-0">
                            <p className="text-sm text-slate-700 truncate" title={p.nombre}>{p.nombre || 'Sin puesto asignado'}</p>
                            {p.departamento && <p className="text-[10px] text-slate-400 uppercase tracking-wide">{p.departamento}</p>}
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${tone.chip}`}>{p.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Sin dotación registrada en este nivel.</p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Composición por tipo profesional</h2>
            <div className="space-y-3">
              {chart.byType
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((t) => {
                  const pct = Math.round((t.count / total) * 100);
                  return (
                    <div key={t._id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{TYPE_LABEL[t._id] || t._id}</span>
                        <span className="font-medium text-slate-700">{t.count} <span className="text-slate-400 text-xs">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {tab === 'zonas' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Zona', 'Código', 'Centros de trabajo', 'Dotación', 'Promedio por centro'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.zones.map((z) => (
                <tr key={z._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{z.nombre}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-slate-500">{z.codigo}</span></td>
                  <td className="px-4 py-3 text-slate-600">{z.locations}</td>
                  <td className="px-4 py-3"><span className="font-semibold text-slate-800">{z.headcount}</span></td>
                  <td className="px-4 py-3 text-slate-500">
                    {z.locations ? (z.headcount / z.locations).toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && catalog && (
        <div className="space-y-4">
          {Object.values(catalog.orgLevels)
            .sort((a, b) => a.order - b.order)
            .map((lvl) => {
              const roles = catalog.roles.filter((r) => r.nivelOrganizacional === lvl.codigo);
              const tone = LEVEL_TONE[lvl.codigo] || LEVEL_TONE.BOTICA;
              return (
                <div key={lvl.codigo} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className={`h-1 ${tone.bar}`} />
                  <div className="p-5">
                    <h2 className="font-bold text-slate-800 mb-3">{lvl.etiqueta}</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {roles.map((r) => (
                        <div key={r.codigo} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-800">{r.etiqueta}</p>
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${tone.chip}`}>
                              {{ NATIONAL: 'Nacional', ZONE: 'Zona', LOCATION: 'Local', SELF: 'Personal' }[r.scope]}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-snug">{r.descripcion}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(r.permissions).filter(([, v]) => v.includes('A')).map(([m]) => (
                              <span key={m} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500">
                                aprueba {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
