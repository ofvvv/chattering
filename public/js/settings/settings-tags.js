function renderTags(wrapId, arr, isHighlight) {
    const wrap = document.getElementById(wrapId);
    wrap.querySelectorAll('.tag-chip').forEach(c => c.remove());
    arr.forEach(word => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip' + (isHighlight ? ' hl' : '');
        chip.innerHTML = `${word} <button class="remove-tag-btn">✕</button>`;
        chip.querySelector('.remove-tag-btn').addEventListener('click', () => removeTag(wrapId, word, isHighlight));
        wrap.insertBefore(chip, wrap.querySelector('.tags-input') || null);
    });
}

function removeTag(wrapId, word, isHighlight) {
    const arr = isHighlight ? highlights : blockedWords;
    const idx = arr.indexOf(word);
    if (idx >= 0) arr.splice(idx, 1);
    renderTags(wrapId, arr, isHighlight);
}

function initTagsInput(wrapId, inputId, isHighlight) {
    const input = document.getElementById(inputId);
    const wrap = document.getElementById(wrapId);
    if (!input) return;

    // Mover el input al final del contenedor y mostrarlo
    input.style.display = 'inline';
    wrap.appendChild(input);

    input.addEventListener('keydown', e => {
        const arr = isHighlight ? highlights : blockedWords;
        if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
            e.preventDefault();
            const w = input.value.replace(',','').trim();
            if (w && !arr.includes(w)) { 
                arr.push(w); 
                renderTags(wrapId, arr, isHighlight);
            } 
            input.value = '';
        }
        if (e.key === 'Backspace' && !input.value && arr.length) {
            arr.pop();
            renderTags(wrapId, arr, isHighlight);
        }
    });
}
