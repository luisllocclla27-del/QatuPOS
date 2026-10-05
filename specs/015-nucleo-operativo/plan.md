# Plan015

Mismo stack fijado Node24/TS6/Next16/Fastify5/PostgreSQL17, sin nuevas dependencias ni segundo backend. Root exclusivo, WorkOrder B21 antes de escribir. Uso SpecKit por proceso sin puntero global. Sin hooks/checklists015.

T071asignación/contratos→T072regresiones→T073dineroSQL→T074config/estado/bootstrap→T075personalcore/persistencia→T076contraseñas/sesiones→T077UI/start→T078validación/reporte→T079revisión independiente→T080integracionesfinalesexteriores. Dinero/aislamiento sujeto a aceptación externa al autor. Ninguna tarea padre global aceptada por este subconjunto.

Runtimeproduction es configuración explícita y dataenvironmentoperational. Mutaciones HTTPSorigin exacto+CSRF. Next producción detrás terminadorTLS, APIloopback. DBnamespaceprod aislado; TLSparaPGremoto. UI runtimeGETapi/runtime resuelve configuración pública servidor. Registro lab permanece intacto y por defecto. Servicio operativo rechaza datos lab en login/requerirsesión.

Credentials fuera de BranchState; perfiles administrados en domain y sincronizados staff_memberships en misma transacción command_operations/outbox. Endpointpassword serializa BranchState, revalidaadmin, verifica contraseñaactual, cambiahash/credential_ready/version y audita evento sin secretos. No almacenar body/contraseña en outbox.

Migración012solo6columns bigint+rangecheck; quoteparser explícito sqlMoney. No parserglobal paraIDs/sequence/version. Tests sobrebases efímeras; migración interactiva solo después de verificar y sin reset/reseed. Config/arranque y bootstrap real preparado, no ejecutar con datos inventados como si fueran del restaurante.

OPR-FR/AT-009 / MAR:T081 — stock.create solo admin {name,sku,station:caja|heladeria,beverage_kind:beer|soda|water|null,reason}, unidadentera, inventarioinicial0; bebidaCaja claseexplícita, heladeríaclaseNull. stock.receive admin o dueñoCaja paraCaja {stock_item_id,expected_version,quantity,receipt_reference,reason}. Referencia normalizada única porSKU/local; mismooperation_idreplay sin duplicar. Cantidadfísica suma con límites y movimiento receipt; no altera caja ni prueba pago/fiscal/compra contable. Conteo retenido/traspasoCaja bloquean recepción, antes de mutar. UI daaltaSKU→recibeunidades→admin enlazaproducto/precio enCarta. Costos/proveedores/pagoscompra/merma requieren módulos siguientes.

Instalación elegida: PC de local, LAN para2pantallas y2tablets; terminadorTLS Node→Nextloopback3000→APIloopback4000→PG protegido. Certificado del operador, mínimoTLS1.2, Host exacto, destino fijo, forwardedheaders no confiables descartados. Arranque operativo separado de `dev`. Archivo privado `.env.operational` cargado por bootstrap/migración/arranque. Login bloquea local y verifica credencial actual antes de crear sesión; mutación/quote revalida sesión dentro del bloqueo. GETguest comprueba entorno igual que mutaciones. Puesta en marcha real/servicioWindows/certificado confiable por equipos no validada.

En modo operativo, POST de cotizaciones de personal y clientes también exige Origin exacto y X-CSRF-Token de su sesión, porque persiste order_quotes. Los clientes envían el token sin guardarlo como autoridad de tenant/importes.
