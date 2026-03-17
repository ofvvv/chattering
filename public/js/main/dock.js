function renderEvent(event) {
    const dockInner = document.getElementById('dock-inner');
    const emptyMsg = document.getElementById('dock-empty');
    if (!dockInner || !emptyMsg) return;

    emptyMsg.style.display = 'none';

    const eventElement = document.createElement('div');
    eventElement.className = `dock-item dock-${event.type}`;

    let icon = '';
    let text = '';

    switch (event.type) {
        case 'follow':
            icon = '⭐';
            text = `<span class="dock-user">${event.user}</span> ha comenzado a seguir.`;
            break;
        case 'gift':
            icon = '🎁';
            text = `<span class="dock-user">${event.user}</span> regaló ${event.count}x <span class="dock-gift">${event.gift}</span>.`;
            break;
        // ... otros tipos de eventos ...
    }

    eventElement.innerHTML = `${icon} ${text}`;
    dockInner.appendChild(eventElement);

    // Scroll to bottom
    const scrollContainer = document.getElementById('dock-scroll');
    if(scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
}
