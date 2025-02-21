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
}

// ✅ Cargar dispositivos desde el backend
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

            data.forEach(dispositivo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dispositivo.ruta}</td>
                    <td>${dispositivo.guid}</td>
                    <td>${new Date(dispositivo.fecha_registro).toLocaleDateString()}</td>
                `;
                tbody.appendChild(row);
            });

            console.log("✅ Datos de dispositivos cargados correctamente.");
        })
        .catch(error => console.error('❌ Error cargando dispositivos:', error));
}
