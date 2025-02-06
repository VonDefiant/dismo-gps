document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('vtaxfamiliaBtn').addEventListener('click', function (event) {
        event.preventDefault(); // Prevenir el comportamiento predeterminado del enlace

        // Cargar el archivo HTML para el modal de `vtaxfamilia`
        fetch('/vtaxfamilia.html')
            .then(response => response.text())
            .then(html => {
                const container = document.getElementById('vtaxfamiliaContainer');
                container.innerHTML = html;

                // Estilo del contenedor del modal
                container.style.display = 'flex';
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Fondo semitransparente
                container.style.alignItems = 'center'; // Centrar verticalmente
                container.style.justifyContent = 'center'; // Centrar horizontalmente
                container.style.zIndex = '1000'; // Asegurarse de que esté encima de otros elementos

                // Estilo del contenido del modal
                const modalContent = container.querySelector('.modal-content') || document.createElement('div');
                modalContent.classList.add('modal-content');
                modalContent.style.width = '400px';
                modalContent.style.minHeight = '300px';
                modalContent.style.backgroundColor = '#1d3f7d';
                modalContent.style.borderRadius = '10px';
                modalContent.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.2)';
                modalContent.style.padding = '20px';
                modalContent.style.display = 'flex';
                modalContent.style.flexDirection = 'column';
                modalContent.style.alignItems = 'center';
                modalContent.style.justifyContent = 'space-between';
                container.appendChild(modalContent);

                const closeModalBtn = container.querySelector('#closeModal');
                if (closeModalBtn) {
                    closeModalBtn.addEventListener('click', function () {
                        container.style.display = 'none'; // Ocultar el modal
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

                // Manejar la consulta de ventas
                const reconstruirBtn = container.querySelector('#reconstruirBtn');
                if (reconstruirBtn) {
                    reconstruirBtn.addEventListener('click', function () {
                        const idRuta = container.querySelector('#rutaSelect').value;
                        const fechaSeleccionada = container.querySelector('#fechaSelect').value;

                        // Validar que se hayan seleccionado una ruta y una fecha
                        if (!idRuta || !fechaSeleccionada) {
                            alert('Por favor selecciona una ruta y una fecha antes de consultar.');
                            return;
                        }

                        console.log(`Consultando datos de ventas con id_ruta: ${idRuta} y fecha: ${fechaSeleccionada}`);

                        // Realizar la consulta
                        fetch(`/sales/query?ruta=${idRuta}&fecha=${fechaSeleccionada}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Error en la respuesta del servidor');
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (!Array.isArray(data) || data.length === 0) {
                                    console.error('No se encontraron datos para los parámetros proporcionados.');
                                    alert('No se encontraron resultados.');
                                    return;
                                }

                                console.log('Datos de ventas recibidos:', data);

                                // Reemplazar el contenido del contenedor con los resultados
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

    // Función para mostrar los resultados en un rectángulo centrado
    function mostrarResultadosRectangulares(container, idRuta, fechaSeleccionada, data) {
        const modalContent = container.querySelector('.modal-content');
        if (modalContent) {
            modalContent.innerHTML = '';

            const titulo = document.createElement('h3');
            titulo.textContent = 'Resultados de la consulta';
            titulo.style.color = 'white';
            titulo.style.marginBottom = '10px';
            titulo.style.fontSize = '16px'; // Tamaño reducido del título
            modalContent.appendChild(titulo);

            const infoHeader = document.createElement('div');
            infoHeader.innerHTML = `<strong>Ruta:</strong> ${idRuta} &nbsp;&nbsp; <strong>Fecha:</strong> ${fechaSeleccionada}`;
            infoHeader.style.color = 'white';
            infoHeader.style.marginBottom = '20px';
            infoHeader.style.fontSize = '12px'; // Tamaño reducido de texto
            modalContent.appendChild(infoHeader);

            const tabla = document.createElement('table');
            tabla.style.width = '100%';
            tabla.style.borderCollapse = 'collapse';
            tabla.style.fontSize = '10px'; // Tamaño reducido para la tabla

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr style="background-color: #fab925; color: white;">
                    <th style="border: 1px solid white; padding: 5px;">Cod_Fam</th>
                    <th style="border: 1px solid white; padding: 5px;">Descripción</th>
                    <th style="border: 1px solid white; padding: 5px;">Venta</th>
                    <th style="border: 1px solid white; padding: 5px;">Coberturas</th>
                </tr>
            `;
            tabla.appendChild(thead);

            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td style="border: 1px solid white; padding: 5px; text-align: center;">${row.cod_fam}</td>
                    <td style="border: 1px solid white; padding: 5px; text-align: center;">${row.descripcion}</td>
                    <td style="border: 1px solid white; padding: 5px; text-align: center;">${row.venta}</td>
                    <td style="border: 1px solid white; padding: 5px; text-align: center;">${row.coberturas !== null ? row.coberturas : 'N/A'}</td>
                `;
                tbody.appendChild(fila);
            });
            tabla.appendChild(tbody);
            modalContent.appendChild(tabla);

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Cerrar';
            closeBtn.style.backgroundColor = '#e63946';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.borderRadius = '5px';
            closeBtn.style.marginTop = '20px';
            closeBtn.addEventListener('click', function () {
                container.style.display = 'none';
            });
            modalContent.appendChild(closeBtn);
        }
    }
});
