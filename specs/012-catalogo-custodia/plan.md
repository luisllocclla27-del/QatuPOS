# Plan012

Reutilizar dominio puro y branch_state bajo bloqueo PostgreSQL del escritor existente. Stack/lockfile sin cambios. Un escritor root exclusivo según WorkOrder; sin subagentes en esta ejecución.

1. Definir estado final de vínculo y validar station/policy/SKU en dominio compartido para create/update. Agregar PRODUCT_ID_CONFLICT al contrato; no endpoint ni tabla nuevos.
2. Update construye Product candidato, compara campos, valida historial y registra diff antes de reemplazar; versiones y transacción existentes conservadas.
3. Void determina cantidad no entregada y entregada primero; antes de mutar, bloquea efectos sobre stock de Caja congelado. Las reservas nuevas del traspaso siguen la política anterior y no son existencia física.
4. Formulario filtra SKU por estación, selección vacía explícita y bloqueo de submit unit sin vínculo compatible. Mensajes por estación y estado comercial.
5. Regresiones unitarias primero, integración real PG para rollback/replay/concurrencia, navegador para edición y ayuda; suite/tipos/build y validador de planificación separado.

Paths: packages/domain/src/index.ts, packages/contracts/src/pos.ts, docs/contracts/pilot.openapi.json, apps/pos/src/components/catalog-management.tsx, tests/{unit,integration}/catalog-custody.test.ts, tests/e2e/zzzzzzzz-catalog-custody.spec.ts.

La dependencia es conducta local verificada de006/007/011, no aceptación global B07. Queda ready_for_review tras pruebas; revisar financieramente con otro revisor antes de aceptar tareas sensibles.
