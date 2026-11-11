"""
Ejemplo de integración con MySQL:
Cómo recibir la ruta retornada por el endpoint y guardarla en la base de datos MySQL.
"""

import requests
import mysql.connector

# 1. Configuración de conexión MySQL
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "tu_password",
    "database": "hotel_db"
}

ENDPOINT_URL = "http://localhost:3000/upload/habitaciones"  # o http://localhost:8000/upload/habitaciones si usas FastAPI

def subir_y_guardar_en_mysql(room_id: str, image_file_path: str):
    """
    Sube la imagen mediante multipart/form-data y almacena la ruta relativa en MySQL.
    """
    print(f"Subiendo imagen '{image_file_path}'...")

    # Enviar archivo mediante multipart/form-data
    with open(image_file_path, "rb") as f:
        files = {"file": f}
        data = {"roomId": room_id}
        response = requests.post(ENDPOINT_URL, files=files, data=data)

    if response.status_code == 200:
        res_json = response.json()
        relative_path = res_json.get("image_path") or res_json.get("ruta")
        print(f"✅ Subida exitosa (200 OK). Ruta relativa recibida: {relative_path}")

        # Guardar en MySQL
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()

            query = """
                UPDATE habitaciones 
                SET imagen_url = %s, updated_at = NOW() 
                WHERE id = %s
            """
            cursor.execute(query, (relative_path, room_id))
            conn.commit()
            print(f"✅ Guardado en MySQL con éxito: Habitacion '{room_id}' -> '{relative_path}'")

            cursor.close()
            conn.close()
            return relative_path

        except Exception as e:
            print(f"❌ Error al guardar en MySQL: {e}")
            return relative_path
    else:
        print(f"❌ Error al subir imagen (Código {response.status_code}): {response.text}")
        return None

if __name__ == "__main__":
    print("Script de ejemplo de integración con MySQL.")
