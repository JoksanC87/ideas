"use client";
import React, { useState } from "react";
import { Sparkles, ShieldCheck, AlertTriangle, Lock, CheckCircle2 } from "lucide-react";
import { Card, SectionTitle, Chip, Bar100, Btn, T, matColor } from "./ui";
import { DIMENSIONS } from "@/data/questions";
import { api } from "@/lib/data-layer";

const SHORT = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.short]));

export default function AiGatePanel({ assessmentId, meta, onClosed }: { assessmentId: string; meta: any; onClosed: () => void }) {
  const [evaluation, setEvaluation] = useState<any>(meta?.aiEvaluation ?? null);
  const [running, setRunning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const [closed, setClosed] = useState<boolean>(!!meta?.gateApprovedAt);
  const aiDone = !!evaluation || !!meta?.aiEvaluatedAt;

  async function runAi() {
    setRunning(true);
    try { const r = await api.aiEvaluate(assessmentId); setEvaluation(r.evaluation); }
    catch (e: any) { alert(e.message); } finally { setRunning(false); }
  }
  async function approveClose() {
    if (!confirm("Vas a aprobar la evaluación AI y cerrar el assessment. ¿Continuar?")) return;
    setClosing(true);
    try { await api.closeAssessment(assessmentId, true, note); setClosed(true); onClosed(); }
    catch (e: any) { alert(e.message); } finally { setClosing(false); }
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={Sparkles} right={<Chip color={T.faint} bg={T.soft}>{evaluation?.source === "ai" ? "Claude" : "heurística"} · revisión humana</Chip>}>
          Evaluación asistida por AI
        </SectionTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Btn primary icon={Sparkles} onClick={runAi} disabled={running || closed}>{running ? "Analizando…" : aiDone ? "Re-evaluar" : "Evaluar con AI"}</Btn>
          {aiDone && <Chip color={T.accent2}><CheckCircle2 size={12} /> Evaluación lista</Chip>}
          {!aiDone && <span style={{ fontSize: 12, color: T.sub }}>Analiza scores y calidad de evidencia para sugerir ajustes.</span>}
        </div>
        {evaluation?.narrative && <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, marginTop: 14 }}>{evaluation.narrative}</p>}
      </Card>

      {evaluation && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle icon={ShieldCheck}>Sugerencias por dimensión</SectionTitle>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ borderBottom: `2px solid ${T.line}`, color: T.sub, textAlign: "left" }}>
                  <th style={{ padding: 7 }}>Dimensión</th><th style={{ padding: 7 }}>Declarado</th><th style={{ padding: 7 }}>Sugerido</th>
                  <th style={{ padding: 7 }}>Calidad ev.</th><th style={{ padding: 7 }}>Confianza</th><th style={{ padding: 7 }}>Razonamiento</th>
                </tr></thead>
                <tbody>
                  {evaluation.perDimension.map((d: any) => {
                    const delta = d.suggestedScore - d.declaredScore;
                    return (
                      <tr key={d.code} style={{ borderBottom: `1px solid ${T.line}` }}>
                        <td style={{ padding: 7, fontWeight: 600 }}>{SHORT[d.code] ?? d.code}</td>
                        <td style={{ padding: 7, color: matColor(d.declaredScore), fontWeight: 700 }}>{d.declaredScore}</td>
                        <td style={{ padding: 7 }}>
                          <span style={{ color: matColor(d.suggestedScore), fontWeight: 700 }}>{d.suggestedScore}</span>
                          {delta !== 0 && <span style={{ fontSize: 10.5, color: delta < 0 ? "#D64550" : T.accent2, marginLeft: 5 }}>{delta > 0 ? "+" : ""}{delta}</span>}
                        </td>
                        <td style={{ padding: 7, width: 90 }}><Bar100 value={d.evidenceQuality} height={6} /></td>
                        <td style={{ padding: 7 }}>{d.confidence}%</td>
                        <td style={{ padding: 7, color: T.sub, maxWidth: 280 }}>{d.rationale}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {evaluation.risks?.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <SectionTitle icon={AlertTriangle}>Riesgos señalados</SectionTitle>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {evaluation.risks.map((r: string, i: number) => <li key={i} style={{ fontSize: 12.5, color: T.ink, lineHeight: 1.6 }}>{r}</li>)}
              </ul>
            </Card>
          )}
        </>
      )}

      <Card>
        <SectionTitle icon={Lock}>Gate humano · cierre</SectionTitle>
        {closed ? (
          <Chip color={T.accent2}><CheckCircle2 size={12} /> Assessment cerrado y aprobado</Chip>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: T.sub, marginBottom: 10 }}>
              El cierre exige que la evaluación AI se haya corrido y tu aprobación explícita. Al cerrar se fija el snapshot histórico de scores.
            </p>
            <input placeholder="Nota de aprobación (opcional)" value={note} onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", fontSize: 13, padding: "9px 11px", border: `1px solid ${T.line}`, borderRadius: 9, boxSizing: "border-box", marginBottom: 10 }} />
            <Btn primary icon={ShieldCheck} onClick={approveClose} disabled={!aiDone || closing}>
              {closing ? "Cerrando…" : "Aprobar y cerrar"}
            </Btn>
            {!aiDone && <span style={{ fontSize: 12, color: "#E07B39", marginLeft: 10 }}>Corre la evaluación AI primero.</span>}
          </>
        )}
      </Card>
    </div>
  );
}
