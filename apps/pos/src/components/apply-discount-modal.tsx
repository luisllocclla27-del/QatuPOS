'use client';

import React, { useState } from 'react';
import type { Check, DiscountKind } from '@qatu/contracts';
import { money, parseMoney } from '../lib/client';

interface ApplyDiscountModalProps {
  check: Check;
  tableLabel: string;
  grossTotal: number;
  disabled: boolean;
  onApply: (params: { kind: DiscountKind; percent?: number; amount_minor?: number; reason: string }) => Promise<void>;
  onRemove: (reason: string) => Promise<void>;
  onClose: () => void;
}

export default function ApplyDiscountModal({
  check,
  tableLabel,
  grossTotal,
  disabled,
  onApply,
  onRemove,
  onClose,
}: ApplyDiscountModalProps) {
  const [kind, setKind] = useState<DiscountKind>('percentage');
  const [percent, setPercent] = useState<number>(10);
  const [fixedAmountStr, setFixedAmountStr] = useState<string>('5.00');
  const [reason, setReason] = useState<string>('Convenio corporativo');
  const [removeReason, setRemoveReason] = useState<string>('Corrección de cuenta');
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const currentDiscountMinor = check.discount_minor ?? 0;
  const hasExistingDiscount = currentDiscountMinor > 0;

  // Calculate live preview
  let calculatedDiscountMinor = 0;
  if (kind === 'percentage') {
    calculatedDiscountMinor = Math.round((grossTotal * (percent || 0)) / 100);
  } else {
    calculatedDiscountMinor = parseMoney(fixedAmountStr);
  }

  const newTotalMinor = Math.max(0, grossTotal - calculatedDiscountMinor);
  const paidAndHeld = check.paid_minor + check.held_minor;
  const isValid =
    calculatedDiscountMinor > 0 &&
    calculatedDiscountMinor <= grossTotal &&
    newTotalMinor >= paidAndHeld &&
    reason.trim().length >= 3;

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || busy) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'percentage') {
        await onApply({ kind: 'percentage', percent, reason: reason.trim() });
      } else {
        await onApply({ kind: 'fixed', amount_minor: calculatedDiscountMinor, reason: reason.trim() });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aplicar el descuento');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    if (removeReason.trim().length < 3 || busy) return;
    setBusy(true);
    setError('');
    try {
      await onRemove(removeReason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo remover el descuento');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-modal-title"
        style={{ maxWidth: '520px', width: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--accent, #c9510c)' }}>
              POLÍTICA COMERCIAL · CAJA
            </span>
            <h2 id="discount-modal-title" style={{ margin: '4px 0 0' }}>
              Descuento / Cortesía · {tableLabel}
            </h2>
          </div>
          <button
            type="button"
            className="secondary"
            style={{ minHeight: '32px', padding: '4px 10px', fontSize: '13px' }}
            onClick={onClose}
            disabled={busy}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert error" role="alert" style={{ marginTop: '12px' }}>
            {error}
          </div>
        )}

        {hasExistingDiscount && !isRemoving && (
          <div
            style={{
              margin: '14px 0',
              padding: '12px',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Descuento actual aplicado:</strong> {money(currentDiscountMinor)}
                {check.discount_kind === 'percentage' && ` (${check.discount_percent}%)`}
                <div style={{ fontSize: '12px', color: 'var(--muted, #666)' }}>
                  Motivo: {check.discount_reason || 'Sin motivo especificado'}
                </div>
              </div>
              <button
                type="button"
                className="secondary danger"
                style={{ minHeight: '30px', padding: '3px 8px', fontSize: '11px' }}
                onClick={() => setIsRemoving(true)}
                disabled={busy || disabled}
              >
                Retirar descuento
              </button>
            </div>
          </div>
        )}

        {isRemoving ? (
          <form onSubmit={handleRemove} className="form-stack" style={{ marginTop: '16px' }}>
            <div className="alert info">
              Al retirar el descuento, la cuenta volverá a su total bruto original de {money(grossTotal)}.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Motivo de la remoción (mín. 3 caracteres)</label>
              <input
                value={removeReason}
                onChange={e => setRemoveReason(e.target.value)}
                required
                minLength={3}
                autoFocus
              />
            </div>
            <div className="button-row" style={{ marginTop: '16px', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="secondary" onClick={() => setIsRemoving(false)} disabled={busy}>
                Volver
              </button>
              <button
                type="submit"
                className="primary danger"
                disabled={busy || disabled || removeReason.trim().length < 3}
              >
                {busy ? 'Retirando…' : 'Confirmar y Restaurar Total'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleApply} className="form-stack" style={{ marginTop: '16px' }}>
            {/* Kind selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #ccc)',
                  backgroundColor: kind === 'percentage' ? 'var(--card-hover, rgba(0,0,0,0.05))' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: kind === 'percentage' ? 600 : 400,
                }}
              >
                <input
                  type="radio"
                  name="discountKind"
                  checked={kind === 'percentage'}
                  onChange={() => setKind('percentage')}
                />
                <span>Porcentaje (%)</span>
              </label>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #ccc)',
                  backgroundColor: kind === 'fixed' ? 'var(--card-hover, rgba(0,0,0,0.05))' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: kind === 'fixed' ? 600 : 400,
                }}
              >
                <input
                  type="radio"
                  name="discountKind"
                  checked={kind === 'fixed'}
                  onChange={() => setKind('fixed')}
                />
                <span>Monto Fijo (S/)</span>
              </label>
            </div>

            {kind === 'percentage' ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Porcentaje de descuento (1 - 100%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={percent}
                    onChange={e => setPercent(Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[5, 10, 15, 20, 50, 100].map(p => (
                    <button
                      key={p}
                      type="button"
                      className="secondary"
                      style={{
                        minHeight: '26px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: percent === p ? 700 : 400,
                        borderColor: percent === p ? 'var(--primary, #0969da)' : undefined,
                      }}
                      onClick={() => setPercent(p)}
                    >
                      {p === 100 ? '100% (Cortesía total)' : `${p}%`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Monto a descontar (S/)</label>
                <input
                  inputMode="decimal"
                  placeholder="Ej. 10.00"
                  value={fixedAmountStr}
                  onChange={e => setFixedAmountStr(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Motivo obligatorio (mín. 3 caracteres)</label>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ej. Cliente frecuente / Convenio corporativo"
                required
                minLength={3}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                {['Convenio corporativo', 'Cliente frecuente', 'Cortesía del dueño', 'Compensación demora'].map(r => (
                  <button
                    key={r}
                    type="button"
                    className="secondary"
                    style={{ minHeight: '24px', padding: '2px 6px', fontSize: '10px' }}
                    onClick={() => setReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Financial summary breakdown */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                backgroundColor: 'rgba(0,0,0,0.03)',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="muted">Consumo bruto:</span>
                <strong>{money(grossTotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--danger, #cf222e)' }}>
                <span>Descuento aplicado:</span>
                <strong>- {money(calculatedDiscountMinor)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border, #ccc)',
                  fontSize: '14px',
                }}
              >
                <span>Nuevo total a pagar:</span>
                <strong style={{ color: 'var(--success, #1a7f37)' }}>{money(newTotalMinor)}</strong>
              </div>
              {paidAndHeld > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--muted, #666)', marginTop: '4px' }}>
                  Pagado/Retenido previamente: {money(paidAndHeld)} · Saldo neto restante: {money(Math.max(0, newTotalMinor - paidAndHeld))}
                </div>
              )}
            </div>

            <div className="button-row" style={{ marginTop: '16px', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="secondary" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
              <button
                type="submit"
                className="primary"
                disabled={busy || disabled || !isValid}
              >
                {busy ? 'Aplicando…' : 'Aplicar Descuento'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
