async function logout() {
    try {
        // Mostrar feedback al usuario
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<span class="spinner"></span> Cerrando sesión...';
        }

        // Agregar timeout para evitar solicitudes colgadas
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Incluir token CSRF si está configurado
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken || ''
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Limpiar datos sensibles del cliente
        if (response.ok) {
            // Forzar recarga limpia
            window.location.replace('/login');
            
            // Limpiar almacenamiento local
            localStorage.removeItem('session_data');
            sessionStorage.clear();
            
            // Eliminar cookies relacionadas
            document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Logout Error:', error);
        
        // Manejar diferentes tipos de errores
        const errorMessage = error.name === 'AbortError' 
            ? 'Tiempo de espera agotado. Verifica tu conexión'
            : 'Error al cerrar sesión. Por favor intenta nuevamente';
            
        showToast(errorMessage, 'error');
        
        // Restaurar botón
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = false;
            logoutBtn.textContent = 'Cerrar sesión';
        }
    }
}

// Función auxiliar para mostrar notificaciones
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}

