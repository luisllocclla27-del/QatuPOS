# Continuidad actual019 ·05/10/2026

Kit Git/Supabase/Vercel preparado en019 B24v3. Leer docs/RELEASE-CLOUD.md y actualización019. Root único escritor; baseline018535 hashes verificada, sin tocar datos interactivos.7 pruebas de empaquetado,23 configuración/cloud, tipos/build/copia frozen-lockfile y SQL diagnósticos en fixture aprobados; revisión sensible pendiente. GitHub main publicado y verificado en cec5ea8e1d991acec356fdff97cf5af90fed438e; registro/evidencia final se añade a continuación. Supabase/ref/dominio Vercel aún no definidos; no instalar en proyecto supuesto. Resultado Git se registra en actualización019 y delivery. GitHub rechazó workflow por scope ausente: usar deployment/github-verify.template.yml para activación manual, no está activa la automatización.

No ejecutar seed/reset ni migraciones sobre qatupos_lab. No normalizar SQL aplicado. Usar cloud:secure con JSON externo protegido; instalador canónico, no migraciones pegadas individualmente. validate:sdd sólo en workspace padre; release:check portable. No habilitar Izipay/fiscal/impresión real por estas pruebas. Spec Kit global permanece013; para019 usar SPECIFY_FEATURE_DIRECTORY por proceso.

---

# Continuidad018 — ventas y recuperación de Caja

05/10/2026. B23v5: código probado y ready_for_review;455 pruebas/27 archivos,24 E2E, tipos/build local/cloud, validación/artefactos aprobados. Sólo piloto F:/PROYECTOS/QatuPOS/el-encanto-huamanguino; parent read-only. Root único escritor; no nuevos agentes. [Reporte018](ACTUALIZACION-2026-10-05-ventas-profesionales.md), [entrega018](../construction/runs/2026-10-05-ventas-profesionales/delivery.json), [feature018](../../specs/018-ventas-profesionales/spec.md).

Reanudar: leer AGENTS/SDD/constitución/protocolo/layout y spec018; verificar source_sha256 y writer_finished de entrega018 antes de editar. Registro docs/construction/current-run.json; orden runs/2026-10-05-ventas-profesionales/work-order.json. No cambiar puntero global013; SPECIFY_FEATURE_DIRECTORY absoluto y SPECIFY_FEATURE_NO_PERSIST=1 por proceso. T101 implementada/probada pendiente aceptación independiente; ningún cambio financiero/seguridad está aceptado por el autor. Se mantienen revisiones sensibles anteriores.

018 diferencia pagado/pendiente/retención/libre, conserva intención antes de enviar y recupera pedido/reserva/liberación/pago/unknown/resolución/nota interna/cash.move con mismo ID. Whitelist de campos, sin contraseña/cookie/CSRF, no sobrescribe intención pendiente;202/5xx/ilegible siguen pendientes. Registro corrupto bloquea nuevas operaciones; no borrar por conveniencia. Reserva se continúa sólo por creador/turno propio abierto y estado fresco. SessionStorage dura mientras persista pestaña/sesión de navegador; otras acciones de gestión aún sólo recuperan en memoria.

Historial Caja/Admin incluye atenciones cerradas, búsqueda/filtros y pagos/fechas/responsable/recibido/vuelto. Usa snapshot autorizado, sin nuevo endpoint/ledger ni paginación server. Precuenta actualizada por polling/corte de snapshot; netea anulaciones, no acredita pago ni ticketera. Documentos simulados sin falsa firma/QR/portal fiscal. Migraciones, backend, OpenAPI y versiones externas intactos. Sin nuevos proveedores ni despliegues.

Laboratorio qatupos_lab intacto:2 locales; ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502. No setup/seed/reset/migrate general. Migración013 sólo fixtures, nunca aplicada al interactivo. Dev restablecido sesión43049:3000/4000; tres rutas HTTP200. Comprobar procesos propios antes de detener. Pruebas frescas qatupos_lab_test_*, E2E3100/4100 único runner. Builds/E2E secuenciales; no volver a repetir sin cambios/fallos.

