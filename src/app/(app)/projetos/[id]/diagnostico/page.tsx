import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "../memorial/memorial-print";
import { SERVICE_BY_KEY, materiaisDosServicos } from "@/lib/renovation-services";
import { escopoAutomatico, escopoMacro } from "@/lib/renovation-scope";
import { RelatorioMacro } from "./relatorio-macro";
import { montarResumoCustos } from "@/lib/cost-summary";
import { EnviarFotos, GaleriaFotos } from "./fotos";
import { EscopoReforma } from "./escopo";

// Relatório "Diagnóstico de Reforma" para o cliente: escopo resumido, fotos da
// situação atual, investimento estimado e, no fim, os detalhes por ambiente.
// Feito para imprimir / salvar em PDF.

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default async function DiagnosticoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  // ?v=macro: versão resumida para investidores. Imprime o que está na tela.
  const macro = (await searchParams).v === "macro";
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      rooms: { orderBy: { order: "asc" }, select: { id: true, name: true, width: true, length: true } },
      renovationIssues: { orderBy: { order: "asc" } },
      renovationServices: { orderBy: { order: "asc" } },
      manualBudgetItems: { include: { material: { select: { name: true, unit: true, currentPrice: true } } } },
      costLines: true,
      photos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, roomId: true, caption: true, width: true, height: true },
      },
      budgetItems: { select: { quantity: true, unitPriceSnapshot: true } },
      laborLines: { orderBy: { order: "asc" }, select: { role: true, label: true, value: true } },
    },
  });
  if (!project) redirect("/projetos");

  const issues = project.renovationIssues;
  const services = project.renovationServices;
  const nomeServico = (s: { serviceKey: string; label: string | null }) =>
    s.label || SERVICE_BY_KEY.get(s.serviceKey)?.label || s.serviceKey;
  const unidade = (key: string) => SERVICE_BY_KEY.get(key)?.unit ?? "";

  // Preço de cada material gerado: mesmo critério do orçamento — o apelido de
  // cálculo vence o nome, e entre homônimos vale o ativo.
  const gerados = materiaisDosServicos(services, project.paintPrimer);
  const catalogo = await prisma.material.findMany({
    where: { OR: [{ name: { in: gerados.map((m) => m.name) } }, { calcName: { in: gerados.map((m) => m.name) } }] },
    select: { name: true, calcName: true, currentPrice: true, active: true },
  });
  const precoDe = (nome: string) => {
    const porApelido = catalogo.filter((c) => c.calcName === nome).sort((a, b) => Number(b.active) - Number(a.active))[0];
    const porNome = catalogo.filter((c) => c.name === nome).sort((a, b) => Number(b.active) - Number(a.active))[0];
    const m = porApelido ?? porNome;
    return { preco: m?.currentPrice ?? 0, nome: m?.name ?? nome };
  };
  const linhasMaterial = [
    ...gerados.map((g) => {
      const p = precoDe(g.name);
      return { nome: p.nome, unit: g.unit, qtd: g.quantity, preco: p.preco, origem: "serviços" };
    }),
    ...project.manualBudgetItems
      .filter((i) => i.quantity > 0)
      .map((i) => ({ nome: i.material.name, unit: i.material.unit, qtd: i.quantity, preco: i.material.currentPrice, origem: "lançado à mão" })),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const totalMaterial = linhasMaterial.reduce((s, l) => s + l.qtd * l.preco, 0);
  const semPreco = linhasMaterial.filter((l) => l.preco === 0).length;

  // Material: o do orçamento, para bater com a tela do projeto. Sem orçamento
  // calculado, vale o material ao vivo (serviços + avulsos com preço atual).
  const temOrcamento = project.budgetItems.length > 0;
  const materialOrcamento = project.budgetItems.reduce((s, i) => s + i.quantity * i.unitPriceSnapshot, 0);
  const materialDesatualizado = temOrcamento && Math.abs(materialOrcamento - totalMaterial) >= 0.01;
  const resumo = montarResumoCustos(
    temOrcamento ? materialOrcamento : totalMaterial,
    project.laborLines,
    project.costLines.filter((l) => l.kind === "GESTAO"),
    project.type,
  );

  const ambientes = [...project.rooms.map((r) => ({ id: r.id as string | null, nome: r.name })), { id: null, nome: "Geral / área externa" }]
    .filter((a) => issues.some((i) => i.roomId === a.id) || services.some((s) => s.roomId === a.id));
  const ambientesFoto = project.rooms.map((r) => ({ id: r.id, nome: r.name }));

  // Fotos na ordem dos ambientes; as gerais (sem ambiente) por último.
  const posicao = (roomId: string | null) => {
    const i = project.rooms.findIndex((r) => r.id === roomId);
    return i < 0 ? project.rooms.length : i;
  };
  const fotos = [...project.photos].sort((a, b) => posicao(a.roomId) - posicao(b.roomId));

  const escopo = escopoAutomatico(services, ambientesFoto);

  const hoje = new Date().toLocaleDateString("pt-BR");
  const endereco = [project.address, project.city && `${project.city}${project.state ? `/${project.state}` : ""}`].filter(Boolean).join(" — ");

  const barra = (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
      <Link href={`/projetos/${id}/orcamento`}>
        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
      </Link>
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          <Link
            href={`/projetos/${id}/diagnostico`}
            className={`rounded-md px-3 py-1.5 ${!macro ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
          >
            Completo
          </Link>
          <Link
            href={`/projetos/${id}/diagnostico?v=macro`}
            className={`rounded-md px-3 py-1.5 ${macro ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
          >
            Macro (investidores)
          </Link>
        </div>
        <PrintButton />
      </div>
    </div>
  );

  if (macro) {
    const linhasEscopo = project.scopeSummary ? project.scopeSummary.split("\n") : escopo;
    const ambientesAtendidos = new Set(services.map((s) => s.roomId)).size;
    const area = project.rooms.reduce((s, r) => s + r.width * r.length, 0);
    const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");
    const prazo = project.scheduleStart && project.scheduleEnd
      ? {
          inicio: fmtData(project.scheduleStart),
          fim: fmtData(project.scheduleEnd),
          semanas: Math.max(1, Math.round((project.scheduleEnd.getTime() - project.scheduleStart.getTime()) / (7 * 86400000))),
        }
      : null;
    return (
      <div className="p-8 max-w-4xl print:p-0 print:max-w-none">
        {barra}
        <RelatorioMacro
          nome={project.name}
          cliente={project.clientName}
          endereco={endereco}
          hoje={hoje}
          resumo={resumo}
          area={area}
          ambientes={ambientesAtendidos}
          escopo={escopoMacro(linhasEscopo, project.rooms.length)}
          fotos={fotos}
          nomeAmbiente={(roomId) => project.rooms.find((r) => r.id === roomId)?.name.trim() ?? "Geral / área externa"}
          prazo={prazo}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl print:p-0 print:max-w-none">
      {barra}

      <article className="bg-white text-gray-900 text-sm leading-relaxed">
        {/* Cabeçalho */}
        <header className="border-b-2 border-brand-700 pb-4 mb-6">
          <p className="text-xs uppercase tracking-widest text-brand-700 font-semibold">JCunha Construtora</p>
          <h1 className="text-2xl font-bold mt-1">Diagnóstico de Reforma</h1>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <p><span className="text-gray-500">Obra:</span> {project.name}</p>
            <p><span className="text-gray-500">Data:</span> {hoje}</p>
            <p><span className="text-gray-500">Cliente:</span> {project.clientName}</p>
            {endereco && <p><span className="text-gray-500">Endereço:</span> {endereco}</p>}
          </div>
        </header>

        {/* Resumo */}
        <section className="mb-6">
          <h2 className="text-base font-bold mb-2">Resumo</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Problemas encontrados</p>
              <p className="text-2xl font-bold">{issues.length}</p>
              <p className="text-xs text-gray-500">na vistoria</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Serviços recomendados</p>
              <p className="text-2xl font-bold">{services.length}</p>
              <p className="text-xs text-gray-500">em {ambientes.length} ambiente(s)</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Investimento estimado</p>
              <p className="text-2xl font-bold">{resumo.total > 0 ? brl(resumo.total) : "a definir"}</p>
              <p className="text-xs text-gray-500">material, mão de obra e gestão</p>
            </div>
          </div>
        </section>

        <EscopoReforma projectId={project.id} automatico={escopo} editado={project.scopeSummary} />

        {/* Situação atual: sem fotos, a seção só existe na tela (para enviar). */}
        <section className={`mb-6 ${fotos.length === 0 ? "print:hidden" : ""}`}>
          <h2 className="text-base font-bold mb-2">Situação atual</h2>
          <EnviarFotos projectId={project.id} ambientes={ambientesFoto} />
          <GaleriaFotos fotos={fotos} ambientes={ambientesFoto} />
        </section>

        {/* Investimento estimado */}
        <section className="mb-6 break-inside-avoid">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-base font-bold">Investimento estimado</h2>
            <Link href={`/projetos/${id}/mao-de-obra`} className="text-xs text-brand-700 hover:underline print:hidden">
              editar mão de obra e gestão
            </Link>
          </div>
          <table className="w-full">
            <tbody>
              {/* O adicional de material da reforma vai embutido: o cliente vê
                  só o valor de material, sem a linha do percentual. */}
              <tr className="border-b border-gray-200">
                <td className="py-1.5 font-semibold">Materiais</td>
                <td className="py-1.5 text-right font-semibold">{brl(resumo.materiais + resumo.adicionalMaterial)}</td>
              </tr>

              <tr><td className="pt-3 pb-1 font-semibold" colSpan={2}>Mão de obra</td></tr>
              {resumo.maoDeObra.length === 0 && (
                <tr><td className="py-1 pl-4 text-gray-400" colSpan={2}>a definir</td></tr>
              )}
              {resumo.maoDeObra.map((l, i) => (
                <tr key={l.label + i}>
                  <td className="py-1 pl-4 text-gray-700">{l.label}</td>
                  <td className="py-1 text-right text-gray-700">{brl(l.valor)}</td>
                </tr>
              ))}
              <tr className="border-b border-gray-200">
                <td className="py-1.5 pl-4 font-medium">Subtotal mão de obra</td>
                <td className="py-1.5 text-right font-medium">{brl(resumo.totalMO)}</td>
              </tr>

              <tr><td className="pt-3 pb-1 font-semibold" colSpan={2}>Gestão da obra</td></tr>
              {resumo.gestao.filter((g) => g.valor > 0).length === 0 && (
                <tr><td className="py-1 pl-4 text-gray-400" colSpan={2}>a definir</td></tr>
              )}
              {resumo.gestao.filter((g) => g.valor > 0).map((g) => (
                <tr key={g.key}>
                  <td className="py-1 pl-4 text-gray-700">
                    {g.label}{g.percent ? ` (${g.percent.toLocaleString("pt-BR")}%)` : ""}
                  </td>
                  <td className="py-1 text-right text-gray-700">{brl(g.valor)}</td>
                </tr>
              ))}
              <tr className="border-b border-gray-200">
                <td className="py-1.5 pl-4 font-medium">Subtotal gestão da obra</td>
                <td className="py-1.5 text-right font-medium">{brl(resumo.totalGestao)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800">
                <td className="pt-2 text-base font-bold">Total</td>
                <td className="pt-2 text-right text-base font-bold">{brl(resumo.total)}</td>
              </tr>
            </tfoot>
          </table>
          {materialDesatualizado && (
            <p className="mt-2 text-xs text-amber-700 print:hidden">
              Com os serviços e preços atuais o material daria {brl(totalMaterial)}. Clique em Recalcular no
              projeto para atualizar o orçamento.
            </p>
          )}
          {semPreco > 0 && (
            <p className="mt-2 text-xs text-amber-700 print:hidden">
              {semPreco} material(is) sem preço no catálogo — o total de materiais está subestimado.
            </p>
          )}
        </section>

        {/* Detalhes descritivos, ambiente por ambiente */}
        <section className="mb-6">
          <h2 className="text-base font-bold mb-2">Detalhes descritivos</h2>
          {ambientes.length === 0 && <p className="text-gray-500">Nenhum problema ou serviço lançado.</p>}
          {ambientes.map((a) => {
            const probs = issues.filter((i) => i.roomId === a.id);
            const servs = services.filter((s) => s.roomId === a.id);
            const melhorias = servs.filter((s) => !s.issueId || !probs.some((p) => p.id === s.issueId));
            return (
              <div key={a.id ?? "geral"} className="mb-4 break-inside-avoid">
                <h3 className="font-semibold text-brand-800 border-b border-gray-200 pb-1 mb-2">{a.nome}</h3>
                {probs.length > 0 && (
                  <table className="w-full mb-2">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="py-1 w-1/2">Problema</th>
                        <th className="py-1">Serviço recomendado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {probs.map((p) => {
                        const sp = servs.filter((s) => s.issueId === p.id);
                        return (
                          <tr key={p.id} className="border-t border-gray-100 align-top">
                            <td className="py-1.5 pr-3">
                              <p className="font-medium">{p.category}</p>
                              {p.description && <p className="text-gray-600">{p.description}</p>}
                            </td>
                            <td className="py-1.5">
                              {sp.length === 0
                                ? <span className="text-gray-400">a definir</span>
                                : sp.map((s) => (
                                    <p key={s.id}>
                                      {nomeServico(s)}
                                      <span className="print:hidden"> — {fmt(s.quantity)} {unidade(s.serviceKey)}</span>
                                    </p>
                                  ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {melhorias.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Melhorias (sem problema associado)</p>
                    {melhorias.map((s) => (
                      <p key={s.id}>
                        • {nomeServico(s)}
                        <span className="print:hidden"> — {fmt(s.quantity)} {unidade(s.serviceKey)}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <footer className="mt-8 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Diagnóstico elaborado a partir de vistoria no local. Os valores são estimativas baseadas no que foi
          observado; serviços complementares identificados durante a execução serão orçados à parte. Validade
          da proposta: 15 dias.
        </footer>
      </article>
    </div>
  );
}
