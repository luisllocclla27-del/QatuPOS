'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalonMap } from '@/components/salon-map';
import { TablePanel } from '@/components/table-panel';
import { ResetBanner } from '@/components/reset-banner';
import { generateDemoPin, type DemoTableStatus } from '@/lib/demo-constants';
import Link from 'next/link';

export default function SalonPage() {
  const [selectedTable, setSelectedTable] = useState<{ number: number; status: DemoTableStatus } | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(clearTimeout);
      toastTimersRef.current.clear();
    };
  }, []);

  const handleActivateQR = useCallback(() => {
    setPin(generateDemoPin());
    setShowPinModal(true);
  }, []);

  const handleTableUpdate = useCallback((tableNumber: number, status: DemoTableStatus) => {
    setSelectedTable(prev =>
      prev && prev.number === tableNumber ? { ...prev, status } : prev
    );
  }, []);

  const handleNewOrder = useCallback((tableNumber: number) => {
    setToastMessage(`Mesa ${tableNumber} acaba de enviar un nuevo pedido por QR.`);
    const timer = setTimeout(() => {
      setToastMessage(prev =>
        prev?.includes(`Mesa ${tableNumber}`) ? null : prev
      );
      toastTimersRef.current.delete(timer);
    }, 5000);
    toastTimersRef.current.add(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
          >
            ← Volver
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <h1 className="font-bold text-slate-800 text-lg">
            🌊 Recreo La Laguna — Salón
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500 hidden sm:block">
            Mozo: <span className="font-semibold text-slate-700">Carlos Quispe</span>
          </div>
          <ResetBanner />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mapa principal */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Leyenda y resumen */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
              {[
                { color: '#22c55e', label: 'Libre (20)' },
                { color: '#3b82f6', label: 'Activa (12)' },
                { color: '#f59e0b', label: 'Por cobrar (5)' },
                { color: '#ef4444', label: 'Alerta (3)' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-md shadow-2xs" style={{ backgroundColor: color }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400">
              Haz clic en cualquier mesa para gestionar o generar su clave QR
            </div>
          </div>

          <SalonMap
            onSelectTable={(tableNumber, status) => setSelectedTable({ number: tableNumber, status })}
            selectedTable={selectedTable?.number ?? null}
            onNewOrder={handleNewOrder}
            onTableUpdate={handleTableUpdate}
          />
        </main>

        {/* Panel lateral de mesa seleccionada */}
        <AnimatePresence>
          {selectedTable !== null && (
            <TablePanel
              tableNumber={selectedTable.number}
              tableStatus={selectedTable.status}
              onClose={() => setSelectedTable(null)}
              onActivateQR={handleActivateQR}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modal del PIN */}
      <AnimatePresence>
        {showPinModal && pin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100"
            >
              <div className="text-5xl mb-4">🔑</div>
              <h3 className="font-bold text-2xl text-slate-800 mb-2">
                Clave de Mesa {selectedTable?.number}
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                Entrégala verbalmente al comensal para que pueda ordenar
              </p>

              <div className="bg-slate-100 rounded-2xl py-4 px-6 font-mono text-3xl font-extrabold text-slate-900 tracking-wider mb-6 border border-slate-200 select-all">
                {pin}
              </div>

              <p className="text-xs text-slate-400 mb-6">
                El cliente ingresa esta clave en{' '}
                <strong className="text-slate-600">demo.qatupos.pe/cliente</strong>
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => setShowPinModal(false)}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all shadow hover:shadow-md cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast animado cuando llega pedido QR de comensal */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-slate-900/95 backdrop-blur text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border border-slate-700 max-w-md"
          >
            <span className="text-2xl animate-bounce">🔔</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">Nuevo pedido QR</div>
              <div className="text-xs text-slate-300">{toastMessage}</div>
            </div>
            <button
              onClick={() => {
                setToastMessage(null);
                toastTimersRef.current.forEach(clearTimeout);
                toastTimersRef.current.clear();
              }}
              className="text-slate-400 hover:text-white text-sm p-1 ml-2 transition-colors cursor-pointer"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
