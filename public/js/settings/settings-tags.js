// Lógica para la gestión de las etiquetas (palabras bloqueadas/resaltadas).

function loadTags(containerId, tags) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Limpiar antes de añadir
    (tags || []).forEach(tag => {
        container.appendChild(createTagElement(tag));
    });
}

function createTagElement(tag) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.onclick = () => span.remove();
    
    span.appendChild(removeBtn);
    return span;
}

function getTags(containerId) {
    const tags = [];
    document.querySelectorAll(`#${containerId} .tag`).forEach(tagEl => {
        // El texto de la etiqueta es el contenido del nodo de texto hijo del span
        tags.push(tagEl.firstChild.textContent.trim());
    });
    return tags;
}

function setupTagInputs() {
    document.querySelectorAll('.tags-input-container').forEach(container => {
        const inputId = container.id + '-input';
        let input = document.getElementById(inputId);
        
        if (!input) {
            input = document.createElement('input');
            input.id = inputId;
            input.type = 'text';
            input.className = 'tag-input'; // Asegúrate de que los estilos se apliquen
            input.placeholder = 'Añadir y pulsar Enter';
            container.insertAdjacentElement('afterend', input);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = input.value.trim();
                    if (value) {
                        const existingTags = getTags(container.id);
                        if (!existingTags.includes(value)) {
                            container.appendChild(createTagElement(value));
                        }
                        input.value = ''; // Limpiar input
                    }
                }
            });
        }
    });
}

// Inicializar los campos de entrada de etiquetas cuando el DOM esté listo.
document.addEventListener('DOMContentLoaded', setupTagInputs);
