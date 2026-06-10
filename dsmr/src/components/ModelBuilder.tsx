"use client";
import React, { useEffect, useState } from "react";
import { Layers3, Copy, Save, Plus, Trash2, Lock, CheckCircle2 } from "lucide-react";
import { Card, SectionTitle, Chip, Btn, Header, Spinner, T, matColor, input } from "./ui";
import { api } from "@/lib/data-layer";

const TYPES = ["SCALE", "BOOLEAN", "SINGLE", "MULTI", "NUMBER", "OPEN", "URL", "INTEGRATION"];

export default function ModelBuilder() {
  const [models, setModels] = useState<any[] | null>(null);
  const [sel, setSel] = useState<any>(null);
  const [weights, setWeights] = useState<{ code: string; weight: number }[]>([]);
  const [creating, setCreating] = useState({ name: "", cloneFrom: "", setActive: true });
  const [newQ, setNewQ] = useState<any>({ dimensionCode: "", text: "", type: "SCALE", weight: 1, critical: false, evidenceRequired: false });

  const loadModels = () => api.listModels().then(setModels);
  useEffect(() => { loadModels(); }, []);

  async function open(id: string) {
    const m = await api.getModel(id);
    setSel(m);
    setWeights(m.dimensions.map((d: any) => ({ code: d.code, weight: d.weight })));
  }
  const locked = sel && (sel._count?.assessments > 0 || sel.orgId === null);
  const sum = weights.reduce((s, w) => s + Number(w.weight), 0);

  async function saveWeights() {
    if (Math.abs(sum - 1) > 0.02) { alert(`Los pesos deben sumar 1.0 (actual: ${sum.toFixed(2)}).`); return; }
    await api.updateModel(sel.id, { weights });
    await open(sel.id);
  }
  async function create() {
    if (!creating.name) return;
    const { model } = await api.createModel({ name: creating.name, cloneFrom: creating.cloneFrom || undefined, setActive: creating.setActive });
    setCreating({ name: "", cloneFrom: "", setActive: true });
    await loadModels(); await open(model.id);
  }
  async function addQuestion() {
    if (!newQ.dimensionCode || !newQ.text) return;
    await api.addQuestion(sel.id, newQ);
    setNewQ({ dimensionCode: "", text: "", type: "SCALE", weight: 1, critical: false, evidenceRequired: false });
    await open(sel.id);
  }

  if (!models) return <Spinner label="Cargando modelos…" />;

  return (
    <div style={{ padding: "26px 32px", maxWidth: 1180, margin: "0 auto" }}>
      <Header title="Assessment builder" subtitle="Crea modelos por cliente, ajusta pesos y edita preguntas. Los modelos con evaluaciones se bloquean: clónalos para preservar el histórico." />

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <div>
          <Card style={{ marginBottom: 14 }}>
            <SectionTitle icon={Copy}>Crear / clonar modelo</SectionTitle>
            <input placeholder="Nombre del modelo" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} style={{ ...input, marginBottom: 8 }} />
            <select value={creating.cloneFrom} onChange={(e) => setCreating({ ...creating, cloneFrom: e.target.value })} style={{ ...input, marginBottom: 8 }}>
              <option value="">Desde cero</option>
              {models.map((m) => <option key={m.id} value={m.id}>Clonar de: {m.name} v{m.version}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, marginBottom: 10 }}>
              <input type="checkbox" checked={creating.setActive} onChange={(e) => setCreating({ ...creating, setActive: e.target.checked })} /> Activar al crear
            </label>
            <Btn primary small icon={Plus} onClick={create} disabled={!creating.name}>Crear modelo</Btn>
          </Card>

          <Card>
            <SectionTitle icon={Layers3}>Modelos</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {models.map((m) => (
                <button key={m.id} onClick={() => open(m.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, border: `1px solid ${sel?.id === m.id ? T.accent : T.line}`, background: sel?.id === m.id ? T.soft : "#fff", cursor: "pointer", textAlign: "left" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.name} <span style={{ color: T.faint, fontWeight: 400 }}>v{m.version}</span></div>
                    <div style={{ fontSize: 10.5, color: T.sub }}>{m._count.dimensions} dim · {m._count.questions} preg · {m._count.assessments} eval{m.orgId === null ? " · global" : ""}</div>
                  </div>
                  {m.isActive && <Chip color={T.accent2}><CheckCircle2 size={11} /> activo</Chip>}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div>
          {!sel ? <Card><span style={{ fontSize: 13, color: T.sub }}>Selecciona un modelo para editarlo.</span></Card> : (
            <>
              {locked && (
                <Card style={{ marginBottom: 14, borderColor: "#E0B23A" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "#946200" }}>
                    <Lock size={15} /> {sel.orgId === null ? "Modelo global: no editable." : "Modelo con evaluaciones: no editable para preservar el histórico."} Clónalo para crear una versión editable.
                  </div>
                </Card>
              )}

              <Card style={{ marginBottom: 14 }}>
                <SectionTitle icon={Layers3} right={<Chip color={Math.abs(sum - 1) > 0.02 ? "#D64550" : T.accent2}>Σ pesos {sum.toFixed(2)}</Chip>}>
                  Pesos por dimensión — {sel.name} v{sel.version}
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sel.dimensions.map((d: any, i: number) => (
                    <div key={d.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 12.5 }}>{d.code}. {d.short}</span>
                      <input type="number" step="0.01" min="0" max="1" disabled={locked} value={weights[i]?.weight ?? d.weight}
                        onChange={(e) => setWeights(weights.map((w, j) => j === i ? { ...w, weight: Number(e.target.value) } : w))}
                        style={{ width: 80, ...input, padding: "6px 8px" }} />
                      <span style={{ width: 44, textAlign: "right", fontSize: 11, color: T.sub }}>{Math.round((weights[i]?.weight ?? d.weight) * 100)}%</span>
                    </div>
                  ))}
                </div>
                {!locked && <div style={{ marginTop: 12 }}><Btn primary small icon={Save} onClick={saveWeights}>Guardar pesos</Btn></div>}
              </Card>

              <Card>
                <SectionTitle icon={Plus}>Preguntas ({sel.questions.length})</SectionTitle>
                {!locked && (
                  <div style={{ background: T.soft, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, marginBottom: 8 }}>
                      <select value={newQ.dimensionCode} onChange={(e) => setNewQ({ ...newQ, dimensionCode: e.target.value })} style={input}>
                        <option value="">Dim…</option>
                        {sel.dimensions.map((d: any) => <option key={d.code} value={d.code}>{d.code}. {d.short}</option>)}
                      </select>
                      <input placeholder="Texto de la pregunta" value={newQ.text} onChange={(e) => setNewQ({ ...newQ, text: e.target.value })} style={input} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={newQ.type} onChange={(e) => setNewQ({ ...newQ, type: e.target.value })} style={{ ...input, width: 130 }}>
                        {TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <input type="number" step="0.5" min="0" value={newQ.weight} onChange={(e) => setNewQ({ ...newQ, weight: Number(e.target.value) })} style={{ ...input, width: 80 }} title="peso" />
                      <label style={{ fontSize: 12, color: T.sub, display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={newQ.critical} onChange={(e) => setNewQ({ ...newQ, critical: e.target.checked })} /> crítica</label>
                      <label style={{ fontSize: 12, color: T.sub, display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={newQ.evidenceRequired} onChange={(e) => setNewQ({ ...newQ, evidenceRequired: e.target.checked })} /> evidencia</label>
                      <Btn primary small icon={Plus} onClick={addQuestion} disabled={!newQ.dimensionCode || !newQ.text}>Agregar</Btn>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 360, overflowY: "auto" }}>
                  {sel.questions.map((q: any) => (
                    <div key={q.code} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderBottom: `1px solid ${T.line}` }}>
                      <Chip color={T.accent} bg={T.soft}>{q.code}</Chip>
                      <span style={{ flex: 1, fontSize: 12, color: T.ink }}>{q.text}</span>
                      <Chip color={T.faint} bg={T.soft}>{q.type}</Chip>
                      {q.critical && <Chip color="#D64550" bg="#D6455014">crítica</Chip>}
                      {!locked && <button onClick={() => api.deleteQuestion(sel.id, q.code).then(() => open(sel.id))} style={{ border: "none", background: "transparent", cursor: "pointer", color: T.faint }}><Trash2 size={14} /></button>}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
