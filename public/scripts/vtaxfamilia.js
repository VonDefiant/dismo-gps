document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('vtaxfamiliaBtn').addEventListener('click', function (event) {
        event.preventDefault();

        fetch('/vtaxfamilia.html')
            .then(response => response.text())
            .then(html => {
                const container = document.getElementById('vtaxfamiliaContainer');
                container.innerHTML = html;

                // Mostrar el contenedor del modal
                container.style.display = 'flex';

                const closeModalBtn = container.querySelector('#closeModal');
                if (closeModalBtn) {
                    closeModalBtn.addEventListener('click', function () {
                        container.style.display = 'none';
                    });
                } else {
                    console.error('No se encuentra el botón de cerrar el modal de vtaxfamilia.');
                }

                // Cargar los id_ruta en el selector
                fetch('/sales/getUniqueRutasvta')
                    .then(response => response.json())
                    .then(rutas => {
                        const select = container.querySelector('#rutaSelect');
                        if (select) {
                            select.innerHTML = ''; // Limpiar opciones previas

                            rutas.sort((a, b) => a.localeCompare(b));

                            rutas.forEach(ruta => {
                                const option = document.createElement('option');
                                option.value = ruta;
                                option.text = ruta;
                                select.appendChild(option);
                            });
                        }
                    })
                    .catch(error => console.error('Error al obtener los id_ruta:', error));

                const reconstruirBtn = container.querySelector('#reconstruirBtn');
                if (reconstruirBtn) {
                    reconstruirBtn.addEventListener('click', function () {
                        const idRuta = container.querySelector('#rutaSelect').value;
                        const fechaSeleccionada = container.querySelector('#fechaSelect').value;

                        if (!idRuta || !fechaSeleccionada) {
                            alert('Por favor selecciona una ruta y una fecha antes de consultar.');
                            return;
                        }

                        fetch(`/sales/query?ruta=${idRuta}&fecha=${fechaSeleccionada}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Error en la respuesta del servidor');
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (!Array.isArray(data) || data.length === 0) {
                                    alert('No se encontraron resultados.');
                                    return;
                                }

                                mostrarResultadosRectangulares(container, idRuta, fechaSeleccionada, data);
                            })
                            .catch(error => {
                                console.error('Error al consultar las ventas:', error);
                                alert('Ocurrió un error al consultar las ventas. Por favor, inténtalo más tarde.');
                            });
                    });
                }
            })
            .catch(error => console.error('Error al cargar el menú de reconstrucción:', error));
    });

    function mostrarResultadosRectangulares(container, idRuta, fechaSeleccionada, data) {
        const modalContent = container.querySelector('.modal-content');
        if (modalContent) {
            modalContent.innerHTML = '';

            const titulo = document.createElement('h3');
            titulo.textContent = 'Resultados de la consulta';
            modalContent.appendChild(titulo);

            const infoHeader = document.createElement('div');
            infoHeader.innerHTML = `<strong>Ruta:</strong> ${idRuta} &nbsp;&nbsp; <strong>Fecha:</strong> ${fechaSeleccionada}`;
            modalContent.appendChild(infoHeader);

            const tabla = document.createElement('table');

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Cod_Fam</th>
                    <th>Descripción</th>
                    <th>Venta</th>
                    <th>Coberturas</th>
                </tr>
            `;
            tabla.appendChild(thead);

            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${row.cod_fam}</td>
                    <td>${row.descripcion}</td>
                    <td>${row.venta}</td>
                    <td>${row.coberturas !== null ? row.coberturas : 'N/A'}</td>
                `;
                tbody.appendChild(fila);
            });
            tabla.appendChild(tbody);
            modalContent.appendChild(tabla);

            // Crear botón "Cerrar" reutilizando la clase "cerrarResultadosBtn"
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Cerrar';
            closeBtn.className = 'cerrarResultadosBtn'; // Reutilizar el estilo existente
            closeBtn.addEventListener('click', function () {
                container.style.display = 'none';
            });
            modalContent.appendChild(closeBtn);
        }
    }
});
