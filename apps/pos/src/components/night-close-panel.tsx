'use client';
import { useState } from 'react';
import type { PosSnapshot } from '@qatu/contracts';
import { type CommandInput, money, parseMoney, parseQuantity } from '../lib/client';
import { closureProblems, matchingClosingApproval } from '../lib/operations';

export default function NightClosePanel({ snapshot, disabled, onAction }: { snapshot: PosSnapshot; disabled: boolean; onAction: (c: CommandInput, success: string) => Promise<unknown> }) {
  const [cashInput, setCashInput] = useState(''), [counts, setCounts] = useState<Record<string, string>>({}), [reason, setReason] = useState(''), [error, setError] = useState(''), [observedVersion, setObservedVersion] = useState<number | null>(null), [confirming, setConfirming] = useState(false);
  const cash = snapshot.cash_sessions.find(c => c.state === 'open' && c.shift_label === 'nocturno' && c.business_day_id === snapshot.business_day.id);
  const admin = snapshot.user.role === 'admin', owner = cash?.owner_id === snapshot.user.id;
  const stock = snapshot.stock.filter(s => s.station === 'caja'), problems = closureProblems(snapshot);
  let values: { counted: number; stock_counts: { stock_item_id: string; counted_quantity: number }[] } | undefined;
  try { values = { counted: parseMoney(cashInput), stock_counts: stock.map(s => ({ stock_item_id: s.id, counted_quantity: parseQuantity(counts[s.id] ?? '') })) }; } catch { /* Incomplete physical declaration. */ }
  const approval = cash && values ? matchingClosingApproval(snapshot, cash.id, values.counted, values.stock_counts) : undefined;
  const changed = observedVersion !== null && observedVersion !== snapshot.version && !approval;
  const stockMatches = values?.stock_counts.every(l => snapshot.stock.find(s => s.id === l.stock_item_id)?.on_hand === l.counted_quantity) ?? false;
  const variance = values && cash?.expected_minor !== null && cash?.expected_minor !== undefined ? values.counted - cash.expected_minor : null;
  const canFinal = !!values && !!cash && owner && !problems.length && stockMatches && !changed && (variance === 0 || !!approval);
  function observe() { setObservedVersion(v => v ?? snapshot.version); setConfirming(false); }
  function reset() { setCashInput(''); setCounts({}); setObservedVersion(null); setConfirming(false); setError(''); }
  async function submit(approve: boolean) {
    if (!cash || !values) return;
    setError('');
    const body = { cash_session_id: cash.id, expected_version: cash.version, expected_day_version: snapshot.business_day.version, counted_cash_minor: values.counted, stock_counts: values.stock_counts, reason: reason.trim() };
    try {
      const result = await onAction(approve ? { type: 'cash.close.approve', ...body } : { type: 'day.close', mode: 'operational_final', ...body, ...(approval ? { approval_id: approval.id } : {}) }, approve ? 'Revisión independiente firmada. Un cambio posterior exige revisarla otra vez.' : 'Cierre operativo completo: caja y bebidas conciliadas. Fiscalidad y banco conservan su estado.');
      if (result) reset();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el cierre.'); }
  }
  const latest = snapshot.day_closes.at(-1);
  return <>
    {latest?.business_day_id === snapshot.business_day.id && latest.operational_status === 'reconciled' && <div className="alert success" role="status"><strong>Caja y bebidas conciliadas operativamente</strong><p>Cierre firmado con conteos conservados. La emisión SUNAT y la liquidación bancaria son procesos separados.</p></div>}
    {cash && (owner || admin) && <section className="panel" aria-label="Cierre operativo nocturno" data-state-version={snapshot.version}><span className="eyebrow">NOCHE · VERIFICACIÓN FINAL</span><h2>{owner ? 'Cerrar caja y bebidas completamente' : 'Revisar efectivo de cierre nocturno'}</h2><p className="muted">Incluye los cobros y bebidas de todo el día. No suma otra vez el fondo recibido en el traspaso. Actualiza los datos después del último cobro antes de comenzar a contar. {owner ? 'Una diferencia de efectivo requiere firma de otra persona administradora.' : 'Tu firma queda ligada al efectivo, conteo y versiones observados; no modifica stock ni registra dinero ficticio.'}</p>
      {problems.length ? <div className="alert warning"><strong>Antes del cierre completo</strong><ul>{problems.map(p => <li key={p}>{p}</li>)}</ul><p>Si necesitas conservar un corte con pendientes, usa el cierre provisional de abajo.</p></div> : <p className="alert info">Pedidos, saldos, pagos y conteos pendientes resueltos. Declara el efectivo y las bebidas físicas.</p>}
      {error && <p className="alert error" role="alert">{error}</p>}
      <div className="form-stack"><label className="field"><span>Efectivo nocturno contado (S/)</span><input inputMode="decimal" value={cashInput} onChange={e => { observe(); setCashInput(e.target.value); }} /></label>{stock.map(s => <label className="field" key={s.id}><span>Stock final · {s.name}</span><input inputMode="numeric" value={counts[s.id] ?? ''} onChange={e => { observe(); setCounts(old => ({ ...old, [s.id]: e.target.value })); }} /></label>)}<label className="field"><span>Motivo de cierre o aprobación nocturna</span><input minLength={3} maxLength={owner ? 200 : 500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      {values && !stockMatches && <p className="alert warning">El conteo no coincide con el libro. Declara y concilia la diferencia en Inventario antes del cierre completo.</p>}
      {variance !== null && <p>Diferencia de efectivo: <strong>{money(variance)}</strong>{approval ? ' · Revisión independiente vigente' : variance !== 0 ? ' · Requiere aprobación independiente' : ' · Sin diferencia'}</p>}
      {changed && <p className="alert warning" role="status">La operación cambió mientras contabas. Descarta los valores y vuelve a verificar el cierre.</p>}
      {observedVersion !== null && <button type="button" className="secondary" disabled={disabled} onClick={reset}>Descartar declaración nocturna</button>}
      {admin && !owner && <button className="secondary" disabled={disabled || !values || !stockMatches || !!problems.length || changed || reason.trim().length < 3} onClick={() => void submit(true)}>Firmar revisión independiente</button>}
      {owner && <><button className="primary" disabled={disabled || !canFinal || reason.trim().length < 3} onClick={() => setConfirming(true)}>Revisar cierre operativo completo</button>{confirming && <div className="alert info"><strong>Confirmar conteo y cierre de caja</strong><p>Se firma el corte y termina esta sesión. No se confirma SUNAT ni liquidación bancaria.</p><div className="button-row"><button className="primary" disabled={disabled || !canFinal} onClick={() => void submit(false)}>Confirmar cierre operativo completo</button><button className="secondary" onClick={() => setConfirming(false)}>Volver a revisar</button></div></div>}</>}
      </div>
    </section>}
  </>;
}