Pendientes: revisión independiente; puesta en marcha/configuración y recuperación Supabase/Vercel; ticketeras/puente y pruebas físicas; Izipay y proveedor fiscal. Cloud requiere internet, no promover hub/restores ni afirmar G2. Expansiones recetas/mermas/combos/compras/reembolsos y Qatu.pe/Delivery siguen pendientes. Docs DEPLOY-SUPABASE-VERCEL y antecedentes017 vigentes. Logs iniciales fallidos conservados; final455/24/compilaciones0. Todas las escrituras existentes auditadas contra grants B23; PNG sintéticos regenerados bajo grant explícito.

---

# Continuidad017 — preparación Supabase/Vercel

Actualizado al cierre de B22v4;420 pruebas,20 E2E, tipos/build local/cloud y HTTPS/reinicio/artefactos aprobados. Directorio exclusivo: F:/PROYECTOS/QatuPOS/el-encanto-huamanguino. Root único escritor; no agentes nuevos ni escrituras en padre. Se conserva historia016 abajo.

## Reanudar desde017

Leer AGENTS padre/local, SDD/constitución/protocolo/layout y specs/017-preparacion-cloud. Registro actual docs/construction/current-run.json; orden docs/construction/runs/2026-10-04-preparacion-cloud/work-order.json. Comprobar delivery017/hashes y writer_finished antes de asignar cambios. Puntero global permanece013, usar SPECIFY_FEATURE_DIRECTORY absoluto y SPECIFY_FEATURE_NO_PERSIST por proceso. No delegar sin autorización actual.

017 construye cloud Node en la web, sin API4000: mismo núcleo, SQL privado/rol limitado y session/direct5432 TLS verificado, conexiones inicializadas/esperadas y cerradas por request. Secreto QATU_GUEST_CODE_KEY_BASE64 estable32bytes, sin filesystem cloud. Binding proyecto/etapa/origen/clave y permisos inspeccionados antes de servir. Preview exige staging separado; vercel dev rechaza entorno operativo. Cuotas SQL reservan intentos, conservan fallos y devuelven solo reserva propia tras éxito para NAT/Wi-Fi. Migración013 solo aplicada en fixtures nuevas, no en laboratorio interactivo.

Guía docs/DEPLOY-SUPABASE-VERCEL.md, comandos cloud:install/cloud:migrate/cloud:doctor y build:cloud. Nunca usar seed/setup/migrador general sobre Supabase; instalar solo proyecto dedicado vacío. No cargar credenciales administrativas en Vercel, no usar NEXT_PUBLIC para secretos, ni conectar transaction6543. Build local .next-cloud aislado, Vercel .next; node24/pnpm12.5.1/lockfile intactos en versiones externas, única dependencia añadida de workspace commerce a pos.

No confundir ready del doctor con puesta en marcha. Pendientes: revisión independiente B15..B22 sensible, creación/prueba real de proyectos y configuración segura, recuperación/backup proveedor, hardware/puente impresoras, pruebas físicas, fiscal e Izipay. No promocionar restore016 ni cambiar binding para saltarse fencing. Cloud requiere internet; no confirmar offline. Impresión digital/fiscal simulada no se habilita en producción. Ampliaciones recetas/mermas/combos/compras/reembolsos y Qatu.pe/Delivery continúan pendientes.

Huella posterior idéntica a previa. Las pruebas regeneran PNG sintéticos en docs/evidence/screens (grant v4); source_sha256 final identifica evidencia actual. Pruebas/evidencia finales se encuentran en delivery017 y reporte ACTUALIZACION-2026-10-04-preparacion-cloud.md. Preservar qatupos_lab; no setup/seed/reset ni migrate general. Huella previa ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502,2 locales. Validar huella posterior. Main dev restablecido, sesión82803:3000/4000 y /, /cliente, /v1/pos/runtime HTTP200; comprobar procesos propios antes de detener. E2E3100/4100 un runner; builds/E2E secuenciales. Fixtures cloud3317/3447 siempre propias y limpiadas.

