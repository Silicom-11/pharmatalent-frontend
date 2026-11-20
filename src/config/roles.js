/**
 * Espejo del catálogo organizacional del backend (src/config/roles.js).
 *
 * La navegación y los permisos de la interfaz se resuelven a partir de
 * `usuario.metaRol.permissions`, que llega desde la API. Este archivo aporta
 * las etiquetas y el respaldo local cuando `metaRol` aún no está disponible.
 */

export const ORG_LEVELS = {
  CORPORATIVO: { etiqueta: 'Sede Corporativa', short: 'Corporativo', order: 1 },
  ZONAL: { etiqueta: 'Supervisión Zonal', short: 'Zonal', order: 2 },
  CEDI: { etiqueta: 'Centro de Distribución', short: 'CEDI', order: 3 },
  BOTICA: { etiqueta: 'Punto de Venta', short: 'Botica', order: 4 },
};

export const ROLES = {
  ADMIN:                 { etiqueta: 'Administrador del Sistema',      short: 'Admin',              nivelOrganizacional: 'CORPORATIVO', scope: 'NATIONAL' },
  GERENTE_RRHH:          { etiqueta: 'Gerente de Recursos Humanos',    short: 'Gerente RRHH',       nivelOrganizacional: 'CORPORATIVO', scope: 'NATIONAL' },
  ANALISTA_NOMINAS:      { etiqueta: 'Analista de Planillas',          short: 'Planillas',          nivelOrganizacional: 'CORPORATIVO', scope: 'NATIONAL' },
  ANALISTA_SELECCION:    { etiqueta: 'Analista de Selección',          short: 'Selección',          nivelOrganizacional: 'CORPORATIVO', scope: 'NATIONAL' },
  ANALISTA_CAPACITACION: { etiqueta: 'Analista de Capacitación',       short: 'Capacitación',       nivelOrganizacional: 'CORPORATIVO', scope: 'NATIONAL' },
  GESTOR_BIENESTAR:      { etiqueta: 'Gestor de Bienestar Social',     short: 'Bienestar',          nivelOrganizacional: 'CORPORATIVO', scope: 'NATIONAL' },
  JEFE_ZONA:             { etiqueta: 'Supervisor de Zona',             short: 'Supervisor Zonal',   nivelOrganizacional: 'ZONAL',       scope: 'ZONE' },
  AUDITOR_CALIDAD:       { etiqueta: 'Auditor de Calidad',             short: 'Auditor',            nivelOrganizacional: 'ZONAL',       scope: 'NATIONAL' },
  JEFE_CEDI:             { etiqueta: 'Jefe de Centro de Distribución', short: 'Jefe CEDI',          nivelOrganizacional: 'CEDI',        scope: 'LOCATION' },
  COORD_RUTAS:           { etiqueta: 'Coordinador de Rutas',           short: 'Coord. Rutas',       nivelOrganizacional: 'CEDI',        scope: 'LOCATION' },
  OPERARIO_CEDI:         { etiqueta: 'Operario de Almacén',            short: 'Operario CEDI',      nivelOrganizacional: 'CEDI',        scope: 'SELF' },
  ADMIN_BOTICA:          { etiqueta: 'Administrador de Botica',        short: 'Admin. Botica',      nivelOrganizacional: 'BOTICA',      scope: 'LOCATION' },
  JEFE_LOCAL:            { etiqueta: 'Administrador de Botica',        short: 'Admin. Botica',      nivelOrganizacional: 'BOTICA',      scope: 'LOCATION' },
  QF:                    { etiqueta: 'Químico Farmacéutico — Director Técnico', short: 'QF Director Técnico', nivelOrganizacional: 'BOTICA', scope: 'LOCATION' },
  QF_ASISTENTE:          { etiqueta: 'Químico Farmacéutico Asistente', short: 'QF Asistente',       nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  TECNICO:               { etiqueta: 'Técnico en Farmacia',            short: 'Técnico',            nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  TRAINEE:               { etiqueta: 'Técnico en Entrenamiento',       short: 'Trainee',            nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  CAJERO:                { etiqueta: 'Cajero / Cajera',                short: 'Cajero',             nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  DERMOCONSULTOR:        { etiqueta: 'Dermoconsultora',                short: 'Dermoconsultora',    nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  AUX_ALMACEN:           { etiqueta: 'Auxiliar de Almacén',            short: 'Aux. Almacén',       nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  PREVENCIONISTA:        { etiqueta: 'Prevencionista / Anfitrión',     short: 'Prevencionista',     nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
  MOTORIZADO:            { etiqueta: 'Motorizado (Delivery)',          short: 'Motorizado',         nivelOrganizacional: 'BOTICA',      scope: 'SELF' },
};

export const roleLabel = (codigo) => ROLES[codigo]?.etiqueta || codigo || '—';
export const roleShort = (codigo) => ROLES[codigo]?.short || ROLES[codigo]?.etiqueta || codigo || '—';
export const orgLevelOf = (codigo) => ROLES[codigo]?.nivelOrganizacional || 'BOTICA';
export const scopeOf = (usuario) => usuario?.metaRol?.scope || ROLES[usuario?.rol]?.scope || 'SELF';

/** ¿El usuario puede leer / escribir / aprobar en un módulo? */
// En modo exposición sólo se ven algunos módulos (config/exposicion.js). Se
// fija aquí y no en cada pantalla para que menú, rutas y enlaces obedezcan a
// la vez a la misma lista
let modulosLimitados = null;
export function limitarModulos(lista) {
  modulosLimitados = lista ? new Set(lista) : null;
}

export function can(usuario, module, action = 'read') {
  // El Administrador del Sistema queda fuera del límite: es la cuenta para lo
  // que se pida fuera del recorrido
  if (modulosLimitados && usuario?.rol !== 'ADMIN' && !modulosLimitados.has(module)) return false;
  const perms = usuario?.metaRol?.permissions;
  if (!perms) {
    // Respaldo mínimo mientras el perfil no se ha enriquecido
    return ['ADMIN', 'GERENTE_RRHH'].includes(usuario?.rol);
  }
  const p = perms[module];
  if (!p) return false;
  return p.includes({ read: 'R', write: 'W', approve: 'A' }[action]);
}

/** Roles que ven únicamente su propia información */
export const isPersonalScope = (usuario) => scopeOf(usuario) === 'SELF';

/** Roles que dirigen un centro de trabajo o una zona */
export const isSupervisor = (usuario) => ['LOCATION', 'ZONE', 'NATIONAL'].includes(scopeOf(usuario));

// ─── Identidad visual por cadena ─────────────────────────────────────────────
export const BRANDS = {
  INKAFARMA: {
    nombre: 'Inkafarma',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    chip: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-500',
    solid: 'bg-emerald-600',
    soft: 'bg-emerald-50 border-emerald-200',
    hex: '#059669',
  },
  MIFARMA: {
    nombre: 'Mifarma',
    dot: 'bg-fuchsia-400',
    text: 'text-fuchsia-400',
    chip: 'bg-fuchsia-100 text-fuchsia-700',
    ring: 'ring-fuchsia-500',
    solid: 'bg-fuchsia-600',
    soft: 'bg-fuchsia-50 border-fuchsia-200',
    hex: '#c026d3',
  },
  CORPORATIVO: {
    nombre: 'InRetail Pharma',
    dot: 'bg-slate-400',
    text: 'text-slate-300',
    chip: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-500',
    solid: 'bg-slate-700',
    soft: 'bg-slate-50 border-slate-200',
    hex: '#334155',
  },
};

export const brandOf = (codigo) => BRANDS[codigo] || null;
