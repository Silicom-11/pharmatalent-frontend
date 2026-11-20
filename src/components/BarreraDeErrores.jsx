import { Component } from 'react';
import { AlertOctagon, RotateCcw, Home, LifeBuoy } from 'lucide-react';

/**
 * Barrera de errores.
 *
 * Sin esto, cualquier fallo de render deja la pantalla **en blanco**: sin
 * mensaje, sin menú, sin forma de volver. La persona no sabe si se cayó el
 * sistema, si perdió la sesión o si hizo algo mal, y lo único que puede contar
 * a soporte es «no funciona».
 *
 * Aquí el fallo se detiene, se le da un código y se ofrece una salida. El
 * detalle técnico queda plegado: quien lo necesite lo abre, y a quien no le
 * sirve no le estorba.
 */
export default class BarreraDeErrores extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, codigo: null, detalleVisible: false };
  }

  static getDerivedStateFromError(error) {
    // Un código corto y pronunciable por teléfono
    const codigo = Math.random().toString(36).slice(2, 8).toUpperCase();
    return { error, codigo };
  }

  componentDidCatch(error, info) {
    // Queda en la consola del navegador con el mismo código que ve la persona
    console.error(`[${this.state.codigo}]`, error, info?.componentStack);
  }

  render() {
    const { error, codigo, detalleVisible } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertOctagon size={22} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Esta pantalla no se pudo mostrar</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                El resto del sistema sigue funcionando. Sus datos no se han perdido.
              </p>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
            <p className="text-xs text-slate-500">Código de incidencia</p>
            <code className="text-sm font-mono font-semibold text-slate-800 select-all">{codigo}</code>
            <p className="text-xs text-slate-500 mt-1">
              Indíquelo si necesita reportarlo: identifica exactamente este fallo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer"
            >
              <RotateCcw size={16} /> Reintentar
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 no-underline"
            >
              <Home size={16} /> Volver al panel
            </a>
            {/* Abre el reporte de soporte con el código ya escrito (mantenimiento correctivo) */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('pharmatalent:reportar', {
                detail: {
                  tipo: 'CORRECTIVO', incidencia: codigo, prioridad: 'ALTA',
                  titulo: 'Una pantalla no se pudo mostrar',
                  descripcion: `La pantalla ${window.location.pathname} mostró «Esta pantalla no se pudo mostrar». Detalle: ${String(error.message).slice(0, 300)}`,
                },
              }))}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <LifeBuoy size={16} /> Reportar el problema
            </button>
          </div>

          <button
            onClick={() => this.setState({ detalleVisible: !detalleVisible })}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {detalleVisible ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
          </button>

          {detalleVisible && (
            <pre className="mt-2 px-3 py-2.5 bg-slate-900 text-red-300 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
              {error.message}
              {error.stack ? `\n\n${error.stack.split('\n').slice(1, 6).join('\n')}` : ''}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
