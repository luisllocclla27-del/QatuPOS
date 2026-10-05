# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zzzzzzzzzz-operations.spec.ts >> night cashier retains a cash shortage and another admin signs the exact final count
- Location: tests\e2e\zzzzzzzzzz-operations.spec.ts:59:1

# Error details

```
Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - button "⇄ Mi turno" [active] [ref=e31] [cursor=pointer]:
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
          - generic [ref=e45]: Día operativo · 2026-10-03
        - generic [ref=e46]:
          - button "Conectado" [ref=e47] [cursor=pointer]
          - generic [ref=e49]: R
          - generic [ref=e50]:
            - strong [ref=e51]: Rosa · caja nocturna
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
            - generic [ref=e60]: Abrir, contar y entregar
            - heading "Mi turno" [level=1] [ref=e61]
          - generic [ref=e62]: Caja · Día abierto
        - generic [ref=e64]:
          - generic [ref=e67]:
            - strong [ref=e69]: Caja sin sesión activa
            - generic [ref=e70]: Abre tu sesión para registrar cobros
          - button "📊 Ver Arqueo de Turno (Corte X)" [ref=e71] [cursor=pointer]:
            - generic [ref=e72]: 📊
            - text: Ver Arqueo de Turno (Corte X)
        - generic [ref=e73]:
          - generic [ref=e74]: INICIO DE TURNO
          - heading "Abrir mi caja" [level=2] [ref=e75]
          - paragraph [ref=e76]: Declara el fondo físico inicial. No es una venta.
          - generic [ref=e77]:
            - generic [ref=e78]:
              - generic [ref=e79]: Turno
              - combobox "Turno" [ref=e80]:
                - option "Diurno · mañana / tarde" [selected]
                - option "Nocturno"
            - generic [ref=e81]:
              - generic [ref=e82]: Fondo físico inicial (S/)
              - textbox "Fondo físico inicial (S/)" [ref=e83]
            - button "Abrir mi sesión" [ref=e84] [cursor=pointer]
        - generic [ref=e85]:
          - strong [ref=e86]: ✓ Traspaso recibido
          - generic [ref=e87]: Luis · caja diurna → Rosa · caja nocturna
          - generic [ref=e88]: Fondo recibido S/ 67.00 · diferencias conservadas
      - contentinfo [ref=e89]:
        - generic [ref=e90]:
          - text: QatuPOS
          - strong [ref=e91]: ·
          - text: Cada operación conserva su historia.
        - generic [ref=e92]: "QR/NFC, ecommerce y Delivery: habilitación posterior"
```