"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Plus, Trash2, Pencil, Check, X, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  RENOVATION_SERVICES, SERVICE_BY_KEY, SERVICE_GROUPS, ISSUE_CATEGORIES, SEVERITIES,
  medidaSugerida, materiaisDosServicos,
} from "@/lib/renovation-services";
import {
  addRenovationIssue, updateRenovationIssue, deleteRenovationIssue,
  addRenovationService, updateRenovationService, deleteRenovationService,
  finishRenovationDiagnosis,
} from "@/app/actions/renovation";

type Room = { id: string; name: string; width: number; length: number; height: number };
type Issue = { id: string; roomId: string | null; category: string; severity: string; description: string | null };
type Service = {
  id: string; roomId: string | null; issueId: string | null; serviceKey: string;
  label: string | null; quantity: number; notes: string | null;
};
type Run = (fn: () => Promise<{ error?: string } | void>) => void;

const campo =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function Step3Diagnostico({ project }: { project: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rooms: Room[] = project.rooms ?? [];
  const issues: Issue[] = project.renovationIssues ?? [];
  const services: Service[] = project.renovationServices ?? [];

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r && "error" in r && r.error) { setError(r.error); return; }
      router.refresh();
    });
  }

  // "Geral" agrupa o que não pertence a um cômodo (fachada, telhado, quintal).
  const grupos: { room: Room | null }[] = [...rooms.map((r) => ({ room: r })), { room: null }];
  const materiais = useMemo(() => materiaisDosServicos(services), [services]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-amber-700" />
            </div>
            <CardTitle>Etapa 3 — Diagnóstico e serviços</CardTitle>
          </div>
          <CardDescription>
            Registre o que encontrou na vistoria de cada ambiente e lance os serviços que resolvem cada
            problema. Serviços com medida geram o material sozinhos; os demais você completa na etapa
            Materiais.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {rooms.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-gray-600">
            Cadastre os ambientes na etapa 2 para lançar o diagnóstico por cômodo. Enquanto isso, use o
            cartão <strong>Geral</strong> abaixo.
          </CardContent>
        </Card>
      )}

      {grupos.map(({ room }) => (
        <AmbienteCard
          key={room?.id ?? "geral"}
          projectId={project.id}
          room={room}
          issues={issues.filter((i) => i.roomId === (room?.id ?? null))}
          services={services.filter((s) => s.roomId === (room?.id ?? null))}
          isPending={isPending}
          run={run}
        />
      ))}

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-700">
            <strong>{issues.length}</strong> {issues.length === 1 ? "problema" : "problemas"} ·{" "}
            <strong>{services.length}</strong> {services.length === 1 ? "serviço" : "serviços"} ·{" "}
            <strong>{materiais.length}</strong> materiais gerados
          </span>
          <div className="flex-1" />
          {(issues.length > 0 || services.length > 0) && (
            <a href={`/projetos/${project.id}/diagnostico`} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">
              Ver relatório
            </a>
          )}
          <Button
            disabled={isPending || services.length === 0}
            onClick={() => run(() => finishRenovationDiagnosis(project.id))}
            title={services.length === 0 ? "Lance ao menos um serviço" : undefined}
          >
            Próxima etapa — Materiais
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AmbienteCard({
  projectId, room, issues, services, isPending, run,
}: {
  projectId: string; room: Room | null; issues: Issue[]; services: Service[];
  isPending: boolean; run: Run;
}) {
  const [cat, setCat] = useState("");
  const [sev, setSev] = useState("MEDIA");
  const [desc, setDesc] = useState("");
  const semProblema = services.filter((s) => !s.issueId || !issues.some((i) => i.id === s.issueId));

  return (
    <Card>
      <CardContent className="py-4 flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-gray-900">{room?.name ?? "Geral / área externa"}</p>
          {room && (
            <span className="text-xs text-gray-400">
              {fmt(room.width)} × {fmt(room.length)} m · piso {fmt(room.width * room.length)} m² · paredes{" "}
              {fmt(2 * (room.width + room.length) * room.height)} m²
            </span>
          )}
        </div>

        {issues.map((issue) => (
          <ProblemaBloco
            key={issue.id}
            projectId={projectId}
            room={room}
            issue={issue}
            services={services.filter((s) => s.issueId === issue.id)}
            isPending={isPending}
            run={run}
          />
        ))}

        {/* Registrar problema */}
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Registrar problema encontrado
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={campo}>
              <option value="" disabled>tipo de problema…</option>
              {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sev} onChange={(e) => setSev(e.target.value)} className={campo} title="Gravidade">
              {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="descrição (onde, extensão, causa provável)"
              className={`flex-1 min-w-[14rem] ${campo}`}
            />
            <Button
              variant="outline" size="sm"
              disabled={isPending || !cat}
              onClick={() => run(async () => {
                const r = await addRenovationIssue(projectId, { roomId: room?.id ?? null, category: cat, severity: sev, description: desc });
                if (!r?.error) { setCat(""); setSev("MEDIA"); setDesc(""); }
                return r;
              })}
            >
              <Plus className="w-4 h-4" /> Registrar
            </Button>
          </div>
        </div>

        {/* Serviços sem problema associado */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            Serviços sem problema associado <span className="text-gray-400">(melhorias, modernização)</span>
          </p>
          <ListaServicos services={semProblema} isPending={isPending} run={run} />
          <NovoServico projectId={projectId} room={room} issueId={null} isPending={isPending} run={run} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProblemaBloco({
  projectId, room, issue, services, isPending, run,
}: {
  projectId: string; room: Room | null; issue: Issue; services: Service[];
  isPending: boolean; run: Run;
}) {
  const [editando, setEditando] = useState(false);
  const [cat, setCat] = useState(issue.category);
  const [sev, setSev] = useState(issue.severity);
  const [desc, setDesc] = useState(issue.description ?? "");
  const sevDef = SEVERITIES.find((s) => s.value === issue.severity) ?? SEVERITIES[1];

  return (
    <div className="rounded-md border border-gray-200">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {editando ? (
          <>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={campo}>
              {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sev} onChange={(e) => setSev(e.target.value)} className={campo}>
              {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className={`flex-1 min-w-[12rem] ${campo}`} />
            <button
              type="button" aria-label="Salvar problema" disabled={isPending}
              onClick={() => run(async () => {
                const r = await updateRenovationIssue(issue.id, { category: cat, severity: sev, description: desc });
                if (!r?.error) setEditando(false);
                return r;
              })}
              className="text-green-600 hover:text-green-800"
            >
              <Check className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Cancelar" onClick={() => setEditando(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${sevDef.cor}`}>{sevDef.label}</span>
            <span className="text-sm font-medium text-gray-900">{issue.category}</span>
            {issue.description && <span className="text-sm text-gray-600">— {issue.description}</span>}
            <div className="flex-1" />
            <button type="button" aria-label="Editar problema" onClick={() => setEditando(true)} className="text-gray-400 hover:text-brand-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button" aria-label="Excluir problema" disabled={isPending}
              onClick={() => {
                const aviso = services.length > 0
                  ? `Excluir o problema "${issue.category}"? Os ${services.length} serviço(s) dele continuam no ambiente, sem vínculo.`
                  : `Excluir o problema "${issue.category}"?`;
                if (confirm(aviso)) run(() => deleteRenovationIssue(issue.id));
              }}
              className="text-gray-300 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      <div className="px-3 py-2">
        <ListaServicos services={services} isPending={isPending} run={run} />
        <NovoServico projectId={projectId} room={room} issueId={issue.id} isPending={isPending} run={run} />
      </div>
    </div>
  );
}

function ListaServicos({ services, isPending, run }: { services: Service[]; isPending: boolean; run: Run }) {
  if (services.length === 0) return null;
  return (
    <ul className="mb-2 divide-y divide-gray-100">
      {services.map((s) => <LinhaServico key={s.id} s={s} isPending={isPending} run={run} />)}
    </ul>
  );
}

function LinhaServico({ s, isPending, run }: { s: Service; isPending: boolean; run: Run }) {
  const def = SERVICE_BY_KEY.get(s.serviceKey);
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd] = useState(String(s.quantity));
  const n = Number(qtd.replace(",", "."));
  const mats = def?.materiais ? materiaisDosServicos([{ serviceKey: s.serviceKey, quantity: s.quantity }]) : [];

  return (
    <li className="py-1.5 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-800">{s.label || def?.label || s.serviceKey}</span>
      {editando ? (
        <>
          <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" autoFocus className={`w-20 text-right ${campo}`} />
          <span className="text-gray-500">{def?.unit}</span>
          <button
            type="button" aria-label="Salvar" disabled={isPending || !(n > 0)}
            onClick={() => run(async () => {
              const r = await updateRenovationService(s.id, { quantity: n });
              if (!r?.error) setEditando(false);
              return r;
            })}
            className="text-green-600 hover:text-green-800 disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Cancelar" onClick={() => { setQtd(String(s.quantity)); setEditando(false); }} className="text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <span className="text-gray-500">{fmt(s.quantity)} {def?.unit}</span>
      )}
      {mats.length > 0 ? (
        <span className="text-xs text-gray-400">→ {mats.map((m) => `${m.name} ${fmt(m.quantity)} ${m.unit}`).join(" · ")}</span>
      ) : (
        <span className="text-xs text-amber-700">material à mão, na etapa Materiais</span>
      )}
      <div className="flex-1" />
      {!editando && (
        <button type="button" aria-label="Editar serviço" onClick={() => setEditando(true)} className="text-gray-400 hover:text-brand-600">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button" aria-label="Excluir serviço" disabled={isPending}
        onClick={() => { if (confirm(`Excluir "${s.label || def?.label}"?`)) run(() => deleteRenovationService(s.id)); }}
        className="text-gray-300 hover:text-red-600"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function NovoServico({
  projectId, room, issueId, isPending, run,
}: {
  projectId: string; room: Room | null; issueId: string | null; isPending: boolean; run: Run;
}) {
  const [key, setKey] = useState("");
  const [qtd, setQtd] = useState("");
  const [label, setLabel] = useState("");
  const def = SERVICE_BY_KEY.get(key);
  const sugerida = def && room ? medidaSugerida(def.medida, room) : null;
  const n = Number(qtd.replace(",", "."));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          const d = SERVICE_BY_KEY.get(e.target.value);
          // Já preenche com a medida do ambiente; o usuário ajusta se for parcial.
          const sug = d && room ? medidaSugerida(d.medida, room) : null;
          setQtd(sug ? String(sug).replace(".", ",") : d && (d.unit === "un" || d.unit === "vb") ? "1" : "");
        }}
        className={`text-xs ${campo}`}
      >
        <option value="" disabled>+ serviço{issueId ? " para este problema" : ""}…</option>
        {SERVICE_GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {RENOVATION_SERVICES.filter((s) => s.grupo === g).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </optgroup>
        ))}
      </select>
      {def && (
        <>
          {key === "outro" && (
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="descreva o serviço" className={`text-xs ${campo}`} />
          )}
          <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" placeholder="qtd" className={`w-20 text-right text-xs ${campo}`} />
          <span className="text-xs text-gray-500">{def.unit}</span>
          {sugerida !== null && (
            <span className="text-[11px] text-gray-400">medida do ambiente: {fmt(sugerida)} {def.unit}</span>
          )}
          <Button
            variant="outline" size="sm"
            disabled={isPending || !(n > 0) || (key === "outro" && !label.trim())}
            onClick={() => run(async () => {
              const r = await addRenovationService(projectId, {
                roomId: room?.id ?? null, issueId, serviceKey: key, quantity: n, label,
              });
              if (!r?.error) { setKey(""); setQtd(""); setLabel(""); }
              return r;
            })}
          >
            <Plus className="w-4 h-4" /> Lançar
          </Button>
        </>
      )}
    </div>
  );
}
