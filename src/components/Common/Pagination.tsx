import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowRight
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: (number | 'ALL')[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemName?: string;
  variant?: 'full' | 'compact';
  showPageSize?: boolean;
  showJumpToPage?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100] as (number | 'ALL')[],
  onPageChange,
  onPageSizeChange,
  itemName = 'trades',
  variant = 'full',
  showPageSize = true,
  showJumpToPage = true,
  className = ''
}) => {
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Clamp current page to valid range
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  useEffect(() => {
    if (currentPage > safeTotalPages && safeTotalPages > 0) {
      onPageChange(safeTotalPages);
    }
  }, [currentPage, safeTotalPages, onPageChange]);

  if (totalItems === 0) return null;

  const isAll = pageSize >= totalItems || pageSize >= 999999;
  const startItem = isAll ? 1 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = isAll ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems);

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const p = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(p) && p >= 1 && p <= safeTotalPages) {
      onPageChange(p);
      setJumpPageInput('');
    }
  };

  // Generate page numbers with ellipsis window
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1; // Number of pages around current page

    const left = Math.max(2, safeCurrentPage - delta);
    const right = Math.min(safeTotalPages - 1, safeCurrentPage + delta);

    pages.push(1);

    if (left > 2) {
      pages.push('ellipsis');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < safeTotalPages - 1) {
      pages.push('ellipsis');
    }

    if (safeTotalPages > 1) {
      pages.push(safeTotalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  // COMPACT VARIANT (Great for toolbars & headers)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-xs text-[var(--text-secondary)] ${className}`}>
        {/* Item count summary */}
        <span className="font-mono text-[11px] text-[var(--text-muted)] hidden sm:inline">
          <strong className="text-white font-semibold">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-white font-semibold">{totalItems}</strong>
        </span>

        {/* Per page selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-1">
            <select
              value={isAll ? 'ALL' : pageSize}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') {
                  onPageSizeChange(999999);
                } else {
                  onPageSizeChange(Number(val));
                }
              }}
              aria-label="Items per page"
              className="bg-[var(--bg-canvas)] border border-[var(--border-color)] hover:border-emerald-500/50 text-[var(--text-primary)] text-[11px] rounded-lg px-2 py-1 outline-none cursor-pointer font-mono transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={String(opt)} value={opt}>
                  {String(opt) === 'ALL' ? 'All' : `${opt}/pg`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Switcher */}
        <div className="flex items-center gap-1 bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-lg p-0.5">
          <button
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            title="Previous page"
            className="p-1 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-2 text-[11px] font-mono font-bold text-white whitespace-nowrap">
            {safeCurrentPage} / {safeTotalPages}
          </span>

          <button
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages}
            title="Next page"
            className="p-1 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // FULL VARIANT (Bottom of table/grid)
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] ${className}`}>
      
      {/* Left: Summary & Per-page selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span>
          Showing <span className="font-semibold text-white font-mono">{startItem.toLocaleString()}</span>–
          <span className="font-semibold text-white font-mono">{endItem.toLocaleString()}</span> of{' '}
          <span className="font-semibold text-white font-mono">{totalItems.toLocaleString()}</span> {itemName}
        </span>

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-1 sm:ml-3 pl-3 sm:border-l border-[var(--border-color)]">
            <span className="text-[11px] text-[var(--text-muted)]">Per page:</span>
            <select
              value={isAll ? 'ALL' : pageSize}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') {
                  onPageSizeChange(999999);
                } else {
                  onPageSizeChange(Number(val));
                }
              }}
              aria-label="Select items per page"
              className="bg-[var(--bg-canvas)] border border-[var(--border-color)] hover:border-emerald-500/50 text-white text-xs rounded-lg px-2.5 py-1 outline-none focus:border-emerald-500 cursor-pointer font-mono transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={String(opt)} value={opt}>
                  {String(opt) === 'ALL' ? 'All' : opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Quick Jump + Page Navigation Buttons */}
      <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
        
        {/* Go to page input */}
        {showJumpToPage && safeTotalPages > 3 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">Go to:</span>
            <input
              type="number"
              min={1}
              max={safeTotalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder={`${safeCurrentPage}`}
              className="w-12 bg-[var(--bg-canvas)] border border-[var(--border-color)] text-white text-xs rounded-lg px-1.5 py-1 text-center font-mono outline-none focus:border-emerald-500 placeholder-[var(--text-muted)]"
            />
            <button
              type="submit"
              disabled={!jumpPageInput.trim()}
              title="Jump to page"
              className="p-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            title="First Page"
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            title="Previous Page"
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1 mx-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span key={`ell-${idx}`} className="px-1 text-[var(--text-muted)] font-mono select-none">
                    …
                  </span>
                );
              }

              const isCurrent = p === safeCurrentPage;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-7 h-7 px-2 rounded-lg font-mono text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-black'
                      : 'bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <button
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages}
            title="Next Page"
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safeCurrentPage >= safeTotalPages}
            title="Last Page"
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
