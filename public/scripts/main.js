var map;  // Variable global del mapa
var updateInterval;  // Variable para almacenar el intervalo de actualización

document.addEventListener('DOMContentLoaded', function() {
    map = L.map('map').setView([14.6349, -90.5069], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    // Función para actualizar las últimas ubicaciones
    function updateMarkers() {
        // Limpiar todos los marcadores existentes antes de añadir nuevos
        clearMarkers();

        console.log("Actualizando las últimas ubicaciones...");

        // Fetch de las últimas coordenadas
        fetch('/coordinates/latest-coordinates')
            .then(response => response.json())
            .then(data => {
                data.forEach(coord => {
                    // Dividir el timestamp en fecha y hora
                    const [datePart, timePart] = coord.timestamp.split('T');
                    const [year, month, day] = datePart.split('-'); // Extraer año, mes y día
                    const formattedDate = `${day}/${month}/${year}`; // Formato DD/MM/YYYY
                    const formattedTime = timePart.split('.')[0]; // Elimina los milisegundos y la zona horaria

                    // Crear el marcador y añadirlo al mapa
                    const marker = L.marker([coord.latitude, coord.longitude]).addTo(map);
                    marker.bindPopup(`
                        <strong>Ruta: ${coord.id_ruta}</strong><br>
                        Latitude: ${coord.latitude}<br>
                        Longitud: ${coord.longitude}<br>
                        Fecha y hora: ${formattedDate}, ${formattedTime}<br>
                        Batería: ${coord.battery}%<br>
                        VPN activo: ${coord.vpn_validation}

                    `);
                });
            })
            .catch(err => console.error('Error al cargar las coordenadas', err));
    }

    // Función para limpiar todos los marcadores actuales en el mapa
    function clearMarkers() {
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer); // Eliminar todas las capas de tipo L.Marker
            }
        });
    }

    // Función para iniciar el intervalo de actualización
    function startUpdating() {
        console.log("Iniciando la actualización automática de las últimas ubicaciones.");
        updateMarkers(); // Llamar una vez para la primera actualización
        updateInterval = setInterval(updateMarkers, 30000);  // Actualizar los marcadores cada 30 segundos
    }

    // Función para detener el intervalo de actualización
    function stopUpdating() {
        console.log("Deteniendo la actualización automática de las últimas ubicaciones.");
        clearInterval(updateInterval); // Detener la actualización periódica
    }

    // Hacer global las funciones
    window.stopUpdating = stopUpdating;
    window.startUpdating = startUpdating;

    // Inicializar la actualización al cargar la página
    startUpdating();

    // Manejar el clic en el botón "Inicio" para reanudar la actualización
    document.getElementById('inicioBtn').addEventListener('click', function() {
        console.log("Reanudando la actualización de las últimas ubicaciones.");
        startUpdating(); // Reiniciar el intervalo de actualización
    });
});
