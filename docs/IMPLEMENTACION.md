# Notas de implementación

## Correspondencia con requisitos

- RF-001: registro público → `POST /api/auth/register`, siempre rol CONSULTOR.
- RF-002/RNF-004: login, JWT de corta duración y refresh token rotativo.
- RF-003: bloqueo después de 5 intentos fallidos durante 15 minutos.
- RF-005: logout revoca refresh token.
- RF-006: administración de porteros.
- RF-007/RF-008/RF-009: estructura de parqueaderos, secciones y horarios en PostgreSQL; el MVP administrativo incluye la base para ampliar configuración.
- RF-010/RNF-010: auditoría y movimientos históricos sin endpoints de edición/eliminación; triggers de BD rechazan UPDATE/DELETE.
- RF-011/RF-012/RNF-009: entrada/salida con transacción y `SELECT ... FOR UPDATE`.
- RF-013/RF-014: alerta de lleno y orientación a otros parqueaderos.
- RF-016/RF-017/RNF-003: disponibilidad, indicadores visuales y actualización Socket.IO + respaldo de 5 s.
- RF-018/RF-019/RF-020/RF-021: estadísticas, reportes e historial.

## Decisión sobre cupos

La documentación de datos define SECCION como entidad con `capacidad` y `cupos_disponibles`, y permite que el plano represente secciones/cupos individuales. Para el plano demostrativo cada cupo se modela como una SECCION de capacidad 1. Esto mantiene el esquema descrito sin inventar una tabla adicional de CUPOS.

## Limitaciones deliberadas del MVP

1. El archivo SVG se incluye como recurso demostrativo. La interfaz administrativa de carga/edición visual del SVG puede ampliarse sobre las tablas `planos_parqueadero` y `coordenadas_seccion`.
2. La exportación PDF/Excel está preparada en el modelo de datos y endpoints de reportes, pero la generación binaria debe añadirse con las librerías de exportación seleccionadas si se requiere el entregable final con archivos descargables.
3. Recuperación de contraseña por correo institucional no se implementa porque el documento la marca como Should Have y además indica que la integración con correo institucional queda fuera del alcance de la primera versión.
