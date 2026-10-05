# Continuidad de construcción por agentes

El incremento ejecutable está en esta carpeta. No crear otro backend, otro libro de pagos ni otro estado de stock. Leer `../../AGENTS.md`, `../../README.md`, los contratos y la evidencia antes de asignar. La planificación compartida se consulta en `../../../specs` y `../../../docs` sin escribir allí desde trabajadores del piloto.

## Base que se conserva

`services/commerce/src/authority/repository.ts` es el único commit de efectos/idempotencia/outbox. `packages/domain/src/index.ts` calcula el estado; `packages/contracts/src/pos.ts` y `docs/contracts/pilot.openapi.json` fijan la API del incremento. PostgreSQL es autoridad; las vistas no deciden precios, saldo ni inventario. Los tests usan bases propias y nunca limpian los datos interactivos.

La interfaz se concentra por ahora en `apps/pos/src/components/pos-app.tsx`. Para dividirla en pantallas/módulos, una sola asignación debe controlar ese archivo durante la extracción. Los agentes posteriores pueden editar módulos extraídos por paths exclusivos. Ningún agente escribe contratos compartidos o migraciones sin permiso del integrador.

## Prioridad y asignaciones posteriores

| Incremento | Tareas de referencia del SDD | Paths previstos | Dependencia / evidencia para aceptar |
|---|---|---|---|
| Carta, usuarios y mapa reales | MAR:T004, MAR:T025, MAR:T027 | `tests/fixtures/`, `docs/runbooks/marisqueria/`, UI de configuración asignada por integrador | Datos validados por restaurante; prueba con los dos equipos y personal, sin reutilizar credenciales sintéticas. |
| Recetas, fracciones, combos y merma | MAR:T004, MAR:T006 | `packages/domain/src/inventory/`, `packages/domain/src/kitchen/`, nuevos tests | Contrato/migración primero; reserva agregada exacta y ruta de cada componente, incluida cancelación segura. |
| Puente de impresión | MAR:T008, MAR:T009, MAR:T024 | `services/print-bridge/`, `services/worker/src/printing/`, `tests/hardware/` | Identificar fabricante/modelo/conexión primero. ACK de red no equivale a papel; cola durable, copia explícita y recuperación ante ambigüedad. No tomar puerto/protocolo genérico como compatibilidad certificada. |
| Liberación sin inicio y anulaciones | MAR:T011, MAR:T012, dependencias comerciales del SDD | `packages/domain/src/payments/`, `services/commerce/src/payments/`, tests | Comandos y tombstone autorizados en servidor; nunca liberar unknown por timeout. Devolución/anulación requieren inventario, auditoría y fiscalidad coordinados. |
| SUNAT / boleta / factura / notas | MAR:T014 y feature002 | Adaptadores y módulos asignados a FIS | Ruta fiscal configurada, identidad y series de prueba aisladas, estados XML/CDR/entrega y notas con referencias verificadas. La nota interna no cambia fiscal_status. |
| Modelo persistente objetivo | MAR:T002 y B00/B02 | Nuevas `database/migrations/`, repositorios específicos | Normalización sin borrar operaciones existentes, FK/índices, concurrencia, rollback y ensayo de restore. No editar SQL ya aplicado. |
| QR/NFC por mesa | MAR:T028 y feature001 | Adaptador mesa, `apps/pos/src/components/guest-app.tsx`, `services/commerce/src/tables/` | Reutilizar clave por atención activada por mozo del incremento005 y su proyección privada. Ya hay pedido cliente local sobre el núcleo; faltan QR/NFC físico, LAN/HTTPS, propuestas/cotizaciones/modificadores del modelo integral y G2-M2 independiente. No crear segundo backend de pedidos. |
| Qatu.pe / Delivery | MAR:T029, B12/B13 | Adaptadores propios y simuladores | Contratos y autorización de integración; no modificar proyectos externos por inferencia. Probar misma reserva/importe al entrar por varios canales. |
| LAN / continuidad hub | MAR:T030 y B14 | Configuración, puente/hub, pruebas de interrupción | HTTPS/identidades por dispositivo y autoridad cloud/hub sin doble escritor. Prueba física con corte WAN; no atribuir offline a borradores locales. |

Antes de lanzar cada agente, emitir WorkOrder conforme al schema del padre, con hashes de la base integrada, IDs cualificados, write_paths exclusivos, dependencias aceptadas, contrato y pruebas. No reutilizar las órdenes de este incremento para autorizar producción. La revisión financiera y de aislamiento la realiza alguien distinto del autor. Publicar cada entrega y sus límites en esta carpeta.

Los checklists/tareas integrales del padre conservan su estado de planificación. Este laboratorio acredita recorridos parciales del SDD; no satisface automáticamente cada path, métrica, integración y gate del producto completo.

## Continuidad del acceso de cliente

Leer `../../specs/005-clave-mesa/` y `../evidence/guest-delivery.md`. La clave es una generación por visita; pago total/revocación/rotación terminan generaciones anteriores dentro de la transacción comercial. Las cookies de cliente no conceden identidad staff. No sustituir la consulta privada por el snapshot del POS, ni incluir clave en enlace QR, URL o logs. Mantener revalidación bajo bloqueo antes de recuperar operaciones idempotentes.

La ruta `/cliente` comparte frontend, contratos y escritor comercial. Antes de cambiar catálogo/precios reales implementar cotización/revisión explícita del modelo objetivo: el catálogo actual es fijo y sintético. Preparar admisión/rotación con los mozos y una política de rate limit para despliegue real; el contador de fallos del piloto es memoria de un único API y no acredita protección distribuida. La cookie cliente expira sin borrar el historial comercial.
