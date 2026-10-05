# Actualización y auditoría · 03/10/2026

Proyecto El Encanto Huamanguino. Revisión iniciada 02/10, finalizada 03/10 America/Lima. Código y documentos del piloto exclusivamente en esta carpeta. Feature [011](../../specs/011-integridad-comercial/spec.md).

## Base revisada y hallazgos

Se inspeccionaron los incrementos 006–010, código/contratos/migraciones y reportes. Git conserva archivos sin seguimiento; no se creó commit, reset, limpieza o despliegue. La prueba E2E del usuario estaba activa: no se modificó código hasta que terminó y apareció entrega010 con hashes concordantes. Último .last-run previo indicaba passed; sus cifras149/11 son del reporte anterior, no pruebas ejecutadas por root.

La reproducción [en memoria](../construction/runs/2026-10-02-auditoria-correcciones/reproduction.json) no toca PostgreSQL:
- Q01: quote consumida admitía2 pedidos con nuevas operaciones.
- Q02: otro empleado aceptaba quote de actor ajeno.
- D01: quitar descuento de7 a cuenta70 pagada63 volvía a deuda7.
- D02: mozo recibía discount_audit privada.
- D03: cierre registraba70 brutos frente a63 netos.
- F01: motivo07 parcial anulaba todo el documento.
- F02: documento accepted_simulated marcaba fiscal_status issued aunque capacidad real era false.

Revisión estática adicional: Corte X acumulaba documentos de todos los turnos, conteo null podía convertirse en cero, pseudo-QR solo dibujaba células aleatorias, y mensajes afirmaban transmisión/homologación sin proveedor/XML/firma/CDR. La revisión histórica de Gemini no prueba esos atributos. No se altera su evidencia original; este reporte la corrige en alcance y hallazgos.

## Correcciones implementadas

- Quote ligada a actor/principal/visita/local, usada una sola vez; replay de operación original sigue funcionando. Cocina no cotiza y vencimiento usa límite exclusivo.
- Descuentos no reabren pagos concluidos; remover requiere no cobrado/no retenido. Cálculos racionales/sumas exactas con BigInt; importe aplicado permanece congelado hasta cambio explícito.
- Venta del día suma cuentas netas, incluyendo voids/descuentos sin duplicar tandas. Cobro/venta siguen separados.
- Auditoría de descuento/motivos privados ocultos a mozo/cocina; fiscal/auditoría redacted en conteo ciego.
- Corte X delimita documentos a ventana de emisión del turno; no reconstruye esperado cuando está oculto.
- Documento simulado deja fiscal_status pending. Un historial simulado mantiene bloqueo de edición comercial; NC no devuelve pagos/stock ni habilita un cobro/documento duplicado.
- Simulador NC admite total01/06 y02factura; rechaza03/07 hasta contrato de ajuste específico.
- Eliminado pseudo-QR; tickets y mensajes sin declaración de transmisión, homologación o validez tributaria. Sin RUC/dirección/teléfono inventados del restaurante.
- Migración011 aditiva normaliza únicamente estados de simulaciones antiguas; probada repetible sobre base efímera conservando importes/historia. **No aplicada a qatupos_lab**.
- Desarrollo, pruebas y build usan .next/.next-e2e/.next-production separados; sin nuevas dependencias o cambios de lockfile. La primera tentativa E2E falló por un dev ya abierto; separación solucionó el conflicto.

Al retirar el RUC de emisor inventado, dos pruebas antiguas fallaron porque exigían ese identificador. Se corrigió la expectativa a un placeholder explícito de laboratorio, conservando serie, numeración e importes. Se repitió la suite; no se omitieron pruebas ni se atribuyó validez fiscal al placeholder.

## Evidencia de verificación

- 177 pruebas de 8 archivos de dominio/contratos/API, incluyendo 28 adicionales y PostgreSQL real desechable.
- 11 recorridos E2E aprobados con servidor3000 abierto; casos de privacidad, recuperación, catálogo, anulaciones, fiscal simulado, descuentos/NC. Suite existente comparte estado entre recorridos; no afirmar independencia de cada archivo.
- Typecheck y build aprobados. OpenAPI validado estrictamente y WorkOrder válido.
- 25 comprobaciones documentales del padre aprobadas; no verifican por sí solas feature011.
- Inspección visual del ticket de NC: sin pseudo-QR, aviso de simulación y saldo de caja preservado.
- Fuente y hashes finales en [entrega](../construction/runs/2026-10-02-auditoria-correcciones/delivery.json).

## Estado de aceptación

**Implementado y probado localmente; ready_for_review.** Root revisó trabajo de Gemini y es autor de estas correcciones: falta otro revisor para aceptarlas como cambios financieros. No hay revisión independiente inventada ni tareas integrales del padre completadas. Los checks de convergencia009 permanecen pendientes de aceptación; feature011 distingue implementación/evidencia y revisión.

Consultas oficiales: [SUNAT notas de crédito](https://cpe.sunat.gob.pe/tipos_de_comprobantes/nota_de_credito), [firma/certificado](https://cpe.sunat.gob.pe/certificado-digital), [Facturador SUNAT](https://cpe.sunat.gob.pe/sistema_emision/facturador_sunat). Un hash interno y un ticket visual no demuestran emisión electrónica por esas rutas; este laboratorio no ejecuta tal integración.

## Siguientes trabajos y límites detectados

1. Revisión independiente de011 y aceptación o devolución de tareas sensibles.
2. Formalizar feature010 (falta plan.md); WorkOrders históricos CAT/DSC/NCR usan prefijos no admitidos por schema común. No corregirlos inventando un histórico aceptado.
3. Catálogo: reforzar unicidad de product_id y compatibilidad estación/stock al alta y auditar cambios de ruta/política antes de carga real.
4. Fiscal futuro: identidad/proveedor, tasas/régimen vigentes, firma XML/UBL, CDR y estados propios, correlativos autoritativos/reemisión/devolución parciales. Simulación de18% no determina tasa real del negocio.
5. Límites de importes: alinear almacenamiento SQLinteger con MoneyMinor de dominio; la prueba deMAX_SAFE_INTEGER acredita cálculo puro, no persistencia de ese importe en toda tabla.
6. Descuentos/anulaciones de cuentas de días previos requieren tratamiento de ajustes temporal; cortes ya guardados no se reescriben.
7. Revisión de permisos/custodia en devoluciones durante traspaso y conservación de cantidades históricas de producción. No confundir devolución fiscal con flujo de devolución monetaria/stock.
8. Recetas/merma/fracciones/combos, impresoras reales, LAN/HTTPS/QR/NFC, hub/offline, Qatu.pe/Delivery, restore/carga/formación siguen pendientes. No comenzar todo junto ni modificar otros proyectos por inferencia.

Para continuidad exacta, leer [CONTINUIDAD](CONTINUIDAD.md). No usar ventas reales ni anunciar sistema 100% terminado.
