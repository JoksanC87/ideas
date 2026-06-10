"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  LayoutGrid, Building2, PlusCircle, Layers3, Gauge, ArrowLeft, Target,
  ClipboardCheck, CheckCircle2, ShieldAlert, Sparkles, FileText, ChevronRight, Printer,
} from "lucide-react";
import { Card, SectionTitle, Chip, MaturityChip, Ring, Bar100, Btn, Stat, Header, Insight, Spinner, T, matColor, levelShort, levelFull, input } from "./ui";
import { QUESTIONS, DIMENSIONS } from "@/data/questions";
import { computeScore, staticScoringModel, type Responses } from "@/lib/scoring";
import { api } from "@/lib/data-layer";
import EvidenceHub from "./EvidenceHub";
import AiGatePanel from "./AiGatePanel";

const MODEL = staticScoringModel();
const QBYDIM = DIMENSIONS.reduce((a, d) => { a[d.id] = QUESTIONS.filter((q) => q.dimension === d.id); return a; }, {} as Record<string, typeof QUESTIONS>);
const SHORT = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.short]));
const debounce = (fn: (...a: any[]) => void, ms = 700) => { let t: any; return (...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export default function Dashboard() {
  const [view, setView] = useState<"overview" | "company">("overview");
  const [companyId, setCompanyId] = useState<string | null>(null);

  return (
    <div style={{ background: T.bg, minHeight: "calc(100vh - 44px)", fontFamily: "ui-sans-serif, system-ui, sans-serif", color: T.ink }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 32px" }}>
        <nav style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          <NavBtn active={view === "overview"} icon={LayoutGrid} onClick={() => { setView("overview"); setCompanyId(null); }}>Panel global</NavBtn>
          <a href="/builder" style={{ textDecoration: "none" }}><NavBtn icon={Layers3}>Builder</NavBtn></a>
        </nav>
        {view === "overview"
          ? <Overview onOpen={(id) => { setCompanyId(id); setView("company"); }} />
          : <CompanyDetail companyId={companyId!} back={() => { setView("overview"); setCompanyId(null); }} />}
      </div>
    </div>
  );
}

const NavBtn: React.FC<{ children: React.ReactNode; active?: boolean; icon?: any; onClick?: () => void }> = ({ children, active, icon: Icon, onClick }) => (
  <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 9, border: `1px solid ${active ? T.accent : T.line}`, background: active ? T.accent + "12" : "#fff", color: active ? T.accent : T.ink, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
    {Icon && <Icon size={15} />}{children}
  </button>
);

/* ===================== Overview ===================== */
function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const [ov, setOv] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { api.overview().then(setOv); }, []);
  if (!ov) return <Spinner label="Cargando panel global…" />;

  const radar = ov.radar.map((r: any) => ({ dim: r.dim, promedio: r.avg }));
  const weakest = [...ov.radar].sort((a: any, b: any) => a.avg - b.avg);

  return (
    <div>
      <Header title="Panel global de madurez" subtitle="Overview comparativo de todos los diagnósticos"
        right={<Btn primary icon={PlusCircle} onClick={() => setCreating(true)}>Nueva evaluación</Btn>} />

      {creating && <NewCompany onClose={() => setCreating(false)} onCreated={(id) => onOpen(id)} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 18 }}>
        <Stat label="Madurez promedio" value={ov.avg} ring foot={levelFull(ov.avg)} color={matColor(ov.avg)} />
        <Stat label="Empresas evaluadas" value={ov.total} icon={Building2} />
        <Stat label="Dimensión más débil" value={weakest[0]?.dim ?? "—"} foot={`${weakest[0]?.avg ?? 0}/100`} icon={ShieldAlert} color="#E07B39" />
        <Stat label="Patrones transversales" value={ov.transversal.length} foot="dimensiones bajo umbral" icon={Target} color={T.accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle icon={Target}>Radar promedio por dimensión</SectionTitle>
          <ResponsiveContainer width="100%" height={290}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={T.line} /><PolarAngleAxis dataKey="dim" tick={{ fontSize: 10.5, fill: T.sub }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: T.faint }} angle={90} />
              <Radar dataKey="promedio" stroke={T.accent} fill={T.accent} fillOpacity={0.28} /><Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          {weakest[0] && <Insight>La dimensión más débil del portafolio es <b>{weakest[0].dim}</b> ({weakest[0].avg}/100). Prioriza un programa transversal antes que arreglos por empresa.</Insight>}
        </Card>
        <Card>
          <SectionTitle icon={Gauge}>Ranking de empresas</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {ov.ranking.map((c: any, i: number) => (
              <button key={c.id} onClick={() => onOpen(c.id)} style={{ display: "flex", alignItems: "center", gap: 11, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", padding: "5px 0" }}>
                <span style={{ width: 18, fontSize: 12, fontWeight: 700, color: T.faint }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: matColor(c.score) }}>{c.score}</span>
                  </div>
                  <Bar100 value={c.score} height={7} />
                </div>
                <ChevronRight size={15} color={T.faint} />
              </button>
            ))}
            {ov.ranking.length === 0 && <span style={{ fontSize: 12, color: T.sub }}>Sin empresas. Crea la primera evaluación.</span>}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={LayoutGrid}>Heatmap — empresa × dimensión</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%", minWidth: 720 }}>
            <thead><tr>
              <th style={{ textAlign: "left", fontSize: 10.5, color: T.sub, padding: "4px 8px" }}>Empresa</th>
              {DIMENSIONS.map((d) => <th key={d.id} style={{ fontSize: 10, color: T.sub, padding: 2 }}>{d.id}</th>)}
              <th style={{ fontSize: 10.5, color: T.sub, padding: 2 }}>Global</th>
            </tr></thead>
            <tbody>
              {ov.heatmap.map((row: any) => (
                <tr key={row.id}>
                  <td onClick={() => onOpen(row.id)} style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 8px", whiteSpace: "nowrap", cursor: "pointer" }}>{row.name}</td>
                  {row.cells.map((c: any) => <td key={c.code} style={{ background: matColor(c.score), color: "#fff", textAlign: "center", fontSize: 11, fontWeight: 700, padding: "8px 0", borderRadius: 6, width: 42 }}>{c.score}</td>)}
                  <td style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: matColor(row.global) }}>{row.global}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ov.transversal[0] && <Insight>"{ov.transversal[0].dim}" es la brecha más común: {ov.transversal[0].count} de {ov.total} empresas bajo umbral (prom. {ov.transversal[0].avg}/100).</Insight>}
      </Card>
    </div>
  );
}

function NewCompany({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ name: "", industry: "Banca", country: "México", teams: 10, platforms: "Web, iOS, Android" });
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const { company } = await api.createCompany({ name: f.name.trim(), industry: f.industry, country: f.country, teams: Number(f.teams), platforms: f.platforms.split(",").map((s) => s.trim()) });
      onCreated(company.id);
    } catch (e: any) { alert(e.message); setBusy(false); }
  }
  return (
    <Card style={{ marginBottom: 16, borderColor: T.accent }}>
      <SectionTitle icon={PlusCircle}>Nueva empresa / evaluación</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <input placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={input} />
        <select value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} style={input}>{["Banca", "Fintech", "Retail / Ecommerce", "Telco", "Seguros", "Otra"].map((x) => <option key={x}>{x}</option>)}</select>
        <input placeholder="País" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} style={input} />
      </div>
      <input placeholder="Plataformas (coma)" value={f.platforms} onChange={(e) => setF({ ...f, platforms: e.target.value })} style={{ ...input, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn primary icon={PlusCircle} onClick={create} disabled={busy || f.name.trim().length < 2}>Crear y aplicar assessment</Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </Card>
  );
}

