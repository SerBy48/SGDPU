import nodemailer from 'nodemailer';

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

async function send(to, subject, html) {
  try {
    await getTransporter().sendMail({ from: process.env.SMTP_FROM, to, subject, html });
  } catch (e) {
    console.error('Error enviando correo:', e.message);
  }
}

export async function sendVerificationEmail(to, link) {
  await send(to, 'Verifica tu cuenta SGDPU', `
    <p>Gracias por registrarte en el Sistema para la Gestión de Disponibilidad de Parqueaderos USCO.</p>
    <p>Para activar tu cuenta, haz clic en el siguiente enlace (válido por 24 horas):</p>
    <p><a href="${link}">${link}</a></p>
  `);
}

export async function sendPasswordResetEmail(to, link) {
  await send(to, 'Recuperación de contraseña SGDPU', `
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>Si fuiste tú, haz clic en el siguiente enlace (válido por 15 minutos):</p>
    <p><a href="${link}">${link}</a></p>
    <p>Si no solicitaste este cambio, ignora este correo.</p>
  `);
}
