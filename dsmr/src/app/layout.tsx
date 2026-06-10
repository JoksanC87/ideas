import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System Maturity Radar",
  description: "Diagnóstico y benchmarking de madurez de Design Systems",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#F4F6FB" }}>{children}</body>
    </html>
  );
}
