function logout() {
    fetch('/logout', { method: 'POST' })
    .then(response => {
        if (response.ok) {
            window.location.href = '/login';
        } else {
            alert('Error al cerrar sesión');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al cerrar sesión');
    });
}
