// scripts/admin.js
document.addEventListener('DOMContentLoaded', function () {
    const configuracionesBtn = document.getElementById('configuracionesBtn');
    const adminContainer = document.getElementById('adminContainer');

    configuracionesBtn.addEventListener('click', function (event) {
        event.preventDefault();
        
        // Cargar admin.html
        fetch('/admin.html')
            .then(response => response.text())
            .then(html => {
                adminContainer.innerHTML = html;
                adminContainer.style.display = 'flex';
            })
            .catch(error => console.error('Error al cargar el panel de admin:', error));
    });

    // Cerrar el modal al hacer clic fuera del contenido
    adminContainer.addEventListener('click', function (e) {
        if (e.target === adminContainer) {
            adminContainer.style.display = 'none';
        }
    });
});