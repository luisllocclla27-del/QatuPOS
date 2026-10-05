# Análisis de consistencia012

Revisión documental del autor, no aceptación independiente. Contrato preparado antes del cambio runtime, prerequisite Spec Kit validado con selector por proceso y sin alterar puntero global. No hooks before/after ni carpeta checklists específica012; no se modifican checklists de features anteriores.

| Requisito | Escenario | Evidencia prevista/implementada |
|---|---|---|
| CATC-FR-001 | CATC-AT-001 | Unit duplicate/inactive/case; PG concurrent IDs + replay |
| CATC-FR-002 | CATC-AT-002 | Unit mismatched station/none+SKU/Heladería; PG rollback |
| CATC-FR-003 | CATC-AT-003 | Unit SKU-only, omitted, null, transition; candidato validado |
| CATC-FR-004 | CATC-AT-003/004 | Diff completo en PG; stale409; historial después de void |
| CATC-FR-005 | CATC-AT-004 | Línea/ticket/stock congelados; dos ofertas comparten última unidad |
| CATC-FR-006 | CATC-AT-005 | Unit tres fases + reintegro + otras estaciones + después de aceptación; PG cero efectos |
| CATC-FR-007 | CATC-AT-001/005 | Operaciones/outbox/auditoría y agregado sin cambios en rechazo |
| CATC-FR-008 | CATC-AT-006 | Navegador selección por estación, vacío obligatorio, audit readable |

La política nueva retiene anulaciones que liberarían reservas de Caja durante el traspaso, aunque no cambien existencia física. Las reservas de pedidos nuevos continúan como pendientes conforme al flujo vigente. Esta asimetría es explícita y conservadora para el laboratorio: revisar operativamente con el restaurante si se requiere cancelar pendientes durante conteo sin desbloquear reintegros físicos. No anunciar operación homologada.

Sin migración ni reparaciones silenciosas de catálogo existente. Si hay datos históricos incompatibles, la edición no los convierte en válidos; requiere conciliación/versionado específico. Campos sensibles siguen pendientes de revisión independiente y no se marcan aceptados por el autor.

Pendientes fuera del incremento: diferencia entre máximo seguro de dinero y integer32 SQL; ajustes de consumos de días cerrados; conteos inferiores a reservas; conservación granular de entrega/devolución y merma. Se registran en reporte/continuidad, no se ocultan con mocks ni validación documental.
