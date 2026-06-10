import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente Supabase del lado servidor (lee la sesión desde cookies). */
export async function getSupabase() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
        },
      },
    }
  );
}
