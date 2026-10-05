'use client';

import React, { useState } from 'react';
import type { FiscalDocument, SunatCreditReasonCode } from '@qatu/contracts';
import { money } from '../lib/client';

interface IssueCreditNoteModalProps {
  document: FiscalDocument;
  onClose: () => void;
  onSubmit: (params: {
    document_id: string;
    reason_code: SunatCreditReasonCode;
    reason_description: string;
  }) => Promise<void>;
  busy?: boolean;
}

const SUNAT_REASONS: { code: SunatCreditReasonCode; label: string; description: string }[] = [
  { code: '01', label: '01 - Anulación de la operación', description: 'Cancela la totalidad del comprobante por anulación del pedido o error en la venta.' },
  { code: '02', label: '02 - Anulación por error en el RUC', description: 'Exclusivo para Facturas emitidas con número de RUC incorrecto.' },
  { code: '06', label: '06 - Devolución total', description: 'Devolución completa de los platos o servicios consumidos.' },
];

export default function IssueCreditNoteModal({
  document: doc,
  onClose,
  onSubmit,
  busy = false,
}: IssueCreditNoteModalProps) {
  const [reasonCode, setReasonCode] = useState<SunatCreditReasonCode>(doc.doc_type === 'factura' ? '02' : '01');
  const [reasonDescription, setReasonDescription] = useState('Anulación de la operación por error de mesa');
  const [confirmed, setConfirmed] = useState(false);

  const targetSeries = doc.doc_type === 'boleta' ? 'BC01' : 'FC01';
  const targetDocName = doc.doc_type === 'boleta' ? 'Boleta de Venta Electrónica' : 'Factura Electrónica';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    await onSubmit({
      document_id: doc.id,
      reason_code: reasonCode,
      reason_description: reasonDescription.trim(),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-nc-title"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: '24px' }}
      >
        <span className="eyebrow" style={{ color: 'var(--danger)' }}>
          SIMULADOR LOCAL · SIN TRANSMISIÓN SUNAT
        </span>
        <h2 id="issue-nc-title" style={{ margin: '4px 0 12px' }}>
          Emitir Nota de Crédito Electrónica
        </h2>

        {/* Resumen del documento original */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Documento a modificar:</span>
            <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{doc.full_number}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span>Tipo:</span>
            <span>{targetDocName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span>Cliente:</span>
            <strong>{doc.customer_name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span>Identificación:</span>
            <span>{doc.customer_doc_type.toUpperCase()}: {doc.customer_doc_number || 'Sin documento'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
            <span>Monto a anular / revertir:</span>
            <span style={{ color: 'var(--danger)' }}>{money(doc.total_minor)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          {/* Serie de la Nota de Crédito */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--amber-light, #fef3c7)', borderRadius: '6px', fontSize: '12px' }}>
            <span>ℹ️</span>
            <span>
              Serie asignada automáticamente: <strong>{targetSeries}</strong> (correlativo interno de laboratorio).
            </span>
          </div>

          {/* Selector de motivo SUNAT */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            <span>Motivo de emisión SUNAT (Catálogo 09):</span>
            <select
              value={reasonCode}
              onChange={e => {
                const nextCode = e.target.value as SunatCreditReasonCode;
                setReasonCode(nextCode);
                const found = SUNAT_REASONS.find(r => r.code === nextCode);
                if (found) {
                  setReasonDescription(found.label.substring(5));
                }
              }}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              disabled={busy}
            >
              {SUNAT_REASONS.filter(r => r.code !== '02' || doc.doc_type === 'factura').map(r => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '-4px', marginBottom: '8px' }}>
            {SUNAT_REASONS.find(r => r.code === reasonCode)?.description}
          </p>

          {/* Sustento descriptivo */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            <span>Sustento / justificación detallada:</span>
            <input
              value={reasonDescription}
              onChange={e => setReasonDescription(e.target.value)}
              placeholder="Explica el motivo de la anulación en el laboratorio..."
              minLength={3}
              required
              disabled={busy}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
            />
          </label>

          {/* Sugerencias rápidas */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '-4px', marginBottom: '8px' }}>
            {[
              'Error en digitación de comanda',
              'Cliente solicitó cambio de comprobante',
              'Error en RUC de la empresa',
              'Devolución total por inconformidad',
            ].map(sug => (
              <button
                type="button"
                key={sug}
                className="secondary"
                style={{ fontSize: '11px', padding: '2px 8px', minHeight: '26px' }}
                onClick={() => setReasonDescription(sug)}
                disabled={busy}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Confirmación estricta */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', cursor: 'pointer', margin: '8px 0', padding: '10px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              disabled={busy}
              style={{ marginTop: '2px' }}
            />
            <span style={{ color: '#9f1239', lineHeight: 1.4 }}>
              <strong>Confirmo la simulación total:</strong> Se conservará el historial del laboratorio. No se enviará a SUNAT ni se devolverá dinero o stock. Descripción y devolución parcial aún no están implementadas.
            </span>
          </label>

          <div className="button-row" style={{ marginTop: '16px', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="secondary" disabled={busy} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="primary danger"
              disabled={busy || !confirmed || reasonDescription.trim().length < 3}
              style={{ background: 'var(--danger, #dc2626)', color: '#fff' }}
            >
              {busy ? 'Registrando simulación…' : `Emitir Nota de Crédito ${targetSeries} →`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
