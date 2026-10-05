# 011 · Integridad comercial y simulación honesta

02/10/2026 · Propuesta correctiva de root tras entrega010 y última prueba de navegador previa aprobada. Alcance local sintético; no certificación fiscal ni aceptación independiente. Prevalece sobre interpretaciones incompatibles del piloto006–010 en los puntos siguientes. No altera el SDD del padre.

## Historias y requisitos

- INT-FR-001: Cotización de un solo uso, ligada a actor/principal/visita; acceso vigente antes de recuperar operaciones; nueva operación sobre quote consumida falla sin efectos. Fecha límite exclusiva: now >= expires rechaza.
- INT-FR-002: Personal cocina no cotiza ni acepta pedidos; dominio verifica membership/rol, servidor deriva alcance.
- INT-FR-003: Descuento no puede aplicarse/removerse para reabrir una cuenta positiva ya pagada. Remover requiere cero pagado y cero retenido, conforme DSC-FR-002. Mantener pagos parciales protegidos al aplicar descuento.
- INT-FR-004: Sumas, multiplicaciones, porcentaje y base demostrativa usan BigInt y redondeo half-up una vez. No modificar el importe del descuento ya aplicado al agregar/anular líneas: es importe congelado hasta cambio explícito autorizado. Etiqueta % describe porcentaje al aplicar, no recalculado.
- INT-FR-005: Venta diaria neta suma total_minor de cuentas vinculadas a pedidos del día, descontando voids/descuentos sin duplicar tandas. Cobros y ventas siguen distintos.
- INT-FR-006: discount_audit se proyecta solo a caja/admin; mozo/cocina no recibe motivos privados. Conteo ciego no publica informe con efectivo esperado inferido.
- INT-FR-007: Corte X usa la sesión propia o última propia del cajero (admin última vigente) y filtra documentos por ventana [opened_at,closed_at) o hasta server_time si abierta. No confundir emisiones del turno con pagos del turno; no sumar todo el historial.
- INT-FR-008: Generar documento accepted_simulated no acredita emisión fiscal ni cambia fiscal_status a issued; queda pending. Historial simulado bloquea modificaciones del consumo para evitar divergencia del documento. NC no devuelve pagos, stock ni reinicia una cuenta cobrada.
- INT-FR-009: Simulador NC permite únicamente reversión total 01/06, y 02 exclusivamente factura. 03/07 se rechazan con UNSUPPORTED_CAPABILITY: descripción y devolución parcial requieren contrato distinto; no se simulan como anulación total.
- INT-FR-010: Mensajes y tickets no declaran SUNAT transmitido, certificado u homologado. Se elimina dibujo pseudo-QR: mostrar que el QR fiscal está pendiente y hash solo interno sin validez tributaria. Identidad/dirección de demostración rotuladas como sintéticas, sin atribuir RUC real al restaurante.
- INT-FR-011: Migración aditiva normaliza solamente status issued del blob con documentos exclusivamente simulados a pending; no borra ni recalcula importes. Ensayar en bases propias, no aplicar aquí sobre datos interactivos.
- INT-FR-012: Mantener UI de boleta/factura/NC como demostración sin proveedor; ruta de emisión real queda fuera del incremento.

## Aceptación

AT1: misma quote + nueva operación acepta una vez, y mismo operation_id recupera una vez; distinto actor/guest o cocina obtiene 403.
AT2: importe pagado S/63 con descuento de S/7 no vuelve a saldo S/7 al retirar/reducir descuento.
AT3: gross MAX_SAFE_INTEGER y28% se redondea a2522015791327477 céntimos; sumas fuera del rango fallan.
AT4: venta70 menos descuento7 y anulación35 cierra neto28; sin duplicar consumo por tandas.
AT5: snapshot mozo/cocina no contiene discount_audit; conteo ciego muestra reporte indisponible.
AT6: documentos antes/después de ventana no aparecen en Corte X; conteo de NC pertenece a emisión del turno sin cambiar dinero.
AT7: NC motivo07/03 falla sin alterar documento; 02 en boleta falla; NC01 no devuelve efectivo ni permite cobro duplicado.
AT8: documento simulado mantiene pendiente fiscal, no anuncia transmisión y no presenta dibujo QR como legible.
AT9: migración de estado anterior conserva total/paid/held/historial. Revisión independiente permanece pendiente si no hay otro revisor.

## Límites conocidos

No se construyen recetas/mermas/fracciones, integración SUNAT, printer bridge, QR físico, LAN, hub ni ecommerce. Formalizar futuras devoluciones monetarias y reemisión; no liberar unknown por timeout. No dar por certificada privacidad de todos los módulos solo por estos casos. Reportes008–010 son históricos; su certificación verbal no reemplaza evidencia.
