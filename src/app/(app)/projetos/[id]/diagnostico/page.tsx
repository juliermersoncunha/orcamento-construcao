import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "../memorial/memorial-print";
import { SERVICE_BY_KEY, SEVERITIES, materiaisDosServicos } from "@/lib/renovation-services";
import { montarResumoCustos } from "@/lib/cost-summary";

// Relatório "Diagnóstico de Reforma": o que a vistoria encontrou, ambiente por
// ambiente, os serviços que resolvem cada problema e a estimativa de material.
// Feito para imprimir / salvar em PDF e entregar ao cliente.

const ORDEM_GRAVIDADE = ["URGENTE", "ALTA", "MEDIA", "BAIXA"];

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default async function DiagnosticoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      budgetItems: { select: { quantity: true, unitPriceSnapshot: true } },
      laborLines: { orderBy: { order: "asc" }, select: { role: true, label: true, value: true } },
    },
  });
  if (!project) redirect("/projetos");

  const issues = project.renovationIssues;
  const services = project.renovationServices;
  const gravidade = (v: string) => SEVERITIES.find((s) => s.value === v) ?? SEVERITIES[1];
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
  );

  const contagem = ORDEM_GRAVIDADE.map((g) => ({ g, n: issues.filter((i) => i.severity === g).length }));
  const prioridades = issues
    .filter((i) => i.severity === "URGENTE" || i.severity === "ALTA")
    .sort((a, b) => ORDEM_GRAVIDADE.indexOf(a.severity) - ORDEM_GRAVIDADE.indexOf(b.severity));
  const nomeAmbiente = (roomId: string | null) =>
    project.rooms.find((r) => r.id === roomId)?.name ?? "Geral / área externa";

  const ambientes = [...project.rooms.map((r) => ({ id: r.id as string | null, nome: r.name })), { id: null, nome: "Geral / área externa" }]
    .filter((a) => issues.some((i) => i.roomId === a.id) || services.some((s) => s.roomId === a.id));

  const hoje = new Date().toLocaleDateString("pt-BR");
  const endereco = [project.address, project.city && `${project.city}${project.state ? `/${project.state}` : ""}`].filter(Boolean).join(" — ");

  return (
    <div className="p-8 max-w-4xl print:p-0 print:max-w-none">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/projetos/${id}/orcamento`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
        </Link>
        <PrintButton />
      </div>

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
              <p className="text-xs text-gray-500">
                {contagem.filter((c) => c.n > 0).map((c) => `${c.n} ${gravidade(c.g).label.toLowerCase()}`).join(" · ") || "—"}
              </p>
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

        {/* Prioridades */}
        {prioridades.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold mb-2">Prioridades</h2>
            <ul className="flex flex-col gap-1">
              {prioridades.map((i) => (
                <li key={i.id} className="flex gap-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${gravidade(i.severity).cor}`}>{gravidade(i.severity).label}</span>
                  <span><strong>{nomeAmbiente(i.roomId)}:</strong> {i.category}{i.description ? ` — ${i.description}` : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Por ambiente */}
        <section className="mb-6">
          <h2 className="text-base font-bold mb-2">Diagnóstico por ambiente</h2>
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
                        <th className="py-1 w-20">Gravidade</th>
                        <th className="py-1">Problema</th>
                        <th className="py-1">Serviço recomendado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {probs.map((p) => {
                        const sp = servs.filter((s) => s.issueId === p.id);
                        return (
                          <tr key={p.id} className="border-t border-gray-100 align-top">
                            <td className="py-1.5">
                              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${gravidade(p.severity).cor}`}>{gravidade(p.severity).label}</span>
                            </td>
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
              <tr className="border-b border-gray-200">
                <td className="py-1.5 font-semibold">Materiais</td>
                <td className="py-1.5 text-right font-semibold">{brl(resumo.materiais)}</td>
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

        {/* Materiais — só na tela: o cliente recebe o valor fechado por serviço */}
        {linhasMaterial.length > 0 && (
          <section className="mb-6 print:hidden">
            <h2 className="text-base font-bold">Material calculado</h2>
            <p className="text-xs text-gray-500 mb-2">
              Referência interna: não aparece na impressão entregue ao cliente.
            </p>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-1">Material</th>
                  <th className="py-1 text-right w-20">Qtd</th>
                  <th className="py-1 text-center w-12">Un</th>
                  <th className="py-1 text-right w-24">Preço</th>
                  <th className="py-1 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {linhasMaterial.map((l, i) => (
                  <tr key={l.nome + i} className="border-b border-gray-100">
                    <td className="py-1">{l.nome}{l.origem === "lançado à mão" && <span className="text-xs text-gray-400"> · lançado à mão</span>}</td>
                    <td className="py-1 text-right">{fmt(l.qtd)}</td>
                    <td className="py-1 text-center text-gray-500">{l.unit}</td>
                    <td className="py-1 text-right">{l.preco > 0 ? brl(l.preco) : <span className="text-amber-600">sem preço</span>}</td>
                    <td className="py-1 text-right">{brl(l.qtd * l.preco)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="pt-2" colSpan={4}>Total de material</td>
                  <td className="pt-2 text-right">{brl(totalMaterial)}</td>
                </tr>
              </tfoot>
            </table>
            {semPreco > 0 && (
              <p className="mt-2 text-xs text-amber-700 print:hidden">
                {semPreco} material(is) sem preço no catálogo — o total está subestimado. Cadastre o preço em
                Administração › Materiais.
              </p>
            )}
          </section>
        )}

        <footer className="mt-8 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Diagnóstico elaborado a partir de vistoria no local. Os valores são estimativas baseadas no que foi
          observado; serviços complementares identificados durante a execução serão orçados à parte. Validade
          da proposta: 15 dias.
        </footer>
      </article>
    </div>
  );
}
