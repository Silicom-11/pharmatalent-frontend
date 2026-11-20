import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { limitarModulos } from '../config/roles';
import { MODULOS_VISIBLES } from '../config/exposicion';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmatalent_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('pharmatalent_user');
      localStorage.removeItem('pharmatalent_token');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  // Modo exposición: lo decide el backend; mientras no responda, el sistema completo
  const [exposicion, setExposicion] = useState({ activo: false, cuentas: [] });

  useEffect(() => {
    api.get('/exposicion')
      .then((r) => {
        // Sólo el recorrido corto (junin) oculta módulos; el modo completo muestra todo
        limitarModulos(r.data?.activo && r.data.modo === 'junin' ? MODULOS_VISIBLES : null);
        setExposicion(r.data?.activo ? r.data : { activo: false, cuentas: [] });
      })
      .catch(() => {});
  }, []);

  const fetchAndEnrichProfile = async (baseUser) => {
    try {
      const r = await api.get('/me/profile');
      const p = r.data;
      const emp = p.empleado || {};
      const enriched = {
        debeCambiarContrasena: baseUser.debeCambiarContrasena,
        ...baseUser,
        metaRol: p.metaRol || baseUser.metaRol || null,
        empleado: {
          ...baseUser.empleado,
          nombres: emp.nombres || baseUser.empleado?.nombres,
          apellidos: emp.apellidos || baseUser.empleado?.apellidos,
          dni: emp.dni || baseUser.empleado?.dni,
          telefono: emp.telefono || baseUser.empleado?.telefono,
          correo: emp.correo || baseUser.empleado?.correo,
          tipoProfesional: emp.tipoProfesional || baseUser.empleado?.tipoProfesional,
          fechaIngreso: emp.fechaIngreso || baseUser.empleado?.fechaIngreso,
          estado: emp.estado || baseUser.empleado?.estado,
          sueldoBasico: emp.sueldoBasico || baseUser.empleado?.sueldoBasico,
          numeroCQF: emp.numeroCQF || baseUser.empleado?.numeroCQF,
          cargoActual: typeof emp.cargoActual === 'object'
            ? { _id: emp.cargoActual._id, nombre: emp.cargoActual.nombre, codigo: emp.cargoActual.codigo }
            : baseUser.empleado?.cargoActual,
          localActual: typeof emp.localActual === 'object'
            ? { _id: emp.localActual._id, nombre: emp.localActual.nombre, marca: emp.localActual.marca, codigo: emp.localActual.codigo }
            : baseUser.empleado?.localActual,
          locationBrand: typeof emp.localActual === 'object' ? emp.localActual.marca : undefined,
          locationName: typeof emp.localActual === 'object' ? emp.localActual.nombre : undefined,
          zoneName: typeof emp.zona === 'object' ? emp.zona.nombre : undefined,
        },
        profile: {
          contrato: p.contrato ? { tipo: p.contrato.tipo, fechaInicio: p.contrato.fechaInicio, fechaFin: p.contrato.fechaFin, estado: p.contrato.estado } : null,
          vacationBalance: p.vacationBalance || null,
          licenseStatus: p.licenseStatus || null,
        },
      };
      setUser(enriched);
      localStorage.setItem('pharmatalent_user', JSON.stringify(enriched));
    } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem('pharmatalent_token');
    if (token) {
      api.get('/auth/me')
        .then(async (res) => {
          const userData = {
            id: res.data._id, correo: res.data.correo, rol: res.data.rol,
            metaRol: res.data.metaRol || null, empleado: res.data.empleado,
          };
          setUser(userData);
          localStorage.setItem('pharmatalent_user', JSON.stringify(userData));
          await fetchAndEnrichProfile(userData);
        })
        .catch(() => {
          localStorage.removeItem('pharmatalent_token');
          localStorage.removeItem('pharmatalent_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (correo, contrasena) => {
    const res = await api.post('/auth/login', { correo, contrasena });
    const { token, usuario: userData } = res.data;
    localStorage.setItem('pharmatalent_token', token);
    localStorage.setItem('pharmatalent_user', JSON.stringify(userData));
    setUser(userData);
    fetchAndEnrichProfile(userData);
    return userData;
  };

  /** Modo exposición: cambiar de rol sin escribir la contraseña */
  const ingresarComo = async (cuenta) => {
    let pin = '';
    try { pin = sessionStorage.getItem('pharmatalent_exposicion_pin') || ''; } catch { /* sin almacenamiento */ }
    const res = await api.post('/exposicion/ingresar', pin ? { cuenta, pin } : { cuenta });
    const { token, usuario: userData } = res.data;
    localStorage.setItem('pharmatalent_token', token);
    localStorage.setItem('pharmatalent_user', JSON.stringify(userData));
    setUser(userData);
    await fetchAndEnrichProfile(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('pharmatalent_token');
    localStorage.removeItem('pharmatalent_user');
    setUser(null);
  };

  const hasRole = (...roles) => usuario && roles.includes(usuario.rol);

  /** Levanta el bloqueo una vez definida la contraseña propia */
  const marcarContrasenaCambiada = () => {
    setUser((prev) => {
      if (!prev) return prev;
      const actualizado = { ...prev, debeCambiarContrasena: false };
      localStorage.setItem('pharmatalent_user', JSON.stringify(actualizado));
      return actualizado;
    });
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, hasRole, marcarContrasenaCambiada, exposicion, ingresarComo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
