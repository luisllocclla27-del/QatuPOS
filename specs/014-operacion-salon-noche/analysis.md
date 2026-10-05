# Análisis de consistencia014

Revisión del autor, no aceptación financiera independiente. Spec Kit implement aplicado con feature por proceso, sin cambiar puntero global013. Sin checklists014 ni hooks/extensiones existentes. Base013:73 hashes concordantes; WorkOrder B21 versión3 antes de extender permiso de test original. Contratos de confirmación papel/cancelación validados antes del código.

| Requisitos | Implementación | Evidencia |
|---|---|---|
| OPS001..004 | Secuencia, prioridad, responsable, reserva y confirmación papel; estado/domain+ProductionPanel | Unit40, PG concurrencia de retiro, E2E táctil cola |
| OPS005 | Política nocturna core/quote/accept/guest projection y UI | Unit cotización antes del relevo/medianoche; PG QR; E2E menú |
| OPS006..008 | Validación nocturna, aprobación sellada, estado operativo separado, final inmutable | Unit/PG bloqueo, replay y carrera cierre/movimiento; E2E exacto y diferencia |
| OPS009..010 | Pantallas/ticket semántico/proyección financiera/autorización/idempotencia/outbox | Suite integrada, tipos, E2E, esquema OpenAPI |
| OPS011 | Cancelar corte no recibido, mismo propietario/caja, observación intacta | Unit estados/negativos/recuperación; PG aislamiento/replay/carrera; E2E admin |

Roles y topología coinciden con descripción del restaurante: ticketera de Caja para cuenta; sin preparación impresa de bebidas. FIFO pertenece a aceptación durable, nunca navegador. Impreso/listo/reclamado/entregado/cobrado/fiscal son independientes. Cancelar corte no ajusta existencias/dinero ni elimina observación; aceptar conteo inferior a reservas permanece prohibido. No duplicar núcleo ni segundo backend.

Brechas explícitas: identidad individual configurable, homologación de impresoras y tablets/red; MoneyMinor vs SQL integer32; stock clasificado solo datos legacy explícitos/atributo opcional sin UI nueva de clasificación; compras/merma/ajustes posteriores a cierre/retornos y reembolsos; preparación por cursos/SLA/alertas; cloud/hub/offline; SUNAT/CDR y liquidación real; Qatu/Delivery reales. Revisiones011..014 pendientes. No gates G2/G3/G4 por estos documentos.

La regresión inicial de27 fallos incluía19 defectos de fixture por evaluación de estado antes de abrir mesa; no equivale a27 fallos de negocio reproducidos. Los logs se conservan. Se corrigió fixture y pruebas actuales ejercen invariantes. También se conservaron fallos de selectores/actualización UI y una espera de login intermitente: no se debilitó autenticación; test original comprueba cookie ausente y sesión401 del segundo contexto antes de iniciar sesión.
