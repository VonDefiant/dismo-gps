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
    setTimeout(() => {
        if (!document.getElementById("editarDispositivoContainer")) {
            console.log("🛠 Cargando el modal de edición...");
            fetch('/registroNuevoDispositivo.html')
                .then(response => response.text())
                .then(html => {
                    document.getElementById('registroDispositivosPlaceholder').insertAdjacentHTML("beforeend", html);
                    console.log("✅ Modal de edición cargado.");
                })
                .catch(error => console.error("❌ Error cargando el modal de edición:", error));
        }
    }, 300);
    
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
            placeholder.insertAdjacentHTML("beforeend", html);

            setTimeout(() => {
                const nuevoDispositivoModal = document.getElementById("registroNuevoDispositivoContainer");
                if (!nuevoDispositivoModal) {
                    console.error("❌ Error: No se encontró el modal 'registroNuevoDispositivoContainer'");
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
    const modal = document.getElementById("registroNuevoDispositivoContainer");
    const cerrarBtn = document.getElementById("cerrarNuevoDispositivo");
    const guardarBtn = document.getElementById("guardarNuevoDispositivo");

    if (!modal) {
        console.error("❌ Error: No se encontró el modal de nuevo dispositivo.");
        return;
    }

    cerrarBtn.addEventListener("click", function () {
        modal.style.display = "none";
    });

    guardarBtn.removeEventListener("click", guardarDispositivo);
    guardarBtn.addEventListener("click", guardarDispositivo);
}

// ✅ Nueva función para guardar el dispositivo y evitar duplicación
function guardarDispositivo() {
    const ruta = document.getElementById("nuevaRuta").value.trim();
    const guid = document.getElementById("nuevoGuid").value.trim();

    if (ruta === "" || guid === "") {
        alert("⚠️ Por favor, llena todos los campos");
        return;
    }

    fetch('/admin/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta, imei: guid })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("❌ Error en la respuesta del servidor");
        }
        return response.json();
    })
    .then(data => {
        alert("✅ Dispositivo añadido correctamente");
        document.getElementById("nuevaRuta").value = "";
        document.getElementById("nuevoGuid").value = "";
        document.getElementById("registroNuevoDispositivoContainer").style.display = "none";
        cargarListaDispositivos();
    })
    .catch(error => {
        console.error("❌ Error al añadir dispositivo:", error);
        alert("⚠️ Hubo un error al registrar el dispositivo");
    });
}

// ✅ Cargar dispositivos y agregar botón de edición
function cargarListaDispositivos() {
    fetch('/admin/dispositivos')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#dispositivosTable tbody');
            if (!tbody) {
                console.error("❌ Error: No se encontró la tabla de dispositivos.");
                return;
            }
            tbody.innerHTML = ''; 
            data.sort((a, b) => a.ruta.localeCompare(b.ruta, 'es', { numeric: true }));

            data.forEach(dispositivo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dispositivo.ruta}</td>
                    <td>${dispositivo.guid || 'N/A'}</td>
                    <td>${dispositivo.fecha_registro ? new Date(dispositivo.fecha_registro).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="editar-btn" data-id="${dispositivo.guid}" data-ruta="${dispositivo.ruta}">✏️</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.querySelectorAll(".editar-btn").forEach(btn => {
                btn.addEventListener("click", function () {
                    const guid = this.getAttribute("data-id");
                    const ruta = this.getAttribute("data-ruta");
                    abrirModalEdicion(guid, ruta);
                });
            });
        })
        .catch(error => console.error('❌ Error cargando dispositivos:', error));
}

// ✅ Función para abrir el modal de edición
function abrirModalEdicion(guid, ruta) {
    const modal = document.getElementById("editarDispositivoContainer");
    const inputRuta = document.getElementById("editarRuta");
    const inputGuid = document.getElementById("editarGuid");

    if (!modal || !inputRuta || !inputGuid) {
        console.error("❌ Error: No se encontró el modal o los inputs de edición.");
        return;
    }

    inputRuta.value = ruta;
    inputGuid.value = guid;

    modal.style.display = "flex";

    // 🔹 Agregar el evento al botón de cerrar
    const cerrarBtn = document.getElementById("cerrarEditarDispositivo");
    if (cerrarBtn) {
        cerrarBtn.removeEventListener("click", cerrarModalEdicion); // Evita duplicar eventos
        cerrarBtn.addEventListener("click", cerrarModalEdicion);
    }

    // 🔹 Agregar el evento de guardar
    document.getElementById("guardarEditarDispositivo").onclick = function () {
        editarDispositivo(guid);
    };
}

// ✅ Función para cerrar el modal de edición
function cerrarModalEdicion() {
    document.getElementById("editarDispositivoContainer").style.display = "none";
}

// ✅ Función para editar el dispositivo
function editarDispositivo(guid) {
    const nuevaRuta = document.getElementById("editarRuta").value.trim();
    const nuevoGuid = document.getElementById("editarGuid").value.trim();

    fetch(`/admin/dispositivos/${guid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta: nuevaRuta, nuevoGuid })
    })
    .then(() => {
        document.getElementById("editarDispositivoContainer").style.display = "none";
        cargarListaDispositivos();
    });
}
