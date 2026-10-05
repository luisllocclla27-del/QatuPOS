# Proyecciones018

Cuenta: total, paid, held, remaining_collectible del núcleo. Pendiente total = total - paid; libre sigue el campo del servidor. Pagos succeeded y unknown mantienen actor, referencia, fechas, turno, received/change. Visit/check IDs evitan confundir ocupaciones de la misma mesa. BusinessDay de apertura representa fecha de consumo; Payment.business_day_id representa recaudación.

Recuperación: PosCommand de whitelist, mismo operation_id, sin sesión/credenciales. Clave sessionStorage por user UUID; formato nuevo conserva compatibilidad con pedido anterior. Datos locales no conceden autoridad y pasan por validación/cookies/CSRF existentes al reenviar.
