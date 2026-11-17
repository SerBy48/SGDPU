export async function audit(client, user, action, module, detail, ip='') {
  await client.query(
    `INSERT INTO auditoria(id_usuario,rol_usuario,accion,modulo,descripcion_detalle,ip)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [user?.id || null, user?.rol || null, action, module, detail, ip]
  );
}
