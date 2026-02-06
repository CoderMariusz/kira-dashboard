"use client";

import { useState } from "react";

const modelColors = {
  opus: { bg: "rgb(212, 175, 55)", text: "#1a1a2e", glow: "rgba(212, 175, 55, 0.25)" },
  codex: { bg: "rgb(244, 114, 182)", text: "#1a0a18", glow: "rgba(244, 114, 182, 0.25)" },
  kimi: { bg: "rgb(0, 200, 150)", text: "#0a0a1a", glow: "rgba(0, 200, 150, 0.25)" },
  glm: { bg: "rgb(100, 149, 237)", text: "#0a0a1a", glow: "rgba(100, 149, 237, 0.25)" },
};
const modelNames = { opus: "Claude Opus 4.5", codex: "GPT-5.2 Codex", kimi: "Kimi K2.5", glm: "GLM 4.7" };
const modelEmoji = { opus: "🧠", codex: "⚡", kimi: "🌙", glm: "💎" };
const modelOrder = ["opus", "codex", "kimi", "glm"] as const;
type ModelKey = typeof modelOrder[number];

const benchmarks = [
  { name: "SWE-bench Verified", opus: 80.9, codex: 80.0, kimi: 76.8, glm: 73.8, cat: "coding" },
  { name: "SWE-bench Pro (4 lang)", opus: null, codex: 56.4, kimi: null, glm: null, cat: "coding" },
  { name: "Terminal-Bench 2.0", opus: 59.3, codex: 64.0, kimi: null, glm: 41.0, cat: "coding" },
  { name: "LiveCodeBench v6", opus: 64.0, codex: null, kimi: 85.0, glm: 84.9, cat: "coding" },
  { name: "Aider Polyglot", opus: 89.4, codex: null, kimi: null, glm: null, cat: "coding" },
  { name: "τ²-Bench (Tool Use)", opus: 90, codex: 98.7, kimi: 84.7, glm: 84.7, cat: "agent", note: "Codex: Telecom subset" },
  { name: "HLE w/ Tools", opus: 43.2, codex: 45.5, kimi: 50.2, glm: 42.8, cat: "agent" },
  { name: "BrowseComp", opus: 85, codex: null, kimi: 80, glm: 67, cat: "agent", note: "Opus: Plus variant" },
  { name: "AIME 2025 Math", opus: 93, codex: 100, kimi: 96.1, glm: 95.7, cat: "reasoning" },
  { name: "ARC-AGI-2", opus: 37.6, codex: 52.9, kimi: null, glm: null, cat: "reasoning" },
  { name: "GPQA Diamond", opus: 78, codex: 93.2, kimi: null, glm: 85.7, cat: "reasoning" },
  { name: "OSWorld (Comp Use)", opus: 66.3, codex: null, kimi: null, glm: null, cat: "agent" },
];

const pricing = {
  opus: { input: 5.0, output: 25.0 },
  codex: { input: 1.75, output: 14.0 },
  kimi: { input: 0.45, output: 2.5 },
  glm: { input: 0.6, output: 2.4 },
};

