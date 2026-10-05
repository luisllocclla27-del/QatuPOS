# Entrega ejecutable · El Encanto Huamanguino

01/10/2026. Incremento local independiente bajo `F:/PROYECTOS/QatuPOS/el-encanto-huamanguino`. Código, paquetes, base portable, pruebas, capturas y evidencia permanecen aquí. La planificación compartida del proyecto padre no fue reemplazada ni sus tareas integrales marcadas por esta demo.

## Construido y comprobado

Interfaz táctil de mesas/tandas con observaciones; actualización compartida cada cinco segundos. Cocina y Heladería separadas con cantidades de preparación/entrega. Bebidas directas de Caja sin ticket, con reserva y consumo unitario. Pagos parciales/mixtos, cambio exacto, retención de resultados inciertos y referencias de comercio configurado. Sesión individual, conteo ciego, barrera de caja/bebidas, aceptación por receptor, revisión independiente de diferencias/rechazos y cierre diario que separa ventas, cobros y fondos entre turnos.

PostgreSQL persiste el estado y cada operación junto con outbox. Precios/roles/empresa provienen del servidor; no del navegador. Versiones evitan sobrescribir otra terminal, y reintentos con el mismo identificador recuperan el efecto. Las notas internas son explícitamente no fiscales.

## Evidencia ejecutada

| Comprobación | Resultado y alcance |
|---|---|
| Tipos integrados | `pnpm typecheck` aprobado. |
| Dominio, dinero, contratos y API PostgreSQL | **89 pruebas aprobadas**, incluidas concurrencia de última cerveza, sesiones/CSRF, aislamiento, idempotencia, rollback por fallo de outbox, persistencia tras recrear API, pagos inciertos y conteos. Bases efímeras distintas de los datos interactivos. |
| Navegador Chromium | **2 escenarios completos aprobados**: dos terminales más caja, Cocina/Heladería, cambio, conteo y recepción nocturna, cierre, nuevo día, respuesta de pedido perdida con recarga/reintento sin duplicación, Yape incierto/resolución; además vista de 390px sin desbordamiento horizontal. |
| Compilación optimizada | `pnpm build` aprobado. |
| Contrato | OpenAPI 3.1 validado; 23 comandos positivos y 3 casos negativos probados; WorkOrders conformes al schema del padre. |
| Integridad de planificación | 212 entradas de hashes del informe previo, cero diferencias. Las 25 comprobaciones documentales se reejecutaron y aprobaron; el reporte se guardó dentro del piloto, separado de evidencia de ejecución. |
| Revisión independiente | Seis defectos corregidos y contrastados, 62 pruebas reejecutadas por el revisor y experimento independiente de fallo transaccional/outbox. [Informe y hashes](independent-review.md). El conjunto posterior amplió evidencia a 89 pruebas; no equivale a homologación. |
| Inspección visual | Capturas verificadas de [pedido](screens/pedido.png), [caja](screens/caja.png), [cocina](screens/cocina.png), [cierre](screens/cierre.png) y [móvil](screens/mobile.png). |

Los primeros ensayos de navegador detectaron selectores ambiguos/nombres de confirmación incorrectos en la prueba y una navegación que seguía en la mesa seleccionada. Se corrigió el recorrido de los tests sin debilitar invariantes. Hubo un fallo transitorio de navegación Chromium; los ensayos completos posteriores aprobaron. No se ocultaron resultados con reintentos automáticos ni se reemplazó PostgreSQL por mocks.

## Aceptación limitada y trabajo pendiente

Se entrega un laboratorio que se puede ejecutar y revisar. **No se acepta G2-M1, operación fiscal, cobro real ni compatibilidad de hardware.** Catálogo, personal, precios y existencias son sintéticos. La mejora de facilidad de uso se debe validar con los mozos/cajeros y pantallas físicas; la captura de navegador no certifica esa experiencia.

Pendientes principales: menú/roles reales, recetas/combos/merma, cancelaciones/devoluciones, liberación segura de autorización no iniciada, ticketeras y puente durable, SUNAT, restore, carga, LAN/HTTPS, QR/NFC, Qatu.pe/Delivery y continuidad hub. El agregado PostgreSQL JSON es un paso ejecutable, con [límites explícitos](../decisions/pilot-storage.md), previo a normalización del modelo integral.

Los siguientes agentes tienen [prioridades, paths y dependencias](../construction/next-increments.md). Las órdenes archivadas aquí documentan esta ejecución; los siguientes incrementos necesitan nuevas asignaciones sobre hashes vigentes.
