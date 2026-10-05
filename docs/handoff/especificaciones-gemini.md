# Especificaciones de continuidad para Gemini Antigravity

Fecha: 02/10/2026. Proyecto: QatuPOS, piloto El Encanto Huamanguino.
Destino indicado por el usuario: Gemini Antigravity, «3.8 Flash High».

## 1. Autoridad y alcance del traspaso

Esta es una especificación de traspaso y una propuesta del siguiente incremento; no reemplaza SDD, constitución, contratos ni specs aceptadas. Los requisitos nuevos deben formalizarse y analizarse con Spec Kit antes de construir su flujo. Este traspaso no modifica aplicación, esquema SQL, API, dependencias ni datos.

Raíz de lectura general: `F:/PROYECTOS/QatuPOS`.
Única raíz de escritura del piloto: `F:/PROYECTOS/QatuPOS/el-encanto-huamanguino`.
Abrir esta última carpeta como workspace en Antigravity; mantener accesible la planificación del padre. El padre no es actualmente un repositorio Git; el piloto sí tiene Git y archivos sin seguimiento. No limpiar ni sobrescribirlos.

Lecturas obligatorias, con rutas relativas al piloto:

1. `../AGENTS.md` y `AGENTS.md`.
2. `../docs/SDD.md`, `../.specify/memory/constitution.md`.
3. `../docs/09-construccion-multiagente.md`, `../docs/10-base-tecnica-y-layout.md`, `../docs/12-piloto-marisqueria.md`.
4. `../specs/004-piloto-marisqueria/`, `../specs/001-mesas-qr-nfc/` y `../specs/002-facturacion-peru/` para sus dependencias.
5. `specs/005-clave-mesa/{spec,plan,tasks}.md`.
6. `README.md`, `docs/evidence/CONTINUIDAD.md`, `docs/construction/next-increments.md`.
7. `docs/contracts/pilot.openapi.json`, `packages/contracts/src/pos.ts`.
8. `docs/evidence/guest-orders-delivery.md`, `docs/evidence/guest-orders-review.md` y `docs/construction/runs/2026-10-02-guest-orders/delivery.json`.

Los reportes antiguos conservan evidencia histórica; confirmar los hashes actuales antes de usarlos como base de edición. No convertir documentación aprobada en capacidad implementada.

El SDD del padre conserva frases del momento de planificación como «no POS funcional». Para el estado ejecutable del piloto, contrastar su alcance con README, código y evidencia local posteriores; no borrar ni reescribir el SDD del padre para resolver esa diferencia histórica.

## 2. Producto y operación que se conservan

QatuPOS aspira a un núcleo configurable para restaurantes, pollerías, pizzerías, cafeterías, comida rápida y negocios pequeños. Qatu.pe ofrece vitrina/ecommerce; Delivery es una integración futura sobre el mismo núcleo comercial. No crear un fork financiero por negocio ni modificar esos proyectos externos.

Primer perfil: marisquería El Encanto Huamanguino.

| Actor o espacio | Operación obligatoria |
|---|---|
| Mozo | Dos terminales táctiles fijas y futura tablet; abre atención, toma tandas, habilita clave, consulta entregas. |
| Cocina | Recibe solo componentes de su estación; preparación y entrega por cantidades; ticketera pendiente de prueba física. |
| Heladería | Refrescos, helados y algunos postres; sus propios componentes y ticketera. |
| Caja | Gaseosa, agua y cerveza: entrega directa, stock/custodia y pagos; sin ticket de preparación. |
| Caja diurna/nocturna | Corte de turno, dinero y bebidas contados; recepción personal y diferencias auditadas. |
| Administración | Configuración autorizada, revisión de diferencias, información operativa y controles. |
| Cliente de mesa | Acceso limitado a la visita habilitada por mozo y a sus propios pedidos. |

El tipo de producto no decide automáticamente la estación: por ejemplo, un refresco puede ir a Heladería y una gaseosa a Caja. Se configura por identidad de producto, nunca por coincidencia del nombre.

Flujo de mesa obligatorio:

1. QR/NFC abre entrada pública; sin sesión válida muestra **Pedidos bloqueados**.
2. Mozo autenticado abre la atención y pulsa **Habilitar mesa y mostrar clave**.
3. Cliente introduce clave; servidor vincula su sesión a esa visita.
4. Mozo y cliente usan cuenta, precios, reservas y producción comunes. Cada navegador cliente solo ve sus tandas.
5. Pago parcial o incierto mantiene acceso. Pago total confirmado de cuenta positiva concluye clave y sesiones.
6. Preparación/entrega pendientes continúan después del pago. El personal libera la mesa cuando corresponda.
7. Reocupación genera una nueva visita y clave. La clave anterior nunca autoriza nueva ocupación.
8. Rotación/revocación terminan generaciones anteriores sin borrar pedidos.
9. «Cancelar la cuenta» en este flujo significa pagar; anular un pedido requiere otra capacidad todavía pendiente.

