'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  CheckCircle2,
  Target,
  ArrowRight,
  Send,
  MessageCircle,
  Mail,
  X,
  Sparkles,
  Globe,
} from 'lucide-react';

export function DashboardInvestor() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    note: '',
  });
  const [formSent, setFormSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => {
      // Auto-close after a few seconds or allow closing manually
    }, 4000);
  };

  const differentiators = [
    {
      title: 'Auto-Servicio QR sin Apps ni Descargas',
      desc: 'El comensal escanea el QR en su mesa y pide directamente desde el navegador móvil con PIN efímero de seguridad. Cero fricción, cero descargas en app stores.',
      icon: '📱',
      badge: 'Cero Fricción',
    },
    {
      title: 'Arquitectura Offline-First Real',
      desc: 'Si la fibra óptica o la señal móvil se interrumpe en recreos campestres o zonas rurales, el salón continúa cobrando, generando comandas e imprimiendo sin perder un solo registro.',
      icon: '🛡️',
      badge: 'Alta Disponibilidad',
    },
    {
      title: 'Comandas Multi-Estación en Milisegundos',
      desc: 'Las órdenes se descomponen instantáneamente en paralelo hacia Cocina, Parrilla, Bar y Heladería en pantallas KDS de TV sin demoras ni tickets manuales extraviados.',
      icon: '⚡',
      badge: '<2s Latencia',
    },
    {
      title: 'Optimización de Mozo (+100% Capacidad)',
      desc: 'El personal de sala deja de perder 45 minutos por turno caminando a transcribir comandas en el terminal principal y se enfoca en entrega de platos y calidez de servicio.',
      icon: '🧑‍🍳',
      badge: '2x Productividad',
    },
    {
      title: 'Aislamiento Multi-Tenant & SUNAT Compliant',
      desc: 'Arquitectura con esquema de base de datos multi-tenant estricto con RLS, contratos formales y módulo de emisión fiscal electrónica probado para el régimen peruano.',
      icon: '🏛️',
      badge: 'Facturación Lista',
    },
    {
      title: 'Reducción del 70% en Costo de Hardware',
      desc: 'Funciona en Smart TVs estándar, tabletas Android económicas y smartphones comerciales. No requiere costosos servidores locales on-premise ni terminales propietarias de $3,000.',
      icon: '💰',
      badge: 'Hardware Ligero',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner for Investors */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tesis de Inversión & Visión Tecnológica</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            El sistema operativo moderno para la gastronomía de alto flujo en Latinoamérica
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            QatuPOS resuelve el cuello de botella más crítico de los recreos campestres, pollerías y restaurantes familiares: la saturación de pedidos en hora punta y la pérdida de ingresos por atención demorada.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 items-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <span>Contactar al equipo QatuPOS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Ronda Seed / Expansión 2026</span>
            </div>
          </div>
        </div>

        {/* Decorative background grid and glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-brand-600/15 to-transparent pointer-events-none" />
      </div>

      {/* 3 Core Product Metrics */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-800">Métricas Clave de Rendimiento del Producto</h3>
          <p className="text-xs text-slate-500">Rendimiento garantizado por arquitectura técnica, no por promesas</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold mb-4 border border-emerald-100">
                0
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">0 Pedidos Duplicados</div>
              <div className="text-sm font-semibold text-emerald-700 mt-1">Idempotencia Formal con UUIDs</div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Cada pedido generado por comensal o mozo viaja con una clave de idempotencia criptográfica única. Si se pierde la conexión y se reintenta, el motor garantiza cero cobros o comandas dobles.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Tecnología de Núcleo</span>
              <span className="font-semibold text-slate-600">@qatu/domain</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold mb-4 border border-blue-100">
                ⚡
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">&lt; 2 Segundos</div>
              <div className="text-sm font-semibold text-blue-700 mt-1">Latencia QR → Pantalla de Cocina</div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Transmisión ultraveloz a través de canales WebSocket de Supabase Realtime. En cuanto el cliente confirma su orden en su smartphone, el chef la visualiza de inmediato en el KDS.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Conexión WebSocket</span>
              <span className="font-semibold text-slate-600">Supabase Realtime</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-bold mb-4 border border-purple-100">
                🏢
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">500+ Mesas Soportadas</div>
              <div className="text-sm font-semibold text-purple-700 mt-1">Escala Concurrente por Restaurante</div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Diseñado específicamente para complejos campestres de gran extensión (hasta 40-80 mesas por sede) sin cuellos de botella en la base de datos ni saturación de red local.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Capacidad de Concurrencia</span>
              <span className="font-semibold text-slate-600">Cloud Serverless</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Differentiators Panel vs Legacy POS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8">
        <div className="max-w-2xl mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200/60 mb-2">
            Foso Tecnológico (Moat)
          </div>
          <h3 className="text-2xl font-bold text-slate-800">Diferenciadores Clave vs. Software Tradicional</h3>
          <p className="text-slate-500 text-sm mt-1">
            Los POS tradicionales (Micros, Restobar, etc.) fueron construidos hace 20 años con arquitecturas cliente-servidor pesadas que colapsan en recreos campestres abiertos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((diff, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{diff.icon}</span>
                  <span className="text-[11px] font-semibold text-brand-700 bg-brand-100/60 px-2.5 py-0.5 rounded-full border border-brand-200/50">
                    {diff.badge}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{diff.title}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{diff.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Opportunity & Unit Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Market Size (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-xl">Oportunidad de Mercado (TAM / SAM)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Enfoque inicial en Perú seguido de expansión andina</p>
              </div>
              <Target className="w-6 h-6 text-brand-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-xs font-semibold text-slate-500 uppercase">Mercado Objetivo Inmediato</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">~8,000 Locales</div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Recreos campestres, pollerías familiares y restaurantes de alta rotación en provincias y Lima.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/70">
                <div className="text-xs font-semibold text-brand-800 uppercase">Suscripción SaaS Promedio</div>
                <div className="text-2xl font-extrabold text-brand-900 mt-1">S/ 350 / mes</div>
                <p className="text-xs text-brand-700 mt-1.5">
                  Cobro recurrente por sede + módulos opcionales de analítica e integración de pagos digitales.
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Ingreso Recurrente Anual Potencial (Perú):</span>
                <span className="font-bold text-slate-900 font-mono text-sm">S/ 33,600,000 / año</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-brand-600 h-full rounded-full" style={{ width: '45%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Mercado accesible inmediato (SAM): 35%</span>
                <span>Expansión LatAm: Colombia, Ecuador, Bolivia</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Modelo de negocio SaaS B2B con alta retención (&gt;94%)</span>
            </span>
          </div>
        </div>

        {/* Restaurant ROI / Value Created (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-xl">Retorno para el Restaurante</h3>
                <p className="text-xs text-slate-400 mt-0.5">Por qué el cliente paga feliz su suscripción</p>
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="space-y-4 my-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold text-sm shrink-0 border border-green-200/60">
                  +25%
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Mayor Rotación de Mesas</div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Ahorro de 12 minutos por mesa en horas pico al reducir la espera de carta y la toma manual de orden.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200/60">
                  +14%
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Incremento en Ticket Promedio</div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Los clientes piden rondas extra de bebidas, guarniciones y postres con solo tocar su pantalla sin esperar al mozo.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-200/60">
                  -90%
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Eliminación de Quejas por Demora</div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Transparencia en el estado del pedido: el cliente ve en tiempo real cuando su plato entra a cocción.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/60 text-emerald-900 text-xs">
            <span className="font-bold">Payback para el dueño:</span> Menos de 2 fines de semana de operación cubren el costo anual de la plataforma.
          </div>
        </div>
      </div>

      {/* Direct Contact Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-2">
                  🤝 Relación con Inversores
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Contactar al Equipo QatuPOS</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Conversemos sobre números de tracción, roadmap tecnológico y ronda de inversión.
                </p>
              </div>

              {formSent ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-3xl mx-auto">
                    ✓
                  </div>
                  <h4 className="text-xl font-bold text-slate-800">¡Mensaje Enviado con Éxito!</h4>
                  <p className="text-sm text-slate-600 max-w-xs mx-auto">
                    Gracias por tu interés en QatuPOS. Un fundador se pondrá en contacto contigo dentro de las próximas 24 horas.
                  </p>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormSent(false);
                    }}
                    className="mt-4 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Quick Channels */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="https://wa.me/51999999999?text=Hola%20equipo%20QatuPOS%2C%20estuve%20revisando%20la%20demo%20interactiva%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20inversi%C3%B3n."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Directo</span>
                    </a>
                    <a
                      href="mailto:inversores@qatupos.pe?subject=Contacto%20Inversor%20QatuPOS&body=Hola%2C%20vi%20la%20demo%20de%20QatuPOS%20y%20deseo%20m%C3%A1s%20informaci%C3%B3n."
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-slate-600" />
                      <span>inversores@qatupos.pe</span>
                    </a>
                  </div>

                  <div className="relative flex items-center my-2">
                    <div className="grow border-t border-slate-200" />
                    <span className="shrink mx-3 text-xs text-slate-400">o déjanos tus datos</span>
                    <div className="grow border-t border-slate-200" />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                        <input
                          type="text"
                          required
                          placeholder="Tu nombre"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa / Fondo</label>
                        <input
                          type="text"
                          placeholder="Ej. Angel / VC"
                          value={formData.company}
                          onChange={e => setFormData({ ...formData, company: e.target.value })}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          required
                          placeholder="nombre@fondo.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                        <input
                          type="tel"
                          placeholder="+51 987 654 321"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mensaje o Interés</label>
                      <textarea
                        rows={2}
                        placeholder="Interesado en conocer más de la ronda y unit economics..."
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Mensaje a Fundadores</span>
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
