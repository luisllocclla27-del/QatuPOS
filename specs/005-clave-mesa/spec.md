# Feature Specification: clave de cliente activada por mozo

**Feature ID**: `005-clave-mesa` · Sin rama nueva. **Created**: 2026-10-02. **Status**: implementado y verificado en laboratorio local; aceptación integral pendiente.

**Input**: el mozo activa la sesión y entrega una clave; esta vincula al cliente con la mesa hasta que cancele la cuenta, momento en que concluye su acceso.

## User Scenarios & Testing

### US1 — Mozo entrega acceso (P1)

El mozo abre una atención, activa una clave y la comunica al cliente. El cliente reconoce restaurante y mesa al ingresar esa clave, sin cuenta personal ni aplicación. Caja y Cocina no activan accesos de clientes.

**Ajuste del recorrido, 02/10/2026:** el mozo atiende con tablet además de las terminales fijas. Entrar a una mesa muestra el control **Habilitar mesa y mostrar clave**; la activación sigue siendo explícita, para que consultar una mesa no habilite pedidos accidentalmente. Cuando la atención ya está habilitada, entrar muestra su clave vigente. El mozo puede tomar pedidos directamente y el cliente también puede enviarlos después de vincularse.

**Independent Test**: una clave válida entra solo a su atención; una mesa vacía no admite clientes.

### US2 — Cliente pide durante su atención (P1)

Cada cliente elige productos, observaciones y cantidades, revisa su pedido y envía explícitamente. Las tandas se registran una vez en la cuenta operada por el personal y siguen sus estaciones. Cada navegador ve únicamente sus propios pedidos; compartir la clave no comparte historiales privados.

**Independent Test**: dos navegadores usan la misma clave; cada uno consulta sus tandas, mientras el mozo ve ambas. Reintentar el mismo envío no repite cargos, stock o preparación.

### US3 — Pago concluye el acceso (P1)

Cuando Caja confirma el pago total, la clave y las sesiones vinculadas dejan de autorizar pedidos o consultas privadas. Pago parcial o incierto no concluye el acceso. El personal termina las entregas y libera la mesa; una atención posterior usa otra clave.

**Independent Test**: pago parcial permite seguir; pago completo, revocación, rotación o cierre dejan al navegador antiguo sin acceso a visitas posteriores.

### Edge Cases

Claves mal escritas/compartidas, fuerza bruta, mesa reocupada, acceso rotado mientras hay carrito, doble clic, respuesta perdida, pago concurrente con envío, pago incierto, cuenta vacía, día cerrado y cliente sin teléfono. El mozo sigue atendiendo sin autoservicio.

## Requirements

- **KEY-FR-001**: solo un mozo autenticado del local activa/rota una clave para una visita abierta; una activación repetida conserva la clave vigente.
- **KEY-FR-002**: la clave identifica una visita concreta y no se reutiliza al reocupar mesa. No basta conocer número de mesa o URL.
- **KEY-FR-003**: ninguna entrada de cliente decide empresa, local, visita, precios, rol, importes o estaciones.
- **KEY-FR-004**: cada navegador obtiene identidad limitada a la visita y consulta solo sus pedidos; no recibe caja, pagos, notas privadas o consumos de otros clientes.
- **KEY-FR-005**: pedir reutiliza aceptación, cuenta, reservas y estaciones existentes; identifica origen cliente y no atribuye su intención al mozo como si hubiera enviado él.
- **KEY-FR-006**: pedido, deduplicación, atribución y producción se guardan juntos. Misma intención/sesión no repite efectos; otra sesión no recupera su resultado.
- **KEY-FR-007**: pagar totalmente una cuenta con importe positivo concluye acceso inmediatamente en servidor. Una cuenta recién abierta de importe cero permanece activa.
- **KEY-FR-008**: pago parcial o unknown mantiene acceso, sin liberar retenciones ni inferir cobro.
- **KEY-FR-009**: cerrar visita, revocar o rotar invalida la clave anterior y sus sesiones. El personal puede completar entregas ya aceptadas.
- **KEY-FR-010**: ante pago/cierre concurrente, un pedido aceptado primero aumenta el saldo; un pago total concluido primero impide el nuevo pedido.
- **KEY-FR-011**: no almacenar clave en texto plano en la base ni incluirla en URL, auditoría o snapshots generales; limitar intentos y exigir protección de sesión para escribir.
- **KEY-FR-012**: errores de red conservan intención; reconectar no envía el carrito automáticamente. Mostrar cuenta concluida, clave revocada y datos desactualizados claramente.
- **KEY-FR-013**: la página que abre el QR, sin sesión cliente vigente, muestra **Pedidos bloqueados**, explica que el mozo habilita la atención y solicita la clave; no ofrece envío ni crea visita/sesión por abrir el enlace.
- **KEY-FR-014**: el mozo opera habilitación, clave y pedido desde una vista táctil de tablet, además de las dos terminales fijas; abrir la misma atención conserva su clave vigente y no crea otra cuenta.
- **KEY-FR-015**: el QR es acceso a la página de ingreso, sin clave ni permiso incorporados. Tener sesión válida de esa visita permite volver a la carta; pago total impide reingresar con la clave anterior. Impresión/lectura física y red real requieren homologación posterior.
- **KEY-FR-016**: el personal autorizado consulta una sección de tandas originadas por clientes, con mesa, observaciones, cantidades pendientes de preparar/entregar y filtros de pendientes/entregadas; una tanda registrada no exige otra aceptación ni dispara nueva producción al consultarla.
- **KEY-FR-017**: una cuenta pagada conserva tandas sin entregar en seguimiento; solo las cantidades de entrega registradas las consideran servidas. Navegar desde una tanda histórica no abre otra visita ni dirige silenciosamente a nuevos ocupantes.

### Key Entities

Atención/visita, clave de acceso, sesión de cliente por navegador, pedido atribuido, cuenta y evento de conclusión. No se crea una cuenta financiera alternativa.

## Success Criteria

- **KEY-SC-001**: ensayos de dos clientes no muestran pedidos ajenos ni otra visita.
- **KEY-SC-002**: repetir envío y perder respuesta producen un solo pedido y un solo cargo.
- **KEY-SC-003**: después del commit de pago completo/cierre/rotación, todo nuevo envío del acceso anterior es rechazado.
- **KEY-SC-004**: mozo activa, cliente entra/pide y Caja concluye el circuito en navegador sin intervención técnica; facilidad/tiempo con personal real quedan pendientes de piloto.
- **KEY-SC-005**: en navegador de 1024 × 768 el mozo puede entrar, habilitar y leer la clave sin desbordamiento; un navegador cliente limpio permanece bloqueado hasta introducir una clave válida. Esto no acredita uso físico de tablet/QR ni LAN.
- **KEY-SC-006**: en dos navegadores, una tanda del cliente aparece en seguimiento del mozo; después de pagar permanece por entregar y después de registrar preparación/entrega aparece en entregadas. Consulta/filtros no producen pedidos, cobros ni entregas adicionales.

## Assumptions

«Cancelar» significa pagar totalmente la cuenta; no anular pedidos. La conclusión digital no cancela preparación ni sustituye entrega/liberación física. La clave se puede compartir con comensales de esa visita, cada navegador conserva historial propio. QR/NFC podrán abrir la página de ingreso, pero no conceden permiso sin clave. Esta entrega sigue siendo laboratorio local: no supone acceso desde teléfonos por LAN/internet, hardware, fiscalidad ni cobertura de toda feature001.
