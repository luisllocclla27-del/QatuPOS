# Instalación en la PC del restaurante

La PC es la autoridad local: PostgreSQL y API escuchan solo en loopback; las dos terminales y tablets acceden al mismo origen HTTPS por LAN/Wi-Fi. La base real usa otro usuario y una base `qatupos_prod_*`; no reutiliza `qatupos_lab`. No se crean datos reales en esta entrega.

## Preparación del operador

1. Reservar una dirección para la PC y un nombre que resuelva en las tablets. Proveer un certificado HTTPS válido y confiable para ese nombre en todos los equipos. Guardar certificado y clave fuera del repositorio; no desactivar validación TLS. Revisar cobertura Wi-Fi y acceso de clientes al QR.
2. Preparar PostgreSQL con usuario individual y base vacía `qatupos_prod_encanto`, respaldo y permisos propios. El PostgreSQL portable de demostración y su superusuario no constituyen configuración de producción. Si PostgreSQL es remoto, usar TLS verificado (`sslmode=verify-full`).
3. Crear `.env.operational` local, protegido por permisos del sistema, con los nombres de `.env.example`: `QATU_ENV=production`, conexión individual, `QATU_PUBLIC_ORIGIN` HTTPS exacto sin barra final, rutas del certificado/clave, nombre del restaurante, número real de mesas, usuario/nombre/contraseña administrativa individual. No enviar secretos por chat ni incluirlos en informes. Este archivo está ignorado por Git.
4. Con la aplicación detenida, ejecutar `pnpm operational:migrate` y luego `pnpm operational:bootstrap`. El bootstrap rechaza bases ya inicializadas y no inserta carta, stock, ventas, cuentas de prueba ni series fiscales. Quitar `QATU_ADMIN_PASSWORD` de la configuración después del alta. No ejecutar `db:seed` en operativo.
5. Ejecutar `pnpm build` y `pnpm operational:start`. Abrir el origen configurado desde la PC, ambas pantallas y tablets; solo el puerto HTTPS debe quedar accesible en LAN. La configuración del firewall/certificados del local y el arranque como servicio siguen pendientes de instalación y validación física.
6. Administrador: **Personal** → crear perfil inactivo → establecer contraseña mediante reautenticación → activar. Cada mozo y cajero usa identidad individual; cambiar contraseña o permisos revoca sesiones.
7. **Inventario** → crear SKU con cero unidades → recibir mercadería con referencia única por SKU/documento. **Carta** → enlazar SKU/producto y precio real. El ingreso físico no confirma una compra contable ni mueve dinero. Verificar cantidades y precios con el responsable.
8. Probar mesa → habilitación por mozo → clave cliente → pedido → Cocina/Heladería → retiro/entrega → cobro efectivo → cierre de acceso QR. Después probar traspaso diurno/nocturno y conteo/cuadre total. Impresión de red, Izipay y emisión SUNAT necesitan sus conectores y homologación; siguen bloqueadas en operativo.

## Verificación del código

`pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, después `pnpm build`, `pnpm validate:sdd`. E2E usa puertos3100/4100 y bases efímeras; una sola ejecución. No reseed/reset del laboratorio interactivo3000/4000. Revisión independiente de dinero, inventario, sesiones y aislamiento pendiente antes de piloto real.

## Proveedor de pago elegido

Usuario confirma Izipay para Yape/tarjeta. Falta distinguir equipo físico y checkout web; no son el mismo contrato. En una instalación exclusivamente LAN, una notificación IPN externa no alcanza la PC sin infraestructura adicional. Diseñar relay seguro o conector presencial según contrato antes de habilitar confirmaciones. Proveedor fiscal no elegido; una nota de venta interna no equivale a boleta o factura.
