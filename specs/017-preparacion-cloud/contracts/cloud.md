# Contrato cloud017

/v1/** conserva OpenAPI canónico. Next route Node recibe solo métodos existentes, body64KiB, cabeceras de origen/cookie/CSRF/content-type; IP de X-Forwarded-For solo bajo plataforma VERCEL=1, validada como IP; resto direcciones no confiables descartadas. Reenvía status y Set-Cookie separadas, no cache. No expone endpoint de administración/migración.

Secreto QATU_GUEST_CODE_KEY_BASE64: base64 canónico de exactamente32bytes, nunca NEXT_PUBLIC. Binding instalación registra hash secreto, project_ref, deployment_stage, public_origin. No distribuir ese hash por API. No rotar clave sin cerrar accesos/coordinar procedimiento.

Rol runtime qatu_pos_runtime (username pooler qatu_pos_runtime.PROJECTREF), NO SUPERUSER/BYPASSRLS/DDL. Tablas privadas no tienen permisos navegador; servidor sigue siendo autoridad para tenant/local y dinero. No afirmar aislamiento por RLS de tenant: servidor confiable puede consultar tenants según controles existentes.

Intentos cloud reservan un cupo antes de verificar contraseña/código: login8/min por IP, guest12/min por IP, reauth5/min por actor. Ventana fija por statement_timestamp SQL; fallo retiene cupo, éxito devuelve solo su reserva en la misma generación. No reinicia fallos ajenos; éxito tardío no devuelve cupo de ventana nueva. Bloqueados no incrementan contador. NAT comparte presupuesto de fallos/en vuelo, no bloquea ingresos correctos sucesivos. Hash de identificador, no IP ni claves persistidas.

Disponibilidad y recuperación: migraciones mínimas013, binding coincidente, current_schema qatupos, current_user limitado. Fallo =>503 sin mutar estado. Impresión/pago/fiscalidad mantienen estados pendientes o unknown mientras no haya integración real.
