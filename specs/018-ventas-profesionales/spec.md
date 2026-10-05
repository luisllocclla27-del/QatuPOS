# 018 — Caja y consulta de ventas

Actor: cajero/administrador. Problema: al recargar se perdía la recuperación de cobros; saldo libre cero podía presentarse como pago completo aunque estuviera retenido. El usuario autoriza construcción y pruebas locales, no homologación o publicación.

## Requisitos y escenarios
- MAR-FR-026 / MAR-AT-026: pagada exige total positivo, pagado igual al total y retenido cero. Con total3500/pagado0/retenido3500 mostrar pendiente protegido, nunca cuenta cobrada. Pago parcial conserva saldo total pendiente y saldo libre diferenciados.
- MAR-FR-027 / MAR-AT-027: conservar antes del envío operation_id y contenido de pedido, reserva, liberación, confirmación, unknown, resolución, nota interna y entrada/salida de efectivo en sessionStorage por usuario; recarga y respuesta perdida reintentan exactamente la misma operación. No persistir contraseñas, CSRF, cookies ni comandos de personal. Almacenamiento indisponible impide enviar estas operaciones; contenido corrupto no se ejecuta ni elimina silenciosamente.
- MAR-FR-028 / MAR-AT-028: una reserva aún activa puede continuarse solo por su creador y dueño del turno abierto; refrescar estado SQL. Una reserva consumida/ajena no ofrece confirmación. Recuperar reserva selecciona la cuenta adecuada; efectivo insuficiente no muestra vuelto cero como si bastara.
- MAR-FR-029 / MAR-AT-029: Caja/Admin consultan cuentas históricas de su snapshot autorizado con búsqueda, filtros por día de consumo y situación de pago, consumos y cobros individuales. Fecha de consumo y fecha de cobro se distinguen; no sumar recaudación como ventas ni inferir liquidación bancaria. Mozo/cocina no obtienen nueva consulta financiera.
- MAR-FR-030 / MAR-AT-030: precuenta utiliza la última versión disponible, netea anulaciones, muestra total consumo, pagado, pendiente total, retenido y saldo libre. Indica corte y que no confirma pago ni impresión física. No inventar URL de consulta fiscal externa ni afirmar firma XML/QR/aceptación SUNAT sobre registros simulados.

## Límites
No nueva lógica financiera/backend ni migraciones. Snapshot sigue autorizado por servidor; UI es proyección, no autoridad. Recuperación dura mientras se conserve la sesión de navegador (cerrar pestaña puede perder sessionStorage); reservas/pagos siguen durables en SQL. Historial abarca datos disponibles en snapshot, no es libro contable ni exportación masiva. Tarjeta/Yape/fiscal continúan laboratorio y bloqueados en operativo. Autor de recuperación financiera no acepta su propia entrega.
