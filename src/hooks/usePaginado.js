import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

/**
 * Carga paginada de una lista de la API.
 *
 * Cada pantalla pedía su lista una sola vez, sin `page`, y la API respondía
 * la primera página: veinte marcas de asistencia de seis mil, veinte
 * capacitaciones de dos mil. Este hook pide la página que se está viendo,
 * vuelve a la primera cuando cambian los filtros y descarta las respuestas
 * que llegan tarde (un filtro cambiado dos veces seguidas no debe pintar el
 * resultado del primero encima del segundo).
 *
 *   const lista = usePaginado('/training', { tipo, estado });
 *   <DataTable columns={...} {...lista.tabla} />
 *
 * @param {string}  url       ruta de la API
 * @param {object}  params    filtros; los vacíos no se envían
 * @param {object}  opciones  { limit, activo }: `activo: false` no carga
 */
export default function usePaginado(url, params = {}, { limit = 25, activo = true } = {}) {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState({ data: [], pagination: null, loading: activo, error: null });
  const ultima = useRef(0);

  // Los filtros vacíos no viajan: `?estado=` filtraría por cadena vacía
  const limpios = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );
  const clave = JSON.stringify(limpios);

  // Otro filtro, otra lista: se vuelve a la primera página
  // (patrón de React para ajustar estado cuando cambia una entrada)
  const [claveVista, setClaveVista] = useState(clave);
  if (claveVista !== clave) {
    setClaveVista(clave);
    setPage(1);
  }

  const recargar = useCallback(async () => {
    if (!activo) return;
    const id = ++ultima.current;
    setEstado((e) => ({ ...e, loading: true, error: null }));
    try {
      const r = await api.get(url, { params: { ...JSON.parse(clave), page, limit } });
      if (id !== ultima.current) return;
      const data = Array.isArray(r.data) ? r.data : r.data.data || [];
      setEstado({ data, pagination: r.data.pagination || null, loading: false, error: null });
    } catch (err) {
      if (id !== ultima.current) return;
      setEstado({ data: [], pagination: null, loading: false, error: err.response?.data?.error || 'No se pudo cargar la lista' });
    }
  }, [url, clave, page, limit, activo]);

  useEffect(() => { recargar(); }, [recargar]);

  return {
    ...estado,
    page,
    setPage,
    recargar,
    // Lo que DataTable necesita, listo para esparcir
    tabla: {
      data: estado.data,
      loading: estado.loading,
      pagination: estado.pagination ? { ...estado.pagination, page } : null,
      onPageChange: setPage,
    },
  };
}
