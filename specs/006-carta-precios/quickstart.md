# Quickstart: Carta Configurable con Revisión de Precios

Instrucciones para ensayar localmente el escenario central de cambio de precio y revisión:

## 1. Inicio del entorno
```bash
pnpm db:start
pnpm dev
```
Abrir:
- Terminal Mozo/Admin: `http://127.0.0.1:3000`
- Terminal Cliente: `http://127.0.0.1:3000/cliente`

## 2. Escenario Central: Ceviche S/ 35.00 -> S/ 38.00

1. **Apertura y Acceso**:
   - En `http://127.0.0.1:3000`, iniciar sesión como `caja` y abrir turno con S/ 200.00.
   - En otra pestaña, iniciar sesión como `mozo`. Abrir la Mesa 1 y pulsar **Habilitar mesa y mostrar clave**.
   - En `http://127.0.0.1:3000/cliente`, ingresar la clave mostrada para la Mesa 1.

2. **Cotización del Cliente a S/ 35.00**:
   - El cliente selecciona 1 Ceviche (S/ 35.00).
   - Toca **Revisar pedido**. El cliente recibe del servidor la cotización oficial a S/ 35.00 (`quote_id`).

3. **Modificación de Precio por Administrador a S/ 38.00**:
   - En una pestaña como `admin`, dirigirse a la sección **Carta**.
   - Buscar "Ceviche clásico". Editar su precio cambiando de S/ 35.00 a S/ 38.00.
   - Indicar motivo "Ajuste de costo de pescado fresco" y guardar.

4. **Intento de Confirmación con Precio Antiguo**:
   - El cliente en `/cliente` pulsa **Confirmar pedido**.
   - El servidor rechaza la transacción con código `PRICE_CHANGED` (409).
   - **Resultado en servidor**: Cero cargos a la mesa, cero tickets de Cocina, cero existencias reservadas.
   - **Resultado en pantalla**: El cliente ve la alerta destacada: *«El precio cambió. Revisa tu pedido»*, mostrando el nuevo valor de S/ 38.00 y solicitando confirmación con la cotización actualizada.

5. **Confirmación del Nuevo Precio**:
   - El cliente confirma el pedido a S/ 38.00.
   - La orden se registra exitosamente por S/ 38.00 en la cuenta de la mesa y se despacha a Cocina.
