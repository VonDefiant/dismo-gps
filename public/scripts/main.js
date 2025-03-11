var map;  // Variable global del mapa
var updateInterval;  // Variable para almacenar el intervalo de actualización
var markerClusterGroup; // Variable global para el grupo de marcadores

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el mapa en la misma ubicación
    map = L.map('map').setView([14.6349, -90.5069], 13);

    // Token de Mapbox
    const mapboxToken = 'pk.eyJ1Ijoidm9uZGVmaWFudCIsImEiOiJjbTg0ejg0czEyNWNiMm5vb3JlbGhrMG5rIn0.Dj_dcfqOceb51BSzXtIGJg';
    
    // Definir diferentes estilos de Mapbox
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
    
    const mapboxNavigation = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/{z}/{x}/{y}?access_token=' + mapboxToken, {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1
    });
    
    const mapboxOutdoors = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/{z}/{x}/{y}?access_token=' + mapboxToken, {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1
    });

    // Estilo personalizado de DISMO
const mapboxCustom = L.tileLayer('https://api.mapbox.com/styles/v1/vondefiant/cm851sjl3008r01qi6o5o9yog/tiles/{z}/{x}/{y}?access_token=' + mapboxToken, {
    attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> | DISMO GPS',
    maxZoom: 22,
    tileSize: 512,
    zoomOffset: -1
});
    // Capa de OpenStreetMap como alternativa
    const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    });

    // Crear objeto para el selector de capas base
    const baseMaps = {

        "Mapbox Calles": mapboxStreets,
        "Mapbox Exteriores": mapboxOutdoors,
        "Mapbox Satélite": mapboxSatellite,
    };

    // Establecer mapboxStreets como capa predeterminada
    mapboxStreets.addTo(map);
    
    // Agregar el control de capas al mapa
    L.control.layers(baseMaps, {}, {collapsed: false}).addTo(map);

    // Añadir control de escala
    L.control.scale({
        imperial: false,  // Solo mostrar escala métrica
        position: 'bottomleft'
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
    
    // Crear el indicador de última actualización 
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

    // Función para actualizar las últimas ubicaciones con marcadores agrupados
    function updateMarkers() {
        // Limpiar todos los marcadores existentes antes de añadir nuevos
        clearMarkers();

        console.log("Actualizando las últimas ubicaciones...");
        
        // Crear nuevo grupo de marcadores
        markerClusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            iconCreateFunction: function(cluster) {
                return L.divIcon({
                    html: '<div class="cluster-marker">' + cluster.getChildCount() + '</div>',
                    className: 'custom-cluster-icon',
                    iconSize: L.point(40, 40)
                });
            }
        });

        // Fetch de las últimas coordenadas
        fetch('/coordinates/latest-coordinates')
            .then(response => response.json())
            .then(data => {
                const now = new Date();
                lastUpdateDiv.textContent = `Última actualización: ${now.toLocaleString()}`;
                
                data.forEach(coord => {
                    // Dividir el timestamp en fecha y hora
                    const [datePart, timePart] = coord.timestamp.split('T');
                    const [year, month, day] = datePart.split('-'); // Extraer año, mes y día
                    const formattedDate = `${day}/${month}/${year}`; // Formato DD/MM/YYYY
                    const formattedTime = timePart.split('.')[0]; // Elimina los milisegundos y la zona horaria

                    // Redondear el valor de la batería a un número entero
                    const batteryLevel = Math.round(coord.battery);

                    // Crear el marcador con el ícono personalizado y añadirlo al grupo
                    const marker = L.marker([coord.latitude, coord.longitude], { icon: customIcon });
                    marker.bindPopup(`
                        <strong>Ruta: ${coord.id_ruta}</strong><br>
                        Latitude: ${coord.latitude}<br>
                        Longitud: ${coord.longitude}<br>
                        Fecha y hora: ${formattedDate}, ${formattedTime}<br>
                        Batería: ${batteryLevel}%<br>
                        VPN activo: ${coord.vpn_validation ? 'No' : 'No'}
                    `);
                    
                    markerClusterGroup.addLayer(marker);
                });
                
                // Añadir el grupo de marcadores al mapa
                map.addLayer(markerClusterGroup);
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