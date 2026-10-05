# Prompt de inicio para Gemini Antigravity

Preparado el 02/10/2026. Abrir `F:/PROYECTOS/QatuPOS/el-encanto-huamanguino` como workspace. Seleccionar el modelo deseado en Antigravity y pegar el contenido siguiente como instrucción inicial. El prompt no configura ni verifica el modelo.

---

Actúa como arquitecto e ingeniero responsable de continuar QatuPOS, piloto **El Encanto Huamanguino**. Trabaja sobre la aplicación existente y entrega un incremento funcional comprobado. Nuestra aspiración es competir con los mejores POS gastronómicos; conviértela en precisión, facilidad de operación, recuperación y evidencia. No certifiques superioridad, producción, hardware o cumplimiento fiscal sin pruebas.

## Tu primera misión

Construye **carta configurable con revisión de precios antes de aceptar pedidos**, después de formalizar sus contratos y tareas. Completa ese recorrido de extremo a extremo con datos sintéticos. Conserva el resto del sistema y prepara un reporte para el siguiente incremento.

Esta instrucción autoriza código y pruebas locales de esta sección. No autoriza despliegue, cobros/emisión reales, conexión a proveedores, importación de datos reales, commits/PRs ni cambios en Qatu.pe, Delivery o el proyecto padre. Resuelve elecciones reversibles del alcance sin pedir confirmaciones repetidas; si falta información, investiga primero lo disponible y continúa lo independiente.

## Empieza por comprender la base

Única carpeta de escritura: **F:/PROYECTOS/QatuPOS/el-encanto-huamanguino**.
Planificación general de solo lectura: **F:/PROYECTOS/QatuPOS**.

Lee primero:

- AGENTS.md local y ../AGENTS.md.
- docs/handoff/especificaciones-gemini.md: requisitos y aceptación de esta misión.
- docs/evidence/CONTINUIDAD.md, README.md, docs/construction/next-increments.md.
- ../docs/SDD.md, ../.specify/memory/constitution.md, ../docs/09-construccion-multiagente.md, ../docs/10-base-tecnica-y-layout.md, ../docs/12-piloto-marisqueria.md.
- Specs de mesa/piloto del padre usando sus nombres reales; specs/005-clave-mesa/{spec,plan,tasks}.md local.
- docs/contracts/pilot.openapi.json, packages/contracts/src/pos.ts, packages/domain/src/index.ts, services/commerce/src/authority/repository.ts.
- docs/evidence/guest-orders-delivery.md, docs/evidence/guest-orders-review.md y última entrega JSON.

Inspecciona Git, cambios existentes, versiones y scripts antes de editar. Hay trabajo sin seguimiento: consérvalo. No reset, clean, borrar base ni reconstruir aplicación desde cero. Comprueba hashes vigentes; el reporte es evidencia histórica, no sustituto de inspeccionar código.

## Reglas operativas que no debes romper

El mozo trabaja en dos terminales fijas y futura tablet. Cocina y Heladería tienen tickets por estación. Gaseosa, agua y cerveza de Caja son entrega directa **sin ticket de preparación**. Dinero, stock y custodia se concilian por turno; traspaso no es venta.

El cliente abre QR/NFC y encuentra pedidos bloqueados. Solo el mozo activa atención y muestra clave. La clave vincula una visita concreta; cada navegador cliente ve únicamente sus pedidos. Pago total confirmado de importe positivo concluye clave/sesiones. Parcial/unknown mantiene acceso y retenciones. Preparación/entrega continúa después del pago; reocupación exige nueva visita/clave. QR/URL/número de mesa no concede autoridad.

Mantén la sección Pedidos del cliente: pagar no marca entregado y una tanda histórica no abre ni accede a nueva ocupación.

Todo efecto comercial pasa por el escritor transaccional existente. Frontend no decide precios, tenant, rol, stock ni saldo. Dinero exacto en céntimos PEN; cantidades actuales enteras. Efecto, idempotencia y outbox atómicos. Un timeout no prueba fallo y un 202 no prueba aceptación. Reintentar conserva operación y cuerpo.

## Secuencia obligatoria de ejecución

