import { useState, useEffect } from 'react';
import { Printer, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';

const S = (n) =>
  n != null ? `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

/**
 * Boleta de pago con el contenido que exige el D.S. 001-98-TR (arts. 18 y 19).
 *
 * A diferencia del detalle de pantalla, que ayuda a entender el cálculo, esto
 * es el documento que se entrega e imprime: identificación del empleador y del
 * trabajador, días y horas del período, cada concepto por separado, y el neto
 * también en letras. Los estilos de impresión están pensados para una hoja A4.
 */

function Bloque({ titulo, lineas, tono = 'slate' }) {
  if (!lineas?.length) return null;
  const color = { slate: 'text-slate-700', red: 'text-red-600', blue: 'text-blue-700', amber: 'text-amber-700' }[tono];
  const total = lineas.reduce((a, l) => a + l.monto, 0);

  return (
    <div className="mb-4">
      <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5 pb-1 border-b border-slate-200">
        {titulo}
      </h4>
      {lineas.map((l) => (
        <div key={l.concepto} className="flex items-baseline justify-between gap-4 py-[3px]">
          <span className="min-w-0 text-[13px] text-slate-600">
            {l.concepto}
            {l.nota && <span className="block text-[10px] text-slate-400 leading-tight">{l.nota}</span>}
          </span>
          <span className={`shrink-0 text-[13px] tabular-nums ${color}`}>{S(l.monto)}</span>
        </div>
      ))}
      {lineas.length > 1 && (
        <div className="flex items-baseline justify-between gap-4 pt-1.5 mt-1 border-t border-slate-200">
          <span className="text-[12px] font-semibold text-slate-700">Total</span>
          <span className={`text-[13px] font-bold tabular-nums ${color}`}>{S(total)}</span>
        </div>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{etiqueta}</dt>
      <dd className="text-[13px] text-slate-700">{valor}</dd>
    </div>
  );
}

export default function BoletaFormal({ payrollId, propia = false }) {
  const [boleta, setBoleta] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!payrollId) return;
    setLoading(true);
    setError('');
    const ruta = propia ? `/me/payroll/${payrollId}/boleta` : `/payroll/${payrollId}/boleta`;
    api.get(ruta)
      .then((r) => setBoleta(r.data))
      .catch((e) => setError(e.response?.data?.error || 'No se pudo cargar la boleta'))
      .finally(() => setLoading(false));
  }, [payrollId, propia]);

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Cargando la boleta...</p>;

  if (error) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{error}</p>
      </div>
    );
  }
  if (!boleta) return null;

  const { empleador, trabajador, periodo, totales, estado } = boleta;

  return (
    <div className="boleta-formal">
      {/* Sólo en pantalla: al imprimir estorba */}
      <div className="flex justify-end mb-3 no-imprimir">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <Printer size={15} /> Imprimir
        </button>
      </div>

      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
        {/* ─── Encabezado ─── */}
        <div className="px-5 py-3.5 border-b-2 border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-slate-800 leading-tight">{empleador.razonSocial}</p>
              <p className="text-[11px] text-slate-500">RUC {empleador.ruc}</p>
              <p className="text-[11px] text-slate-500">{empleador.domicilio}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="flex items-center gap-1.5 justify-end text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <FileText size={13} /> Boleta de pago
              </p>
              <p className="text-sm font-semibold text-slate-800 capitalize">{periodo.nombre}</p>
            </div>
          </div>
        </div>

        {/* ─── Trabajador ─── */}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">Trabajador</dt>
            <dd className="text-[13px] font-semibold text-slate-800">{trabajador.nombre}</dd>
          </div>
          <Dato etiqueta="DNI" valor={trabajador.dni} />
          <Dato etiqueta="Fecha de ingreso" valor={trabajador.fechaIngreso} />
          <Dato etiqueta="Cargo" valor={trabajador.cargo} />
          <Dato etiqueta="Centro de trabajo" valor={trabajador.centroDeTrabajo} />
          <Dato etiqueta="Régimen pensionario" valor={trabajador.sistemaPensionario} />
          <Dato etiqueta="Abono" valor={trabajador.cuentaAbono} />
        </dl>

        {/* ─── Días y horas ─── */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-5 py-2.5 border-b border-slate-200 text-[11px] text-slate-500">
          <span>Días del mes: <strong className="text-slate-700">{periodo.diasCalendario ?? '—'}</strong></span>
          <span>Días remunerados: <strong className="text-slate-700">{periodo.diasRemunerados ?? '—'}</strong></span>
          {periodo.diasNoLaborados > 0 && (
            <span>No laborados: <strong className="text-slate-700">{periodo.diasNoLaborados}</strong></span>
          )}
          {periodo.diasVacaciones > 0 && (
            <span>Vacaciones: <strong className="text-slate-700">{periodo.diasVacaciones}</strong></span>
          )}
          {periodo.diasDescansoMedico > 0 && (
            <span>Descanso médico: <strong className="text-slate-700">{periodo.diasDescansoMedico}</strong></span>
          )}
          {periodo.horasExtra > 0 && (
            <span>Horas extra: <strong className="text-slate-700">{periodo.horasExtra}</strong></span>
          )}
        </div>

        {/* ─── Conceptos ─── */}
        <div className="grid md:grid-cols-2 gap-x-8 px-5 py-4">
          <Bloque titulo="Ingresos" lineas={boleta.ingresos} />
          <Bloque titulo="Descuentos" lineas={boleta.descuentos} tono="red" />
        </div>

        {/* ─── Neto ─── */}
        <div className="px-5 py-3.5 bg-slate-800 text-white">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] font-bold tracking-wider uppercase">Neto a pagar</span>
            <span className="text-xl font-bold tabular-nums">{S(totales.neto)}</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">{totales.netoEnLetras}</p>
        </div>

        {/* ─── Lo que no entra en el neto ─── */}
        {(boleta.aportesEmpleador?.length > 0 || boleta.conceptosAparte?.length > 0) && (
          <div className="grid md:grid-cols-2 gap-x-8 px-5 py-4 border-t border-slate-200 bg-slate-50/60">
            <Bloque titulo="Aportes del empleador" lineas={boleta.aportesEmpleador} tono="blue" />
            <Bloque titulo="Se paga por separado" lineas={boleta.conceptosAparte} tono="amber" />
          </div>
        )}

        {boleta.observacion && (
          <p className="px-5 py-2.5 border-t border-slate-200 text-[12px] text-slate-600">
            <span className="font-semibold">Observación: </span>{boleta.observacion}
          </p>
        )}

        {/* ─── Pie y firmas ─── */}
        <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap items-end justify-between gap-6">
          <div className="text-[11px] text-slate-500">
            <p>
              {estado.situacion}
              {estado.pagadaEl && ` el ${estado.pagadaEl}`}
              {estado.medioDePago && ` · ${estado.medioDePago.replace('_', ' ').toLowerCase()}`}
              {estado.referencia && ` · ref. ${estado.referencia}`}
            </p>
            <p className="mt-0.5 max-w-md">{boleta.constancia}</p>
          </div>
          <div className="text-center shrink-0">
            <div className="w-52 border-b border-slate-400 mb-1" />
            <p className="text-[10px] text-slate-500">Firma del trabajador</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .boleta-formal, .boleta-formal * { visibility: visible; }
          .boleta-formal {
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 0; margin: 0;
          }
          .no-imprimir { display: none !important; }
          .boleta-formal .bg-slate-800 {
            background: #1e293b !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
