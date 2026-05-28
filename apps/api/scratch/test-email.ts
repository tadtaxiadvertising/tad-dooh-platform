import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env desde el directorio actual (apps/api)
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEmail() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'TAD Test <no-reply@tad.do>';

  console.log('🚀 Iniciando prueba de conexión SMTP...');
  console.log(`📡 Host: ${host}`);
  console.log(`📧 User: ${user}`);

  if (!host || !user || !pass) {
    console.error('❌ Error: Faltan variables de entorno SMTP en el archivo .env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    // 1. Verificar conexión
    console.log('⏳ Verificando credenciales...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada con éxito.');

    // 2. Enviar correo de prueba
    console.log('📧 Enviando correo de prueba a tad.taxiadvertising@gmail.com...');
    const info = await transporter.sendMail({
      from,
      to: 'tad.taxiadvertising@gmail.com',
      subject: '🚀 Prueba de Conexión SMTP - TAD DOOH',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #FFD400;">TAD DOOH Platform</h2>
          <p>Esta es una prueba de conexión exitosa desde el servidor de la API.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Enviado el: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log(`✅ Email enviado con éxito! ID: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Error durante la prueba de email:');
    console.error(error);
  }
}

testEmail();
