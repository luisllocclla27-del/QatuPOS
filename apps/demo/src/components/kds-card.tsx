'use client';

import { motion } from 'framer-motion';

export interface KdsOrder {
  id: string;
  table_number: number;
  zone: string;
  created_at: string;
  source: 'staff' | 'guest';
  items: { name: string; quantity: number; status: 'pending' | 'preparing' | 'ready'; emoji: string }[];
}

export function elapsedMinutes(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

export type KdsUrgency = 'green' | 'amber' | 'red';

export function getUrgencyStatus(createdAt: string): { elapsed: number; urgency: KdsUrgency } {
  const elapsed = elapsedMinutes(createdAt);
  const urgency: KdsUrgency = elapsed >= 15 ? 'red' : elapsed >= 10 ? 'amber' : 'green';
  return { elapsed, urgency };
}

export function KdsCard({
  order,
  onPreparing,
  onReady,
}: {
  order: KdsOrder;
  onPreparing: (id: string) => void;
  onReady: (id: string) => void;
}) {
  const { elapsed, urgency } = getUrgencyStatus(order.created_at);

  return (
    <motion.div
      layout
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -120, opacity: 0 }}
      className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 flex flex-col gap-4 min-w-64 max-w-72"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-800">Mesa {order.table_number}</div>
          <div className="text-xs text-slate-400">{order.zone}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`text-sm font-bold ${urgency === 'red' ? 'text-red-500' : urgency === 'amber' ? 'text-amber-500' : 'text-green-500'}`}>
            {elapsed} min
          </div>
          {order.source === 'guest' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📱 QR</span>
          )}
        </div>
      </div>

      {/* Ítems */}
      <div className="space-y-2">
        {order.items.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm ${item.status === 'ready' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            <span>{item.emoji}</span>
            <span className="flex-1">{item.name}</span>
            <span className="font-semibold">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={() => onPreparing(order.id)}
          className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold rounded-lg transition-colors"
        >
          Preparando
        </button>
        <button
          onClick={() => onReady(order.id)}
          className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-800 text-sm font-semibold rounded-lg transition-colors"
        >
          ✓ Listo
        </button>
      </div>
    </motion.div>
  );
}