---

## Historial016 (conservado, referencias históricas)

# Estado y continuidad — El Encanto Huamanguino

Actualizado04/10/2026, America/Lima. Último incremento **016-recuperacion-operativa** sobre015. [Actualización016](ACTUALIZACION-2026-10-04-recuperacion-operativa.md), [entrega016](../construction/runs/2026-10-04-recuperacion-operativa/delivery.json), [respaldo/ensayo](../../specs/016-recuperacion-operativa/quickstart.md). Históricos: [015](ACTUALIZACION-2026-10-03-nucleo-operativo.md), [014](ACTUALIZACION-2026-10-03-operacion-salon-noche.md), [013](ACTUALIZACION-2026-10-03-conteos-dia.md). No ejecutar transformaciones/finalizadores antiguos.

## Implementación comprobada

Núcleo presencial: mesas/tandas y clave QR activada por mozo/revocada al pago total, cotizaciones/carta, estaciones, bebidas directas, caja/turnos/traspasos, descuentos/anulaciones, conteos con retención, FIFO/urgencia y reserva de retiro, política nocturna y cierre operativo separado de fiscal.

015 agrega SQL bigint exacto, entorno operativo separado/HTTPS/bootstrap vacío, personal individual y revocación transaccional de sesiones, SKU a cero y recepciones físicas sin mover caja. Operativo admite efectivo local; Izipay/fiscalidad/ack de impresión simulados quedan bloqueados. Documentos fiscales del laboratorio mantienen naturaleza sintética.

016 conserva las mejoras del usuario en anulaciones y corrige clasificación/contadores, fecha Lima sin días futuros y falsa actualización de perfil/password si falta membership. Incluye backup manual consistente AES-GCM y clave QR verificada, restore a base vacía reservada y verificación de cada tabla. Cuarentena persistente aun si se renombra la DB; copiar/restaurar no permite operar ni cambiar autoridad. Personal se revoca, sesiones cliente se marcan revocadas conservando FKs/historial. Health comprueba DB y cuarentena.

**388 pruebas en23 archivos,20 recorridos de navegador con contadores finales, tipos/build, CLI de respaldo/restore17 tablas, smoke HTTPS operativo con rol/base/certificado sintéticos,25 controles documentales, WorkOrder/OpenAPI.** Ready_for_review; aceptación independiente pendiente de recuperación, seguridad y aislamiento016 y revisiones sensibles011..015. No afirmar aplicación final, cumplimiento fiscal, G2/G3/G4 o RPO/RTO homologados.

## Runtime y datos

Laboratorio http://127.0.0.1:3000, cliente /cliente; API loopback4000; PostgreSQL loopback55432. Sesión de desarrollo35446 iniciada04/10; verificar procesos antes de detener/reiniciar porque el ID caduca. API sin hot reload; Next sí. Puertos3100/4100 solo E2E, un runner por vez. E2E/build secuenciales y cachés .next/.next-e2e/.next-production separadas.

2 locales sintéticos preservados; SHA256 del estado `ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502`. Migration012 aplicada;011 no aplicada en este historial para evitar cambio semántico sin revisión. Instalación nueva aplica toda la cadena, probada en DB efímera. No ejecutar setup:local, seed, reset, db:migrate general ni restore sobre qatupos_lab existente. Reiniciar con `pnpm db:start` y `pnpm dev`. Inicio de PostgreSQL recuperó WAL tras apagado no limpio; huella intacta, no implica hardware homologado.

