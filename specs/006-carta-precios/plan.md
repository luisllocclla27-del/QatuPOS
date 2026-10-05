# Implementation Plan: carta configurable con revisión de precios

## 1. Arquitectura y Enfoque Técnico

El incremento 006 extiende el núcleo comercial existente sin crear subsistemas paralelos.
La persistencia y el bloqueo atómico siguen centralizados en `services/commerce/src/authority/repository.ts` mediante `SELECT ... FOR UPDATE` sobre `branch_state`.

### Componentes Clave:
1. **Contratos Compartidos (`packages/contracts/src/pos.ts` & OpenAPI)**:
   - Ampliación de `Product`: versión, campos requeridos.
   - Comandos administrativos: `catalog.product.create` y `catalog.product.update` (manejados por `executeCommand` atómicamente).
   - Estructura de auditoría de catálogo: `CatalogAuditEntry`.
   - Entidad y respuestas de cotización: `OrderQuote`, `QuoteRequest`, `QuoteResponse`.
   - Modificación de `OrderCreateCommand`: requiere `quote_id: UUID`. La orden se enlaza a la cotización inmutable.
   - Nuevos códigos de error: `QUOTE_EXPIRED`, `PRICE_CHANGED`, `PRODUCT_UNAVAILABLE`, `COMMERCIAL_HISTORY_LOCKED`, `CATALOG_VERSION_CONFLICT`.

2. **Base de Datos (`database/migrations/006_catalog_and_quotes.sql`)**:
   - Tabla `order_quotes`: almacena cotizaciones inmutables con TTL de 120s, clave primaria `(tenant_id, branch_id, id)`, referencias a la visita, actor y participante (staff o guest), líneas en formato JSONB con versiones congeladas y total en céntimos.
   - Tabla `catalog_audit`: auditoría detallada de cambios en productos (actor, timestamp, operación, versión anterior, nueva versión, delta y motivo).
   - Índices de expiración para limpieza periódica y consulta rápida.

3. **Dominio (`packages/domain/src/index.ts`)**:
   - En `order.create`: verificación de la cotización contra el estado actual de los productos. Si cualquier producto en la cotización ha cambiado de precio o versión o se encuentra inactivo, emitir `PRICE_CHANGED` o `PRODUCT_UNAVAILABLE`.
   - En `catalog.product.create`: validar precio positivo, estación válida (`cocina`, `heladeria`, `caja`), y existencia del ítem de stock en caso de política unitaria.
   - En `catalog.product.update`: verificar `expected_version`. Si el producto ya tiene historial en `state.orders`, impedir alteraciones en `station`, `stock_policy` o `stock_item_id`.
   - Registrar la auditoría correspondiente en `state.catalog_audit`.

4. **Servicio y Rutas HTTP (`services/commerce/src/`)**:
   - `POST /v1/pos/quotes`: para personal autorizado.
   - `POST /v1/pos/guest/quotes`: para clientes con sesión activa en su visita.
   - Validación y guardado en `order_quotes`.
   - Endpoints de administración de carta para admin (`POST /v1/pos/catalog/products`, `PATCH /v1/pos/catalog/products/:id`).

5. **Frontend (`apps/pos/src/`)**:
   - En `pos-app.tsx`: pestaña "Carta" visible para administradores. Listado con filtros, formulario de creación y edición con validación y confirmación.
   - En la toma de pedidos del mozo (`pos-app.tsx`) y del cliente (`guest-app.tsx`):
     - Paso de revisión que obtiene la cotización oficial del servidor.
     - Diálogo de confirmación con detalle de precios y total en S/.
     - Detección de error `PRICE_CHANGED`: mensaje destacado ("El precio cambió. Revisa tu pedido"), comparativa de precios y solicitud de nueva confirmación con el valor vigente.

---

## 2. Compatibilidad y Migración

- La migración es 100% aditiva.
- Los productos existentes en el seed inicial se conservan con versión 1.
- No se reescribe ni altera el historial de órdenes pasadas ni los cierres de caja.