## 3. Base real y límites

Ya construido localmente: mesas/tandas, acceso de cliente con clave, permisos por servidor, órdenes privadas e idempotentes, estaciones, entrega directa, stock unitario, efectivo y resultados simulados de tarjeta/Yape, conteos ciegos, traspaso, cierre diario, notas internas y seguimiento de pedidos cliente.

Evidencia registrada al traspaso: 106 pruebas de reglas/contratos/API, cinco escenarios de navegador, tipos y build aprobados, revisión independiente y 25 controles documentales. El receptor debe reproducirla; estos números no son garantía perpetua ni objetivo de cobertura por cantidad.

Pendiente real: carta/personal del negocio, catálogo editable, recetas/merma/combos, anulaciones/devoluciones, compras, impresión física, QR/NFC físico, LAN/HTTPS, continuidad hub/offline, SUNAT, proveedores de pago, Qatu.pe/Delivery, restauración y aceptación con personal. No declarar listo para dinero real.

El snapshot actual informa capacidades simuladas/deshabilitadas. Polling del POS de cinco segundos y cliente de cuatro segundos: no afirmar realtime instantáneo ni funcionamiento offline.

Arquitectura actual:

- `apps/pos`: POS y ruta cliente `/cliente`.
- `packages/domain/src/index.ts`: reglas puras.
- `packages/contracts/src/pos.ts`: tipos compartidos.
- `services/commerce/src/authority/repository.ts`: único commit de efectos, idempotencia y outbox.
- `services/worker`: trabajo durable existente.
- `database/migrations`: migraciones.
- PostgreSQL: autoridad persistente; agregado de local bloqueado transaccionalmente, según decisión de almacenamiento del piloto.
- Runtime Node24, pnpm12.5.1; versiones exactas en package.json/lockfile. No instalar un stack nuevo por preferencia.

## 4. Siguiente incremento: carta configurable con revisión de precios

Objetivo: administrador configura carta sintética desde la aplicación; mozo y cliente reciben la misma carta; un cambio de precio no altera tandas existentes ni cobra un precio distinto del revisado sin nueva confirmación.

Referencias de planificación: B03/B21, MAR:T004, MAR:T025, MAR:T027, MAR-FR-002/MAR-AT-002. Son referencias parciales, no autorización para marcar completas las tareas integrales. El integrador debe crear una feature local y tareas propias cualificadas, comprobando colisiones y schema WorkOrder. Prefijo local sugerido CAT para requisitos, sin añadirlo al schema compartido por inferencia.

### 4.1 Alcance de la primera entrega

- Lista, búsqueda y filtros por categoría, estación y estado de venta.
- Alta de producto y edición de nombre, categoría, precio y habilitación.
- Asociación explícita con Cocina/Heladería/Caja.
- Producto con stock unitario referencia un recurso existente del local, compatible y validado; no se crea stock al editar carta.
- Deshabilitación reversible: impide nuevas órdenes, mantiene historia y entrega pendiente.
- Auditoría de actor, fecha, operación, motivo, versión anterior/nueva y campos cambiados.
- Carta y disponibilidad proyectadas por servidor a POS y cliente.
- Cotización de pedido versionada, vinculada a sesión/actor y visita, con importes calculados exclusivamente en servidor.
- Revisión expresa de nuevos importes cuando cambian datos comerciales relevantes.
- Alta/configuración solo para admin en servidor; ocultar botones no es autorización.

Fuera del primer incremento: editor de recetas, combos, unidades fraccionarias, impuestos configurables, promociones, precios por canal, importación real, nuevas estaciones, compras y editor de usuarios. Diseñar extensiones compatibles; no construirlas para completar una pantalla.

### 4.2 Reglas verificables propuestas

