document.getElementById('menu-toggle').addEventListener('click', function() {
    var sidebar = document.getElementById('sidebar');
    // Alternar la visibilidad del menú lateral
    sidebar.style.left = (sidebar.style.left === '0px') ? '-250px' : '0px';
});

// Detectar clic fuera del menú para cerrarlo
document.addEventListener('click', function(event) {
    var sidebar = document.getElementById('sidebar');
    var clickInsideMenu = sidebar.contains(event.target);
    var menuButton = document.getElementById('menu-toggle');

    if (!clickInsideMenu && sidebar.style.left === '0px' && event.target !== menuButton) {
        sidebar.style.left = '-250px'; // Ocultar el menú
    }
});
