'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DEMO_PRODUCTS,
  DEMO_TABLES,
  formatMoney,
  generateDemoPin,
  type DemoProduct,
} from '@/lib/demo-constants';
import { createDemoBrowserClient } from '@/lib/supabase-browser';
import { ResetBanner } from '@/components/reset-banner';
import {
  type CartItem,
  type TaxBreakdown,
  computeTaxBreakdown,
  calculateCartTotal,
  calculateCartItemCount,
} from '@/lib/demo-cart';
import {
  Search,
  ShoppingBag,
  ArrowLeft,
  Check,
  Clock,
  Key,
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  UtensilsCrossed,
  Receipt,
  X,
  CheckCircle2,
  Bell,
  ChefHat,
  Flame,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';

export type GuestPhase = 'welcome' | 'pin' | 'menu' | 'quote' | 'confirmed' | 'tracking';

export type { CartItem, TaxBreakdown };
export { computeTaxBreakdown, calculateCartTotal, calculateCartItemCount };

export interface OrderItem {
  name: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  emoji: string;
}

const CATEGORIES = [
  'Todos',
  'Ceviches & Tiraditos',
  'Parrillas',
  'Arroces & Guisos',
  'Bebidas',
  'Postres',
] as const;

export function GuestAppDemo() {
  const searchParams = useSearchParams();
  const mesaParam = searchParams.get('mesa');
  const tableNumber = useMemo(() => {
    const num = mesaParam ? parseInt(mesaParam, 10) : 12;
    return isNaN(num) || num < 1 || num > 40 ? 12 : num;
  }, [mesaParam]);

  const currentTable = useMemo(
    () => DEMO_TABLES.find(t => t.number === tableNumber) ?? DEMO_TABLES[11],
    [tableNumber]
  );

  // States
  const [phase, setPhase] = useState<GuestPhase>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [lastPlacedItems, setLastPlacedItems] = useState<OrderItem[]>([]);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number>(120); // 2 min countdown
  const [orderId, setOrderId] = useState<string>('');
  const [simulatedProgress, setSimulatedProgress] = useState<boolean>(true);
  const [waiterCalled, setWaiterCalled] = useState<boolean>(false);

  // Timers ref for cleanup
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Managed Supabase client and channels refs
  const supabaseRef = useRef<ReturnType<typeof createDemoBrowserClient> | null>(null);
  const channelsRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
      if (supabaseRef.current) {
        channelsRef.current.forEach(ch => {
          try {
            supabaseRef.current?.removeChannel(ch);
          } catch {
            // Ignore on unmount
          }
        });
        channelsRef.current.clear();
      }
    };
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return DEMO_PRODUCTS.filter(product => {
      const matchCat =
        selectedCategory === 'Todos' || product.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Cart calculations
  const cartTotalCents = useMemo(() => {
    return calculateCartTotal(cart, DEMO_PRODUCTS);
  }, [cart]);

  const cartTotalItemsCount = useMemo(() => {
    return calculateCartItemCount(cart);
  }, [cart]);

  const taxBreakdown = useMemo(() => {
    return computeTaxBreakdown(cartTotalCents);
  }, [cartTotalCents]);

  const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === productId);
      if (!existing) {
        if (delta > 0) return [...prev, { product_id: productId, quantity: delta }];
        return prev;
      }
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.product_id !== productId);
      }
      return prev.map(i =>
        i.product_id === productId ? { ...i, quantity: newQty } : i
      );
    });
  }, []);

  // PIN validation & formatting
  const handlePinChange = (val: string) => {
    setPinError(null);
    let cleaned = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    if (cleaned.length > 5) {
      setPinInput(`${cleaned.slice(0, 5)}-${cleaned.slice(5)}`);
    } else {
      setPinInput(cleaned);
    }
  };

  const validatePin = (codeToTest?: string) => {
    const raw = (codeToTest || pinInput).replace(/-/g, '').trim();
    if (raw.length === 10) {
      setPinError(null);
      setPhase('menu');
    } else {
      setPinError('La clave debe tener 10 caracteres (ejemplo: ABCDE-12345)');
    }
  };

  const handleUseDemoPin = () => {
    const demoPin = generateDemoPin();
    setPinInput(demoPin);
    setPinError(null);
    const timer = setTimeout(() => {
      setPhase('menu');
      timersRef.current.delete(timer);
    }, 300);
    timersRef.current.add(timer);
  };

  // Start quote countdown when entering quote phase
  useEffect(() => {
    if (phase === 'quote') {
      setQuoteSecondsLeft(120);
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);

      quoteIntervalRef.current = setInterval(() => {
        setQuoteSecondsLeft(prev => {
          if (prev <= 1) {
            if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
      };
    }
  }, [phase]);

  // Channel retrieval and registration
  const getOrCreateChannel = useCallback((channelName: string) => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createDemoBrowserClient();
      } catch {
        return null;
      }
    }

    const supabase = supabaseRef.current;
    if (!supabase) return null;

    let channel = channelsRef.current.get(channelName);
    if (!channel) {
      channel = supabase.channel(channelName);
      channelsRef.current.set(channelName, channel);
    }
    return channel;
  }, []);

  const sendBroadcast = useCallback(
    async (channelName: string, event: string, payload: Record<string, unknown>) => {
      try {
        const channel = getOrCreateChannel(channelName);
        if (!channel) return;

        if (channel.state === 'joined') {
          await channel.send({
            type: 'broadcast',
            event,
            payload,
          });
        } else {
          channel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event,
                payload,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }
    },
    [getOrCreateChannel]
  );

  // Realtime Broadcast when order is confirmed
  const broadcastOrderPlaced = useCallback(
    async (itemsToOrder: OrderItem[]) => {
      // 1. Broadcast to salon map channel
      await sendBroadcast('demo-tables', 'table-update', {
        table_number: tableNumber,
        status: 'active',
        new_order: true,
      });

      // 2. Broadcast to kitchen channel
      const newOrderId = `ord-${Date.now().toString().slice(-4)}`;
      await sendBroadcast('demo-kds', 'new-kds-order', {
        id: newOrderId,
        table_number: tableNumber,
        zone: currentTable.zone,
        created_at: new Date().toISOString(),
        source: 'guest',
        items: itemsToOrder,
      });
    },
    [tableNumber, currentTable.zone, sendBroadcast]
  );

  // Broadcast when requesting the bill
  const broadcastCallBill = useCallback(async () => {
    setWaiterCalled(true);
    await sendBroadcast('demo-tables', 'table-update', {
      table_number: tableNumber,
      status: 'paying',
      new_order: false,
    });
  }, [tableNumber, sendBroadcast]);

  // Confirm order action
  const handleConfirmOrder = () => {
    if (cart.length === 0) return;

    const newOrderItems: OrderItem[] = [];
    for (const item of cart) {
      const prod = DEMO_PRODUCTS.find(p => p.id === item.product_id);
      if (prod) {
        newOrderItems.push({
          name: prod.name,
          quantity: item.quantity,
          status: 'pending',
          emoji: prod.emoji,
        });
      }
    }

    const generatedId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderId(generatedId);
    setLastPlacedItems(newOrderItems);
    setOrderItems(prev => [...prev, ...newOrderItems]);
    setCart([]);
    setPhase('confirmed');

    // Fire Realtime broadcasts
    broadcastOrderPlaced(newOrderItems);

    // Auto advance to tracking after 2.8 seconds
    const timer = setTimeout(() => {
      setPhase('tracking');
      timersRef.current.delete(timer);
    }, 2800);
    timersRef.current.add(timer);
  };

  // Realtime subscription and simulated progression in Tracking phase
  useEffect(() => {
    if (phase !== 'tracking') return;

    const trackingTimers: ReturnType<typeof setTimeout>[] = [];

    // Listen to real Supabase Realtime updates from Kitchen
    try {
      const kdsChannel = getOrCreateChannel('demo-kds');
      if (kdsChannel) {
        kdsChannel.on('broadcast', { event: 'order-status-update' }, (payload: { payload: { table_number: number; status: OrderItem['status'] } }) => {
          const data = payload?.payload;
          if (data && data.table_number === tableNumber) {
            setOrderItems(prev => prev.map(i => ({ ...i, status: data.status })));
            setSimulatedProgress(false);
          }
        });
        if (kdsChannel.state !== 'joined' && kdsChannel.state !== 'joining') {
          kdsChannel.subscribe();
        }
      }
    } catch {
      // Offline fallback
    }

    // Auto simulation progression for presentation pitches
    if (simulatedProgress) {
      const step1Timer = setTimeout(() => {
        setOrderItems(prev =>
          prev.map((item, idx) =>
            idx === 0 ? { ...item, status: 'preparing' } : item
          )
        );
      }, 4000);

      const step2Timer = setTimeout(() => {
        setOrderItems(prev =>
          prev.map(item => ({ ...item, status: 'preparing' }))
        );
      }, 7000);

      const step3Timer = setTimeout(() => {
        setOrderItems(prev =>
          prev.map((item, idx) =>
            idx === 0 ? { ...item, status: 'ready' } : item
          )
        );
      }, 12000);

      const step4Timer = setTimeout(() => {
        setOrderItems(prev => prev.map(item => ({ ...item, status: 'ready' })));
      }, 16000);

      trackingTimers.push(step1Timer, step2Timer, step3Timer, step4Timer);
      timersRef.current.add(step1Timer);
      timersRef.current.add(step2Timer);
      timersRef.current.add(step3Timer);
      timersRef.current.add(step4Timer);
    }

    return () => {
      trackingTimers.forEach(t => {
        clearTimeout(t);
        timersRef.current.delete(t);
      });
    };
  }, [phase, simulatedProgress, tableNumber, getOrCreateChannel]);

  // Overall status derived from order items
  const overallTrackingStatus = useMemo(() => {
    if (orderItems.length === 0) return 'pending';
    if (orderItems.every(i => i.status === 'delivered')) return 'delivered';
    if (orderItems.some(i => i.status === 'ready')) return 'ready';
    if (orderItems.some(i => i.status === 'preparing')) return 'preparing';
    return 'pending';
  }, [orderItems]);

  const quoteFormattedTime = useMemo(() => {
    const mins = Math.floor(quoteSecondsLeft / 60);
    const secs = quoteSecondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [quoteSecondsLeft]);

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center selection:bg-brand-500 selection:text-white">
      {/* Mobile container centered on desktop */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen flex flex-col shadow-2xl relative border-x border-slate-200/80">
        {/* Top Reset Banner Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200/80 px-3 py-1.5 flex items-center justify-between text-xs sticky top-0 z-50">
          <ResetBanner />
          <Link
            href="/salon"
            className="text-[11px] text-slate-500 hover:text-slate-800 font-medium transition-colors bg-white hover:bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs"
            title="Volver a la vista del mozo"
          >
            Vista Mozo →
          </Link>
        </div>

        {/* App Bar / Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sticky top-[37px] z-40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-xl shadow-2xs border border-brand-100">
              🌊
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                Recreo La Laguna
                <span className="text-3xl leading-none text-slate-300">·</span>
                <span className="text-brand-600 font-extrabold">Mesa {tableNumber}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {currentTable.zone} · Comensal QR
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/80">
              QR Activo
            </span>
          </div>
        </header>

        {/* Dynamic Body Content by GuestPhase */}
        <div className="flex-1 flex flex-col pb-24">
          <AnimatePresence mode="wait">
            {/* 1. WELCOME PHASE */}
            {phase === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col flex-1"
              >
                {/* Banner Modo Lectura */}
                <div className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white p-5 m-3 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-100 uppercase tracking-wider mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Carta Digital Activa
                  </div>
                  <h1 className="text-xl font-bold mb-1">¡Bienvenidos a La Laguna!</h1>
                  <p className="text-xs text-brand-100 mb-4 leading-relaxed">
                    Estás viendo la carta en modo consulta. Pide la clave a tu mozo para
                    enviar platos directo a cocina desde tu celular.
                  </p>
                  <button
                    onClick={() => setPhase('pin')}
                    className="w-full py-3 bg-white hover:bg-brand-50 text-brand-900 font-bold rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Key className="w-4 h-4 text-brand-600" />
                    Ingresar clave del mozo para pedir
                  </button>
                </div>

                {/* Categorías & Menú en Lectura */}
                <div className="px-3 pt-1">
                  <MenuCategoryTabs
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                  />

                  <div className="my-3 relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar ceviche, parrilla, bebida..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-2.5">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100">
                            {product.emoji}
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-slate-800">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {product.category}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-bold text-sm text-slate-800">
                            {formatMoney(product.price_cents)}
                          </span>
                          <button
                            onClick={() => setPhase('pin')}
                            className="text-[11px] bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Key className="w-3 h-3" /> Pedir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. PIN PHASE */}
            {phase === 'pin' && (
              <motion.div
                key="pin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 flex flex-col flex-1"
              >
                <button
                  onClick={() => setPhase('welcome')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 w-fit cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a la carta
                </button>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md text-center">
                  <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-2xs">
                    <Key className="w-7 h-7" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-800 mb-1">
                    Clave de Mesa {tableNumber}
                  </h2>
                  <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                    Solicita a tu mozo la clave de 10 caracteres para habilitar pedidos
                    directos a la cocina.
                  </p>

                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="ABCDE-12345"
                      value={pinInput}
                      onChange={e => handlePinChange(e.target.value)}
                      maxLength={11}
                      autoFocus
                      className="w-full text-center font-mono text-2xl font-bold tracking-widest bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-slate-800 focus:outline-none focus:border-brand-500 uppercase shadow-inner"
                    />
                    {pinError && (
                      <p className="text-xs text-red-500 font-medium mt-2">
                        {pinError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => validatePin()}
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer text-sm"
                  >
                    Validar clave y comenzar
                  </button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-slate-400 font-medium">
                        o para demostración
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleUseDemoPin}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Generar y usar clave demo válida
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. MENU PHASE (Interactive Shopping Cart) */}
            {phase === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col flex-1 px-3 pt-2"
              >
                {/* Active Session Pill */}
                <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3.5 py-2 rounded-2xl flex items-center justify-between text-xs mb-3 shadow-2xs">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Mesa {tableNumber} conectada a cocina
                  </div>
                  <span className="text-[11px] text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full font-mono">
                    {currentTable.zone}
                  </span>
                </div>

                {/* Categorías */}
                <MenuCategoryTabs
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />

                {/* Búsqueda */}
                <div className="my-3 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar platos o bebidas..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lista de productos interactivos */}
                <div className="space-y-2.5">
                  {filteredProducts.map(product => {
                    const cartItem = cart.find(i => i.product_id === product.id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    return (
                      <div
                        key={product.id}
                        className={`bg-white p-3.5 rounded-2xl border transition-all shadow-2xs flex items-center justify-between gap-3 ${
                          qty > 0
                            ? 'border-brand-500 ring-2 ring-brand-500/10 bg-brand-50/20'
                            : 'border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100">
                            {product.emoji}
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-slate-800">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {product.category}
                            </div>
                            <div className="font-bold text-xs text-brand-700 mt-0.5">
                              {formatMoney(product.price_cents)}
                            </div>
                          </div>
                        </div>

                        {/* Controles de Carrito */}
                        <div className="flex items-center">
                          {qty === 0 ? (
                            <button
                              onClick={() => updateCartQuantity(product.id, 1)}
                              className="bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 font-semibold text-xs px-3 py-1.5 rounded-xl border border-brand-200/60 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                onClick={() => updateCartQuantity(product.id, -1)}
                                className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer shadow-2xs"
                                aria-label="Disminuir cantidad"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs text-slate-800">
                                {qty}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(product.id, 1)}
                                className="w-6 h-6 flex items-center justify-center bg-brand-600 rounded-lg text-white font-bold hover:bg-brand-700 transition-colors cursor-pointer shadow-2xs"
                                aria-label="Aumentar cantidad"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 4. QUOTE PHASE (Resumen & Cotización con Countdown de 2 min) */}
            {phase === 'quote' && (
              <motion.div
                key="quote"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 flex flex-col flex-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setPhase('menu')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Seguir eligiendo
                  </button>
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
                    Mesa {tableNumber}
                  </span>
                </div>

                {/* Countdown Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4 flex items-center justify-between text-xs text-amber-800 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                    <div>
                      <div className="font-bold">Cotización reservada</div>
                      <div className="text-[11px] text-amber-700/80">
                        Precios y cocina bloqueados para ti
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-extrabold bg-amber-100 px-2.5 py-1 rounded-xl text-amber-900 border border-amber-300/60">
                    {quoteFormattedTime}
                  </div>
                </div>

                {/* Resumen de platos */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                    <UtensilsCrossed className="w-4 h-4 text-brand-600" />
                    Platos seleccionados ({cartTotalItemsCount})
                  </h3>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {cart.map(item => {
                      const prod = DEMO_PRODUCTS.find(p => p.id === item.product_id);
                      if (!prod) return null;
                      return (
                        <div
                          key={item.product_id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <span>{prod.emoji}</span>
                            <div className="font-semibold text-slate-800">
                              {prod.name}
                            </div>
                            <span className="text-slate-400">×{item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {formatMoney(prod.price_cents * item.quantity)}
                            </span>
                            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                              <button
                                onClick={() => updateCartQuantity(prod.id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded"
                              >
                                -
                              </button>
                              <button
                                onClick={() => updateCartQuantity(prod.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detalle fiscal resumido */}
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Subtotal (Base Imponible)</span>
                      <span>{formatMoney(taxBreakdown.subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>IGV (18% incluido)</span>
                      <span>{formatMoney(taxBreakdown.igvCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-800 pt-1 border-t border-slate-100">
                      <span>Total estimado:</span>
                      <span className="text-brand-700">{formatMoney(taxBreakdown.totalCents)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  <button
                    onClick={handleConfirmOrder}
                    disabled={cart.length === 0}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-brand-600/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    <span>🚀</span> Confirmar y enviar a cocina
                  </button>

                  <button
                    onClick={() => setPhase('menu')}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl text-center"
                  >
                    Modificar platos
                  </button>
                </div>
              </motion.div>
            )}

            {/* 5. CONFIRMED PHASE (Animación de éxito) */}
            {phase === 'confirmed' && (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="p-6 flex flex-col items-center justify-center text-center flex-1 my-auto"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-md"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>

                <h2 className="text-xl font-black text-slate-800 mb-1">
                  ¡Pedido enviado a cocina!
                </h2>
                <p className="text-xs text-slate-500 mb-4 max-w-xs">
                  Tu orden #{orderId} llegó a la pantalla de cocina y al mapa del salón.
                </p>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 w-full mb-6 shadow-xs text-left">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Comanda en preparación:
                  </div>
                  <div className="space-y-1.5">
                    {(lastPlacedItems.length > 0 ? lastPlacedItems : orderItems).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-700">
                          {item.emoji} {item.quantity}× {item.name}
                        </span>
                        <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                          ⏳ En cola
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setPhase('tracking')}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  Ver seguimiento en vivo <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* 6. TRACKING PHASE (Realtime Item Tracking) */}
            {phase === 'tracking' && (
              <motion.div
                key="tracking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 flex flex-col flex-1"
              >
                {/* Header Tracking */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">
                        Orden #{orderId || 'ORD-3829'}
                      </div>
                      <div className="font-extrabold text-base text-slate-800">
                        Mesa {tableNumber} · {currentTable.zone}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200/80">
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                        Tiempo Real
                      </span>
                    </div>
                  </div>

                  {/* Stepper horizontal */}
                  <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                          overallTrackingStatus !== 'pending' || orderItems.length > 0
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        ✓
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        Recibido
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                          overallTrackingStatus === 'preparing' ||
                          overallTrackingStatus === 'ready' ||
                          overallTrackingStatus === 'delivered'
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        Cocina
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                          overallTrackingStatus === 'ready' ||
                          overallTrackingStatus === 'delivered'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        Listo
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                          overallTrackingStatus === 'delivered'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">
                        En mesa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Status List */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs mb-4 flex-1">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 text-slate-400">
                    Estado por plato
                  </h3>

                  <div className="space-y-3">
                    {orderItems.map((item, idx) => {
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{item.emoji}</span>
                            <div>
                              <div className="font-bold text-slate-800 text-xs">
                                {item.quantity}× {item.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Estación: Cocina
                              </div>
                            </div>
                          </div>

                          <div>
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                                ⏳ En cola
                              </span>
                            )}
                            {item.status === 'preparing' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                                <Flame className="w-3 h-3 text-amber-600" /> Preparando
                              </span>
                            )}
                            {item.status === 'ready' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 text-emerald-600" /> ¡Listo para servir!
                              </span>
                            )}
                            {item.status === 'delivered' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                                ✓ Servido
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Table Actions: Pedir más o pedir la cuenta */}
                <div className="space-y-2 mt-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPhase('menu')}
                      className="py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-2xl transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Pedir más platos
                    </button>

                    <button
                      onClick={broadcastCallBill}
                      disabled={waiterCalled}
                      className={`py-3 font-bold rounded-2xl transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 ${
                        waiterCalled
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-98'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {waiterCalled ? 'Mozo en camino 🏃' : 'Pedir la cuenta'}
                    </button>
                  </div>

                  {waiterCalled && (
                    <p className="text-[11px] text-center text-amber-700 font-medium">
                      El mozo fue notificado en el mapa del salón con estado Por Cobrar.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Cart Pill (Only active in Menu phase when cart has items) */}
        <AnimatePresence>
          {phase === 'menu' && cart.length > 0 && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-3 z-50 pointer-events-auto"
            >
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white relative shadow-sm">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-slate-950 rounded-full text-[11px] font-extrabold flex items-center justify-center border-2 border-slate-900">
                      {cartTotalItemsCount}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-300">
                      {cartTotalItemsCount} {cartTotalItemsCount === 1 ? 'ítem' : 'ítems'}
                    </div>
                    <div className="font-extrabold text-sm text-white">
                      {formatMoney(cartTotalCents)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setPhase('quote')}
                  className="bg-brand-500 hover:bg-brand-400 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  Ver resumen <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Category Tabs Component
function MenuCategoryTabs({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none no-scrollbar -mx-1 px-1">
      {CATEGORIES.map(cat => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSelected
                ? 'bg-brand-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
