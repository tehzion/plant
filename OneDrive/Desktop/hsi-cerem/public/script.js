const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');

    startButton.addEventListener('click', () => {
        socket.emit('incrementClick');
        alert('Thank you for participating!');
    });
});