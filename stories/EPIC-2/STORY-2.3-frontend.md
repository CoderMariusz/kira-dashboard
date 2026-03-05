---
story_id: STORY-2.3
title: "Toast notification system — Bridge events → UI toasts"
epic: EPIC-2
module: realtime
domain: frontend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-2.2]
blocks: []
tags: [toast, notifications, overlay, vanilla-js, css, realtime]
---

## 🎯 User Story

**Jako** Mariusz patrzący na KiraBoard
**Chcę** żeby na dashboardzie pojawiały się krótkie powiadomienia gdy Bridge zmienia statusy stories lub gate przechodzi przez weryfikację
**Żeby** natychmiast wiedzieć co się dzieje w pipeline bez konieczności patrzenia na konkretny widget

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Nowy plik: `js/toast.js` (system toastów — Vanilla JS)
- Nowy plik: `css/toast.css` (style overlay)
- Ładowane w: `index.html` (script + link tag)
- Wyzwalane przez: `CustomEvent` na `document` emitowane przez `sse-client.js` (STORY-2.2)
- Toast container: `<div id="toast-container"></div>` w `index.html` (fixed overlay)

### Powiązane pliki
- `js/toast.js` — NOWY
- `css/toast.css` — NOWY
- `index.html` — dodaj script/link tags i `#toast-container`
- `js/sse-client.js` — źródło CustomEvent (STORY-2.2, nie modyfikuj)

### Stan systemu przed tą story
- STORY-2.2 gotowa: `sse-client.js` emituje `CustomEvent('sse:story_status_changed', {...})` i inne eventy SSE

---

## ✅ Acceptance Criteria

### AC-1: Toast pojawia się przy zdarzeniu SSE
GIVEN: KiraBoard jest otwarty i SSE jest połączony
WHEN: Bridge zmienia status story na `review` (CustomEvent `sse:story_status_changed` z `new_status: "review"`)
THEN: Na ekranie pojawia się toast z tekstem "STORY-1.3 → REVIEW ✅" (lub odpowiedni emoji/kolor dla statusu)
AND: Toast jest widoczny przez 5 sekund, po czym automatycznie znika z animacją fade-out
AND: Toast jest pozycjonowany w prawym górnym rogu ekranu (fixed, z-index: 9999)

### AC-2: Kolejka toastów — max 3 jednocześnie
GIVEN: 3 toasty są już wyświetlane na ekranie
WHEN: Pojawia się 4. event SSE
THEN: 4. toast jest dodawany do wewnętrznej kolejki
AND: Na ekranie nadal wyświetlają się maksymalnie 3 toasty
AND: Gdy jeden z widocznych toastów zniknie, następny z kolejki pojawia się z animacją slide-in

### AC-3: Ręczne zamknięcie toastu
GIVEN: Toast jest wyświetlany na ekranie
WHEN: Użytkownik klika na toast lub przycisk "✕" przy toaście
THEN: Toast natychmiast znika z animacją fade-out
AND: Następny toast z kolejki (jeśli istnieje) pojawia się

### AC-4: Typy toastów i kolory
GIVEN: Serwer wysyła event o określonym typie
WHEN: Toast jest wyświetlany
THEN: Toast ma odpowiedni kolor tła i emoji:
- `new_status: "done"` lub `run_finished` (success) → zielony `#22c55e`, tekst "✅ STORY-X.Y → DONE"
- `new_status: "review"` → niebieski `#3b82f6`, tekst "👀 STORY-X.Y → REVIEW"
- `gate_updated` z `status: "FAIL"` → czerwony `#ef4444`, tekst "❌ Gate LINT FAIL — STORY-X.Y"
- `gate_updated` z `status: "PASS"` → zielony, tekst "✅ Gate LINT PASS — STORY-X.Y"
- `run_started` → szary `#6b7280`, tekst "🚀 STORY-X.Y — agent started"
- `bridge_error` → czerwony, tekst "⚠️ Bridge unavailable"
- `nightclaw_started/finished` → fioletowy `#8b5cf6`, tekst "🌙 NightClaw started/finished"

### AC-5: Przycisk "Clear All"
GIVEN: Co najmniej jeden toast jest wyświetlony
WHEN: Użytkownik klika przycisk "Clear All" (widoczny gdy ≥1 toast na ekranie)
THEN: Wszystkie widoczne toasty i kolejka są czyszczone
AND: Wszystkie toasty znikają z animacją fade-out
AND: Przycisk "Clear All" chowa się gdy nie ma toastów

---

## 🖥️ Szczegóły Frontend

### Architektura `js/toast.js`

