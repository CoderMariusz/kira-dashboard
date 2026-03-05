# KiraBoard

A self-hosted, drag-and-drop dashboard builder with live system monitoring, dark theme, and 50+ widgets. No cloud dependencies.

![KiraBoard Logo](site-assets/kiraboard-logo-hero.png)

## Features

- 🎨 **Drag & Drop Builder** — Visual editor with snap grid, resize handles, and widget sidebar
- 📡 **Live System Monitoring** — CPU, memory, disk, network, Docker stats via Server-Sent Events
- 🔒 **Fully Self-Hosted** — Single Node.js server, no cloud accounts or telemetry
- ⚡ **Zero Build Step** — Vanilla JS and CSS, no React or Webpack
- 🌙 **Dark Theme Native** — Built dark with CSS custom properties
- 📦 **50+ Widgets** — System stats, weather, stocks, crypto, calendars, todos, cameras, Docker, AI usage, and more
- 📑 **Custom Pages** — Built-in pages system for notes, calendars, boards
- 🔐 **PIN & Public Mode** — Lock editing with PIN, store API keys server-side

## Quick Start

### Option A: npm
```bash
npm install kira-board
cd node_modules/kira-board
node server.cjs
```

### Option B: Clone
```bash
git clone https://github.com/CoderMariusz/kira-dashboard.git
cd kira-dashboard
npm install
node server.cjs
```

Then open http://localhost:8080 → press Ctrl+E → drag widgets → click 💾 Save.

## Documentation

- [Changelog](changelog.html)
- [GitHub Repository](https://github.com/CoderMariusz/kira-dashboard)
- [npm Package](https://www.npmjs.com/package/kira-board)

## License

BSL-1.1 License · Made with 🦊 by [kira](https://github.com/CoderMariusz)
