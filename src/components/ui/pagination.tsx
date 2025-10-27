import * as React from "react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

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
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed border-gray-300"
              : "bg-background hover:bg-neutral-100 text-black dark:text-white border-gray-400 dark:border-border"
          )}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {useTranslations('common')('pagination.previous')}
        </button>

        <ul className="flex items-center gap-2">
          {pages.map((page) => (
            <li key={page}>
              <button
                className={cn(
                  "min-w-[36px] px-3 py-2 rounded border text-sm transition-colors",
                  page === currentPage
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-neutral-100 text-black dark:text-white border-gray-400 dark:border-border"
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
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed border-gray-300"
              : "bg-background hover:bg-neutral-100 text-black dark:text-white border-gray-400 dark:border-border"
          )}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          {useTranslations('common')('pagination.next')}
        </button>
      </div>
    </nav>
  )
}