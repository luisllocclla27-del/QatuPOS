# Ensayo018

En fixture efímera: abrir caja, mozo abre mesa y envía pedido; reservar todo. Recargar: saldo libre0, pagado0, retenido total, sin mensaje cobrada. Continuar reserva propia. Perder respuesta de confirmación después del commit, recargar y recuperar: exactamente un pago, mismo operation_id, vuelto exacto. Repetir pérdida de respuesta para collection.authorize.

Consultar Historial de ventas, buscar mesa, comprobar cobro/fecha/actor y precuenta. Mientras precuenta abierta, otra terminal agrega consumo: modal debe reflejar corte nuevo. Probar pago parcial/unknown sin inferir éxito, permisos mozo/cocina y almacenamiento corrupto/sin acceso. Ejecutar pnpm test, test:e2e, typecheck, build y build:cloud secuencialmente.

Registrar entrada externa de efectivo; perder respuesta después del commit y recargar. Recuperar el mismo ID: un movimiento, cajón incrementado una vez, cuentas y pagos sin cambios. Denegar todo almacenamiento del navegador: la pantalla sigue operativa y no envía el movimiento/cobro sin recuperación.
