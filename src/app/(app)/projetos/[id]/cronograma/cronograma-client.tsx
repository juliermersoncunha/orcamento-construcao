"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Sparkles, Package,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STAGE_STATUS } from "@/lib/schedule-template";
import {
  applyScheduleTemplate, addScheduleStage, updateScheduleStage,
  deleteScheduleStage, moveScheduleStage, addStageMaterial, updateStageMaterial,
  addScheduleTask, toggleScheduleTask, renameScheduleTask, deleteScheduleTask,
  fillTemplateTasks,
} from "@/app/actions/schedule";

export type CatalogMaterial = {
  id: string; name: string; unit: string; currentPrice: number; category: string;
};

export type StageMaterialRow = {
  rowId: string; materialId: string; name: string; unit: string;
  currentPrice: number; quantity: number;
};

export type StageTask = { id: string; name: string; done: boolean };

export type Stage = {
  id: string; order: number; name: string;
  deliverable: string | null; dependsOn: string | null;
  days: number; startDate: string | null; status: string; notes: string | null;
  tasks: StageTask[];
  materials: StageMaterialRow[];
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const inputClass =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const STATUS_STYLE: Record<string, string> = {
  PENDENTE: "bg-gray-100 text-gray-600",
  EM_ANDAMENTO: "bg-brand-100 text-brand-800",
  CONCLUIDA: "bg-green-100 text-green-700",
};

export function CronogramaClient({
  projectId, stages, materials,
}: {
  projectId: string; stages: Stage[]; materials: CatalogMaterial[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStage, setNewStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  const totalDias = stages.reduce((s, x) => s + x.days, 0);
  const totalMaterial = stages.reduce(
    (s, x) => s + x.materials.reduce((m, r) => m + r.quantity * r.currentPrice, 0), 0);
  const concluidas = stages.filter((s) => s.status === "CONCLUIDA").length;
  // So oferece o preenchimento enquanto houver etapa sem nenhum item.
  const semPassoAPasso = stages.some((s) => s.tasks.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {stages.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Nenhuma etapa cadastrada</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                Comece do modelo sugerido para casa térrea e ajuste o que quiser, ou crie
                suas próprias etapas do zero. Nada aqui é fixo.
              </p>
            </div>
            <Button onClick={() => run(() => applyScheduleTemplate(projectId))} disabled={isPending}>
              <Sparkles className="w-4 h-4" />
              Aplicar modelo sugerido (17 etapas)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700">
            <strong>{stages.length}</strong> etapas
          </span>
          <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700">
            <strong>{totalDias.toLocaleString("pt-BR")}</strong> dias úteis
          </span>
          <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700">
            <strong>{concluidas}</strong> de {stages.length} concluídas
          </span>
          {totalMaterial > 0 && (
            <span className="rounded-md bg-amber-50 px-3 py-1.5 text-amber-800">
              Material lançado: <strong>{brl(totalMaterial)}</strong>
            </span>
          )}
          {semPassoAPasso && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => fillTemplateTasks(projectId))}
            >
              <Sparkles className="w-4 h-4" />
              Preencher passo a passo sugerido
            </Button>
          )}
        </div>
      )}

      {stages.map((stage, i) => (
        <StageCard
          key={stage.id}
          stage={stage}
          index={i}
          isFirst={i === 0}
          isLast={i === stages.length - 1}
          materials={materials}
          isPending={isPending}
          run={run}
        />
      ))}

      {/* Nova etapa */}
      <Card>
        <CardContent className="py-4 flex items-end gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="novaEtapa" className="text-sm font-medium text-gray-700">
              Nova etapa
            </label>
            <input
              id="novaEtapa"
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              placeholder="Ex.: Impermeabilização da caixa d'água"
              className={`bg-white ${inputClass}`}
            />
          </div>
          <Button
            variant="outline"
            disabled={isPending || newStage.trim().length < 2}
            onClick={() => run(async () => {
              const r = await addScheduleStage(projectId, newStage);
              if (!r?.error) setNewStage("");
              return r;
            })}
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StageCard({
  stage, index, isFirst, isLast, materials, isPending, run,
}: {
  stage: Stage; index: number; isFirst: boolean; isLast: boolean;
  materials: CatalogMaterial[]; isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const [open, setOpen] = useState(false);

  // Edições salvam no blur: o usuário digita à vontade e o servidor só é
  // chamado quando ele sai do campo.
  function save(input: Parameters<typeof updateScheduleStage>[1]) {
    run(() => updateScheduleStage(stage.id, input));
  }

  const custo = stage.materials.reduce((s, r) => s + r.quantity * r.currentPrice, 0);

  // O servidor leva um instante para repintar a pagina inteira, e numa checklist
  // marcam-se varios itens seguidos. O estado visual anda na frente e so cede
  // quando a resposta chega. Fica aqui, e nao na lista, para o contador do
  // cabecalho nunca discordar dos riscos nos itens.
  const [otim, setOtim] = useState<Record<string, boolean>>({});
  const estaFeito = (t: StageTask) => otim[t.id] ?? t.done;
  const feitas = stage.tasks.filter(estaFeito).length;

  function alternarTask(t: StageTask, done: boolean) {
    setOtim((o) => ({ ...o, [t.id]: done }));
    run(async () => {
      const r = await toggleScheduleTask(t.id, done);
      setOtim((o) => {
        const { [t.id]: _removido, ...resto } = o;
        return resto;
      });
      return r;
    });
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Mover para cima"
              disabled={isFirst || isPending}
              onClick={() => run(() => moveScheduleStage(stage.id, "up"))}
              className="text-gray-400 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-400"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Mover para baixo"
              disabled={isLast || isPending}
              onClick={() => run(() => moveScheduleStage(stage.id, "down"))}
              className="text-gray-400 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-gray-400"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <span className="w-7 h-7 shrink-0 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>

          <input
            defaultValue={stage.name}
            onBlur={(e) => { if (e.target.value !== stage.name) save({ name: e.target.value }); }}
            className="flex-1 font-medium text-gray-900 bg-transparent rounded px-2 py-1 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <select
            defaultValue={stage.status}
            onChange={(e) => save({ status: e.target.value })}
            className={`rounded-md px-2 py-1 text-xs font-medium border-0 ${STATUS_STYLE[stage.status] ?? ""}`}
          >
            {STAGE_STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1 px-2"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
            {stage.tasks.length > 0
              ? `${feitas}/${stage.tasks.length} itens`
              : stage.materials.length > 0
              ? `${stage.materials.length} material(is)`
              : "detalhes"}
          </button>

          <button
            type="button"
            aria-label="Excluir etapa"
            disabled={isPending}
            onClick={() => run(() => deleteScheduleStage(stage.id))}
            className="text-gray-300 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {open && (
          <div className="mt-4 pl-11 pr-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="O que entrega">
                <input
                  defaultValue={stage.deliverable ?? ""}
                  onBlur={(e) => save({ deliverable: e.target.value })}
                  className={`w-full bg-white ${inputClass}`}
                />
              </Field>
              <Field label="Depende de">
                <input
                  defaultValue={stage.dependsOn ?? ""}
                  onBlur={(e) => save({ dependsOn: e.target.value })}
                  className={`w-full bg-white ${inputClass}`}
                />
              </Field>
              <Field label="Duração (dias úteis)">
                <input
                  type="number" min="0" step="any"
                  defaultValue={stage.days}
                  onBlur={(e) => save({ days: Number(e.target.value) })}
                  className={`w-full bg-white ${inputClass}`}
                />
              </Field>
              <Field label="Início previsto">
                <input
                  type="date"
                  defaultValue={stage.startDate ?? ""}
                  onBlur={(e) => save({ startDate: e.target.value || null })}
                  className={`w-full bg-white ${inputClass}`}
                />
              </Field>
            </div>

            <Field label="Observações">
              <textarea
                defaultValue={stage.notes ?? ""}
                onBlur={(e) => save({ notes: e.target.value })}
                rows={2}
                className={`w-full bg-white ${inputClass}`}
              />
            </Field>

            <TaskList
              stageId={stage.id}
              tasks={stage.tasks}
              feitas={feitas}
              estaFeito={estaFeito}
              alternar={alternarTask}
              isPending={isPending}
              run={run}
            />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Materiais desta etapa</p>
                {custo > 0 && (
                  <span className="text-xs text-gray-500">· {brl(custo)}</span>
                )}
              </div>

              {stage.materials.length > 0 && (
                <table className="w-full text-sm mb-3">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500">
                      <th className="text-left font-medium py-1">Material</th>
                      <th className="text-center font-medium py-1 w-20">Un</th>
                      <th className="text-center font-medium py-1 w-24">Qtd</th>
                      <th className="text-right font-medium py-1 w-28">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {stage.materials.map((m) => (
                      <tr key={m.rowId} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-800">{m.name}</td>
                        <td className="py-1.5 text-center text-gray-500">{m.unit}</td>
                        <td className="py-1.5 text-center">
                          <input
                            type="number" min="0" step="any"
                            defaultValue={m.quantity}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== m.quantity) run(() => updateStageMaterial(m.rowId, v));
                            }}
                            className="w-20 text-center rounded border border-gray-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </td>
                        <td className="py-1.5 text-right text-gray-800">
                          {m.currentPrice > 0
                            ? brl(m.quantity * m.currentPrice)
                            : <span className="text-amber-600 text-xs">sem preço</span>}
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            type="button"
                            aria-label="Remover material"
                            onClick={() => run(() => updateStageMaterial(m.rowId, 0))}
                            className="text-gray-300 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <MaterialPicker stageId={stage.id} materials={materials} isPending={isPending} run={run} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

// Passo a passo da etapa: cada item e marcado conforme sai na obra. O nome
// edita no proprio lugar e salva ao sair do campo.
function TaskList({
  stageId, tasks, feitas, estaFeito, alternar, isPending, run,
}: {
  stageId: string; tasks: StageTask[]; feitas: number;
  estaFeito: (t: StageTask) => boolean;
  alternar: (t: StageTask, done: boolean) => void;
  isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const [novo, setNovo] = useState("");

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">Passo a passo</p>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-500">· {feitas} de {tasks.length}</span>
        )}
      </div>

      {tasks.length > 0 && (
        <ul className="mb-2 divide-y divide-gray-100 border-y border-gray-100">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={estaFeito(t)}
                onChange={(e) => alternar(t, e.target.checked)}
                className="w-4 h-4 rounded accent-brand-600 shrink-0"
              />
              <input
                defaultValue={t.name}
                onBlur={(e) => {
                  if (e.target.value.trim() !== t.name) {
                    run(() => renameScheduleTask(t.id, e.target.value));
                  }
                }}
                className={`flex-1 bg-transparent rounded px-1 py-0.5 text-sm hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  estaFeito(t) ? "line-through text-gray-400" : "text-gray-800"
                }`}
              />
              <button
                type="button"
                aria-label="Excluir item"
                disabled={isPending}
                onClick={() => run(() => deleteScheduleTask(t.id))}
                className="text-gray-300 hover:text-red-600 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && novo.trim().length >= 2) {
              e.preventDefault();
              run(async () => {
                const r = await addScheduleTask(stageId, novo);
                if (!r?.error) setNovo("");
                return r;
              });
            }
          }}
          placeholder="Novo item do passo a passo…"
          className={`flex-1 bg-white ${inputClass}`}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || novo.trim().length < 2}
          onClick={() => run(async () => {
            const r = await addScheduleTask(stageId, novo);
            if (!r?.error) setNovo("");
            return r;
          })}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Seletor de material da etapa: a lista abre já preenchida com o catálogo ao
// receber foco — não é preciso adivinhar o nome. Digitar filtra tudo.
function MaterialPicker({
  stageId, materials, isPending, run,
}: {
  stageId: string; materials: CatalogMaterial[]; isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const [search, setSearch] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? materials.filter((m) => m.name.toLowerCase().includes(q)) : materials;
    return list.slice(0, 30);
  }, [search, materials]);

  const chosen = materials.find((m) => m.id === materialId) ?? null;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1 flex-1 relative">
          <label className="text-xs font-medium text-gray-600">Adicionar material</label>
          <input
            value={chosen ? chosen.name : search}
            onChange={(e) => { setSearch(e.target.value); setMaterialId(""); setOpen(true); }}
            onFocus={() => { setOpen(true); if (chosen) setMaterialId(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Clique para ver os materiais cadastrados…"
            className={`w-full bg-white ${inputClass}`}
            autoComplete="off"
          />
          {open && !chosen && matches.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-gray-200 bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto shadow-lg">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setMaterialId(m.id); setSearch(""); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 flex items-center justify-between gap-3"
                >
                  <span className="text-gray-800">{m.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {m.unit} ·{" "}
                    {m.currentPrice > 0
                      ? brl(m.currentPrice)
                      : <span className="text-amber-600">sem preço</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 w-24">
          <label className="text-xs font-medium text-gray-600">
            Qtd {chosen && <span className="text-gray-400">({chosen.unit})</span>}
          </label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className={`w-full bg-white ${inputClass}`}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={isPending || !materialId || !quantity}
          onClick={() => run(async () => {
            const r = await addStageMaterial(stageId, {
              materialId,
              quantity: Number(quantity.replace(",", ".")),
            });
            if (!r?.error) { setMaterialId(""); setSearch(""); setQuantity(""); }
            return r;
          })}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
