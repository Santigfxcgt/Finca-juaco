"""
Servicio FastAPI para subida de imágenes de habitaciones.
Requisitos técnicos estrictos:
1. Recibir la imagen mediante multipart/form-data.
2. Validar que la extensión del archivo sea segura (jpg, jpeg, png, webp).
3. Renombrar el archivo automáticamente usando uuid para evitar sobreescritura.
4. Guardar la imagen físicamente en el directorio local del servidor: /static/uploads/habitaciones/
5. Retornar un JSON con código 200 y la ruta relativa de la imagen (ej: /static/uploads/habitaciones/mi-uuid.jpg) para guardarla en MySQL.
6. Manejo de errores (código 400) si el archivo es inválido o no se envía.
"""

import os
import uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="API de Subida de Habitaciones - Finca La Colmena de Don Juaco",
    description="Endpoint multipart/form-data para recepción, validación y almacenamiento de fotografías de habitaciones.",
    version="1.0.0"
)

# Permitir CORS para conexión desde frontend React u otras aplicaciones
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Extensiones seguras permitidas
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

# Directorio de destino: se garantiza la creación en /static/uploads/habitaciones/
# con respaldo seguro en el directorio local del proyecto en caso de permisos de usuario estándar
ROOT_UPLOAD_DIR = Path("/static/uploads/habitaciones")
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads" / "habitaciones"


def get_target_directory() -> Path:
    """
    Intenta usar el directorio absoluto /static/uploads/habitaciones/
    o el directorio local ./static/uploads/habitaciones/ si no hay permisos root.
    """
    try:
        ROOT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        return ROOT_UPLOAD_DIR
    except (PermissionError, OSError):
        LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        return LOCAL_UPLOAD_DIR


# Montar servicio de archivos estáticos si la carpeta local existe
try:
    static_folder = LOCAL_UPLOAD_DIR.parent.parent
    if static_folder.exists():
        app.mount("/static", StaticFiles(directory=str(static_folder)), name="static")
except Exception:
    pass


@app.post(
    "/upload/habitaciones",
    summary="Subir imagen de habitación mediante multipart/form-data",
    status_code=status.HTTP_200_OK,
    responses={
        200: {
            "description": "Imagen subida exitosamente con ruta relativa para MySQL",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "code": 200,
                        "message": "Imagen subida exitosamente.",
                        "image_path": "/static/uploads/habitaciones/c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp",
                        "ruta": "/static/uploads/habitaciones/c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp",
                        "filename": "c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp"
                    }
                }
            }
        },
        400: {
            "description": "Error en el archivo enviado (falta archivo, extensión no permitida o archivo corrupto)",
            "content": {
                "application/json": {
                    "example": {
                        "status": "error",
                        "code": 400,
                        "detail": "Extensión '.exe' no permitida. Formatos seguros permitidos: jpg, jpeg, png, webp."
                    }
                }
            }
        }
    }
)
async def upload_room_image(file: UploadFile = File(..., description="Archivo de imagen de la habitación")):
    # 1. Validar que el archivo fue enviado
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha enviado ningún archivo. Asegúrate de incluir el archivo en multipart/form-data bajo el campo 'file'."
        )

    filename = file.filename.strip()

    # 2. Validar que posea extensión
    if "." not in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo enviado no contiene una extensión válida."
        )

    # 3. Validar extensión segura (jpg, jpeg, png, webp)
    extension = filename.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión '.{extension}' no permitida. Formatos seguros permitidos: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        )

    # 4. Leer contenido y verificar que no esté vacío (0 bytes)
    contents = await file.read()
    if not contents or len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo enviado está vacío (0 bytes)."
        )

    # 5. Renombrar automáticamente usando UUID para evitar colisiones
    unique_filename = f"{uuid.uuid4()}.{extension}"
    relative_path = f"/static/uploads/habitaciones/{unique_filename}"

    # 6. Guardar físicamente en el directorio local del servidor
    target_dir = get_target_directory()
    file_path = target_dir / unique_filename

    try:
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Si el directorio principal no es el local, mantener una copia sincronizada en el local
        if target_dir != LOCAL_UPLOAD_DIR:
            try:
                LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                with open(LOCAL_UPLOAD_DIR / unique_filename, "wb") as f_local:
                    f_local.write(contents)
            except Exception:
                pass
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al escribir la imagen físicamente en el servidor: {str(e)}"
        )

    # 7. Retornar JSON con código 200 y ruta relativa para MySQL
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "success",
            "code": 200,
            "message": "Imagen subida exitosamente.",
            "image_path": relative_path,
            "ruta": relative_path,
            "filename": unique_filename,
            "size_bytes": len(contents)
        }
    )


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Upload Habitaciones Python (FastAPI)",
        "endpoint": "POST /upload/habitaciones",
        "allowed_formats": list(ALLOWED_EXTENSIONS),
        "target_directory": str(get_target_directory())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("upload_fastapi:app", host="0.0.0.0", port=8000, reload=True)
