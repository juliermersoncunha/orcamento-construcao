import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Mesma fonte do Painel de Negócios, para os dois sistemas terem a mesma cara.
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JCunha Construtora — Sistema de Orçamento",
  description: "Sistema de orçamento e levantamento de materiais para obras",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full ${montserrat.variable}`}>
      <body className="min-h-full bg-surface">{children}</body>
    </html>
  );
}
