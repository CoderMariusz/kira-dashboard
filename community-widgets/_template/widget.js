/**
 * Community Widget Template — KiraBoard
 *
 * Copy this file into your widget folder and modify it.
 * Your widget object must follow the exact same format as widgets in js/widgets.js.
 *
 * This example creates a "Custom Counter" widget that counts up every second.
 */

const myWidget = {
  // ── Required metadata ──────────────────────────────────────────

  // Display name shown in the widget picker sidebar
  name: 'Custom Counter',

  // Emoji icon shown next to the name
  icon: '🔢',

  // Category determines default sizing behavior:
  //   'small' — KPI cards (compact, single-value display)
  //   'large' — Lists, logs, multi-row content
  //   'bar'   — Full-width horizontal bars
  category: 'small',

  // Short description shown in the widget picker
  description: 'A simple counter that increments every second. Use as a starting point for your own widget.',

  // Default dimensions in pixels (user can resize)
  defaultWidth: 200,
  defaultHeight: 120,

  // Set to true if your widget requires an API key.
  // When true, the property panel will show a key input field.
  hasApiKey: false,
  // apiKeyName: 'MY_SERVICE_API',  // Uncomment if hasApiKey is true

  // ── Properties ─────────────────────────────────────────────────
  // These become editable fields in the property panel (right sidebar).
  // Users can change these values per widget instance.
  // Use descriptive defaults. Types are inferred from the default value:
  //   string → text input
  //   number → number input
  //   boolean → checkbox (not commonly used)
  properties: {
    title: 'Custom Counter',         // Widget title
    startValue: 0,                   // Starting count
    refreshInterval: 1,              // Seconds between updates
    // apiKey: 'YOUR_API_KEY_HERE',  // Uncomment if your widget needs an API key
  },

  // ── Preview ────────────────────────────────────────────────────
  // Static HTML snippet shown in the widget picker sidebar.
  // Keep it small; this is just a visual hint, not a live widget.
  preview: `<div style="text-align:center;padding:8px;">
    <div style="font-size:24px;">42</div>
    <div style="font-size:11px;color:#8b949e;">Custom Counter</div>
  </div>`,

  // ── generateHtml(props) ────────────────────────────────────────
  // Returns an HTML string that is injected into the widget container.
  //
  // IMPORTANT:
  //   • Use props.id as a prefix for ALL element IDs.
  //     Multiple instances of the same widget can exist on the canvas,
  //     so IDs must be unique. Pattern: id="${props.id}-myElement"
  //   • Use CSS classes from the theme (dash-card, dash-card-head, etc.)
  //   • Use CSS variables for colors: var(--bg-primary), var(--text-primary),
  //     var(--accent-blue), var(--accent-green), var(--border-color), etc.
  generateHtml: (props) => `
    <div class="dash-card" id="widget-${props.id}" style="height:100%;">
      <div class="dash-card-head">
        <span class="dash-card-title">🔢 ${props.title || 'Custom Counter'}</span>
      </div>
      <div class="dash-card-body" style="display:flex;align-items:center;justify-content:center;">
        <div>
          <div class="kpi-value blue" id="${props.id}-value">${props.startValue || 0}</div>
          <div class="kpi-label" id="${props.id}-label">counting...</div>
        </div>
      </div>
    </div>`,

  // ── generateJs(props) ──────────────────────────────────────────
  // Returns a JavaScript string that executes in the browser (via new Function).
  //
  // This is where you:
  //   • Fetch data from APIs
  //   • Update DOM elements created by generateHtml
  //   • Set up refresh intervals
  //
  // IMPORTANT:
  //   • The JS runs in global scope — use unique function names.
  //     Pattern: functionName_${props.id.replace(/-/g, '_')}
  //   • Reference elements by the IDs you created in generateHtml.
  //   • Handle errors gracefully — show "—" or a friendly message, never crash.
  //   • For API keys: reference them via props (e.g., props.apiKey).
  //     NEVER hardcode real keys in your widget file.
  generateJs: (props) => `
    // Counter Widget: ${props.id}
    (function() {
      let count = ${props.startValue || 0};
      const valEl = document.getElementById('${props.id}-value');
      const labelEl = document.getElementById('${props.id}-label');

      function update_${props.id.replace(/-/g, '_')}() {
        count++;
        if (valEl) valEl.textContent = count;
        if (labelEl) labelEl.textContent = 'counting...';
      }

      // Initial display is already set by generateHtml.
      // Set up the refresh interval (in seconds → milliseconds).
      setInterval(update_${props.id.replace(/-/g, '_')}, ${(props.refreshInterval || 1) * 1000});
    })();
  `
};

// ── How this gets used ───────────────────────────────────────────
// When your widget is accepted, a maintainer will add it to the WIDGETS
// object in js/widgets.js with a unique key, like:
//
//   'community-custom-counter': { ...myWidget }
//
// You don't need to do this yourself — just provide the widget object.

export default myWidget;
