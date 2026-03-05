---
story_id: STORY-12.6
title: "Remote access config — Tailscale (primary) + Cloudflare Tunnel (fallback) dla mobile"
epic: EPIC-12
module: sync
domain: infrastructure
status: draft
difficulty: simple
recommended_model: kimi-k2.5
ux_reference: none
api_reference: none
priority: could
estimated_effort: 3h
depends_on: [STORY-0.1]
blocks: []
tags: [tailscale, cloudflare, tunnel, remote-access, infrastructure, mobile, networking]
---

## 🎯 User Story

**Jako** Angelika (home_plus) lub Mariusz poza siecią domową
**Chcę** mieć dostęp do KiraBoard przez telefon (LTE/WiFi zewnętrzne)
**Żeby** widzieć aktualną listę zakupów i Pipeline gdy jestem poza domem

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Infrastruktura: Mac mini (host KiraBoard serwer) — ten sam komputer
- Serwer: `server.cjs` nasłuchuje na `localhost:3000` (lub skonfigurowany port)
- Remote access: Tailscale (primary) lub Cloudflare Tunnel (fallback)
- Dokumentacja: `README.md` + nowy plik `docs/remote-access.md`

### Powiązane pliki
- `README.md` — sekcja "Remote Access Setup"
- `docs/remote-access.md` — szczegółowa instrukcja
- `.env.local` — ewentualnie `TAILSCALE_URL` lub `CF_TUNNEL_URL` dla frontendu
- `server.cjs` — sprawdzenie czy binding jest na `0.0.0.0` nie tylko `localhost`

### Stan systemu przed tą story
- KiraBoard serwer działa lokalnie (STORY-0.1)
- Mac mini jest głównym hostem
- Supabase Realtime działa (STORY-12.3) — ale tylko gdy serwer jest dostępny zdalnie
- Tailscale może być już zainstalowany na Mac mini (STORY-0.1)

---

## ✅ Acceptance Criteria

### AC-1: Serwer nasłuchuje na 0.0.0.0 nie tylko localhost
GIVEN: `server.cjs` startuje
WHEN: Sprawdzę binding serwera
THEN: Serwer nasłuchuje na `0.0.0.0:[PORT]` (nie tylko `127.0.0.1`) — umożliwia dostęp przez Tailscale
AND: PORT jest czytany z `process.env.PORT` (default 3000)

### AC-2: Tailscale — dostęp przez magicDNS
GIVEN: Tailscale jest zainstalowany na Mac mini i skonfigurowany z kontem Mariusza
WHEN: Angelika/Mariusz otwiera `http://[mac-mini-name].[tailnet].ts.net:3000` na telefonie z Tailscale
THEN: KiraBoard ładuje się poprawnie (HTML, CSS, JS)
AND: Supabase Realtime działa (shopping list się aktualizuje)
AND: Czas ładowania strony < 5 sekund (przez Tailscale WireGuard)

### AC-3: Cloudflare Tunnel — fallback bez Tailscale na urządzeniu
GIVEN: Cloudflare Tunnel jest skonfigurowany na Mac mini (`cloudflared tunnel run kiraboard`)
WHEN: Użytkownik otwiera publiczny URL `https://kiraboard.[domain].com` w dowolnej przeglądarce bez Tailscale
THEN: KiraBoard ładuje się poprawnie przez HTTPS
AND: Tunnel jest zabezpieczony (Cloudflare Access lub basic auth — minimum)

### AC-4: Dokumentacja remote access
GIVEN: Ktoś (Mariusz lub przyszły developer) chce ustawić remote access
WHEN: Czyta `docs/remote-access.md`
THEN: Dokument zawiera:
  - Sekcja "Tailscale (primary)": kroki instalacji, konfiguracji, URL format, test
  - Sekcja "Cloudflare Tunnel (fallback)": kroki `cloudflared` install, tunnel create, run
  - Sekcja "Troubleshooting": typowe problemy (firewall, port binding, Tailscale auth expiry)
  - Sekcja "Mobile setup": jak zainstalować Tailscale na iOS/Android

### AC-5: README update
GIVEN: `README.md` istnieje w root projektu
WHEN: Developer czyta README
THEN: Sekcja "Remote Access" zawiera krótki opis (2-3 zdania) z linkiem do `docs/remote-access.md`
AND: Wzmianka o konieczności skonfigurowania remote access dla Supabase Realtime (Angelika use case)

---

## 📡 Szczegóły Infrastructure

### Opcja 1: Tailscale (Primary — zalecana)

