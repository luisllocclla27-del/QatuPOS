# 015 — Núcleo operativo de El Encanto Huamanguino

## Resultado requerido

Preparar una instalación propia en la PC del restaurante, compartida por dos terminales y tablets por red. Mantener la gestión de mesas, claves QR, Cocina, Heladería, bebidas de Caja y turnos del núcleo existente. Separar técnicamente el laboratorio y los datos operativos. La entrega de este incremento no demuestra todavía la instalación en el local, la conexión de Izipay, la emisión SUNAT ni la homologación de ticketeras.

## Requisitos y aceptación

Cada requisito OPR-FR-NNN tiene su caso de aceptación OPR-AT-NNN con el mismo número. El resultado esperado es verificable en las pruebas indicadas en [tareas](tasks.md).

| ID | Comportamiento requerido y aceptación |
|---|---|
| 001 | Dinero en céntimos exactos entre0 y9007199254740991. Las seis columnas SQL monetarias usan bigint con límites; conversión explícita de dinero. Cotizaciones, anulaciones, descuentos y fiscalidad sintética conservan exactitud por encima de int32. El exceso se rechaza sin efectos. |
| 002 | Entornos laboratory/operational persistidos. Operativo exige base `qatupos_prod_*`, credenciales propias y origen HTTPS exacto. API y Next en loopback detrás del terminador TLS. Cookies Secure/HttpOnly/SameSite=Strict. Origen obligatorio y CSRF en mutaciones. Sin secretos en configuración pública ni confianza en forwarded headers del cliente. |
| 003 | Bootstrap con empresa/local, día de Lima, mesas y administrador propios. Carta, inventario y ventas vacíos; sin series fiscales sintéticas. IDs aleatorios y contraseña individual. Rechazar una base ya inicializada. No convertir ni copiar datos de laboratorio. |
| 004 | Personal administrado solo por administrador activo: username único, perfil y estación coherentes, motivo y versión. Alta inactiva; activación después de establecer credencial. Conservar historial. Prohibir autoquitarse acceso administrativo y eliminar el último administrador activo. Desactivación/cambio de permisos bloqueados mientras haya mesas, caja, retiros o custodia a su cargo. Persistencia y revocación transaccionales. |
| 005 | Cambio de contraseña solo por administrador reautenticado, perteneciente al local. Contraseña de12 a128 caracteres, distinta de la demo; hash solo en membership. Versión y auditoría sin contraseña/hash/salt. Revocar sesiones anteriores, incluyendo escrituras que estaban esperando el bloqueo del local. No guardar credenciales en borradores ni reintentar automáticamente. |
| 006 | Cobro efectivo registrado mediante la autoridad local y la propia sesión de caja. Deshabilitar confirmaciones digitales simuladas, emisión fiscal simulada y acknowledgements ficticios de impresión en operativo, antes de cualquier efecto. Izipay elegido; modalidad física/web pendiente. Unknown nunca se confirma al cerrar. |
| 007 | Interfaz Personal: alta → credencial con reautenticación → activación; edición/desactivación con conflictos visibles. Login operativo sin cuentas/contraseña demo. Modo obtenido del servidor. Mantener los recorridos de salón y cierre nocturno014. |
| 008 | Pruebas sobre PostgreSQL y navegadores, instalación compilada HTTPS con base/certificado sintéticos aislados, tipos/build/contratos y validación documental separada. Preservar huella del laboratorio. Informes, archivos y hashes verificables. Revisión sensible independiente pendiente. |
| 009 | Crear SKU con cero unidades; Caja exige clasificación cerveza/gaseosa/agua, Heladería sin clase de bebida. Recibir cantidades enteras con versión y referencia normalizada única por SKU/local. Repetición del mismo operation_id no duplica. Cajero solo recibe bebidas bajo su propia caja abierta. Conteos retenidos y traspaso de Caja bloquean recepción. No mover dinero ni afirmar compra/factura por ingreso físico. |

## Límites y dependencias

Impresión de red durable y homologada; modalidad/credenciales y contrato de confirmación Izipay; proveedor fiscal y reglas SUNAT; respaldo/restauración probados; instalación como servicio; certificados confiables, DNS y Wi-Fi en dispositivos reales; datos comerciales reales y revisión independiente. Costos/proveedores/pagos de compras, merma, reembolsos y ajustes posteriores al cierre necesitan módulos siguientes. Sin hub/offline o reconciliación con Qatu.pe/Delivery construidos.

Una PC exclusivamente LAN necesita un canal seguro adicional para recibir notificaciones de una pasarela externa si se elige checkout. No exponer directamente PostgreSQL ni inferir pago desde un callback del navegador. Las notas de venta siguen siendo documentos internos, sin validez de boleta/factura.

En modo operativo, POST de cotizaciones de personal y clientes también exige Origin exacto y X-CSRF-Token de su sesión, porque persiste order_quotes. Los clientes envían el token sin guardarlo como autoridad de tenant/importes.
