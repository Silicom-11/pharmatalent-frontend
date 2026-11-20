import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  loading,
  searchValue,
  onSearch,
  actions,
  pagination,
  onPageChange,
  title,
  headerAction,
  emptyMessage = 'No se encontraron registros',
}) {
  const totalPages = pagination?.totalPages ?? pagination?.pages ?? 1;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {(title || headerAction || onSearch) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
          {title && <h2 className="text-lg font-semibold text-slate-800">{title}</h2>}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onSearch && (
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchValue || ''}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-64 bg-white"
                />
              </div>
            )}
            {headerAction}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                  {col.etiqueta}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">Cargando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">{emptyMessage}</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={row._id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">{actions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* La API devuelve `pages`; aquí se leía `totalPages`, que nunca llegaba,
          y ninguna lista mostraba más allá de su primera página */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
          <span className="text-sm text-slate-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Página anterior"
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs text-slate-500 tabular-nums px-1">{pagination.page} / {totalPages}</span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              aria-label="Página siguiente"
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
