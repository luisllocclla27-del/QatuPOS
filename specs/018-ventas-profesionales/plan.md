# Plan018

Root único escritor B23. Mismo Next/React/TypeScript, contratos y SQL, sin dependencias. Primera etapa: pruebas negativas y de recuperación; segunda: helpers puros sales y command-recovery, integración en PosApp; tercera: historial y precuenta; cuarta: E2E, suite, tipos/build y huella intacta.

Helper sales deriva estados sin usar saldo libre como pago. Helper recovery limita tipos/campos, carga legado order-recovery y persiste antes de enviar. Mantener replay server, bloqueo ante incertidumbre y recuperación manual. Reserva en UI se revalida contra snapshot y creador/caja abierta antes de continuar. Historial usa snapshot existente, selección por check_id (cada nueva ocupación tiene otro check), fecha America/Lima y pagos individualizados; sin endpoint paralelo.

No cambiar API, esquema ni aislamiento. Sólo proyección autorizada. Tests usan bases efímeras; no migrar/seed/reset laboratorio interactivo. Impresión usa diálogo del navegador, no confirmación de ticketera. Cobros/recuperación requieren aceptación independiente, código probado se entrega ready_for_review.
