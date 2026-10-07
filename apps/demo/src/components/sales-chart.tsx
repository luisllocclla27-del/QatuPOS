'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatMoney } from '../lib/demo-constants';

export interface SalesHourPoint {
  hour: string;
  sales: number;
}

export const DEMO_SALES_DATA: SalesHourPoint[] = [
  { hour: '10am', sales: 340 },
  { hour: '11am', sales: 580 },
  { hour: '12pm', sales: 920 },
  { hour: '1pm',  sales: 1200 },
  { hour: '2pm',  sales: 1450 },
  { hour: '3pm',  sales: 980 },
  { hour: '4pm',  sales: 780 },
  { hour: '5pm',  sales: 620 },
  { hour: '6pm',  sales: 480 },
  { hour: '7pm',  sales: 250 },
];

interface SalesChartProps {
  data?: SalesHourPoint[];
  title?: string;
  subtitle?: string;
}

export function SalesChart({
  data = DEMO_SALES_DATA,
  title = 'Ventas por hora (S/)',
  subtitle = 'Horas punta entre 12:00pm y 3:00pm',
}: SalesChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalSales = data.reduce((acc, curr) => acc + curr.sales, 0);
  const maxSale = Math.max(...data.map(d => d.sales));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total en Gráfico</div>
          <div className="text-lg font-extrabold text-brand-700">{formatMoney(totalSales * 100)}</div>
        </div>
      </div>

      <div className="w-full h-52 min-h-[200px]">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `S/ ${Number(v).toFixed(2)}`}
              />
              <Tooltip
                formatter={(v: any) => [`S/ ${Number(v).toFixed(2)}`, 'Ventas facturadas']}
                labelFormatter={(label) => `Hora: ${label}`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="sales" radius={[6, 6, 0, 0]} animationDuration={800}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.sales === maxSale ? '#0d9268' : '#0ea47a'}
                    opacity={entry.sales === maxSale ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs animate-pulse">
            Cargando visualización...
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-600 inline-block" />
          <span>Pico máximo: <strong>2:00pm ({formatMoney(maxSale * 100)})</strong></span>
        </div>
        <span className="text-[11px] text-slate-400">Actualizado con cierres de comanda</span>
      </div>
    </div>
  );
}