const phases = [
  { id: "plan", name: "Build Plan", icon: "📋", desc: "Architektura, dekompozycja, schema DB, API design",
    assign: "opus" as ModelKey, reason: "SWE-bench 80.9% + najlepsza architektura. Rozumie Supabase RLS, Next.js middleware, D365 patterns. Widzi trade-offy i normalizację schematu.",
    alt: "codex" as ModelKey, altReason: "Codex 80.0% SWE-bench + ARC-AGI-2 52.9% (abstract reasoning). Lepszy w matematycznym modelowaniu procesów MES. 400K context mieści cały projekt." },
  { id: "sprint", name: "Build Sprint", icon: "🏃", desc: "Implementacja feature'ów, komponenty, API routes",
    assign: "codex" as ModelKey, reason: "Real-world testy (Composio) — jedyny model który konsekwentnie dostarcza działający, zintegrowany kod. Terminal-Bench 64% = najlepsze DevOps. Context compaction = 24h+ sesje.",
    alt: "kimi" as ModelKey, altReason: "LiveCodeBench 85% = najszybszy interaktywny coding. Agent Swarm do równoległych tasków. 8-10x tańszy niż Codex." },
  { id: "test", name: "Build Test", icon: "🧪", desc: "Unit tests, integration tests, e2e, test fixtures",
    assign: "kimi" as ModelKey, reason: "HLE w/ Tools 50.2% (najwyższy!) = najlepszy reasoning o edge-case'ach. Agent Swarm generuje masowo testy równolegle. Najtańszy do dużego volume'u.",
    alt: "codex" as ModelKey, altReason: "τ²-Bench 98.7% Telecom = perfekcyjne tool chaining. Lepszy w złożonych scenariuszach integracyjnych." },
  { id: "implement", name: "Implementation", icon: "⚙️", desc: "Integracja modułów, wiring, env config, deployment",
    assign: "codex" as ModelKey, reason: "Composio testy: jedyny model który shipuje working integrated code bez showstopperów. Context compaction = nie gubi stanu przy złożonych migracjach. Terminal-Bench 64%.",
    alt: "opus" as ModelKey, altReason: "Opus lepszy w security-sensitive integration (Supabase RLS, auth flow). Najlepsza odporność na prompt injection." },
  { id: "refactor", name: "Refactor", icon: "🔄", desc: "Code cleanup, DRY, performance, patterns",
    assign: "opus" as ModelKey, reason: "76% mniej tokenów niż Sonnet przy tym samym wyniku = widzi big-picture i proponuje precyzyjne zmiany. Aider Polyglot 89.4% = najlepszy multi-language refactoring.",
    alt: "codex" as ModelKey, altReason: "Codex na duże refaktory/migracje — context compaction trzyma 24h sesje. SWE-bench Pro 56.4% na 4 językach." },
  { id: "review", name: "Code Review", icon: "🔍", desc: "Security audit, logic review, standards check",
    assign: "opus" as ModelKey, reason: "Industry-leading odporność na prompt injection = najlepsza zdolność do wychwytywania luk. Gray Swan potwierdza najniższy 'concerning behavior' score wśród frontier modeli.",
    alt: "codex" as ModelKey, altReason: "GPT-5.2-Codex odkrył 3 nowe CVE w React Server Components. Real-world security research capability." },
  { id: "qa", name: "QA", icon: "✅", desc: "Regression testing, UAT scenarios, bug triage",
    assign: "kimi" as ModelKey, reason: "Agent Swarm — 100 sub-agentów równolegle testuje scenariusze. 4.5x szybszy czas, 80% redukcja runtime. Najlepszy koszt/jakość dla powtarzalnych tasków.",
    alt: "glm" as ModelKey, altReason: "GLM do testów UI/wizualnych — lepsza estetyka, τ²-Bench 84.7% SOTA open-source." },
  { id: "doc", name: "Documentation", icon: "📝", desc: "README, API docs, user guides, JSDoc/TSDoc",
    assign: "glm" as ModelKey, reason: "128k output limit = pełne moduły dokumentacji w jednym passie. Najtańszy output ($2.40/M). Preserved Thinking = kontekst nie ginie między turami.",
    alt: "kimi" as ModelKey, altReason: "Kimi do technicznej API reference — lepszy reasoning o edge cases (HLE 50.2%)." },
];

const catColors: Record<string, string> = { coding: "#4ade80", agent: "#f472b6", reasoning: "#a78bfa" };
const catLabels: Record<string, string> = { coding: "Coding", agent: "Agent/Tool", reasoning: "Reasoning" };

