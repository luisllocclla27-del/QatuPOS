# Contrato019

`release:check`: exit0 indica payload/migraciones/configuración estructural verificadas; no detecta todo secreto posible ni certifica operación. Sólo imprime paths/reglas, nunca contenido encontrado. Exit1 bloquea entrega. Git incluye tracked y untracked no ignorados; archivos ya seguidos se revisan aunque ahora estén ignorados.

`cloud:secure <check|install|doctor|migrate> --config <archivo externo>`: JSON plano de claves permitidas y valores string; máximo32KiB. Resolver enlaces antes de comprobar ubicación. Rechazar tanto path léxico como destino real dentro del checkout. Borrar variables heredadas QATU_*, NEXT_PUBLIC_*, VERCEL*, DATABASE_URL y PG* antes de pasar entorno validado. Check verifica configuración completa de instalación y runtime sin conexión. Install usa sólo CLI canónico, no semillas. Doctor requiere rol runtime; migrate mantenimiento. No imprimir configuración/stack/errores DB. La protección del archivo mediante permisos del sistema/gestor es responsabilidad operativa y debe configurarse.

Supabase: esquema privado qatupos y conexión verificada5432. Manifiesto contiene nombre, tamaño y SHA256 de cada migración existente; no autoriza editar migraciones aplicadas. Consultas000/100 son READ ONLY; no sustituyen cloud:install ni cloud:doctor.

Git: repositorio destino dado por el humano. No reset/force-push ni sobrescribir historial remoto. Un push a main puede activar Vercel si el usuario ya lo conectó; comprobar contexto antes de hacerlo. Vercel/Supabase no definidos quedan pendientes, con pasos concretos.
