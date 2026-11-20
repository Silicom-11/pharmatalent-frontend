import { useState, useEffect } from 'react';
import { User, MapPin, Briefcase, Calendar, Phone, Mail, Shield, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../config/roles';
import api from '../../services/api';

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
        <Icon size={16} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function MiPerfil() {
  const { usuario } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/me/profile')
      .then((r) => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando perfil...</div>;

  const emp = profile?.empleado || usuario?.empleado || {};
  const pos = profile?.cargo || emp.cargoActual || {};
  const loc = profile?.local || emp.localActual || {};
  const zona = profile?.zona || {};
  const contrato = profile?.contrato || {};
  const vacBal = profile?.vacationBalance || {};

  const nombreCompleto = `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || usuario?.correo;
  const initials = emp.nombres
    ? `${emp.nombres[0]}${(emp.apellidos || '')[0] || ''}`.toUpperCase()
    : 'U';

  const license = profile?.licenseStatus;
  const LICENSE_CHIP = {
    VIGENTE: 'bg-emerald-100 text-emerald-700', POR_VENCER: 'bg-amber-100 text-amber-700',
    VENCIDA: 'bg-red-100 text-red-700', SIN_DATO: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-sm text-slate-500 mt-1">Información personal y laboral</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{nombreCompleto}</h2>
            <p className="text-sm text-slate-500">{roleLabel(usuario?.rol)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                emp.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {emp.estado || 'ACTIVO'}
              </span>
              {emp.tipoProfesional && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                  {emp.tipoProfesional}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Datos Personales</h3>
            <Field icon={User} label="DNI" value={emp.dni} />
            <Field icon={Mail} label="Correo" value={emp.correo || usuario?.correo} />
            <Field icon={Phone} label="Teléfono" value={emp.telefono} />
            <Field icon={Calendar} label="Fecha de Ingreso" value={emp.fechaIngreso?.slice(0, 10)} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Datos Laborales</h3>
            <Field icon={Briefcase} label="Cargo" value={typeof pos === 'string' ? pos : pos?.nombre || '—'} />
            <Field icon={MapPin} label="Local" value={typeof loc === 'string' ? loc : loc?.nombre || '—'} />
            <Field icon={MapPin} label="Zona" value={zona?.nombre || '—'} />
            {license && (
              <div className="flex items-start gap-3 py-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <Shield size={16} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Colegiatura CQF</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-slate-700 font-medium">{license.numero}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${LICENSE_CHIP[license.estado]}`}>
                      {license.estado.replace('_', ' ')}
                    </span>
                  </div>
                  {license.expiry && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vence {license.expiry.slice(0, 10)}
                      {license.daysToExpiry != null && license.daysToExpiry > 0 && ` · ${license.daysToExpiry} días`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-slate-400" />
            Contrato Actual
          </h3>
          {contrato.tipo ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className="font-medium text-slate-700">{contrato.tipo}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Inicio</span><span className="text-slate-700">{contrato.fechaInicio?.slice(0, 10)}</span></div>
              {contrato.fechaFin && <div className="flex justify-between"><span className="text-slate-500">Fin</span><span className="text-slate-700">{contrato.fechaFin.slice(0, 10)}</span></div>}
              <div className="flex justify-between">
                <span className="text-slate-500">Estado</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  contrato.estado === 'VIGENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>{contrato.estado}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin contrato registrado</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            Balance de Vacaciones
          </h3>
          {vacBal.diasAcumulados != null ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Antigüedad</span><span className="font-medium text-slate-700">{vacBal.anosDeServicio} años</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Días acumulados</span><span className="text-slate-700">{vacBal.diasAcumulados}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Días usados</span><span className="text-slate-700">{vacBal.diasGozados}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-700 font-semibold">Disponibles</span>
                <span className="text-lg font-bold text-emerald-600">{vacBal.diasDisponibles}</span>
              </div>
              {vacBal.riesgoTriplePago && (
                <div className="mt-2 px-3 py-2 bg-red-50 rounded-lg text-xs text-red-600 font-medium">
                  Riesgo de triple remuneración por vacaciones no gozadas
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin datos de vacaciones</p>
          )}
        </div>
      </div>
    </div>
  );
}
