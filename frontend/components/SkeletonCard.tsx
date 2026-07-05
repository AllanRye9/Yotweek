export function SkeletonCard() {
  return (
    <div className="card-base animate-pulse overflow-hidden">
      <div className="aspect-[4/3] shimmer bg-slate-100" />
      <div className="p-3 space-y-2.5">
        <div className="h-2.5 shimmer bg-slate-100 rounded w-1/3" />
        <div className="h-4 shimmer bg-slate-100 rounded w-4/5" />
        <div className="h-3 shimmer bg-slate-100 rounded w-1/2" />
        <div className="h-3 shimmer bg-slate-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_,i) => (
        <div key={i} className="card-base p-4 flex gap-4 animate-pulse">
          <div className="w-16 h-16 shrink-0 shimmer bg-slate-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 shimmer bg-slate-100 rounded w-3/4" />
            <div className="h-3 shimmer bg-slate-100 rounded w-1/2" />
            <div className="h-3 shimmer bg-slate-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
