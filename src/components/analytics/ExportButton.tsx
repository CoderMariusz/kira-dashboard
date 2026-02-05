/**
 * ExportButton Component
 * Kira Dashboard - CSV export functionality for tasks
 */

'use client';

import { useState } from 'react';

interface TaskForExport {
  id: string;
  title: string;
  board_id: string;
  column: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  board?: string;
}

interface ExportButtonProps {
  tasks: TaskForExport[];
}

export function ExportButton({ tasks }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const escapeCSV = (value: string): string => {
    // If value contains quotes, commas, or newlines, wrap in quotes and escape quotes
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExport = async () => {
    if (!tasks || tasks.length === 0) {
      setMessage('No data to export');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsExporting(true);

    // Yield to allow React to re-render with loading state
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    try {
      // CSV headers
      const headers = ['ID', 'Title', 'Board', 'Column', 'Priority', 'Due Date', 'Created', 'Completed'];

      // CSV rows
      const rows = tasks.map(task => [
        task.id,
        task.title,
        task.board || '',
        task.column,
        task.priority,
        task.due_date || '',
        task.created_at,
        task.completed_at || '',
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `kira-dashboard-export-${dateStr}.csv`;
      link.click();

      URL.revokeObjectURL(url);

      setMessage('Export successful');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage('Export failed');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          data-testid="download-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
      {message && (
        <div className="mt-2 text-sm text-gray-600">
          {message}
        </div>
      )}
    </div>
  );
}
