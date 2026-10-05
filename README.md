# El Encanto Huamanguino · QatuPOS

Entrega019: este piloto se publica como raíz independiente del repositorio QatuPOS. [Pasos Git → Supabase → Vercel](docs/RELEASE-CLOUD.md), plantilla privada externa, consultas SQL de diagnóstico y manifiesto de migraciones preparados. Ejecutar `pnpm release:check` antes de subir. La verificación portable de release es distinta de `validate:sdd`, que aún necesita la planificación/Python del proyecto padre. GitHub, Supabase y Vercel reales se registran por separado en el informe de esta entrega; no inferir despliegue por compilación.

Núcleo presencial para la marisquería, con laboratorio funcional e instalación operativa aislada preparada en015. Todo el desarrollo está aislado aquí; la planificación general permanece en la carpeta padre.

Incremento017: preparación Supabase/Vercel con API Node en el mismo origen, SQL privado/rol limitado, clave estable desde secretos, límites durables compatibles con Wi-Fi compartido, instalación vacía y mantenimiento por checksums. [Guía de despliegue](docs/DEPLOY-SUPABASE-VERCEL.md). Ensayo cloud local probado; proyectos/publicación/homologación reales y aceptación independiente pendientes.

Incremento016: respaldo PostgreSQL cifrado, restauración de ensayo con verificación de todas las tablas y cuarentena persistente, protección de fecha del día operativo y coherencia de accesos, tandas anuladas separadas de entregadas. [Procedimiento de respaldo](specs/016-recuperacion-operativa/quickstart.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Recuperación productiva, conectores y aceptación independiente siguen pendientes.

## Probar el laboratorio en este equipo

Este equipo ya tiene historial: desde esta carpeta ejecutar `pnpm db:start` y luego `pnpm dev`, sin migrar/seed/reset del laboratorio existente. Abrir **http://127.0.0.1:3000**. PostgreSQL portable está preparado en `.runtime`, sin servicio de Windows. `pnpm setup:local` se reserva para la primera instalación de un laboratorio vacío; no usarlo para reiniciar pruebas conservando datos. Detener la aplicación con Ctrl+C; los pedidos permanecen en la base local.

Usuarios sintéticos: **mozo, caja, noche, admin, cocina, heladeria**. Contraseña de todos: **QatuDemo2026!**. Cada cuenta tiene permisos comprobados por servidor. En las dos terminales se pueden mantener sesiones de mozos independientes; los borradores pertenecen a cada navegador/usuario.

1. Entrar como `caja`, abrir **Mi turno** y declarar fondo inicial.
2. Entrar como `mozo`, tocar una mesa, seleccionar productos/observaciones y enviar la tanda. Ambas terminales reciben los pedidos aceptados; actualización automática cada cinco segundos.
3. **Bebidas** registra entrega directa desde Caja y descuenta existencias. **Estaciones** separa Cocina y Heladería: preparar, entregar y revisar tickets simulados.
4. **Caja** permite pagos parciales/mixtos en efectivo, tarjeta y Yape. Calcula cambio; una respuesta incierta mantiene el saldo protegido hasta resolverla con evidencia sintética del comercio.
5. **Mi turno** permite corte, conteo ciego y entrega. El receptor entra como `noche` y acepta personalmente. Diferencias o rechazos requieren revisión administrativa; no desaparecen al recibir.
6. **Cierre del día** conserva ventas, cobros por medio, fondos y diferencias por bebida. El traspaso no se suma como venta. Los reportes son provisionales mientras existan pendientes.

## Clave de cliente por mesa

El cliente abre la página de ingreso que usará el QR y encuentra **Pedidos bloqueados**. El mozo se acerca con su tablet o usa una terminal, abre la mesa y pulsa **Habilitar mesa y mostrar clave**. Entrega la clave que aparece. Para ensayar localmente, abrir la [entrada del cliente](http://127.0.0.1:3000/cliente) en otro navegador de este equipo. Allí el cliente introduce la clave, selecciona productos/observaciones, revisa y confirma. El mozo también puede tomar pedidos directamente; ambos usan la misma cuenta, stock y estaciones del POS.

La clave pertenece a **esta atención**, no permanentemente a la mesa. Un pago parcial o incierto mantiene el acceso; el pago total confirmado lo termina inmediatamente en el servidor. La pantalla lo refleja mediante actualización cada cuatro segundos. Completar entregas y liberar físicamente la mesa siguen siendo tareas del personal. No se agregan nuevas tandas a una cuenta completamente pagada.

Cada navegador ve únicamente sus propias tandas. **Cambiar clave** invalida la anterior y las sesiones vinculadas; **Revocar acceso** detiene el acceso sin eliminar pedidos. Salir del navegador cierra solo esa sesión. Reingresar con la misma cookie vigente conserva el historial propio; una sesión nueva no hereda pedidos privados de otra. La cookie dura doce horas; si vence sin pagar, el cliente puede volver a introducir la clave vigente.

Si se pierde la respuesta de un envío, **Consultar y recuperar mi pedido** reutiliza su identificador, también después de recargar. No se reenvía automáticamente. Si la atención ya concluyó, el personal debe revisar la tanda pendiente; el cliente no recupera respuestas privadas con acceso revocado. El piloto no está expuesto a teléfonos en la red del restaurante; QR/NFC y acceso LAN/HTTPS aún requieren su integración y pruebas.

El QR se mantiene fijo y sin clave incorporada; la clave cambia por atención. El ingreso desde `/cliente` sin sesión válida no abre mesa ni permite pedidos. Tablet comprobada mediante navegador táctil de 1024 × 768; dispositivos físicos y etiquetas QR aún no homologados.

En **Pedidos del cliente**, el personal consulta las tandas de la carta por mesa, con observaciones y cantidades preparadas/entregadas. Los filtros **Por entregar**, **Entregados**, **Anulados** y **Todos** conservan pago y servicio separados: una cuenta pagada puede tener entrega pendiente. Una tanda completamente anulada nunca cuenta como entregada; las parciales conservan detalle y solo contabilizan unidades activas. Los contadores laterales excluyen las anulaciones. **Ver mesa** lleva solo a la atención aún vigente; tandas cerradas permanecen de consulta y no abren mesas nuevas. La sección usa actualización de cinco segundos del POS y no genera una segunda aceptación ni impresión.

## Estado y alcance

Es una base ejecutable con PostgreSQL, permisos, versiones, operaciones idempotentes, auditoría y pruebas. Usa menú, precios, cuentas y existencias **sintéticos**; no representa la carta ni el stock real del restaurante.

**Todavía pendientes para operar ventas reales:** identificación/prueba de ticketeras de red, puente de impresión, ruta SUNAT, configuración real del negocio, conexiones con Qatu.pe y Delivery, acceso QR/NFC por LAN, continuidad sin internet y homologación con el personal. Tarjeta/Yape aquí registran resultados manuales simulados; no ejecutan pagos. Las notas internas llevan la leyenda «NO ES COMPROBANTE DE PAGO» y no resuelven fiscalidad.

Hay carta configurable/cotizaciones, anulaciones acotadas, liberación de autorizaciones sin consumo, descuentos y documentos fiscales simulados. Recetas/merma/combos, compras, devoluciones monetarias, integración fiscal y hardware siguen pendientes. No usar este laboratorio con dinero real.

Incremento013: Caja declara y recontabiliza existencias con historial, retención por producto y revisión administrativa independiente. Se protegen consumos de días anteriores y se detectan reservas que cambian mientras se cuenta.237 pruebas y13 recorridos aprobados. [Actualización013](docs/evidence/ACTUALIZACION-2026-10-03-conteos-dia.md), [spec013](specs/013-conteos-y-dia-operativo/spec.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Revisión financiera/inventario pendiente.

Incremento012: catálogo con identidad única, inventario por estación, edición/auditoría completa del vínculo y protección de bebidas durante el traspaso. El formulario solicita inventario compatible y explica la entrega directa de Caja. Ver [actualización03/10](docs/evidence/ACTUALIZACION-2026-10-03-catalogo-custodia.md), [spec012](specs/012-catalogo-custodia/spec.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Implementación local pendiente de revisión financiera independiente; no habilita operación real.

Correcciones011: cotizaciones de un uso por participante, protección de cuenta pagada frente a descuentos, cierre diario neto, auditoría privada y Corte X limitado al turno. Documentos simulados mantienen fiscalidad pendiente; las notas simuladas no devuelven dinero o stock. No hay QR fiscal válido ni transmisión/homologación SUNAT. [Actualización y pendientes](docs/evidence/ACTUALIZACION-2026-10-02-auditoria.md).

## Desarrollo y comprobaciones

Requiere Node 24 y pnpm 12. Las dependencias están fijadas en el lockfile. Para otro Windows, ver [instalación local](docs/runbooks/local-development.md).

- `pnpm typecheck`: contratos y tipos de toda la aplicación.
- `pnpm test`: dominio, aritmética exacta, contratos y HTTP contra PostgreSQL real en bases efímeras.
- `pnpm test:e2e`: recorrido del navegador en puertos 3100/4100, sin tocar los datos interactivos.
- `pnpm build`: compilación optimizada de la interfaz.

Desarrollo, E2E y build usan carpetas independientes `.next`, `.next-e2e` y `.next-production`; el servidor3000 puede permanecer abierto durante pruebas3100. Ejecutar solo una suite E2E a la vez. Migración011 probada en bases efímeras, no aplicada automáticamente a la base interactiva por esta entrega.

Evidencias: [incremento de clave de mesa](docs/evidence/guest-delivery.md), [revisión de acceso cliente](docs/evidence/guest-review.md), [revisión de la base](docs/evidence/independent-review.md), [alcance de almacenamiento](docs/decisions/pilot-storage.md) y [entrega inicial](docs/evidence/delivery.md).

Para retomar después de una pausa o límite de uso, leer primero el [reporte de continuidad](docs/evidence/CONTINUIDAD.md), que distingue incrementos aceptados, trabajo pendiente, pruebas y dependencias reales.

## Operación de salón y cierre nocturno ·014

Cocina/Heladería ordenan por llegada y urgencia justificada; tickets incluyen secuencia/mesa/tanda/responsable. El mozo confirma estación lista cuando solo hay papel, reserva retiro y registra entrega. Las bebidas de Caja siguen directas sin comanda de preparación. Turno nocturno restringe terminales/tablets/QR a cerveza/gaseosa/agua en servidor.

Cierre operativo completo exige entrega y cobro resueltos, stock físico conciliado y firma independiente para diferencia de efectivo; fiscalidad conserva estado separado. Corte provisional mantiene pendientes. Un corte no recibido puede cancelarse por admin distinto de custodios sin borrar declaración ni mover dinero/stock.

**290 pruebas y17 recorridos navegador, tipos/build aprobados. Laboratorio, revisión sensible pendiente.** [Procesos del restaurante](specs/014-operacion-salon-noche/procesos-restaurante.md), [actualización014](docs/evidence/ACTUALIZACION-2026-10-03-operacion-salon-noche.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Estado histórico014: hardware/SUNAT/Qatu/Delivery reales pendientes. Dinero SQL y personal individual se construyeron en015, con revisión sensible pendiente.

## Instalación operativa para PC y tablets ·015

La PC del restaurante conserva la autoridad; terminales y tablets acceden por HTTPS en la red del local. Instalación propia con base/administrador individuales, mesas reales configurables y carta/inventario vacíos. **Personal** permite alta inactiva → contraseña individual → activación; **Inventario** permite SKU a cero → recepción física con referencia. Los cambios de credencial/permisos revocan sesiones; el ingreso de stock no mueve caja.

[Guía de instalación](specs/015-nucleo-operativo/quickstart.md), [actualización015](docs/evidence/ACTUALIZACION-2026-10-03-nucleo-operativo.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Ejecutables: `operational:migrate`, `operational:bootstrap`, `operational:start`; requieren configuración privada, base separada, certificado confiable y compilación. No se activó el restaurante ni se copió su información al laboratorio.

**352 pruebas,19 recorridos de navegador, tipos/build y prueba de arranque operativo compilado con TLS aprobados.** Dinero SQL bigint exacto; aceptación sensible independiente pendiente. Efectivo registrado por autoridad local; Izipay elegido pero integración/modalidad pendientes. SUNAT y ticketeras reales también pendientes; las confirmaciones simuladas están bloqueadas en operativo. Sin respaldo/restauración ni hub/offline homologados. El sistema final del restaurante todavía requiere completar estas dependencias.
