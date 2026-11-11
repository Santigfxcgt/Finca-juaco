"""
Servicio Flask para subida de imágenes de habitaciones.
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
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)

# Configuración de extensiones permitidas
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

# Rutas de almacenamiento
ROOT_UPLOAD_DIR = Path("/static/uploads/habitaciones")
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "uploads" / "habitaciones"


def get_target_directory() -> Path:
    """Retorna la ruta destino física con permisos asegurados."""
    try:
        ROOT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        return ROOT_UPLOAD_DIR
    except (PermissionError, OSError):
        LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        return LOCAL_UPLOAD_DIR


@app.route("/upload/habitaciones", methods=["POST"])
def upload_room_image():
    # 1. Validar que el archivo fue enviado en multipart/form-data
    # Acepta campos comunes: 'file', 'image', 'foto'
    file = None
    for field_name in ["file", "image", "foto", "habitacion"]:
        if field_name in request.files:
            file = request.files[field_name]
            break

    # Si no está en campos específicos, tomar el primer archivo presente
    if not file and len(request.files) > 0:
        file = next(iter(request.files.values()))

    if not file or not file.filename or file.filename.strip() == "":
        return jsonify({
            "status": "error",
            "code": 400,
            "message": "No se ha enviado ningún archivo de imagen. Adjunta un archivo mediante multipart/form-data en el campo 'file'."
        }), 400

    filename = file.filename.strip()

    # 2. Validar que contenga punto de extensión
    if "." not in filename:
        return jsonify({
            "status": "error",
            "code": 400,
            "message": "El archivo enviado no posee una extensión válida."
        }), 400

    # 3. Validar extensión segura (jpg, jpeg, png, webp)
    extension = filename.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "status": "error",
            "code": 400,
            "message": f"Extensión .{extension} no permitida. Formatos seguros permitidos: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        }), 400

    # 4. Validar contenido no vacío
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    file.seek(0)

    if file_length == 0:
        return jsonify({
            "status": "error",
            "code": 400,
            "message": "El archivo enviado está vacío (0 bytes)."
        }), 400

    # 5. Renombrar automáticamente con UUID
    unique_filename = f"{uuid.uuid4()}.{extension}"
    relative_path = f"/static/uploads/habitaciones/{unique_filename}"

    # 6. Guardar físicamente en el directorio local del servidor
    target_dir = get_target_directory()
    file_path = target_dir / unique_filename

    try:
        file.save(str(file_path))
        
        # Mantener réplica local si se escribió en /static raíz
        if target_dir != LOCAL_UPLOAD_DIR:
            try:
                LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                file.seek(0)
                file.save(str(LOCAL_UPLOAD_DIR / unique_filename))
            except Exception:
                pass
    except Exception as e:
        return jsonify({
            "status": "error",
            "code": 500,
            "message": f"Error al guardar el archivo físicamente: {str(e)}"
        }), 500

    # 7. Retornar JSON con código 200 y ruta relativa para MySQL
    return jsonify({
        "status": "success",
        "code": 200,
        "message": "Imagen subida exitosamente.",
        "image_path": relative_path,
        "ruta": relative_path,
        "filename": unique_filename,
        "size_bytes": file_length
    }), 200


@app.route("/static/uploads/habitaciones/<filename>", methods=["GET"])
def serve_uploaded_room_image(filename):
    """Sirve la imagen subida directamente mediante HTTP."""
    target_dir = get_target_directory()
    if (target_dir / filename).exists():
        return send_from_directory(str(target_dir), filename)
    if (LOCAL_UPLOAD_DIR / filename).exists():
        return send_from_directory(str(LOCAL_UPLOAD_DIR), filename)
    return jsonify({"error": "Imagen no encontrada"}), 404


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "Upload Habitaciones Python (Flask)",
        "endpoint": "POST /upload/habitaciones",
        "allowed_formats": list(ALLOWED_EXTENSIONS)
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
