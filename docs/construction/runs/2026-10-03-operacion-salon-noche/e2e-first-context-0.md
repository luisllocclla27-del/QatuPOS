# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zzzzzzzzzz-operations.spec.ts >> night menu restricts tablets and QR and final stock/cash closes independently from fiscal
- Location: tests\e2e\zzzzzzzzzz-operations.spec.ts:38:1

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e12]:
    - complementary [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: q
        - strong [ref=e16]: qatupos
      - generic [ref=e17]: EL ENCANTOHUAMANGUINO
      - navigation "Secciones de operación" [ref=e18]:
        - button "▦ Mesas" [ref=e19] [cursor=pointer]:
          - generic [ref=e20]: ▦
          - text: Mesas
        - button "▧ Pedidos del cliente 0" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: ▧
          - text: Pedidos del cliente
          - generic [ref=e23]: "0"
        - button "◒ Bebidas 0" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: ◒
          - text: Bebidas
          - generic [ref=e26]: "0"
        - button "▤ Estaciones" [ref=e27] [cursor=pointer]:
          - generic [ref=e28]: ▤
          - text: Estaciones
        - button "□ Caja" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: □
          - text: Caja
        - button "⇄ Mi turno" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]: ⇄
          - text: Mi turno
        - button "≋ Inventario" [ref=e33] [cursor=pointer]:
          - generic [ref=e34]: ≋
          - text: Inventario
        - button "◷ Cierre del día" [ref=e35] [cursor=pointer]:
          - generic [ref=e36]: ◷
          - text: Cierre del día
      - generic [ref=e37]:
        - text: Una sola operación
        - generic [ref=e39]: Mesas · Estaciones · Caja
        - generic [ref=e40]: ENTORNO DE PRUEBA
    - generic [ref=e41]:
      - banner [ref=e42]:
        - generic [ref=e43]:
          - generic [ref=e44]: El Encanto Huamanguino
          - generic [ref=e45]: Día operativo · 2026-10-01
        - generic [ref=e46]:
          - button "Conectado" [ref=e47] [cursor=pointer]
          - generic [ref=e49]: L
          - generic [ref=e50]:
            - strong [ref=e51]: Luis · caja diurna
            - generic [ref=e52]: Caja
          - button "Cambiar usuario" [ref=e53] [cursor=pointer]: ⇥
      - generic [ref=e54]:
        - text: Laboratorio
        - generic [ref=e55]: ·
        - text: Proveedores e impresoras simulados
        - generic [ref=e56]: ·
        - text: Comprobantes SUNAT pendientes de integración
      - main [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]: Cobrar y registrar movimientos
            - heading "Caja" [level=1] [ref=e61]
          - generic [ref=e62]: Caja · Día abierto
        - generic [ref=e64]:
          - generic [ref=e66]:
            - generic [ref=e67]:
              - strong [ref=e69]: Caja diurna · abierta
              - generic [ref=e70]: Luis · caja diurna
            - generic [ref=e71]:
              - text: Fondo inicial
              - strong [ref=e72]: S/ 0.00
          - button "📊 Arqueo de Caja en Vivo (Corte X)" [ref=e73] [cursor=pointer]:
            - generic [ref=e74]: 📊
            - text: Arqueo de Caja en Vivo (Corte X)
        - generic [ref=e75]:
          - generic [ref=e76]:
            - generic [ref=e77]:
              - heading "Cuentas por cobrar" [level=2] [ref=e78]
              - generic [ref=e79]: "3"
            - generic [ref=e80]:
              - button "Mesa 01 Cuenta S/ 35.00 ✓ Pagado S/ 0.00" [ref=e81] [cursor=pointer]:
                - generic [ref=e82]:
                  - strong [ref=e83]: Mesa 01
                  - generic [ref=e84]: Cuenta S/ 35.00
                  - generic [ref=e85]: ✓ Pagado
                - strong [ref=e86]: S/ 0.00
              - button "Mesa 02 Cuenta S/ 32.00 ✓ Pagado S/ 0.00" [ref=e87] [cursor=pointer]:
                - generic [ref=e88]:
                  - strong [ref=e89]: Mesa 02
                  - generic [ref=e90]: Cuenta S/ 32.00
                  - generic [ref=e91]: ✓ Pagado
                - strong [ref=e92]: S/ 0.00
              - button "Mesa 03 Cuenta S/ 0.00 S/ 0.00" [ref=e93] [cursor=pointer]:
                - generic [ref=e94]:
                  - strong [ref=e95]: Mesa 03
                  - generic [ref=e96]: Cuenta S/ 0.00
                - strong [ref=e97]: S/ 0.00
          - generic [ref=e98]:
            - generic [ref=e99]:
              - heading "Selecciona una cuenta" [level=2] [ref=e100]
              - generic [ref=e101]: Registro de laboratorio
            - generic [ref=e102]:
              - generic [ref=e103]: ✓
              - heading "Cada cobro, con respaldo" [level=3] [ref=e104]
              - paragraph [ref=e105]: Elige una mesa para registrar efectivo, tarjeta o Yape.
        - generic [ref=e106]:
          - heading "Entradas y salidas de efectivo" [level=2] [ref=e107]
          - paragraph [ref=e108]: Son movimientos del cajón. No se registran como ventas.
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e111]: Movimiento
              - combobox "Movimiento" [ref=e112]:
                - option "Retiro / salida" [selected]
                - option "Depósito / entrada"
            - generic [ref=e113]:
              - generic [ref=e114]: Importe (S/)
              - textbox "Importe (S/)" [ref=e115]
            - generic [ref=e116]:
              - generic [ref=e117]: Motivo
              - textbox "Motivo" [ref=e118]
            - button "Registrar movimiento" [ref=e119] [cursor=pointer]
        - generic [ref=e120]:
          - generic [ref=e121]:
            - generic [ref=e122]:
              - heading "Comprobantes Electrónicos Emitidos (SUNAT)" [level=2] [ref=e123]
              - text: Boletas B001 y Facturas F001 con firma hash SHA-256 UBL 2.1 y código QR
            - generic [ref=e124]: 0 emitido(s)
          - generic [ref=e125]:
            - generic [ref=e126]: ✓
            - heading "Sin comprobantes emitidos hoy" [level=3] [ref=e127]
            - paragraph [ref=e128]: Al registrar el cobro completo de una mesa, puedes emitir su Boleta o Factura aquí.
      - contentinfo [ref=e129]:
        - generic [ref=e130]:
          - text: QatuPOS
          - strong [ref=e131]: ·
          - text: Cada operación conserva su historia.
        - generic [ref=e132]: "QR/NFC, ecommerce y Delivery: habilitación posterior"
```