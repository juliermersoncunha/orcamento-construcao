"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  FolderOpen,
  Package,
  Users,
  LogOut,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/projetos", label: "Projetos", icon: FolderOpen },
];

const adminItems = [
  { href: "/admin/materiais", label: "Materiais e Preços", icon: Package },
  { href: "/admin/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/admin/premissas", label: "Premissas de Cálculo", icon: SlidersHorizontal },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
];

type SidebarProps = {
  userName: string;
  userRole: string;
};

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-brand-900 text-white flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-brand-800">
        {/* A logo traz a marca; o fundo claro existe porque ela foi desenhada
            sobre branco e some contra o azul da barra. */}
        <div className="rounded-lg bg-white px-3 py-2">
          <img
            src="/logo-jcunha.webp"
            alt="JCunha Construtora"
            className="w-full h-auto"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Sistema de Orçamento</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-amber-500 text-brand-950"
                : "text-gray-300 hover:bg-brand-800 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {userRole === "ADMIN" && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administração
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-amber-500 text-brand-950"
                    : "text-gray-300 hover:bg-brand-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-brand-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-gray-400">
            {userRole === "ADMIN" ? "Administrador" : "Membro"}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-brand-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
