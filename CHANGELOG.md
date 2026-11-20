# Registro de cambios — PharmaTalent

Cada cambio posterior a la puesta en marcha es un mantenimiento con su código
(`MNT-AAAA-NNN`) y su tipo, según la fase de mantenimiento (GP 08). El detalle
de cada uno —análisis, solución, pruebas y archivos— está en el sistema:
**Administración → Mantenimiento**. Plan y proceso: [docs/MANTENIMIENTO.md](docs/MANTENIMIENTO.md).

Versionado: `mayor.menor.parche`. Un parche corrige; una versión menor agrega
funciones o se adapta a un cambio externo sin romper lo existente.

## 1.1.1 — 20/11/2026 · Publicación en repositorios

### Preventivo
- **MNT-2026-024** · Preparación para repositorios públicos en GitHub: la contraseña común de las
  cuentas de demostración sale del código y se lee de `CLAVE_DEMO` en `.env`; la pista de
  credenciales de la pantalla de ingreso sólo aparece en desarrollo. Integración continua con
  GitHub Actions (pruebas unitarias, de integración con MongoDB 8, análisis estático, compilación
  y auditoría de dependencias) y README de cada repositorio.

## 1.1.0 — 13/11/2026 · Fase de mantenimiento

### Adaptativo
- **MNT-2026-014** · RMV de S/ 1,230 desde el 01/10/2026 (D.S. 015-2026-TR) y UIT 2026 de S/ 5,500
  (D.S. 301-2025-EF). Los parámetros legales pasan a tener vigencia por fecha: cada planilla,
  boleta y liquidación usa la RMV y la UIT de su período. Regla de sueldo mínimo en empleados,
  contratos y contratación. Ajuste de 9 sueldos, 12 contratos y 2 puestos; octubre recalculado.

### Correctivo
- **MNT-2026-012** · La salida sólo se marca en la botica donde se marcó la entrada.
- **MNT-2026-013** · El reinicio de datos ya no marca de antemano al técnico del guion.
- **MNT-2026-018** · El ajuste a la RMV alcanza también los contratos ya renovados (lo encontró la prueba CP-05).
- **MNT-2026-021** · Las marcas simuladas se registran con la fecha en que ocurrieron (lo encontró la rutina preventiva).

### Perfectivo
- **MNT-2026-015** · «Reportar» un problema o sugerir una mejora desde cualquier pantalla, con
  «Mis reportes»; módulo **Mantenimiento** con el proceso de cada tipo, monitoreo y plan preventivo.

### Preventivo
- **MNT-2026-016** · Registro de errores del servidor con código de incidencia, caducidad de 90 días.
- **MNT-2026-017** · Dependencias actualizadas: 0 vulnerabilidades en producción (antes 8 en el
  backend, 1 crítica, y 3 altas en el frontend).
- **MNT-2026-019** · Prueba de carga con 100 usuarios (RNF1 cumple) y bandeja de descansos optimizada.
- Rutina `npm run preventivo` (MNT-2026-020, MNT-2026-023) y regresión `npm run pruebas` (MNT-2026-022).

### Pruebas
- 242 unitarias (caja negra, blanca y gris), 26 de integración incremental, 22 casos funcionales
  de caja negra, prueba de carga y auditoría de permisos de 22 cuentas × 58 endpoints: 290/290.

## 1.0.2 — 05–06/11/2026

- **MNT-2026-006** (correctivo) · Se puede registrar un descanso médico.
- **MNT-2026-007** (correctivo) · Se puede registrar una visita DIGEMID con hallazgos.
- **MNT-2026-008** (correctivo) · «Generar cronograma» acepta la fecha de inicio de semana.
- **MNT-2026-009** (adaptativo) · App Android (Capacitor) con el mismo backend.
- **MNT-2026-010** (adaptativo) · Acceso desde otra red por túnel seguro, con PIN.
- **MNT-2026-011** (perfectivo) · Exposición del sistema completo: 21 roles con un clic.

## 1.0.1 — 22–23/10/2026

- **MNT-2026-001** (correctivo) · La fecha de ingreso no puede ser futura.
- **MNT-2026-002** (correctivo) · El formulario «Nuevo empleado» carga puesto, centro y zona.
- **MNT-2026-003** (correctivo) · El riesgo de triple pago toma el período vacacional más antiguo.
- **MNT-2026-004** (correctivo) · La restauración de copias de seguridad restaura.
- **MNT-2026-005** (perfectivo) · Recorrido guiado y «Ver como» para exponer.

## 1.0.0 — 02/10/2026 · Implementación

Primera versión completa (Fases 1 a 4): 12 requisitos funcionales, 21 roles, 224 pruebas.
