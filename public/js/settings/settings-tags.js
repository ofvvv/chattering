let blockedWords = [];
let highlights = [];

function renderTags(wrapId, arr, isHighlight) {
    const wrap = document.getElementById(wrapId);
    wrap.querySelectorAll('.tag-chip').forEach(c => c.remove());
    arr.forEach(word => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip' + (isHighlight ? ' hl' : '');
        chip.innerHTML = `${word} <button onclick="removeTag('${wrapId}', '${word}', ${isHighlight})">✕</button>`;
        wrap.insertBefore(chip, wrap.querySelector('input') || null);
    });
}

function removeTag(wrapId, word, isHighlight) {
    const arr = isHighlight ? highlights : blockedWords;
    const idx = arr.indexOf(word);
    if (idx >= 0) arr.splice(idx, 1);
    renderTags(wrapId, arr, isHighlight);
}

function makeTagsInput(wrapId, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.style.display = 'inline';
    document.getElementById(wrapId).appendChild(input);
    input.addEventListener('keydown', e => {
        const isHighlight = wrapId.includes('highlight');
        const arr = isHighlight ? highlights : blockedWords;
        if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
            e.preventDefault();
            const w = input.value.replace(',', '').trim();
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
