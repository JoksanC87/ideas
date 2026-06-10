"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setActiveOrg } from "@/lib/data-layer";

interface Org { id: string; name: string; role: string }

export default function OrgSwitcher({ initialOrg }: { initialOrg?: string }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [active, setActive] = useState<string | undefined>(initialOrg);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then((r) => r.json()).then((d) => {
      setOrgs(d.orgs ?? []);
      const a = initialOrg ?? d.orgs?.[0]?.id;
      if (a) { setActive(a); setActiveOrg(a); }
    });
  }, [initialOrg]);

  async function change(orgId: string) {
    setActive(orgId); setActiveOrg(orgId);
    await fetch("/api/session/org", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId }) });
    router.refresh();
  }

  if (orgs.length <= 1) return null;
  return (
    <select value={active} onChange={(e) => change(e.target.value)}
      style={{ padding: "7px 10px", borderRadius: 9, border: "1px solid #1C2E4A", background: "#0E1A33", color: "#E8EEF8", fontSize: 12.5 }}>
      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}
    </select>
  );
}