```bash
# Instalacja na Mac mini
brew install tailscale
sudo tailscaled &
tailscale up --authkey=[KEY]

# Sprawdź IP/DNS
tailscale status
# Wynik: mac-mini [IP] / [mac-mini].[tailnet].ts.net

# Test dostępu z telefonu (Tailscale zainstalowany)
# http://mac-mini.tailnet-name.ts.net:3000

# Opcjonalnie: HTTPS przez Tailscale Funnel (publiczny bez VPN)
tailscale funnel 3000  # jeśli konto wspiera Funnel
```

**Plusy Tailscale:** Zero-config VPN, WireGuard speed, magicDNS, bez expose na internet

### Opcja 2: Cloudflare Tunnel (Fallback — bez VPN na kliencie)

```bash
# Instalacja cloudflared
brew install cloudflared

# Jednorazowo: zaloguj i stwórz tunnel
cloudflared tunnel login
cloudflared tunnel create kiraboard

# Konfiguracja ~/.cloudflared/config.yml:
# tunnel: [TUNNEL_ID]
# ingress:
#   - hostname: kiraboard.[twoja-domena].com
#     service: http://localhost:3000
#   - service: http_status:404

# Uruchomienie (jako LaunchAgent dla auto-start):
cloudflared tunnel run kiraboard
```

### Server.cjs binding check

```javascript
// Zmień jeśli bind jest tylko na localhost:
// app.listen(PORT, '0.0.0.0', () => { ... })
// Zamiast: app.listen(PORT, () => { ... })
```

### LaunchAgent dla auto-start (macOS)

Plik: `~/Library/LaunchAgents/com.kiraboard.server.plist`
- Program: `node /path/to/server.cjs`
- RunAtLoad: true
- WorkingDirectory: `/Users/mariuszkrawczyk/CoderMariusz/kira-dashboard`

Analogicznie dla cloudflared jeśli używany.

---

## ⚠️ Edge Cases

### EC-1: Tailscale auth wygasł (key expiry)
Scenariusz: Tailscale key wygasa po 30/90 dniach — połączenie przestaje działać
Oczekiwane zachowanie: Instrukcja w `docs/remote-access.md` opisuje jak re-auth (`tailscale up` ponownie)
Komunikat dla użytkownika: (w docs) "Jeśli połączenie nie działa — uruchom `tailscale up` na Mac mini"

### EC-2: Cloudflare Tunnel — domena wygasła lub tunnel nie startuje
Scenariusz: Certyfikat lub tunnel config się zmienił
Oczekiwane zachowanie: Fallback do Tailscale; `docs/remote-access.md` opisuje restart tunnel i diagnozę
Komunikat dla użytkownika: (w docs) Troubleshooting section z krokami

### EC-3: Serwer binduje tylko na localhost (stary config)
Scenariusz: `app.listen(3000)` bez podania hosta — domyślnie `127.0.0.1` na niektórych systemach
Oczekiwane zachowanie: Story wymaga zmiany na `app.listen(3000, '0.0.0.0')` lub `app.listen(3000, '::')`
Komunikat dla użytkownika: (w docs) "Jeśli Tailscale URL nie odpowiada — sprawdź binding serwera w server.cjs"

---

## 🚫 Out of Scope tej Story
- SSL/TLS termination lokalnie (Cloudflare robi to za siebie, Tailscale ma HTTPS przez Funnel)
- VPN dla całej rodziny (tylko Mariusz i Angelika jako primary users)
- Supabase Auth / per-user access control (patrz EPIC-12 out of scope)
- Monitoring uptime tunelu (osobne narzędzie — np. UptimeRobot)
- Docker/containerization serwera

---

## ✔️ Definition of Done
- [ ] `server.cjs` nasłuchuje na `0.0.0.0:[PORT]` (nie tylko localhost)
- [ ] Plik `docs/remote-access.md` istnieje z kompletną instrukcją Tailscale + Cloudflare Tunnel
- [ ] README zawiera sekcję "Remote Access" z linkiem do docs
- [ ] Tailscale setup zweryfikowany — Angelika/Mariusz może załadować KiraBoard na telefonie
- [ ] Cloudflare Tunnel instrukcja jest poprawna i przetestowana (lub opisana jako fallback z uwagą)
- [ ] LaunchAgent config (plist) dla auto-start serwera jest udokumentowany lub stworzony
- [ ] Troubleshooting section w docs (min 3 typowe problemy)
- [ ] Brak expose wrażliwych danych przez publiczny tunnel (Cloudflare Access lub basic auth)
- [ ] Story review przez PO
