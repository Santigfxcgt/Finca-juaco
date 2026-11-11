// Endpoint de la API FastAPI
const API_URL = "http://localhost:8000/api/reservations";

const form = document.getElementById("booking-form");
const submitBtn = document.getElementById("submit-btn");
const statusBox = document.getElementById("status-box");

// Configurar fecha mínima de hoy para check-in y check-out
const today = new Date().toISOString().split("T")[0];
const checkInInput = document.getElementById("checkIn");
const checkOutInput = document.getElementById("checkOut");

checkInInput.min = today;
checkOutInput.min = today;

checkInInput.addEventListener("change", () => {
    if (checkInInput.value) {
        // La fecha de salida debe ser al menos el día siguiente
        const nextDay = new Date(checkInInput.value);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOutInput.min = nextDay.toISOString().split("T")[0];
        if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
            checkOutInput.value = nextDay.toISOString().split("T")[0];
        }
    }
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const roomType = document.getElementById("roomType").value;

    // Validación en el cliente
    if (!fullName || !email || !checkIn || !checkOut || !roomType) {
        showStatus("Por favor complete todos los campos obligatorios.", "error");
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        showStatus("La fecha de Check-out debe ser posterior a la fecha de Check-in.", "error");
        return;
    }

    const payload = {
        full_name: fullName,
        email: email,
        check_in: checkIn,
        check_out: checkOut,
        room_type: roomType
    };

    // Feedback visual en la interfaz: Estado "Enviando..."
    setLoadingState(true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showStatus(`✅ ¡Reserva confirmada [${data.reservation_code}]! Se envió un correo con los detalles a ${email}.`, "success");
            form.reset();
        } else {
            let errorMsg = "Ocurrió un error al procesar su reserva.";
            if (data.detail) {
                errorMsg = Array.isArray(data.detail)
                    ? data.detail.map(d => d.msg).join(", ")
                    : data.detail;
            }
            showStatus(`❌ ${errorMsg}`, "error");
        }
    } catch (err) {
        showStatus("⚠️ No se pudo conectar con el servidor backend FastAPI. Asegúrese de que esté en ejecución en http://localhost:8000.", "error");
    } finally {
        setLoadingState(false);
    }
});

function setLoadingState(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Enviando confirmación de reserva...";
        showStatus("Procesando reserva y despachando correo de confirmación...", "loading");
    } else {
        submitBtn.disabled = false;
        submitBtn.innerText = "Confirmar Reserva";
    }
}

function showStatus(message, type) {
    statusBox.style.display = "block";
    statusBox.className = `status-box ${type}`;
    statusBox.innerText = message;
}