```javascript
// ToastManager — singleton
class ToastManager {
  constructor(containerId = 'toast-container', maxVisible = 3)

  // Główne metody:
  show(message, type = 'info', duration = 5000)  // dodaje do kolejki
  dismiss(toastId)                                // zamknięcie pojedynczego
  clearAll()                                      // czyści wszystko

  // Wewnętrzne:
  _render()        // renderuje kolejne z queue gdy jest miejsce
  _createToastEl(toast)  // tworzy DOM element
  _scheduleAutoDismiss(toastId, duration)
}

// Inicjalizacja i nasłuchiwanie CustomEvent:
document.addEventListener('DOMContentLoaded', () => {
  window.toastManager = new ToastManager();

  // Mapa eventów SSE → wywołania toast.show()
  document.addEventListener('sse:story_status_changed', (e) => {
    const { story_id, new_status } = e.detail;
    // Mapowanie statusu na typ i tekst toastu
    toastManager.show(`${story_id} → ${new_status.toUpperCase()}`, mapStatus(new_status));
  });

  document.addEventListener('sse:gate_updated', (e) => { ... });
  document.addEventListener('sse:run_started', (e) => { ... });
  // itd.
});
```

### Struktura HTML toastu
```html
<div id="toast-container">
  <!-- Dynamicznie wstawiane toasty: -->
  <div class="toast toast--success" data-toast-id="uuid">
    <span class="toast__icon">✅</span>
    <span class="toast__message">STORY-1.3 → DONE</span>
    <button class="toast__close" aria-label="Zamknij powiadomienie">✕</button>
  </div>

  <!-- Przycisk Clear All (visible gdy ≥1 toast): -->
  <button id="toast-clear-all" class="toast-clear-all">Clear All</button>
</div>
```

### CSS overlay (`css/toast.css`)
```css
#toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  pointer-events: none; /* container nie blokuje klikania pod spodem */
}

.toast {
  pointer-events: all; /* ale toasty są klikalne */
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  animation: toast-slide-in 0.3s ease-out;
  /* Typy: --success, --error, --info, --warning, --purple */
}

@keyframes toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.toast--dismissed {
  animation: toast-fade-out 0.3s ease-in forwards;
}

@keyframes toast-fade-out {
  to { opacity: 0; transform: translateY(-10px); }
}
```

### Stany widoku `#toast-container`

**Brak toastów:** Container pusty, niewidoczny, brak "Clear All"
**1-3 toasty:** Widoczne toasty + "Clear All" button
**Overflow (>3 oczekujących):** Na ekranie max 3, reszta w kolejce JavaScript (niewidoczna)

### Responsive / Dostępność
- Mobile (375px+): max-width 100% - 32px, toasty na pełną szerokość od góry
- Desktop (1280px+): max-width 360px, prawy górny róg
- Keyboard: toast zamykany przez `Escape` (globalny listener)
- ARIA: `role="alert"` na każdym toaście, `aria-live="polite"` na kontenerze

---

## ⚠️ Edge Cases

### EC-1: Burst zdarzeń (wiele eventów naraz)
Scenariusz: Pipeline kończy 5 stories jednocześnie, 5 eventów przychodzi w < 1 sekundzie
Oczekiwane zachowanie: Pierwsze 3 wyświetlają się od razu, pozostałe 2 w kolejce; kolejka nie rośnie nieograniczenie — max 10 elementów w queue (starsze odrzucane cichą)

### EC-2: Bardzo długa nazwa story/gate
Scenariusz: Event zawiera `story_id: "STORY-12.15-very-long-title-overflow"` (hipotetycznie)
Oczekiwane zachowanie: Toast tekst ma `text-overflow: ellipsis`, max 1 linia widoczna, pełny tekst w `title` attribute (tooltip)

### EC-3: Toast kliknięty podczas animacji dismiss
Scenariusz: Użytkownik klika "✕" gdy toast już jest w trakcie auto-dismiss animacji
Oczekiwane zachowanie: Podwójne wywołanie `dismiss` ignorowane (guard na `data-dismissing` atrybut), brak błędów JS

---

## 🚫 Out of Scope tej Story
- SSE połączenie i eventy (to STORY-2.2)
- Konfiguracja reguł alertów (future epic)
- Mobile push notifications (out of scope EPIC-2)
- Persistowanie historii toastów (logowanie zdarzeń to osobna funkcja)

---

## ✔️ Definition of Done
- [ ] `js/toast.js` i `css/toast.css` istnieją i są załadowane przez `index.html`
- [ ] `#toast-container` jest w `index.html` jako fixed overlay
- [ ] Toast pojawia się w ≤ 200ms od odebrania CustomEvent
- [ ] Auto-dismiss po 5 sekundach działa
- [ ] Max 3 toasty jednocześnie na ekranie, reszta w kolejce
- [ ] Ręczne zamknięcie (klik toast lub "✕") działa
- [ ] "Clear All" czyści toasty i kolejkę
- [ ] 4 typy toastów mają różne kolory (success/error/info/purple)
- [ ] Animacje slide-in i fade-out działają
- [ ] `role="alert"` i `aria-live="polite"` w HTML
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
