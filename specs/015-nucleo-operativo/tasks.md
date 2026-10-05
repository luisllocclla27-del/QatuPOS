# Tareas — incremento015

Root es el único escritor. WorkOrder B21, ejecución444db644-5c07-4516-b50c-2624ce1aff7f. `[x]` significa tarea no sensible documentada y verificada; las tareas sensibles implementadas permanecen pendientes hasta revisión independiente. No se autoaceptan dinero, inventario o aislamiento.

| Orden | Dependencia | Requisito | Archivos principales |
|---|---|---|---|
| T071→T072→T073 | Baseline014 y contrato | OPR-FR-001/008 | WorkOrder, spec/plan/contracts, tests/unit e integration, migration012, money.ts |
| T074→T075→T076→T077 | T073; estado/contrato actual | OPR-FR-002..007 | runtime.ts, operational.ts, scripts/operational, identity/repository, domain, StaffPanel/PosApp |
| T081 | T071; stock/custodia existente | OPR-FR-009 | domain/contracts, StockSupplyPanel/InventoryPanel, tests de recepción |
| T078→T079 | T073..077 y T081 | OPR-FR-008 | reportes, hashes y entrega integrada |
| T080 | T079 y contratos/hardware/configuración | Integración final | Nuevas asignaciones acotadas antes de editar |

- [x] MAR:T071 Verificar96 hashes del incremento014, asignación antes de escribir, Spec Kit por proceso y contratos015. Evidencia: WorkOrder versiones1..6, speckit-prerequisites.txt.
- [x] MAR:T072 Reproducir límite monetario y verificar controles operativos/personal/stock. Evidencia: regressions-money-before.txt y suites nuevas. Los fallos de fixtures corregidos se explican en research/reportes.
- [ ] MAR:T073 Implementado y probado: SQL bigint, límites, conversión exacta y transacciones. Pendiente aceptación independiente de dinero. Archivo migration012 y money-persistence.test.ts.
- [ ] MAR:T074 Implementado y probado: entorno operativo, base separada, bootstrap vacío, TLS y arranque compilado. Pendiente revisión de aislamiento y validación física. Evidencia: operational-smoke.json.
- [ ] MAR:T075 Implementado y probado: perfiles/membership, permisos, recursos, versiones y revocación transaccional. Pendiente revisión independiente.
- [ ] MAR:T076 Implementado y probado: credenciales individuales, reautenticación y bloqueo de escrituras en espera con sesión revocada. Pendiente revisión de seguridad.
- [ ] MAR:T077 Implementado y probado: Personal, login según modo, recepción física y configuración/arranque. Evidencia E2E; aceptación integrada pendiente.
- [x] MAR:T078 Evidencia integrada de352 tests,19 E2E, tipos/build, instalación HTTPS aislada, contratos/documentos, huella preservada e informe. Esta marca no acepta tareas financieras ni convierte el sistema en final.
- [ ] MAR:T079 Revisión independiente de dinero, inventario, sesiones y aislamiento; el autor no puede aceptar sus cambios.
- [ ] MAR:T080 Pendiente: conexiones Izipay/SUNAT/impresoras, respaldo/restauración, servicio/instalación LAN, datos reales y piloto completo. No completado por015.
- [ ] MAR:T081 Implementado y probado: SKU a cero y recepción física con referencia/versiones/roles/retención. Pendiente aceptación independiente de inventario.

Reanudar desde [continuidad](../../docs/evidence/CONTINUIDAD.md) y verificar delivery.json antes de asignar archivos. No ejecutar transformaciones antiguas ni modificar puntero global013.
