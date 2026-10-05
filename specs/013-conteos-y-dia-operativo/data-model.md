# Modelo013

InventoryCount nuevo: business_day_id UUID servidor; status declared|adjusted|superseded; superseded_by UUID cuando sustituido. Campos nuevos opcionales en lectura para conservar datos legacy sin adjudicarles día arbitrariamente. Ajustar legacy denegado; reconteo lo sustituye conservando campos originales.

StockCountLine de inventario captura expected_stock_version para explicar cambios de reservas antes de aprobar. Sigue usando count_versions interno como autoridad; la UI no provee ese campo. Optional en lectura de traspasos/legacy. Proyección de conteo ciego oculta inventory_counts y conserva la retención en servidor.

Una declaración activa por SKU: para declarar conjunto S, todos los conteos declared que intersectan S deben tener todos sus SKU dentro de S. Se sustituyen completos y se agrega uno nuevo declared. Toda sustitución queda atómica en agregado/audit/outbox. No sobrescribir líneas originales ni borrar conteos.

Retención derivada de conteos declared, incluso anteriores/legacy hasta reconteo. No tabla de reservas paralela ni contador extra. Ajuste valida counted_quantity>=stock.reserved y versión/on_hand capturados antes de cambiar cualquier línea. Motivo y diferenteactor obligatorios.

DayClose conserva snapshot de IDs de declaraciones pendientes además de notas; cierres anteriores no se recalculan. Bloqueo de ajustes comerciales compara business_day_id de pedidos, no fecha civil/medianoche del navegador.
