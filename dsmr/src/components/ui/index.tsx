"use client";
import React from "react";
import { Sparkles } from "lucide-react";

export const T = {
  bg: "#F4F6FB", panel: "#FFFFFF", ink: "#101828", sub: "#667085", faint: "#98A2B3",
  line: "#E6E9F2", rail: "#0C1A30", railLine: "#1C2E4A", railSub: "#7E93B5", railInk: "#E8EEF8",
  accent: "#5B5BD6", accent2: "#0E9F8F", soft: "#F0F1FA",
};
export const matColor = (s: number) =>
  s < 21 ? "#D64550" : s < 41 ? "#E07B39" : s < 61 ? "#E0B23A" : s < 76 ? "#3E8FC0" : s < 91 ? "#3E9B6F" : "#2F7D5B";
export const levelShort = (s: number) =>
  s < 21 ? "Fragmentado" : s < 41 ? "Inicial" : s < 61 ? "En construcción" : s < 76 ? "Operativo" : s < 91 ? "Escalable" : "Optimizado";
export const levelFull = (s: number) =>
  s < 21 ? "Inexistente / Fragmentado" : s < 41 ? "Inicial" : s < 61 ? "En construcción" : s < 76 ? "Operativo" : s < 91 ? "Escalable" : "Optimizado / Inteligente";

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; pad?: number }> = ({ children, style, pad = 16 }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: pad, boxShadow: "0 1px 2px rgba(16,24,40,0.04)", ...style }}>{children}</div>
);

export const SectionTitle: React.FC<{ icon?: any; children: React.ReactNode; right?: React.ReactNode }> = ({ icon: Icon, children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {Icon && <Icon size={16} color={T.accent} />}
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: T.ink, textTransform: "uppercase" }}>{children}</span>
    </div>
    {right}
  </div>
);

export const Chip: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({ children, color = T.accent, bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color, background: bg || color + "1A", padding: "3px 9px", borderRadius: 999 }}>{children}</span>
);

export const MaturityChip: React.FC<{ score: number; big?: boolean }> = ({ score, big }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: big ? 12.5 : 11, color: "#fff", background: matColor(score), padding: big ? "5px 12px" : "3px 9px", borderRadius: 999 }}>
    <span style={{ width: 6, height: 6, borderRadius: 99, background: "#fff", opacity: 0.85 }} />{levelShort(score)}
  </span>
);

export const Ring: React.FC<{ score: number; size?: number }> = ({ score, size = 92 }) => {
  const c = matColor(score), R = (size - 10) / 2, circ = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={T.line} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={c} strokeWidth={8} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size > 80 ? 24 : 18, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: T.sub }}>/100</span>
      </div>
    </div>
  );
};

export const Bar100: React.FC<{ value: number; height?: number }> = ({ value, height = 8 }) => (
  <div style={{ background: T.line, borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
    <div style={{ width: `${value}%`, height: "100%", background: matColor(value), borderRadius: 99 }} />
  </div>
);

export const Btn: React.FC<{ children: React.ReactNode; onClick?: () => void; primary?: boolean; small?: boolean; icon?: any; danger?: boolean; disabled?: boolean }> = ({ children, onClick, primary, small, icon: Icon, danger, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontSize: small ? 12 : 13, fontWeight: 600, padding: small ? "6px 11px" : "9px 15px", borderRadius: 9, border: `1px solid ${danger ? "#D64550" : primary ? T.accent : T.line}`, background: danger ? "#D64550" : primary ? T.accent : T.panel, color: danger || primary ? "#fff" : T.ink }}>
    {Icon && <Icon size={small ? 13 : 15} />}{children}
  </button>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; suffix?: string; foot?: string; icon?: any; color?: string; ring?: boolean }> = ({ label, value, suffix, foot, icon: Icon, color = T.ink, ring }) => (
  <Card pad={14}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>{label}</div>
      {Icon && <Icon size={15} color={color} />}
    </div>
    {ring ? <div style={{ marginTop: 6 }}><Ring score={Number(value)} size={76} /></div> : (
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 6, lineHeight: 1 }}>{value}<span style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>{suffix}</span></div>
    )}
    {foot && <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>{foot}</div>}
  </Card>
);

export const Header: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
    <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h1>{subtitle && <p style={{ fontSize: 13, color: T.sub, margin: "4px 0 0" }}>{subtitle}</p>}</div>
    <div>{right}</div>
  </div>
);

export const Insight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start", background: T.soft, borderRadius: 10, padding: "10px 12px" }}>
    <Sparkles size={14} color={T.accent} style={{ marginTop: 2, flexShrink: 0 }} />
    <span style={{ fontSize: 12, color: T.ink, lineHeight: 1.5 }}>{children}</span>
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ display: "grid", placeItems: "center", padding: 48, color: T.sub, fontSize: 13 }}>{label ?? "Cargando…"}</div>
);

export const input: React.CSSProperties = { width: "100%", fontSize: 13, padding: "9px 11px", border: `1px solid ${T.line}`, borderRadius: 9, boxSizing: "border-box" };
