# Entrega del incremento005 · Clave de cliente por atención

02/10/2026. Desarrollo completo dentro de `el-encanto-huamanguino`. El mozo activa una clave para una visita abierta; el cliente se vincula en `/cliente`, revisa y confirma tandas sobre la misma cuenta/stock/estaciones del POS. Pago total positivo confirmado concluye clave y sesiones; parcial e incierto las mantienen. La preparación/entrega pendiente y liberación física continúan por el personal. Una cuenta completamente pagada no admite nuevas tandas.

## Comprobaciones ejecutadas

| Comprobación | Resultado / alcance |
|---|---|
| Tipos y reglas integradas | Typecheck aprobado; **106 pruebas aprobadas** de contratos/dominio/HTTP contra PostgreSQL real. **16 pruebas de integración de acceso cliente**, incluyendo privacidad, roles/ámbitos, CSRF/origen, input cerrado, idempotencia por participante, parcial/unknown/total, rotación/cierre/reocupación, logout/vencimiento, concurrencia pago/pedido y última cerveza, rollback de pedido y de pago/revocación, digest incompatible y límite de claves inválidas. |
| Navegador | **5 escenarios aprobados**: los dos de la base presencial y tres de cliente. Dos navegadores privados, cuenta compartida y pago total; respuesta perdida con recarga/recuperación y rotación; fallos de almacenamiento antes/después de envío. Tras reforzar validación de recuperación corrupta se reejecutaron los tres escenarios cliente, **3/3 aprobados**, incluido JSON válido sin identificador de operación que bloquea nuevos envíos. |
| Build | Compilación optimizada aprobada; rutas `/` y `/cliente` generadas. |
| Persistencia interactiva | Migration005 aplicada sobre la base local existente, sin reiniciar/limpiar pedidos. Tests y E2E usaron bases efímeras separadas. |
| Contratos / asignaciones | OpenAPI3.1 y dos WorkOrders validados con las herramientas del proyecto. 24 ejemplos positivos de comandos y tres negativos en la suite. Contrato cliente cerrado, sin tenant/visit/precio/rol elegidos por cliente. |
| Planificación original | **212 hashes, cero diferencias**; las **25 comprobaciones documentales** aprobaron. Evidencia guardada dentro del piloto; el reporte del SDD original sigue declarando ejecución integral pendiente. [Integridad](guest-planning-integrity.json). |
| Revisión independiente | [Informe](guest-review.md): 106 pruebas y tipos reejecutados; experimento propio de rollback de pago/revocación, recuperación de misma operación y rechazo de respuesta privada después de conclusión. Discrepancia digest comprobada sin alterar el secreto real. |
| Inspección visual | [Mozo entrega clave](screens/clave-mozo.png) y [carta móvil de 390px](screens/cliente-movil.png) inspeccionadas; sin desbordamiento. En móvil hay acceso directo a la selección mientras se arma el pedido. |

El primer ensayo de navegador tuvo un selector ambiguo que encontró también el anunciador de rutas de Next; se delimitó la alerta de la aplicación y el recorrido completo posterior aprobó. La revisión detectó cuota consumida por entradas válidas detrás del BFF y recuperación JSON estructuralmente incompleta: ambos defectos se corrigieron y tienen regresiones. No se ocultaron fallos mediante reintentos automáticos.

## Decisiones y límites

La clave identifica una generación de acceso de una visita, nunca permanentemente una mesa. Activar una clave ya vigente la conserva; cambiar clave crea generación nueva y revoca la anterior. Solo el mozo consulta el secreto activo; no aparece en snapshot general, URL, auditoría o base en texto plano. Cada navegador ve únicamente tandas originadas por su sesión. El personal distingue `source: guest`; el ejecutor técnico no otorga una sesión de personal al cliente.

Admisión y escritura se autorizan bajo el bloqueo del mismo agregado del local. Pago/cierre/revocación, metadata, credenciales, revocación de cookies, operación y outbox comparten commit. La recuperación idempotente comprueba de nuevo el acceso **antes** de revelar resultado. Así, pagar primero impide otro pedido; aceptar un pedido primero aumenta el saldo que se debe pagar.

Cookie cliente dura doce horas; la clave sigue vigente sin pago hasta concluir/revocar la visita. Reingresar con cookie vigente conserva historial propio; una identidad nueva no lo hereda. Fallos de respuesta guardan intención en sessionStorage y requieren recuperación explícita. Si el almacenamiento impide guardarla, no se hace la solicitud; si falla limpiar un resultado ya confirmado, se conserva el éxito y al recargar se recupera la misma operación. Recuperación ilegible o estructuralmente inválida exige ayuda del personal y bloquea pedidos.

**Aceptación limitada al laboratorio local.** No acredita G2-M2, feature001 integral, móviles físicos/LAN/Internet, QR/NFC, presencia en mesa, ticketeras, cobro real, fiscalidad ni operación offline. El menú y precios son fijos/sintéticos; configuración de precios reales necesita cotización/revisión y contratos del modelo integral. HMAC local no certifica custodia de secretos de producción; backup/restore físico, carga y política distribuida de admisión están pendientes. La única política de rate limit implementada es doce claves inválidas/minuto por IP observada y memoria de una instancia; entradas válidas no consumen cuota.

Guía de uso y recuperación: [runbook](../runbooks/guest-access.md). Especificación, plan, checklist y tareas del incremento: [Spec Kit local](../../specs/005-clave-mesa/spec.md). Próximos agentes deben conservar el único escritor y emitir nuevas asignaciones sobre hashes vigentes.
