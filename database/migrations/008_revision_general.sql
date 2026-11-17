-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- (schema.sql ya incluye esto para instalaciones nuevas)
--
-- Los tokens opacos (refresh, verificación de correo, recuperación de
-- contraseña) pasan de hash bcrypt a SHA-256 para poder buscarlos por igualdad
-- con índice en vez de comparar con bcrypt contra todas las filas vigentes.
-- Los hashes bcrypt existentes ($2a$/$2b$...) ya no pueden coincidir: se
-- revocan/invalidan para dejar el estado coherente. Efecto: las sesiones
-- abiertas deben iniciar sesión de nuevo y los enlaces de verificación o
-- recuperación emitidos antes del cambio dejan de funcionar.

UPDATE refresh_tokens SET revocado=true, fecha_revocacion=now()
 WHERE revocado=false AND token_hash LIKE '$2%';
UPDATE email_verification_tokens SET usado=true, fecha_uso=now()
 WHERE usado=false AND token_hash LIKE '$2%';
UPDATE password_reset_tokens SET usado=true, fecha_uso=now()
 WHERE usado=false AND token_hash LIKE '$2%';

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(id_usuario);
CREATE INDEX IF NOT EXISTS idx_evt_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_hash ON password_reset_tokens(token_hash);

-- Los porteros creados desde administración quedaban con
-- email_verificado=false y el login los rechazaba. El backend ya los crea
-- verificados; esto corrige los que se crearon antes.
UPDATE usuarios SET email_verificado=true WHERE rol='PORTERO' AND email_verificado=false;
