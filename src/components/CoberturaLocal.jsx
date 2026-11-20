import { Users, ShieldAlert, AlertTriangle, CheckCircle2, Repeat } from 'lucide-react';

/**
 * Dotación de un centro de trabajo durante una ventana de ausencia.
 *
 * Muestra puesto por puesto cuánta gente queda frente a lo que exige el formato,
 * qué se resuelve por polivalencia y qué queda descubierto. El puesto del
 * solicitante se resalta, pero la decisión se toma mirando el local completo:
 * una ausencia puede romper la cobertura de un puesto distinto al propio.
 */
export default function CoberturaLocal({ impact, compact = false }) {
  if (!impact) return null;

  if (!impact.evaluatesRoster) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-slate-500">
          {impact.local} no opera con dotación por formato ({impact.locationType}); no se evalúa cobertura de turnos.
        </p>
      </div>
    );
  }

  const alerta = impact.blocking || impact.uncovered;
  const soloPrevio = !alerta && impact.hasPreexistingLegalGap;

  const tone = impact.blocking ? 'bg-red-50 border-red-200'
    : impact.uncovered ? 'bg-amber-50 border-amber-200'
      : soloPrevio ? 'bg-slate-50 border-slate-300'
        : 'bg-emerald-50 border-emerald-200';
  const Icon = impact.blocking ? ShieldAlert : alerta || soloPrevio ? AlertTriangle : CheckCircle2;
  const iconTone = impact.blocking ? 'text-red-600'
    : impact.uncovered ? 'text-amber-600'
      : soloPrevio ? 'text-slate-500' : 'text-emerald-600';

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={iconTone} />
        <p className="text-sm font-semibold text-slate-800">
          Dotación de {impact.local} durante el período
        </p>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {impact.formato}
        </span>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        {impact.allowsSubstitution
          ? 'Este formato admite polivalencia entre puestos.'
          : 'En este formato cada puesto necesita titular propio.'}
      </p>

      <div className="space-y-1">
        {impact.roster.map((r) => {
          const causado = (impact.causedGaps || []).some((g) => g.rol === r.rol);
          return (
          <div
            key={r.rol}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${
              r.brecha > 0 ? (causado ? 'bg-white/80 ring-1 ring-red-200' : 'bg-white/60 ring-1 ring-slate-200')
                : r.isRequesterRole ? 'bg-white/70' : ''
            }`}
          >
            <span className={`min-w-0 flex-1 truncate ${r.isRequesterRole ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
              {r.etiqueta}
              {r.legal && (
                <span className="ml-1.5 px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold align-middle">
                  DIGEMID
                </span>
              )}
              {r.isRequesterRole && (
                <span className="ml-1.5 text-[10px] text-slate-400">(su cargo)</span>
              )}
            </span>

            {r.sustituidos > 0 && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                <Repeat size={9} />
                {r.coveredBy?.map((c) => c.etiqueta).join(', ')}
              </span>
            )}

            {/* Titulares propios más los prestados por polivalencia */}
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${
              r.brecha > 0 ? (causado ? 'text-red-600' : 'text-slate-500') : 'text-emerald-600'
            }`}>
              {r.available}
              {r.sustituidos > 0 && <span className="text-violet-600">+{r.sustituidos}</span>}
              /{r.requerido}
            </span>

            {r.brecha > 0 && (
              <span className={`shrink-0 text-[10px] font-bold ${causado ? 'text-red-600' : 'text-slate-500'}`}>
                falta {r.brecha}{!causado && ' (previo)'}
              </span>
            )}
          </div>
          );
        })}
      </div>

      {impact.blocking && (
        <p className="text-xs text-red-800 font-medium mt-3 pt-3 border-t border-red-200">
          Esta ausencia deja al local sin Químico Farmacéutico. No puede operar sin Director Técnico
          presente: debe designarse cobertura de otro local antes de autorizar.
        </p>
      )}

      {!impact.blocking && impact.hasPreexistingLegalGap && (
        <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">
          El local ya arrastra un descubierto de{' '}
          {impact.preexistingGaps.filter((g) => g.legal).map((g) => g.etiqueta).join(', ')}
          {' '}por otras ausencias del período. Esta solicitud no lo agrava.
        </p>
      )}

      {!compact && impact.peers?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Colegas de {impact.roleLabel}
          </p>
          <div className="flex flex-wrap gap-1">
            {impact.peers.map((p) => (
              <span
                key={p._id}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  p.absent
                    ? 'bg-red-100 text-red-600 line-through'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
                title={p.absent ? 'También ausente en el período' : 'Disponible'}
              >
                {p.nombre}{p.esPracticante ? ' (trainee)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {!compact && impact.peers?.length === 0 && (
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-current/10 flex items-center gap-1.5">
          <Users size={13} />
          No hay otro empleado con el cargo de {impact.roleLabel} en este local.
        </p>
      )}
    </div>
  );
}
