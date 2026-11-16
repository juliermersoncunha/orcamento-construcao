"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, PackagePlus, Trash2, Wrench, Archive, ArchiveRestore,
  Pencil, Check, X, HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, parseNumeroBR } from "@/lib/utils";
import { ESTOQUES } from "@/lib/stock";
import {
  registrarEntrada, enviarParaObra, devolverDaObra, registrarContagem, excluirMovimento, registrarVenda,
  editarMovimento,
  cadastrarFerramenta, moverFerramenta, excluirMovimentoFerramenta, arquivarFerramenta, editarFerramenta,
} from "@/app/actions/stock";

type Material = { id: string; name: string; unit: string; preco: number; revenda: number | null };
type Opcao = { id: string; name: string };
type Saldo = { materialId: string; name: string; unit: string; quantidade: number; custoMedio: number; valor: number };
type MovMaterial = {
  id: string; kind: string; owner: string; materialId: string; material: string; unit: string; quantity: number; unitCost: number;
  obraId: string | null; obra: string | null; fornecedor: string | null; date: string; notes: string | null;
  salePrice: number | null; buyer: string | null;
};
type MovFerramenta = { id: string; kind: string; quantity: number; obra: string | null; date: string; notes: string | null };
type Ferramenta = {
  id: string; owner: string; name: string; code: string | null; unitValue: number; notes: string | null; active: boolean;
  total: number; deposito: number; obras: { id: string; name: string; n: number }[];
  movimentos: MovFerramenta[];
};
type Run = (fn: () => Promise<{ error?: string } | void>, depois?: () => void) => void;

const campo = "rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const rotulo = "flex flex-col gap-1 text-xs font-medium text-ink-2";
const hoje = () => new Date().toISOString().slice(0, 10);
const num = parseNumeroBR;
const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const dataBR = (d: string) => d.split("-").reverse().join("/");

const TIPO_MAT: Record<string, { rotulo: string; cor: string }> = {
  ENTRADA: { rotulo: "Entrada", cor: "bg-green-50 text-green-700" },
  ENVIO: { rotulo: "Envio p/ obra", cor: "bg-brand-50 text-brand-700" },
  DEVOLUCAO: { rotulo: "Devolução", cor: "bg-amber-50 text-amber-800" },
  AJUSTE: { rotulo: "Ajuste", cor: "bg-surface text-ink-2" },
  VENDA: { rotulo: "Venda", cor: "bg-emerald-50 text-emerald-700" },
};
const TIPO_FER: Record<string, string> = {
  AQUISICAO: "Aquisição", ENVIO: "Envio p/ obra", DEVOLUCAO: "Devolução", BAIXA: "Baixa",
};

