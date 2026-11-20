import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { can, roleLabel } from '../config/roles';

/**
 * Guarda de ruta.
 *
 * La barra lateral oculta lo que el rol no puede usar, pero eso no basta:
 * cualquiera puede escribir la dirección a mano. Esta guarda aplica la misma
 * matriz de permisos que el servidor, de modo que quien no tiene acceso ve una
 * negativa explícita en lugar de una pantalla vacía que parece un error.
 */
export default function RutaProtegida({ modulo, accion = 'read', children }) {
  const { usuario } = useAuth();

  if (!modulo || can(usuario, modulo, accion)) return children;

  return (
    <div className="max-w-lg mx-auto mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <ShieldOff size={26} className="text-slate-400" />
      </div>
      <h1 className="text-lg font-bold text-slate-800">Sin acceso a este módulo</h1>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        El rol <strong className="text-slate-700">{roleLabel(usuario?.rol)}</strong> no tiene
        {accion === 'write' ? ' permiso para modificar' : accion === 'approve' ? ' permiso para aprobar en' : ' acceso a'}
        {' '}esta sección. Si necesita usarla, solicítelo a Recursos Humanos.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 no-underline"
      >
        <ArrowLeft size={15} /> Volver a mi panel
      </Link>
    </div>
  );
}