/* ===================== Company detail ===================== */
function CompanyDetail({ companyId, back }: { companyId: string; back: () => void }) {
  const [meta, setMeta] = useState<any>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Responses>({});
  const [assessmentMeta, setAssessmentMeta] = useState<any>(null);
  const [tab, setTab] = useState("resumen");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const companies = await api.companies();
      const c = companies.find((x: any) => x.id === companyId);
      setMeta(c);
      if (c?.activeAssessmentId) {
        setAssessmentId(c.activeAssessmentId);
        const d = await api.assessment(c.activeAssessmentId);
        setResponses(d.responses ?? {}); setAssessmentMeta(d.assessment);
      }
      setLoading(false);
    })();
  }, [companyId]);

  const s = useMemo(() => computeScore(responses, MODEL), [responses]);
  const saver = useRef(debounce((id: string, payload: any[]) => { api.saveResponses(id, payload).catch(() => {}); }, 700)).current;

  function update(code: string, patch: any) {
    setResponses((prev) => {
      const next = { ...prev, [code]: { ...prev[code], ...patch } };
      if (assessmentId) {
        const a = next[code];
        saver(assessmentId, [{ questionCode: code, value: a.value, evidence: a.evidence, evidenceUrl: (a as any).evidenceUrl, connected: a.connected, comment: a.comment, uncertain: a.uncertain }]);
      }
      return next;
    });
  }

  if (loading) return <Spinner label="Cargando empresa…" />;
  if (!meta) return <Card><span style={{ fontSize: 13, color: T.sub }}>Empresa no encontrada.</span></Card>;

  const tabs = [
    { id: "resumen", label: "Resumen", icon: Gauge },
    { id: "assessment", label: "Assessment", icon: ClipboardCheck },
    { id: "evidencia", label: "Evidencia", icon: CheckCircle2 },
    { id: "ia", label: "IA & Cierre", icon: Sparkles },
    { id: "reporte", label: "Reporte", icon: FileText },
  ];

  return (
    <div>
      <button onClick={back} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: T.sub, cursor: "pointer", fontSize: 12.5, marginBottom: 12 }}><ArrowLeft size={14} /> Volver al panel</button>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <Ring score={s.global} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{meta.name}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
            <MaturityChip score={s.global} big />
            <Chip color={T.sub} bg={T.soft}>{meta.industry}</Chip>
            <Chip color={T.sub} bg={T.soft}>{meta.country}</Chip>
            <Chip color={s.confidence === "Alto" ? T.accent2 : s.confidence === "Medio" ? "#E0B23A" : "#D64550"}>Confianza {s.confidence} · {s.confScore}%</Chip>
            {assessmentMeta?.status && <Chip color={T.faint} bg={T.soft}>{assessmentMeta.status}</Chip>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.line}`, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", border: "none", borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`, background: "transparent", color: tab === t.id ? T.ink : T.sub, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <Resumen s={s} />}
      {tab === "assessment" && <Runner responses={responses} s={s} update={update} />}
      {tab === "evidencia" && assessmentId && <EvidenceHub assessmentId={assessmentId} />}
      {tab === "ia" && assessmentId && <AiGatePanel assessmentId={assessmentId} meta={assessmentMeta} onClosed={() => api.assessment(assessmentId).then((d) => setAssessmentMeta(d.assessment))} />}
      {tab === "reporte" && assessmentId && <Report s={s} meta={meta} assessmentId={assessmentId} />}
    </div>
  );
}

