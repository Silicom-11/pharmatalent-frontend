import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import RutaProtegida from './components/RutaProtegida';
import BarreraDeErrores from './components/BarreraDeErrores';
import Login from './pages/auth/Login';
import RecuperarContrasena from './pages/auth/RecuperarContrasena';
import DashboardRouter from './pages/dashboard/DashboardRouter';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import PositionList from './pages/positions/PositionList';
import LocationList from './pages/locations/LocationList';
import ZoneList from './pages/zones/ZoneList';
import ScheduleList from './pages/schedules/ScheduleList';
import AttendanceList from './pages/attendance/AttendanceList';
import VacationList from './pages/vacations/VacationList';
import ContractList from './pages/contracts/ContractList';
import EvaluationList from './pages/evaluations/EvaluationList';
import PayrollList from './pages/payroll/PayrollList';
import TrainingList from './pages/training/TrainingList';
import MiPerfil from './pages/profile/MiPerfil';
import MiHorario from './pages/profile/MiHorario';
import MiAsistencia from './pages/profile/MiAsistencia';
import MisVacaciones from './pages/profile/MisVacaciones';
import MiContrato from './pages/profile/MiContrato';
import MisBoletas from './pages/profile/MisBoletas';
import RequisitionList from './pages/requisitions/RequisitionList';
import RecruitmentPipeline from './pages/recruitment/RecruitmentPipeline';
import WelfareList from './pages/welfare/WelfareList';
import AuditList from './pages/audits/AuditList';
import OrgChart from './pages/org/OrgChart';
import UserList from './pages/users/UserList';
import Bitacora from './pages/bitacora/Bitacora';
import SettlementList from './pages/settlements/SettlementList';
import MisEvaluaciones from './pages/profile/MisEvaluaciones';
import Terminal from './pages/terminal/Terminal';
import Mantenimiento from './pages/mantenimiento/Mantenimiento';

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Cargando PharmaTalent...</p>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<RecuperarContrasena />} />
      {/* Fuera de la sesión: el terminal se identifica con la clave del equipo */}
      <Route path="/terminal" element={<Terminal />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/employees" element={<RutaProtegida modulo="employees" accion="read"><EmployeeList /></RutaProtegida>} />
        <Route path="/employees/:id" element={<RutaProtegida modulo="employees" accion="read"><EmployeeDetail /></RutaProtegida>} />
        <Route path="/positions" element={<RutaProtegida modulo="positions" accion="write"><PositionList /></RutaProtegida>} />
        <Route path="/locations" element={<RutaProtegida modulo="locations" accion="read"><LocationList /></RutaProtegida>} />
        <Route path="/zones" element={<RutaProtegida modulo="zones" accion="read"><ZoneList /></RutaProtegida>} />
        <Route path="/schedules" element={<RutaProtegida modulo="schedules" accion="write"><ScheduleList /></RutaProtegida>} />
        <Route path="/attendance" element={<RutaProtegida modulo="attendance" accion="write"><AttendanceList /></RutaProtegida>} />
        <Route path="/vacations" element={<RutaProtegida modulo="vacations" accion="write"><VacationList /></RutaProtegida>} />
        <Route path="/contracts" element={<RutaProtegida modulo="contracts" accion="read"><ContractList /></RutaProtegida>} />
        <Route path="/liquidaciones" element={<RutaProtegida modulo="contracts" accion="read"><SettlementList /></RutaProtegida>} />
        <Route path="/evaluations" element={<RutaProtegida modulo="evaluations" accion="read"><EvaluationList /></RutaProtegida>} />
        <Route path="/payroll" element={<RutaProtegida modulo="payroll" accion="read"><PayrollList /></RutaProtegida>} />
        <Route path="/training" element={<RutaProtegida modulo="training" accion="read"><TrainingList /></RutaProtegida>} />
        <Route path="/mi-perfil" element={<MiPerfil />} />
        <Route path="/mi-horario" element={<RutaProtegida modulo="schedules" accion="read"><MiHorario /></RutaProtegida>} />
        <Route path="/mi-asistencia" element={<MiAsistencia />} />
        <Route path="/mis-vacaciones" element={<MisVacaciones />} />
        <Route path="/mi-contrato" element={<MiContrato />} />
        <Route path="/mis-boletas" element={<MisBoletas />} />
        <Route path="/requisitions" element={<RutaProtegida modulo="requisitions" accion="read"><RequisitionList /></RutaProtegida>} />
        <Route path="/recruitment" element={<RutaProtegida modulo="recruitment" accion="read"><RecruitmentPipeline /></RutaProtegida>} />
        <Route path="/welfare" element={<RutaProtegida modulo="welfare" accion="read"><WelfareList /></RutaProtegida>} />
        <Route path="/audits" element={<RutaProtegida modulo="audits" accion="read"><AuditList /></RutaProtegida>} />
        <Route path="/org" element={<RutaProtegida modulo="org" accion="read"><OrgChart /></RutaProtegida>} />
        <Route path="/users" element={<RutaProtegida modulo="users" accion="read"><UserList /></RutaProtegida>} />
        <Route path="/bitacora" element={<RutaProtegida modulo="bitacora" accion="read"><Bitacora /></RutaProtegida>} />
        <Route path="/mantenimiento" element={<RutaProtegida modulo="mantenimiento" accion="read"><Mantenimiento /></RutaProtegida>} />
        <Route path="/mis-evaluaciones" element={<MisEvaluaciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* La exterior cubre el fallo del propio Layout o del contexto de sesión */}
      <BarreraDeErrores>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
      </AuthProvider>
      </BarreraDeErrores>
    </BrowserRouter>
  );
}
