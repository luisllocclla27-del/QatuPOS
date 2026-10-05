# Actualización — núcleo operativo015

03/10/2026, America/Lima. Desarrollo exclusivo en **el-encanto-huamanguino**. Base: incremento014, con96 hashes verificados antes de escribir. Ejecución444db644-5c07-4516-b50c-2624ce1aff7f, paqueteB21, WorkOrder versiones1..6; root como único escritor. Estado **ready_for_review**; aceptación sensible independiente pendiente.

## Resultado construido

- Instalación operativa separada: PostgreSQL propio, administrador individual, mesas configuradas y carta/inventario/ventas vacíos. El bootstrap no copia datos del laboratorio, no crea series fiscales y rechaza sobrescribir una instalación.
- Arranque compilado para PC del restaurante: HTTPS con certificado del operador → Next en loopback3000 → API en loopback4000. Origen y Host exactos, cotizaciones de personal/cliente protegidas por Origin y CSRF en operativo, cookies Secure/HttpOnly/SameSite=Strict; PostgreSQL no se expone a tablets. [Guía de instalación](../../specs/015-nucleo-operativo/quickstart.md).
- **Personal**: crear perfil inactivo, establecer contraseña mediante reautenticación administrativa, activar y gestionar permisos con versión/motivo. Se conserva historial. No desactivar responsables con mesas, caja, retiros o custodia abiertos. Cambios de contraseña/permisos revocan sesiones; una sesión revocada tampoco puede completar una escritura que esperaba el bloqueo del local.
- **Inventario**: SKU con stock inicial cero y recepción física con referencia normalizada por SKU/local. Mismo identificador de operación recupera el resultado sin duplicar; otro identificador con el mismo documento/SKU se rechaza. Conteos retenidos y traspasos protegen stock. Cajero solo recibe bebidas bajo su propia caja abierta. Ingreso físico no es venta ni gasto de caja.
- Dinero SQL exacto: seis columnas bigint con límites de dominio; conversión explícita de cotizaciones y operaciones BigInt antes de convertir a Number. Importes por encima de int32 se guardan sin truncarse.
- Modo operativo registra efectivo mediante autoridad local. Confirma solo capacidades construidas: se bloquean cobros digitales/fiscalidad/ack de impresión simulados hasta sus conectores. Se mantiene la separación entre pago, entrega y fiscalidad.

## Validación y límites de la evidencia

| Evidencia | Resultado |
|---|---|
| Lógica/presentación/PostgreSQL |352 pruebas,19 archivos;62 casos nuevos sobre014 |
| Navegador |19 recorridos completos;2 nuevos de personal y recepción física |
| Tipos y compilación |Aprobados; Next16.3.8, dependencias fijadas sin cambios de versión |
| Instalación operativa aislada |Base/rol generados qatupos_prod_test, bootstrap vacío y repetición rechazada, arranque compilado, TLS con cadena/hostname verificados contra CA sintética explícita, cookie Secure, origen obligatorio y Host rechazado |
| Datos interactivos |2 locales, huella conservada ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502;12 proyecciones de personal válidas |
| Documentación |25 controles del plan padre; OpenAPI y WorkOrder validados por separado en verification.json |

La prueba operativa creó y eliminó su base/rol efímeros, sin habilitar el restaurante ni ejecutar llamadas a proveedores. No demuestra confianza del certificado en tablets, Wi-Fi/LAN real, hardware, cumplimiento fiscal o aceptación independiente. El validador padre sigue documental y puede indicar runtime_implemented=false para su propio alcance; no se modificó para representar implementación del piloto.

Los fallos iniciales reprodujeron desbordamiento int32 al persistir quote. Hubo también correcciones de fixtures nuevos: campos canónicos, expectativas de estado/mensaje, codificación y observación de locks PostgreSQL. Tres expectativas antiguas de lectura SQL se actualizaron a strings bigint conservando valores exactos; no se cambió un parser global para ocultar fallos. El detalle permanece en los logs del run. No se silenciaron pruebas.

En la base interactiva se aplicó exclusivamente migration012, sin cambiar BranchState ni reseed/reset. Migration011 sigue pendiente allí para conservar su historial fiscal sintético; una instalación vacía aplica la cadena completa, comprobada en smoke. No ejecutar indiscriminadamente todas las migraciones sobre el historial interactivo sin revisar ese cambio semántico.

## Estado del local e integraciones

Usuario confirma PC del restaurante y acceso por red; Izipay para Yape/tarjeta. La modalidad POS físico/checkout web sigue pendiente. [Checkout oficial](https://developers.izipay.pe/web-core/quickstart/), [IPN](https://developers.izipay.pe/web-core/notifications/) y [kits físicos](https://testdevelopers.izipay.pe/physical-integrations/) tienen contratos distintos. No se integró una vía inventada ni se da por pagada una cuenta desde el navegador. LAN exclusiva requiere canal adicional para IPN externo si se elige checkout.

Para finalizar operación real: conector y homologación de ticketeras Cocina/Caja/Heladería; Izipay y confirmación/conciliación verificadas; proveedor SUNAT, configuración fiscal y homologación; respaldos/restauración; instalación como servicio, certificados/DNS/red; datos reales y pruebas en dos pantallas/tablets; revisión independiente de dinero/inventario/seguridad/aislamiento. Compras contables/merma/reembolsos, ajustes posteriores al cierre y hub/offline pendientes. Qatu.pe/Delivery no se modificaron.

**Este incremento prepara y prueba una instalación operativa; el sistema final del restaurante todavía tiene dependencias pendientes.** No hay G2/G3/G4 aceptados, emisión SUNAT, cobros Izipay, impresoras reales, commits, PR ni despliegue.

## Retomar

[Continuidad](CONTINUIDAD.md), [tareas015](../../specs/015-nucleo-operativo/tasks.md), [entrega y hashes](../construction/runs/2026-10-03-nucleo-operativo/delivery.json). Consultar los artefactos del run antes de editar; no ejecutar finalizadores de incrementos anteriores. Revisión sensible MAR:T073/T074/T075/T076/T077/T081 y MAR:T079 pendiente. MAR:T080 conserva integraciones e instalación final.