function Resumen({ s }: { s: any }) {
  const radar = DIMENSIONS.map((d) => ({ dim: d.short, score: s.dims[d.id].score }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle icon={Target}>Perfil de madurez</SectionTitle>
          <ResponsiveContainer width="100%" height={290}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={T.line} /><PolarAngleAxis dataKey="dim" tick={{ fontSize: 10.5, fill: T.sub }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: T.faint }} angle={90} />
              <Radar dataKey="score" stroke={matColor(s.global)} fill={matColor(s.global)} fillOpacity={0.3} /><Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle icon={Gauge}>Dimensiones</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {DIMENSIONS.map((d) => (
              <div key={d.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span>{d.id}. {d.short} <span style={{ color: T.faint }}>· {Math.round(d.weight * 100)}%</span></span>
                  <span style={{ fontWeight: 700, color: matColor(s.dims[d.id].score) }}>{s.dims[d.id].score}</span>
                </div>
                <Bar100 value={s.dims[d.id].score} height={6} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Runner({ responses, s, update }: { responses: Responses; s: any; update: (c: string, p: any) => void }) {
  const [dim, setDim] = useState("A");
  const qs = QBYDIM[dim];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
      <Card pad={10}>
        {DIMENSIONS.map((d) => (
          <button key={d.id} onClick={() => setDim(d.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "8px 9px", marginBottom: 2, borderRadius: 8, border: "none", background: d.id === dim ? T.soft : "transparent", cursor: "pointer" }}>
            <span style={{ fontSize: 12, fontWeight: d.id === dim ? 700 : 500 }}>{d.id}. {d.short}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: matColor(s.dims[d.id].score) }}>{s.dims[d.id].score}</span>
          </button>
        ))}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {qs.map((q) => <QuestionInput key={q.code} q={q} a={responses[q.code] || {}} onChange={(p) => update(q.code, p)} />)}
      </div>
    </div>
  );
}

function QuestionInput({ q, a, onChange }: { q: any; a: any; onChange: (p: any) => void }) {
  return (
    <Card pad={14}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{q.text}{q.critical && <Chip color="#D64550" bg="#D6455014">crítica</Chip>}</div>
        <Chip color={T.faint} bg={T.soft}>{q.type}</Chip>
      </div>
      {q.type === "scale" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[0, 1, 2, 3, 4, 5].map((v) => {
            const sel = a.value === v;
            return <button key={v} onClick={() => onChange({ value: v })} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${sel ? matColor(v / 5 * 100) : T.line}`, cursor: "pointer", fontWeight: 700, background: sel ? matColor(v / 5 * 100) : "#fff", color: sel ? "#fff" : T.sub }}>{v}</button>;
          })}
        </div>
      )}
      {q.type === "boolean" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[["No", false], ["Sí", true]].map(([l, v]) => (
            <button key={String(v)} onClick={() => onChange({ value: v })} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${a.value === v ? T.accent : T.line}`, background: a.value === v ? T.accent : "#fff", color: a.value === v ? "#fff" : T.sub, fontWeight: 700, cursor: "pointer" }}>{l as string}</button>
          ))}
        </div>
      )}
      {q.type === "number" && (
        <input type="number" value={a.value ?? ""} onChange={(e) => onChange({ value: e.target.value === "" ? null : Number(e.target.value) })} placeholder={q.number?.unit} style={{ ...input, marginBottom: 10 }} />
      )}
      {q.type === "single" && q.options && (
        <select value={a.value ?? ""} onChange={(e) => onChange({ value: e.target.value })} style={{ ...input, marginBottom: 10 }}>
          <option value="">Selecciona…</option>{q.options.map((o: any) => <option key={o.label}>{o.label}</option>)}
        </select>
      )}
      {q.type === "multi" && q.options && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {q.options.map((o: any) => {
            const arr: string[] = Array.isArray(a.value) ? a.value : [];
            const on = arr.includes(o.label);
            return <button key={o.label} onClick={() => onChange({ value: on ? arr.filter((x) => x !== o.label) : [...arr, o.label] })} style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 999, border: `1px solid ${on ? T.accent : T.line}`, background: on ? T.accent + "14" : "#fff", color: on ? T.accent : T.sub, cursor: "pointer" }}>{o.label}</button>;
          })}
        </div>
      )}
      {(q.type === "open" || q.type === "url" || q.type === "integration") && (
        <input value={a.value ?? ""} onChange={(e) => onChange({ value: e.target.value, connected: q.type === "integration" ? !!e.target.value : undefined })} placeholder={q.type === "url" ? "URL" : q.type === "integration" ? "Herramienta conectada / URL" : "Respuesta"} style={{ ...input, marginBottom: 10 }} />
      )}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, cursor: "pointer" }}>
          <input type="checkbox" checked={!!a.evidence} onChange={(e) => onChange({ evidence: e.target.checked })} /> Evidencia
        </label>
        <input placeholder="URL de evidencia" value={a.evidenceUrl || ""} onChange={(e) => onChange({ evidenceUrl: e.target.value, evidence: e.target.value ? true : a.evidence })} style={{ flex: 1, minWidth: 160, fontSize: 12, padding: "7px 10px", border: `1px solid ${T.line}`, borderRadius: 8 }} />
      </div>
    </Card>
  );
}

