# Entrega · Pedidos del cliente para el personal

02/10/2026. Se añade sección de seguimiento de tandas `source: guest` al POS del restaurante. Todo el desarrollo permanece dentro de la carpeta del piloto. No se modifican núcleo comercial, contrato, precio, pagos, stock, autorización ni persistencia; se usa el PosSnapshot del personal ya autorizado.

El personal ve mesa, fecha/hora, tanda, observaciones, origen y unidades preparadas/entregadas. Filtros Por entregar/Entregados/Todos y mesa restringen tarjetas; el resumen superior está rotulado **todas las mesas**. Caja es entrega directa y no se clasifica como preparación de Cocina. La sección consulta la actualización de cinco segundos del POS; no añade aceptación, ACK, producción duplicada ni notificaciones push.

Una cuenta pagada con unidades pendientes sigue en Por entregar y muestra **Cuenta pagada · aún falta entregar**. Solo cantidades efectivamente entregadas hacen pasar la tanda a Entregados. Ver mesa funciona exclusivamente cuando la visita está abierta y corresponde a la ocupación actual; tandas cerradas tienen acción deshabilitada incluso al reocupar la misma mesa. El callback vuelve a comprobar esa correspondencia sobre el snapshot vigente y no llama table.open.

## Evidencia

- Tipos, compilación optimizada y **106 pruebas** de dominio/contratos/API PostgreSQL aprobadas en esta ejecución.
- **Cinco escenarios de navegador aprobados**. El recorrido de cliente se amplió con nota Sin picante, filtro por mesa, cuenta pagada todavía por servir, preparación observada desde Cocina, entrega, consulta en Entregados, servicio de Heladería, cierre/reocupación y acciones históricas deshabilitadas. Cocina no recibe esta navegación general.
- **25 comprobaciones documentales** aprobadas. Los hashes del escritor, dominio y OpenAPI deben coincidir con la base aceptada; la revisión registra sus verificaciones.
- [Revisión independiente](guest-orders-review.md) y [captura en tablet](screens/pedidos-cliente.png). El rótulo de métricas globales atiende una observación menor de revisión; no cambia filtros ni efectos.
- [Reporte de continuidad](CONTINUIDAD.md) preparado por poca cuota semanal y actualizado con resultado final, límites y siguiente dependencia.

Los tests crearon bases PostgreSQL efímeras y no limpiaron los datos interactivos. La captura se inspeccionó; no certifica experiencia de personal/dispositivos reales. No se añadió un botón de entregar o cobrar a esta vista: los registros reales siguen sus pantallas y reglas existentes.

## Límites y continuidad

Se entrega seguimiento local, con roles/catalogo/precios sintéticos, sin G2 ni operación real. Continúan pendientes QR físico, LAN/HTTPS, ticketeras, fiscalidad, Qatu.pe/Delivery, recetas/merma/combos, anulaciones/devoluciones y continuidad hub. Ver continuidad antes de iniciar otra sección y emitir nueva asignación con baseline vigente. Una tarea integral del padre no se marca como satisfecha por este incremento.
