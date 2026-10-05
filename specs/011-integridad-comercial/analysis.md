# Consistencia y cobertura011 · 03/10/2026

Alcance: revisión de contratos/spec/plan/modelo/tareas y código integrado. No se declara revisión independiente del autor.

| Requisito | Implementación / evidencia |
|---|---|
| INT-FR-001/002 | index.ts quote actor/principal/scope/consumed/expiry y membership/role; integrity API seis casos con locks PostgreSQL. Replay previo se conserva. |
| INT-FR-003 | apply/remove bloquean pago concluido y retiro reservado/cobrado; pruebas unitarias antes/después. |
| INT-FR-004 | roundRatio BigInt, addExact en bruto; prueba límite/half-up/overflow y descuento. SQLinteger sigue como límite a alinear, explícitamente pendiente. |
| INT-FR-005 | day.close suma checks netos por pedidos del día; prueba70–7–35=28; estados de pago/fiscal independientes. |
| INT-FR-006 | auditoría/motivo privados redacted a mozo/cocina y conteo ciego; componente no convierte null en efectivo0. |
| INT-FR-007 | cash-report.ts recorta documentos a ventana de sesión; cinco pruebas de límites/propietario/conteo. |
| INT-FR-008/009 | pending fiscal y bloqueo por historial; NC acotada y sin efectos monetarios/stock; unidad/E2E verifican no documento duplicado. |
| INT-FR-010 | thermal/issue/pos: sin pseudo-QR/transmisión/homologación, identidad sin datos reales; E2E aviso y svg0. |
| INT-FR-011 | migration011 en DB efímera; conservación/importes/historia y repetibilidad probadas. No aplicada interactiva. |
| INT-FR-012 | capacidades false, build solo local/test, UI declara simulación. |

Plan usa mismo stack/layout/autoridad, ningún lockfile cambiado. OpenAPI y WorkOrders validan contra schemas oficiales del repo; nuevas formas HTTP no inventadas.
CriteriosAT1–AT9 enlazados a estos grupos. Tareas técnicas031/036/037 con evidencia; implementación032–035 aún sin aceptación financiera;038 independiente pendiente. No contradicción crítica conocida dentro de este incremento acotado que se haya ocultado con test; brechas fuera de su alcance figuran en ACTUALIZACION.
Convergencia009: siete tareas append-only, originales intactas. Se conservan como pendientes hasta revisión independiente de los fixes011.
