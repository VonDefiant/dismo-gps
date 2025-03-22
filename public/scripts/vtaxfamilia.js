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

                        // Realizar dos consultas en paralelo
                        Promise.all([
                            // 1. Consulta de ventas por familia
                            fetch(`/sales/query?ruta=${idRuta}&fecha=${fechaSeleccionada}`)
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error('Error en la respuesta del servidor');
                                    }
                                    return response.json();
                                }),
                            
                            // 2. Consulta del total de clientes usando el endpoint existente
                            fetch(`/sales/total_clientes?ruta=${idRuta}&fecha=${fechaSeleccionada}`)
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error('Error al obtener total de clientes');
                                    }
                                    return response.json();
                                })
                                .catch(error => {
                                    console.error('Error al obtener total_clientes:', error);
                                    // Si hay error, devolver un objeto con total 0
                                    return { total: 0 };
                                })
                        ])
                        .then(([ventasData, totalClientesData]) => {
                            if (!Array.isArray(ventasData) || ventasData.length === 0) {
                                alert('No se encontraron resultados de ventas.');
                                return;
                            }
                            
                            // Obtener el valor total de clientes
                            const totalClientes = totalClientesData.total || 0;
                            
                            // Mostrar los resultados
                            mostrarResultadosRectangulares(container, idRuta, fechaSeleccionada, ventasData, totalClientes);
                        })
                        .catch(error => {
                            console.error('Error en las consultas:', error);
                            alert('Ocurrió un error al consultar los datos. Por favor, inténtalo más tarde.');
                        });
                    });
                }
            })
            .catch(error => console.error('Error al cargar el menú de reconstrucción:', error));
    });

    function mostrarResultadosRectangulares(container, idRuta, fechaSeleccionada, data, totalClientes) {
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
            tabla.style.width = '100%';
            tabla.style.borderCollapse = 'collapse';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="background-color: #fab925; color: white;">Cod_Fam</th>
                    <th style="background-color: #fab925; color: white;">Descripción</th>
                    <th style="background-color: #fab925; color: white;">Venta</th>
                    <th style="background-color: #fab925; color: white;">Coberturas</th>
                </tr>
            `;
            tabla.appendChild(thead);

            const tbody = document.createElement('tbody');
            
            // Variable para calcular el total de ventas
            let totalVentas = 0;

            data.forEach((row, index) => {
                const fila = document.createElement('tr');
                fila.style.backgroundColor = index % 2 === 0 ? '#1d3f7d' : '#2a4e8c';
                fila.style.color = 'white';
                
                // Extraer valor numérico de la venta
                const ventaStr = row.venta || 'Q 0';
                const ventaNum = parseFloat(ventaStr.replace('Q ', '').replace(',', '.')) || 0;
                totalVentas += ventaNum;
                
                fila.innerHTML = `
                    <td style="border: 1px solid white; padding: 8px; text-align: center;">${row.cod_fam}</td>
                    <td style="border: 1px solid white; padding: 8px; text-align: center;">${row.descripcion}</td>
                    <td style="border: 1px solid white; padding: 8px; text-align: center;">${row.venta}</td>
                    <td style="border: 1px solid white; padding: 8px; text-align: center;">${row.coberturas !== null ? row.coberturas : '0'}</td>
                `;
                tbody.appendChild(fila);
            });
            
            // Agregar fila de totales
            const totalRow = document.createElement('tr');
            totalRow.style.backgroundColor = '#ffb300';
            totalRow.style.color = 'white';
            totalRow.style.fontWeight = 'bold';
            
            totalRow.innerHTML = `
                <td style="border: 1px solid white; padding: 8px; text-align: center;" colspan="2">SUMA TOTAL</td>
                <td style="border: 1px solid white; padding: 8px; text-align: center;">Q ${totalVentas.toFixed(2)}</td>
                <td style="border: 1px solid white; padding: 8px; text-align: center;">${totalClientes}</td>
            `;
            tbody.appendChild(totalRow);
            
            tabla.appendChild(tbody);
            modalContent.appendChild(tabla);

            // Crear botón "Cerrar" reutilizando la clase "cerrarResultadosBtn"
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Cerrar';
            closeBtn.className = 'cerrarResultadosBtn'; // Reutilizar el estilo existente
            closeBtn.style.marginTop = '20px';
            closeBtn.style.backgroundColor = '#f44336';
            closeBtn.style.color = 'white';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '5px';
            closeBtn.style.cursor = 'pointer';
            
            closeBtn.addEventListener('click', function () {
                container.style.display = 'none';
            });
            modalContent.appendChild(closeBtn);
        }
    }
});