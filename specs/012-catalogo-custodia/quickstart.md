# Verificar012

Desde raíz piloto; preservar qatupos_lab y procesos ajenos. Pruebas PG crean qatupos_lab_test_*.

1. pnpm exec vitest run tests/unit/catalog-custody.test.ts tests/integration/catalog-custody.test.ts
2. pnpm typecheck; pnpm test (ejecuciones separadas).
3. pnpm test:e2e; pnpm build; pnpm validate:sdd (separados). Validar WorkOrder JSON Schema y OpenAPI con Python del padre; no modificar validador padre.
4. Admin → Carta: nuevo producto Cocina con unit no tiene SKU compatibles en seed; Caja lista solo cerveza/gaseosa/agua; Heladería solo helado. Elegir SKU, motivo y guardar; antes de vender editar ruta y comprobar auditoría.
5. Ver rollback y carrera en pruebas PG. Traspaso: bebida pendiente no se anula hasta terminar custodia; Cocina/Heladería pueden seguir.

Datos/proveedores sintéticos, no SUNAT real. API dev no recarga automáticamente el dominio: reiniciar solo árbol dev verificado después del incremento si está activo.
