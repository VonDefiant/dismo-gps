var map;  // Variable global del mapa
var updateInterval;  // Variable para almacenar el intervalo de actualización
var markerClusterGroup;

document.addEventListener('DOMContentLoaded', function() {
    map = L.map('map').setView([14.6349, -90.5069], 13);

    // OpenStreetMap como capa base predeterminada (no consume tokens de Mapbox)
    const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

     // Token de Mapbox
     const mapboxToken = 'pk.eyJ1Ijoidm9uZGVmaWFudCIsImEiOiJjbTg0ejg0czEyNWNiMm5vb3JlbGhrMG5rIn0.Dj_dcfqOceb51BSzXtIGJg';

    const mapboxStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=' + mapboxToken, {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1
    });
    
    const mapboxSatellite = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=' + mapboxToken, {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1
    });
    
    const googleSatellite = L.gridLayer.googleMutant({
        type: 'satellite',  // Vista satelital de Google
        attribution: '© Google Maps'
    });

    const googleHybrid = L.gridLayer.googleMutant({
        type: 'hybrid',  // Vista híbrida de Google (satélite + etiquetas)
        attribution: '© Google Maps'
    });

    const googleTerrain = L.gridLayer.googleMutant({
        type: 'terrain',  // Vista de terreno de Google
        attribution: '© Google Maps'
    });

    // Crear objeto para el selector de capas base
    const baseMaps = {
        "OpenStreetMap": openStreetMap,
        "Mapbox Calles": mapboxStreets,
        "Mapbox Satélite": mapboxSatellite,
        "Google Satélite": googleSatellite,
        "Google Híbrido": googleHybrid,
    };

    // Agregar el control de capas agrupado al mapa (colapsado por defecto)
    L.control.groupedLayers(baseMaps, {}, {
        collapsed: true,
        position: 'topright'
    }).addTo(map);

    // Establecer el estilo personalizado de DISMO como capa predeterminada
    openStreetMap.addTo(map);
    
    // Añadir control de escala
    L.control.scale({
        imperial: false, 
        position: 'bottomleft'
    }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    // Definir el ícono personalizado con sombra
    const customIcon = L.icon({
        iconUrl: '/icons/marker-icon-2x.png',
        shadowUrl: '/icons/marker-shadow.png',
        iconSize: [30, 45], // Tamaño del ícono
        shadowSize: [50, 64], // Tamaño de la sombra
        iconAnchor: [15, 45], // Ancla el icono en la parte inferior centro
        shadowAnchor: [15, 64], // Ancla la sombra en la parte inferior centro
        popupAnchor: [0, -45] // Ajusta el popup para abrirse justo encima del ícono
    });
    
    // Crear el indicador de última actualización solo una vez
    const lastUpdateDiv = document.createElement('div');
    lastUpdateDiv.id = 'lastUpdate';
    lastUpdateDiv.style.position = 'fixed';
    lastUpdateDiv.style.bottom = '10px';
    lastUpdateDiv.style.right = '10px';
    lastUpdateDiv.style.background = 'white';
    lastUpdateDiv.style.padding = '5px';
    lastUpdateDiv.style.borderRadius = '5px';
    lastUpdateDiv.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
    lastUpdateDiv.style.fontSize = '0.9em';
    lastUpdateDiv.style.color = '#333';
    lastUpdateDiv.style.zIndex = '1000'; 
    lastUpdateDiv.textContent = 'Última actualización: Nunca';
    document.body.appendChild(lastUpdateDiv);


    // Función para actualizar las últimas ubicaciones
    function updateMarkers() {
        // Limpiar todos los marcadores existentes antes de añadir nuevos
        clearMarkers();

        console.log("Actualizando las últimas ubicaciones...");

        // Fetch de las últimas coordenadas
        fetch('/coordinates/latest-coordinates')
        .then(response => response.json())
        .then(data => {
            const now = new Date();
            lastUpdateDiv.textContent = `Última actualización: ${now.toLocaleString()}`;
            data.forEach(coord => {
                // Dividir el timestamp en fecha y hora
                const [datePart, timePart] = coord.timestamp.split('T');
                const [year, month, day] = datePart.split('-'); 
                const formattedDate = `${day}/${month}/${year}`; 
                const formattedTime = timePart.split('.')[0]; 
    
                // Redondear el valor de la batería a un número entero
                const batteryLevel = Math.round(coord.battery);
    
                // Preparar información sobre movimiento y contexto
                const movementStatus = coord.is_moving ? 'En movimiento' : 'Detenido';
                const movementContext = coord.movement_context ? coord.movement_context : 'No disponible';
                
                // Preparar información sobre VPN/ubicación real
                const locationStatus = coord.vpn_validation ? 'No' : 'Sí';
                const suspiciousReason = coord.suspicious_reason ? 
                    `<br>Motivo: ${coord.suspicious_reason}` : '';
    
                // Crear el marcador con el ícono personalizado y añadirlo al mapa
                const marker = L.marker([coord.latitude, coord.longitude], { icon: customIcon }).addTo(map);
                marker.bindPopup(`
                    <strong>Ruta: ${coord.id_ruta}</strong><br>
                    Latitude: ${coord.latitude}<br>
                    Longitud: ${coord.longitude}<br>
                    Fecha y hora: ${formattedDate}, ${formattedTime}<br>
                    Batería: ${batteryLevel}%<br>
                    Ubicación Falsa: ${locationStatus}${suspiciousReason}<br>
                    Estado: ${movementStatus}<br>
                    Contexto: ${movementContext}
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
        updateInterval = setInterval(updateMarkers, 60000);  
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
