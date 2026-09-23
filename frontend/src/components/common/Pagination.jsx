import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPrevPage
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        disabled={!hasPrevPage}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 text-sm font-semibold rounded-lg transition-all ${
            p === currentPage
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        disabled={!hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
