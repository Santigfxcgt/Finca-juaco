# Microservicio Python para Subida de Imágenes de Habitaciones

Este módulo implementa el endpoint en Python con **FastAPI** y **Flask** para la gestión y carga de imágenes de habitaciones para **La Colmena de Don Juaco**, cumpliendo estrictamente con todos los requisitos técnicos.

---

## 📋 Requisitos Técnicos Cumplidos

1. **Recepción mediante `multipart/form-data`**:
   - Acepta archivos enviados en campos estándar como `file`, `image` o `foto`.
2. **Validación de extensión segura**:
   - Formatos permitidos: `.jpg`, `.jpeg`, `.png`, `.webp`.
   - Cualquier otra extensión rechaza la solicitud con **código 400**.
3. **Renombrado automático con `uuid`**:
   - Evita colisiones o sobreescritura de archivos usando `uuid.uuid4()`.
   - Nombre resultante: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.ext`.
4. **Almacenamiento físico en el servidor**:
   - Directorio: `/static/uploads/habitaciones/` (y sincronizado con `./static/uploads/habitaciones/` del proyecto).
5. **Respuesta JSON 200 con ruta relativa para MySQL**:
   - Retorna:
     ```json
     {
       "status": "success",
       "code": 200,
       "message": "Imagen subida exitosamente.",
       "image_path": "/static/uploads/habitaciones/c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp",
       "ruta": "/static/uploads/habitaciones/c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp",
       "filename": "c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp"
     }
     ```
6. **Manejo de errores HTTP 400**:
   - Falta de archivo: Código 400.
   - Archivo sin extensión: Código 400.
   - Extensión no permitida: Código 400.
   - Archivo vacío (0 bytes): Código 400.

---

## 🚀 Cómo Ejecutar

### Opción 1: Con FastAPI (Recomendado)
```bash
# 1. Instalar dependencias
pip install -r backend_python/requirements.txt

# 2. Iniciar el servidor FastAPI con Uvicorn en el puerto 8000
python3 -m uvicorn backend_python.upload_fastapi:app --host 0.0.0.0 --port 8000 --reload
```
Documentación interactiva disponible en: `http://localhost:8000/docs` (Swagger UI).

### Opción 2: Con Flask
```bash
# 1. Instalar dependencias
pip install -r backend_python/requirements.txt

# 2. Iniciar el servidor Flask en el puerto 5000
python3 backend_python/upload_flask.py
```

---

## 🧪 Pruebas con cURL

### Prueba exitosa (HTTP 200):
```bash
curl -X POST http://localhost:8000/upload/habitaciones \
  -F "file=@mi_foto.jpg" \
  -F "roomId=cabaña-reina"
```

### Prueba con error de extensión (HTTP 400):
```bash
curl -X POST http://localhost:8000/upload/habitaciones \
  -F "file=@archivo.pdf"
```
Respuesta:
```json
{
  "status": "error",
  "code": 400,
  "detail": "Extensión '.pdf' no permitida. Formatos seguros permitidos: jpg, jpeg, png, webp."
}
```

---

## 🗄️ Inserción y Guardado en MySQL

Una vez que el endpoint responde con `image_path`, puedes ejecutar la siguiente consulta SQL en tu base de datos MySQL:

```sql
-- Actualizar imagen principal de una habitación
UPDATE habitaciones 
SET imagen_url = '/static/uploads/habitaciones/c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp',
    updated_at = NOW()
WHERE id = 'cabaña-reina';

-- O insertar un nuevo registro de imagen
INSERT INTO habitaciones_imagenes (habitacion_id, ruta_imagen, created_at)
VALUES ('cabaña-reina', '/static/uploads/habitaciones/c9bf9e57-1685-4c89-bafb-ff5af830be8a.webp', NOW());
```

Consulta el script `backend_python/mysql_example.py` para ver un ejemplo de código en Python con `mysql-connector-python`.
