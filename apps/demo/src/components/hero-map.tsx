'use client';

import { motion } from 'framer-motion';
import { DEMO_TABLES, STATUS_COLORS } from '@/lib/demo-constants';

export function HeroMap() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-8 gap-2 p-6 bg-white/60 backdrop-blur rounded-2xl shadow-xl border border-white">
        {DEMO_TABLES.map((table, i) => (
          <motion.div
            key={table.number}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.02, type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center gap-0.5"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow"
              style={{ backgroundColor: STATUS_COLORS[table.initial_status] }}
            >
              {table.number}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Leyenda */}
      <div className="flex gap-4 justify-center mt-4 text-xs text-slate-600">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="capitalize">{
              status === 'free' ? 'Libre' :
              status === 'active' ? 'Activa' :
              status === 'paying' ? 'Por cobrar' : 'Alerta'
            }</span>
          </div>
        ))}
      </div>
    </div>
  );
}
