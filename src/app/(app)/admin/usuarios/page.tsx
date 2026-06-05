import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-600" />
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        </div>
        <span className="text-sm text-gray-500 mt-0.5">
          {users.length} cadastrado{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      <UsuariosClient
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session.userId}
      />
    </div>
  );
}
