'use client';

import React, { useState } from 'react';
import type { Check, FiscalDocType, CustomerDocType } from '@qatu/contracts';
import { money } from '../lib/client';

interface IssueFiscalModalProps {
  check: Check;
  tableLabel: string;
  onClose: () => void;
  onSubmit: (data: {
    doc_type: FiscalDocType;
    customer_doc_type: CustomerDocType;
    customer_doc_number?: string;
    customer_name: string;
    customer_address?: string;
  }) => Promise<void>;
  busy?: boolean;
}

export default function IssueFiscalModal({
  check,
  tableLabel,
  onClose,
  onSubmit,
  busy = false
}: IssueFiscalModalProps) {
  const isOver700 = check.total_minor > 70000;
  const [docType, setDocType] = useState<FiscalDocType>('boleta');
  const [customerDocType, setCustomerDocType] = useState<CustomerDocType>(
    isOver700 ? 'dni' : 'sin_documento'
  );
  const [docNumber, setDocNumber] = useState('');
  const [customerName, setCustomerName] = useState(
    isOver700 ? '' : 'CLIENTES VARIOS'
  );
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState('');

  // Tax calculations
  const total = check.total_minor;
  const opGravada = Math.round((total * 100) / 118);
  const igv = total - opGravada;

  const handleDocTypeChange = (type: FiscalDocType) => {
    setDocType(type);
    setValidationError('');
    if (type === 'factura') {
      setCustomerDocType('ruc');
      setCustomerName('');
      setDocNumber('');
    } else {
      if (isOver700) {
        setCustomerDocType('dni');
        setCustomerName('');
        setDocNumber('');
      } else {
        setCustomerDocType('sin_documento');
        setCustomerName('CLIENTES VARIOS');
        setDocNumber('');
      }
    }
  };

  const handleCustomerDocTypeChange = (type: CustomerDocType) => {
    setCustomerDocType(type);
    setValidationError('');
    if (type === 'sin_documento') {
      setCustomerName('CLIENTES VARIOS');
      setDocNumber('');
    } else {
      setCustomerName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (docType === 'factura') {
      const cleanRuc = docNumber.trim();
      if (!/^(10|20)\d{9}$/.test(cleanRuc)) {
        setValidationError('El RUC debe tener 11 dígitos numéricos e iniciar con 10 o 20.');
        return;
      }
      if (!customerName.trim() || customerName.trim().length < 3) {
        setValidationError('La Razón Social de la factura es obligatoria (mínimo 3 caracteres).');
        return;
      }
    } else {
      // Boleta
      if (isOver700 || customerDocType === 'dni') {
        const cleanDni = docNumber.trim();
        if (!/^\d{8}$/.test(cleanDni)) {
          setValidationError('El DNI debe contener exactamente 8 dígitos numéricos.');
          return;
        }
        if (!customerName.trim() || customerName.trim().length < 3) {
          setValidationError('El nombre del cliente es obligatorio cuando se emite con DNI.');
          return;
        }
      }
    }

    await onSubmit({
      doc_type: docType,
      customer_doc_type: customerDocType,
      customer_doc_number: docNumber.trim() || undefined,
      customer_name: customerName.trim() || (customerDocType === 'sin_documento' ? 'CLIENTES VARIOS' : 'CLIENTE GENERAL'),
      customer_address: address.trim() || undefined
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="fiscal-dialog-title" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '28px' }}>
        <div className="panel-heading" style={{ marginBottom: '14px' }}>
          <div>
            <h2 id="fiscal-dialog-title">Emitir Comprobante Electrónico</h2>
            <span className="muted small">SIMULACIÓN · NO ES COMPROBANTE DE PAGO · {tableLabel}</span>
          </div>
          <span className="badge" style={{ fontSize: '13px' }}>{money(check.total_minor)}</span>
        </div>

        {/* Tab selector for Boleta vs Factura */}
        <div className="method-tabs" style={{ marginBottom: '18px' }}>
          <button
            type="button"
            className={docType === 'boleta' ? 'selected' : ''}
            onClick={() => handleDocTypeChange('boleta')}
          >
            🧾 Boleta de Venta (B001)
          </button>
          <button
            type="button"
            className={docType === 'factura' ? 'selected' : ''}
            onClick={() => handleDocTypeChange('factura')}
          >
            🏢 Factura Electrónica (F001)
          </button>
        </div>

        {validationError && (
          <div className="alert error" style={{ marginBottom: '14px' }}>
            <span>⚠️</span>
            <div>{validationError}</div>
          </div>
        )}

        {isOver700 && docType === 'boleta' && (
          <div className="alert warning" style={{ marginBottom: '14px' }}>
            <span>ℹ️</span>
            <div>
              <strong>Supera el umbral de S/ 700.00:</strong> Política sintética del simulador: solicita DNI y nombre. Validación legal y otras identificaciones quedan pendientes.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          {docType === 'boleta' && !isOver700 && (
            <div className="field">
              <span>Tipo de identificación:</span>
              <div className="method-tabs" style={{ gap: '6px' }}>
                <button
                  type="button"
                  style={{ minHeight: '38px', fontSize: '11px' }}
                  className={customerDocType === 'sin_documento' ? 'selected' : ''}
                  onClick={() => handleCustomerDocTypeChange('sin_documento')}
                >
                  Clientes Varios (Sin doc.)
                </button>
                <button
                  type="button"
                  style={{ minHeight: '38px', fontSize: '11px' }}
                  className={customerDocType === 'dni' ? 'selected' : ''}
                  onClick={() => handleCustomerDocTypeChange('dni')}
                >
                  Identificar con D.N.I.
                </button>
              </div>
            </div>
          )}

          {docType === 'factura' && (
            <>
              <label className="field">
                <span>R.U.C. del cliente (11 dígitos) *</span>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="20601234567"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </label>
              <label className="field">
                <span>Razón Social *</span>
                <input
                  type="text"
                  placeholder="Ej. CORPORACION ALIMENTARIA SAC"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Dirección Fiscal (opcional)</span>
                <input
                  type="text"
                  placeholder="Ej. Av. Mariscal Cáceres 456, Ayacucho"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </label>
            </>
          )}

          {docType === 'boleta' && (customerDocType === 'dni' || isOver700) && (
            <>
              <label className="field">
                <span>D.N.I. del cliente (8 dígitos) *</span>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="44556677"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </label>
              <label className="field">
                <span>Nombre Completo del Cliente *</span>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez Quispe"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  required
                />
              </label>
            </>
          )}

          {/* Tax Breakdown Preview */}
          <div
            style={{
              background: '#f9fbf7',
              border: '1px solid #e1e7db',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="muted">Op. Gravada:</span>
              <strong>{money(opGravada)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="muted">I.G.V. (18%):</span>
              <strong>{money(igv)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px dashed #ccd6c5',
                paddingTop: '6px',
                marginTop: '4px',
                fontSize: '14px',
                color: 'var(--teal)'
              }}
            >
              <span>Total Comprobante:</span>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Emitiendo en servidor...' : 'Emitir Comprobante Fiscal →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