| ID local | Requisito |
|---|---|
| CAT-FR-001 | Todo precio PEN es entero en céntimos, dentro de límites exactos del núcleo; no usar punto flotante para calcular dinero. Primer editor exige precio positivo. |
| CAT-FR-002 | Cambios usan expected_version; dos editores concurrentes no se sobrescriben silenciosamente. |
| CAT-FR-003 | Operación de catálogo, auditoría y outbox se guardan atómicamente por el escritor existente. Igual intención se deduplica; cuerpo distinto con mismo ID falla. |
| CAT-FR-004 | Nombre/precio/ruta/política aceptados quedan congelados en cada línea; cambios del catálogo solo afectan nuevos pedidos. |
| CAT-FR-005 | Precio, estado de venta y versiones de productos de una cotización se fijan en servidor. Total y alcance no provienen del navegador. |
| CAT-FR-006 | Cotización no reserva stock ni carga cuenta, produce tickets o constituye aceptación de pedido. |
| CAT-FR-007 | Aceptación verifica sesión, visita, cotización, versiones, saldo, stock y reglas del día en la misma transacción comercial. |
| CAT-FR-008 | Si cambia precio, producto habilitado u otro dato comercial relevante antes de aceptar, rechazar sin efectos y pedir nueva revisión/confirmación; nunca sustituir precio silenciosamente. |
| CAT-FR-009 | Cambio de un producto ajeno al carrito no invalida por sí solo la cotización. Disponibilidad real se revalida al aceptar; no se garantiza por cotizar. |
| CAT-FR-010 | Misma operación previamente aceptada recupera su resultado sin nuevo cargo incluso tras cambios de carta; siempre revalidar acceso vigente antes de recuperar información privada. |
| CAT-FR-011 | Archivar producto no borra ni bloquea preparación/entrega ya aceptadas; no eliminar productos con referencias comerciales. |
| CAT-FR-012 | Primera entrega no permite cambiar estación, política ni vínculo de stock de un producto ya usado comercialmente. Exponer motivo; ampliar después con contrato/migración propios. |
| CAT-FR-013 | Sesión cliente no obtiene configuración administrativa, auditoría, stock interno, pagos o pedidos de otros navegadores. |
| CAT-FR-014 | Fallo de red conserva operación y estado incierto recuperable. No generar un ID nuevo ni reenviar automáticamente por timeout. |
| CAT-FR-015 | Catálogo actual y cotizaciones son autoridad servidor; caches/estado local de UI no autorizan pedidos ni cambios administrativos. |
| CAT-FR-016 | Migración aditiva conserva datos existentes. No editar una migración aplicada ni recrear la base interactiva. |

### 4.3 Diseño que debe cerrarse antes del endpoint

La feature debe incluir spec, plan, research, data-model, contratos, quickstart, tasks, checklist y análisis de coherencia. No duplicar la fuente HTTP canónica sin estrategia de integración.

Definir explícitamente:

- Identidad/versiones de producto y revisión de carta, eventos y política de compatibilidad.
- Cotización: ID opaco, actor/sesión y visita derivados, líneas exactas, versiones relevantes, importe PEN y expiración con reloj servidor.
- Expiración propuesta inicial: 120 segundos, configurada en servidor y probada con reloj controlable; es decisión a registrar, no valor actualmente implementado.
- Quote inmutable; al renovar se emite nueva cotización y la interfaz solicita confirmación.
- Guardar cotización de forma durable o autenticada verificable; no basarla en sessionStorage ni importes remitidos por cliente. Seleccionar opción con ADR.
- Contrato de aceptación común para mozo/cliente: quote_id, operation_id y control de versión necesario; no aceptar precio enviado.
- Todos los caminos que aceptan pedidos, incluidos staff y guest, deben pasar por la política comercial. No dejar un endpoint antiguo que la evada.
- Errores estables para conflicto de versión, cotización vencida/desactualizada, producto deshabilitado, stock insuficiente, acceso concluido y petición inválida.
- Si la cotización queda vigente pero cambia visit_version, diferenciar conflicto operativo de cambio comercial y recuperar explícitamente; nunca volver a enviar a ciegas.
- Revalidación, orden de bloqueos, deduplicación y permisos bajo el escritor existente.
- Migración de estado y líneas históricas. No inventar retrospectivamente una versión comercial desconocida; marcar legado explícitamente y conservar valores aceptados.
- Compatibilidad UI/API y pruebas anteriores: adaptar a los nuevos contratos sin eliminar las garantías que verifican.

Cambiar representación de persistencia no es requisito para esta sección; evitar una normalización total simultánea.

### 4.4 Experiencia requerida

Configuración: tabla/lista legible, búsqueda, campos con etiquetas, precio S/, estación clara, estado visible, guardar con resultado persistente y conflicto recuperable. No convertir cada tecla en escritura remota. Cambios de precio/estado muestran resumen antes de guardar.

Pedido: borrador → revisión con cotización → confirmación → envío durable/resultado pendiente → registrado o error recuperable. Mostrar «El precio cambió. Revisa tu pedido» y comparación cuando proceda; no confirmar ni reenviar por el usuario.

Catálogo con producto deshabilitado: impedir nuevos envíos y conservar observaciones del borrador para que el usuario decida retirarlo/cambiarlo. Stock agotado explica el problema sin exponer inventario privado a cliente.

