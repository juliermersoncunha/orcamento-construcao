"use client";

import { useActionState } from "react";
import { createMaterial, type MaterialFormState } from "@/app/actions/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const initialState: MaterialFormState = {};

const CATEGORIES = [
  { value: "TERRAPLENAGEM", label: "Terraplenagem" },
  { value: "FUNDACAO", label: "Fundação" },
  { value: "ESTRUTURA", label: "Estrutura" },
  { value: "ALVENARIA", label: "Alvenaria" },
  { value: "LAJE", label: "Laje" },
  { value: "COBERTURA", label: "Cobertura" },
  { value: "ELETRICA", label: "Elétrica" },
  { value: "HIDRAULICA", label: "Hidráulica/Hidrossanitária" },
  { value: "REVESTIMENTO", label: "Revestimento" },
  { value: "PINTURA", label: "Pintura" },
  { value: "ESQUADRIA", label: "Esquadria/Acabamento" },
  { value: "OUTROS", label: "Outros" },
];

export type SupplierOption = { id: string; name: string };

export function MaterialForm({ suppliers = [] }: { suppliers?: SupplierOption[] }) {
  const [state, formAction, isPending] = useActionState(createMaterial, initialState);

  const supplierOptions = [
    { value: "", label: "— sem fornecedor —" },
    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adicionar Material</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="col-span-2">
              <Input
                id="name"
                name="name"
                label="Nome do material"
                placeholder="Ex: Cimento CP-II (50kg)"
                error={state.errors?.name?.[0]}
                required
              />
            </div>
            <Input
              id="unit"
              name="unit"
              label="Unidade"
              placeholder="sc, m², m, un, kg"
              error={state.errors?.unit?.[0]}
              required
            />
            <Input
              id="quantity"
              name="quantity"
              type="number"
              label="Quantidade"
              placeholder="Ex: 18 (balde 18 kg)"
              step="0.01"
              min="0"
              error={state.errors?.quantity?.[0]}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Input
              id="brand"
              name="brand"
              label="Marca / fabricante"
              placeholder="Ex: Suvinil"
              error={state.errors?.brand?.[0]}
            />
            <Select
              id="supplierId"
              name="supplierId"
              label="Fornecedor"
              options={supplierOptions}
              error={state.errors?.supplierId?.[0]}
            />
            <Input
              id="currentPrice"
              name="currentPrice"
              type="number"
              label="Preço (R$)"
              placeholder="0,00"
              step="0.01"
              min="0"
              error={state.errors?.currentPrice?.[0]}
            />
            <Input
              id="priceDate"
              name="priceDate"
              type="date"
              label="Data do preço"
              error={state.errors?.priceDate?.[0]}
            />
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select
                id="category"
                name="category"
                label="Categoria"
                options={CATEGORIES}
                error={state.errors?.category?.[0]}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              <Plus className="w-4 h-4" />
              {isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
