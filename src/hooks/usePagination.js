import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;


export default function usePagination(items, { initialPageSize = DEFAULT_PAGE_SIZE, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageItems = useMemo(
    () => (items ? items.slice(startIndex, startIndex + pageSize) : []),
    [items, startIndex, pageSize]
  );

  const handlePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    pageItems,
    startIndex,
    page: currentPage,
    pageSize,
    total,
    totalPages,
    pagerProps: {
      page: currentPage,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: handlePageSize,
    },
  };
}
