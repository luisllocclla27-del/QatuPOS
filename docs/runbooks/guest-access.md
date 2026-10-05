# Operar y recuperar acceso cliente en el laboratorio

Todo este recorrido usa datos sintéticos. POS y carta se prueban en este equipo, con sesiones de navegador separadas. Las cuentas demo y las cookies HTTP de loopback no se despliegan en el restaurante.

1. El cliente abre la entrada que usará el QR y ve **Pedidos bloqueados**. El mozo abre la mesa desde su tablet o terminal y pulsa **Habilitar mesa y mostrar clave**. Se genera una clave de diez caracteres, presentada en dos bloques legibles. Abrir mesa por sí solo no invita al cliente; cuando ya está habilitada, volver a entrar muestra la clave vigente.
2. El cliente abre `/cliente`, pide la clave al mozo y la introduce. No colocar la clave en dirección/enlace. El cliente solo elige productos/cantidades/observaciones; el servidor fija atención, catálogo, precio, estaciones y reservas.
3. Revisar y confirmar envía la tanda. Se muestra en POS como originada por cliente y queda pendiente de preparación/entrega según estación. La carta consulta cada cuatro segundos; POS cada cinco. Un error de stock o versión exige revisar y confirmar, no reintento automático con un identificador nuevo.
4. Si no se confirmó la respuesta, conservar la pestaña o recargar y usar **Consultar y recuperar mi pedido**. El identificador queda en sessionStorage de ese navegador. No crear otra tanda para sustituir una incierta. Si ese almacenamiento está bloqueado, no se hace la solicitud; pedir al mozo que atienda directamente.
5. Pago parcial/unknown no concluyen. Pago total confirmado de una cuenta positiva termina clave y todas sus cookies dentro del mismo commit. Una cuenta vacía no se interpreta como pagada. Completar entregas y cerrar visita se hacen en POS; abrir otra visita exige otra clave.
6. Cambiar/revocar exige motivo. El motivo queda auditado; pedidos aceptados siguen pendientes de servicio aunque los clientes deban volver a vincularse. Un nuevo navegador o una clave rotada no heredan el historial privado de sesiones anteriores.

## Si una clave no se puede consultar

El secreto durable es `.runtime/guest-code.key`, creado localmente y excluido de Git. Conservarlo junto con el backup de la base; nunca pegar su contenido en un chat, informe o captura. Sin esa correspondencia, el sistema rechaza entregar una clave recalculada como si fuera la anterior. El ensayo cubre discrepancia de digest; no acredita restore físico completo.

Tras pérdida del secreto y generación de uno nuevo válido, cambiar las claves activas desde POS para entregar nuevas claves y revocar sesiones anteriores. Si el archivo está ilegible/corrupto o no se puede crear, restaurar primero su backup válido; la rotación no corrige por sí sola un archivo inutilizable. No sobrescribir el secreto durante operación ni asumir que una cookie de cliente conserva autoridad después de revocar.

Si el mozo que creó el acceso deja de tener membresía activa/rol mozo, sus clientes pierden autorización. Otro mozo del mismo local puede **Cambiar clave** para continuar la visita con una generación nueva. Volver a activar una generación vigente no cambia su creador.

## Límites para el siguiente despliegue

La clave permanece mientras la atención no concluya; la sesión de navegador vence a las doce horas. La admisión limita doce claves inválidas por minuto por IP observada del API. Entradas válidas no consumen cuota; después de alcanzar el límite hay bloqueo temporal y Retry-After. En el BFF local todos comparten IP: esta política debe sustituirse o reforzarse según topología real, sin confiar encabezados de IP arbitrarios.

No hay comprobación física de presencia en mesa: conocer la clave permite vincularse mientras esté vigente. El QR futuro es fijo, abre la entrada y nunca lleva la clave. QR/NFC físico, HTTPS, móviles en LAN, credenciales reales, carga, cotizaciones/versiones de catálogo y continuidad hub se validan antes de operar con clientes y ventas reales. Mantener atención por mozo como alternativa cuando el cliente no use la carta.
