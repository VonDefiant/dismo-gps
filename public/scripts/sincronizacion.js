// sincronizacion.js
document.addEventListener("DOMContentLoaded", function() {
    // Cargar el HTML del modal de sincronización
    fetch('/sincronizacion.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al cargar el HTML: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            // Espera un poco para asegurarte de que el DOM se ha actualizado
            setTimeout(() => {
                initSincronizacionModal();
            }, 100);
        })
        .catch(error => {
            console.error('Error cargando modal de sincronización:', error);
        });

    function initSincronizacionModal() {
        // Referencias a elementos del DOM
        const sincronizacionModal = document.getElementById("sincronizacionContainer");
        if (!sincronizacionModal) {
            console.error("No se pudo encontrar el elemento #sincronizacionContainer");
            return;
        }

        const cerrarSincronizacionBtn = document.getElementById("cerrarSincronizacionBtn");
        const todosBtn = document.getElementById("todosBtn");
        
        // Botón del menú para abrir el modal de sincronización
        const menuSincronizarBtn = document.getElementById("sincronizarBtn");
        
        if (menuSincronizarBtn) {
            menuSincronizarBtn.addEventListener("click", function() {
                if (sincronizacionModal) {
                    sincronizacionModal.style.display = "flex";
                    cargarDatosSincronizacion();
                }
            });
        }

        // Cerrar modal
        if (cerrarSincronizacionBtn) {
            cerrarSincronizacionBtn.addEventListener("click", function() {
                sincronizacionModal.style.display = "none";
            });
        }

        // Filtrar por "Todos" y sincronizar todos los dispositivos
        if (todosBtn) {
            todosBtn.addEventListener("click", function() {
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                todosBtn.classList.add('active');
                
                // Preguntar si desea sincronizar todos los dispositivos
                const confirmar = confirm("¿Desea sincronizar TODOS los dispositivos?");
                if (confirmar) {
                    sincronizarTodosDispositivos();
                } else {
                    // Solo cargar los datos sin sincronizar
                    cargarDatosSincronizacion();
                }
            });
        }
    }

    // Función para cargar los datos de sincronización
    function cargarDatosSincronizacion() {
        const table = document.getElementById("sincronizacionTable");
        if (!table) {
            console.error("No se pudo encontrar la tabla de sincronización");
            return;
        }
        
        const tbody = table.querySelector("tbody");
        if (!tbody) {
            console.error("No se pudo encontrar el cuerpo de la tabla");
            return;
        }
        
        // Mostrar indicador de carga
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Cargando datos...</td></tr>';
        
        // Obtener los datos desde el servidor
        fetch('/api/sincronizacion/rutas')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
                return response.json();
            })
            .then(data => {
                // Limpiar la tabla
                tbody.innerHTML = '';
                
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay datos disponibles</td></tr>';
                    return;
                }
                
                // Guardar los datos para uso en sincronización masiva
                window.rutasData = data;
                
                // Llenar la tabla con los datos
                data.forEach(item => {
                    const row = document.createElement('tr');
                    
                    // Formatear la fecha y hora
                    const fecha = item.last_timestamp ? new Date(item.last_timestamp) : null;
                    const fechaFormateada = fecha ? 
                        `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}` : 
                        'Nunca';
                    
                    row.innerHTML = `
                        <td>${item.id_ruta}</td>
                        <td>${fechaFormateada}</td>
                        <td>
                            <button class="sincronizar-btn" data-ruta="${item.id_ruta}" data-token="${item.token}">
                                SINCRONIZAR
                            </button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
                
                // Añadir event listeners a los botones de sincronización
                document.querySelectorAll('.sincronizar-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const ruta = this.getAttribute('data-ruta');
                        const token = this.getAttribute('data-token');
                        sincronizarRuta(this, ruta, token);
                    });
                });
            })
            .catch(error => {
                console.error('Error al cargar datos de sincronización:', error);
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Error al cargar datos</td></tr>';
                }
            });
    }

    // Función para sincronizar todas las rutas
    function sincronizarTodosDispositivos() {
        if (!window.rutasData || window.rutasData.length === 0) {
            alert('No hay dispositivos disponibles para sincronizar');
            return;
        }
        
        // Cambia el texto del botón TODOS para indicar que está en proceso
        const todosBtn = document.getElementById("todosBtn");
        if (todosBtn) {
            todosBtn.textContent = "SINCRONIZANDO...";
            todosBtn.disabled = true;
        }
        
        // En lugar de usar multicasting, sincronizaremos uno por uno
        // Esto es más confiable y evita problemas de límites de tamaño en las solicitudes
        const promesas = [];
        
        // Obtener todos los botones de sincronización
        const botonesSincronizar = document.querySelectorAll('.sincronizar-btn');
        
        if (botonesSincronizar.length === 0) {
            alert('No se encontraron dispositivos para sincronizar');
            if (todosBtn) {
                todosBtn.textContent = "TODOS";
                todosBtn.disabled = false;
            }
            return;
        }
        
        // Variable para llevar la cuenta de sincronizaciones exitosas
        let exitosos = 0;
        let fallidos = 0;
        
        // Sincronizar cada dispositivo
        botonesSincronizar.forEach((boton, index) => {
            const ruta = boton.getAttribute('data-ruta');
            const token = boton.getAttribute('data-token');
            
            if (!token || token.trim() === '') {
                fallidos++;
                return; // Saltar este dispositivo si no tiene token
            }
            
            // Estructura simplificada exactamente como la de Postman
            const notificationData = {
                token: token,
                message: {
                    data: {
                        action: 'SYNC_DATA',
                        ruta: ruta,
                        tipo: "location_update",
                        timestamp: new Date().toISOString(),
                        title: 'DISMOGT REPORTES',
                        body: 'No vendas para cerrar una transacción, vende para abrir una relación.'
                    }
                }
            };
            
            // Añadir un pequeño retraso entre solicitudes para evitar sobrecarga
            const promesa = new Promise(resolve => {
                setTimeout(() => {
                    // Indicar visualmente que este botón está siendo procesado
                    boton.disabled = true;
                    boton.classList.add('loading');
                    
                    fetch('/api/push/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(notificationData)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Error en ruta ${ruta}: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Restaurar el estado del botón
                        boton.disabled = false;
                        boton.classList.remove('loading');
                        
                        if (data.success) {
                            exitosos++;
                        } else {
                            fallidos++;
                            console.error(`Error al sincronizar ruta ${ruta}: ${data.error || 'Error desconocido'}`);
                        }
                        resolve();
                    })
                    .catch(error => {
                        console.error(`Error al sincronizar ruta ${ruta}:`, error);
                        boton.disabled = false;
                        boton.classList.remove('loading');
                        fallidos++;
                        resolve();
                    });
                }, index * 300); // 300ms de retraso entre cada solicitud
            });
            
            promesas.push(promesa);
        });
        
        // Esperar a que todas las sincronizaciones se completen
        Promise.all(promesas)
            .then(() => {
                // Restaurar el estado del botón TODOS
                if (todosBtn) {
                    todosBtn.textContent = "TODOS";
                    todosBtn.disabled = false;
                }
                
                // Mostrar mensaje de resultados
                alert(`Sincronización completada.\nDispositivos exitosos: ${exitosos}\nDispositivos fallidos: ${fallidos}`);
            })
            .catch(error => {
                console.error('Error durante la sincronización masiva:', error);
                
                // Restaurar el estado del botón
                if (todosBtn) {
                    todosBtn.textContent = "TODOS";
                    todosBtn.disabled = false;
                }
                
                alert('Ocurrió un error durante la sincronización masiva. Consulte la consola para más detalles.');
            });
    }

    // Función para enviar notificación push a una ruta específica
    function sincronizarRuta(button, ruta, token) {
        if (!token) {
            alert('No hay token FCM disponible para esta ruta');
            return;
        }
        
        // Cambiar el estado del botón a "cargando"
        button.disabled = true;
        button.classList.add('loading');
        
        // Estructura simplificada exactamente como la de Postman
        const notificationData = {
            token: token,
            message: {
                data: {
                    action: 'SYNC_DATA',
                    ruta: ruta,
                    tipo: "location_update",
                    timestamp: new Date().toISOString(),
                    title: 'DISMOGT REPORTES',
                    body: 'No vendas para cerrar una transacción, vende para abrir una relación.'
                }
            }
        };
        
        // Depurar la estructura enviada
        console.log('Enviando notificación con estructura:', JSON.stringify(notificationData, null, 2));
        
        // Enviar la solicitud al servidor
        fetch('/api/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(`Error en la respuesta del servidor: ${errorData?.error || response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Restaurar el estado del botón
            button.disabled = false;
            button.classList.remove('loading');
            
            if (data.success) {
                // Mostrar mensaje de éxito
                alert(`Notificación enviada correctamente a la ruta ${ruta}`);
            } else {
                // Mostrar mensaje de error
                alert(`Error al enviar notificación: ${data.error || 'Error desconocido'}`);
            }
        })
        .catch(error => {
            console.error('Error al sincronizar ruta:', error);
            console.error('Error completo:', error.message, error.stack);
            
            // Restaurar el estado del botón
            button.disabled = false;
            button.classList.remove('loading');
            
            // Mostrar mensaje de error
            alert(`Error al enviar la notificación: ${error.message}`);
        });
    }
});