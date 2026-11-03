import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopBar userName={session.name} userRole={session.role} />
      {/* Cada página traz o próprio respiro (p-8); aqui só o espaço do rodapé. */}
      <main className="flex-1 pb-12 print:pb-0">{children}</main>
    </div>
  );
}
