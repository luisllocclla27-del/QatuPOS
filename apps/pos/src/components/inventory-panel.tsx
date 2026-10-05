'use client';
import { useState } from 'react';
import StockSupplyPanel from './stock-supply-panel';
import type { PosSnapshot } from '@qatu/contracts';
import { type CommandInput, parseQuantity, stationName } from '../lib/client';
import { countReviewProblem, pendingCountFor } from '../lib/inventory-review';

export default function InventoryPanel({ snapshot, disabled, onAction }: { snapshot: PosSnapshot; disabled: boolean; onAction: (command: CommandInput, success: string) => Promise<unknown> }) {
  const [counts, setCounts] = useState<Record<string, string>>({}), [reason, setReason] = useState(''), [approval, setApproval] = useState<Record<string, string>>({}), [error, setError] = useState('');
  const [observedVersions, setObservedVersions] = useState<Record<string, number>>({});
  const [observedTargets, setObservedTargets] = useState<string | null>(null);
  const admin = snapshot.user.role === 'admin';
  const ownedCash = snapshot.cash_sessions.some(c => c.owner_id === snapshot.user.id && c.state === 'open' && c.business_day_id === snapshot.business_day.id);
  const canDeclare = snapshot.business_day.state === 'open' && (admin || (snapshot.user.role === 'cashier' && ownedCash));
  const stockToCount = snapshot.stock.filter(s => admin || s.station === 'caja');
  const beverageHandover = snapshot.handovers.some(h => ['prepared', 'declared', 'disputed'].includes(h.state));
  // Admin can count Heladería during a handover; never count frozen Caja from this form.
  const countTargets = beverageHandover ? stockToCount.filter(s => s.station !== 'caja') : stockToCount;
  const targetKey = countTargets.map(s => s.id).join(',');
  const observationChanged = (observedTargets !== null && observedTargets !== targetKey) || Object.entries(observedVersions).some(([id, version]) => snapshot.stock.find(s => s.id === id)?.version !== version);
  function resetObservation() { setCounts({}); setObservedVersions({}); setObservedTargets(null); setError(''); }
  const human = (id: string) => snapshot.staff.find(s => s.id === id)?.name ?? 'Responsable registrado';
  async function declare(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (observationChanged) { setError('Cambió el inventario durante la observación. Descarta los valores y vuelve a contar.'); return; }
    try {
      const lines = countTargets.map(s => ({ stock_item_id: s.id, expected_version: observedVersions[s.id] ?? s.version, counted_quantity: parseQuantity(counts[s.id] ?? '') }));
      const result = await onAction({ type: 'inventory.count', reason: reason.trim(), lines }, 'Conteo declarado. Los productos incluidos quedan retenidos hasta revisión administrativa.');
      if (result) { setReason(''); resetObservation(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo declarar el conteo.'); }
  }
  return <><StockSupplyPanel snapshot={snapshot} disabled={disabled} onAction={onAction} />
    <p className="muted">Existencia registrada, unidades reservadas y disponibilidad se controlan por separado. Declarar un conteo conserva el libro; hasta aprobarlo, sus productos no pueden reservarse, entregarse ni reintegrarse.</p>
    <section className="panel table-scroll"><table><thead><tr><th>Producto / SKU</th><th>Estación</th><th>Registrado</th><th>Reservado</th><th>Disponible</th><th>Estado</th></tr></thead><tbody>{snapshot.stock.map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.sku} · unidad</small></td><td>{stationName[s.station]}</td><td>{s.on_hand ?? '—'}</td><td>{s.reserved ?? '—'}</td><td>{pendingCountFor(snapshot, s.id) ? 'Retenido' : s.available ?? '—'}</td><td><span className={`badge ${pendingCountFor(snapshot, s.id) ? 'amber' : 'teal'}`}>{pendingCountFor(snapshot, s.id) ? 'Retenido por conteo' : 'Sin conteo pendiente'}</span></td></tr>)}</tbody></table></section>
    {canDeclare && <section className="panel"><h2>Declarar conteo de inventario</h2><p className="small muted">{admin ? 'Selecciona el momento de revisión con los responsables de cada estación.' : 'Tu declaración incluye cerveza, gaseosa y agua bajo custodia de Caja.'} Otra persona administradora revisará el ajuste. Para corregir una declaración pendiente, registra un reconteo; el original se conserva.</p>{error && <div role="alert" className="alert error">{error}</div>}{countTargets.length ? <form className="form-stack" onSubmit={declare}>{countTargets.map(s => <label className="field" key={s.id}><span>Contado · {s.name}</span><input required inputMode="numeric" value={counts[s.id] ?? ''} onChange={e => { setCounts(old => ({ ...old, [s.id]: e.target.value })); setObservedVersions(old => ({ ...old, [s.id]: old[s.id] ?? s.version })); setObservedTargets(old => old ?? targetKey); }} /></label>)}<label className="field"><span>Motivo del conteo</span><input required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button className="secondary" disabled={disabled || observationChanged}>Guardar conteo declarado</button>{observationChanged && <p className="alert info" role="status">El inventario o sus reservas cambiaron desde que comenzaste a contar. Descarta los valores y vuelve a contar antes de declarar.</p>}{Object.keys(counts).length > 0 && <button type="button" className="secondary" disabled={disabled} onClick={resetObservation}>Descartar valores y recontar</button>}</form> : <p className="alert info">La custodia de bebidas está en traspaso. Termina ese proceso antes de declarar otro conteo de Caja.</p>}</section>}
    {!canDeclare && snapshot.user.role === 'cashier' && <p className="alert info">Para declarar bebidas necesitas tu sesión de caja abierta en el día operativo actual.</p>}
    {snapshot.inventory_counts.slice().reverse().map(c => {
      const problem = countReviewProblem(snapshot, c);
      return <section className="panel" key={c.id} aria-label={`Conteo ${c.reason}`}><div className="panel-heading"><h2>Conteo · {new Date(c.created_at).toLocaleString('es-PE')}</h2><span className="badge">{c.status === 'adjusted' ? 'Ajustado con aprobación' : c.status === 'superseded' ? 'Sustituido por reconteo' : 'Pendiente de revisión'}</span></div><p className="muted small">{c.reason} · {human(c.actor_id)}</p><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Registrado al declarar</th><th>Contado</th><th>Reservado ahora</th><th>Diferencia física</th></tr></thead><tbody>{c.lines.map(l => { const s = snapshot.stock.find(s => s.id === l.stock_item_id); return <tr key={l.stock_item_id}><td>{s?.name ?? 'Producto histórico'}</td><td>{l.expected_quantity}</td><td>{l.counted_quantity}</td><td>{s?.reserved ?? '—'}</td><td>{l.difference_quantity}</td></tr>; })}</tbody></table></div>{c.status === 'declared' && <>{problem && <p role="status" className="alert info">{problem}</p>}{admin && <div className="inline-form"><label className="field"><span>Motivo de aprobación</span><input value={approval[c.id] ?? ''} maxLength={500} onChange={e => setApproval(old => ({ ...old, [c.id]: e.target.value }))} /></label><button className="secondary" disabled={disabled || !!problem || (approval[c.id]?.trim().length ?? 0) < 3} onClick={() => void onAction({ type: 'inventory.adjust', inventory_count_id: c.id, approval_reason: approval[c.id]!.trim() }, 'Ajuste revisado y registrado. El conteo original permanece en el historial.')}>Aprobar ajuste</button></div>}</>}{c.status === 'superseded' && <p className="small muted">Esta declaración no puede volver a aprobarse. Su reconteo permanece en el historial.</p>}</section>;
    })}
  </>;
}
