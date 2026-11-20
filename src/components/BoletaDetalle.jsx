import StatusBadge from './StatusBadge';

const STATUS_MAP = { BORRADOR: 'gray', CALCULADO: 'yellow', APROBADO: 'blue', PAGADO: 'green' };

export const S = (n) =>
  n != null ? `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

/** Fila de un concepto dentro de la boleta */
export function Linea({ label, hint, monto, negativo, fuerte }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${fuerte ? 'border-t border-slate-200 mt-1.5 pt-2' : ''}`}>
      <span className={`min-w-0 ${fuerte ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
        {label}
        {hint && <span className="block text-[11px] text-slate-400 leading-tight">{hint}</span>}
      </span>
      <span className={`shrink-0 tabular-nums ${fuerte ? 'font-bold text-slate-800' : negativo ? 'text-red-600' : 'text-slate-700'}`}>
        {negativo ? '−' : ''}{S(monto)}
      </span>
    </div>
  );
}

/**
 * Desglose de una boleta de pago.
 *
 * `mostrarEmpleado` distingue las dos lecturas: quien administra la planilla ve
 * de quién es la boleta y cuánto le cuesta a la empresa; el propio empleado
 * ve su remuneración y qué se le descuenta.
 */
export default function BoletaDetalle({ boleta, mostrarEmpleado = true, mostrarCostoEmpresa = true }) {
  if (!boleta) return null;
  const d = boleta;

  return (
    <div className="space-y-5">
      {mostrarEmpleado && (
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">
              {d.empleado?.nombres} {d.empleado?.apellidos}
            </h3>
            <p className="text-sm text-slate-500">DNI {d.empleado?.dni} · Período {d.periodo}</p>
            {d.descuentos?.pension?.etiqueta && (
              <p className="text-xs text-slate-400 mt-0.5">{d.descuentos.pension.etiqueta}</p>
            )}
          </div>
          <StatusBadge variant={STATUS_MAP[d.estado]}>{d.estado}</StatusBadge>
        </div>
      )}

      {d.dias && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ['Remunerados', d.dias.remunerados, 'text-slate-800'],
            ['Faltas', d.dias.faltas, d.dias.faltas ? 'text-red-600' : 'text-slate-400'],
            ['Vacaciones', d.dias.vacaciones, d.dias.vacaciones ? 'text-teal-600' : 'text-slate-400'],
            ['Descanso médico', (d.dias.descansoMedicoEmpleador || 0) + (d.dias.descansoMedicoSubsidiado || 0), 'text-rose-600'],
          ].map(([etiqueta, valor, tono]) => (
            <div key={etiqueta} className="bg-slate-50 rounded-lg py-2">
              <p className={`text-lg font-bold ${valor ? tono : 'text-slate-400'}`}>{valor ?? 0}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{etiqueta}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1.5">Ingresos</p>
          <Linea label="Remuneración básica" hint={`${d.dias?.remunerados ?? 30} días`} monto={d.ingresos?.basico} />
          {d.ingresos?.asignacionFamiliar > 0 && (
            <Linea label="Asignación familiar" hint="10% de la RMV — Ley 25129" monto={d.ingresos.asignacionFamiliar} />
          )}
          {d.ingresos?.horasExtra?.horas > 0 && (
            <Linea
              label="Horas extra"
              hint={`${d.ingresos.horasExtra.horasAl25}h al 25% · ${d.ingresos.horasExtra.horasAl35}h al 35%`}
              monto={d.ingresos.horasExtra.monto}
            />
          )}
          {d.ingresos?.subsidioEsSalud > 0 && (
            <Linea
              label="Subsidio por incapacidad"
              hint={`${d.dias?.descansoMedicoSubsidiado} días a cargo de EsSalud`}
              monto={d.ingresos.subsidioEsSalud}
            />
          )}
          <Linea label="Total ingresos" monto={d.ingresos?.total} fuerte />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-1.5">Descuentos</p>
          {d.descuentos?.pension && (
            <Linea
              label={d.descuentos.pension.sistema?.replace('_', ' ')}
              hint={d.descuentos.pension.comision
                ? `Aporte ${S(d.descuentos.pension.aporte)} · comisión ${S(d.descuentos.pension.comision)} · prima ${S(d.descuentos.pension.primaSeguro)}`
                : 'Aporte al Sistema Nacional de Pensiones'}
              monto={d.descuentos.pension.total}
              negativo
            />
          )}
          <Linea
            label="Renta de quinta categoría"
            hint={d.descuentos?.rentaQuinta?.baseImponible
              ? `Base imponible anual ${S(d.descuentos.rentaQuinta.baseImponible)}`
              : 'No alcanza el mínimo imponible (7 UIT)'}
            monto={d.descuentos?.rentaQuinta?.monto}
            negativo
          />
          {d.descuentos?.tardanza?.monto > 0 && (
            <Linea
              label="Tardanza"
              hint={`${d.descuentos.tardanza.minutos} min acumulados, ${d.descuentos.tardanza.minutosDescontados} descontables`}
              monto={d.descuentos.tardanza.monto}
              negativo
            />
          )}
          <Linea label="Total descuentos" monto={d.descuentos?.total} fuerte />
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <span className="text-base font-bold text-slate-800">Neto a pagar</span>
        <span className="text-2xl font-bold text-emerald-700 tabular-nums">{S(d.netoAPagar)}</span>
      </div>

      {(d.gratificacion?.aplica || d.cts?.aplica) && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800 mb-2">Concepto del período</p>
          {d.gratificacion?.aplica && (
            <>
              <Linea label="Gratificación" hint="Una remuneración — Ley 27735" monto={d.gratificacion.monto} />
              <Linea label="Bonificación extraordinaria" hint="9% que el empleador habría aportado a EsSalud" monto={d.gratificacion.bonificacionExtraordinaria} />
              <Linea label="Total gratificación" monto={d.gratificacion.total} fuerte />
            </>
          )}
          {d.cts?.aplica && (
            <Linea label="Depósito CTS" hint={`Base ${S(d.cts.base)} — incluye el sexto de gratificación`} monto={d.cts.monto} fuerte />
          )}
        </div>
      )}

      {mostrarCostoEmpresa && d.aportesEmpleador && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Aportes del empleador</p>
          <p className="text-[11px] text-slate-500 mb-2">
            No se descuentan al trabajador: los paga la empresa por encima de la remuneración.
          </p>
          <Linea label="EsSalud" hint="9% sobre la remuneración afecta" monto={d.aportesEmpleador.esSalud} />
          {d.aportesEmpleador.sctr > 0 && (
            <Linea label="SCTR" hint="Seguro complementario — puesto de riesgo" monto={d.aportesEmpleador.sctr} />
          )}
          <Linea label="Costo total para la empresa" monto={d.costoEmpresa} fuerte />
        </div>
      )}
    </div>
  );
}
