import { useAuth } from '../../context/AuthContext';
import { scopeOf } from '../../config/roles';
import Dashboard from './Dashboard';
import DashboardZonal from './DashboardZonal';
import DashboardLocal from './DashboardLocal';
import DashboardCEDI from './DashboardCEDI';
import DashboardQF from './DashboardQF';
import DashboardPersonal from './DashboardPersonal';

/**
 * Cada nivel organizacional entra a un panel distinto:
 *  · NATIONAL → visión de cadena (dirección, RRHH, analistas, auditoría)
 *  · ZONE     → tablero de las boticas de su zona
 *  · LOCATION → tablero de su centro de trabajo (botica o CEDI, según el tipo)
 *  · SELF     → panel personal del empleado
 *
 * El Químico Farmacéutico Director Técnico tiene alcance de local, pero su
 * responsabilidad es sanitaria y no comercial: recibe un panel propio.
 */
export default function DashboardRouter() {
  const { usuario } = useAuth();
  const scope = scopeOf(usuario);

  // El CEDI no opera con formato comercial ni Director Técnico: su panel es propio
  if (['JEFE_CEDI', 'COORD_RUTAS'].includes(usuario?.rol)) return <DashboardCEDI />;
  if (usuario?.rol === 'QF') return <DashboardQF />;
  if (scope === 'ZONE') return <DashboardZonal />;
  if (scope === 'LOCATION') return <DashboardLocal />;
  if (scope === 'SELF') return <DashboardPersonal />;
  return <Dashboard />;
}
