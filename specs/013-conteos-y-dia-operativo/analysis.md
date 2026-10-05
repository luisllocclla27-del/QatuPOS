# Consistencia013

Revisión de trazabilidad del autor; aceptación financiera independiente pendiente. Sin checklists013 ni hooks before/after. Selector por proceso validó prerequisite sin tocar feature.json global. Contrato preparado antes del dominio.

| Requisito / escenario | Evidencia |
|---|---|
| CDO-FR/AT-001 | Unit tres negativas old-day, cobranza anterior inmutable; PG cierre/discount rollback |
| CDO-FR/AT-002 | Unit día capturado/legacy/cerrado; helper UI sin día exige reconteo |
| CDO-FR/AT-003 | Unit reserva/entrega/reintegro retenidos, otros SKU permitidos; PG carrera |
| CDO-FR/AT-004 | Unit y PG counted<reserved conserva declaración/stock/operación |
| CDO-FR/AT-005 | Unit cobertura completa/sustituido/cancelación→reconteo; PG replay/revisión |
| CDO-FR/AT-006 | Unit scope Caja, motivo cero diferencia; helper self-approval; navegador roles diferentes |
| CDO-FR/AT-007 | Unit handover solapado bloqueado, Heladería independiente, IDs pendientes al cerrar |
| CDO-FR/AT-008 | Siete pruebas del selector y recorrido Caja→Admin con faltante/reconteo/historial |
| CDO-FR/AT-009 | PG transacción/quote/carrera/outbox/replay; aislamiento específico entre tenants con mismos SKU y aislamiento/CSRF de suite existente |
| CDO-FR/AT-010 | Navegador cambia reserva durante entrada de conteo y exige reinicio explícito |

Compatibilidad: campos de lectura opcionales por legacy, nuevas declaraciones siempre llevan día/versiones. Status superseded exige actualizar consumidores con contrato013; app/runtime se entregan juntos. El reconteo preserva registros originales y retención hasta aprobar.

Cambios sensibles053/054 quedan probados pero no aceptados por su autor. No adjudicar cumplimiento de MAR-FR-019 completo: falta libro de ajustes posterior; aquí se cierra el bypass ordinario con un bloqueo explícito. MoneyMinor/SQL integer32 continúa pendiente.

Límite operativo: el seed tiene un administrador. Conteo realizado por Caja puede aprobarlo Administración; conteo propio de Administración (p.ej. Heladería) necesita otro administrador configurado. No ampliar Caja a otra estación ni eliminar doble responsable para la demo.
