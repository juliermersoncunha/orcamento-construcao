"use client";

import { useActionState, useTransition, useState } from "react";
import {
  createUser,
  toggleUserActive,
  changeUserRole,
  resetUserPassword,
  type UserFormState,
  type ResetPasswordState,
} from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, KeyRound, ChevronDown, CheckCircle2 } from "lucide-react";
import { Role } from "@/generated/prisma";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

// ── Formulário de criação ────────────────────────────────────────────────────

function CreateUserForm() {
  const [state, formAction, isPending] = useActionState<UserFormState, FormData>(
    createUser,
    {}
  );

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-amber-600" />
          Novo Usuário
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.success && (
          <div className="flex items-center gap-2 mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Usuário criado com sucesso!
          </div>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          {state.errors?.email?.[0] === "E-mail já cadastrado." && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.errors.email[0]}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              name="name"
              label="Nome completo"
              placeholder="João Silva"
              error={state.errors?.name?.[0]}
              required
            />
            <Input
              id="email"
              name="email"
              type="email"
              label="E-mail"
              placeholder="joao@email.com"
              error={state.errors?.email?.[0] !== "E-mail já cadastrado." ? state.errors?.email?.[0] : undefined}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="password"
              name="password"
              type="password"
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              error={state.errors?.password?.[0]}
              required
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="role" className="text-sm font-medium text-gray-700">
                Perfil
              </label>
              <select
                id="role"
                name="role"
                defaultValue="MEMBER"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="MEMBER">Membro</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              <UserPlus className="w-4 h-4" />
              {isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Reset de senha inline ────────────────────────────────────────────────────

function ResetPasswordForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    resetUserPassword,
    {}
  );

  return (
    <form action={formAction} className="flex items-end gap-2 mt-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex-1">
        <Input
          id={`pwd-${userId}`}
          name="newPassword"
          type="password"
          label="Nova senha"
          placeholder="Mínimo 6 caracteres"
          error={state.errors?.newPassword?.[0]}
          required
        />
      </div>
      <div className="flex gap-2 pb-0.5">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── Linha de usuário ─────────────────────────────────────────────────────────

function UserRow({ user, currentUserId }: { user: UserRow; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [showReset, setShowReset] = useState(false);
  const isMe = user.id === currentUserId;

  function handleToggleActive() {
    startTransition(() => toggleUserActive(user.id, !user.active));
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value as Role;
    startTransition(() => changeUserRole(user.id, role));
  }

  return (
    <div className={`py-4 border-b border-gray-100 last:border-0 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{user.name}</p>
            {isMe && (
              <Badge variant="outline" className="text-xs shrink-0">Você</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Desde {new Date(user.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Papel */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Perfil</label>
            <select
              value={user.role}
              onChange={handleRoleChange}
              disabled={isMe || pending}
              className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5 items-center">
            <label className="text-xs text-gray-500">Status</label>
            <button
              onClick={handleToggleActive}
              disabled={isMe || pending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                user.active ? "bg-green-500" : "bg-gray-300"
              }`}
              title={user.active ? "Desativar usuário" : "Ativar usuário"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  user.active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">{user.active ? "Ativo" : "Inativo"}</span>
          </div>

          {/* Reset senha */}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Senha</label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReset(!showReset)}
              className="text-xs"
            >
              <KeyRound className="w-3 h-3" />
              Resetar
            </Button>
          </div>
        </div>
      </div>

      {showReset && (
        <ResetPasswordForm userId={user.id} onClose={() => setShowReset(false)} />
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function UsuariosClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  return (
    <>
      <CreateUserForm />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Equipe cadastrada</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {users.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Nenhum usuário cadastrado.</p>
          ) : (
            <div>
              {users.map((user) => (
                <UserRow key={user.id} user={user} currentUserId={currentUserId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
