"use client";

/**
 * WorkflowSection. A landing section with step tabs and an always-on agent dock.
 * Neutral palette only: a full-bleed backdrop with a notched corner, a dot texture,
 * a per-tab radial glow, a floating tab rail at the lower left, and a glass step card
 * paired with the agent dock. Plain React, no animation library, inline SVG icons.
 */

import * as React from "react";
import { Icon, type IconName } from "../icons";

type TabIcon = (p: { className?: string; style?: React.CSSProperties }) => React.ReactElement;
const makeIcon = (name: IconName): TabIcon => (props) => (
  <Icon name={name} strokeWidth={2.25} className={props.className} style={{ width: "100%", height: "100%", ...props.style }} />
);
const IconSearch = makeIcon("search");
const IconChartLine = makeIcon("chart-line");
const IconList = makeIcon("list");
const IconCheck = makeIcon("check");
const IconChartBar = makeIcon("chart-bar");
const IconArrowUR = makeIcon("arrow-up-right");

export type WorkflowTab = {
  key: string; label: string; heading: string; badge: string; goal: string;
  icon: TabIcon;
  body: React.ReactNode;
  /** Backdrop radial gradient for this tab (neutral). */ glow: string;
};
export interface WorkflowSectionProps {
  eyebrow?: string; heading?: string; body?: string;
  tabs?: WorkflowTab[];
  agent?: { title: string; online: string; msgs: { role: "agent" | "user"; text: string }[]; input: string };
}

/* Neutral particle orb */
function ParticleOrb({ size = 120 }: { size?: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const c = ref.current; if (!c) return; const ctx0 = c.getContext("2d"); if (!ctx0) return; const ctx: CanvasRenderingContext2D = ctx0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75); c.width = size * dpr; c.height = size * dpr;
    const N = 84, cx = size / 2, cy = size / 2, R = size * 0.36;
    const pts = Array.from({ length: N }, (_, i) => ({ phi: Math.acos(1 - (2 * (i + 0.5)) / N), th: Math.PI * (1 + Math.sqrt(5)) * i, r: 0.85 + Math.random() * 0.3 }));
    let raf = 0, t = 0, run = true;
    const onVis = () => { run = !document.hidden; if (run) raf = requestAnimationFrame(draw); };
    document.addEventListener("visibilitychange", onVis);
    function draw() {
      if (!run) return; t += 0.004; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      for (const p of pts) {
        const a = p.th + t, x = cx + R * p.r * Math.sin(p.phi) * Math.cos(a), y = cy + R * p.r * Math.cos(p.phi), z = Math.sin(p.phi) * Math.sin(a);
        ctx.beginPath(); ctx.arc(x, y, 1 + (z + 1) * 0.6, 0, 7); ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * (z + 1) / 2})`; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { run = false; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
  }, [size]);
  return <canvas ref={ref} style={{ width: size, height: size, display: "block" }} aria-hidden />;
}

/* Tab bodies (neutral) */
const wrapBody: React.CSSProperties = { width: "100%" };
const Chip = ({ n }: { n: string }) => <span style={{ fontSize: 10, fontWeight: 700, color: "#0a0a0a", background: "#ededed", borderRadius: 6, padding: "2px 6px" }}>{n}</span>;
const ListBody = () => (
  <div style={{ ...wrapBody, display: "flex", flexDirection: "column", gap: 7 }}>
    {[["Candidate A", "@handle"], ["Candidate B", "@handle"], ["Candidate C", "@handle"]].map(([a, b], i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>
        <Chip n={String.fromCharCode(65 + i)} /><span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>{a}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.45)" }}>{b}</span>
      </div>
    ))}
  </div>
);
const BarsBody = () => (
  <div style={{ ...wrapBody, display: "flex", flexDirection: "column", gap: 9 }}>
    {[["Channel A", 82], ["Channel B", 64], ["Channel C", 41]].map(([l, v]) => (
      <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 54, fontSize: 10.5, color: "rgba(255,255,255,.55)" }}>{l}</span>
        <div style={{ flex: 1, height: 13, borderRadius: 3, background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${v}%`, background: `rgba(255,255,255,${0.35 + (v as number) / 400})`, borderRadius: 3 }} />
        </div>
        <span style={{ width: 26, textAlign: "right", fontSize: 11, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{v}</span>
      </div>
    ))}
  </div>
);
const OrbBody = () => <div style={{ ...wrapBody, display: "flex", justifyContent: "center", padding: "4px 0" }}><ParticleOrb size={128} /></div>;
const CheckBody = () => (
  <div style={{ ...wrapBody, display: "flex", flexDirection: "column", gap: 9 }}>
    {["Tone consistent", "Length in spec", "CTA included"].map((l, i) => (
      <div key={l} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "rgba(255,255,255,.85)" }}>
        <span style={{ color: i < 2 ? "#fff" : "rgba(255,255,255,.4)", width: 15, height: 15, display: "inline-flex" }}>
          {i < 2 ? <IconCheck /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}><circle cx="12" cy="12" r="8" /></svg>}
        </span>{l}
      </div>
    ))}
  </div>
);
const KpiBody = () => (
  <div style={{ ...wrapBody, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
    {[["Reach", "128K"], ["Conversion", "3.2%"], ["Saves", "9.1K"], ["Shares", "1.4K"]].map(([k, v]) => (
      <div key={k} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 11, padding: "10px 12px" }}>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>{k}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      </div>
    ))}
  </div>
);

