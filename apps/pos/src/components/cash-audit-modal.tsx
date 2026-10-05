'use client';

import React from 'react';
import type { PosSnapshot } from '@qatu/contracts';
import { money } from '../lib/client';
import { cashReportScope } from '../lib/cash-report';

interface CashAuditModalProps {
  snapshot: PosSnapshot;
  onClose: () => void;
}

export default function CashAuditModal({ snapshot, onClose }: CashAuditModalProps) {
  const scope = cashReportScope(snapshot);
  if (!scope.available) return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Arqueo no disponible"><h2>Arqueo no disponible</h2><p>{scope.reason}</p><button className="secondary" onClick={onClose}>Cerrar</button></section></div>;
  // Find current cash session
  const activeSession = scope.session;

  const sessionId = activeSession?.id;
  const owner = snapshot.staff.find(s => s.id === activeSession?.owner_id)?.name || snapshot.user.name;
  const shiftLabel = activeSession?.shift_label === 'nocturno' ? 'Nocturno' : 'Diurno';
  const openingMinor = activeSession?.opening_minor ?? 0;

  // Cash movements for active session
  const movements = snapshot.cash_movements.filter(m => m.cash_session_id === sessionId);
  const paidInMinor = movements.filter(m => m.kind === 'paid_in').reduce((s, m) => s + m.amount_minor, 0);
  const paidOutMinor = movements.filter(m => m.kind === 'paid_out').reduce((s, m) => s + m.amount_minor, 0);

  // Payments in this session / day
  const sessionPayments = snapshot.payments.filter(
    p => p.status === 'succeeded' && p.cash_session_id === sessionId
  );
  const cashPayments = sessionPayments.filter(p => p.method === 'cash');
  const cardPayments = sessionPayments.filter(p => p.method === 'card');
  const yapePayments = sessionPayments.filter(p => p.method === 'yape');

  const cashNetMinor = cashPayments.reduce((s, p) => s + p.amount_minor, 0);
  const cardNetMinor = cardPayments.reduce((s, p) => s + p.amount_minor, 0);
  const yapeNetMinor = yapePayments.reduce((s, p) => s + p.amount_minor, 0);
  const totalCollectionsMinor = cashNetMinor + cardNetMinor + yapeNetMinor;

  // Expected cash in drawer
  const expectedCashInDrawer = openingMinor + cashNetMinor + paidInMinor - paidOutMinor;

  // Fiscal documents summary
  const fiscalDocs = scope.documents;
  const boletas = fiscalDocs.filter(d => d.doc_type === 'boleta');
  const facturas = fiscalDocs.filter(d => d.doc_type === 'factura');
  const creditNotes = fiscalDocs.filter(d => d.doc_type === 'nota_credito');
  const totalBoletasMinor = boletas.reduce((s, d) => s + d.total_minor, 0);
  const totalFacturasMinor = facturas.reduce((s, d) => s + d.total_minor, 0);
  const totalCreditNotesMinor = creditNotes.reduce((s, d) => s + d.total_minor, 0);
  const totalIgvMinor = fiscalDocs.reduce((s, d) => s + (d.doc_type === 'nota_credito' ? -d.igv_minor : d.igv_minor), 0);
  const netFiscalBilledMinor = totalBoletasMinor + totalFacturasMinor - totalCreditNotesMinor;

  // Open tables / pending checks
  const openChecks = snapshot.checks.filter(c => c.status === 'open' && c.remaining_collectible_minor > 0);
  const pendingBalanceMinor = openChecks.reduce((s, c) => s + c.remaining_collectible_minor, 0);

  const nowFormatted = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal thermal-receipt-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
        style={{ maxWidth: '420px', width: '100%', padding: '16px' }}
      >
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--primary, #0969da)' }}>
              CONTROL DE CAJA · EN VIVO
            </span>
            <h2 id="audit-modal-title" style={{ margin: '4px 0 0', fontSize: '18px' }}>
              Arqueo de Caja (Corte X)
            </h2>
          </div>
          <button type="button" className="secondary" style={{ minHeight: '32px', padding: '4px 10px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 80mm Thermal Receipt */}
        <div className="thermal-ticket" style={{ margin: '0 auto', border: '1px dashed #ccc', padding: '16px 12px' }}>
          <div className="thermal-header">
            <h3>EL ENCANTO HUAMANGUINO</h3>
            <p>Emisor y dirección de demostración</p>
            <div className="thermal-divider" />
            <h4 style={{ margin: '4px 0', fontSize: '14px', textTransform: 'uppercase' }}>
              ARQUEO DE CAJA · CORTE X
            </h4>
            <span style={{ fontSize: '11px', color: '#666' }}>
              [REPORTE PARCIAL DE TURNO · NO CIERRA CAJA]
            </span>
          </div>

          <div className="thermal-divider" />

          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div><strong>Fecha/Hora:</strong> {nowFormatted}</div>
            <div><strong>Cajero:</strong> {owner}</div>
            <div><strong>Turno:</strong> {shiftLabel}</div>
            <div><strong>Estado de Caja:</strong> {activeSession?.state === 'open' ? 'ABIERTA' : 'CERRADA'}</div>
          </div>

          <div className="thermal-divider" />

          {/* Dinero Físico en Cajón */}
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>DINERO FÍSICO (CAJÓN)</div>
            <table className="thermal-table" style={{ width: '100%', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td>Fondo Inicial de Caja</td>
                  <td style={{ textAlign: 'right' }}>{money(openingMinor)}</td>
                </tr>
                <tr>
                  <td>Cobros en Efectivo (+)</td>
                  <td style={{ textAlign: 'right' }}>{money(cashNetMinor)}</td>
                </tr>
                <tr>
                  <td>Ingresos de Caja (+)</td>
                  <td style={{ textAlign: 'right' }}>{money(paidInMinor)}</td>
                </tr>
                <tr>
                  <td>Salidas / Retiros (-)</td>
                  <td style={{ textAlign: 'right' }}>- {money(paidOutMinor)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                  <td>EFECTIVO ESPERADO EN CAJA</td>
                  <td style={{ textAlign: 'right' }}>{money(expectedCashInDrawer)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="thermal-divider" />

          {/* Cobranzas por Medio */}
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>VENTAS COBRADAS POR MEDIO</div>
            <table className="thermal-table" style={{ width: '100%', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td>Efectivo ({cashPayments.length})</td>
                  <td style={{ textAlign: 'right' }}>{money(cashNetMinor)}</td>
                </tr>
                <tr>
                  <td>Tarjeta / POS ({cardPayments.length})</td>
                  <td style={{ textAlign: 'right' }}>{money(cardNetMinor)}</td>
                </tr>
                <tr>
                  <td>Billetera Digital Yape ({yapePayments.length})</td>
                  <td style={{ textAlign: 'right' }}>{money(yapeNetMinor)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                  <td>TOTAL COBRADO EN TURNO</td>
                  <td style={{ textAlign: 'right' }}>{money(totalCollectionsMinor)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="thermal-divider" />

          {/* Resumen Fiscal SUNAT */}
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>DOCUMENTOS SIMULADOS · SIN VALIDEZ TRIBUTARIA</div>
            <p style={{ fontSize: '10px' }}>Emisiones dentro de este turno. No equivalen a sus cobros ni a una devolución de dinero.</p>
            <table className="thermal-table" style={{ width: '100%', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td>Boletas B001 ({boletas.length})</td>
                  <td style={{ textAlign: 'right' }}>{money(totalBoletasMinor)}</td>
                </tr>
                <tr>
                  <td>Facturas F001 ({facturas.length})</td>
                  <td style={{ textAlign: 'right' }}>{money(totalFacturasMinor)}</td>
                </tr>
                {creditNotes.length > 0 && (
                  <tr style={{ color: '#b91c1c' }}>
                    <td>Notas de Crédito ({creditNotes.length})</td>
                    <td style={{ textAlign: 'right' }}>- {money(totalCreditNotesMinor)}</td>
                  </tr>
                )}
                <tr>
                  <td>IGV Neto (18%)</td>
                  <td style={{ textAlign: 'right' }}>{money(totalIgvMinor)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                  <td>VENTAS FISCALES NETAS</td>
                  <td style={{ textAlign: 'right' }}>{money(netFiscalBilledMinor)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="thermal-divider" />

          {/* Salón y Pendientes */}
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>SALÓN Y PENDIENTES</div>
            <div>Mesas abiertas con saldo: <strong>{openChecks.length}</strong></div>
            <div>Saldo pendiente por cobrar: <strong>{money(pendingBalanceMinor)}</strong></div>
          </div>

          <div className="thermal-divider" />

          <div className="thermal-footer" style={{ marginTop: '16px' }}>
            <div style={{ marginTop: '24px', borderTop: '1px solid #333', width: '70%', margin: '24px auto 4px auto' }} />
            <p>Firma Cajero / Supervisor</p>
            <p style={{ fontSize: '9px', color: '#888' }}>
              QatuPOS · Laboratorio Presencial · El Encanto Huamanguino
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="button-row no-print" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
          <button type="button" className="secondary" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="primary" onClick={handlePrint}>
            🖨️ Imprimir Ticket de Arqueo (80mm)
          </button>
        </div>
      </section>
    </div>
  );
}
