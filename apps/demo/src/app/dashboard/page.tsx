'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardOwner } from '@/components/dashboard-owner';
import { DashboardInvestor } from '@/components/dashboard-investor';
import { ResetBanner } from '@/components/reset-banner';
import {
  UserCheck,
  TrendingUp,
  Store,
  ChefHat,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const [mode, setMode] = useState<'owner' | 'investor'>('owner');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left Title & Back Link */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors flex items-center gap-1"
            >
              ← <span>Volver</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center text-xl font-bold">
                🌊
              </div>
              <div>
                <h1 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <span>Recreo La Laguna</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Dashboard
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  {mode === 'owner' ? 'Panel de Control del Dueño' : 'Visión de Escala para Inversores'}
                </p>
              </div>
            </div>
          </div>

          {/* Center Mode Switcher Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              onClick={() => setMode('owner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'owner'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="text-base">👨‍💼</span>
              <span>Modo Dueño</span>
            </button>
            <button
              onClick={() => setMode('investor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'investor'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="text-base">📈</span>
              <span>Modo Inversor</span>
            </button>
          </div>

          {/* Right Reset Banner & Quick Links */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
              <Link
                href="/salon"
                className="hover:text-brand-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1"
                title="Ir a vista del mozo"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Salón</span>
              </Link>
              <span className="text-slate-300">·</span>
              <Link
                href="/cocina"
                className="hover:text-brand-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1"
                title="Ir a pantalla de cocina"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Cocina</span>
              </Link>
              <span className="text-slate-300">·</span>
              <Link
                href="/cliente"
                className="hover:text-brand-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1"
                title="Ir a app comensal"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Comensal</span>
              </Link>
            </div>
            <ResetBanner />
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {mode === 'owner' ? (
            <motion.div
              key="owner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardOwner />
            </motion.div>
          ) : (
            <motion.div
              key="investor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardInvestor />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
