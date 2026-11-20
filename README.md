# PharmaTalent · Interfaz web (frontend)

Interfaz del sistema de gestión de recursos humanos **PharmaTalent** para InRetail Pharma S.A.
(Inkafarma y Mifarma): panel por rol, turnos con validación QF, asistencia, terminal de marcación
(`/terminal`), vacaciones, planilla y boletas, contratos, evaluaciones, capacitación, bienestar,
selección, auditoría, autoservicio del colaborador y mantenimiento del sistema.

Proyecto del curso **Herramientas de Desarrollo** — Universidad Tecnológica del Perú, 2026.
Equipo: Marc Andreessen Aquino Carhuas y Maciel Daniela Cataño Mendoza.
Docente: Mg. Ing. José Fernando Matos Vera.

La API está en el repositorio
[pharmatalent-backend](https://github.com/Silicom-11/pharmatalent-backend).

## Tecnología

React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 · Axios · Lucide · React Hot Toast ·
Oxlint (análisis estático) · GitHub Actions (integración continua).

## Puesta en marcha

Requisitos: Node.js 22 y la API en marcha en `http://localhost:5000`.

```bash
npm install
npm run dev       # http://localhost:3000 (las llamadas a /api se envían a la API)
npm run lint      # análisis estático
npm run build     # compila en dist/; la API sirve esa carpeta en producción (un solo origen)
```

## Estructura

```
src/
  pages/         una carpeta por módulo (turnos, asistencia, vacaciones, planilla, mantenimiento…)
  components/    piezas comunes: Layout, DataTable, Modal, ReportarProblema, BarreraDeErrores
  context/       sesión y permisos del usuario
  hooks/         paginación y utilidades
  services/      cliente de la API
  config/        menú, módulos y modo exposición
```

## Ramas y versiones

- `main`: versión estable con su etiqueta (`v1.1.0`, `v1.1.1`…).
- `develop`: integración de los cambios.
- `feature/*`: un cambio por rama, fusionado en `develop` con `--no-ff`.

## Licencia

Software propietario. Ver [LICENSE](LICENSE).
