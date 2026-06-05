import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ObraFácil — Orçamento de Construção",
  description: "Sistema de orçamento e levantamento de materiais para obras",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-gray-50">{children}</body>
    </html>
  );
}
