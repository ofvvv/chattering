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
            tags.push(tagEl.textContent.slice(0, -1));
        });
        return tags;
    } catch (e) {
        window.electronAPI.logError(`[settings-getTags] ${e.message}`);
        return [];
    }
}

function setupTagInputs() {
    try {
        document.querySelectorAll('.tag-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const containerId = input.dataset.target;
                    const container = document.getElementById(containerId);
                    const value = input.value.trim();
                    if (value && container) {
                        container.appendChild(createTagElement(value));
                        input.value = '';
                    }
                }
            });
        });
    } catch (e) {
        window.electronAPI.logError(`[settings-setupTagInputs] ${e.message}`);
    }
}

function syncFilterChips() {
    try {
        const blockedWords = getTags('blocked-words-container');
        const highlightWords = getTags('highlight-words-container');
        window.electronAPI.syncFilters({ blocked: blockedWords, highlight: highlightWords });
    } catch (e) {
        window.electronAPI.logError(`[settings-syncFilterChips] ${e.message}`);
    }
}

setupTagInputs();
