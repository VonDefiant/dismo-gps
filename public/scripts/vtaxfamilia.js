// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const ventasFamiliaContainer = document.getElementById("ventasFamiliaContainer");
    const ventasFamiliaBtn = document.getElementById("ventasBtn");
    const closeVentasFamilia = document.getElementById("closeVentasFamilia");
    const consultarBtn = document.getElementById("ConsultarBtn");
    const rutaSelect = document.getElementById("rutaSelect");
    const fechaSelect = document.getElementById("fechaSelect");

    // Mostrar el modal al hacer clic en el botón
    ventasFamiliaBtn.addEventListener("click", () => {
        ventasFamiliaContainer.style.display = "flex";
    });

    // Cerrar el modal al hacer clic en el botón "Cancelar"
    closeVentasFamilia.addEventListener("click", () => {
        ventasFamiliaContainer.style.display = "none";
    });

    // Cerrar el modal al hacer clic fuera de su contenido
    ventasFamiliaContainer.addEventListener("click", (e) => {
        if (e.target === ventasFamiliaContainer) {
            ventasFamiliaContainer.style.display = "none";
        }
    });

    // Cargar opciones dinámicamente en el selector de rutas
    const rutas = ["Ruta 1", "Ruta 2", "Ruta 3"]; // Cambiar por tus datos reales
    rutas.forEach((ruta) => {
        const option = document.createElement("option");
        option.value = ruta;
        option.textContent = ruta;
        rutaSelect.appendChild(option);
    });

    // Validar y procesar la consulta al hacer clic en "Consultar"
    consultarBtn.addEventListener("click", () => {
        const ruta = rutaSelect.value;
        const fecha = fechaSelect.value;

        // Validar que se hayan seleccionado valores
        if (!ruta || !fecha) {
            alert("Por favor, selecciona una ruta y una fecha.");
            return;
        }

        // Aquí puedes agregar tu lógica de consulta, como una llamada a una API
        console.log("Consulta realizada:", { ruta, fecha });

        // Opcional: Cerrar el modal tras realizar la consulta
        ventasFamiliaContainer.style.display = "none";
    });
});
