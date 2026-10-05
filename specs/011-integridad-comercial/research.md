# Decisiones y evidencia011

Reproducción inicial: docs/construction/runs/2026-10-02-auditoria-correcciones/reproduction.json.
Fecha de consulta02/10/2026. Fuentes oficiales consultadas:
- https://cpe.sunat.gob.pe/tipos_de_comprobantes/nota_de_credito
- https://cpe.sunat.gob.pe/certificado-digital
- https://cpe.sunat.gob.pe/sistema_emision/facturador_sunat
- https://www.sunat.gob.pe/legislacion/superin/2014/anexo8-300-2014.pdf
La emisión electrónica requiere proceso/identidad/firma y evidencia del canal aplicable; un hash de JSON o dibujo no lo demuestra. Catálogo diferencia corrección de descripción/devolución parcial. Decisión: acotar simulación a reversión total soportada, no inventar liquidación parcial/firma/CDR.
Aritmética: n=9007199254740991 y p=28 produce2522015791327478 con Math.round(n*p/100), esperado2522015791327477 con racional entero. Se reutiliza núcleo exacto.
Reportes: conservar ventana de emisión y dinero de sesión por separado; un documento emitido en otro turno no es cobro del actual.
