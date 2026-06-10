"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg(error.message); else router.replace(next);
  }
  async function magic() {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
    setMsg(error ? error.message : "Revisa tu correo para el enlace de acceso.");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0C1A30", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ width: 360, background: "#fff", borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#101828" }}>Maturity Radar</div>
        <p style={{ fontSize: 13, color: "#667085", margin: "4px 0 18px" }}>Inicia sesión para continuar</p>
        <input placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #E6E9F2", marginBottom: 10, boxSizing: "border-box" }} />
        {mode === "password" && (
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #E6E9F2", marginBottom: 10, boxSizing: "border-box" }} />
        )}
        <button onClick={mode === "password" ? signIn : magic} disabled={loading || !email}
          style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: "#5B5BD6", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          {loading ? "..." : mode === "password" ? "Entrar" : "Enviar enlace"}
        </button>
        <button onClick={() => setMode(mode === "password" ? "magic" : "password")}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "none", color: "#5B5BD6", fontSize: 12.5, cursor: "pointer" }}>
          {mode === "password" ? "Usar enlace mágico" : "Usar contraseña"}
        </button>
        {msg && <p style={{ fontSize: 12, color: "#667085", marginTop: 12 }}>{msg}</p>}
      </div>
    </div>
  );
}
