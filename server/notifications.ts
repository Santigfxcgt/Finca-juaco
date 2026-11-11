import nodemailer, { Transporter } from 'nodemailer';
import { Reservation, Room, Guest, EstateSettings } from './types';
import { settings, saveDatabase } from './db';

export interface BookingNotificationResult {
  emailSent: boolean;
  deliveredViaSMTP: boolean;
  recipientEmail: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
  emailSubject: string;
  emailBodyText: string;
  whatsappUrl: string;
  whatsappMessage: string;
  smtpError?: string | null;
}

/**
 * Create Nodemailer Transporter using EstateSettings or environment variables
 */
export function getTransporter(customSettings?: EstateSettings): { transporter: Transporter; isRealSMTP: boolean; smtpUser: string } {
  const currentSettings = customSettings || settings;
  const smtpHost = currentSettings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(currentSettings?.smtpPort || process.env.SMTP_PORT || 587);
  const smtpUser = (currentSettings?.smtpUser || process.env.SMTP_USER || process.env.EMAIL_USER || 'restreporojassantiago940@gmail.com').trim();
  const smtpPass = (currentSettings?.smtpPass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const isRealSMTP = Boolean(smtpUser && smtpPass);

  if (isRealSMTP) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      isRealSMTP: true,
      smtpUser
    };
  } else {
    // Development JSON fallback logger
    return {
      transporter: nodemailer.createTransport({
        jsonTransport: true
      }),
      isRealSMTP: false,
      smtpUser
    };
  }
}

/**
 * Send test email to verify SMTP configuration
 */
