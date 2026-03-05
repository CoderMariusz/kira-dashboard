---
story_id: STORY-0.12
title: "Keyboard shortcuts foundation — globalny handler"
epic: EPIC-0
module: infrastructure
domain: frontend
status: ready
difficulty: simple
recommended_model: glm-5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.1]
blocks: none
tags: [keyboard, shortcuts, frontend, ux, accessibility]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć globalne keyboard shortcuts (`/` = search, `?` = help, `Escape` = close)
**Żeby** nawigować po dashboardzie bez myszy, wzorem Dashy i innych power-user tools

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Nowy plik: `js/shortcuts.js` — globalny keyboard handler
- Nowy plik: `shortcuts.json` — konfiguracja skrótów
- Modyfikacja: `index.html` lub `app.html` — `<script src="/js/shortcuts.js">` na końcu body
- Inspiracja: Dashy keyboard shortcuts + istniejący LobsterBoard `Ctrl+E` (edit mode)

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo sklonowane, struktura `js/` istnieje
- LobsterBoard już ma `Ctrl+E` (edit mode) — NIE nadpisuj, rozszerz

---

## ✅ Acceptance Criteria

### AC-1: `/` focusuje search input
GIVEN: Dashboard załadowany, focus NIE jest w żadnym input
WHEN: Naciśniesz klawisz `/`
THEN: Kursor pojawia się w polu search (LobsterBoard search input)

### AC-2: `?` otwiera help overlay
GIVEN: Dashboard załadowany
WHEN: Naciśniesz klawisz `?`
THEN: Pojawia się overlay/modal z listą skrótów klawiszowych

### AC-3: `Escape` zamyka modal
GIVEN: Help overlay otwarty (`?`)
WHEN: Naciśniesz `Escape`
THEN: Overlay zamyka się

### AC-4: Shortcut NIE odpala gdy focus w input
GIVEN: Użytkownik pisze tekst w input (np. search)
WHEN: Naciśnie `/`
THEN: Znak `/` pojawia się w input (normalnie), NIE triggeruje shortcut

---

## 🔧 Szczegóły implementacji

### `shortcuts.json`
```json
{
  "shortcuts": [
    { "key": "/", "action": "focusSearch", "label": "Focus search" },
    { "key": "Escape", "action": "closeModal", "label": "Close modal/overlay" },
    { "key": "Ctrl+1", "action": "navigatePage", "target": "dashboard", "label": "Go to Dashboard" },
    { "key": "Ctrl+2", "action": "navigatePage", "target": "pipeline", "label": "Go to Pipeline" },
    { "key": "Ctrl+3", "action": "navigatePage", "target": "home", "label": "Go to Home" },
    { "key": "?", "action": "showShortcuts", "label": "Show shortcuts help" }
  ]
}
```

### `js/shortcuts.js`
```javascript
// KiraBoard Keyboard Shortcuts — Inspired by Dashy
// Nie nadpisuj Ctrl+E (LobsterBoard edit mode)

let shortcuts = [];

// Load config
fetch('/shortcuts.json')
  .then(r => r.json())
  .then(data => { shortcuts = data.shortcuts; })
  .catch(() => { /* shortcuts.json optional */ });

function executeAction(action, target) {
  switch (action) {
    case 'focusSearch':
      const searchInput = document.querySelector('[data-search], #search-input, input[type="search"]');
      if (searchInput) { searchInput.focus(); searchInput.select(); }
      break;
    case 'showShortcuts':
      showShortcutsModal();
      break;
    case 'closeModal':
      const modal = document.querySelector('.shortcuts-modal, [data-modal]:not([hidden])');
      if (modal) modal.style.display = 'none';
      // Also try LobsterBoard close button
      const closeBtn = document.querySelector('.modal-close, [data-close-modal]');
      if (closeBtn) closeBtn.click();
      break;
    case 'navigatePage':
      if (target) window.location.href = `/pages/${target}/`;
      break;
  }
}

document.addEventListener('keydown', (e) => {
  // Skip when focus is in interactive elements
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (e.target.isContentEditable) return;
  
  const key = [
    e.ctrlKey && e.key !== 'Control' ? 'Ctrl' : '',
    e.shiftKey && e.key !== 'Shift' ? 'Shift' : '',
    e.key
  ].filter(Boolean).join('+');
  
  const shortcut = shortcuts.find(s => s.key === key);
  if (!shortcut) return;
  
  e.preventDefault();
  executeAction(shortcut.action, shortcut.target);
});

function showShortcutsModal() {
  let modal = document.getElementById('shortcuts-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'shortcuts-modal';
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: var(--bg-card, #1a1730); border: 1px solid var(--border, #2a2540);
      border-radius: 12px; padding: 24px; z-index: 9999; min-width: 300px;
      color: var(--text-primary, #e2e8f0); box-shadow: var(--shadow);
    `;
    
    const title = document.createElement('h3');
    title.textContent = '⌨️ Keyboard Shortcuts';
    title.style.cssText = 'margin: 0 0 16px; font-size: 16px; color: var(--accent, #818cf8)';
    modal.appendChild(title);
    
    shortcuts.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border, #2a2540)';
      row.innerHTML = `<span style="color:var(--text-secondary)">${s.label}</span><kbd style="background:var(--bg-secondary);padding:2px 8px;border-radius:4px;font-family:monospace">${s.key}</kbd>`;
      modal.appendChild(row);
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = 'margin-top: 16px; padding: 6px 16px; background: var(--accent-dim); border: none; border-radius: 6px; color: var(--accent); cursor: pointer';
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.appendChild(closeBtn);
    
    document.body.appendChild(modal);
  } else {
    modal.style.display = 'block';
  }
}
```

### Integracja w `index.html`/`app.html`
```html
<!-- Na końcu <body> -->
<script src="/js/shortcuts.js"></script>
```

---

## ⚠️ Edge Cases

### EC-1: `Ctrl+1` koliduje z browser tab switch
Scenariusz: Ctrl+1 w przeglądarce normalnie przełącza tab
Oczekiwane zachowanie: `e.preventDefault()` blokuje browser action — user traci browser shortcut. Zaakceptowane (power user tool)

### EC-2: LobsterBoard używa `?` do czegoś innego
Scenariusz: LobsterBoard ma handler na `?` lub `/`
Oczekiwane zachowanie: Sprawdź w LobsterBoard code — jeśli conflict, nasza implementacja powinna dodawać listener z `capture: false` by LobsterBoard mógł go też używać

---

## 🚫 Out of Scope tej Story
- Custom user-defined shortcuts (settings UI)
- Vim-style modal shortcuts (j/k navigation)
- Shortcut dla specific widgetów (EPIC-1)
- Touch/mobile gestures

---

## ✔️ Definition of Done
- [ ] `shortcuts.json` istnieje z ≥ 5 shortcuts
- [ ] `js/shortcuts.js` istnieje z globalnym event listener
- [ ] `/` focusuje search input w LobsterBoard
- [ ] `?` otwiera modal z listą shortcuts
- [ ] `Escape` zamyka modal
- [ ] Shortcuts NIE odpala gdy focus w INPUT/TEXTAREA
- [ ] `<script>` tag dodany do `index.html`/`app.html`
- [ ] Istniejący `Ctrl+E` (edit mode) nadal działa bez zmian
