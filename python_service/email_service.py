import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Fallback si no está instalado python-dotenv
    env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env")
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", ""))
HOTEL_NAME = os.getenv("HOTEL_NAME", "TURIM . Juaco • Finca La Colmena")
HOTEL_PHONE = os.getenv("HOTEL_PHONE", "+57 301 567 7776")


def build_confirmation_html(guest_name: str, check_in: str, check_out: str, room_type: str, reservation_code: str = "") -> str:
    """Genera la plantilla de correo con diseño HTML profesional para el hotel."""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Confirmación de Reserva - {HOTEL_NAME}</title>
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #FAF6F0;
                margin: 0;
                padding: 20px;
                color: #2C1E16;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                border: 1px solid #D7C7B2;
            }}
            .header {{
                background-color: #1B4332;
                color: #ffffff;
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                letter-spacing: 0.5px;
            }}
            .header p {{
                margin: 6px 0 0 0;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #D8F3DC;
            }}
            .content {{
                padding: 30px 25px;
                line-height: 1.6;
            }}
            .badge {{
                display: inline-block;
                background-color: #2D6A4F;
                color: #ffffff;
                padding: 6px 16px;
                border-radius: 50px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }}
            .card {{
                background-color: #FAF6F0;
                border: 1px solid #D7C7B2;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px dashed #E2D3C1;
                font-size: 14px;
            }}
            .detail-row:last-child {{
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }}
            .detail-label {{
                font-weight: 600;
                color: #6D5A4B;
            }}
            .detail-val {{
                color: #2C1E16;
                font-weight: 700;
            }}
            .amenities {{
                background-color: #EFE7DC;
                border-radius: 10px;
                padding: 14px 18px;
                font-size: 13px;
                color: #4A3B32;
                margin-top: 15px;
            }}
            .footer {{
                background-color: #FAF6F0;
                text-align: center;
                padding: 20px;
                font-size: 12px;
                color: #7A6856;
                border-top: 1px solid #D7C7B2;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{HOTEL_NAME}</h1>
                <p>Montenegro, Quindío • Eje Cafetero</p>
            </div>
            <div class="content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span class="badge">¡Reserva Confirmada!</span>
                    <h2 style="color: #1B4332; margin-top: 14px; font-size: 22px;">Hola, {guest_name}</h2>
                    <p style="color: #6D5A4B; font-size: 14px;">
                        Hemos recibido y procesado con éxito tu solicitud de estancia. A continuación te presentamos el resumen detallado de tu reserva:
                    </p>
                </div>

                <div class="card">
                    {f'<div class="detail-row"><span class="detail-label">Código de Reserva:</span><span class="detail-val" style="color: #1B4332;">{reservation_code}</span></div>' if reservation_code else ''}
                    <div class="detail-row">
                        <span class="detail-label">Tipo de Cabaña / Habitación:</span>
                        <span class="detail-val">{room_type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Llegada (Check-in):</span>
                        <span class="detail-val">{check_in} (A partir de las 3:00 PM)</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Salida (Check-out):</span>
                        <span class="detail-val">{check_out} (Hasta las 11:00 AM)</span>
                    </div>
                </div>

                <div class="amenities">
                    ☕ <strong>Tu estancia incluye:</strong> Desayuno campesino diario con café de origen, acceso libre a la piscina campestre, parque infantil con columpios, zona verde para mascotas y parqueadero privado gratuito.
                </div>

                <p style="margin-top: 25px; font-size: 13px; color: #6D5A4B; text-align: center;">
                    Si tienes alguna petición especial o requieres asistencia con tu llegada, puedes contactarnos al teléfono <strong>{HOTEL_PHONE}</strong> o responder directamente a este correo.
                </p>
            </div>
            <div class="footer">
                © {HOTEL_NAME}<br>
                Montenegro, Quindío, Colombia • Atención personalizada
            </div>
        </div>
    </body>
    </html>
    """


def send_booking_confirmation_email(
    recipient_email: str,
    guest_name: str,
    check_in: str,
    check_out: str,
    room_type: str,
    reservation_code: str = ""
) -> bool:
    """Configura y envía el correo mediante conexión SMTP segura."""
    if not SMTP_USER or not SMTP_PASSWORD:
        raise ValueError("Variables SMTP_USER o SMTP_PASSWORD no configuradas en el archivo .env")

    msg = MIMEMultipart("alternative")
    subject = f"Confirmación de Reserva - {HOTEL_NAME}"
    if reservation_code:
        subject = f"Confirmación de Reserva [{reservation_code}] - {HOTEL_NAME}"

    msg["Subject"] = subject
    msg["From"] = f"{HOTEL_NAME} <{SMTP_USER}>"
    msg["To"] = recipient_email

    # Versión de texto plano de respaldo
    text_content = (
        f"Hola {guest_name},\n\n"
        f"Tu reserva en {HOTEL_NAME} ha sido confirmada con éxito.\n"
        f"Cabaña/Habitación: {room_type}\n"
        f"Check-in: {check_in}\n"
        f"Check-out: {check_out}\n\n"
        f"¡Te esperamos con los brazos abiertos!\nTeléfono: {HOTEL_PHONE}\n"
    )
    msg.attach(MIMEText(text_content, "plain", "utf-8"))

    # Versión HTML enriquecida
    html_content = build_confirmation_html(guest_name, check_in, check_out, room_type, reservation_code)
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Envío mediante servidor SMTP con cifrado STARTTLS
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
    try:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, recipient_email, msg.as_string())
        return True
    finally:
        server.quit()
