# Actualización03/10/2026 · catálogo y custodia

El Encanto Huamanguino. Incremento012 sobre baseline011; todo el desarrollo permanece en esta carpeta. **ready_for_review:204 pruebas de10 archivos,12 recorridos de navegador, tipos, build y25 controles documentales aprobados.** Revisión financiera independiente pendiente; no operación real habilitada.

## Mejoras de negocio

1. Identidad única por tenant/local, también para productos inactivos y UUID con letras en otro casing. Carrera de dos altas con mismoID produce una sola aceptación; replay no duplica efecto.
2. Stock por unidad exige SKU de la misma estación. Heladería no puede consumir cerveza de Caja; varias ofertas pueden usar el mismo stock común sin sobreselling.
3. Edición construye y valida estado candidato antes de mutar. Un SKU enviado sin stock_policy deja de ignorarse; retirar unit limpia vínculo omitido; campos contradictorios se rechazan.
4. Auditoría completa: estación, política y SKU conservan valor anterior/nuevo, versiones, actor/operación/motivo. Cambios de precio/nombre no alteran pedidos/reservas/tickets históricos; ruta bloqueada desde el primer pedido, aunque se anule.
5. Traspaso: no liberar reservas ni reintegrar bebidas de Caja durante prepared/declared/disputed. Cocina/Heladería siguen; anulación de bebida totalmente entregada sin reintegro no modifica stock contado ni dinero físico. Tras aceptar custodia se puede volver a anular pendientes.
6. Carta más clara: elegir inventario compatible, sin selección automática; aviso si la estación no tiene SKU; submit bloqueado hasta selección válida. Stock vinculado visible en listado, auditoría con nombres/importe/estación legibles y fecha completa. Caja explica entrega directa sin ticket.

La retención de liberación de reservas durante traspaso es una política conservadora nueva; nuevas reservas siguen pendientes según el flujo existente. Revisar con el restaurante esa política antes del piloto: no confundir reservas con unidades físicas contadas.

## Evidencia y fallos conservados

- Antes del código:16 regresiones fallaron de24 casos nuevos. [Salida original](../construction/runs/2026-10-03-catalogo-custodia/regressions-before.txt).
- Después del correctivo:204 pruebas en10 archivos;27 nuevas de dominio/PG, incluyendo tres casos añadidos tras el correctivo (UUID case, stock compartido y SKU nulo).
- Primer E2E:11 anteriores pasaron y el nuevo falló por selector exacto del botón Carta. Segundo intento aislado avanzó hasta alta y falló por selector exacto de etiqueta Estación. Se conservaron contextos/capturas; se ajustaron selectores y se mantuvieron todas las aserciones de negocio. Recorrido aislado luego aprobado.
- OpenAPI y WorkOrder válidos contra validadores estrictos. Spec Kit prerequisite012 aprobado, sin hooks ni checklists012 por aprobar.
-25 controles documentales del SDD padre aprobados; no cubren runtime ni aceptan automáticamente spec012. Matriz de trazabilidad en specs/012-catalogo-custodia/analysis.md.
- Suite final de navegador:12/12 en1.9min. [Salida](../construction/runs/2026-10-03-catalogo-custodia/e2e-final.txt). [Build aprobado](../construction/runs/2026-10-03-catalogo-custodia/build-final.txt). Captura final de Carta en screens/catalogo-custodia-012.png, inspeccionada visualmente.
- Reinicio solo del árbol dev verificado del piloto; nuevo proceso `pnpm dev` (sesión14434), puertos3000/4000. API health ok laboratory y /cliente200. No migrar ni reseed; fingerprints de branch_state antes/después iguales (dos locales sintéticos), guardados en run/runtime-{before,after}.json. Esto prueba conservación del estado comercial observado, no certifica backup/restauración.

## Alcance y pendientes

Root es autor: cambios de catálogo/stock no se autoaceptan financieramente.011 también conserva revisión independiente pendiente. No ejecutar commits, PR, despliegues ni modificaciones en Qatu.pe/Delivery. No migración nueva, reseed interactivo, proveedores/pagos reales, SUNAT, hardware ni recetas incorporados.

Próximo orden de prioridad:

1. Unificar MoneyMinor seguro con límites integer32 de columnas SQL; demostrar límites y acumulaciones, no solo porcentajes.
2. Definir ajustes de cuenta/void/descuento de días anteriores mediante bloqueo temporal o libro de ajustes versionado; no reescribir cierres firmados.
3. Conteo físico por debajo de reservas: registrar diferencia y reconciliar sin crear disponibles ficticios ni permitir entrega inexistente.
4. Historial de devolución/merma separado de contadores de entrega anulada y reintegros autorizados por custodia.
5. Recetas/escandallo y compras tras consistencia; pruebas físicas de impresoras y proveedor fiscal antes de habilitar operación real.

Contrato: [cambios012](../../specs/012-catalogo-custodia/contracts/changes.md). Asignación y hashes de entrega en docs/construction/runs/2026-10-03-catalogo-custodia/.
