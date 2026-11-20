import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmatalent_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // El código de un error inesperado se guarda para el reporte: quien lo
    // reporta no tiene que copiarlo a mano (Mantenimiento → Reportar)
    if (err.response?.status >= 500 && err.response?.data?.incidencia) {
      try { sessionStorage.setItem('pharmatalent_ultima_incidencia', err.response.data.incidencia); } catch { /* sin almacenamiento */ }
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('pharmatalent_token');
      localStorage.removeItem('pharmatalent_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
