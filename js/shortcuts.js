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
