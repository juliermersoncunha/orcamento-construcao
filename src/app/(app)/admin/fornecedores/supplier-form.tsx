"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSupplier, type SupplierFormState } from "@/app/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const initialState: SupplierFormState = {};

export function SupplierForm() {
  const [state, formAction, isPending] = useActionState(createSupplier, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa os campos depois de cadastrar, para encadear vários fornecedores.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Adicionar Fornecedor</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input id="name" name="name" label="Nome do fornecedor" placeholder="Depósito São José" />
            <Input id="phone" name="phone" label="Telefone" placeholder="(00) 00000-0000" />
            <Input id="notes" name="notes" label="Observação" placeholder="Entrega grátis acima de R$ 500" />
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              <Plus className="w-4 h-4 mr-1" />
              {isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
