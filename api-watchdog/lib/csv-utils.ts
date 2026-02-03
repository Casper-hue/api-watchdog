/**
 * Utility functions for CSV export
 */

export function exportToCsv(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const csvContent = [
    columns.join(','), // header row
    ...rows.map(row => 
      columns.map(column => {
        const cell = row[column] ?? '';
        // Escape commas and quotes in cell content
        return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}