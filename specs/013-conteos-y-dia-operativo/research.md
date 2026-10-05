# Decisiones013

- Evidencia: descuentos/void solo comprobaban que el día actual estuviera abierto, sin validar origen de consumo. Ajuste no comprobaba día ni límite reserved. UI de declaración admin-only impedía flujo Caja→Admin con identidades distintas.
- Retener todos los SKU de un conteo pendiente, no solo faltantes: también una declaración aparentemente consistente exige aprobación independiente. Reconteo no puede eliminar retención antes de aprobar.
- Reservas pendientes pueden anularse para conciliar faltantes; su versión invalida declaración anterior y obliga reconteo. Retorno físico bloqueado porque cambiaría la cantidad observada; una anulación sin efecto de stock no se congela por esa razón.
- Recuento parcial que abandonaría otra línea de una declaración se rechaza400: política explícita y simple para este piloto. UI ofrece todos los SKU autorizados de la estación.
- Bloqueo de día anterior es temporal hasta libro de ajustes con nuevas entradas/revisión. No reutilizar NC simulada para reducir saldo o devolver dinero.
- No adivinar día de conteos antiguos desde created_at: un turno cruza medianoche. Se exige nueva declaración.
