'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DEMO_TABLES, type DemoTableStatus, STATUS_COLORS } from '@/lib/demo-constants';
import { createDemoBrowserClient } from '@/lib/supabase-browser';

export interface TableState {
  number: number;
  status: DemoTableStatus;
  hasNewOrder: boolean;
}

export interface SalonMapProps {
  onSelectTable: (n: number) => void;
  selectedTable?: number | null;
  onNewOrder?: (tableNumber: number) => void;
}

export function SalonMap({ onSelectTable, selectedTable, onNewOrder }: SalonMapProps) {
  const [tables, setTables] = useState<TableState[]>(
    DEMO_TABLES.map(t => ({ number: t.number, status: t.initial_status, hasNewOrder: false }))
  );

  useEffect(() => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return;
      }

      const supabase = createDemoBrowserClient();

      const channel = supabase
        .channel('demo-tables')
        .on('broadcast', { event: 'table-update' }, (payload) => {
          const { table_number, status, new_order } = payload.payload as {
            table_number: number;
            status: DemoTableStatus;
            new_order: boolean;
          };
          setTables(prev => prev.map(t =>
            t.number === table_number
              ? { ...t, status: status || t.status, hasNewOrder: Boolean(new_order) }
              : t
          ));
          if (new_order) {
            onNewOrder?.(table_number);
            setTimeout(() => {
              setTables(prev => prev.map(t =>
                t.number === table_number ? { ...t, hasNewOrder: false } : t
              ));
            }, 3000);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Supabase credentials might not be configured in mock/test environment
    }
  }, [onNewOrder]);

  const zones = ['Zona Laguna', 'Zona Jardín', 'Zona Techada', 'Zona VIP'] as const;

  return (
    <div className="space-y-6">
      {zones.map(zone => (
        <div key={zone} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">{zone}</h3>
            <span className="text-xs text-slate-400">
              {tables.filter(t => DEMO_TABLES.find(d => d.number === t.number)?.zone === zone && t.status === 'free').length} libres / {DEMO_TABLES.filter(d => d.zone === zone).length} mesas
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {tables
              .filter(t => DEMO_TABLES.find(d => d.number === t.number)?.zone === zone)
              .map(table => {
                const isSelected = selectedTable === table.number;
                return (
                  <motion.button
                    key={table.number}
                    animate={table.hasNewOrder ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    onClick={() => onSelectTable(table.number)}
                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'ring-4 ring-brand-500 ring-offset-2 scale-105 shadow-md'
                        : ''
                    }`}
                    style={{ backgroundColor: STATUS_COLORS[table.status] }}
                    aria-label={`Mesa ${table.number}, estado: ${table.status}`}
                  >
                    {table.number}
                    {table.hasNewOrder && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-bounce" />
                    )}
                  </motion.button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