1. Resume base comprobada y diferencias respecto del reporte en un máximo de diez puntos. Determina un solo incremento; no abras todos los módulos futuros.
2. Registra una nueva asignación WorkOrder conforme a ../specs/003-construccion-coordinada/contracts/work-order.schema.json: objetivo, baseline hashes, paquete, IDs cualificados existentes/propiamente definidos, contratos, paths, dependencia y pruebas. No reutilices WorkOrders históricos como autorización de escritura. Elige número libre para feature local y controla cualquier puntero local de forma serializada.
3. Aplica Spec Kit: spec → plan/research/data-model/contracts/quickstart → tasks → checklist/analyze. Usa las skills locales si tu entorno permite cargarlas; si no, sigue sus artefactos y criterios explícitamente, sin afirmar que ejecutaste herramientas ausentes. Usa SPECIFY_FEATURE_DIRECTORY por proceso si hay scripts. No escribas ni cambies el puntero del padre.
4. Cierra coherencia del contrato: producto/versionado, cotización por actor/visita, expiración, aceptación por staff/guest, permisos, errores, idempotencia, migración y compatibilidad. Lee todos los CAT-FR y criterios de aceptación del documento de handoff. No inventes CRUD genérico para cubrir un contrato faltante.
5. Implementa una migración aditiva y reglas/servicios sobre el núcleo. Nunca otro backend, ledger, inventario o estado de pedido. No cambiar almacenamiento completo durante este incremento.
6. Implementa interfaz admin de carta y revisión/confirmación de mozo y cliente. No dejes un camino viejo que acepte pedidos sin revisión comercial.
7. Ejecuta pruebas de contrato/dominio/API/PostgreSQL y navegador para casos normales, fallos, privacidad, precios concurrentes, última unidad, respuesta perdida y pago concurrente.
8. Haz revisión independiente sobre el resultado integrado. Si este entorno permite agentes, puedes distribuir constructor y revisor con paths exclusivos, contratos cerrados y un dueño por archivo; no escribir en paralelo contratos, migraciones, lockfile o pos-app.tsx. Si no existe revisor independiente, termina como ready_for_review y entrega instrucciones concretas para revisar. No bloquees la implementación local por esa ausencia.
9. Entrega evidencia y actualiza continuidad. No marques tareas integrales del padre por terminar este subconjunto.

## Escenario central que debes demostrar

Cliente revisa un Ceviche sintético a S/35.
Admin cambia precio a S/38 antes de la aceptación.
Al confirmar el precio anterior, servidor rechaza sin cargo/reserva/ticket.
UI muestra que cambió, conserva intención y exige revisar/confirmar S/38.
Una tanda ya aceptada a S/35 conserva nombre, precio, estación y política originales.
Dos dispositivos intentando última unidad producen como máximo una aceptación.
Archivar producto impide nuevas ventas y conserva entregas antiguas.
Recuperar una operación aceptada no vuelve a cargar ni cocinar, incluso tras cambiar la carta, pero nunca devuelve información con acceso cliente concluido.

La cotización no es pedido aceptado, no garantiza stock y no produce efectos. No aceptes total/precio/tenant/rol del navegador como autoridad. Versiones/cotización/stock/visita se revalidan en transacción. Expiración propuesta 120 s con reloj servidor: documenta decisión y prueba el límite.

Primera versión del editor: nombre/categoría/precio/habilitación; alta con estación explícita y stock unitario vinculado a recurso existente válido. Si un producto ya tiene uso comercial, bloquea cambios de estación/política/vínculo de stock hasta una ampliación contractual futura. No borrar historia. No cambiar recetas, impuestos, promociones ni canales dentro de esta misión.

## Calidad de la interfaz

Idioma español, operación clara para personal del restaurante, mensajes útiles sin jerga. Mantén diseño actual y extrae componentes por responsabilidad cuando ayude. Prueba tablet 1024×768 y móvil 390×844, controles de al menos 44 px, teclado, foco, contraste, vacíos, cargando, conflicto y desconexión. No uses texto «guardado» o «pedido registrado» antes de confirmación durable.

## Comprobaciones

Reproduce los scripts reales desde el piloto:

- pnpm typecheck
- pnpm test
- pnpm test:e2e
- pnpm build
- pnpm validate:sdd

La base registrada tenía 106 pruebas y cinco recorridos; conserva garantías, no un número artificial. Amplía pruebas de forma pertinente. Usa bases efímeras qatupos_lab_test_*; nunca limpies qatupos_lab. Coordina dev/build/E2E sobre procesos y .next propios. El validador documental del padre no demuestra la feature nueva ni su funcionamiento: valida también contratos y artefactos nuevos.

No borres ni saltes tests fallidos, no bajes permisos, no sustituyas PostgreSQL por mock permanente ni inventes resultados. No cambies dependencias/lockfile sin motivo y decisión explícita del integrador; respeta las versiones fijadas.

SUNAT, pagos, ticketeras, QR/NFC físico, LAN/HTTPS, hub y Qatu.pe/Delivery siguen pendientes. Toda integración real requiere contrato/gate específico; temas fiscales deben investigarse con fuentes oficiales vigentes cuando toque. Nota interna no es comprobante de pago.

## Comunicación y cierre

Informa avances con hallazgos y siguiente comprobación, sin largas transcripciones. Persiste hasta terminar la sección autorizada; no te limites a generar un plan o una pantalla estática. Ante bloqueo real, registra condición y continúa tareas independientes.

Antes de perder contexto o alcanzar un límite de uso, guarda un checkpoint en docs/evidence/CONTINUIDAD.md: última operación, archivos/base, tests ejecutados, fallos, tareas completas/pendientes, procesos/puertos y próximo paso exacto. No inventes contador de cuota ni tokens si no tienes una herramienta que lo exponga. Nunca incluyas secretos.

Entrega final breve con resultado, archivos importantes, contrato/migración, pruebas reales, revisión independiente, límites y siguiente dependencia. Diferencia «implementado», «probado localmente», «pendiente de revisión» y «listo para piloto». No afirmes listo para producción.

Comienza ahora con la inspección y la asignación; después formaliza y construye esta sección sin requerir otra aprobación para cada paso local ya autorizado.