export function EstoqueClient({
  materiais, fornecedores, obras, saldosPorEstoque, movimentos: todosMovimentos, ferramentas: todasFerramentas,
}: {
  materiais: Material[];
  fornecedores: Opcao[];
  obras: Opcao[];
  saldosPorEstoque: Record<string, Saldo[]>;
  movimentos: MovMaterial[];
  ferramentas: Ferramenta[];
}) {
  // Estoque virtual em vista: tudo abaixo (saldo, lançamentos, ferramentas)
  // é deste dono. O depósito físico é o mesmo.
  const [estoque, setEstoque] = useState<string>("CONSTRUTORA");
  const saldos = saldosPorEstoque[estoque] ?? [];
  const movimentos = todosMovimentos.filter((m) => m.owner === estoque);
  const ferramentas = todasFerramentas.filter((f) => f.owner === estoque);
  const router = useRouter();
  const [aba, setAba] = useState<"materiais" | "ferramentas" | "movimentos">("materiais");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, start] = useTransition();

  const run: Run = (fn, depois) => {
    setErro(null); setOk(null);
    start(async () => {
      const r = await fn();
      if (r && "error" in r && r.error) { setErro(r.error); return; }
      depois?.();
      setOk("Salvo.");
      router.refresh();
    });
  };

  // Valores do estoque em vista: material pelo custo médio, ferramenta pelo
  // valor unitário cadastrado. Ferramenta em obra continua sendo patrimônio.
  const valorMateriais = saldos.reduce((s, x) => s + Math.max(0, x.valor), 0);
  const comSaldo = saldos.filter((s) => s.quantidade > 0).length;
  const ferramentasAtivas = ferramentas.filter((f) => f.active);
  const unidadesFerr = ferramentasAtivas.reduce((s, f) => s + f.total, 0);
  const emObras = ferramentasAtivas.reduce((s, f) => s + f.obras.reduce((a, o) => a + o.n, 0), 0);
  const valorFerramentas = ferramentasAtivas.reduce((s, f) => s + f.total * f.unitValue, 0);
  const valorFerrEmObras = ferramentasAtivas.reduce((s, f) => s + f.obras.reduce((a, o) => a + o.n, 0) * f.unitValue, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-3">Estoque</span>
        <div className="flex flex-wrap rounded-full bg-white p-1 text-sm shadow-card">
          {ESTOQUES.map((e) => (
            <button
              key={e.v}
              type="button"
              onClick={() => { setEstoque(e.v); setErro(null); setOk(null); }}
              className={`rounded-full px-4 py-1.5 font-semibold ${estoque === e.v ? "grad-brand text-white" : "text-ink-2 hover:bg-surface"}`}
            >
              {e.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Indicador
          rotulo="Valor total"
          valor={formatCurrency(valorMateriais + valorFerramentas)}
          sub="materiais + ferramentas"
          destaque
        />
        <Indicador
          rotulo="Materiais no depósito"
          valor={formatCurrency(valorMateriais)}
          sub={`${comSaldo} ${comSaldo === 1 ? "material com saldo" : "materiais com saldo"}`}
        />
        <Indicador
          rotulo="Ferramentas"
          valor={formatCurrency(valorFerramentas)}
          sub={`${unidadesFerr} ${unidadesFerr === 1 ? "unidade" : "unidades"}`}
        />
        <Indicador
          rotulo="Ferramentas em obras"
          valor={formatCurrency(valorFerrEmObras)}
          sub={`${emObras} ${emObras === 1 ? "unidade" : "unidades"}`}
        />
      </div>

      <div className="flex w-fit rounded-full bg-white p-1 text-sm shadow-card">
        {([["materiais", "Materiais"], ["ferramentas", "Ferramentas"], ["movimentos", "Movimentações"]] as const).map(([v, r]) => (
          <button
            key={v}
            type="button"
            onClick={() => setAba(v)}
            className={`rounded-full px-4 py-1.5 font-semibold ${aba === v ? "grad-brand text-white" : "text-ink-2 hover:bg-surface"}`}
          >
            {r}
          </button>
        ))}
      </div>

      {erro && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      {ok && !erro && <div className="rounded-2xl bg-green-50 px-4 py-2 text-sm text-green-700">{ok}</div>}

      {aba === "materiais" && (
        <AbaMateriais
          key={estoque}
          estoque={estoque}
          materiais={materiais}
          fornecedores={fornecedores}
          obras={obras}
          saldos={saldos}
          movimentos={movimentos}
          ocupado={ocupado}
          run={run}
        />
      )}
      {aba === "ferramentas" && (
        <AbaFerramentas key={estoque} estoque={estoque} ferramentas={ferramentas} obras={obras} ocupado={ocupado} run={run} />
      )}
      {aba === "movimentos" && (
        <AbaMovimentos key={estoque} movimentos={movimentos} ferramentas={ferramentas} ocupado={ocupado} run={run} />
      )}
    </div>
  );
}

function Indicador({ rotulo, valor, sub, destaque }: { rotulo: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-card ${destaque ? "grad-brand text-white" : "bg-white"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${destaque ? "text-white/80" : "text-ink-3"}`}>{rotulo}</p>
      <p className={`mt-1 text-xl font-bold ${destaque ? "" : "text-ink"}`}>{valor}</p>
      {sub && <p className={`text-xs ${destaque ? "text-white/75" : "text-ink-3"}`}>{sub}</p>}
    </div>
  );
}

// ── Materiais ───────────────────────────────────────────────────────────────

type Modo = "entrada" | "envio" | "devolucao" | "venda" | "contagem";
const MODOS: { v: Modo; rotulo: string; icone: typeof PackagePlus }[] = [
  { v: "entrada", rotulo: "Entrada", icone: PackagePlus },
  { v: "envio", rotulo: "Enviar para obra", icone: ArrowUpFromLine },
  { v: "devolucao", rotulo: "Devolver da obra", icone: ArrowDownToLine },
  { v: "venda", rotulo: "Venda", icone: HandCoins },
  { v: "contagem", rotulo: "Contagem", icone: ClipboardCheck },
];

function AbaMateriais({
  estoque, materiais, fornecedores, obras, saldos, movimentos, ocupado, run,
}: {
  estoque: string; materiais: Material[]; fornecedores: Opcao[]; obras: Opcao[]; saldos: Saldo[];
  movimentos: MovMaterial[]; ocupado: boolean; run: Run;
}) {
  const [modo, setModo] = useState<Modo | null>(null);
  // Material aberto para corrigir os lançamentos dele.
  const [aberto, setAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [zerados, setZerados] = useState(false);

  const visiveis = saldos
    .filter((s) => zerados || s.quantidade !== 0)
    .filter((s) => !busca || s.name.toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {MODOS.map(({ v, rotulo: r, icone: Icone }) => (
          <Button key={v} type="button" size="sm" variant={modo === v ? "default" : "outline"} onClick={() => setModo(modo === v ? null : v)}>
            <Icone className="w-4 h-4" />
            {r}
          </Button>
        ))}
      </div>

      {modo && (
        <FormMovimento
          key={modo}
          modo={modo}
          estoque={estoque}
          materiais={materiais}
          fornecedores={fornecedores}
          obras={obras}
          saldos={saldos}
          ocupado={ocupado}
          run={run}
          aoSalvar={() => setModo(null)}
        />
      )}

      <Card>
        <CardContent className="py-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-bold text-ink">Saldo no depósito</h3>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar material" className={`${campo} py-1.5 text-xs`} />
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input type="checkbox" checked={zerados} onChange={(e) => setZerados(e.target.checked)} className="accent-brand-600" />
              mostrar zerados
            </label>
          </div>
          {visiveis.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">
              {saldos.length === 0
                ? "Nada no depósito ainda. Use Entrada para registrar o que você comprou para o estoque."
                : "Nenhum material com esse filtro."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-3">
                    <th className="py-2 text-left font-medium">Material</th>
                    <th className="py-2 text-right font-medium">Quantidade</th>
                    <th className="py-2 text-center font-medium">Un</th>
                    <th className="py-2 text-right font-medium">Custo médio</th>
                    <th className="py-2 text-right font-medium">Valor</th>
                    <th className="w-10 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((s) => (
                    <Fragment key={s.materialId}>
                    <tr className={`border-b border-gray-50 ${aberto === s.materialId ? "bg-brand-50/40" : ""}`}>
                      <td className="py-2 pr-3 text-ink">{s.name}</td>
                      <td className={`py-2 text-right font-semibold ${s.quantidade < 0 ? "text-red-600" : "text-ink"}`}
                        title={s.quantidade < 0 ? "Saiu mais do que entrou — falta registrar uma entrada ou fazer a contagem" : undefined}>
                        {qtd(s.quantidade)}
                      </td>
                      <td className="py-2 text-center text-ink-3">{s.unit}</td>
                      <td className="py-2 text-right text-ink-2">{formatCurrency(s.custoMedio)}</td>
                      <td className="py-2 text-right font-semibold text-ink">{formatCurrency(Math.max(0, s.valor))}</td>
                      <td className="py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setAberto(aberto === s.materialId ? null : s.materialId)}
                          title="Ver e corrigir os lançamentos deste material"
                          aria-label={`Corrigir lançamentos de ${s.name}`}
                          className={`rounded-full p-1.5 ${aberto === s.materialId ? "bg-brand-100 text-brand-700" : "text-ink-3 hover:bg-surface hover:text-ink"}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    {aberto === s.materialId && (
                      <tr className="border-b border-line bg-brand-50/40">
                        <td colSpan={6} className="px-2 pb-3">
                          <p className="mb-1 text-xs text-ink-3">
                            Lançamentos deste material. Corrija a quantidade ou o preço e confirme — o saldo e o
                            custo médio são refeitos.
                          </p>
                          <ul className="flex flex-col divide-y divide-white rounded-xl bg-white px-3">
                            {movimentos
                              .filter((m) => m.materialId === s.materialId)
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((m) => <LinhaMovimento key={m.id} m={m} ocupado={ocupado} run={run} />)}
                          </ul>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line">
                    <td className="pt-2 font-bold text-ink">
                      Total {busca ? "da busca" : ""} ({visiveis.length} {visiveis.length === 1 ? "material" : "materiais"})
                    </td>
                    <td colSpan={3} />
                    <td className="pt-2 text-right font-bold text-ink">
                      {formatCurrency(visiveis.reduce((t, s) => t + Math.max(0, s.valor), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Escolha do material por digitação: com 250 itens no catálogo, uma lista
// suspensa vira rolagem sem fim. O rótulo leva a unidade para separar
// homônimos ("Areia (m³)" × "Areia (sc)").
function useEscolhaMaterial(materiais: Material[]) {
  const [texto, setTexto] = useState("");
  const porRotulo = useMemo(() => new Map(materiais.map((m) => [`${m.name} (${m.unit})`, m])), [materiais]);
  return { texto, setTexto, escolhido: porRotulo.get(texto) ?? null, rotulos: [...porRotulo.keys()] };
}

function FormMovimento({
  modo, estoque, materiais, fornecedores, obras, saldos, ocupado, run, aoSalvar,
}: {
  modo: Modo; estoque: string; materiais: Material[]; fornecedores: Opcao[]; obras: Opcao[]; saldos: Saldo[];
  ocupado: boolean; run: Run; aoSalvar: () => void;
}) {
  const mat = useEscolhaMaterial(materiais);
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [comprador, setComprador] = useState("");
  const [obra, setObra] = useState(obras[0]?.id ?? "");
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState("");

  const saldo = mat.escolhido ? saldos.find((s) => s.materialId === mat.escolhido!.id) : undefined;
  const q = num(quantidade);

  function salvar() {
    const m = mat.escolhido;
    if (!m) return run(async () => ({ error: "Escolha um material da lista." }));
    const base = { materialId: m.id, date: data, notes: obs, owner: estoque };
    // Em branco vale o preço do catálogo — o número, direto. Passá-lo por
    // String() e pela conversão de texto foi o que fez 2.42 virar 242.
    if (modo === "entrada") return run(() => registrarEntrada({ ...base, quantity: q, unitCost: preco.trim() ? num(preco) : m.preco, supplierId: fornecedor || null }), aoSalvar);
    if (modo === "envio") return run(() => enviarParaObra({ ...base, quantity: q, projectId: obra }), aoSalvar);
    if (modo === "devolucao") return run(() => devolverDaObra({ ...base, quantity: q, projectId: obra }), aoSalvar);
    if (modo === "venda") {
      const pv = preco.trim() ? num(preco) : m.revenda ?? NaN;
      if (!(pv >= 0)) return run(async () => ({ error: "Informe o preço de venda." }));
      return run(() => registrarVenda({ ...base, quantity: q, salePrice: pv, buyer: comprador }), aoSalvar);
    }
    return run(() => registrarContagem({ ...base, contado: q }), aoSalvar);
  }

  const titulo = {
    entrada: "Entrada no depósito",
    envio: "Enviar do depósito para uma obra",
    devolucao: "Devolver de uma obra para o depósito",
    venda: "Venda de material do depósito",
    contagem: "Contagem do depósito",
  }[modo];

  return (
    <Card>
      <CardContent className="py-4">
        <h3 className="mb-3 text-sm font-bold text-ink">{titulo}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className={`${rotulo} min-w-[16rem] flex-1`}>
            Material
            <input
              list="materiais-estoque"
              value={mat.texto}
              onChange={(e) => { mat.setTexto(e.target.value); setPreco(""); }}
              placeholder="digite para buscar no catálogo"
              className={campo}
            />
            <datalist id="materiais-estoque">
              {mat.rotulos.map((r) => <option key={r} value={r} />)}
            </datalist>
          </label>

          {(modo === "envio" || modo === "devolucao") && (
            <label className={rotulo}>
              Obra
              <select value={obra} onChange={(e) => setObra(e.target.value)} className={campo}>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          )}

          <label className={`${rotulo} w-32`}>
            {modo === "contagem" ? "Quantidade contada" : "Quantidade"}
            <input inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" className={campo} />
          </label>

          {modo === "venda" && (
            <>
              <label className={`${rotulo} w-36`}>
                Preço de venda (R$)
                <input
                  inputMode="decimal"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder={mat.escolhido?.revenda != null ? String(mat.escolhido.revenda).replace(".", ",") : "0,00"}
                  className={campo}
                />
              </label>
              <label className={`${rotulo} w-44`}>
                Comprador
                <input value={comprador} onChange={(e) => setComprador(e.target.value)} placeholder="opcional" className={campo} />
              </label>
            </>
          )}

          {modo === "entrada" && (
            <>
              <label className={`${rotulo} w-36`}>
                Preço unitário (R$)
                <input
                  inputMode="decimal"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder={mat.escolhido ? String(mat.escolhido.preco).replace(".", ",") : "0,00"}
                  className={campo}
                />
              </label>
              <label className={rotulo}>
                Fornecedor
                <select value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className={campo}>
                  <option value="">—</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
            </>
          )}

          <label className={rotulo}>
            Data
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </label>
          <label className={`${rotulo} min-w-[12rem] flex-1`}>
            Observação
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional" className={campo} />
          </label>
          <Button type="button" onClick={salvar} disabled={ocupado || !mat.escolhido || !(q > 0 || (modo === "contagem" && q >= 0 && quantidade !== ""))}>
            Registrar
          </Button>
        </div>

        {mat.escolhido && (
          <p className="mt-3 text-xs text-ink-3">
            No depósito: <strong className="text-ink">{qtd(saldo?.quantidade ?? 0)} {mat.escolhido.unit}</strong>
            {saldo && saldo.custoMedio > 0 && <> · custo médio {formatCurrency(saldo.custoMedio)}</>}
            {modo === "envio" && saldo && q > 0 && (
              <> · vai para a obra valendo <strong className="text-ink">{formatCurrency(q * saldo.custoMedio)}</strong></>
            )}
            {(modo === "envio" || modo === "venda") && q > (saldo?.quantidade ?? 0) && (
              <span className="text-amber-700"> · mais do que há no depósito</span>
            )}
            {modo === "venda" && q > 0 && (() => {
              const pv = preco.trim() ? num(preco) : mat.escolhido!.revenda ?? NaN;
              if (!Number.isFinite(pv)) {
                return <span> · sem preço de revenda no catálogo — informe o preço</span>;
              }
              const custo = (saldo?.custoMedio ?? 0) * q;
              const venda = pv * q;
              const lucro = venda - custo;
              return (
                <>
                  {preco === "" && <span> · preço sugerido pela revenda do catálogo</span>}
                  {" · "}venda <strong className="text-ink">{formatCurrency(venda)}</strong>
                  {" · "}lucro{" "}
                  <strong className={lucro < 0 ? "text-red-600" : "text-green-700"}>
                    {formatCurrency(lucro)}
                    {custo > 0 && ` (${Math.round((lucro / custo) * 1000) / 10}%)`}
                  </strong>
                </>
              );
            })()}
            {modo === "contagem" && quantidade !== "" && (
              <> · diferença <strong className="text-ink">{qtd(q - (saldo?.quantidade ?? 0))} {mat.escolhido.unit}</strong></>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Ferramentas ─────────────────────────────────────────────────────────────

function AbaFerramentas({
  estoque, ferramentas, obras, ocupado, run,
}: {
  estoque: string; ferramentas: Ferramenta[]; obras: Opcao[]; ocupado: boolean; run: Run;
}) {
  const [nova, setNova] = useState(false);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");
  const [arquivadas, setArquivadas] = useState(false);
  // Lugar: "todos", "deposito" ou o id de uma obra. As obras do filtro são as
  // que têm alguma ferramenta agora — obra sem ferramenta só faria lista vazia.
  const [lugar, setLugar] = useState("todos");
  const [busca, setBusca] = useState("");

  const obrasComFerramenta = new Map<string, { name: string; n: number }>();
  for (const f of ferramentas) {
    if (!f.active) continue;
    for (const o of f.obras) {
      const atual = obrasComFerramenta.get(o.id) ?? { name: o.name, n: 0 };
      atual.n += o.n;
      obrasComFerramenta.set(o.id, atual);
    }
  }
  const noDeposito = ferramentas.filter((f) => f.active).reduce((s, f) => s + Math.max(0, f.deposito), 0);
  const lugarValido = lugar === "todos" || lugar === "deposito" || obrasComFerramenta.has(lugar) ? lugar : "todos";

  const lista = ferramentas
    .filter((f) => arquivadas || f.active)
    .filter((f) =>
      lugarValido === "todos" ? true
      : lugarValido === "deposito" ? f.deposito > 0
      : f.obras.some((o) => o.id === lugarValido)
    )
    .filter((f) => {
      const b = busca.trim().toLowerCase();
      return !b || f.name.toLowerCase().includes(b) || (f.code ?? "").toLowerCase().includes(b);
    });

  // Quantas unidades e quanto valem NO LUGAR filtrado: no depósito conta só o
  // que está lá; numa obra, só o que está naquela obra.
  const unidadesNoLugar = (f: Ferramenta) =>
    lugarValido === "todos" ? f.total
    : lugarValido === "deposito" ? Math.max(0, f.deposito)
    : f.obras.find((o) => o.id === lugarValido)?.n ?? 0;
  const totalUnidades = lista.reduce((s, f) => s + unidadesNoLugar(f), 0);
  const totalValor = lista.reduce((s, f) => s + unidadesNoLugar(f) * f.unitValue, 0);
  const semValor = lista.filter((f) => !f.unitValue).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant={nova ? "default" : "outline"} onClick={() => setNova((v) => !v)}>
          <Wrench className="w-4 h-4" />
          Cadastrar ferramenta
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          <input type="checkbox" checked={arquivadas} onChange={(e) => setArquivadas(e.target.checked)} className="accent-brand-600" />
          mostrar arquivadas
        </label>
      </div>

      {ferramentas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-full bg-white p-1 text-xs shadow-card">
            {[
              { v: "todos", r: "Todos os lugares" },
              { v: "deposito", r: `Depósito (${noDeposito})` },
              ...[...obrasComFerramenta].map(([id, o]) => ({ v: id, r: `${o.name} (${o.n})` })),
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setLugar(o.v)}
                className={`rounded-full px-3 py-1.5 font-semibold ${
                  lugarValido === o.v ? "grad-brand text-white" : "text-ink-2 hover:bg-surface"
                }`}
              >
                {o.r}
              </button>
            ))}
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar ferramenta"
            className={`${campo} py-1.5 text-xs`}
          />
          <span className="ml-auto rounded-full bg-white px-3 py-1.5 text-sm shadow-card">
            <span className="text-ink-3">
              {totalUnidades} {totalUnidades === 1 ? "unidade" : "unidades"}
              {lugarValido === "deposito" ? " no depósito" : lugarValido !== "todos" ? " nesta obra" : ""} ·{" "}
            </span>
            <strong className="text-ink">{formatCurrency(totalValor)}</strong>
            {semValor > 0 && (
              <span className="text-xs text-amber-700" title="Ferramentas sem valor cadastrado não entram no total">
                {" "}· {semValor} sem valor
              </span>
            )}
          </span>
        </div>
      )}

      {nova && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className={`${rotulo} min-w-[14rem] flex-1`}>
                Ferramenta / equipamento
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Betoneira 400 L" className={campo} />
              </label>
              <label className={`${rotulo} w-36`}>
                Código / patrimônio
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="opcional" className={campo} />
              </label>
              <label className={`${rotulo} w-24`}>
                Quantidade
                <input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={campo} />
              </label>
              <label className={`${rotulo} w-32`}>
                Valor unitário (R$)
                <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="opcional" className={campo} />
              </label>
              <Button
                type="button"
                disabled={ocupado || !nome.trim()}
                onClick={() => run(
                  () => cadastrarFerramenta({ name: nome, code: codigo, quantity: parseInt(quantidade) || 0, unitValue: valor ? num(valor) : 0, owner: estoque }),
                  () => { setNome(""); setCodigo(""); setQuantidade("1"); setValor(""); setNova(false); }
                )}
              >
                Cadastrar
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-3">Entra no depósito. Depois é só enviar para a obra que for usar.</p>
          </CardContent>
        </Card>
      )}

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-ink-3">
            {ferramentas.length === 0 ? "Nenhuma ferramenta cadastrada ainda." : "Nenhuma ferramenta com esse filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((f) => <LinhaFerramenta key={f.id} f={f} obras={obras} ocupado={ocupado} run={run} />)}
        </div>
      )}
    </>
  );
}

function LinhaFerramenta({ f, obras, ocupado, run }: { f: Ferramenta; obras: Opcao[]; ocupado: boolean; run: Run }) {
  const [acao, setAcao] = useState<"ENVIO" | "DEVOLUCAO" | "BAIXA" | "AQUISICAO" | null>(null);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(f.name);
  const [codigo, setCodigo] = useState(f.code ?? "");
  const [valor, setValor] = useState(f.unitValue ? String(f.unitValue).replace(".", ",") : "");
  const [obs, setObs] = useState(f.notes ?? "");
  const [dono, setDono] = useState(f.owner);

  function editar() {
    setNome(f.name); setCodigo(f.code ?? "");
    setValor(f.unitValue ? String(f.unitValue).replace(".", ",") : "");
    setObs(f.notes ?? "");
    setDono(f.owner);
    setAcao(null);
    setEditando(true);
  }
  function salvarEdicao() {
    run(
      () => editarFerramenta(f.id, { name: nome, code: codigo, unitValue: valor ? num(valor) : 0, notes: obs, owner: dono }),
      () => setEditando(false)
    );
  }
  const [obra, setObra] = useState("");
  const [n, setN] = useState("1");

  // Devolução e baixa só oferecem os lugares onde a ferramenta está.
  const ondeEsta = [{ id: "", name: `Depósito (${f.deposito})`, n: f.deposito }, ...f.obras.map((o) => ({ ...o, name: `${o.name} (${o.n})` }))];
  const opcoesObra =
    acao === "ENVIO" ? obras
    : acao === "DEVOLUCAO" ? f.obras
    : acao === "BAIXA" ? ondeEsta.filter((o) => o.n > 0)
    : [];

  function abrir(a: typeof acao) {
    setAcao(acao === a ? null : a);
    setN("1");
    setObra(a === "ENVIO" ? obras[0]?.id ?? "" : a === "DEVOLUCAO" ? f.obras[0]?.id ?? "" : "");
  }

  return (
    <Card className={f.active ? "" : "opacity-60"}>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {editando ? (
            <div className="flex min-w-[16rem] flex-1 flex-wrap items-end gap-2">
              <label className={`${rotulo} min-w-[12rem] flex-1`}>
                Nome
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(); if (e.key === "Escape") setEditando(false); }}
                  autoFocus
                  className={campo}
                />
              </label>
              <label className={`${rotulo} w-28`}>
                Código
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="opcional" className={campo} />
              </label>
              <label className={`${rotulo} w-28`}>
                Valor (R$)
                <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={campo} />
              </label>
              <label className={`${rotulo} min-w-[10rem] flex-1`}>
                Observação
                <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional" className={campo} />
              </label>
              <label className={rotulo}>
                Estoque
                <select value={dono} onChange={(e) => setDono(e.target.value)} className={campo}>
                  {ESTOQUES.map((e) => <option key={e.v} value={e.v}>{e.rotulo}</option>)}
                </select>
              </label>
              <button type="button" disabled={ocupado || !nome.trim()} onClick={salvarEdicao} title="Salvar"
                className="mb-1 rounded-full p-2 text-green-700 hover:bg-green-50 disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setEditando(false)} title="Cancelar"
                className="mb-1 rounded-full p-2 text-ink-3 hover:bg-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="min-w-[12rem] flex-1">
              <button type="button" onClick={editar} className="group text-left" title="Editar nome, código e valor">
                <span className="font-semibold text-ink group-hover:text-brand-700">{f.name}</span>
                {f.code && <span className="ml-2 text-xs font-normal text-ink-3">#{f.code}</span>}
                <Pencil className="ml-1.5 inline w-3 h-3 text-ink-3 group-hover:text-brand-700" />
              </button>
              <p className="text-xs text-ink-3">
                {f.total} {f.total === 1 ? "unidade" : "unidades"}
                {f.unitValue > 0 && <> · {formatCurrency(f.unitValue)} cada</>}
                {f.notes && <> · {f.notes}</>}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-ink-2">Depósito: {f.deposito}</span>
            {f.obras.map((o) => (
              <span key={o.id} className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">{o.name}: {o.n}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled={!f.active || f.deposito <= 0} onClick={() => abrir("ENVIO")}>Enviar</Button>
            <Button type="button" size="sm" variant="outline" disabled={!f.active || f.obras.length === 0} onClick={() => abrir("DEVOLUCAO")}>Devolver</Button>
            <Button type="button" size="sm" variant="outline" disabled={!f.active} onClick={() => abrir("AQUISICAO")}>+ Comprei mais</Button>
            <Button type="button" size="sm" variant="outline" disabled={!f.active || f.total <= 0} onClick={() => abrir("BAIXA")}>Baixa</Button>
            <button
              type="button"
              disabled={ocupado}
              title={f.active ? "Arquivar (sai da lista, histórico fica)" : "Reativar"}
              aria-label={f.active ? `Arquivar ${f.name}` : `Reativar ${f.name}`}
              onClick={() => run(() => arquivarFerramenta(f.id, !f.active))}
              className="px-1 text-ink-3 hover:text-ink"
            >
              {f.active ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {acao && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-surface p-3">
            {acao !== "AQUISICAO" && (
              <label className={rotulo}>
                {acao === "ENVIO" ? "Para a obra" : acao === "DEVOLUCAO" ? "Da obra" : "De onde"}
                <select value={obra} onChange={(e) => setObra(e.target.value)} className={campo}>
                  {opcoesObra.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
            )}
            <label className={`${rotulo} w-24`}>
              Quantidade
              <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} className={campo} />
            </label>
            <Button
              type="button"
              disabled={ocupado}
              onClick={() => run(
                () => moverFerramenta({ toolId: f.id, kind: acao, quantity: parseInt(n) || 0, projectId: obra || null }),
                () => setAcao(null)
              )}
            >
              {{ ENVIO: "Enviar", DEVOLUCAO: "Devolver", BAIXA: "Dar baixa", AQUISICAO: "Adicionar" }[acao]}
            </Button>
            {acao === "BAIXA" && <span className="text-xs text-ink-3">Perda, quebra ou venda: sai do total.</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Movimentações ───────────────────────────────────────────────────────────

function AbaMovimentos({
  movimentos, ferramentas, ocupado, run,
}: {
  movimentos: MovMaterial[]; ferramentas: Ferramenta[]; ocupado: boolean; run: Run;
}) {
  const [filtro, setFiltro] = useState<"todos" | "materiais" | "ferramentas" | "vendas">("todos");

  const linhas = [
    ...movimentos.map((m) => ({
      id: m.id, tipo: "material" as const, kind: m.kind, date: m.date,
      item: m.material,
      qtd: `${m.kind === "AJUSTE" && m.quantity > 0 ? "+" : ""}${qtd(m.quantity)} ${m.unit}`,
      onde: m.obra ?? (m.kind === "VENDA" ? (m.buyer ? `para ${m.buyer}` : null) : m.fornecedor ? `de ${m.fornecedor}` : null),
      // Na venda o que interessa é quanto entrou; o lucro vai ao lado.
      valor: m.kind === "VENDA" ? m.quantity * (m.salePrice ?? 0) : Math.abs(m.quantity) * m.unitCost,
      lucro: m.kind === "VENDA" ? m.quantity * ((m.salePrice ?? 0) - m.unitCost) : null,
      notes: m.notes,
    })),
    ...ferramentas.flatMap((f) => f.movimentos.map((m) => ({
      id: m.id, tipo: "ferramenta" as const, kind: m.kind, date: m.date,
      item: f.name, qtd: `${m.quantity} un`, onde: m.obra, valor: null as number | null, lucro: null as number | null, notes: m.notes,
    }))),
  ]
    .filter((l) =>
      filtro === "todos" ? true
      : filtro === "vendas" ? l.tipo === "material" && l.kind === "VENDA"
      : (filtro === "materiais") === (l.tipo === "material"))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex w-fit rounded-full bg-surface p-0.5 text-xs">
          {([["todos", "Todos"], ["materiais", "Materiais"], ["ferramentas", "Ferramentas"], ["vendas", "Vendas"]] as const).map(([v, r]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFiltro(v)}
              className={`rounded-full px-3 py-1 font-semibold ${filtro === v ? "grad-brand text-white" : "text-ink-2"}`}
            >
              {r}
            </button>
          ))}
        </div>
        {filtro === "vendas" && linhas.length > 0 && (() => {
          const vendido = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
          const lucro = linhas.reduce((s, l) => s + (l.lucro ?? 0), 0);
          return (
            <p className="mb-3 text-sm text-ink-2">
              Vendido <strong className="text-ink">{formatCurrency(vendido)}</strong>
              {" · "}lucro <strong className={lucro < 0 ? "text-red-600" : "text-green-700"}>{formatCurrency(lucro)}</strong>
              {vendido - lucro > 0 && ` (${Math.round((lucro / (vendido - lucro)) * 1000) / 10}% sobre o custo)`}
            </p>
          );
        })()}
        {linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">
            {filtro === "vendas" ? "Nenhuma venda registrada." : "Nenhuma movimentação ainda."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-50">
            {linhas.map((l) => {
              if (l.tipo === "material") {
                const m = movimentos.find((x) => x.id === l.id)!;
                return <LinhaMovimento key={`material-${l.id}`} m={m} ocupado={ocupado} run={run} comMaterial />;
              }
              // Movimento de ferramenta: só se vê e apaga.
              const estilo = { rotulo: TIPO_FER[l.kind] ?? l.kind, cor: "bg-surface text-ink-2" };
              return (
                <li key={`${l.tipo}-${l.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="w-20 text-xs text-ink-3">{dataBR(l.date)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${estilo.cor}`}>{estilo.rotulo}</span>
                  <span className="font-medium text-ink">{l.item}</span>
                  <span className="text-ink-2">{l.qtd}</span>
                  {l.onde && <span className="text-xs text-ink-3">· {l.onde}</span>}
                  {l.notes && <span className="text-xs text-ink-3">· {l.notes}</span>}
                  <div className="flex-1" />
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label="Excluir movimentação"
                    title="Excluir (para corrigir um lançamento errado)"
                    onClick={() => {
                      if (!window.confirm("Excluir esta movimentação da ferramenta? Não dá para desfazer.")) return;
                      run(() => excluirMovimentoFerramenta(l.id));
                    }}
                    className="text-ink-3 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Lançamento de material: ver, corrigir, apagar ─────────────────────────────

const ROTULO_ESTOQUE = Object.fromEntries(ESTOQUES.map((e) => [e.v, e.rotulo]));

function LinhaMovimento({
  m, ocupado, run, comMaterial = false,
}: {
  m: MovMaterial; ocupado: boolean; run: Run; comMaterial?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");
  const [dono, setDono] = useState(m.owner);

  const estilo = TIPO_MAT[m.kind] ?? { rotulo: m.kind, cor: "bg-surface text-ink-2" };
  const precoEditavel = m.kind === "ENTRADA" || m.kind === "VENDA";
  const precoAtual = m.kind === "VENDA" ? m.salePrice ?? 0 : m.unitCost;
  const onde = m.obra ?? (m.kind === "VENDA" ? (m.buyer ? `para ${m.buyer}` : null) : m.fornecedor ? `de ${m.fornecedor}` : null);
  const valor = m.kind === "VENDA" ? m.quantity * (m.salePrice ?? 0) : Math.abs(m.quantity) * m.unitCost;
  const lucro = m.kind === "VENDA" ? m.quantity * ((m.salePrice ?? 0) - m.unitCost) : null;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });

  function abrir() {
    setQuantidade(fmt(m.quantity));
    setPreco(fmt(precoAtual));
    setDono(m.owner);
    setEditando(true);
  }

  function salvar() {
    const q = num(quantidade);
    const p = num(preco);
    const mudancas: string[] = [];
    const input: { quantity?: number; unitCost?: number; salePrice?: number; owner?: string } = {};
    if (Number.isFinite(q) && q !== m.quantity) {
      input.quantity = q;
      mudancas.push(`quantidade: ${qtd(m.quantity)} → ${qtd(q)} ${m.unit}`);
    }
    if (precoEditavel && Number.isFinite(p) && Math.abs(p - precoAtual) > 1e-9) {
      if (m.kind === "VENDA") input.salePrice = p; else input.unitCost = p;
      mudancas.push(`${m.kind === "VENDA" ? "preço de venda" : "preço"}: ${formatCurrency(precoAtual)} → ${formatCurrency(p)}`);
    }
    if (dono !== m.owner) {
      input.owner = dono;
      mudancas.push(`estoque: ${ROTULO_ESTOQUE[m.owner]} → ${ROTULO_ESTOQUE[dono]}`);
    }
    if (mudancas.length === 0) { setEditando(false); return; }
    const ok = window.confirm(
      `Alterar ${estilo.rotulo.toLowerCase()} de ${m.material} (${dataBR(m.date)})?\n\n` +
      mudancas.map((x) => `• ${x}`).join("\n") +
      "\n\nO saldo e o custo médio deste material são recalculados."
    );
    if (!ok) return;
    run(() => editarMovimento(m.id, input), () => setEditando(false));
  }

  function apagar() {
    const ok = window.confirm(
      `Apagar ${estilo.rotulo.toLowerCase()} de ${qtd(m.quantity)} ${m.unit} de ${m.material} (${dataBR(m.date)})?\n\n` +
      "Não dá para desfazer. O saldo e o custo médio deste material são recalculados sem ele."
    );
    if (!ok) return;
    run(() => excluirMovimento(m.id));
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <span className="w-20 text-xs text-ink-3">{dataBR(m.date)}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${estilo.cor}`}>{estilo.rotulo}</span>
      {comMaterial && <span className="font-medium text-ink">{m.material}</span>}

      {editando ? (
        <>
          <label className="flex items-center gap-1 text-xs text-ink-3">
            qtd
            <input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }}
              inputMode="decimal"
              autoFocus
              className={`${campo} w-24 py-1 text-right`}
            />
            {m.unit}
          </label>
          {precoEditavel && (
            <label className="flex items-center gap-1 text-xs text-ink-3">
              {m.kind === "VENDA" ? "venda R$" : "R$"}
              <input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }}
                inputMode="decimal"
                className={`${campo} w-24 py-1 text-right`}
              />
            </label>
          )}
          <select value={dono} onChange={(e) => setDono(e.target.value)} className={`${campo} py-1 text-xs`} title="Estoque dono">
            {ESTOQUES.map((e) => <option key={e.v} value={e.v}>{e.rotulo}</option>)}
          </select>
          <button type="button" disabled={ocupado} onClick={salvar} title="Salvar"
            className="rounded-full p-1.5 text-green-700 hover:bg-green-50 disabled:opacity-40">
            <Check className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setEditando(false)} title="Cancelar"
            className="rounded-full p-1.5 text-ink-3 hover:bg-surface">
            <X className="w-4 h-4" />
          </button>
          {!precoEditavel && (
            <span className="text-[11px] text-ink-3">o custo sai do médio do depósito</span>
          )}
        </>
      ) : (
        <>
          <span className="text-ink-2">
            {m.kind === "AJUSTE" && m.quantity > 0 ? "+" : ""}{qtd(m.quantity)} {m.unit}
          </span>
          {precoEditavel && <span className="text-xs text-ink-3">× {formatCurrency(precoAtual)}</span>}
          {onde && <span className="text-xs text-ink-3">· {onde}</span>}
          {m.notes && <span className="text-xs text-ink-3">· {m.notes}</span>}
          <div className="flex-1" />
          {valor > 0 && <span className="text-xs font-semibold text-ink-2">{formatCurrency(valor)}</span>}
          {lucro !== null && (
            <span className={`text-xs font-semibold ${lucro < 0 ? "text-red-600" : "text-green-700"}`}>
              lucro {formatCurrency(lucro)}
            </span>
          )}
          <button type="button" disabled={ocupado} onClick={abrir} title="Corrigir quantidade, preço ou estoque"
            aria-label="Corrigir lançamento" className="text-ink-3 hover:text-brand-700 disabled:opacity-40">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" disabled={ocupado} onClick={apagar} title="Apagar lançamento"
            aria-label="Apagar lançamento" className="text-ink-3 hover:text-red-600 disabled:opacity-40">
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </li>
  );
}
