"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Sparkles, Package,
  ListChecks, CalendarRange, List, GanttChart, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STAGE_STATUS } from "@/lib/schedule-template";
import {
  applyScheduleTemplate, addScheduleStage, updateScheduleStage,
  deleteScheduleStage, moveScheduleStage, addStageMaterial, updateStageMaterial,
  addScheduleTask, setScheduleTaskStatus, renameScheduleTask, deleteScheduleTask,
  fillTemplateTasks, setScheduleStart, setScheduleEnd, toggleWeekStage,
} from "@/app/actions/schedule";
import { dataBR, diasUteisEntre } from "@/lib/schedule-weeks";
import { semanasPorEtapa, semanasDoPeriodo } from "@/lib/schedule-plan";
import { Programacao } from "./programacao";
import { Gantt } from "./gantt";

export type CatalogMaterial = {
  id: string; name: string; unit: string; category: string;
};

export type StageMaterialRow = {
  rowId: string; materialId: string; name: string; unit: string;
  quantity: number; purchased: boolean;
};

export type StageTask = { id: string; name: string; done: boolean; status: string };

export type Stage = {
  id: string; order: number; name: string;
  deliverable: string | null; dependsOn: string | null;
  days: number; startDate: string | null; status: string; notes: string | null;
  realStart: string | null; realEnd: string | null;
  baselineStart: string | null; baselineEnd: string | null;
  tasks: StageTask[];
  materials: StageMaterialRow[];
};

const inputClass =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const STATUS_STYLE: Record<string, string> = {
  PENDENTE: "bg-gray-100 text-gray-600",
  EM_ANDAMENTO: "bg-brand-100 text-brand-800",
  CONCLUIDA: "bg-green-100 text-green-700",
};

