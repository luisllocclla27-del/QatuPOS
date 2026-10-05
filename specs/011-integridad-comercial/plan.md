# Plan correctivo011

## Base y arquitectura

Conservar Node24/pnpm y lockfile, PostgreSQL branch_state y escritor de servicios commerce. Ver baseline/hashes y exclusión en docs/construction/runs/2026-10-02-auditoria-correcciones/implementation.json. Pruebas de usuario terminaron; entrega010 presente y hashes concordantes. Root controla superficies compartidas temporalmente en esta ejecución; no nuevos agentes.

## Orden

1. Cerrar semántica en spec/data-model/contracts y pruebas negativas antes del cambio.
2. exact.ts: producto/suma/porcentaje con BigInt, half-up; index.ts consume helper en descuentos/base/anulaciones/cierre.
3. dominio: actor/principal/consumed_at/expiry quote, bloqueo pago descontado y datos financieros privados.
4. dominio/persistencia: fiscal simulado pending; historial bloquea cambios; NC parcial/descripcion rechazadas; migración011 sin aplicar a base interactiva.
5. módulo puro apps/pos/src/lib/cash-report.ts: ventana y conteo ciego; componente usa ese resumen.
6. UI fiscal y pruebas: mensajes de simulación, sin QR decorativo, controles coherentes postNC.
7. pruebas API/PostgreSQL, unidad/reportes, E2E, typecheck/build y validación SDD. Actualización reportes con límites.

Hallazgo de ejecución: Next dev3000 bloqueaba pruebas3100 por compartir .next. NextConfig por fase separa .next (interactivo), .next-e2e (QATU_E2E=1) y .next-production (build/start). No cambia puertos ni mata la app del usuario; sin dependencias nuevas. Comprobar compatibilidad en build y E2E; paths adicionales grant del integrador.

## Revisión

Ningún autor acepta sus propios cambios financieros. Esta entrega queda ready_for_review aunque pruebas locales aprueben; revisor futuro reproduce escenarios. No inventar revisión independiente ni marcar aceptación financiera.

## Riesgos

fiscal_status issued antiguo es interpretación de simulación: migración/proyección normalizan solo docs accepted_simulated/annulled; no afectan un estado real de proveedor desconocido. Cortes fiscales por timestamps no son contabilidad tributaria. Precio actualizado conserva snapshots de líneas. Conteo ciego preserva null, no aplica default0.
