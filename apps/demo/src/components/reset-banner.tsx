'use client';

import { useEffect, useState } from 'react';

const RESET_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

export function getNextReset(now = Date.now()): Date {
  const interval = RESET_INTERVAL_MS;
  const target = Math.ceil(now / interval) * interval;
  return new Date(target <= now ? target + interval : target);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ResetBanner() {
  const [msLeft, setMsLeft] = useState<number>(0);

  useEffect(() => {
    function tick() {
      setMsLeft(getNextReset().getTime() - Date.now());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isWarning = msLeft < 60_000;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      isWarning
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-600'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      Demo se reinicia en {formatCountdown(msLeft)}
    </div>
  );
}