export function CronogramaClient({
  projectId, scheduleStart, scheduleEnd, baselineAt, weekStages, weekMaterials, weekPurchases, stages, materials,
}: {
  projectId: string; scheduleStart: string | null; scheduleEnd: string | null;
  baselineAt: string | null;
  weekStages: { stageId: string; weekStart: string }[];
  weekMaterials: { weekStart: string; materialId: string; name: string; unit: string; quantity: number; stageId: string | null }[];
  weekPurchases: string[]; // "semana|materialId" já comprados
  stages: Stage[]; materials: CatalogMaterial[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStage, setNewStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<"lista" | "semanas" | "gantt">("lista");

  // Etapas no formato das funções de planejamento (programação e Gantt).
  const planStages = useMemo(
    () => stages.map((s) => ({
      id: s.id, name: s.name, status: s.status, days: s.days, startDate: s.startDate,
      realStart: s.realStart, realEnd: s.realEnd,
      baselineStart: s.baselineStart, baselineEnd: s.baselineEnd,
      materials: s.materials.map((m) => ({ materialId: m.materialId, name: m.name, unit: m.unit, quantity: m.quantity })),
    })),
    [stages]
  );

  // Grade de semanas do início ao fim previsto, e em quais semanas cada etapa está.
  const gradeSemanas = useMemo(() => semanasDoPeriodo(scheduleStart, scheduleEnd), [scheduleStart, scheduleEnd]);
  const semanasDaEtapa = useMemo(() => semanasPorEtapa(weekStages), [weekStages]);
  const semSemana = stages.filter((s) => (semanasDaEtapa.get(s.id) ?? []).length === 0).length;
  const programou = semSemana < stages.length;

  // O fim previsto da obra é o que o usuário digita — não é calculado. Aqui só
  // se mostra o tamanho do período que ele definiu.
  const diasDaObra = scheduleStart && scheduleEnd && scheduleEnd >= scheduleStart
    ? diasUteisEntre(scheduleStart, scheduleEnd) + 1
    : null;

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  const totalDias = stages.reduce((s, x) => s + x.days, 0);
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
          {programou ? (
            <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700">
              <strong>{new Set(weekStages.map((w) => w.weekStart)).size}</strong> semanas programadas
            </span>
          ) : (
            <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700" title="Soma das durações, como se as etapas não se sobrepusessem">
              <strong>{totalDias.toLocaleString("pt-BR")}</strong> dias úteis
            </span>
          )}
          {programou && semSemana > 0 && (
            <span className="rounded-md bg-amber-50 px-3 py-1.5 text-amber-800" title="Etapas sem semana não entram no término previsto">
              <strong>{semSemana}</strong> {semSemana === 1 ? "etapa sem semana" : "etapas sem semana"}
            </span>
          )}
          <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700">
            <strong>{concluidas}</strong> de {stages.length} concluídas
          </span>
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

      {stages.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setVista("lista")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                vista === "lista" ? "bg-brand-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <List className="w-4 h-4" />
              Etapas
            </button>
            <button
              type="button"
              onClick={() => setVista("semanas")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 border-l border-gray-300 ${
                vista === "semanas" ? "bg-brand-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              Programação
            </button>
            <button
              type="button"
              onClick={() => setVista("gantt")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 border-l border-gray-300 ${
                vista === "gantt" ? "bg-brand-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <GanttChart className="w-4 h-4" />
              Cronograma
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            Início da obra
            <input
              type="date"
              defaultValue={scheduleStart ?? ""}
              onChange={(e) => run(() => setScheduleStart(projectId, e.target.value || null))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            Fim previsto
            <input
              type="date"
              defaultValue={scheduleEnd ?? ""}
              onChange={(e) => run(() => setScheduleEnd(projectId, e.target.value || null))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          {diasDaObra !== null && (
            <span className="text-sm text-gray-500">
              {gradeSemanas.length} semanas · {diasDaObra} dias úteis
            </span>
          )}
        </div>
      )}

      {vista === "semanas" && (
        <Programacao
          projectId={projectId}
          inicio={scheduleStart}
          fim={scheduleEnd}
          stages={planStages}
          weekStages={weekStages}
          weekMaterials={weekMaterials}
          weekPurchases={weekPurchases}
          catalogo={materials}
          isPending={isPending}
          run={run}
        />
      )}

      {vista === "gantt" && (
        <Gantt
          projectId={projectId}
          inicio={scheduleStart}
          fim={scheduleEnd}
          stages={planStages}
          weekStages={weekStages}
          baselineAt={baselineAt}
          isPending={isPending}
          run={run}
        />
      )}

      {vista === "lista" && stages.map((stage, i) => (
        <StageCard
          key={stage.id}
          stage={stage}
          index={i}
          isFirst={i === 0}
          isLast={i === stages.length - 1}
          materials={materials}
          isPending={isPending}
          run={run}
          projectId={projectId}
          gradeSemanas={gradeSemanas}
          semanasDaEtapa={semanasDaEtapa.get(stage.id) ?? []}
        />
      ))}

      {/* Nova etapa — só na lista; na visão por semana seria ruído */}
      {vista === "lista" && (
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
      )}
    </div>
  );
}

function StageCard({
  stage, index, isFirst, isLast, materials, isPending, run,
  projectId, gradeSemanas, semanasDaEtapa,
}: {
  projectId: string;
  gradeSemanas: string[];
  semanasDaEtapa: string[];
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


  // O servidor leva um instante para repintar a pagina inteira, e numa checklist
  // marcam-se varios itens seguidos. O estado visual anda na frente e so cede
  // quando a resposta chega. Fica aqui, e nao na lista, para o contador do
  // cabecalho nunca discordar dos riscos nos itens.
  const [otim, setOtim] = useState<Record<string, string>>({});
  const statusDe = (t: StageTask) => otim[t.id] ?? t.status;
  const estaFeito = (t: StageTask) => statusDe(t) === "CONCLUIDA";
  const feitas = stage.tasks.filter(estaFeito).length;

  function alternarTask(t: StageTask, status: string) {
    setOtim((o) => ({ ...o, [t.id]: status }));
    run(async () => {
      const r = await setScheduleTaskStatus(t.id, status);
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
              <div className="sm:col-span-2">
                <SemanasDaEtapa
                  projectId={projectId}
                  stageId={stage.id}
                  grade={gradeSemanas}
                  marcadas={semanasDaEtapa}
                  isPending={isPending}
                  run={run}
                />
              </div>
              <Field label="Início real">
                <input
                  type="date"
                  defaultValue={stage.realStart ?? ""}
                  onBlur={(e) => { if ((e.target.value || null) !== stage.realStart) save({ realStart: e.target.value || null }); }}
                  className={`w-full bg-white ${inputClass}`}
                />
              </Field>
              <Field label="Fim real">
                <input
                  type="date"
                  defaultValue={stage.realEnd ?? ""}
                  onBlur={(e) => { if ((e.target.value || null) !== stage.realEnd) save({ realEnd: e.target.value || null }); }}
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
              statusDe={statusDe}
              alternar={alternarTask}
              isPending={isPending}
              run={run}
            />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Materiais desta etapa</p>
                {stage.materials.length > 0 && (
                  <span className="text-xs text-gray-400">
                    · compra e lista de compras ficam na aba Programação
                  </span>
                )}
              </div>

              {stage.materials.length > 0 && (
                <table className="w-full text-sm mb-3">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500">
                      <th className="text-left font-medium py-1">Material</th>
                      <th className="text-center font-medium py-1 w-20">Un</th>
                      <th className="text-center font-medium py-1 w-24">Qtd</th>
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
  stageId, tasks, feitas, statusDe, alternar, isPending, run,
}: {
  stageId: string; tasks: StageTask[]; feitas: number;
  statusDe: (t: StageTask) => string;
  alternar: (t: StageTask, status: string) => void;
  isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const [novo, setNovo] = useState("");
  const emAndamento = tasks.filter((t) => statusDe(t) === "EM_ANDAMENTO").length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">Passo a passo</p>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-500">
            · {feitas} de {tasks.length}
            {emAndamento > 0 && <span className="text-brand-600"> · {emAndamento} em andamento</span>}
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <ul className="mb-2 divide-y divide-gray-100 border-y border-gray-100">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={statusDe(t) === "CONCLUIDA"}
                onChange={(e) => alternar(t, e.target.checked ? "CONCLUIDA" : "PENDENTE")}
                title="Concluído"
                className="w-4 h-4 rounded accent-brand-600 shrink-0"
              />
              <button
                type="button"
                onClick={() => alternar(t, statusDe(t) === "EM_ANDAMENTO" ? "PENDENTE" : "EM_ANDAMENTO")}
                aria-pressed={statusDe(t) === "EM_ANDAMENTO"}
                title={statusDe(t) === "EM_ANDAMENTO" ? "Em andamento — clique para voltar a pendente" : "Marcar como em andamento"}
                className={`shrink-0 rounded p-0.5 ${
                  statusDe(t) === "EM_ANDAMENTO" ? "bg-brand-100 text-brand-700" : "text-gray-300 hover:text-brand-600"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              <input
                defaultValue={t.name}
                onBlur={(e) => {
                  if (e.target.value.trim() !== t.name) {
                    run(() => renameScheduleTask(t.id, e.target.value));
                  }
                }}
                className={`flex-1 bg-transparent rounded px-1 py-0.5 text-sm hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                  statusDe(t) === "CONCLUIDA" ? "line-through text-gray-400" : "text-gray-800"
                }`}
              />
              {statusDe(t) === "EM_ANDAMENTO" && (
                <span className="shrink-0 rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">
                  em andamento
                </span>
              )}
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
                  <span className="text-xs text-gray-500 shrink-0">{m.unit}</span>
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

// Em quais semanas da programação a etapa acontece. É daqui que sai o previsto
// dela: da segunda da primeira semana marcada à sexta da última. Marcar aqui é
// o mesmo que incluir a etapa na semana pela aba Programação — os dois lados
// gravam no mesmo lugar.
function SemanasDaEtapa({
  projectId, stageId, grade, marcadas, isPending, run,
}: {
  projectId: string;
  stageId: string;
  grade: string[];
  marcadas: string[];
  isPending: boolean;
  run: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  const [otim, setOtim] = useState<Record<string, boolean>>({});
  const marcada = (w: string) => otim[w] ?? marcadas.includes(w);
  const ativas = grade.filter(marcada);

  function alternar(w: string) {
    const nova = !marcada(w);
    setOtim((o) => ({ ...o, [w]: nova }));
    run(async () => {
      const r = await toggleWeekStage(projectId, stageId, w, nova);
      setOtim((o) => {
        const { [w]: _x, ...resto } = o;
        return resto;
      });
      return r;
    });
  }

  const sexta = (seg: string) => {
    const d = new Date(`${seg}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 4);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">Semanas da programação</label>
      {grade.length === 0 ? (
        <p className="text-xs text-gray-400">
          Informe o início e o fim previsto da obra, no topo, para escolher as semanas.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {grade.map((w, i) => (
              <button
                key={w}
                type="button"
                disabled={isPending && otim[w] !== undefined}
                onClick={() => alternar(w)}
                title={`Semana ${i + 1}: ${dataBR(w)} a ${dataBR(sexta(w))}`}
                className={`min-w-[2.25rem] rounded px-1.5 py-1 text-xs font-medium border ${
                  marcada(w)
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-brand-400"
                }`}
              >
                S{i + 1}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {ativas.length === 0
              ? "Nenhuma semana marcada."
              : `Previsto: ${dataBR(ativas[0])} a ${dataBR(sexta(ativas[ativas.length - 1]))} · ${ativas.length} ${ativas.length === 1 ? "semana" : "semanas"}`}
          </p>
        </>
      )}
    </div>
  );
}
