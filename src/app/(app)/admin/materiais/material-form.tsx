"use client";

import { useActionState, useState } from "react";
import { createMaterial, type MaterialFormState } from "@/app/actions/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package } from "lucide-react";
import { MATERIAL_CATEGORIES } from "@/lib/material-categories";

const initialState: MaterialFormState = {};
const CATEGORIES = MATERIAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

export type SupplierOption = { id: string; name: string };

export function MaterialForm({ suppliers = [] }: { suppliers?: SupplierOption[] }) {
  const [state, formAction, isPending] = useActionState(createMaterial, initialState);

  // Vendido em embalagem (balde 18 kg, caixa com 10 un…). Quando marcado, o
  // usuário informa o preço do pacote e quantas unidades vêm; o preço unitário
  // é calculado e vai para o banco como `currentPrice`, mantendo intocado o
  // cálculo do orçamento (que sempre multiplica quantidade × preço unitário).
  const [unit, setUnit] = useState("");
  // "Vendido em embalagem" só faz sentido quando o produto é vendido por
  // unidade — balde de 18 kg o usuário lança como "1 balde" com o preço do
  // balde, sem divisão nenhuma.
  const unidadeEhUn = unit.trim().toLowerCase() === "un";
  const [emPacote, setEmPacote] = useState(false);
  const [precoPacote, setPrecoPacote] = useState("");
  const [unidadesPacote, setUnidadesPacote] = useState("");
  const [precoUnit, setPrecoUnit] = useState("");

  const pacoteNum = Number((precoPacote || "").replace(",", ".")) || 0;
  const unidNum = Number((unidadesPacote || "").replace(",", ".")) || 0;
  const unitarioCalc = emPacote && pacoteNum > 0 && unidNum > 0 ? pacoteNum / unidNum : null;

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
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              error={state.errors?.unit?.[0]}
              required
            />
            <Input
              id="brand"
              name="brand"
              label="Marca / fabricante"
              placeholder="Ex: Suvinil"
              error={state.errors?.brand?.[0]}
            />
          </div>

          {/* Preço: avulso ou por embalagem (só quando a unidade é "un") */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 mb-4">
            {unidadeEhUn && (
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                <input
                  type="checkbox"
                  checked={emPacote}
                  onChange={(e) => setEmPacote(e.target.checked)}
                  className="rounded"
                />
                <Package className="w-4 h-4 text-gray-500" />
                Vendido em pacote com várias unidades
              </label>
            )}

            {unidadeEhUn && emPacote ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input
                  id="precoPacote"
                  type="number"
                  label="Preço do pacote (R$)"
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  value={precoPacote}
                  onChange={(e) => setPrecoPacote(e.target.value)}
                />
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  label="Unidades por pacote"
                  placeholder="Ex: 18"
                  step="0.01"
                  min="0"
                  value={unidadesPacote}
                  onChange={(e) => setUnidadesPacote(e.target.value)}
                  error={state.errors?.quantity?.[0]}
                />
                {/* Valor que vai para o banco. */}
                <input type="hidden" name="currentPrice" value={unitarioCalc ?? ""} />
                <div className="col-span-2 sm:col-span-2 flex items-end">
                  <p className="text-sm text-gray-700">
                    Preço por unidade:{" "}
                    <strong className={unitarioCalc ? "text-brand-700" : "text-gray-400"}>
                      {unitarioCalc
                        ? unitarioCalc.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : "preencha o pacote e as unidades"}
                    </strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input
                  id="currentPrice"
                  name="currentPrice"
                  type="number"
                  label="Preço por unidade (R$)"
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  value={precoUnit}
                  onChange={(e) => setPrecoUnit(e.target.value)}
                  error={state.errors?.currentPrice?.[0]}
                />
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  label="Quantidade da embalagem"
                  placeholder="opcional"
                  step="0.01"
                  min="0"
                  error={state.errors?.quantity?.[0]}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Select
              id="supplierId"
              name="supplierId"
              label="Fornecedor"
              options={supplierOptions}
              error={state.errors?.supplierId?.[0]}
            />
            <Input
              id="priceDate"
              name="priceDate"
              type="date"
              label="Data do preço"
              error={state.errors?.priceDate?.[0]}
            />
            <div className="col-span-2">
              <Select
                id="category"
                name="category"
                label="Categoria"
                options={CATEGORIES}
                error={state.errors?.category?.[0]}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || (emPacote && !unitarioCalc)}>
              <Plus className="w-4 h-4" />
              {isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
