import { Skeleton } from "@/components/ui/skeleton";

/** N pulsing surface-card blocks — for list screens like appointments/requirements/staff. */
export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="surface-card space-y-3 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** N table rows matching a given column count — for products.tsx-style data tables. */
export function TableRowsSkeleton({ cols, rows = 3 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** N aspect-square card placeholders — for business/event card grids. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-3xl" />
      ))}
    </div>
  );
}