const DEFAULT_TABS: WorkflowTab[] = [
  { key: "discover", label: "Discovery", heading: "Find candidates", badge: "Scanning", goal: "Collect candidates that match your criteria.", icon: IconSearch, body: <ListBody />, glow: "radial-gradient(75% 80% at 18% 60%, rgba(255,255,255,.07) 0%, rgba(255,255,255,.012) 45%, #0a0a0a 100%)" },
  { key: "analysis", label: "Analysis", heading: "Analyze", badge: "Analyzing", goal: "Break down the signals behind what works.", icon: IconChartLine, body: <OrbBody />, glow: "radial-gradient(70% 80% at 55% 45%, rgba(255,255,255,.08) 0%, rgba(255,255,255,.014) 50%, #0a0a0a 100%)" },
  { key: "briefs", label: "Briefs", heading: "Generate briefs", badge: "AI generated", goal: "Draft tone, length and CTA to spec.", icon: IconList, body: <CheckBody />, glow: "radial-gradient(60% 85% at 50% 40%, rgba(255,255,255,.07) 0%, rgba(255,255,255,.012) 50%, #0a0a0a 100%)" },
  { key: "qc", label: "QC", heading: "Review automatically", badge: "Auto-checked", goal: "Check every draft against the brief.", icon: IconCheck, body: <BarsBody />, glow: "radial-gradient(70% 80% at 62% 58%, rgba(255,255,255,.07) 0%, rgba(255,255,255,.012) 50%, #0a0a0a 100%)" },
  { key: "publish", label: "Publish", heading: "Publish and track", badge: "Tracking", goal: "See reach and conversion broken down.", icon: IconChartBar, body: <KpiBody />, glow: "radial-gradient(65% 80% at 42% 55%, rgba(255,255,255,.07) 0%, rgba(255,255,255,.012) 50%, #0a0a0a 100%)" },
];
const DEFAULT_AGENT = {
  title: "Talk to the agent any time", online: "Online",
  msgs: [
    { role: "agent" as const, text: "Found 12 new candidates that match." },
    { role: "user" as const, text: "Draft the top 3." },
    { role: "agent" as const, text: "Done. 3 drafts are ready to send." },
  ],
  input: "Ask the agent...",
};

