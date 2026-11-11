import os
import uuid
import shutil
from datetime import date
from enum import Enum
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from email_service import send_booking_confirmation_email

app = FastAPI(
    title="Hotel Booking & Room Images API",
    description="Microservicio FastAPI para recepción de reservas, comprobantes y carga de imágenes de habitaciones",
    version="1.1.0"
)

# Configuración del directorio de subida local
UPLOAD_DIR = os.path.join(os.getcwd(), "static", "uploads", "habitaciones")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Montar ruta estática para permitir previsualización de imágenes guardadas
static_base_dir = os.path.join(os.getcwd(), "static")
app.mount("/static", StaticFiles(directory=static_base_dir), name="static")

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

# Configuración de CORS para permitir solicitudes desde el frontend local o remoto
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RoomTypeEnum(str, Enum):
    SENCILLA = "Sencilla"
    DOBLE = "Doble"
    SUITE = "Suite"


class BookingRequest(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=120, description="Nombre completo del huésped")
    email: EmailStr = Field(..., description="Correo electrónico del huésped")
    check_in: date = Field(..., description="Fecha de llegada")
    check_out: date = Field(..., description="Fecha de salida")
    room_type: RoomTypeEnum = Field(..., description="Tipo de habitación o cabaña")

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: date, values):
        """Valida que la fecha de check-out sea posterior a la de check-in."""
        check_in = values.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("La fecha de Check-out debe ser posterior a la fecha de Check-in.")
        return v


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Hotel Booking Confirmation Service (FastAPI + SMTP)",
        "docs": "/docs"
    }


@app.post("/api/reservations", status_code=status.HTTP_201_CREATED)
async def create_reservation(booking: BookingRequest):
    """
    Recibe la reserva, valida los datos y envía automáticamente el correo HTML de confirmación.
    """
    reservation_code = f"COL-{date.today().year}-{uuid.uuid4().hex[:4].upper()}"

    try:
        # Enviar correo de confirmación por SMTP
        send_booking_confirmation_email(
            recipient_email=booking.email,
            guest_name=booking.full_name,
            check_in=booking.check_in.strftime("%d/%m/%Y"),
            check_out=booking.check_out.strftime("%d/%m/%Y"),
            room_type=booking.room_type.value,
            reservation_code=reservation_code
        )
        email_sent = True
    except ValueError as ve:
        # Faltan variables de entorno
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(ve)
        )
    except Exception as e:
        # Error al comunicarse con el servidor SMTP (credenciales, red, etc.)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al enviar el correo de confirmación vía SMTP: {str(e)}"
        )

    return {
        "success": True,
        "message": f"¡Reserva confirmada! Se envió un correo con los detalles a {booking.email}",
        "reservation_code": reservation_code,
        "email_sent": email_sent,
        "data": {
            "guest": booking.full_name,
            "email": booking.email,
            "check_in": booking.check_in,
            "check_out": booking.check_out,
            "room_type": booking.room_type.value
        }
    }


@app.post("/upload/habitaciones", status_code=status.HTTP_200_OK)
@app.post("/api/rooms/upload-image", status_code=status.HTTP_200_OK)
async def upload_room_image(file: UploadFile = File(None)):
    """
    Sube y almacena una imagen de habitación mediante multipart/form-data.
    Requisitos cumplidos:
    1. Recibe la imagen vía multipart/form-data.
    2. Valida extensiones seguras (jpg, jpeg, png, webp).
    3. Renombra automáticamente con UUID único para evitar colisiones.
    4. Guarda físicamente en el directorio local /static/uploads/habitaciones/.
    5. Retorna JSON con código 200 y ruta relativa para almacenar en MySQL.
    6. Retorna error 400 si el archivo es inválido o no se envía.
    """
    # 1. Validación: archivo enviado
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha enviado ningún archivo de imagen. Por favor adjunta un archivo en el campo 'file' o 'image' (multipart/form-data)."
        )

    # 2. Validación: extensión del nombre de archivo
    clean_filename = file.filename.strip()
    if "." not in clean_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo enviado no posee una extensión válida."
        )

    ext = clean_filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión .{ext} no permitida. Los formatos seguros permitidos son: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )

    # 3. Renombrar automáticamente usando UUIDv4
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    destination_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 4. Guardar físicamente en el directorio local del servidor
    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al escribir la imagen en el servidor: {str(e)}"
        )
    finally:
        await file.close()

    # Validación adicional: archivo no vacío
    if os.path.getsize(destination_path) == 0:
        os.remove(destination_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo enviado está vacío (0 bytes)."
        )

    # 5. Retornar ruta relativa para guardar en MySQL (ej: /static/uploads/habitaciones/mi-uuid.jpg)
    relative_path = f"/static/uploads/habitaciones/{unique_filename}"
    return {
        "status": "success",
        "message": "Imagen subida exitosamente.",
        "image_path": relative_path,
        "filename": unique_filename
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

