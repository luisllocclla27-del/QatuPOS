# Plan014

Stack y lockfile vigentes; root único escritor. Core domain puro sobre branch_state PostgreSQL FOR UPDATE, operaciones y outbox en transacción existente. Sin otro backend ni migración.

1. Contrato validado antes de dominio; helpers compartidos operations calculan modo/ofertas, orden y bloqueos de cierre. Proyección staff/guest reutiliza reglas servidor.
2. Responsable en TableVisit, sequence y prioridad/version en Order, claim en OrderLine, metadatos/kind en PrintJob. Asignación/prioridad/reclamo son comandos con autoridad/versión/motivo. Estado/auditoría/evento existentes; aviso de prioridad separado.
3. Service_mode y available_product_ids seguros en snapshot; guest filtra oferta con core. Noche deriva de última sesión vigente nocturna, incluyendo conteo de traspaso; no se abre Cocina por cambio de usuario o reloj.
4. CashCloseApproval opcional en BranchState legado, array inicial nuevo. Firma previa de admin distinta captura efectivo, stock, versión de sesión/día y estado final de su operación. Final revalida elegibilidad/sello; conteo discrepante de stock usa013 antes de cierre, aprobación solo efectivo.
5. Extraer ProductionPanel/NightClosePanel; integrar en POS sin duplicar cuentas. UI orienta pero no decide elegibilidad del servidor. Tablets/terminales mismos comandos, polling vigente; no promesa de tiempo real estricto o LAN homologada.
6. Regresiones unit/PG, helper UI, E2E FIFO/urgencia/retiro/noche/cierre. Types/suite/E2E/build/OpenAPI/WorkOrder/SDD; preservar datos interactivos y reports/hashes.

Dependencia013 probada localmente, no aceptación integral inferida. Contrato antes de tests y runtime; independiente MAR:T067 pendiente, financieras MAR:T064/065 no autoaceptadas.

Estación solo papel: line.ready.confirm {line_id,expected_version,quantity,reason} permite a waiter/cashier/admin registrar confirmación explícita de Cocina/Heladería, con actor/motivo auditados y cantidad pendiente validada. Nunca aplica Caja ni infiere preparación desde impresión/pago. UI solicita motivo; retirar/entregar siguen separados. Extiende OPS-FR/AT-004 y MAR:T063.

OPS-FR-011 / OPS-AT-011 — Recuperación de traspaso: handover.cancel {handover_id,expected_version,reason} exclusivamente administrador distinto de ambos custodios; prepared/declared/disputed y caja original contando sin sucesor. Conserva íntegros conteo, diferencias y firmas anteriores; registra cancelled_by/at/cancellation_reason; restaura la MISMA caja a open con versión incrementada, sin venta, movimiento de dinero/stock ni cambio de propietario o modo. Ingresante no ha recibido custodia. Permite al saliente conciliar pedidos/conteos y comenzar un traspaso nuevo. Un aceptado nunca se cancela. Duplicado idempotente; carrera accept/cancel tiene único ganador. MAR:T064.