function AgentDock({ agent }: { agent: NonNullable<WorkflowSectionProps["agent"]> }) {
  return (
    <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRadius: 26, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.65)", padding: 20, backdropFilter: "blur(24px)", boxShadow: "0 30px 80px -20px rgba(0,0,0,.8)" }}>
      <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-.01em", color: "#fff", margin: 0 }}>{agent.title}</p>
      <span style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,.55)" }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,.7)" }} />{agent.online}
      </span>
      <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><ParticleOrb size={116} /></div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        {agent.msgs.map((m, i) => {
          const u = m.role === "user";
          return (
            <div key={i} style={{ display: "flex", justifyContent: u ? "flex-end" : "flex-start" }}>
              <p style={{ maxWidth: "86%", fontSize: 11.5, lineHeight: 1.4, padding: "6px 11px", margin: 0, borderRadius: u ? "15px 15px 4px 15px" : "15px 15px 15px 4px", background: u ? "#ededed" : "rgba(255,255,255,.06)", color: u ? "#0a0a0a" : "rgba(255,255,255,.8)" }}>{m.text}</p>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", padding: "8px 12px" }}>
        <span style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,.35)" }}>{agent.input}</span>
        <span style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 999, background: "#ededed", color: "#0a0a0a" }}>
          <IconArrowUR style={{ width: 12, height: 12 }} />
        </span>
      </div>
    </div>
  );
}

export function WorkflowSection({
  eyebrow = "Workflow",
  heading = "From discovery to publish, one workflow",
  body = "Each step hands off smoothly, and the agent stays beside you whichever step you are on.",
  tabs = DEFAULT_TABS, agent = DEFAULT_AGENT,
}: WorkflowSectionProps) {
  const [active, setActive] = React.useState(0);
  const item = tabs[active];

  return (
    <section style={{ position: "relative", background: "#0a0a0a", padding: "80px 0", overflow: "hidden", fontFamily: "var(--font)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start", marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", marginBottom: 12 }}>{eyebrow}</p>
            <h2 style={{ fontSize: 48, lineHeight: 1.05, letterSpacing: "-.02em", fontWeight: 600, color: "#fff", maxWidth: 560, margin: 0 }}>{heading}</h2>
          </div>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,.55)", maxWidth: 460, marginTop: 6 }}>{body}</p>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ position: "relative", overflow: "hidden", height: 600, borderRadius: 34,
            clipPath: "polygon(0 0, 92% 0, 100% 12%, 100% 100%, 30% 100%, 22% 88%, 0 88%)" }}>
            {tabs.map((t, i) => (
              <div key={t.key} style={{ position: "absolute", inset: 0, background: t.glow, opacity: i === active ? 1 : 0, transition: "opacity .45s" }} />
            ))}
            <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.16,
              backgroundImage: "radial-gradient(rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "28px 28px",
              WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)", maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 18, paddingLeft: 300, paddingRight: 36 }}>
              <div key={active} style={{ width: "100%", maxWidth: 360, flexShrink: 1, minWidth: 0, borderRadius: 26, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.65)", backdropFilter: "blur(24px)", boxShadow: "0 30px 80px -20px rgba(0,0,0,.8)", padding: 20, animation: "wfIn .35s ease both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", color: "#fff", lineHeight: 1.2, margin: 0 }}>{item.heading}</h3>
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.18)", padding: "3px 8px", borderRadius: 6 }}>{item.badge}</span>
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 10, color: "rgba(255,255,255,.55)" }}>{item.goal}</p>
                <div style={{ marginTop: 16 }}>{item.body}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 11, color: "rgba(255,255,255,.45)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,.55)" }} />Live pipeline
                  </span>
                  <span>Real-time</span>
                </div>
              </div>
                            <AgentDock agent={agent} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 24, bottom: 56, zIndex: 20, width: 232, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", borderRadius: 24, padding: 12, backdropFilter: "blur(24px)", boxShadow: "0 20px 50px -20px rgba(0,0,0,.7)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tabs.map((tab, i) => {
                const on = active === i; const Icon = tab.icon;
                return (
                  <button key={tab.key} type="button" onClick={() => setActive(i)} aria-current={on ? "step" : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", minHeight: 44, borderRadius: 12, textAlign: "left", cursor: "pointer", transition: "all .25s",
                      background: on ? "rgba(255,255,255,.1)" : "transparent", border: `1px solid ${on ? "rgba(255,255,255,.22)" : "transparent"}` }}>
                    <Icon style={{ width: 20, height: 20, flexShrink: 0, color: on ? "#fff" : "rgba(255,255,255,.55)" }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: on ? "#fff" : "rgba(255,255,255,.85)", display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, marginRight: 6, opacity: .6, fontVariantNumeric: "tabular-nums" }}>{String(i + 1).padStart(2, "0")}</span>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes wfIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </section>
  );
}

export default WorkflowSection;
