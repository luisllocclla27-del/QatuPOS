# Decisiones012

- Corrección basada en evidencia del código: create no comprobaba ID duplicado; update mutaba estación/política antes del diff e ignoraba SKU sin policy; void no consultaba congelamiento de custodia.
- Compatibilidad por estación, no Caja exclusivamente: el seed ya controla helado por unidad en Heladería. Aclaración de006 US1 cuya redacción mencionaba solo Caja; se usa catálogo configurable y política del piloto.
- ID conflict nuevo409 para distinguir conflicto de identidad de optimistic version e idempotency. Mismo operation_id continúa recuperando el efecto ya registrado antes del dominio.
- Campos omitidos conservan estado, excepto retirar policy unit → none limpia SKU omitido. Un SKU explícito contradictorio nunca se descarta silenciosamente.
- Bloquear solo efectos sobre stock contado; una anulación sin stock no cambia dinero físico ni el corte de efectivo. Ajustar cuenta no registra un pago.
- No nuevo proveedor, dependencia, migración ni cambio de datos interactivos. Sin consulta fiscal externa porque este incremento no introduce reglas tributarias.