El ensayoCLI leyó qatupos_lab sin escribir y restauró17 tablas a DB propia; se verificó la misma huella, se revocaron sesiones solo del destino y se eliminó fixture/key/archive después de registrar reporte seguro. Tests usan sus propias bases. La alternativa fallida de stream dejó una fixture exacta; ya limpiada con evidencia y sin matar conexiones ajenas. Archivos reales de backup/key no van a evidencia/Git. No instalar ni regenerar guest-code.key para arreglar un ensayo. Unknown mantiene dinero y reservas.

Desde esta carpeta: `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, luego `pnpm build`, `pnpm validate:sdd`. Validación documental del padre separada del runtime. Backup: `pnpm operational:backup`; ensayo: `pnpm operational:restore-verify` con configuración protegida y condiciones del quickstart016. Estas herramientas no promueven copias a producción ni ejecutan proveedores. Instalación/arranque015 siguen vigentes.

## Reanudar construcción

1. Leer AGENTS padre/local, SDD, constitución/protocolo/layout y feature016. Verificar hashes de delivery016 y fin del escritor antes de nueva WorkOrder; un dueño por archivo. Puntero global sigue013; SPECIFY_FEATURE_DIRECTORY absoluto y NO_PERSIST por proceso. No delegar sin autorización actual. Padre, Qatu.pe y Delivery permanecen fuera de escritura.
2. Revisar independientemente MAR:T085/T086/T087/T090 y MAR:T073/T074/T075/T076/T077/T079/T081 antes de operación real. Autor no acepta sus cambios sensibles; revisiones011..014 pendientes. MAR:T080/T090 no se completan por generar código/aprobar docs.
3. Confirmar modalidad Izipay física/web (pregunta previa pendiente) y construir integración con evidencias/correlación/conciliación. PC LAN necesita canal seguro de IPN externo si aplica. Proveedor fiscal aún no elegido; notas internas no reemplazan boleta/factura. Credenciales/series comerciales no disponibles; no pedir secretos por chat.
4. Identificar modelos/IP/protocolos de Cocina, Heladería y Caja antes del puente durable. No asumir ESC/POS/9100 porque usan red. Impresión ambigua exige intervención/copia y motivo; no repetir pedido. Bebidas sin ticket de preparación.
5. Instalar/probar PC, arranque como servicio/apagado limpio, dos pantallas, tablets, etiquetas QR/NFC, Wi-Fi, DNS/TLS confiables y fallos físicos. Copias fuera de PC/local, horario/retención/alertas/ACL/cifrado de disco/PITR requieren implementación y ensayo. Backup manual512MiB máximo no acredita RPO/RTO. Recuperación real exige fencing, conciliación posterior al snapshot y checkpoints antes de quitar cuarentena por un proceso autorizado nuevo.
6. Configurar carta/precios/personal/stock reales con responsables después de instalar/revisar. Recibir stock no paga proveedor. Recetas/merma/combos/compras/reembolsos y ajustes posteriores al cierre siguen pendientes; no inferir devolución desde anulación fiscal.
7. Qatu.pe/Delivery y hub/offline solo por contratos/asignación/autorización específica. Preservar autoridad única y separación de pago, entrega, fiscalidad y custodia. No promover dos copias ni activar por cambiar URL/nombre de base.

## Evidencia y fallos resueltos

WorkOrder B21 v1..5, root único escritor, baseline015 de116 hashes verificado. Cambios del usuario en GuestOrders preservados. Pruebas previas reproducen5 errores reales; fallos de fixture (id/outbox/version/Mesa11) se documentaron aparte. Cierre doble de descriptor y alternativa de stream descartada están en research016 con logs/limpieza propia. E2E inicial19/20, luego20/20 y otra verificación20/20 tras contadores. Reanudar desde entrega/reporte final, no desde log intermedio fallido.

No hubo commits, PRs, despliegues, cobros/emisión/impresión reales ni confianza CA añadida al sistema. Primary PC todavía usa metadatos de autoridad del núcleo; no está certificado como hub offline. No tratar una copia restaurada como nuevo escritor.
