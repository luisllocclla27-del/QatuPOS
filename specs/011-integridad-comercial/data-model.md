# Modelo del incremento011

No agrega entidades comerciales ni un ledger.
OrderQuote: consumed_at no nulo invalida operación nueva. Principal staff se liga a actor_id; guest a actor_id y guest_session_id. Scope igual al agregado; fechas Date.parse validado.
Check: total_minor = importe neto vigente; paid/held independientes. Documento de laboratorio conserva fiscal_status=pending. Emisión simulada histórica bloquea edición por referencia fiscal_documents, no por fiscal_status real.
FiscalDocument: accepted_simulated/annulled son estados internos de ensayo, no CDR. NC total01/06 y02factura conserva importes, pagos y stock. Digest JSON no es firma XML.
Corte X: documentos en ventana de sesión; cierre usa snapshot del momento. Campos redacted => reporte indisponible, no0.
Migración011: actualiza solo fiscal_status JSON de simulaciones previas, preservando otros campos; bump de versión si se cambia.
