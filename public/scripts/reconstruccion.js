document.addEventListener('DOMContentLoaded', function() {
    let markers = []; // Almacenar los marcadores de la reconstrucción

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

                // Cargar los id_ruta en el selector
                fetch('/coordinates/getUniqueRutas')
                    .then(response => response.json())
                    .then(rutas => {
                        const select = document.getElementById('rutaSelect');
                        select.innerHTML = ''; // Limpiar opciones previas
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
                            // Verificar si los datos están correctos
                            if (!Array.isArray(coordenadas) || coordenadas.length === 0) {
                                console.error('Datos incorrectos o vacíos para la reconstrucción del recorrido.');
                                return;
                            }

                            console.log('Coordenadas recibidas:', coordenadas); // Verificar las coordenadas recibidas

                            // Ocultar el modal después de hacer clic en "Reconstruir"
                            document.getElementById('reconstruccionContainer').style.display = 'none';

                            // Mostrar los nuevos marcadores basados en la consulta
                            coordenadas.forEach((coordinate) => {
                                // Validar que las coordenadas sean correctas antes de crear el marcador
                                if (coordinate.latitude && coordinate.longitude) {
                                    const lat = parseFloat(coordinate.latitude);
                                    const lng = parseFloat(coordinate.longitude);

                                    if (!isNaN(lat) && !isNaN(lng)) {

                                        // Extraer la fecha y hora en UTC sin convertir a la zona local
                                        // Separar la fecha y hora en componentes
                                        const [datePart, timePart] = coordinate.timestamp.split('T');
                                        const [year, month, day] = datePart.split('-'); // Extraer el año, mes y día
                                        const formattedDate = `${day}/${month}/${year}`; // Formato DD/MM/YYYY
                                        const formattedTime = timePart.split('.')[0]; // HH:MM:SS sin milisegundos ni zona horaria


                                        try {
                                            const marker = L.marker([lat, lng]).addTo(map); // Crear el marcador utilizando la instancia global de map

                                            // Añadir el popup con la información del marcador, incluyendo la batería
                                            marker.bindPopup(`
                                                <strong>Ruta: ${coordinate.id_ruta}</strong><br>
                                                Latitude: ${coordinate.latitude}<br>
                                                Longitud: ${coordinate.longitude}<br>
                                                Fecha y hora: ${formattedDate}, ${formattedTime}<br>
                                                Batería: ${coordinate.battery}%<br>
                                                VPN activo: ${coordinate.vpn_validation === 'true' ? 'Sí' : 'No'}
                                            `);

                                            // Almacenar el marcador en el array
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
                        .catch(error => console.error('Error al reconstruir el recorrido:', error));
                });
            })
            .catch(error => console.error('Error al cargar el menú de reconstrucción:', error));
    });

    // Función para limpiar todos los marcadores del mapa
    function clearMarkers() {
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer); // Eliminar todas las capas de tipo L.Marker
            }
        });
    }
});
