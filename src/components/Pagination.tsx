import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number | 'all';
  onItemsPerPageChange?: (itemsPerPage: number | 'all') => void;
  itemsPerPageOptions?: Array<number | 'all'>;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}) => {
  const [jumpToPage, setJumpToPage] = useState<string>('');
  const displayPages = Math.max(1, totalPages);

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  // Calculate showing range
  const startItem = totalItems && itemsPerPage && itemsPerPage !== 'all' ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems && itemsPerPage && itemsPerPage !== 'all' ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <div className="p-4 border-t border-[#EBEBEB] flex items-center justify-between bg-[#F7F7F7]">
      <div className="text-sm text-[#5C5C5C]">
        Page {currentPage} of {displayPages}
        {totalItems !== undefined && (
          <span className="ml-2">
            ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </span>
        )}
        {startItem !== null && endItem !== null && totalItems !== undefined && totalItems > 0 && (
          <span className="ml-2 text-[#5C5C5C]">
            Showing {startItem}-{endItem}
          </span>
        )}
        {totalPages === 0 && <span className="text-[#A4A4A4] ml-1">(No items)</span>}
      </div>
      <div className="flex items-center gap-2">
        {/* First Page Button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || totalPages === 0}
          className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="First page"
        >
          <ChevronsLeft size={18} />
        </button>
        
        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || totalPages === 0}
          className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        {totalPages > 0 ? (
          Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              // Show first page, last page, current page, and pages around current
              return (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              );
            })
            .map((page, index, array) => {
              // Add ellipsis if there's a gap
              const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
              return (
                <React.Fragment key={page}>
                  {showEllipsisBefore && <span className="px-2 text-[#A4A4A4]">...</span>}
                  <button
                    onClick={() => onPageChange(page)}
                    className={`btn ${
                      currentPage === page ? 'btn-primary' : 'btn-secondary'
                    } px-3 py-1`}
                    title={`Go to page ${page}`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })
        ) : (
          <span className="px-3 py-1 text-[#A4A4A4] text-sm">1</span>
        )}
        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight size={18} />
        </button>
        
        {/* Last Page Button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="btn btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Last page"
        >
          <ChevronsRight size={18} />
        </button>

        {/* Jump to Page */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#EBEBEB]">
            <span className="text-sm text-[#5C5C5C]">Jump to:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJumpToPage();
                }
              }}
              placeholder="Page"
              className="input w-16 text-center"
            />
            <button
              onClick={handleJumpToPage}
              disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
              className="btn btn-secondary text-xs px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Go to page"
            >
              Go
            </button>
          </div>
        )}

        {/* Items Per Page */}
        {onItemsPerPageChange && itemsPerPage !== undefined && (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#EBEBEB]">
            <label className="text-sm text-[#5C5C5C]">Per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const value = e.target.value;
                const newValue = value === 'all' ? 'all' : Number(value);
                onItemsPerPageChange(newValue);
                onPageChange(1); // Reset to first page when changing items per page
              }}
              className="input w-20 text-sm"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All' : option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
