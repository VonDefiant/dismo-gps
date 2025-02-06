document.addEventListener("DOMContentLoaded", function() {
    const vendedoresBtn = document.getElementById("vendedoresBtn");
    const vendedoresContainer = document.getElementById("vendedoresContainer");
    const vendedoresData = document.getElementById("vendedoresData");
    const closeVendedores = document.getElementById("closeVendedores");

    if (!vendedoresBtn || !vendedoresContainer || !vendedoresData || !closeVendedores) {
        console.error("Elementos del menú de vendedores no encontrados en el DOM.");
        return;
    }

    // Mostrar el modal al hacer clic en el botón de Vendedores
    vendedoresBtn.addEventListener("click", () => {
        console.log("Botón 'Vendedores' clicado");
        cargarVendedores();
        vendedoresContainer.style.display = "flex";
    });

    // Cerrar el modal al hacer clic en el botón "Cerrar"
    closeVendedores.addEventListener("click", () => {
        vendedoresContainer.style.display = "none";
    });

    // Cerrar el modal al hacer clic fuera del contenido del modal
    vendedoresContainer.addEventListener("click", (event) => {
        if (event.target === vendedoresContainer) {
            vendedoresContainer.style.display = "none";
        }
    });

    // Función para cargar los datos de los vendedores en orden ascendente
    function cargarVendedores() {
        fetch("/coordinates/all-latest")
            .then(response => response.json())
            .then(data => {
                // Ordenar los datos en orden ascendente por `id_ruta`
                data.sort((a, b) => a.id_ruta.localeCompare(b.id_ruta));

                // Encabezado
                vendedoresData.innerHTML = `
                    <div class="header-row">
                        <span>Ruta</span>
                        <span>Fecha</span>
                        <span>Hora</span>
                        <span></span> 
                    </div>
                `;

                // Agregar cada vendedor en una fila
                data.forEach(vendedor => {
                    // Extraer la fecha y hora directamente del timestamp sin conversión
                    const [datePart, timePart] = vendedor.timestamp.split('T');
                    const formattedDate = datePart.split('-').reverse().join('/'); // Formato DD/MM/YYYY
                    const formattedTime = timePart.split('.')[0]; // HH:MM:SS sin milisegundos ni zona horaria

                    vendedoresData.innerHTML += `
                        <div class="vendedor-row">
                            <span>${vendedor.id_ruta}</span>
                            <span>${formattedDate}</span>
                            <span>${formattedTime}</span>
                            <button class="view-btn" onclick="moverAlMarcador(${vendedor.latitude}, ${vendedor.longitude})">🔍</button>
                        </div>
                    `;
                });
            })
            .catch(error => {
                console.error("Error al cargar los vendedores:", error);
                alert("Error al cargar los datos de los vendedores.");
            });
    }
});

// Función para centrar el mapa en el marcador y cerrar el modal
function moverAlMarcador(lat, lng) {
    if (window.map) {
        window.map.setView([lat, lng], 15);
    } else {
        console.error("El mapa no está definido.");
    }
    // Cerrar el modal al hacer clic en la lupa
    document.getElementById("vendedoresContainer").style.display = "none";
}
