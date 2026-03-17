function loadTags(containerId, tags) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        tags.forEach(tag => {
            const tagEl = createTagElement(tag);
            container.appendChild(tagEl);
        });
    } catch (e) {
        window.electronAPI.logError(`[settings-loadTags] ${e.message}`);
    }
}

function createTagElement(tag) {
    try {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.onclick = () => span.remove();
        span.appendChild(removeBtn);
        return span;
    } catch (e) {
        window.electronAPI.logError(`[settings-createTagElement] ${e.message}`);
        return document.createElement('span');
    }
}

function getTags(containerId) {
    try {
        const tags = [];
        document.querySelectorAll(`#${containerId} .tag`).forEach(tagEl => {
            // Correctly grab text content before the '×' button
            tags.push(tagEl.firstChild.textContent.trim());
        });
        return tags;
    } catch (e) {
        window.electronAPI.logError(`[settings-getTags] ${e.message}`);
        return [];
    }
}

function setupTagInputs() {
    try {
        document.querySelectorAll('.tags-input-container').forEach(container => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tag-input';
            input.placeholder = 'Añadir y pulsar Enter';
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = input.value.trim();
                    if (value) {
                        // Avoid duplicates
                        const existingTags = getTags(container.id);
                        if (!existingTags.includes(value)) {
                            container.appendChild(createTagElement(value));
                        }
                        input.value = '';
                    }
                }
            });
            
            container.appendChild(input);
        });
    } catch (e) {
        window.electronAPI.logError(`[settings-setupTagInputs] ${e.message}`);
    }
}

// This function seems to be intended for real-time sync, but the save process
// handles collecting tags now. It could be removed or repurposed if needed.
function syncFilterChips() {
    try {
        // This is the FIX: using the correct IDs from settings.html
        const blockedWords = getTags('blocked-words-list');
        const highlightWords = getTags('highlighted-words-list');
        
        // This function call doesn't exist on the API, but leaving the structure
        // in case it's implemented in main.cjs
        if (window.electronAPI.syncFilters) {
            window.electronAPI.syncFilters({ blocked: blockedWords, highlight: highlightWords });
        }
        
    } catch (e) {
        window.electronAPI.logError(`[settings-syncFilterChips] ${e.message}`);
    }
}

// Initialize tag inputs on load
document.addEventListener('DOMContentLoaded', setupTagInputs);