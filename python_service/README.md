# Microservicio de Confirmación de Reservas por Correo (FastAPI + SMTP)

Este módulo implementa el flujo de confirmación automática de reservas para hotel solicitado en Python y JavaScript Vanilla:

## Estructura del Módulo
```text
python_service/
├── .env.example        # Plantilla de variables de entorno (SMTP)
├── requirements.txt    # Dependencias de Python (FastAPI, Uvicorn, Pydantic)
├── main.py             # Servidor API con FastAPI y modelos Pydantic
├── email_service.py    # Servicio SMTP con smtplib y email.mime (HTML)
└── frontend/
    ├── index.html      # Formulario responsivo HTML5
    ├── styles.css      # Estilos modernos
    └── app.js          # Lógica Fetch API y manejo de estados
```

## Guía de Instalación y Ejecución

### 1. Crear y activar entorno virtual
```bash
cd python_service
python3 -m venv venv

# En Linux / Mac:
source venv/bin/activate

# En Windows:
venv\Scripts\activate
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
Crea tu archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```
Edita `.env` con tu cuenta de correo y contraseña de aplicación:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASSWORD=tu_contraseña_de_aplicacion_gmail
```

### 4. Iniciar el servidor backend FastAPI
```bash
uvicorn main:app --reload --port 8000
```
La documentación Swagger interactiva estará disponible en:
`http://localhost:8000/docs`

### 5. Probar el frontend
Abre el archivo `frontend/index.html` en tu navegador o sírvelo localmente con:
```bash
cd frontend
python3 -m http.server 8080
```
Ingresa a `http://localhost:8080`, completa el formulario y recibirás el correo HTML formateado en tu bandeja de entrada.
