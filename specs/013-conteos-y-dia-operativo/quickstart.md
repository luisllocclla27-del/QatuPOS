# Verificar013

Raíz piloto; datos sintéticos y bases qatupos_lab_test_*, preservar qatupos_lab.

1. Tests unit/counts-day, integration/counts-day y selector inventory-review; conservar regresiones originales.
2. pnpm typecheck; pnpm test; pnpm test:e2e; pnpm build; pnpm validate:sdd (separados). Validar WorkOrder y OpenAPI estrictos aparte del validador padre.
3. Caja con sesión propia → Inventario → declarar bebidas; existencia registrada no cambia, SKU quedan retenidos. Admin distinto revisa motivo/diferencias/reservas y aprueba; self-approval no permitida.
4. Si counted<reserved: rechazar ajuste, conservar conteo; anular pendientes autorizadamente, recontar conjunto completo y aprobar por otra persona. Recuento superseded conserva historial.
5. Cerrar día con cuenta pendiente → abrir siguiente día → no editar consumo viejo; sí cobrar como saldo anterior sin tocar cierre original.

API dev no recarga dominio: al finalizar reiniciar solo proceso verificado si está activo; registrar health/cliente y fingerprint comercial, no migrar ni reseed por pruebas.
