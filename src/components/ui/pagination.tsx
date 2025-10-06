import * as React from "react"
import { cn } from "@/lib/utils"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav role="navigation" aria-label="pagination" className="flex items-center justify-center gap-2">
      <div className="flex items-center gap-2">
        <button
          className={cn(
            "px-3 py-2 rounded border text-sm transition-colors",
            currentPage === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white hover:bg-gray-50 text-secondary-black"
          )}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        <ul className="flex items-center gap-2">
          {pages.map((page) => (
            <li key={page}>
              <button
                className={cn(
                  "min-w-[36px] px-3 py-2 rounded border text-sm transition-colors",
                  page === currentPage
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:bg-gray-50 text-secondary-black"
                )}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          ))}
        </ul>

        <button
          className={cn(
            "px-3 py-2 rounded border text-sm transition-colors",
            currentPage === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white hover:bg-gray-50 text-secondary-black"
          )}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  )
}