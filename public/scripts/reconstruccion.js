document.addEventListener('DOMContentLoaded', function() {
    let markers = []; // Almacenar los marcadores de la reconstrucción

    const customIcon = L.icon({
        iconUrl: '/icons/marker-icon-2x.png',
        shadowUrl: '/icons/marker-shadow.png',
        iconSize: [30, 45], // Tamaño del ícono
        shadowSize: [50, 64], // Tamaño de la sombra
        iconAnchor: [15, 45], // Ancla el icono en la parte inferior centro
        shadowAnchor: [15, 64], // Ancla la sombra en la parte inferior centro
        popupAnchor: [0, -45] // Ajusta el popup para abrirse justo encima del ícono
    });

    document.getElementById('reconstruccionBtn').addEventListener('click', function(event) {
        event.preventDefault(); // Prevenir el comportamiento predeterminado del enlace

        // Detener la actualización automática de las últimas ubicaciones
        if (typeof stopUpdating === 'function') {
            stopUpdating(); // Detener el intervalo de actualización desde main.js
            console.log("Actualización automática detenida para la reconstrucción.");
        }

        // Cargar el archivo HTML para el modal
        fetch('/reconstruccion.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('reconstruccionContainer').innerHTML = html;
                document.getElementById('reconstruccionContainer').style.display = 'flex'; // Mostrar el modal

                // Añadir funcionalidad para cerrar el modal
                document.getElementById('closeModal').addEventListener('click', function() {
                    document.getElementById('reconstruccionContainer').style.display = 'none'; // Ocultar el modal
                });

                // Cargar los id_ruta en el selector y ordenarlos
                fetch('/coordinates/getUniqueRutas')
                    .then(response => response.json())
                    .then(rutas => {
                        const select = document.getElementById('rutaSelect');
                        select.innerHTML = ''; // Limpiar opciones previas
                        
                        // Ordenar rutas en orden ascendente
                        rutas.sort((a, b) => a.localeCompare(b));
                        
                        rutas.forEach(ruta => {
                            const option = document.createElement('option');
                            option.value = ruta;
                            option.text = ruta;
                            select.appendChild(option);
                        });
                    })
                    .catch(error => console.error('Error al obtener los id_ruta:', error));

                // Manejar la reconstrucción del recorrido
                document.getElementById('reconstruirBtn').addEventListener('click', function() {
                    const idRuta = document.getElementById('rutaSelect').value;
                    const fechaSeleccionada = document.getElementById('fechaSelect').value;

                    console.log(`Enviando consulta con id_ruta: ${idRuta} y fecha: ${fechaSeleccionada}`);

                    // Limpiar todos los marcadores actuales
                    clearMarkers();

                    // Realizar la consulta enviando el id_ruta y la fecha
                    fetch(`/coordinates/reconstruirRecorrido?id_ruta=${idRuta}&fecha=${fechaSeleccionada}`)
                        .then(response => response.json())
                        .then(coordenadas => {
                            if (!Array.isArray(coordenadas) || coordenadas.length === 0) {
                                console.error('Datos incorrectos o vacíos para la reconstrucción del recorrido.');
                                return;
                            }

                            console.log('Coordenadas recibidas:', coordenadas);

                            document.getElementById('reconstruccionContainer').style.display = 'none';

                            // Mostrar los nuevos marcadores basados en la consulta
                            coordenadas.forEach((coordinate) => {
                                if (coordinate.latitude && coordinate.longitude) {
                                    const lat = parseFloat(coordinate.latitude);
                                    const lng = parseFloat(coordinate.longitude);

                                    if (!isNaN(lat) && !isNaN(lng)) {
                                        const [datePart, timePart] = coordinate.timestamp.split('T');
                                        const [year, month, day] = datePart.split('-');
                                        const formattedDate = `${day}/${month}/${year}`;
                                        const formattedTime = timePart.split('.')[0];
                                        const batteryLevel = Math.round(coordinate.battery);

                                        // Preparar información sobre movimiento y contexto
                                        const movementStatus = coordinate.is_moving ? 'En movimiento' : 'Detenido';
                                        const movementContext = coordinate.movement_context ? coordinate.movement_context : 'No disponible';
                                        
                                        // Preparar información sobre VPN/ubicación real
                                        const vpnStatus = coordinate.vpn_validation === 'true' || coordinate.vpn_validation === true ? 'Sí' : 'No';
                                        const suspiciousReason = coordinate.suspicious_reason ? 
                                            `<br>Motivo: ${coordinate.suspicious_reason}` : '';

                                        try {
                                            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

                                            marker.bindPopup(`
                                                <strong>Ruta: ${coordinate.id_ruta}</strong><br>
                                                Latitude: ${coordinate.latitude}<br>
                                                Longitud: ${coordinate.longitude}<br>
                                                Fecha y hora: ${formattedDate}, ${formattedTime}<br>
                                                Batería: ${batteryLevel}%<br>
                                                Ubicación Falsa: ${vpnStatus}${suspiciousReason}<br>
                                                Estado: ${movementStatus}<br>
                                                Contexto: ${movementContext}
                                            `);

                                            markers.push(marker);
                                        } catch (error) {
                                            console.error('Error al crear el marcador:', error);
                                        }
                                    } else {
                                        console.error('Latitud o longitud inválida:', coordinate);
                                    }
                                } else {
                                    console.error('Coordenadas inválidas:', coordinate);
                                }
                            });
                        })
                        .catch(error => console.error('Error al reconstruir el recorrido:', error)  );
                });
            })
            .catch(error => console.error('Error al cargar el menú de reconstrucción:', error));
    });

    // Función para limpiar todos los marcadores del mapa
    function clearMarkers() {
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
    }
});