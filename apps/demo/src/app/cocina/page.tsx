'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { KdsCard, type KdsOrder } from '@/components/kds-card';
import { ResetBanner } from '@/components/reset-banner';
import { DEMO_PRODUCTS, DEMO_TABLES, DEMO_STAFF } from '@/lib/demo-constants';
import { createDemoBrowserClient } from '@/lib/supabase-browser';
import {
  ChefHat,
  Flame,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Plus,
  Tv,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

function playKitchenBell() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12); // B5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

function getInitialDemoOrders(): KdsOrder[] {
  const now = Date.now();
  return [
    {
      id: '80000000-0000-4000-8000-000000000001',
      table_number: 1,
      zone: 'Zona Laguna',
      created_at: new Date(now - 14 * 60000).toISOString(),
      source: 'staff',
      items: [
        { name: 'Ceviche Clásico', quantity: 2, status: 'pending', emoji: '🐟' },
        { name: 'Chicha Morada 1L', quantity: 1, status: 'pending', emoji: '🥤' },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000002',
      table_number: 2,
      zone: 'Zona Laguna',
      created_at: new Date(now - 7 * 60000).toISOString(),
      source: 'guest',
      items: [
        { name: 'Parrilla Mixta', quantity: 1, status: 'preparing', emoji: '🥩' },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000003',
      table_number: 13,
      zone: 'Zona Jardín',
      created_at: new Date(now - 2 * 60000).toISOString(),
      source: 'staff',
      items: [
        { name: 'Lomo Saltado', quantity: 2, status: 'pending', emoji: '🍛' },
        { name: 'Picarones x6', quantity: 1, status: 'pending', emoji: '🍩' },
      ],
    },
  ];
}

export default function CocinaPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<KdsOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'guest' | 'staff'>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);

  const supabaseRef = useRef<ReturnType<typeof createDemoBrowserClient> | null>(null);
  const channelRef = useRef<any>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Periodic tick every 10 seconds to refresh elapsed minutes calculation
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Broadcast helper
  const sendBroadcast = useCallback(async (channelName: string, event: string, payload: Record<string, unknown>) => {
    try {
      if (!supabaseRef.current) return;
      const channel = supabaseRef.current.channel(channelName);
      if (channel.state === 'joined') {
        await channel.send({ type: 'broadcast', event, payload });
      } else {
        channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({ type: 'broadcast', event, payload });
          }
        });
      }
    } catch (err) {
      console.warn('Realtime broadcast error:', err);
    }
  }, []);

  // Notify new incoming order
  const handleIncomingOrder = useCallback((newOrder: KdsOrder) => {
    setOrders(prev => {
      if (prev.some(o => o.id === newOrder.id)) return prev;
      return [...prev, newOrder];
    });

    if (soundEnabled) {
      playKitchenBell();
    }

    setNewOrderAlert(`¡Nueva comanda de Mesa ${newOrder.table_number}! (${newOrder.zone})`);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      setNewOrderAlert(null);
    }, 4500);
  }, [soundEnabled]);

  // Load initial orders and subscribe to Realtime
  useEffect(() => {
    // 1. Initial orders
    async function loadOrders() {
      try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          const supabase = createDemoBrowserClient();
          supabaseRef.current = supabase;

          const tenantId = process.env.DEMO_TENANT_ID || '00000000-0000-4000-8000-000000000001';
          const branchId = process.env.DEMO_BRANCH_ID || '00000000-0000-4000-8000-000000000002';

          const { data, error } = await supabase
            .from('branch_state')
            .select('state')
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId)
            .maybeSingle();

          if (!error && data?.state && Array.isArray(data.state.orders) && data.state.orders.length > 0) {
            const loaded: KdsOrder[] = data.state.orders.map((o: any) => {
              const visitId = String(o.visit_id || '');
              const numMatch = visitId.match(/\d+$/);
              const tableNum = numMatch ? parseInt(numMatch[0], 10) : 1;
              const table = DEMO_TABLES.find(t => t.number === tableNum);

              return {
                id: o.id,
                table_number: tableNum,
                zone: table?.zone || 'Zona Laguna',
                created_at: o.created_at || new Date().toISOString(),
                source: o.source || 'staff',
                items: (o.lines || []).map((l: any) => ({
                  name: l.product_name,
                  quantity: l.quantity,
                  status: (l.prepared_quantity >= l.quantity ? 'ready' : (l.prepared_quantity > 0 ? 'preparing' : 'pending')) as 'pending' | 'preparing' | 'ready',
                  emoji: DEMO_PRODUCTS.find(p => p.id === l.product_id)?.emoji || '🍽️',
                })),
              };
            });

            if (loaded.length > 0) {
              setOrders(loaded);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Error loading orders from Supabase:', err);
      }

      // Fallback to initial demo orders
      setOrders(getInitialDemoOrders());
    }

    loadOrders();

    // 2. Realtime channel subscription
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        if (!supabaseRef.current) {
          supabaseRef.current = createDemoBrowserClient();
        }
        const supabase = supabaseRef.current;

        const kdsChannel = supabase.channel('demo-kds');
        channelRef.current = kdsChannel;

        kdsChannel
          .on('broadcast', { event: 'new-kds-order' }, (payload: { payload: KdsOrder }) => {
            const data = payload?.payload;
            if (data && data.id) {
              handleIncomingOrder(data);
            }
          })
          .subscribe((status: string) => {
            setIsRealtimeConnected(status === 'SUBSCRIBED');
          });

        return () => {
          if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
          try {
            supabase.removeChannel(kdsChannel);
          } catch {
            // Unmount cleanup
          }
        };
      }
    } catch (err) {
      console.warn('Realtime setup error:', err);
    }

    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [handleIncomingOrder]);

  // Actions
  const handlePreparing = useCallback(async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // Update local state
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.map(i => ({ ...i, status: 'preparing' as const })),
            }
          : o
      )
    );

    // Emit Realtime to guest tracking channel
    await sendBroadcast('demo-kds', 'order-status-update', {
      table_number: targetOrder.table_number,
      order_id: targetOrder.id,
      status: 'preparing',
    });

    // Notify salon map that table is active
    await sendBroadcast('demo-tables', 'table-update', {
      table_number: targetOrder.table_number,
      status: 'active',
      new_order: false,
    });

    // Asynchronously persist to backend/Supabase
    try {
      await fetch('/api/demo/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: targetOrder.id, status: 'preparing' }),
      });
    } catch {
      // Offline fallback
    }
  }, [orders, sendBroadcast]);

  const handleReady = useCallback(async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // Mark items ready in local state
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.map(i => ({ ...i, status: 'ready' as const })),
            }
          : o
      )
    );

    // Emit Realtime to guest tracking channel
    await sendBroadcast('demo-kds', 'order-status-update', {
      table_number: targetOrder.table_number,
      order_id: targetOrder.id,
      status: 'ready',
    });

    // Notify salon map
    await sendBroadcast('demo-tables', 'table-update', {
      table_number: targetOrder.table_number,
      status: 'active',
      new_order: false,
    });

    // Asynchronously persist to backend/Supabase
    try {
      await fetch('/api/demo/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: targetOrder.id, status: 'ready' }),
      });
    } catch {
      // Offline fallback
    }

    // After 800ms, smoothly slide out the card and record as completed
    setTimeout(() => {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setCompletedOrders(prev => [
        {
          ...targetOrder,
          items: targetOrder.items.map(i => ({ ...i, status: 'ready' })),
        },
        ...prev.slice(0, 7),
      ]);
    }, 800);
  }, [orders, sendBroadcast]);

  const handleRecoverOrder = useCallback((order: KdsOrder) => {
    setCompletedOrders(prev => prev.filter(o => o.id !== order.id));
    setOrders(prev => [
      ...prev,
      {
        ...order,
        items: order.items.map(i => ({ ...i, status: 'preparing' })),
      },
    ]);
  }, []);

  // Simulate a live QR order for presentation pitching
  const handleSimulateQrOrder = useCallback(async () => {
    const randomTables = [5, 8, 12, 14, 22, 28, 35];
    const pickedTableNumber = randomTables[Math.floor(Math.random() * randomTables.length)];
    const tableInfo = DEMO_TABLES.find(t => t.number === pickedTableNumber) || DEMO_TABLES[4];

    const sampleMenuPicks = [
      { name: 'Ceviche Mixto', quantity: 1, status: 'pending' as const, emoji: '🐟' },
      { name: 'Anticuchos x3', quantity: 2, status: 'pending' as const, emoji: '🍢' },
      { name: 'Chicha Morada 1L', quantity: 1, status: 'pending' as const, emoji: '🥤' },
    ];

    const simulatedOrder: KdsOrder = {
      id: `ord-qr-${Date.now().toString().slice(-4)}`,
      table_number: pickedTableNumber,
      zone: tableInfo.zone,
      created_at: new Date().toISOString(),
      source: 'guest',
      items: sampleMenuPicks,
    };

    // Broadcast through Realtime
    await sendBroadcast('demo-kds', 'new-kds-order', simulatedOrder as unknown as Record<string, unknown>);

    // Also trigger locally in case running without active Supabase credentials
    handleIncomingOrder(simulatedOrder);
  }, [handleIncomingOrder, sendBroadcast]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (filter === 'guest') return orders.filter(o => o.source === 'guest');
    if (filter === 'staff') return orders.filter(o => o.source === 'staff');
    return orders;
  }, [orders, filter]);

  // Metrics
  const activeCount = orders.length;
  const preparingCount = orders.filter(o => o.items.some(i => i.status === 'preparing')).length;
  const urgentCount = orders.filter(o => {
    const elapsed = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
    return elapsed >= 15;
  }).length;

  const chefStaff = DEMO_STAFF.find(s => s.role === 'kitchen') || { name: 'José Mamani', username: 'chef.pepe' };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top TV Bar & Header */}
      <header className="bg-slate-950/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            ← <span>Volver</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-lg">
              🍳
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                <span>Cocina en Tiempo Real (KDS)</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800 text-orange-400 border border-orange-500/30">
                  TV Display
                </span>
              </h1>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <ChefHat className="w-3 h-3 text-slate-400" />
                <span>{chefStaff.name} ({chefStaff.username})</span>
                <span>·</span>
                <span className="text-slate-500">Recreo La Laguna</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Pill Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
            <span className="flex items-center gap-1 font-semibold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeCount} activas</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Flame className="w-3.5 h-3.5" />
              <span>{preparingCount} en preparación</span>
            </span>
            {urgentCount > 0 && (
              <>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1 text-red-400 font-bold animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{urgentCount} retrasada{urgentCount > 1 ? 's' : ''}</span>
                </span>
              </>
            )}
          </div>

          {/* Sound & Fullscreen controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled
                  ? 'text-green-400 hover:bg-slate-800'
                  : 'text-slate-500 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
              aria-label={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Modo TV Pantalla completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Modo TV Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Fast simulate QR order button for pitches */}
          <button
            onClick={handleSimulateQrOrder}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs rounded-xl shadow transition-all active:scale-95"
            title="Simula la llegada de un pedido QR de comensal"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Simular Pedido QR</span>
          </button>

          <ResetBanner />
        </div>
      </header>

      {/* Realtime Alert Banner */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-600 text-white px-6 py-2.5 flex items-center justify-between text-sm font-semibold shadow-md overflow-hidden z-30"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg animate-bounce">📱</span>
              <span>{newOrderAlert}</span>
            </div>
            <span className="text-xs font-mono uppercase bg-blue-700/80 px-2 py-0.5 rounded-md">
              Realtime WebSocket
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subheader Toolbar & Filters */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Filtrar:</span>
          {(['all', 'guest', 'staff'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === tab
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab === 'all' && `Todas (${orders.length})`}
              {tab === 'guest' && `📱 Pedidos QR (${orders.filter(o => o.source === 'guest').length})`}
              {tab === 'staff' && `👨‍🏫 Mozos (${orders.filter(o => o.source === 'staff').length})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCompleted(prev => !prev)}
            className="hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span>Despachadas recientemente ({completedOrders.length})</span>
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            <span>{isRealtimeConnected ? 'Supabase Realtime Activo' : 'WebSocket Listo'}</span>
          </div>
        </div>
      </div>

      {/* Main KDS Horizontal Board */}
      <main className="flex-1 p-6 overflow-x-auto overflow-y-hidden flex flex-col justify-start">
        {filteredOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 gap-4 min-h-[420px]">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center justify-center text-3xl">
              👨‍🍳
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200 mb-1">Cocina al día</h2>
              <p className="text-sm text-slate-400 max-w-md">
                No hay comandas pendientes de despacho. Al crearse pedidos desde el celular de un comensal o por el mozo, aparecerán automáticamente en esta pantalla.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleSimulateQrOrder}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Simular pedido QR de cliente</span>
              </button>
              <button
                onClick={() => setOrders(getInitialDemoOrders())}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar comandas demo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-5 items-start h-full pb-4">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map(order => (
                <KdsCard
                  key={order.id}
                  order={order}
                  onPreparing={handlePreparing}
                  onReady={handleReady}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Recently Dispatched Drawer / History */}
      <AnimatePresence>
        {showCompleted && completedOrders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-950 border-t border-slate-800 p-4 px-6 overflow-hidden z-20"
          >
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Comandas despachadas recientemente:</span>
              </span>
              <button
                onClick={() => setShowCompleted(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕ Cerrar historial
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {completedOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs min-w-56 max-w-64 flex flex-col justify-between gap-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-200">Mesa {order.table_number}</span>
                    <span className="text-green-400 font-semibold text-[11px]">✓ Servido</span>
                  </div>
                  <div className="text-slate-400 text-[11px] space-y-0.5">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="line-through truncate">
                        {it.emoji} {it.quantity}× {it.name}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleRecoverOrder(order)}
                    className="mt-1 text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 self-start"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Devolver a cocina</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
