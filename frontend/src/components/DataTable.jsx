import React from 'react';
import EmptyState from './EmptyState';

/**
 * Reusable data table component with responsive mobile card layout.
 *
 * Columns accept two formats:
 *   { header, accessor }          — accessor is a string key OR (row) => ReactNode
 *   { label, key, render? }       — legacy format
 *
 * Both are normalised internally so either convention works.
 */
function normaliseColumn(col) {
  const header = col.header || col.label || '';

  // accessor can be a string or a function
  if (typeof col.accessor === 'function') {
    return { header, getValue: col.accessor };
  }
  if (typeof col.accessor === 'string') {
    return { header, getValue: (row) => row[col.accessor] };
  }
  // legacy format with key / render
  if (col.key) {
    const render = col.render;
    return { header, getValue: (row) => render ? render(row[col.key], row) : row[col.key] };
  }
  return { header, getValue: () => null };
}

export default function DataTable({ columns, data, onRowClick, emptyMessage = 'No items found', emptyIcon }) {
  const normCols = columns.map(normaliseColumn);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700/50 bg-gray-900/50">
        <EmptyState message={emptyMessage} icon={emptyIcon} />
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-900/50">
        <table className="w-full text-left">
          <thead className="bg-gray-800/50 text-xs tracking-wider text-gray-400 uppercase border-b border-gray-700/50">
            <tr>
              {normCols.map((col, idx) => (
                <th key={idx} className="px-5 py-3 font-medium whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-gray-300">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {normCols.map((col, colIndex) => (
                  <td key={colIndex} className="px-5 py-4">
                    {col.getValue(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {data.map((row, rowIndex) => (
          <div
            key={row.id ?? rowIndex}
            onClick={() => onRowClick && onRowClick(row)}
            className={`rounded-lg border border-gray-700/50 bg-gray-900 p-4 ${
              onRowClick ? 'cursor-pointer hover:bg-gray-800/50' : ''
            }`}
          >
            {normCols.map((col, colIndex) => (
              <div key={colIndex} className="mb-2 last:mb-0 flex items-center justify-between gap-4">
                <span className="text-xs uppercase text-gray-500 shrink-0">{col.header}</span>
                <span className="text-sm text-gray-200 text-right">
                  {col.getValue(row)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
