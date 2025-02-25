document.addEventListener("DOMContentLoaded", function () {
    fetch('/logsAcceso.html') // Cargar el modal dinámicamente
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML("beforeend", html); // Agregar el modal al body
            configurarEventosLogs(); // Configurar eventos después de cargar el modal
        })
        .catch(error => console.error("❌ Error cargando el modal de logs:", error));
});

function configurarEventosLogs() {
    const logsModal = document.getElementById("logsAccesoContainer");
    const cerrarLogsBtn = document.getElementById("cerrarLogsModal");
    const abrirLogsBtn = document.getElementById("logsEntradaBtn"); // Botón en el menú

    if (abrirLogsBtn) {
        abrirLogsBtn.addEventListener("click", function () {
            logsModal.style.display = "flex";
            cargarLogsAcceso();
        });
    }

    cerrarLogsBtn.addEventListener("click", function () {
        logsModal.style.display = "none";
    });
}
// ✅ Obtener los últimos logs de acceso y mostrarlos en la tabla
function cargarLogsAcceso() {
    fetch('/admin/logs') // Ruta del backend
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector("#logsTable tbody");
            tbody.innerHTML = ""; 

            data.forEach(log => { 
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${log.ruta}</td>
                    <td>${log.guid}</td>
                    <td>${log.estado}</td>
                    <td>${log.ip}</td>
                    <td>${new Date(log.fecha).toLocaleString()}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error("❌ Error cargando logs de acceso:", error));
}

