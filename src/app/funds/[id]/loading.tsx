export default function FundDetailsLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="h-64 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