function Report({ s, meta, assessmentId }: { s: any; meta: any; assessmentId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Btn primary icon={Printer} onClick={() => window.print()}>Exportar PDF</Btn>
        <Btn icon={Sparkles} onClick={async () => { setBusy(true); await api.recompute(assessmentId).catch(() => {}); setBusy(false); }} disabled={busy}>{busy ? "Recalculando…" : "Recalcular y guardar snapshot"}</Btn>
      </div>
      <Card pad={26}>
        <div style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: T.accent, fontWeight: 700 }}>DESIGN SYSTEM MATURITY REPORT</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 4px" }}>{meta.name}</h1>
          <div style={{ fontSize: 13, color: T.sub }}>{meta.industry} · {meta.country} · {new Date().toLocaleDateString("es-MX")}</div>
        </div>
        <div style={{ display: "flex", gap: 22, alignItems: "center", marginBottom: 18 }}>
          <Ring score={s.global} size={100} />
          <div><MaturityChip score={s.global} big /><p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "10px 0 0", maxWidth: 560 }}>{meta.name} obtiene <b>{s.global}/100</b> ({levelFull(s.global)}) con confianza {s.confidence.toLowerCase()} ({s.confScore}%).</p></div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>{DIMENSIONS.map((d) => (
            <tr key={d.id} style={{ borderBottom: `1px solid ${T.line}` }}>
              <td style={{ padding: "6px 4px", color: T.sub }}>{d.id}. {d.short}</td>
              <td style={{ padding: "6px 4px", width: 120 }}><Bar100 value={s.dims[d.id].score} height={6} /></td>
              <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 700, color: matColor(s.dims[d.id].score), width: 36 }}>{s.dims[d.id].score}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}