Mozo: mantener tablet 1024×768 y terminal táctil. Cliente: comprobar 390×844. Controles de mínimo 44 px, contraste legible, foco visible, etiquetas accesibles y teclado. Validar sin desbordamientos horizontales ni errores de consola. La rapidez con personal real exige ensayo posterior.

### 4.5 Criterios de aceptación

1. Admin crea/edita producto sintético; POS y cliente muestran la misma versión y precio.
2. Cliente revisa Ceviche a S/35; admin cambia a S/38; confirmar cotización anterior no cobra ni reserva ni imprime. Nueva revisión a S/38 exige confirmación.
3. Pedido aceptado a S/35 permanece a S/35 tras cambio de carta a S/38.
4. Producto deshabilitado después de cotizar no se acepta; tandas anteriores siguen preparándose/entregándose.
5. Dos administradores editan la misma versión: uno confirma y otro recibe conflicto sin sobrescribir.
6. Cotización expirada se rechaza sin efectos; consultar/cotizar no genera reservas.
7. Dos dispositivos intentan última unidad: una aceptación como máximo; reserva/stock no negativos.
8. Respuesta perdida y recarga permiten recuperar un solo pedido con importe/rutas originales.
9. Cuenta pagada mientras se confirma pedido: orden transaccional inequívoco; acceso concluido impide aceptación.
10. Pago parcial/unknown mantiene reglas anteriores; actualización de carta no libera retenciones.
11. Mozo, cocina y cliente no pueden editar carta por HTTP ni suplantar tenant/rol; visita/sesión ajena no obtiene cotización.
12. Bebidas de Caja siguen sin ticket; cambiar nombre/precio no altera rutas históricas.
13. Los cinco recorridos existentes conservan privacidad, recuperación, caja/turnos y separación pago/entrega.
14. Reabrir tras reinicio conserva carta y no duplica operaciones.
15. Migración sobre copia efímera del estado previo conserva cuentas, stock, entregas, pagos y notas; documentar restore sin atribuir restauración física certificada.

## 5. Fases siguientes, sin construirlas juntas

| Orden | Capacidad | Condición previa |
|---|---|---|
| 1 | Carta/versiones/cotización | Contratos y migración del incremento anterior, regresión y revisión independiente. |
| 2 | Recetas, merma, combos | Modelo de unidades exactas y reserva por componente, cancelación y rutas multiestación. |
| 3 | Liberación/anulaciones/devoluciones | Estado financiero, inventario y fiscalidad coordinados; unknown no se resuelve por tiempo. |
| 4 | Impresión de red | Identificar modelos/conexión; bridge durable, ambigüedad/copia y prueba física Cocina/Heladería. |
| 5 | QR/NFC y LAN/HTTPS | Identidades, TLS, acceso seguro y recorrido con tablet/teléfonos reales. |
| 6 | SUNAT | Investigación vigente en fuentes oficiales, ruta/proveedor y sandbox técnicamente separados; estados fiscales propios. |
| 7 | Qatu.pe/Delivery | Contratos/adaptadores con simuladores; permiso explícito antes de modificar repos externos. |
| 8 | Operación comercial | Restauración, carga, observabilidad, soporte, formación, accesibilidad y aceptación del negocio. |

Hardware y preparación de entorno pueden investigarse en paralelo con propietarios y archivos separados. Esta tabla no cambia el DAG normativo ni autoriza ejecutar todas las fases de una vez.

Fiscalidad: la nota interna lleva **NO ES COMPROBANTE DE PAGO**; no se presenta como boleta/factura ni resuelve una obligación fiscal. Determinar requisitos vigentes en SUNAT antes de implementar emisión, series, XML/CDR, bajas y notas. Este traspaso no emite un criterio legal.

## 6. Verificación y entrega del receptor

Desde el piloto: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm validate:sdd`.
El último comando comprueba planificación del padre y guarda reporte propio: no prueba la nueva feature local. Añadir controles específicos de coherencia/contrato para el incremento sin alterar el validador para ocultar fallos.

Pruebas PostgreSQL en bases `qatupos_lab_test_*`; no limpiar `qatupos_lab`. Coordinar procesos propios antes de build/E2E: no compartir escrituras de .next ni matar todos los Node. No ejecutar setup/seed/migraciones sobre datos interactivos sin revisar su efecto.

Entregar: archivos, contrato/versiones, migración, resultados reproducibles, capturas sin secretos, revisión independiente, límites y siguiente dependencia. Actualizar continuidad con trabajo terminado y realmente pendiente. Si falta revisor externo, registrar **ready_for_review**, no accepted para cambios sensibles.

Este documento no exige nuevos tests para cambios puramente editoriales; las pruebas propuestas corresponden al futuro incremento comercial.
