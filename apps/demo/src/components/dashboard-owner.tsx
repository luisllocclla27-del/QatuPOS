'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Smartphone,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';
import { KpiCard } from './kpi-card';
import { SalesChart } from './sales-chart';
import {
  DEMO_TABLES,
  type DemoTableStatus,
  type DemoZone,
  STATUS_COLORS,
  formatMoney,
} from '@/lib/demo-constants';
import { createDemoBrowserClient } from '@/lib/supabase-browser';

interface SmartAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  message: string;
  time: string;
}

const INITIAL_ALERTS: SmartAlert[] = [
  {
    id: 'alt-1',
    type: 'warning',
    message: 'Mesa 17: Más de 20 min sin ordenar luego de sentarse (Zona Jardín)',
    time: 'Hace 3 min',
  },
  {
    id: 'alt-2',
    type: 'alert',
    message: 'Parrilla Mixta: Stock bajo en cocina (3 raciones disponibles)',
    time: 'Hace 6 min',
  },
  {
    id: 'alt-3',
    type: 'success',
    message: 'Mesa 8: Pago confirmado por Yape S/ 145.00 sin descuadre',
    time: 'Hace 11 min',
  },
  {
    id: 'alt-4',
    type: 'info',
    message: 'Mesa 4: Solicitó precuenta (Mozo Carlos asignado para cobro)',
    time: 'Hace 15 min',
  },
  {
    id: 'alt-5',
    type: 'info',
    message: 'Mesa 12: Nuevo pedido QR de comensal enviado directo a Cocina',
    time: 'Hace 18 min',
  },
];

interface TopTable {
  number: number;
  zone: DemoZone;
  seats: number;
  totalSpentCents: number;
  featuredDishes: string;
  status: DemoTableStatus;
}

const TOP_TABLES_DATA: TopTable[] = [
  {
    number: 33,
    zone: 'Zona VIP',
    seats: 8,
    totalSpentCents: 48500,
    featuredDishes: 'Parrilla Mixta ×2, Cervezas ×6, Suspiro',
    status: 'active',
  },
  {
    number: 2,
    zone: 'Zona Laguna',
    seats: 6,
    totalSpentCents: 34000,
    featuredDishes: 'Ceviches Mixtos ×3, Limonada Frozen ×2',
    status: 'paying',
  },
  {
    number: 7,
    zone: 'Zona Laguna',
    seats: 5,
    totalSpentCents: 29500,
    featuredDishes: 'Tacu Tacu con Lomo ×2, Chicha Morada ×2',
    status: 'active',
  },
  {
    number: 14,
    zone: 'Zona Jardín',
    seats: 6,
    totalSpentCents: 26000,
    featuredDishes: 'Costillar BBQ ×2, Inca Kola 1.5L',
    status: 'active',
  },
  {
    number: 1,
    zone: 'Zona Laguna',
    seats: 4,
    totalSpentCents: 21500,
    featuredDishes: 'Ceviche Clásico ×2, Picarones ×2',
    status: 'active',
  },
];

