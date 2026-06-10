"use client";
import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Upload, LinkIcon, Trash2, ShieldCheck, FileText } from "lucide-react";
import { Card, SectionTitle, Chip, Bar100, Btn, Stat, Spinner, T, matColor, input } from "./ui";
import { QUESTIONS, DIMENSIONS } from "@/data/questions";
import { api } from "@/lib/data-layer";

const Q_BY_CODE = new Map(QUESTIONS.map((q) => [q.code, q]));

export default function EvidenceHub({ assessmentId }: { assessmentId: string }) {
  const [data, setData] = useState<{ items: any[]; summary: any } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ questionCode: "", url: "", title: "", content: "" });

  const load = () => api.listEvidence(assessmentId).then(setData);
  useEffect(() => { load(); }, [assessmentId]);

  async function addUrl() {
    if (!form.questionCode || (!form.url && !form.content)) return;
    setBusy(true);
    try {
      await api.createEvidence({ assessmentId, questionCode: form.questionCode, url: form.url || undefined, title: form.title || undefined, content: form.content || undefined });
      setForm({ questionCode: "", url: "", title: "", content: "" });
      await load();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function addFile(file: File) {
    if (!form.questionCode) { alert("Elige primero la pregunta."); return; }
    setBusy(true);
    try {
      const { uploadUrl, storageRef } = await api.uploadUrl({ assessmentId, filename: file.name, contentType: file.type || "application/octet-stream" });
      await api.putFile(uploadUrl, file);
      await api.createEvidence({ assessmentId, questionCode: form.questionCode, storageRef, title: form.title || file.name });
      await load();
    } catch (e: any) { alert(e.message.includes("Storage") ? "Cloud Storage no está configurado; usa evidencia por URL." : e.message); }
    finally { setBusy(false); }
  }

  if (!data) return <Spinner label="Cargando evidencia…" />;
  const { items, summary } = data;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <Stat label="Evidencias" value={summary.total} icon={FileText} />
        <Stat label="Validadas" value={summary.validated} suffix={`/${summary.total}`} icon={CheckCircle2} color={T.accent2} />
        <Stat label="Pendientes" value={summary.pending} icon={AlertTriangle} color="#E07B39" />
        <Stat label="Calidad promedio" value={summary.avgQuality} suffix="/100" color={matColor(summary.avgQuality)} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle icon={LinkIcon}>Adjuntar evidencia</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <select value={form.questionCode} onChange={(e) => setForm({ ...form, questionCode: e.target.value })} style={input}>
            <option value="">Pregunta…</option>
            {DIMENSIONS.map((d) => (
              <optgroup key={d.id} label={`${d.id}. ${d.short}`}>
                {QUESTIONS.filter((q) => q.dimension === d.id).map((q) => <option key={q.code} value={q.code}>{q.code} — {q.text.slice(0, 60)}</option>)}
              </optgroup>
            ))}
          </select>
          <input placeholder="Título (opcional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={input} />
        </div>
        <input placeholder="URL (Figma, repo, Storybook, docs…)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={{ ...input, marginBottom: 10 }} />
        <textarea placeholder="Opcional: pega aquí un JSON de tokens para analizar arquitectura de niveles" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} style={{ ...input, marginBottom: 10, fontFamily: "monospace", fontSize: 11.5 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn primary small icon={LinkIcon} onClick={addUrl} disabled={busy || !form.questionCode}>Adjuntar enlace</Btn>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, cursor: "pointer", border: `1px solid ${T.line}`, padding: "6px 11px", borderRadius: 9 }}>
            <Upload size={13} /> Subir archivo
            <input type="file" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])} />
          </label>
          {busy && <span style={{ fontSize: 12, color: T.faint }}>procesando…</span>}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={ShieldCheck}>Evidencia analizada</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.length === 0 && <span style={{ fontSize: 12, color: T.sub }}>Aún no hay evidencia. Adjunta enlaces o archivos arriba.</span>}
          {items.map((e) => {
            const q = Q_BY_CODE.get(e.response?.question?.code);
            const tiers = (e.signals as any[] | null)?.find((s) => s.key === "tierLevels")?.value;
            return (
              <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: T.soft, borderRadius: 10 }}>
                <div style={{ width: 44, textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: matColor(e.qualityScore ?? 0) }}>{e.qualityScore ?? "—"}</div>
                  <div style={{ fontSize: 9, color: T.faint }}>calidad</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip color={T.sub} bg="#fff">{e.type}</Chip>
                    {e.response?.question?.code && <Chip color={T.accent} bg="#fff">{e.response.question.code}</Chip>}
                    {tiers !== undefined && <Chip color={T.accent2} bg="#fff">{tiers} niveles de tokens</Chip>}
                  </div>
                  <div style={{ fontSize: 12, color: T.ink, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.title || e.url || e.storageRef} {q && <span style={{ color: T.faint }}>· {q.text.slice(0, 50)}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{e.aiSummary}</div>
                </div>
                <button onClick={() => api.validateEvidence(e.id, !e.validated).then(load)} title={e.validated ? "Validada" : "Marcar validada"}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: e.validated ? T.accent2 : T.faint }}>
                  <CheckCircle2 size={18} />
                </button>
                <button onClick={() => api.deleteEvidence(e.id).then(load)} style={{ border: "none", background: "transparent", cursor: "pointer", color: T.faint }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
