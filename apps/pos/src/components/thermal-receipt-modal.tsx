'use client';

import React from 'react';
import type { FiscalDocument, TableVisit, Check, Order } from '@qatu/contracts';
import { money } from '../lib/client';
import { accountAmounts } from '../lib/sales';

export interface PrecuentaData {
  tableLabel: string;
  visit: TableVisit;
  check: Check;
  orders: Order[];
  waiterName?: string;
  cutAt?: string;
}

interface ThermalReceiptModalProps {
  mode: 'precuenta' | 'fiscal';
  precuenta?: PrecuentaData;
  fiscalDoc?: FiscalDocument;
  onClose: () => void;
  onOpenIssueModal?: () => void;
}

export default function ThermalReceiptModal({
  mode,
  precuenta,
  fiscalDoc,
  onClose,
  onOpenIssueModal
}: ThermalReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const isPrecuenta = mode === 'precuenta' && precuenta;
  const isFiscal = mode === 'fiscal' && fiscalDoc;

  // Precuenta line items calculation
  const precuentaItems = React.useMemo(() => {
    if (!precuenta) return [];
    const items: { name: string; qty: number; unitPrice: number; total: number }[] = [];
    for (const o of precuenta.orders) {
      for (const l of o.lines) {
        const activeQty = l.quantity - (l.voided_quantity ?? 0);
        if (activeQty > 0) {
          items.push({
            name: l.product_name,
            qty: activeQty,
            unitPrice: l.unit_price_minor,
            total: l.unit_price_minor * activeQty
          });
        }
      }
    }
    return items;
  }, [precuenta]);

  const precuentaTotal = precuenta?.check.total_minor ?? 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal thermal-receipt-container"
        role="dialog"
        aria-modal="true"
        aria-label={isPrecuenta ? 'Pre-cuenta de Mesa' : 'Comprobante Fiscal'}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="button-row no-print" style={{ justifyContent: 'space-between', marginBottom: '14px' }}>
          <span className="badge" style={{ fontSize: '11px', background: fiscalDoc?.doc_type === 'nota_credito' ? '#fee2e2' : undefined, color: fiscalDoc?.doc_type === 'nota_credito' ? '#991b1b' : undefined }}>
            {isPrecuenta ? '📋 Pre-cuenta de Mesa' : fiscalDoc?.doc_type === 'nota_credito' ? '❌ Nota de Crédito Electrónica' : `🧾 ${fiscalDoc?.doc_type === 'factura' ? 'Factura' : 'Boleta'} Electrónica`}
          </span>
          <div className="button-row" style={{ gap: '8px' }}>
            <button type="button" className="primary" onClick={handlePrint} style={{ minHeight: '36px', padding: '6px 14px' }}>
              🖨️ Imprimir / guardar PDF
            </button>
            <button type="button" className="secondary" onClick={onClose} style={{ minHeight: '36px', padding: '6px 12px' }}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Printable thermal ticket 80mm container */}
        <div className="printable-receipt thermal-ticket">
          {/* Restaurant Header */}
          <div className="thermal-ticket-header">
            <h2>CEVICHERÍA EL ENCANTO HUAMANGUINO</h2>
            <p><strong>Emisor de demostración · sin identidad fiscal</strong></p>
            <p>Dirección y teléfono pendientes de configuración</p>
            <div className="thermal-divider" />
            {isPrecuenta ? (
              <>
                <h3 style={{ margin: '4px 0', fontSize: '14px', textTransform: 'uppercase' }}>PRE-CUENTA DE MESA</h3>
                <p style={{ fontSize: '10px', color: '#666' }}>CUENTA DE CONSUMO - NO ES COMPROBANTE FISCAL</p>
                <p style={{ fontSize: '10px' }}>No confirma pago ni entrega de productos.</p>
              </>
            ) : (
              <>
                <h3 style={{ margin: '4px 0', fontSize: '14px', textTransform: 'uppercase', color: fiscalDoc?.doc_type === 'nota_credito' ? '#b91c1c' : undefined }}>
                  {fiscalDoc?.doc_type === 'nota_credito' ? 'NOTA DE CRÉDITO ELECTRÓNICA' : fiscalDoc?.doc_type === 'factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}
                </h3>
                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{fiscalDoc?.full_number}</p>
              </>
            )}
          </div>

          <div className="thermal-divider" />

          {/* Meta Information */}
          <div className="thermal-meta">
            {isPrecuenta && (
              <>
                <div className="thermal-meta-row">
                  <span>MESA:</span>
                  <strong>{precuenta?.tableLabel}</strong>
                </div>
                <div className="thermal-meta-row">
                  <span>FECHA:</span>
                  <span>{new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</span>
                </div>
                <div className="thermal-meta-row">
                  <span>HORA:</span>
                  <span>{new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="thermal-meta-row"><span>CORTE:</span><span>{new Date(precuenta?.cutAt ?? new Date()).toLocaleString('es-PE', {timeZone:'America/Lima'})}</span></div>
                <div className="thermal-meta-row"><span>VERSIÓN CUENTA:</span><span>{precuenta?.check.version}</span></div>
              </>
            )}

            {isFiscal && fiscalDoc && (
              <>
                <div className="thermal-meta-row">
                  <span>FECHA EMISIÓN:</span>
                  <span>{new Date(fiscalDoc.created_at).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</span>
                </div>
                <div className="thermal-meta-row">
                  <span>HORA EMISIÓN:</span>
                  <span>{new Date(fiscalDoc.created_at).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="thermal-meta-row">
                  <span>CLIENTE:</span>
                  <strong>{fiscalDoc.customer_name}</strong>
                </div>
                <div className="thermal-meta-row">
                  <span>{fiscalDoc.customer_doc_type === 'ruc' ? 'R.U.C.:' : fiscalDoc.customer_doc_type === 'dni' ? 'D.N.I.:' : 'DOC.:'}</span>
                  <span>{fiscalDoc.customer_doc_number || 'SIN DOCUMENTO'}</span>
                </div>
                {fiscalDoc.customer_address && (
                  <div className="thermal-meta-row">
                    <span>DIRECCIÓN:</span>
                    <small>{fiscalDoc.customer_address}</small>
                  </div>
                )}
                <div className="thermal-meta-row">
                  <span>MONEDA:</span>
                  <span>SOLES (PEN)</span>
                </div>
                {fiscalDoc.modified_document_full_number && (
                  <div className="thermal-meta-row" style={{ color: '#b91c1c', fontWeight: 'bold' }}>
                    <span>DOC. MODIFICA:</span>
                    <span>{fiscalDoc.modified_document_full_number}</span>
                  </div>
                )}
                {fiscalDoc.sunat_reason_code && (
                  <div className="thermal-meta-row">
                    <span>MOTIVO SUNAT:</span>
                    <span>{fiscalDoc.sunat_reason_code} - {fiscalDoc.sunat_reason_description}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="thermal-divider" />

          {/* Line items table */}
          <table className="thermal-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>CANT</th>
                <th>DESCRIPCIÓN</th>
                <th className="text-right" style={{ width: '60px' }}>P.UNIT</th>
                <th className="text-right" style={{ width: '60px' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {isPrecuenta &&
                precuentaItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.qty} u.</td>
                    <td>{item.name}</td>
                    <td className="text-right">{money(item.unitPrice)}</td>
                    <td className="text-right">{money(item.total)}</td>
                  </tr>
                ))}

              {isFiscal &&
                fiscalDoc &&
                fiscalDoc.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.quantity} u.</td>
                    <td>{item.product_name}</td>
                    <td className="text-right">{money(item.unit_price_minor)}</td>
                    <td className="text-right">{money(item.subtotal_minor)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="thermal-divider" />

          {/* Totals */}
          <div className="thermal-totals">
            {isPrecuenta && (
              <>
                {precuenta?.check.discount_minor && precuenta.check.discount_minor > 0 ? (
                  <>
                    <div className="thermal-total-row">
                      <span>SUBTOTAL CONSUMOS:</span>
                      <span>{money(precuentaItems.reduce((s, it) => s + it.total, 0))}</span>
                    </div>
                    <div className="thermal-total-row" style={{ color: '#c9510c' }}>
                      <span>
                        DESCUENTO ({precuenta.check.discount_kind === 'percentage' ? `${precuenta.check.discount_percent}%` : 'COMERCIAL'}):
                      </span>
                      <span>- {money(precuenta.check.discount_minor)}</span>
                    </div>
                  </>
                ) : null}
                <div className="thermal-total-row grand-total">
                  <span>TOTAL CONSUMO:</span>
                  <span>{money(precuentaTotal)}</span>
                </div>
                <div className="thermal-total-row" style={{ marginTop: '6px' }}>
                  <span>PAGADO HASTA AHORA:</span>
                  <span>{money(precuenta?.check.paid_minor ?? 0)}</span>
                </div>
                <div className="thermal-total-row">
                  <span>SALDO PENDIENTE:</span>
                  <strong>{money(precuenta ? accountAmounts(precuenta.check).pending : 0)}</strong>
                </div>
                {!!precuenta?.check.held_minor && <div className="thermal-total-row"><span>RETENIDO · AÚN NO CONFIRMADO:</span><strong>{money(precuenta.check.held_minor)}</strong></div>}
                <div className="thermal-total-row"><span>LIBRE PARA NUEVO COBRO:</span><strong>{money(precuenta?.check.remaining_collectible_minor ?? 0)}</strong></div>
              </>
            )}

            {isFiscal && fiscalDoc && (
              <>
                {(() => {
                  const itemsSum = fiscalDoc.items.reduce((s, it) => s + it.subtotal_minor, 0);
                  const discount = itemsSum > fiscalDoc.total_minor ? itemsSum - fiscalDoc.total_minor : 0;
                  return discount > 0 ? (
                    <>
                      <div className="thermal-total-row">
                        <span>SUBTOTAL BRUTO:</span>
                        <span>{money(itemsSum)}</span>
                      </div>
                      <div className="thermal-total-row" style={{ color: '#c9510c' }}>
                        <span>DESCUENTO GLOBAL:</span>
                        <span>- {money(discount)}</span>
                      </div>
                    </>
                  ) : null;
                })()}
                <div className="thermal-total-row">
                  <span>OP. GRAVADA:</span>
                  <span>{money(fiscalDoc.op_gravada_minor)}</span>
                </div>
                <div className="thermal-total-row">
                  <span>I.G.V. (18%):</span>
                  <span>{money(fiscalDoc.igv_minor)}</span>
                </div>
                <div className="thermal-total-row grand-total" style={{ color: fiscalDoc.doc_type === 'nota_credito' ? '#b91c1c' : undefined }}>
                  <span>{fiscalDoc.doc_type === 'nota_credito' ? 'TOTAL ANULADO / REVERTIDO:' : 'IMPORTE TOTAL:'}</span>
                  <span>{money(fiscalDoc.total_minor)}</span>
                </div>
              </>
            )}
          </div>

          {/* Fiscal QR and Digest Footer */}
          {isFiscal && fiscalDoc && (
            <div className="thermal-qr-container">
              <p className="thermal-footer-text"><strong>SIMULACIÓN · NO ES COMPROBANTE DE PAGO</strong><br />QR fiscal pendiente de integración y validación.</p>
              <p className="thermal-footer-text" style={{ marginTop: '8px', wordBreak: 'break-all', fontSize: '9px' }}>
                Código Hash: (interno; no es firma XML) <strong>{fiscalDoc.digest_hash.substring(0, 32)}...</strong>
              </p>
              <p className="thermal-footer-text">
                Representación impresa de la{' '}
                {fiscalDoc.doc_type === 'nota_credito' ? 'Nota de Crédito Electrónica' : fiscalDoc.doc_type === 'factura' ? 'Factura Electrónica' : 'Boleta de Venta Electrónica'}.
                <br />
                Consulta fiscal pendiente de integración.
                <br />
                <em>[Laboratorio QatuPOS · SIN VALIDEZ TRIBUTARIA]</em>
              </p>
            </div>
          )}

          {isPrecuenta && (
            <div className="thermal-footer-text" style={{ marginTop: '16px' }}>
              <p>¡Gracias por su preferencia!</p>
              <p style={{ fontSize: '9px', color: '#777' }}>
                Solicite su Boleta o Factura en Caja al cancelar su cuenta.
              </p>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <p className="small muted no-print">Abre el diálogo de impresión del navegador. Verifica el equipo y el papel; esto no confirma salida en una ticketera de red.</p>
        <div className="button-row no-print" style={{ marginTop: '18px', justifyContent: 'flex-end' }}>
          {isPrecuenta && onOpenIssueModal && (
            <button
              type="button"
              className="primary"
              onClick={() => {
                onClose();
                onOpenIssueModal();
              }}
            >
              🧾 Emitir Comprobante (Boleta / Factura) →
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
