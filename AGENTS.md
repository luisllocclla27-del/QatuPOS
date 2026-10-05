# El Encanto Huamanguino

**Repositorio independiente publicado:** esta carpeta pasa a ser la raíz Git de QatuPOS. Si el proyecto padre no existe en una copia/clonación, no inventar su contenido ni llamar aceptada su planificación: consultar README, docs/RELEASE-CLOUD.md, docs/DEPLOY-SUPABASE-VERCEL.md, specs/019-release-cloud y el último docs/construction/current-run.json. `release:check` es portable; `validate:sdd` conserva dependencia explícita del padre. Mantener asignación exclusiva de paths antes de editar, contratos del núcleo y revisión independiente de finanzas/aislamiento. No modificar migraciones aplicadas ni normalizar sus bytes. No usar scripts/guías históricos de Supabase-browser como arquitectura vigente.

Esta carpeta contiene todo el código, dependencias, datos sintéticos y evidencia del piloto. La planificación compartida de QatuPOS permanece en `../docs` y `../specs`; las reglas de `../AGENTS.md` siguen aplicando. No escribir en el proyecto padre al desarrollar este piloto.

Ejecutar los comandos desde esta carpeta. Los WorkOrders se interpretan con escritura relativa a esta carpeta; sus hashes históricos de lectura corresponden al proyecto padre, según `docs/construction/relocation.json`. Registrar nuevas asignaciones antes de delegar y no aceptar cambios financieros sin revisión independiente.

Mantener pruebas PostgreSQL en bases efímeras `qatupos_lab_test_*`. Nunca limpiar `qatupos_lab` para pasar pruebas. No activar SUNAT, proveedores de pago ni hardware reales por inferencia. Las capacidades simuladas deben identificarse en la interfaz y en la entrega.
