// Versão macro do relatório de diagnóstico, para apresentar a investidores:
// números principais, o que será feito (sem detalhe por ambiente), composição
// do investimento e algumas fotos. Cabe em 1–2 páginas.

import type { ResumoCustos } from "@/lib/cost-summary";

type Foto = { id: string; roomId: string | null; caption: string | null; width: number; height: number };

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function pct(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

export function RelatorioMacro({
  nome, cliente, endereco, hoje, resumo, area, ambientes, escopo, fotos, nomeAmbiente, prazo,
}: {
  nome: string;
  cliente: string;
  endereco: string;
  hoje: string;
  resumo: ResumoCustos;
  area: number;
  ambientes: number;
  escopo: string[];
  fotos: Foto[];
  nomeAmbiente: (roomId: string | null) => string;
  prazo: { inicio: string; fim: string; semanas: number } | null;
}) {
  const composicao = [
    { label: "Materiais", valor: resumo.materiais, cor: "bg-brand-600" },
    { label: "Mão de obra", valor: resumo.totalMO, cor: "bg-amber-500" },
    { label: "Gestão da obra e BDI", valor: resumo.totalGestao, cor: "bg-gray-500" },
  ].filter((c) => c.valor > 0);

  const kpis = [
    { label: "Investimento estimado", valor: resumo.total > 0 ? brl(resumo.total) : "a definir", destaque: true },
    { label: "Área dos ambientes", valor: `${area.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m²` },
    { label: "Custo por m²", valor: area > 0 && resumo.total > 0 ? brl(resumo.total / area) : "—" },
    { label: "Ambientes atendidos", valor: String(ambientes) },
    ...(prazo ? [{ label: "Prazo previsto", valor: `${prazo.semanas} semanas` }] : []),
  ];

  return (
    <article className="bg-white text-gray-900 text-sm leading-relaxed">
      <header className="border-b-2 border-brand-700 pb-4 mb-6">
        <p className="text-xs uppercase tracking-widest text-brand-700 font-semibold">JCunha Construtora</p>
        <h1 className="text-2xl font-bold mt-1">Reforma — Resumo executivo</h1>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <p><span className="text-gray-500">Obra:</span> {nome}</p>
          <p><span className="text-gray-500">Data:</span> {hoje}</p>
          <p><span className="text-gray-500">Cliente:</span> {cliente}</p>
          {endereco && <p><span className="text-gray-500">Endereço:</span> {endereco}</p>}
          {prazo && <p><span className="text-gray-500">Execução:</span> {prazo.inicio} a {prazo.fim}</p>}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-lg p-3 ${k.destaque ? "col-span-2 sm:col-span-1 print:col-span-1 bg-brand-700 text-white" : "border border-gray-200"}`}
          >
            <p className={`text-xs ${k.destaque ? "text-white/80" : "text-gray-500"}`}>{k.label}</p>
            <p className="text-2xl font-bold">{k.valor}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="text-base font-bold mb-2">O que será feito</h2>
        {escopo.length === 0 ? (
          <p className="text-gray-500">Nenhum serviço lançado.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 print:grid-cols-2 list-disc pl-5">
            {escopo.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        )}
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="text-base font-bold mb-3">Composição do investimento</h2>
        {composicao.length > 0 && (
          <div className="mb-3 flex h-4 w-full overflow-hidden rounded-full bg-gray-100 print:[print-color-adjust:exact]">
            {composicao.map((c) => (
              <div key={c.label} className={c.cor} style={{ width: `${pct(c.valor, resumo.total)}%` }} />
            ))}
          </div>
        )}
        <table className="w-full">
          <tbody>
            {composicao.map((c) => (
              <tr key={c.label} className="border-b border-gray-100">
                <td className="py-1.5">
                  <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle ${c.cor} print:[print-color-adjust:exact]`} />
                  {c.label}
                </td>
                <td className="py-1.5 text-right text-gray-500 w-16">{pct(c.valor, resumo.total)}%</td>
                <td className="py-1.5 text-right w-36">{brl(c.valor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800">
              <td className="pt-2 text-base font-bold" colSpan={2}>Total</td>
              <td className="pt-2 text-right text-base font-bold">{brl(resumo.total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {fotos.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-base font-bold mb-2">Situação atual</h2>
          <div className="grid grid-cols-2 gap-3">
            {fotos.slice(0, 4).map((f) => (
              <figure key={f.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- rota própria autenticada */}
                <img
                  src={`/api/fotos/${f.id}`}
                  alt={f.caption ?? "Foto da situação atual"}
                  width={f.width}
                  height={f.height}
                  className="w-full h-40 object-cover rounded border border-gray-200 print:h-[6cm]"
                />
                <figcaption className="mt-1 text-xs text-gray-600">
                  <strong>{nomeAmbiente(f.roomId)}</strong>{f.caption ? ` — ${f.caption}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-8 pt-3 border-t border-gray-200 text-xs text-gray-500">
        Valores estimados a partir de vistoria no local. O relatório completo detalha os serviços por
        ambiente.
      </footer>
    </article>
  );
}
