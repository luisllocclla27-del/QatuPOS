'use client';

import { motion } from 'framer-motion';
import { DEMO_TABLES, type DemoTableStatus, STATUS_COLORS, formatMoney } from '@/lib/demo-constants';
import { INITIAL_DEMO_STATE } from '@/lib/demo-seed';
import Link from 'next/link';

export interface TablePanelProps {
  tableNumber: number;
  tableStatus?: DemoTableStatus;
  onClose: () => void;
  onActivateQR: () => void;
}

const STATUS_LABELS: Record<DemoTableStatus, string> = {
  free: 'Libre',
  active: 'Activa',
  paying: 'Por cobrar',
  alert: 'Alerta',
};

export function TablePanel({
  tableNumber,
  tableStatus,
  onClose,
  onActivateQR,
}: TablePanelProps) {
  const table = DEMO_TABLES.find(t => t.number === tableNumber);
  const zoneName = table?.zone ?? 'Zona Laguna';
  const seats = table?.seats ?? 4;
  const status = tableStatus ?? table?.initial_status ?? 'free';

  // Seeded orders matching this table
  const tableIdSuffix = String(tableNumber).padStart(12, '0');
  const tableOrders = INITIAL_DEMO_STATE.orders.filter(o =>
    o.visit_id.endsWith(tableIdSuffix)
  );
  const tableCheck = INITIAL_DEMO_STATE.checks.find(c =>
    c.visit_id.endsWith(tableIdSuffix)
  );

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col gap-4 h-full overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg text-slate-800">Mesa {tableNumber}</h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          title="Cerrar panel"
          aria-label="Cerrar panel"
        >
          ✕
        </button>
      </div>

      {/* Info básica */}
      <div className="text-sm text-slate-500">
        {zoneName} · {seats} comensales
      </div>

      {/* Órdenes de la mesa */}
      <div className="flex-1 flex flex-col gap-3 min-h-[160px]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Órdenes de la mesa
        </h3>

        {tableOrders.length > 0 ? (
          <div className="space-y-2">
            {tableOrders.flatMap(order => order.lines).map(line => (
              <div
                key={line.id}
                className="flex items-center justify-between text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100"
              >
                <div>
                  <div className="font-medium text-slate-700">
                    {line.quantity}× {line.product_name}
                  </div>
                  {line.note ? (
                    <div className="text-xs text-slate-400 italic">Nota: {line.note}</div>
                  ) : null}
                </div>
                <div className="font-semibold text-slate-600 text-xs">
                  {formatMoney(line.unit_price_minor * line.quantity)}
                </div>
              </div>
            ))}
            {tableCheck && (
              <div className="pt-2 flex justify-between items-center text-sm font-bold text-slate-800 border-t border-slate-100">
                <span>Total comanda:</span>
                <span>{formatMoney(tableCheck.total_minor)}</span>
              </div>
            )}
          </div>
        ) : status === 'free' ? (
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200 text-slate-400 text-xs">
            Mesa desocupada. Activa el código QR para que el comensal ordene desde su celular.
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 text-slate-500 text-xs">
            {tableCheck ? (
              <div className="space-y-1">
                <div>Consumo activo en mesa</div>
                <div className="font-bold text-slate-800 text-sm">
                  Subtotal: {formatMoney(tableCheck.total_minor)}
                </div>
              </div>
            ) : (
              <div>Mesa ocupada sin comandas registradas todavía.</div>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        <button
          onClick={onActivateQR}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          <span>📱</span> Activar QR y mostrar clave
        </button>

        <div className="text-xs text-slate-400 text-center leading-relaxed">
          El comensal necesita esta clave para poder ordenar desde su celular
        </div>

        <div className="text-center pt-1">
          <Link
            href={`/cliente?mesa=${tableNumber}`}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline inline-flex items-center gap-1"
          >
            Abrir vista de comensal →
          </Link>
        </div>
      </div>
    </motion.aside>
  );
}