export function DashboardOwner() {
  const [tablesState, setTablesState] = useState<
    { number: number; zone: DemoZone; status: DemoTableStatus }[]
  >(
    DEMO_TABLES.map(t => ({
      number: t.number,
      zone: t.zone,
      status: t.initial_status,
    }))
  );

  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(8);
  const [todaySalesCents, setTodaySalesCents] = useState<number>(760000); // S/ 7,600.00
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(142);
  const [alerts, setAlerts] = useState<SmartAlert[]>(INITIAL_ALERTS);
  const [currentAlertIndex, setCurrentAlertIndex] = useState<number>(0);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Subscribe to Supabase Realtime for live tables and orders updates
  useEffect(() => {
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const supabase = createDemoBrowserClient();

        const tablesChannel = supabase
          .channel('demo-tables')
          .on('broadcast', { event: 'table-update' }, (payload) => {
            const { table_number, status } = payload.payload as {
              table_number: number;
              status: DemoTableStatus;
              new_order?: boolean;
            };

            setTablesState(prev =>
              prev.map(t => (t.number === table_number ? { ...t, status } : t))
            );
          })
          .subscribe((status: string) => {
            setIsLiveConnected(status === 'SUBSCRIBED');
          });

        const kdsChannel = supabase
          .channel('demo-kds')
          .on('broadcast', { event: 'new-kds-order' }, (payload: any) => {
            setActiveOrdersCount(count => count + 1);
            setTotalOrdersCount(count => count + 1);
            setTodaySalesCents(cents => cents + 4800); // S/ 48.00 avg increment

            const tableNum = payload?.payload?.table_number;
            setAlerts(prev => [
              {
                id: `alt-${Date.now()}`,
                type: 'info',
                message: tableNum
                  ? `Mesa ${tableNum}: Nueva comanda en preparación por cocina`
                  : 'Nueva comanda recibida en cocina',
                time: 'Ahora mismo',
              },
              ...prev.slice(0, 7),
            ]);
          })
          .on('broadcast', { event: 'order-status-update' }, (payload: any) => {
            if (payload?.payload?.status === 'ready') {
              setActiveOrdersCount(count => Math.max(1, count - 1));
            }
          })
          .subscribe();

        return () => {
          supabase.removeChannel(tablesChannel);
          supabase.removeChannel(kdsChannel);
        };
      }
    } catch (err) {
      console.warn('Realtime setup error in DashboardOwner:', err);
    }
  }, []);

  // Cycle alerts ticker
  useEffect(() => {
    if (alerts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentAlertIndex(prev => (prev + 1) % alerts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [alerts.length]);

  // Table status tallies
  const occupiedCount = tablesState.filter(t => t.status !== 'free').length;
  const freeCount = tablesState.filter(t => t.status === 'free').length;
  const activeCount = tablesState.filter(t => t.status === 'active').length;
  const payingCount = tablesState.filter(t => t.status === 'paying').length;
  const alertCount = tablesState.filter(t => t.status === 'alert').length;

  const occupancyRate = Math.round((occupiedCount / tablesState.length) * 100);
  const avgTicketCents = totalOrdersCount > 0 ? Math.round(todaySalesCents / totalOrdersCount) : 0;

  const activeAlert = alerts.length > 0 ? (alerts[currentAlertIndex] || alerts[0]) : null;

  return (
    <div className="space-y-6">
      {/* Smart Alerts Horizontal Ticker */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-md border border-slate-800 flex items-center justify-between gap-4 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider shrink-0 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            Alertas Inteligentes
          </div>
          <AnimatePresence mode="wait">
            {activeAlert && (
              <motion.div
                key={activeAlert.id}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-medium truncate flex items-center gap-2"
              >
                {activeAlert.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                {activeAlert.type === 'warning' && <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                {activeAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                {activeAlert.type === 'info' && <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />}
                <span className="text-slate-100">{activeAlert.message}</span>
                <span className="text-xs text-slate-400 shrink-0">({activeAlert.time})</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            {alerts.length > 0 ? `${currentAlertIndex + 1} / ${alerts.length}` : '0 / 0'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-green-400 animate-pulse' : 'bg-brand-400'}`} />
            <span className="hidden md:inline">{isLiveConnected ? 'Supabase En Vivo' : 'Tiempo Real'}</span>
          </div>
        </div>
      </div>

      {/* 4 Real-time KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          emoji="💰"
          label="Ventas del Día"
          value={formatMoney(todaySalesCents)}
          sublabel="Meta del turno: S/ 8,500.00 (89% lograda)"
          trend="up"
          trendText="↑ +18% vs domingo ant."
        />
        <KpiCard
          emoji="📋"
          label="Pedidos Totales"
          value={`${totalOrdersCount} comandas`}
          sublabel="Promedio: 24 pedidos/hora en almuerzo"
          trend="up"
          trendText="↑ +12% volumen"
        />
        <KpiCard
          emoji="🎯"
          label="Ticket Promedio"
          value={formatMoney(avgTicketCents)}
          sublabel="+S/ 4.80 adicional por adiciones QR"
          trend="up"
          trendText="↑ +5.2% vs semana"
        />
        <KpiCard
          emoji="🔥"
          label="Comandas Activas"
          value={`${activeOrdersCount} en curso`}
          sublabel="Tiempo prom. preparación: 13.8 min"
          trend="neutral"
          trendText="Dentro del SLA (15m)"
        />
      </div>

      {/* Middle Grid: Sales Chart + Payment Cash Breakdown vs Mini Table Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Chart & Cash breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sales Chart with Recharts */}
          <SalesChart />

          {/* Cash & Payment Method Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Desglose de Caja por Método de Pago</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cuadre inmediato en tiempo real sin descuadres al cierre</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 border border-green-200/60 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Caja Cuadrada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Efectivo */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Efectivo
                  </span>
                  <span className="font-medium text-emerald-700">41.0%</span>
                </div>
                <div className="text-lg font-extrabold text-slate-800">{formatMoney(312000)}</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '41%' }} />
                </div>
              </div>

              {/* Yape / Plin */}
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/60">
                <div className="flex items-center justify-between text-xs text-purple-700 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-purple-900">
                    <QrCode className="w-4 h-4 text-purple-600" />
                    Yape / Plin
                  </span>
                  <span className="font-medium">37.5%</span>
                </div>
                <div className="text-lg font-extrabold text-purple-950">{formatMoney(285000)}</div>
                <div className="w-full bg-purple-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '37.5%' }} />
                </div>
              </div>

              {/* Tarjetas */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/60">
                <div className="flex items-center justify-between text-xs text-blue-700 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-blue-900">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Tarjetas (POS)
                  </span>
                  <span className="font-medium">21.5%</span>
                </div>
                <div className="text-lg font-extrabold text-blue-950">{formatMoney(163000)}</div>
                <div className="w-full bg-blue-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '21.5%' }} />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">Total en arqueo auditado:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {formatMoney(312000 + 285000 + 163000)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col (5 cols): Mini Table Map */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Mapa Miniatura del Salón</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ocupación actual: <strong>{occupancyRate}%</strong> ({occupiedCount} de 40 mesas)
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/70">
                  40 Mesas
                </div>
              </div>

              {/* Status tally bar */}
              <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                <div className="p-2 rounded-xl bg-green-50 border border-green-200/50">
                  <div className="text-xs text-green-700 font-medium">Libres</div>
                  <div className="text-base font-extrabold text-green-800">{freeCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/50">
                  <div className="text-xs text-blue-700 font-medium">Activas</div>
                  <div className="text-base font-extrabold text-blue-800">{activeCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/50">
                  <div className="text-xs text-amber-700 font-medium">Por Cobrar</div>
                  <div className="text-base font-extrabold text-amber-800">{payingCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-red-50 border border-red-200/50">
                  <div className="text-xs text-red-700 font-medium">Alertas</div>
                  <div className="text-base font-extrabold text-red-800">{alertCount}</div>
                </div>
              </div>

              {/* Mini tables visualization by zone */}
              <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
                {(['Zona Laguna', 'Zona Jardín', 'Zona Techada', 'Zona VIP'] as DemoZone[]).map(zone => {
                  const zoneTables = tablesState.filter(t => t.zone === zone);
                  return (
                    <div key={zone}>
                      <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                        <span>{zone}</span>
                        <span className="text-slate-400 font-normal">
                          {zoneTables.filter(t => t.status !== 'free').length}/{zoneTables.length} ocupadas
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {zoneTables.map(table => (
                          <div
                            key={table.number}
                            title={`Mesa ${table.number} (${table.zone}) — Estado: ${table.status}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shadow-2xs transition-transform hover:scale-110 cursor-default"
                            style={{ backgroundColor: STATUS_COLORS[table.status] }}
                          >
                            {table.number}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick legend & link */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.free }} />
                  <span>Libre</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.active }} />
                  <span>Activa</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.paying }} />
                  <span>Cobro</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.alert }} />
                  <span>Alerta</span>
                </div>
              </div>
              <span className="text-slate-400 text-[11px]">Sincronizado vía Realtime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Most Profitable Tables Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Top 5 Mesas más Rentables del Turno</h3>
            <p className="text-xs text-slate-400 mt-0.5">Mesas con mayor volumen de facturación y consumo acumulado</p>
          </div>
          <div className="text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200/60">
            Pico Almuerzo
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pl-2">Mesa & Ubicación</th>
                <th className="pb-3 text-center">Capacidad</th>
                <th className="pb-3">Platos & Bebidas Clave</th>
                <th className="pb-3 text-right">Consumo Acumulado</th>
                <th className="pb-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TOP_TABLES_DATA.map((row, idx) => (
                <tr key={row.number} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 pl-2 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: STATUS_COLORS[row.status] }}
                      >
                        {row.number}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Mesa {row.number}</div>
                        <div className="text-xs text-slate-400">{row.zone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-center text-slate-600 text-xs font-medium">
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3 text-slate-400" />
                      {row.seats} pax
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-600 text-xs">
                    <span className="truncate max-w-xs block" title={row.featuredDishes}>
                      {row.featuredDishes}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-extrabold text-slate-900 font-mono">
                    {formatMoney(row.totalSpentCents)}
                  </td>
                  <td className="py-3.5 text-center">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        row.status === 'active'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : row.status === 'paying'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : 'bg-green-50 text-green-700 border border-green-200/60'
                      }`}
                    >
                      {row.status === 'active' ? '● Activa' : row.status === 'paying' ? '💳 Por cobrar' : 'Libre'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
