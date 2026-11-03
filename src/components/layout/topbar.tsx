"use client";

// Topo do app: cartão branco com a marca e o usuário, e abas em pílula logo
// abaixo. Mesma estrutura do Painel de Negócios — substituiu a barra lateral
// azul, que comia largura das tabelas do orçamento.

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

type TopBarProps = {
  userName: string;
  userRole: string;
};

export function TopBar({ userName, userRole }: TopBarProps) {
  const pathname = usePathname();
  const itens = [...navItems, ...(userRole === "ADMIN" ? adminItems : [])];

  return (
    <div className="print:hidden">
      <div className="w-full px-4 pt-2 sm:px-8">
        <div className="flex items-center justify-between gap-3 rounded-card bg-white p-1.5 pl-3 shadow-card">
          <Link href="/projetos" className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- arquivo estático em /public */}
            <img
              src="/logo-jcunha.webp"
              alt="JCunha Construtora"
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-ink">JCunha Construtora</p>
              <p className="truncate text-[11px] text-ink-3">Sistema de Orçamento</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <div className="hidden pr-2 text-right sm:block">
              <p className="text-xs font-semibold leading-tight text-ink">{userName}</p>
              <p className="text-[11px] text-ink-3">
                {userRole === "ADMIN" ? "Administrador" : "Membro"}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface hover:text-ink"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Abas: no celular deslizam de lado, sem barra de rolagem visível */}
      <nav className="sticky top-0 z-40 bg-surface">
        <div className="flex w-full gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:flex-wrap sm:px-8 [&::-webkit-scrollbar]:hidden">
          {itens.map(({ href, label, icon: Icon }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
                  ativo
                    ? "grad-brand text-white"
                    : "text-ink-2 hover:bg-white hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
