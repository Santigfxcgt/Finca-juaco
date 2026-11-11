import os
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configuración del directorio de subida según el requerimiento: /static/uploads/habitaciones/
# Usamos ruta relativa al directorio de ejecución o absoluta para portabilidad
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads', 'habitaciones')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Límite máximo de subida recomendado (ej. 16 MB)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Extensiones seguras permitidas
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}


def is_allowed_file(filename: str) -> bool:
    """Verifica si el nombre de archivo contiene una extensión válida y permitida."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload/habitaciones', methods=['POST'])
@app.route('/api/rooms/upload-image', methods=['POST'])
def upload_room_image():
    """
    Endpoint Flask para subir imágenes de habitaciones con multipart/form-data.
    Requisitos:
    - Recibir archivo multipart/form-data en 'image' o 'file'.
    - Validar extensiones seguras (jpg, jpeg, png, webp).
    - Renombrar con UUIDv4.
    - Guardar en /static/uploads/habitaciones/.
    - Retornar JSON 200 con la ruta relativa para MySQL.
    - Error 400 si falta el archivo o es inválido.
    """
    # 1. Validar presencia del campo de archivo en multipart/form-data
    if 'image' not in request.files and 'file' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No se envió ningún archivo de imagen en la petición multipart/form-data (campo 'image' o 'file')."
        }), 400

    file = request.files.get('image') or request.files.get('file')

    # 2. Validar que se haya seleccionado un archivo
    if file is None or file.filename.strip() == '':
        return jsonify({
            "status": "error",
            "message": "El nombre del archivo está vacío o no se seleccionó ninguna imagen."
        }), 400

    filename = file.filename.strip()

    # 3. Validar extensión permitida
    if not is_allowed_file(filename):
        return jsonify({
            "status": "error",
            "message": f"Formato no permitido. Solo se aceptan extensiones seguras: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
        }), 400

    # 4. Renombrar automáticamente con UUID
    ext = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"

    # 5. Guardar físicamente en el servidor
    dest_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    try:
        file.save(dest_path)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error al guardar la imagen en disco: {str(e)}"
        }), 500

    # Validación adicional: archivo no vacío
    if os.path.getsize(dest_path) == 0:
        os.remove(dest_path)
        return jsonify({
            "status": "error",
            "message": "El archivo enviado está vacío (0 bytes)."
        }), 400

    # 6. Retornar ruta relativa para guardar en MySQL
    relative_path = f"/static/uploads/habitaciones/{unique_filename}"
    return jsonify({
        "status": "success",
        "message": "Imagen subida exitosamente.",
        "image_path": relative_path,
        "filename": unique_filename
    }), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