export async function sendTestEmailNotification(
  targetEmail: string,
  customSettings?: EstateSettings
): Promise<{ success: boolean; message: string; mode: 'smtp' | 'simulated'; error?: string }> {
  const { transporter: mailer, isRealSMTP, smtpUser } = getTransporter(customSettings);

  const testHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Prueba de Conexión SMTP - TURIM . Juaco</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF6F0; margin: 0; padding: 20px; color: #2C1E16; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #D7C7B2; overflow: hidden; padding: 30px; text-align: center; }
        .badge { display: inline-block; background-color: #1B4332; color: #ffffff; padding: 6px 16px; border-radius: 50px; font-size: 12px; font-weight: bold; }
        h2 { color: #1B4332; margin-top: 15px; font-size: 22px; }
        p { color: #5A4535; font-size: 14px; line-height: 1.6; }
        .footer { margin-top: 25px; font-size: 12px; color: #7A6856; border-top: 1px solid #D7C7B2; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">Prueba de Correo SMTP Exitosa</span>
        <h2>¡Tu servicio de correos está conectado!</h2>
        <p>Este es un correo de prueba emitido desde el sistema de reservas del hotel <strong>TURIM . Juaco • Finca La Colmena</strong>.</p>
        <p>Cuando un huésped realice una reserva en la página web, recibirá inmediatamente un correo HTML con los detalles de su estancia, fechas y cabaña asignada.</p>
        <div class="footer">
          Finca Hotel La Colmena • Montenegro, Quindío, Colombia
        </div>
      </div>
    </body>
    </html>
  `;

  if (!isRealSMTP) {
    return {
      success: false,
      message: 'No se ha configurado la contraseña de aplicación de Gmail (SMTP_PASS). Ingresa a Ajustes de la Finca en el panel de administrador, escribe tu contraseña de aplicación de 16 caracteres de Google y guarda los cambios.',
      mode: 'simulated'
    };
  }

  try {
    await mailer.verify();
    await mailer.sendMail({
      from: `"TURIM . Juaco - Finca La Colmena" <${smtpUser}>`,
      to: targetEmail,
      subject: `Prueba de Conexión SMTP Exitosa - TURIM . Juaco`,
      html: testHtml,
      text: 'Prueba de conexión exitosa desde el sistema de Finca La Colmena.'
    });

    return {
      success: true,
      message: `¡Correo de prueba enviado con éxito a ${targetEmail} desde la cuenta autenticada ${smtpUser}!`,
      mode: 'smtp'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al autenticar con el servidor de correo: ${err.message}. Asegúrate de ingresar una Contraseña de Aplicación de 16 caracteres de Google válida.`,
      mode: 'smtp',
      error: err.message
    };
  }
}

/**
 * Clean phone number for WhatsApp API
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '573015677776';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && (cleaned.startsWith('3') || cleaned.startsWith('6'))) {
    cleaned = `57${cleaned}`;
  }
  return cleaned;
}

/**
 * 1. AUTOMATED BOOKING CONFIRMATION NOTIFICATION (EMAIL + GMAIL WEB + WHATSAPP)
 */
export async function sendBookingConfirmationNotification(
  reservation: Reservation,
  room: Room,
  guest: Guest,
  estateSettings?: EstateSettings
): Promise<BookingNotificationResult> {
  const currentSettings = estateSettings || settings;
  const formatCOP = (num: number) => `$${num.toLocaleString('es-CO')} COP`;

  const cleanPhone = formatPhoneForWhatsApp(guest.phone);
  const locationUrl = 'https://maps.google.com/?cid=3521013696986298488&entry=gps';
  const recipientEmail = (guest.email || '').trim().toLowerCase();

  // --- A. WhatsApp Confirmation Message ---
  const whatsappMessage = 
    `*¡Hola, ${guest.fullName}!* 🌿✨\n\n` +
    `Gracias por reservar en *TURIM . Juaco • Finca La Colmena* en Montenegro, Quindío.\n\n` +
    `📋 *DETALLES DE TU RESERVA:*\n` +
    `• *Código de Reserva:* ${reservation.reservationCode}\n` +
    `• *Cabaña:* ${room.name}\n` +
    `• *Llegada (Check-in):* ${reservation.checkInDate} (a partir de las 3:00 PM)\n` +
    `• *Salida (Check-out):* ${reservation.checkOutDate} (hasta la 1:00 PM)\n` +
    `• *Huéspedes:* ${reservation.adults} Adultos${reservation.children > 0 ? `, ${reservation.children} Niños` : ''}\n` +
    `• *Total:* ${formatCOP(reservation.totalAmount)}\n\n` +
    `☕ *Tu estadía incluye:* Desayuno campesino diario con café de origen, acceso libre a la piscina, parque infantil con columpios, zona verde para mascotas y parqueadero privado gratuito.\n\n` +
    `📍 *Ubicación GPS Exacta:* ${locationUrl}\n\n` +
    `Si tienes alguna pregunta o deseas enviar el soporte de tu anticipo, respondemos de inmediato por este chat o al +57 301 567 7776. ¡Te esperamos con los brazos abiertos! 🏡💛`;

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  // --- B. Plain text format for Email & Direct Gmail Compose ---
  const emailText = 
    `¡Hola, ${guest.fullName}!\n\n` +
    `Confirmamos tu reserva en TURIM . Juaco • Finca La Colmena en Montenegro, Quindío.\n\n` +
    `════════════════════════════════════════\n` +
    `DETALLES DE TU RESERVA:\n` +
    `════════════════════════════════════════\n` +
    `• Código de Reserva: ${reservation.reservationCode}\n` +
    `• Cabaña: ${room.name}\n` +
    `• Fecha de Llegada (Check-in): ${reservation.checkInDate} (desde 3:00 PM)\n` +
    `• Fecha de Salida (Check-out): ${reservation.checkOutDate} (hasta 1:00 PM)\n` +
    `• Cantidad de Huéspedes: ${reservation.adults} Adultos${reservation.children > 0 ? `, ${reservation.children} Niños` : ''}\n` +
    `• Valor Total: ${formatCOP(reservation.totalAmount)}\n\n` +
    `☕ SERVICIOS INCLUIDOS:\n` +
    `Desayuno campesino tradicional con café de origen, piscina campestre, senderos verdes, parqueadero privado y wifi.\n\n` +
    `📍 UBICACIÓN Y CÓMO LLEGAR:\n` +
    `Montenegro, Quindío (a 5 minutos del Parque del Café)\n` +
    `Google Maps: ${locationUrl}\n\n` +
    `CONTACTO DIRECTO:\n` +
    `Don Joaquín Restrepo • Tel / WhatsApp: +57 301 567 7776\n` +
    `¡Te esperamos con los brazos abiertos en el Corazón Cafetero! 🏡✨`;

  // --- C. HTML Email Template ---
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Confirmación de Reserva - TURIM . Juaco</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF6F0; margin: 0; padding: 20px; color: #2C1E16; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #D7C7B2; overflow: hidden; }
        .header { background-color: #F5EFE6; padding: 30px 20px; text-align: center; border-bottom: 1px solid #D7C7B2; }
        .brand { font-size: 28px; font-weight: bold; color: #8C4E28; }
        .brand span { color: #1A1817; }
        .subbrand { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #1B4332; margin-top: 4px; font-weight: bold; }
        .content { padding: 30px 25px; }
        .badge { display: inline-block; padding: 6px 14px; background-color: #1B4332; color: #ffffff; border-radius: 50px; font-size: 12px; font-weight: bold; }
        .details-box { background-color: #FAF6F0; border: 1px solid #D7C7B2; border-radius: 16px; padding: 20px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #EFE7DC; font-size: 14px; }
        .row:last-child { border-bottom: none; }
        .row-label { color: #6D5A4B; }
        .row-val { font-weight: bold; color: #2C1E16; text-align: right; }
        .btn-whatsapp { display: inline-block; background-color: #25D366; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 15px; }
        .footer { background-color: #FAF6F0; padding: 20px; text-align: center; font-size: 12px; color: #6D5A4B; border-top: 1px solid #D7C7B2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">TURIM <span>. Juaco</span></div>
          <div class="subbrand">Finca La Colmena • Montenegro, Quindío</div>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <span class="badge">¡Reserva Registrada Exitosamente!</span>
            <h2 style="font-size: 22px; margin-top: 15px; color: #2C1E16;">Hola, ${guest.fullName}</h2>
            <p style="color: #5A4535; font-size: 14px; line-height: 1.6;">
              Hemos recibido los detalles de tu solicitud de estadía. A continuación encuentras la información completa de tu reserva:
            </p>
          </div>

          <div class="details-box">
            <div class="row">
              <span class="row-label">Código de Reserva:</span>
              <span class="row-val" style="color: #1B4332; font-size: 16px;">${reservation.reservationCode}</span>
            </div>
            <div class="row">
              <span class="row-label">Cabaña:</span>
              <span class="row-val">${room.name}</span>
            </div>
            <div class="row">
              <span class="row-label">Fecha de Llegada (Check-in):</span>
              <span class="row-val">${reservation.checkInDate} (desde 3:00 PM)</span>
            </div>
            <div class="row">
              <span class="row-label">Fecha de Salida (Check-out):</span>
              <span class="row-val">${reservation.checkOutDate} (hasta 1:00 PM)</span>
            </div>
            <div class="row">
              <span class="row-label">Huéspedes:</span>
              <span class="row-val">${reservation.adults} Adultos${reservation.children > 0 ? `, ${reservation.children} Niños` : ''}</span>
            </div>
            <div class="row">
              <span class="row-label">Total a Pagar:</span>
              <span class="row-val" style="color: #1B4332;">${formatCOP(reservation.totalAmount)}</span>
            </div>
          </div>

          <div style="background-color: #EFE7DC; padding: 15px; border-radius: 12px; font-size: 13px; color: #2C1E16; line-height: 1.5; margin-bottom: 20px;">
            ☕ <strong>Incluido sin costo adicional:</strong> Desayuno campesino con café de origen, acceso a piscina campestre, parque infantil con columpios, zona verde para mascotas y parqueadero privado.
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${whatsappUrl}" target="_blank" class="btn-whatsapp">💬 Confirmar por WhatsApp con Don Juaco</a>
            <p style="font-size: 12px; color: #6D5A4B; margin-top: 10px;">
              Ubicación GPS exacto: <a href="${locationUrl}" style="color: #1B4332; font-weight: bold;" target="_blank">Google Maps Finca La Colmena</a>
            </p>
          </div>
        </div>

        <div class="footer">
          <strong>Finca La Colmena de Don Juaco</strong><br>
          Montenegro, Quindío, Colombia • Tel: +57 301 567 7776
        </div>
      </div>
    </body>
    </html>
  `;

  // --- D. URLs for Direct Gmail Web Compose and Mailto App ---
  const emailSubject = `Comprobante de Reserva [${reservation.reservationCode}] - TURIM . Juaco Finca La Colmena`;
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailText)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailText)}`;

  // --- E. Automated Server SMTP Dispatch ---
  let emailSent = false;
  let deliveredViaSMTP = false;
  let smtpError: string | null = null;

  try {
    const { transporter: mailer, isRealSMTP, smtpUser } = getTransporter(currentSettings);

    if (isRealSMTP && recipientEmail) {
      console.log(`[NOTIFICACIÓN] Despachando comprobante vía SMTP real a: ${recipientEmail} desde ${smtpUser}...`);
      const sendResult = await mailer.sendMail({
        from: `"${currentSettings.notificationSenderName || 'TURIM . Juaco - Finca La Colmena'}" <${smtpUser}>`,
        to: recipientEmail,
        replyTo: smtpUser,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      emailSent = true;
      deliveredViaSMTP = true;
      console.log(`[NOTIFICACIÓN] Correo entregado exitosamente a ${recipientEmail}. MessageId: ${sendResult.messageId}`);
    } else {
      console.log(`[NOTIFICACIÓN] Servidor en modo despacho directo para ${recipientEmail}. SMTP no configurado con contraseña.`);
    }
  } catch (err: any) {
    smtpError = err.message || 'Error en servidor SMTP';
    console.warn(`[NOTIFICACIÓN] Aviso al despachar por SMTP: ${smtpError}`);
  }

  // Update notification flags on reservation
  reservation.confirmationSent = true;
  reservation.confirmationSentAt = new Date().toISOString();
  saveDatabase();

  return {
    emailSent,
    deliveredViaSMTP,
    recipientEmail,
    gmailComposeUrl,
    mailtoUrl,
    emailSubject,
    emailBodyText: emailText,
    whatsappUrl,
    whatsappMessage,
    smtpError
  };
}

/**
 * 2. AUTOMATED 2-DAY PRE-ARRIVAL REMINDER (EMAIL + WHATSAPP)
 */
export async function sendPreArrivalReminderNotification(
  reservation: Reservation,
  room: Room,
  guest: Guest,
  estateSettings?: EstateSettings
): Promise<{ emailSent: boolean; whatsappUrl: string; whatsappMessage: string }> {
  const currentSettings = estateSettings || settings;
  const formatCOP = (num: number) => `$${num.toLocaleString('es-CO')} COP`;

  const cleanPhone = formatPhoneForWhatsApp(guest.phone);
  const locationUrl = 'https://maps.google.com/?cid=3521013696986298488&entry=gps';

  // --- A. 2-Day Pre-Arrival WhatsApp Message ---
  const whatsappMessage = 
    `*⏰ RECORDATORIO DE TU VIAJE EN 2 DÍAS* 🌿✨\n\n` +
    `*¡Hola, ${guest.fullName}!* Te saludamos de *TURIM . Juaco • Finca La Colmena* en Montenegro, Quindío.\n\n` +
    `Faltan solo *2 días* para tu llegada este *${reservation.checkInDate}*.\n\n` +
    `📌 *RESUMEN DE TU VIAJE:*\n` +
    `• *Reserva:* ${reservation.reservationCode}\n` +
    `• *Cabaña:* ${room.name}\n` +
    `• *Check-in:* ${reservation.checkInDate} a partir de las 3:00 PM\n` +
    `• *Check-out:* ${reservation.checkOutDate} hasta la 1:00 PM\n\n` +
    `🗺️ *¿CÓMO LLEGAR?*\n` +
    `Estamos ubicados a solo 5 minutos del Parque del Café en Montenegro con vía totalmente pavimentada y parqueadero privado gratuito.\n` +
    `📍 Enlace de GPS directo: ${locationUrl}\n\n` +
    `🎒 *RECOMENDACIONES:*\n` +
    `• Trae traje de baño para la piscina campestre.\n` +
    `• Si viajas con mascota, recuerda traer su camita.\n` +
    `• Te recibiremos con café de origen recién molido y tu desayuno campesino diario servido en mesa.\n\n` +
    `¿Tienes alguna duda sobre tu ruta o la hora de tu llegada? Responde a este chat o llámanos al +57 301 567 7776. ¡Buen viaje, te esperamos! 🚗☕`;

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

  // --- B. 2-Day Pre-Arrival Email HTML ---
  const emailHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Recordatorio de Viaje (Faltan 2 días) - TURIM . Juaco</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF6F0; margin: 0; padding: 20px; color: #2C1E16; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #D7C7B2; overflow: hidden; }
        .header { background-color: #F5EFE6; padding: 25px 20px; text-align: center; border-bottom: 1px solid #D7C7B2; }
        .brand { font-size: 26px; font-weight: bold; color: #8C4E28; }
        .brand span { color: #1A1817; }
        .content { padding: 30px 25px; }
        .badge { display: inline-block; padding: 6px 16px; background-color: #8C4E28; color: #ffffff; border-radius: 50px; font-size: 13px; font-weight: bold; }
        .box { background-color: #FAF6F0; border: 1px solid #D7C7B2; border-radius: 16px; padding: 20px; margin: 20px 0; }
        .btn-wa { display: inline-block; background-color: #2D6A4F; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; }
        .footer { background-color: #FAF6F0; padding: 20px; text-align: center; font-size: 12px; color: #6D5A4B; border-top: 1px solid #D7C7B2; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">TURIM <span>. Juaco</span></div>
          <div style="font-size: 12px; font-weight: bold; color: #1B4332; margin-top: 4px;">FINCA LA COLMENA • MONTENEGRO, QUINDÍO</div>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <span class="badge">⏰ ¡TU VIAJE SE APROXIMA! FALTAN 2 DÍAS</span>
            <h2 style="margin-top: 15px; color: #2C1E16;">Hola, ${guest.fullName}</h2>
            <p style="color: #5A4535; font-size: 14px; line-height: 1.6;">
              Nos complace saludarte. Te recordamos que tu reserva en Finca La Colmena inicia el próximo <strong>${reservation.checkInDate}</strong>.
            </p>
          </div>

          <div class="box">
            <div style="margin-bottom: 10px; font-weight: bold; color: #1B4332;">📌 Cabaña Asignada: ${room.name}</div>
            <div style="font-size: 13px; color: #4A3B32; line-height: 1.6;">
              • <strong>Código:</strong> ${reservation.reservationCode}<br>
              • <strong>Check-In:</strong> ${reservation.checkInDate} (a partir de las 3:00 PM)<br>
              • <strong>Check-Out:</strong> ${reservation.checkOutDate} (hasta la 1:00 PM)<br>
              • <strong>Dirección:</strong> Montenegro, Quindío (a 5 minutos del Parque del Café).
            </div>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${whatsappUrl}" target="_blank" class="btn-wa">💬 Hablar con Don Juaco por WhatsApp</a>
            <p style="font-size: 12px; color: #6D5A4B; margin-top: 12px;">
              📍 <a href="${locationUrl}" style="color: #1B4332; font-weight: bold;" target="_blank">Abrir Ruta GPS en Google Maps</a>
            </p>
          </div>
        </div>

        <div class="footer">
          <strong>TURIM . Juaco • Finca La Colmena</strong><br>
          Montenegro, Quindío • Tel: +57 301 567 7776
        </div>
      </div>
    </body>
    </html>
  `;

  let emailSent = false;
  try {
    const { transporter: mailer, isRealSMTP, smtpUser } = getTransporter(currentSettings);
    if (isRealSMTP && guest.email) {
      await mailer.sendMail({
        from: `"${currentSettings.notificationSenderName || 'TURIM . Juaco - Finca La Colmena'}" <${smtpUser}>`,
        to: guest.email,
        subject: `⏰ Recordatorio de Tu Viaje en 2 Días [${reservation.reservationCode}] - TURIM . Juaco`,
        html: emailHtml
      });
      emailSent = true;
      console.log(`[RECORDATORIO AUTOMÁTICO] Correo enviado exitosamente a ${guest.email} para reserva ${reservation.reservationCode}`);
    }
  } catch (err: any) {
    console.warn(`[RECORDATORIO AUTOMÁTICO] Aviso al enviar correo: ${err.message}`);
  }

  // Mark reminder as sent
  reservation.reminderSent = true;
  reservation.reminderSentAt = new Date().toISOString();
  saveDatabase();

  return { emailSent, whatsappUrl, whatsappMessage };
}

/**
 * 3. BACKGROUND CRON JOB TO CHECK AND SEND 2-DAY PRE-ARRIVAL REMINDERS AUTOMATICALLY
 */
export async function checkAndSendPreArrivalReminders(
  reservations: Reservation[],
  rooms: Room[],
  guests: Guest[],
  estateSettings?: EstateSettings
): Promise<{ processed: number; remindersSent: number }> {
  let remindersSent = 0;
  const now = new Date();
  const currentSettings = estateSettings || settings;

  for (const reservation of reservations) {
    // Skip cancelled or already reminded reservations
    if (reservation.status === 'CANCELLED' || reservation.reminderSent) {
      continue;
    }

    // Parse checkInDate (YYYY-MM-DD)
    const checkIn = new Date(`${reservation.checkInDate}T15:00:00`);
    const diffMs = checkIn.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If reservation is approximately 2 days away (between 0 and 52 hours away)
    if (diffHours > 0 && diffHours <= 52) {
      const room = rooms.find(r => r.id === reservation.roomId);
      const guest = guests.find(g => g.id === reservation.guestId);

      if (room && guest) {
        try {
          await sendPreArrivalReminderNotification(reservation, room, guest, currentSettings);
          remindersSent++;
        } catch (err: any) {
          console.error(`Error enviando recordatorio automático para ${reservation.reservationCode}:`, err);
        }
      }
    }
  }

  return { processed: reservations.length, remindersSent };
}
