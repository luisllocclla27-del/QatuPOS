# Contrato y compatibilidad011

OpenAPI canónico: docs/contracts/pilot.openapi.json; no API paralela. Se mantienen formas existentes.
- order.create: consumed quote => INVALID_TRANSITION409; quote ajena =>FORBIDDEN403; now>=expires =>QUOTE_EXPIRED409. Replay operación precede este control y conserva pertenencia vigente.
- cotizar: cocina=>FORBIDDEN403.
- descuento sobre cuenta positiva completamente cobrada=>INVALID_TRANSITION409; retiro con paid/held>0=>INVALID_TRANSITION409.
- fiscal.document.issue: accepted_simulated; check.fiscal_status=pending. Segundo documento, o edición de cuenta con historial simulado=>ALREADY_ISSUED409 para compatibilidad.
- fiscal.credit_note.issue:03/07=>UNSUPPORTED_CAPABILITY409;02boleta=>INVALID_CREDIT_REASON409. Se acepta01/06/02factura total. Ninguna devolución monetaria/stock.
UI del piloto se adapta al historial, no utiliza issued para afirmar autorización fiscal. El esquema permite motivos conocidos03/07 para responder error explícito; no equivale a implementación.

Ejemplos: 01 + boleta simulada válida crea NC total; 07 + boleta válida devuelve409 sin nuevo documento. Quote consumida con operación nueva409; misma operación+body200replayed. Documento de laboratorio no elimina pendientes_fiscales del cierre.

Pruebas de compatibilidad preservan rechazo de importe/tenant/roles suministrados y privacidad/idempotencia. No nuevas dependencias.
