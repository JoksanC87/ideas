import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase/server";
import OrgSwitcher from "@/components/OrgSwitcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeOrg = (await cookies()).get("active_org")?.value;

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", background: "#0C1A30", color: "#E8EEF8" }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>Design System Maturity Radar</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <OrgSwitcher initialOrg={activeOrg} />
          <span style={{ fontSize: 12, color: "#7E93B5" }}>{user.email}</span>
        </div>
      </header>
      {children}
    </div>
  );
}
