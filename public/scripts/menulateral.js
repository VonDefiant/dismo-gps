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

document.addEventListener("DOMContentLoaded", function () {
    const configBtn = document.getElementById("configuracionesBtn");
    const submenu = document.getElementById("submenuConfiguraciones");

    configBtn.addEventListener("click", function (event) {
        event.preventDefault(); // Evita que se refresque la página
        submenu.style.display = submenu.style.display === "block" ? "none" : "block";
    });

    // Opcional: Cerrar el submenú si se hace clic fuera
    document.addEventListener("click", function (event) {
        if (!configBtn.contains(event.target) && !submenu.contains(event.target)) {
            submenu.style.display = "none";
        }
    });
});
