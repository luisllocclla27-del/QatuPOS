interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  emoji: string;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  sublabel,
  emoji,
  trend,
  trendText,
  className = '',
}: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col gap-2 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl" role="img" aria-label={label}>
          {emoji}
        </span>
        {trend === 'up' && (
          <span className="text-xs text-green-600 bg-green-50 border border-green-200/60 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
            {trendText || '↑ +12%'}
          </span>
        )}
        {trend === 'down' && (
          <span className="text-xs text-red-600 bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
            {trendText || '↓ -4%'}
          </span>
        )}
        {trend === 'neutral' && trendText && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {trendText}
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      {sublabel && <div className="text-xs text-slate-400">{sublabel}</div>}
    </div>
  );
}
