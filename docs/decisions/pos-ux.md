# POS del piloto — decisiones de experiencia

01/10/2026. Diseño para construir y ensayar; no afirma facilidad de uso medida. Orden `458dde8c-66c3-461a-8fa5-064b6d54070f`. Alcance: MAR:T010, MAR:T013, MAR:T019, MAR:T022.

## Trabajo cotidiano

La pantalla inicial del mozo es **Mesas**. Cada tarjeta muestra número, estado escrito, total y última actividad. No necesita atravesar indicadores empresariales para tomar un pedido. Elegir mesa abre un espacio de trabajo: catálogo a la izquierda y cuenta/tanda a la derecha. Buscar, categorías visibles y productos con nombre y precio tienen prioridad sobre imágenes. Agregar no envía todavía; una franja «Por enviar» y total de la tanda diferencia el borrador de lo registrado.

El botón principal dice «Enviar pedido». Antes de confirmar muestra destinos: Cocina, Heladería y Bebidas de Caja. La respuesta muestra folio y las líneas registradas; no declara impreso/preparado/entregado por aceptar el pedido. La cuenta mantiene las tandas anteriores, sus mozos y estados. Ante respuesta perdida se conserva la identidad de operación y se recupera; no se invita a repetir una venta. Conflicto de versión exige refrescar y conservar borrador.

**Bebidas** tiene una cola pequeña por mesa con cantidad pendiente y «Entregar». No tiene botón de imprimir. Si hay dos aguas, puede entregar una conservando la otra. Un toque de producto no consume stock. **Estaciones** separa Cocina/Heladería con mesa, tanda, observación, hora, autor y estado de impresión. El botón «Preparado» registra preparación; «Entregado» registra entrega. Los tickets se presentan como instrucciones. Estado ambiguo solicita motivo para copia y no muestra un reintento silencioso.

## Caja y control

El cajero empieza en **Caja**, con sesión, dueño y día operativo visibles. Selecciona una cuenta y ve total, cobrado, retenido y saldo disponible. Cobrar tiene medios Efectivo, Tarjeta y Yape. Efectivo muestra importe aplicado, recibido y cambio calculado. Digital solicita referencia del comercio y confirmación explícita del cajero; el laboratorio muestra «Registro manual verificado · Simulación» y no declara integración bancaria. La interfaz nunca permite usar el rol o saldo del navegador como autorización.

**Turno** reúne tres pasos comprensibles: congelar recursos y preparar corte, declarar conteo, entregar/recibir. El conteo de efectivo/bebidas es ciego hasta guardar declaración. No precargar cantidades esperadas en campos físicos. Comparación posterior muestra esperado, contado y diferencia por SKU; ambos responsables permanecen identificados. La aceptación abre una sola sucesora; las cuentas abiertas continúan sin repetir pedidos. Un faltante no se convierte automáticamente en ajuste.

**Cierre del día** separa ventas, cobros por medio, efectivo físico, bebidas y pendientes. Fondo recibido del diurno aparece como traspaso, no ingreso. «Guardar cierre provisional» y «Día conciliado» tienen condiciones distintas. Unknown conserva retención y pendientes visibles. La UI no ofrece limpiar pendientes ni editar cierre firmado.

## Sesión compartida y presentación

Dos terminales fijas de mozos sirven la misma operación. Encabezado siempre identifica usuario y rol derivados de sesión de servidor, con «Cambiar usuario» que termina sesión explícitamente. Nunca elegir rol para obtener acceso. Laboratorio usa identidades sintéticas seleccionables por nombre y PIN; no habilitar ese mecanismo en producción. Mozo: Mesas y Bebidas/seguimiento autorizado. Cajero: Caja, Bebidas y Turno. Administrador: configuración y conciliación. Servidor conserva el control aunque alguien intente mostrar otra pantalla.

Estilo: navy para texto, teal para acción principal, fondo crema claro y tarjetas blancas; bordes y tipografía, sin sombras pesadas ni adornos de restaurante. Tipografía de sistema, números tabulares, precios PEN. Estados acompañados de palabras, no solo color. Controles mínimo 44 px, foco visible, etiquetas persistentes, anuncios de errores/confirmaciones con aria-live. No esconder acciones principales en menú de tres puntos.

Pantalla ancha: navegación compacta, catálogo flexible y panel de cuenta de 360–400 px. En móvil: mesa/catálogo y panel accesible mediante botón «Ver pedido»; sin scroll horizontal. Ventanas de confirmación usan título, contexto de mesa y acción concreta; cancelar devuelve al borrador. El bloqueo de red dice qué no se confirmó y permite consultar estado, sin prometer offline.

## Dependencias y ensayos

Contrato de staff debe proporcionar sesión, permisos, mesas, catálogo, cuenta, preparación, impresión, bebidas, sesión de caja, cobro, conteo, traspaso y día. Consultas deben incluir versiones; comandos llevan operación estable y versión esperada. Modelos financieros y precio son servidor. Los nombres de rutas finales se fijan en el contrato; no escribir un segundo motor en componentes.

Ensayos requeridos: pedido de 5 líneas en 60 s tras entrenamiento, mezcla de tres estaciones sin ticket de Caja, dos terminales sobre mesa sin pérdida, entrega parcial, pago mixto con cambio, reintento con respuesta perdida, conteo ciego con diferencia y cierre diurno/nocturno. Playwright puede demostrar recorridos de laboratorio; solo ensayo con personal real valida MAR-SC-006. Hardware, emisor fiscal, banco/Yape y canales externos no quedan certificados por UI.
