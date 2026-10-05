# Modelo012

Sin entidades nuevas. Product.id único en state.products del tenant/local. Product.station = StockItem.station para policy unit; stock_item_id=null para none. Ofertas múltiples pueden consumir un mismo SKU y reservas comunes.

Product candidato se deriva del anterior; se compara name/category/price_minor/active/station/stock_policy/stock_item_id antes de reemplazo. CatalogAuditEntry.changes contiene solo cambios efectivos con old/new. No altera OrderLine congelada.

Stock afectado por void: liberar `unfulfilledVoid` reservas; reintegrar `fulfilledVoid` si restore_stock. Con stock.station=caja y handover congelado, cualquiera de esos efectos prohíbe la transacción. Validación previa preserva cuenta/stock/auditoría.
