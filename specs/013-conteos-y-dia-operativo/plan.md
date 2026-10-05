# Plan013

Mismo escritor domain→branch_state PostgreSQL bajo FOR UPDATE y outbox transaccional. Stack/lockfile sin cambios, exclusivo root según WorkOrder; sin delegación.

1. Contrato antes de código: InventoryCount business_day_id opcional por legacy, status superseded y vínculo sustituto; DayClose pending_inventory_count_ids opcional. Errores BUSINESS_DAY_LOCKED y STOCK_RESERVATIONS_EXCEED_COUNT.
2. Helper de edición comercial comprueba todos los pedidos de cuenta pertenecen al día actual. No aplica a cobranza, entrega ni fiscal simulation.
3. Helper de conteo pendiente por SKU; guardas de reserva/entrega/reintegro/handover. Inventory.count valida scope, versiones y cobertura de reconteo antes de sustituir; Inventory.adjust valida día, otro responsable, motivo, todas las versiones/reservas antes de ajustar el conjunto.
4. UI usa snapshot/selector de elegibilidad como ayuda, servidor autoridad. Extraer pantalla InventoryPanel para mantener pos-app legible; selector puro de revisión informa legacy/stale/shortage/self/superseded. Caja declara sus bebidas y admin aprueba.
   Capturar versión al introducir cada cantidad y mantenerla estable frente al polling. Detectar cambio de versión/conjunto objetivo y exigir descartar valores/recontar; el servidor conserva rechazo de carrera todavía no visible.
5. Unit y PG con rechazo/rollback/concurrencia, navegador con stock retenido/revisión y conteo preservado. Tipos/suite/E2E/build/documentos, base interactiva preservada y continuidad.

Paths autorizados en WorkOrder, grants exclusivos contratos/config. Sin SQL nuevo. Aplicación antigua puede leer conteos nuevos solo después de actualizar enum: contrato/runtime consumidores se entregan juntos. No escribir archivos padre/Qatu/Delivery.
