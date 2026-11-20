/**
 * Modo exposición: qué se muestra y en qué orden se recorre.
 *
 * Lo activa el backend (MODO_EXPOSICION=junin). El resto del sistema no se
 * borra: sus pantallas quedan fuera del menú y de las rutas mientras dure la
 * exposición. Para mostrar otro módulo, basta con añadirlo aquí.
 */

/**
 * Módulos de la matriz de permisos que se usan en la exposición. Puestos,
 * centros y zonas no tienen pantalla en el menú, pero el formulario de
 * empleados necesita sus catálogos para elegir cargo, local y zona.
 */
export const MODULOS_VISIBLES = ['dashboard', 'employees', 'schedules', 'attendance', 'vacations', 'payroll',
  'positions', 'locations', 'zones'];

/** El Administrador del Sistema no participa del recorrido: ve el sistema completo */
export const VE_TODO = (usuario) => usuario?.rol === 'ADMIN';

/** Pantallas que se ven (el resto redirige al panel) */
const RUTAS_VISIBLES = [
  '/', '/mi-perfil', '/mi-horario', '/mi-asistencia', '/mis-vacaciones', '/mis-boletas',
  '/employees', '/schedules', '/attendance', '/vacations', '/payroll',
];

export const rutaVisible = (ruta) =>
  RUTAS_VISIBLES.some((r) => (r === '/' ? ruta === '/' : ruta === r || ruta.startsWith(`${r}/`)));

/**
 * El recorrido: un colaborador de Inkafarma Huancayo Real marca, pide
 * vacaciones y cobra; cada rol hace sólo su parte. `cuenta: null` es el
 * terminal, que no usa sesión.
 */
export const PASOS = [
  {
    cuenta: 'admin.huancayo', ruta: '/schedules',
    titulo: 'La botica arma sus turnos con un QF en cada uno',
    texto: 'Abra el cronograma de la próxima semana (en borrador) y publíquelo. El sistema lo generó respetando la dotación del formato, los descansos y los topes de la ley, y sólo deja publicar si todos los turnos tienen Químico Farmacéutico (DIGEMID).',
  },
  {
    cuenta: null, ruta: '/terminal',
    titulo: 'El colaborador marca en el terminal del local',
    // Los DNI salen de los turnos y las marcas de este momento (backend)
    texto: (t) => [
      t?.entrada && `Digite el DNI ${t.entrada.dni} (${t.entrada.nombre}, turno ${t.entrada.turno}): queda su entrada.`,
      t?.salida && `Con ${t.salida.dni} (${t.salida.nombre}, ya entró) queda su salida.`,
      t?.rechazo && `Con ${t.rechazo.dni} (${t.rechazo.nombre}, sin turno hoy) el terminal la rechaza.`,
      'Nadie marca desde su celular ni por otro: el sistema decide si es entrada o salida.',
    ].filter(Boolean).join(' '),
    nota: 'Si el terminal pide configurarse: código IKF-733 y la clave de terminales-demo.csv. Se hace una sola vez en cada navegador.',
  },
  {
    cuenta: 'admin.huancayo', ruta: '/attendance',
    titulo: 'La marca llega en el acto a la asistencia del local',
    texto: 'La jefatura ve cada marca con su origen (terminal: huella, rostro o DNI), la hora y la tardanza si la hubo. Si el terminal no pudo tomar una marca, la registra a mano con un motivo, y queda señalada.',
  },
  {
    cuenta: 'tecnico.huancayo', ruta: '/mis-vacaciones',
    titulo: 'El colaborador pide sus vacaciones',
    texto: 'Ve su saldo según el D.L. 713 (30 días por año) y solicita 7 días o más. Al pedir, el sistema fija quién decide cada paso: primero su botica, después su zona.',
  },
  {
    cuenta: 'admin.huancayo', ruta: '/vacations',
    titulo: 'Paso 1 de la cadena: la botica avala',
    texto: 'El administrador ve sólo lo que le toca decidir. Avala la solicitud tras confirmar que su botica queda cubierta; si se quedara sin QF, el sistema se lo advierte.',
  },
  {
    cuenta: 'zona.huancayo', ruta: '/vacations',
    titulo: 'Paso 2 de la cadena: la zona autoriza',
    texto: 'La jefa de zona autoriza lo que la botica ya avaló. Observe la tarjeta de riesgo de triple remuneración: alguien de su zona tiene vacaciones vencidas sin gozar.',
  },
  {
    cuenta: 'tecnico.huancayo', ruta: '/mis-vacaciones',
    titulo: 'El colaborador recibe la respuesta',
    texto: 'La solicitud figura autorizada y el saldo ya la descuenta. La notificación de la campana le avisó en cada paso.',
  },
  {
    cuenta: 'gerente.rrhh', ruta: '/payroll',
    titulo: 'RRHH aprueba y paga la planilla del mes',
    texto: 'Setiembre está calculado con la asistencia, las horas extra, las tardanzas y las vacaciones. La gerente aprueba el período (su propia boleta queda fuera: nadie aprueba lo suyo) y registra el pago.',
  },
  {
    cuenta: 'tecnico.huancayo', ruta: '/mis-boletas',
    titulo: 'El colaborador ve su boleta',
    texto: 'La boleta de setiembre aparece recién cuando está aprobada: una boleta en cálculo todavía puede cambiar. Puede abrirla e imprimirla con el formato del D.S. 001-98-TR.',
  },
  {
    cuenta: 'gerente.rrhh', ruta: '/schedules',
    titulo: 'Cierre: sin QF no se publica',
    texto: 'Busque Inkafarma Concepción: su QF está de vacaciones y no hay reemplazo. Intente publicar su cronograma: el sistema lo bloquea, porque una botica no puede abrir sin Químico Farmacéutico.',
  },
];
