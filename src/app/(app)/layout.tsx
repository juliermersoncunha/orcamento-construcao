import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.name} userRole={session.role} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
