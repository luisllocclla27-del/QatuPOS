import Link from 'next/link';
import { HeroMap } from '@/components/hero-map';
import { ResetBanner } from '@/components/reset-banner';
import { DEMO_STAFF } from '@/lib/demo-constants';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-12">

        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌊</div>
            <span className="font-bold text-xl">QatuPOS</span>
          </div>
          <ResetBanner />
        </div>

        {/* Headline */}
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-extrabold leading-tight mb-4">
            El recreo que<br />se gestiona solo
          </h1>
          <p className="text-xl text-brand-100 leading-relaxed">
            Pedidos desde el celular del comensal.<br />
            Cocina actualizada en 2 segundos.<br />
            Control total para el dueño.
          </p>
        </div>

        {/* Mapa del recreo */}
        <HeroMap />

        {/* Botones de rol */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          <Link href="/dashboard" className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all">
            <span className="text-4xl">🧑‍💼</span>
            <div className="text-center">
              <div className="font-semibold">Soy el Dueño</div>
              <div className="text-sm text-brand-100">Dashboard y control</div>
            </div>
          </Link>
          <Link href="/salon" className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all">
            <span className="text-4xl">👨‍🏫</span>
            <div className="text-center">
              <div className="font-semibold">Soy el Mozo</div>
              <div className="text-sm text-brand-100">Gestión de mesas y QR</div>
            </div>
          </Link>
          <Link href="/cliente" className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all">
            <span className="text-4xl">🍽️</span>
            <div className="text-center">
              <div className="font-semibold">Soy el Cliente</div>
              <div className="text-sm text-brand-100">Pide desde tu celular</div>
            </div>
          </Link>
        </div>

        {/* Credenciales visibles para la demo */}
        <div className="bg-white/10 rounded-2xl border border-white/20 p-6 w-full max-w-2xl">
          <p className="text-sm font-semibold text-brand-100 mb-3">Credenciales de demo (usa cualquiera):</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DEMO_STAFF.map((s) => (
              <div key={s.username} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xs text-brand-200 capitalize">{s.role === 'waiter' ? 'Mozo' : s.role === 'cashier' ? 'Cajera' : s.role === 'kitchen' ? 'Cocina' : 'Admin'}</div>
                <div className="font-mono font-bold text-sm">{s.username}</div>
                <div className="font-mono text-brand-200 text-xs">PIN: {s.pin}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-brand-200 text-center">
          Demo interactiva — datos ficticios del Recreo La Laguna. Los pedidos QR son transacciones reales dentro de esta sesión.
        </p>
      </div>
    </main>
  );
}
