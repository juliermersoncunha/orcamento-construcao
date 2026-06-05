"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HardHat } from "lucide-react";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center mb-4">
              <HardHat className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ObraFácil</h1>
            <p className="text-sm text-gray-500 mt-1">Sistema de Orçamento de Construção</p>
          </div>

          <form action={formAction} className="flex flex-col gap-4">
            {state.errors?.general && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.errors.general[0]}
              </div>
            )}

            <Input
              id="email"
              name="email"
              type="email"
              label="E-mail"
              placeholder="seu@email.com"
              error={state.errors?.email?.[0]}
              autoComplete="email"
              required
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="Senha"
              placeholder="••••••••"
              error={state.errors?.password?.[0]}
              autoComplete="current-password"
              required
            />

            <Button type="submit" disabled={isPending} className="mt-2 w-full" size="lg">
              {isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
