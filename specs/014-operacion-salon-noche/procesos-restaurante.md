# Procesos operativos · El Encanto Huamanguino

Definición014, 03/10/2026. Construido en laboratorio; aprobación sensible e impresoras físicas pendientes. Las dos pantallas existentes y las tablets previstas utilizan la misma autoridad. Cada persona debe entrar con identidad propia; compartir pantalla no equivale a compartir firma.

| Paso | Responsable | Acción y control |
|---|---|---|
| Apertura | Caja diurna | Declara fondo inicial, separado de ventas; asume custodia de bebidas. |
| Recepción | Mozo | Abre mesa y queda responsable. Activa acceso de cliente y comunica clave. QR/NFC aporta enlace; no habilita por sí solo. |
| Pedido | Mozo o cliente vinculado | Cotización servidor y confirmación generan una tanda durable con secuencia. Reintento conserva operación, no duplica. |
| Enrutamiento | Sistema | Cocina recibe platos; Heladería refrescos/helados/postres según producto. Bebidas unitarias de Caja van a entrega directa sin comanda de preparación. La ticketera de Caja sirve cuentas/documentos del flujo existente. |
| Preparación | Cocina/Heladería | FIFO por secuencia de aceptación, visible con mesa/tanda/observación/responsable. Urgencia excepcional de mozo/admin exige motivo y aviso separado: NO REPETIR PEDIDO. Copias se identifican. |
| Confirmación | Estación o personal que recibió su confirmación | Registrar unidades listas; si solo hay papel, mozo/caja/admin registra confirmación explícita con motivo. Imprimir o cobrar jamás marca listo. |
| Retiro | Mozo | Reserva retiro de unidad lista antes de llevarla. Otro empleado no entrega un retiro reservado. Propietario libera o admin libera con motivo. No vence automáticamente. |
| Entrega | Retirador | Registra unidades efectivamente entregadas. Caja registra entrega directa de bebida y consumo físico unitario. Pago y entrega son estados separados. |
| Cobranza | Dueño de caja | Efectivo con recibido/cambio exactos; tarjeta/Yape solo con evidencia verificada del comercio en el simulador. Unknown conserva retención. Pago completo revoca clave de mesa aunque falte entrega. |
| Corte de turno | Saliente | Prepara corte, caja y bebidas quedan protegidas; declara efectivo y stock sin ver esperado. Incluye pagos inciertos sin confirmarlos. |
| Recepción | Entrante | Revisa conteo sellado; diferencias requieren admin independiente. No recibe stock inferior a unidades reservadas. Recibir fondo no genera venta. |
| Corte fallido | Admin distinto de custodios | Rechaza o cancela corte no recibido conservando declaración. Cancelar devuelve la MISMA caja al saliente, quien concilia/recuenta y empieza otro corte. No ajusta stock ni dinero por cancelar. |
| Venta nocturna | Cajero nocturno y mozos/clientes | Catálogo nuevo solo cerveza/gaseosa/agua unitarias de Caja. Cotización diurna se revalida. Pedidos de comida ya aceptados siguen en preparación/entrega/cobro. El modo no cambia por medianoche. |
| Inventario final | Cajero nocturno + admin cuando hay diferencias | Cuenta unidades físicas, compara libro; no cuenta solo disponible ni elimina reservas. Faltante/sobrante se declara, retiene y revisa con conteos013. Resolver pedidos pendientes y recontar si cambia versión. |
| Cierre operativo completo | Cajero nocturno | Todas las entregas y saldos resueltos, cero pagos inciertos/autorizaciones/reservas/conteos/cortes pendientes; stock físico coincide. Efectivo distinto exige firma independiente exacta y vigente. |
| Corte provisional | Cajero | Conserva pendientes visibles. No rotular como conciliado ni ocultar diferencias. |
| Fiscalidad | Módulo fiscal y revisión futura | Cierre operativo no acepta SUNAT ni confirma liquidación bancaria. Documentos/impresión/pagos aquí siguen simulados. |

## Orden de preparación y despacho

La secuencia es del servidor y compartida entre estaciones; cada estación filtra sus líneas pendientes. Una tanda mixta comparte mesa/secuencia sin duplicar la cuenta. Urgentes van primero manteniendo FIFO entre sí; normales mantienen FIFO. Minutos transcurridos son orientativos, no un SLA garantizado. La prioridad aplicada a un papel ya emitido necesita entregar el aviso a la estación: el software no puede asegurar que un cocinero leyó un ticket. No usar impresión correcta como prueba de preparación.

El responsable de mesa organiza atención; otro mozo puede apoyar. El retiro tiene propietario propio, visible, y cantidades limitadas a lo listo. Se exige reserva antes de entregar desde la pantalla de salón para Cocina/Heladería. El servidor mantiene entrega directa legacy sin reserva para estación/admin; esta compatibilidad no demuestra retiro físico. Si se necesita obligatoriedad universal, contratar política y migración antes de ampliar permisos.

## Cuadre de todo el día

Ventas y cobranzas se informan por separado; deuda de día anterior se identifica. Efectivo final esperado = fondo externo inicial + cobros en efectivo + entradas externas − salidas externas + diferencias de traspasos anteriores. Las diferencias acumuladas se mantienen visibles, sin convertirlas en ingresos. Tarjeta/Yape no aumentan dinero físico del cajón. El fondo recibido en el traspaso no se suma otra vez como ingreso externo. Conteo final compara por SKU y unidad física; compras, pérdidas y devoluciones requieren documentos/eventos propios, todavía pendientes.

Un cierre operativo completo puede coexistir con fiscalidad pendiente en laboratorio. Un nuevo día administrativo no reconcilia pendientes anteriores. Deben permanecer en su histórico y, cuando proceda, resolverse por flujos explícitos. No reescribir cierres firmados.

## Prueba física necesaria antes de operar

Identificar modelos/protocolo/red de las tres ticketeras, probar comandas/copias/avisos/anulaciones/cuentas y recuperación sin duplicados; preparar identidades de cada mozo/cajero/admin independiente, tablets y cobertura Wi‑Fi/HTTPS; ensayar desconexiones, concurrencia, respaldos/restauración y cierres con personal real. Impresión de red, modo offline/hub, recetas/merma/compras, devoluciones monetarias, Qatu/Delivery y SUNAT real no están terminados.
