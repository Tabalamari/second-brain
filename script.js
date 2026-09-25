



function initClock() {
    const clockEl = document.getElementById('digital-clock');
    const dateEl = document.getElementById('current-date');

    function update() {
        const now = new Date();

        // Digital clock HH:MM
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        if (clockEl) clockEl.textContent = `${hours}:${minutes}`;

        // Date DD.MM.YYYY
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();

        if (dateEl) dateEl.textContent = `${day}.${month}.${year}`;
    }

    update();
    setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {

    initClock();

    console.log('Second Brain App loaded successfully.');
});