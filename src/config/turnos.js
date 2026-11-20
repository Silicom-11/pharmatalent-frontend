/**
 * Nombre legible de un tipo de turno.
 *
 * MANANA, TARDE y NOCHE son claves (sin eñe, como las guarda la base); en
 * pantalla se lee «Mañana». Antes cada vista mostraba la clave tal cual.
 */
const NOMBRES = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche', JORNADA: 'Jornada' };

export const nombreTurno = (tipo) => NOMBRES[tipo] || tipo || '—';