export default function ModelBattlefield() {
  const [tab, setTab] = useState("verdict");
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  const tabs = [
    { id: "verdict", label: "Werdykt", icon: "⚖️" },
    { id: "pipeline", label: "Pipeline", icon: "🔧" },
    { id: "bench", label: "Benchmarki", icon: "📊" },
    { id: "cost", label: "Koszt & ROI", icon: "💰" },
    { id: "stack", label: "Tech Stack", icon: "🏗️" },
  ];

  const Card = ({ model, children }: { model: ModelKey; children: React.ReactNode }) => (
    <div style={{
      background: `linear-gradient(135deg, ${modelColors[model].glow}, transparent 70%)`,
      borderRadius: 14, padding: 24,
      border: `1px solid ${modelColors[model].bg}25`,
      marginBottom: 16,
    }}>
      <h3 style={{ color: modelColors[model].bg, fontSize: 17, marginBottom: 10, fontFamily: "'Georgia', serif", letterSpacing: 0.5 }}>
        {modelEmoji[model]} {modelNames[model]}
      </h3>
      <div style={{ color: "#c0c0d4", lineHeight: 1.75, fontSize: 13.5 }}>{children}</div>
    </div>
  );

  const Badge = ({ model, size = "sm" }: { model: ModelKey; size?: "sm" | "md" }) => (
    <span style={{
      background: modelColors[model].bg, color: modelColors[model].text,
      padding: size === "sm" ? "2px 9px" : "4px 14px",
      borderRadius: 20, fontSize: size === "sm" ? 11 : 12,
      fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap",
    }}>
      {modelEmoji[model]} {modelNames[model]}
    </span>
  );

  const AltBadge = ({ model }: { model: ModelKey }) => (
    <span style={{
      background: "rgba(255,255,255,0.06)", color: modelColors[model].bg,
      padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      border: `1px solid ${modelColors[model].bg}35`, whiteSpace: "nowrap",
    }}>
      alt: {modelNames[model]}
    </span>
  );

  const renderVerdict = () => (
    <div>
      <Card model="opus">
        <strong style={{ color: "#fff" }}>SWE-bench 80.9% · Aider Polyglot 89.4% · OSWorld 66.3%</strong><br />
        Jedyny model powyżej 80% na SWE-bench. Dla MonoPilot z Supabase RLS + Next.js + D365 — to architekt i strażnik.
        Najlepsza architektura, rozumie cross-layer dependencies, proponuje normalizację schematu. Industry-leading security.
        Najefektywniejszy w tokenach — robi więcej za mniej. <strong style={{ color: modelColors.opus.bg }}>Wada: $5/$25 per M — najdroższy. Użyj chirurgicznie.</strong>
      </Card>
      <Card model="codex">
        <strong style={{ color: "#fff" }}>SWE-bench 80.0% · SWE-bench Pro 56.4% · Terminal-Bench 64% · AIME 100% · ARC-AGI-2 52.9%</strong><br />
        Real-world testy (Composio): jedyny model który <em>konsekwentnie</em> dostarcza działający, zintegrowany kod bez showstopperów.
        Context compaction = sesje 24h+. 400K context. Matematyczny geniusz (AIME 100%, ARC-AGI 52.9%).
        Odkrył 3 nowe CVE w React. <strong style={{ color: modelColors.codex.bg }}>Wada: $1.75/$14 per M — tańszy niż Opus, ale 3-8x droższy niż open-source. Brak self-host.</strong>
      </Card>
      <Card model="kimi">
        <strong style={{ color: "#fff" }}>LiveCodeBench 85% · HLE w/ Tools 50.2% · Agent Swarm (100 sub-agentów)</strong><br />
        Dominuje w interaktywnym kodowaniu i agentic reasoning. Agent Swarm = równoległe taski z 4.5x szybszym czasem.
        1T parametrów MoE. Frontend z wizji/screenshotów. Idealny do Night Crew pipeline.
        <strong style={{ color: modelColors.kimi.bg }}>Wada: integracja cross-layer bywa dziurawa (~30min fixów). Output 34 tok/s vs 91 Claude. Open-source ale MoE = trudny self-host.</strong>
      </Card>
      <Card model="glm">
        <strong style={{ color: "#fff" }}>SWE-bench 73.8% · LiveCodeBench 84.9% · τ²-Bench 84.7% · 128k output</strong><br />
        Najlepszy "vibe coding" — czystszy HTML/CSS, lepsze layouty, estetyka. Preserved Thinking = kontekst nie ginie.
        128k output = cały moduł w jednym passie. 1/7 ceny Opus. Solidny all-rounder.
        <strong style={{ color: modelColors.glm.bg }}>Wada: Terminal-Bench 41% (Codex: 64%). Słabszy w złożonych agentic workflows. SWE-bench najniższy z czwórki.</strong>
      </Card>
      <div style={{
        background: "linear-gradient(135deg, rgba(167,139,250,0.1), rgba(74,222,128,0.05))",
        borderRadius: 14, padding: 22, border: "1px solid rgba(167,139,250,0.2)", marginTop: 8,
      }}>
        <h3 style={{ color: "#d4a0ff", fontSize: 15, marginBottom: 10, fontFamily: "'Georgia', serif" }}>
          🎯 REKOMENDACJA DLA MONOPILOT MES
        </h3>
        <p style={{ color: "#c0c0d4", lineHeight: 1.8, fontSize: 13.5 }}>
          4-tier hybrid routing: <strong style={{ color: modelColors.opus.bg }}>Opus</strong> na architekturę i review (20%),{" "}
          <strong style={{ color: modelColors.codex.bg }}>Codex</strong> na implementację i integrację (25%),{" "}
          <strong style={{ color: modelColors.kimi.bg }}>Kimi</strong> na sprint, testy, QA (35%),{" "}
          <strong style={{ color: modelColors.glm.bg }}>GLM</strong> na UI i dokumentację (20%).
          Blended cost: ~$2.50/M vs $15/M Opus-only = <strong style={{ color: "#4ade80" }}>~83% oszczędności</strong>.
        </p>
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: "#667", fontSize: 12, marginBottom: 4, fontStyle: "italic" }}>Kliknij fazę → szczegóły przypisania</p>
      {phases.map((p) => {
        const open = expandedPhase === p.id;
        const c = modelColors[p.assign];
        return (
          <div key={p.id}>
            <div onClick={() => setExpandedPhase(open ? null : p.id)} style={{
              background: open ? `linear-gradient(135deg, ${c.glow}, transparent)` : "rgba(255,255,255,0.025)",
              borderRadius: 12, padding: "14px 18px", cursor: "pointer",
              border: `1px solid ${open ? c.bg + "50" : "rgba(255,255,255,0.05)"}`,
              transition: "all 0.25s", display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ fontSize: 22, minWidth: 32 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "#eee", fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                  <Badge model={p.assign} />
                  {p.alt && <AltBadge model={p.alt} />}
                </div>
                <span style={{ color: "#667", fontSize: 11.5, marginTop: 3, display: "block" }}>{p.desc}</span>
              </div>
              <span style={{ color: "#555", fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>▼</span>
            </div>
            {open && (
              <div style={{
                padding: "14px 22px 14px 66px", background: "rgba(0,0,0,0.2)",
                borderRadius: "0 0 12px 12px", marginTop: -2,
                borderLeft: `2px solid ${c.bg}`, fontSize: 13, lineHeight: 1.7, color: "#b0b0c8",
              }}>
                <div style={{ marginBottom: p.alt ? 10 : 0 }}>
                  <strong style={{ color: c.bg }}>Dlaczego {modelNames[p.assign]}:</strong> {p.reason}
                </div>
                {p.alt && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10 }}>
                    <strong style={{ color: modelColors[p.alt].bg }}>Alternatywa — {modelNames[p.alt]}:</strong> {p.altReason}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 14, padding: 18, background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ color: "#889", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Podział modeli w pipeline</div>
        <div style={{ display: "flex", gap: 3, height: 28, borderRadius: 6, overflow: "hidden" }}>
          {[
            { m: "opus" as ModelKey, pct: 20 }, { m: "codex" as ModelKey, pct: 25 }, { m: "kimi" as ModelKey, pct: 35 }, { m: "glm" as ModelKey, pct: 20 },
          ].map(({ m, pct }) => (
            <div key={m} style={{
              width: `${pct}%`, background: modelColors[m].bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: modelColors[m].text,
            }}>{pct}%</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          {modelOrder.map(m => <span key={m} style={{ color: modelColors[m].bg, fontSize: 11.5 }}>{modelEmoji[m]} {modelNames[m]}</span>)}
        </div>
      </div>
    </div>
  );

  const filteredBench = catFilter === "all" ? benchmarks : benchmarks.filter(b => b.cat === catFilter);

  const renderBench = () => (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "coding", "agent", "reasoning"].map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 11.5, fontWeight: catFilter === c ? 700 : 400,
            background: catFilter === c ? (c === "all" ? "rgba(255,255,255,0.12)" : catColors[c] + "30") : "rgba(255,255,255,0.04)",
            color: catFilter === c ? (c === "all" ? "#fff" : catColors[c]) : "#667",
            transition: "all 0.2s",
          }}>
            {c === "all" ? "Wszystkie" : catLabels[c]}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 3px", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", color: "#667", fontWeight: 500, fontSize: 11 }}>Benchmark</th>
              {modelOrder.map(m => (
                <th key={m} style={{ textAlign: "center", padding: "6px 8px", color: modelColors[m].bg, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                  {modelEmoji[m]}<br />{modelNames[m].split(" ").pop()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBench.map((b, i) => {
              const vals = modelOrder.map(m => typeof b[m] === "number" ? b[m] : null);
              const nums = vals.filter((v): v is number => v !== null);
              const maxV = nums.length > 0 ? Math.max(...nums) : null;
              return (
                <tr key={b.name}
                  onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                  style={{ background: hoveredRow === i ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)", transition: "background 0.15s" }}
                >
                  <td style={{ padding: "9px 10px", color: "#bbb", borderRadius: "6px 0 0 6px", fontWeight: 500 }}>
                    <span style={{ color: catColors[b.cat], fontSize: 8, marginRight: 6 }}>●</span>{b.name}
                    {b.note && <span style={{ color: "#556", fontSize: 10, display: "block" }}>{b.note}</span>}
                  </td>
                  {modelOrder.map((m, j) => {
                    const v = b[m]; const isNum = typeof v === "number";
                    const isMax = isNum && maxV !== null && v === maxV;
                    return (
                      <td key={m} style={{
                        textAlign: "center", padding: "9px 8px",
                        color: v == null ? "#333" : isMax ? modelColors[m].bg : "#888",
                        fontWeight: isMax ? 700 : 400, fontSize: isMax ? 13.5 : 12.5,
                        borderRadius: j === modelOrder.length - 1 ? "0 6px 6px 0" : 0,
                      }}>
                        {v == null ? "—" : isNum ? `${v}%` : v}{isMax && " 🏆"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,0.025)", borderRadius: 10 }}>
        <div style={{ color: "#889", fontSize: 11, marginBottom: 8, fontWeight: 600 }}>🏆 Kto wygrywa w jakiej kategorii:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Coding (SWE-bench, refactoring)", winner: "opus" as ModelKey, note: "80.9%, ale Codex tuż za (80.0%)" },
            { label: "Terminal/DevOps", winner: "codex" as ModelKey, note: "64.0% — najlepszy w real terminal env" },
            { label: "Interactive coding", winner: "kimi" as ModelKey, note: "LiveCodeBench 85% — GLM blisko (84.9%)" },
            { label: "Abstract reasoning", winner: "codex" as ModelKey, note: "ARC-AGI-2 52.9% — 40% lepiej niż Opus" },
            { label: "Math", winner: "codex" as ModelKey, note: "AIME 100% bez narzędzi — perfekcja" },
            { label: "Agentic (tool use)", winner: "kimi" as ModelKey, note: "HLE w/ Tools 50.2% — najwyższy" },
            { label: "UI/Vibe coding", winner: "glm" as ModelKey, note: "Najczystszy HTML/CSS, najlepsza estetyka" },
            { label: "Security/Safety", winner: "opus" as ModelKey, note: "Najniższy concerning behavior + prompt injection resistance" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#999", fontSize: 12, minWidth: 160 }}>{r.label}</span>
              <Badge model={r.winner} />
              <span style={{ color: "#556", fontSize: 11 }}>{r.note}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={{ color: "#445", fontSize: 10, marginTop: 12, fontStyle: "italic" }}>
        Źródła: Anthropic System Card (Nov 2025), OpenAI GPT-5.2 announcement (Dec 2025), GPT-5.2-Codex blog (Jan 2026),
        Kimi K2.5 Tech Report (Jan 2026), GLM-4.7 HuggingFace (Dec 2025), Composio real-world tests, Artificial Analysis
      </p>
    </div>
  );

  const renderCost = () => {
    const scenarios = [
      { name: "100% Opus (baseline)", mix: { opus: 100, codex: 0, kimi: 0, glm: 0 } },
      { name: "100% Codex", mix: { opus: 0, codex: 100, kimi: 0, glm: 0 } },
      { name: "Hybrid: 20% Opus / 25% Codex / 35% Kimi / 20% GLM", mix: { opus: 20, codex: 25, kimi: 35, glm: 20 } },
      { name: "Budget: 10% Opus / 15% Codex / 45% Kimi / 30% GLM", mix: { opus: 10, codex: 15, kimi: 45, glm: 30 } },
    ];
    const blended = (m: ModelKey) => (pricing[m].input + pricing[m].output) / 2;
    const scenarioCost = (s: typeof scenarios[0]) => modelOrder.reduce((a, m) => a + (s.mix[m] / 100) * blended(m), 0);
    const baseCost = blended("opus");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 10 }}>
          {modelOrder.map(m => (
            <div key={m} style={{
              background: "rgba(255,255,255,0.025)", borderRadius: 12, padding: 18,
              border: `1px solid ${modelColors[m].bg}20`, textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{modelEmoji[m]}</div>
              <div style={{ color: modelColors[m].bg, fontWeight: 600, fontSize: 12.5, marginBottom: 10 }}>{modelNames[m]}</div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>${pricing[m].input}<span style={{ color: "#556", fontSize: 10 }}>/M in</span></div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>${pricing[m].output}<span style={{ color: "#556", fontSize: 10 }}>/M out</span></div>
              <div style={{ color: "#778", fontSize: 10, marginTop: 6 }}>Blended: ${blended(m).toFixed(2)}/M</div>
              <div style={{ color: "#556", fontSize: 10 }}>
                {m === "opus" ? "Closed · API only" : m === "codex" ? "Closed · API + Codex app" : m === "kimi" ? "Open-weight · Modified MIT" : "Open-weight · HuggingFace"}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ color: "#889", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Scenariusze kosztów (1M tokenów, 50/50 in/out)
          </div>
          {scenarios.map(s => {
            const cost = scenarioCost(s);
            const sav = ((1 - cost / baseCost) * 100).toFixed(0);
            return (
              <div key={s.name} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "11px 14px",
                background: "rgba(255,255,255,0.015)", borderRadius: 8, marginBottom: 6, flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: "#bbb", fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ display: "flex", gap: 2, marginTop: 5, height: 5, borderRadius: 3, overflow: "hidden" }}>
                    {modelOrder.map(m => s.mix[m] > 0 ? <div key={m} style={{ width: `${s.mix[m]}%`, background: modelColors[m].bg }} /> : null)}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 110 }}>
                  <span style={{ color: "#fff", fontSize: 17, fontWeight: 700 }}>${cost.toFixed(2)}</span>
                  <span style={{ color: "#556", fontSize: 10 }}>/M</span>
                  {Number(sav) > 0 && <div style={{ color: "#4ade80", fontSize: 11.5, fontWeight: 600 }}>↓ {sav}% taniej</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 18, background: "linear-gradient(135deg, rgba(74,222,128,0.07), transparent)", borderRadius: 12, border: "1px solid rgba(74,222,128,0.12)" }}>
          <h4 style={{ color: "#4ade80", fontSize: 13.5, marginBottom: 8 }}>💡 MonoPilot Night Crew — miesięczna kalkulacja (50M tok/mies)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, color: "#a0b0c0", fontSize: 12.5 }}>
            <div>Opus-only: <strong style={{ color: "#f87171" }}>~$750/mies</strong></div>
            <div>Codex-only: <strong style={{ color: "#fbbf24" }}>~$394/mies</strong></div>
            <div>Hybrid 4-tier: <strong style={{ color: "#4ade80" }}>~$155/mies</strong></div>
            <div>Budget: <strong style={{ color: "#4ade80" }}>~$95/mies</strong></div>
          </div>
          <p style={{ color: "#8899aa", fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
            Hybrid 4-tier vs Opus-only = <strong style={{ color: "#4ade80" }}>$595/mies oszczędności = $7,140/rok</strong>.
            Pokrywa Mac M4 + margines. Cached input (Codex -90%) i batch API jeszcze bardziej obniżają koszt.
          </p>
        </div>
      </div>
    );
  };

  const renderStack = () => {
    const sections = [
      { title: "🖥️ BACKEND — Supabase + Next.js API + D365", primary: "codex" as ModelKey, secondary: "opus" as ModelKey,
        items: [
          ["Supabase RLS, migrations, edge functions", "opus", "security-first reasoning, rozumie implikacje"],
          ["Next.js API routes, middleware, server actions", "codex", "Terminal-Bench 64%, shipuje working code"],
          ["D365 Business Central integration", "opus", "złożone enterprise patterns, cross-system deps"],
          ["Database schema, indexing, normalizacja", "opus", "SWE-bench 80.9%, widzi big-picture"],
          ["Background jobs, cron, webhooks", "kimi", "tani, szybki, Agent Swarm dla parallel processing"],
          ["REST/GraphQL API endpoints", "codex", "context compaction, nie gubi stanu przy dużych API"],
        ]},
      { title: "🎨 FRONTEND — React/TypeScript + Tailwind", primary: "kimi" as ModelKey, secondary: "glm" as ModelKey,
        items: [
          ["Komponenty React/TSX", "kimi", "LiveCodeBench 85%, frontend z wizji/screenshotów"],
          ["UI design, layouty, animacje, CSS", "glm", "vibe coding, czystszy HTML/CSS, estetyka"],
          ["Dashboardy MES, charty produkcji", "kimi", "interaktywny coding, szybsza iteracja"],
          ["Responsive design, accessibility", "glm", "lepsze DOM understanding, layout precision"],
          ["Complex state management, hooks", "opus", "jeśli złożona logika biznesowa MES"],
          ["Design-to-code (mockup → React)", "kimi", "native multimodal, koduje z obrazów"],
        ]},
      { title: "🔗 INTEGRACJA & DevOps", primary: "codex" as ModelKey, secondary: "opus" as ModelKey,
        items: [
          ["Multi-module wiring, env config", "codex", "context compaction, 24h+ sesje bez utraty stanu"],
          ["CI/CD, GitHub Actions", "kimi", "szablonowy kod, najtańszy"],
          ["Error handling, logging, monitoring", "opus", "rozumie failure modes, Aider Polyglot 89.4%"],
          ["Auth flow, JWT, session mgmt", "opus", "industry-leading security reasoning"],
          ["Testing infrastructure, fixtures", "kimi", "Agent Swarm, parallel test suites, HLE 50.2%"],
          ["Code migration, large refactors", "codex", "SWE-bench Pro 56.4% na 4 językach, compaction"],
        ]},
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {sections.map(s => (
          <div key={s.title} style={{
            background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 18,
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <h4 style={{ color: "#ddd", fontSize: 14.5, marginBottom: 12 }}>{s.title}</h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{
                background: modelColors[s.primary].bg, color: modelColors[s.primary].text,
                padding: "3px 11px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
              }}>Primary: {modelNames[s.primary]}</span>
              <span style={{
                border: `1px solid ${modelColors[s.secondary].bg}`, color: modelColors[s.secondary].bg,
                padding: "3px 11px", borderRadius: 20, fontSize: 10.5, fontWeight: 600,
              }}>Secondary: {modelNames[s.secondary]}</span>
            </div>
            {s.items.map(([task, model, why], i) => (
              <div key={i} style={{
                padding: "7px 0", borderBottom: i < s.items.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap",
              }}>
                <span style={{ color: modelColors[model as ModelKey].bg, fontSize: 7, marginTop: 6 }}>●</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{ color: "#bbb", fontSize: 12.5 }}>{task}</span>
                  <span style={{ color: "#556", fontSize: 11 }}> → {modelNames[model as ModelKey]} — {why}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: "#0b0b16", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#eee", padding: "20px 14px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: 3, color: "#fff", fontFamily: "'Georgia', serif", marginBottom: 6 }}>
            MODEL BATTLEFIELD
          </h1>
          <p style={{ color: "#556", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Opus 4.5 · GPT-5.2 Codex · Kimi K2.5 · GLM 4.7 — MonoPilot MES Pipeline
          </p>
        </div>
        <div style={{ display: "flex", gap: 3, marginBottom: 20, background: "rgba(255,255,255,0.025)", borderRadius: 10, padding: 3, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, minWidth: 90, padding: "9px 10px", border: "none", borderRadius: 8,
              cursor: "pointer", fontSize: 11.5, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "#fff" : "#556", whiteSpace: "nowrap",
              background: tab === t.id ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(244,114,182,0.12), rgba(0,200,150,0.08))" : "transparent",
              transition: "all 0.25s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {tab === "verdict" && renderVerdict()}
        {tab === "pipeline" && renderPipeline()}
        {tab === "bench" && renderBench()}
        {tab === "cost" && renderCost()}
        {tab === "stack" && renderStack()}
        <div style={{ marginTop: 28, padding: 14, background: "rgba(255,255,255,0.015)", borderRadius: 8, textAlign: "center" }}>
          <p style={{ color: "#334", fontSize: 10 }}>
            Anthropic (Nov 2025) · OpenAI GPT-5.2 + Codex (Dec 2025 / Jan 2026) · Kimi K2.5 (Jan 2026) · GLM-4.7 (Dec 2025) · Artificial Analysis · Composio · SWE-bench
          </p>
        </div>
      </div>
    </div>
  );
}
