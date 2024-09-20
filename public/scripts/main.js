document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([14.6349, -90.5069], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    function updateMarkers() {
        fetch('/coordinates/latest-coordinates')
            .then(response => response.json())
            .then(data => {
                map.eachLayer(function(layer) {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });

                data.forEach(coord => {
                    const datetime = new Date(coord.timestamp);
                    const formattedDate = `${datetime.getDate().toString().padStart(2, '0')}/${(datetime.getMonth() + 1).toString().padStart(2, '0')}/${datetime.getFullYear()}`;
                    const time = coord.timestamp.split('T')[1]; // Obtiene la parte de la hora
                    const formattedTime = time.split('.')[0]; // Elimina los milisegundos y la zona horaria, si hay

                    const marker = L.marker([coord.latitude, coord.longitude]).addTo(map);
                    marker.bindPopup(`
                        <strong>Ruta: ${coord.id_ruta}</strong><br>
                        Latitude: ${coord.latitude}<br>
                        Longitud: ${coord.longitude}<br>
                        Fecha y hora: ${formattedDate}, ${formattedTime}<br>
                        VPN activo: ${coord.vpn_validation}
                    `);
                });
            })
            .catch(err => console.error('Error al cargar las coordenadas', err));
    }

    updateMarkers();
    setInterval(updateMarkers, 30000);  // Actualizar los marcadores cada 30 segundos
});
