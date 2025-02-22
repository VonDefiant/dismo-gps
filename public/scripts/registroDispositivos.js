document.addEventListener("DOMContentLoaded", function () {
    cargarRegistroDispositivos();
});

function cargarRegistroDispositivos() {
    fetch('/registroDispositivos.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('registroDispositivosPlaceholder').innerHTML = html;
            console.log("✅ Modal de Registro de Dispositivos cargado correctamente.");

            // 💡 Esperamos un pequeño retraso antes de configurar los eventos
            setTimeout(configurarEventosDispositivos, 200);
        })
        .catch(error => console.error("❌ Error cargando el modal de dispositivos:", error));
}

function configurarEventosDispositivos() {
    console.log("🔧 Configurando eventos del modal de dispositivos...");

    const dispositivosBtn = document.getElementById("registroDispositivosBtn");
    const dispositivosModal = document.getElementById("registroDispositivosContainer");
    const dispositivosSalirBtn = document.getElementById("salirRegistroDispositivos");
    const dispositivosAnadirBtn = document.getElementById("anadirRegistroDispositivos"); 

    if (!dispositivosModal) {
        console.error("❌ Error: No se encontró el modal registroDispositivosContainer");
        return;
    }

    dispositivosBtn.addEventListener("click", function () {
        dispositivosModal.style.display = "flex";
        cargarListaDispositivos();
    });

    if (dispositivosSalirBtn) {
        dispositivosSalirBtn.addEventListener("click", function () {
            dispositivosModal.style.display = "none";
        });
    }

    if (dispositivosAnadirBtn) {
        dispositivosAnadirBtn.addEventListener("click", function () {
            console.log("🟢 Botón 'Añadir' presionado. Cargando formulario...");
            cargarFormularioNuevoDispositivo();
        });
    }
}

// ✅ Cargar el formulario de nuevo dispositivo
function cargarFormularioNuevoDispositivo() {
    fetch('/registroNuevoDispositivo.html')
        .then(response => response.text())
        .then(html => {
            console.log("✅ Formulario de nuevo dispositivo cargado en el DOM.");
            
            const placeholder = document.getElementById('registroDispositivosPlaceholder');
            placeholder.innerHTML += html; 

            // Esperar a que el DOM cargue completamente antes de interactuar con el modal
            setTimeout(() => {
                const nuevoDispositivoModal = document.getElementById("nuevoDispositivoContainer");
                if (!nuevoDispositivoModal) {
                    console.error("❌ Error: No se encontró el modal 'nuevoDispositivoContainer'");
                    return;
                }
                nuevoDispositivoModal.style.display = "flex";

                configurarEventosNuevoDispositivo();
            }, 300);
        })
        .catch(error => console.error("❌ Error cargando el formulario de nuevo dispositivo:", error));
}

// 🔹 Configurar eventos para el modal de nuevo dispositivo
function configurarEventosNuevoDispositivo() {
    const modal = document.getElementById("nuevoDispositivoContainer");
    const cerrarBtn = document.getElementById("cerrarNuevoDispositivo");
    const guardarBtn = document.getElementById("guardarNuevoDispositivo");

    if (!modal) {
        console.error("❌ Error: No se encontró el modal de nuevo dispositivo.");
        return;
    }

    cerrarBtn.addEventListener("click", function () {
        modal.style.display = "none";
    });

    guardarBtn.addEventListener("click", function () {
        const ruta = document.getElementById("nuevaRuta").value.trim();
        const guid = document.getElementById("nuevoGuid").value.trim();

        if (ruta === "" || guid === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        fetch('/admin/dispositivos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ruta, imei: guid })
        })
        .then(response => response.json())
        .then(data => {
            alert("Dispositivo añadido correctamente");
            modal.style.display = "none";
            cargarListaDispositivos(); 
        })
        .catch(error => {
            console.error("❌ Error al añadir dispositivo:", error);
            alert("Hubo un error al registrar el dispositivo");
        });
    });
}

// ✅ Cargar dispositivos desde el backend y ordenarlos por ruta
function cargarListaDispositivos() {
    fetch('/admin/dispositivos')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#dispositivosTable tbody');
            if (!tbody) {
                console.error("❌ Error: No se encontró la tabla de dispositivos.");
                return;
            }

            tbody.innerHTML = ''; // Limpiar contenido previo

            // 📌 Ordenar los dispositivos por la columna "ruta" (de menor a mayor)
            data.sort((a, b) => a.ruta.localeCompare(b.ruta, 'es', { numeric: true }));

            data.forEach(dispositivo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dispositivo.ruta}</td>
                    <td>${dispositivo.guid || 'N/A'}</td>
                    <td>${dispositivo.fecha_registro ? new Date(dispositivo.fecha_registro).toLocaleDateString() : 'N/A'}</td>
                `;
                tbody.appendChild(row);
            });

            console.log("✅ Datos de dispositivos cargados y ordenados correctamente.");
        })
        .catch(error => console.error('❌ Error cargando dispositivos:', error));
}
