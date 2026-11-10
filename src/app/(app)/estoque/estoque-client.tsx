"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, PackagePlus, Trash2, Wrench, Archive, ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  registrarEntrada, enviarParaObra, devolverDaObra, registrarContagem, excluirMovimento,
  cadastrarFerramenta, moverFerramenta, excluirMovimentoFerramenta, arquivarFerramenta,
} from "@/app/actions/stock";

type Material = { id: string; name: string; unit: string; preco: number };
type Opcao = { id: string; name: string };
type Saldo = { materialId: string; name: string; unit: string; quantidade: number; custoMedio: number; valor: number };
type MovMaterial = {
  id: string; kind: string; materialId: string; material: string; unit: string; quantity: number; unitCost: number;
  obraId: string | null; obra: string | null; fornecedor: string | null; date: string; notes: string | null;
};
type MovFerramenta = { id: string; kind: string; quantity: number; obra: string | null; date: string; notes: string | null };
type Ferramenta = {
  id: string; name: string; code: string | null; unitValue: number; active: boolean;
  total: number; deposito: number; obras: { id: string; name: string; n: number }[];
  movimentos: MovFerramenta[];
};
type Run = (fn: () => Promise<{ error?: string } | void>, depois?: () => void) => void;

const campo = "rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const rotulo = "flex flex-col gap-1 text-xs font-medium text-ink-2";
const hoje = () => new Date().toISOString().slice(0, 10);
const num = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));
const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const dataBR = (d: string) => d.split("-").reverse().join("/");

const TIPO_MAT: Record<string, { rotulo: string; cor: string }> = {
  ENTRADA: { rotulo: "Entrada", cor: "bg-green-50 text-green-700" },
  ENVIO: { rotulo: "Envio p/ obra", cor: "bg-brand-50 text-brand-700" },
  DEVOLUCAO: { rotulo: "Devolução", cor: "bg-amber-50 text-amber-800" },
  AJUSTE: { rotulo: "Ajuste", cor: "bg-surface text-ink-2" },
};
const TIPO_FER: Record<string, string> = {
  AQUISICAO: "Aquisição", ENVIO: "Envio p/ obra", DEVOLUCAO: "Devolução", BAIXA: "Baixa",
};

export function EstoqueClient({
  materiais, fornecedores, obras, saldos, movimentos, ferramentas,
}: {
  materiais: Material[];
  fornecedores: Opcao[];
  obras: Opcao[];
  saldos: Saldo[];
  movimentos: MovMaterial[];
  ferramentas: Ferramenta[];
}) {
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

  const valorTotal = saldos.reduce((s, x) => s + Math.max(0, x.valor), 0);
  const comSaldo = saldos.filter((s) => s.quantidade > 0).length;
  const ferramentasAtivas = ferramentas.filter((f) => f.active);
  const emObras = ferramentasAtivas.reduce((s, f) => s + f.obras.reduce((a, o) => a + o.n, 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Indicador rotulo="Valor no depósito" valor={formatCurrency(valorTotal)} destaque />
        <Indicador rotulo="Materiais com saldo" valor={String(comSaldo)} />
        <Indicador rotulo="Ferramentas" valor={String(ferramentasAtivas.reduce((s, f) => s + f.total, 0))} />
        <Indicador rotulo="Ferramentas em obras" valor={String(emObras)} />
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
        <AbaMateriais materiais={materiais} fornecedores={fornecedores} obras={obras} saldos={saldos} ocupado={ocupado} run={run} />
      )}
      {aba === "ferramentas" && (
        <AbaFerramentas ferramentas={ferramentas} obras={obras} ocupado={ocupado} run={run} />
      )}
      {aba === "movimentos" && (
        <AbaMovimentos movimentos={movimentos} ferramentas={ferramentas} ocupado={ocupado} run={run} />
      )}
    </div>
  );
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-card ${destaque ? "grad-brand text-white" : "bg-white"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${destaque ? "text-white/80" : "text-ink-3"}`}>{rotulo}</p>
      <p className={`mt-1 text-xl font-bold ${destaque ? "" : "text-ink"}`}>{valor}</p>
    </div>
  );
}

// ── Materiais ───────────────────────────────────────────────────────────────

type Modo = "entrada" | "envio" | "devolucao" | "contagem";
const MODOS: { v: Modo; rotulo: string; icone: typeof PackagePlus }[] = [
  { v: "entrada", rotulo: "Entrada", icone: PackagePlus },
  { v: "envio", rotulo: "Enviar para obra", icone: ArrowUpFromLine },
  { v: "devolucao", rotulo: "Devolver da obra", icone: ArrowDownToLine },
  { v: "contagem", rotulo: "Contagem", icone: ClipboardCheck },
];

function AbaMateriais({
  materiais, fornecedores, obras, saldos, ocupado, run,
}: {
  materiais: Material[]; fornecedores: Opcao[]; obras: Opcao[]; saldos: Saldo[]; ocupado: boolean; run: Run;
}) {
  const [modo, setModo] = useState<Modo | null>(null);
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
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((s) => (
                    <tr key={s.materialId} className="border-b border-gray-50">
                      <td className="py-2 pr-3 text-ink">{s.name}</td>
                      <td className={`py-2 text-right font-semibold ${s.quantidade < 0 ? "text-red-600" : "text-ink"}`}
                        title={s.quantidade < 0 ? "Saiu mais do que entrou — falta registrar uma entrada ou fazer a contagem" : undefined}>
                        {qtd(s.quantidade)}
                      </td>
                      <td className="py-2 text-center text-ink-3">{s.unit}</td>
                      <td className="py-2 text-right text-ink-2">{formatCurrency(s.custoMedio)}</td>
                      <td className="py-2 text-right font-semibold text-ink">{formatCurrency(Math.max(0, s.valor))}</td>
                    </tr>
                  ))}
                </tbody>
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
  modo, materiais, fornecedores, obras, saldos, ocupado, run, aoSalvar,
}: {
  modo: Modo; materiais: Material[]; fornecedores: Opcao[]; obras: Opcao[]; saldos: Saldo[];
  ocupado: boolean; run: Run; aoSalvar: () => void;
}) {
  const mat = useEscolhaMaterial(materiais);
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [obra, setObra] = useState(obras[0]?.id ?? "");
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState("");

  const saldo = mat.escolhido ? saldos.find((s) => s.materialId === mat.escolhido!.id) : undefined;
  const q = num(quantidade);

  function salvar() {
    const m = mat.escolhido;
    if (!m) return run(async () => ({ error: "Escolha um material da lista." }));
    const base = { materialId: m.id, date: data, notes: obs };
    if (modo === "entrada") return run(() => registrarEntrada({ ...base, quantity: q, unitCost: num(preco || String(m.preco)), supplierId: fornecedor || null }), aoSalvar);
    if (modo === "envio") return run(() => enviarParaObra({ ...base, quantity: q, projectId: obra }), aoSalvar);
    if (modo === "devolucao") return run(() => devolverDaObra({ ...base, quantity: q, projectId: obra }), aoSalvar);
    return run(() => registrarContagem({ ...base, contado: q }), aoSalvar);
  }

  const titulo = {
    entrada: "Entrada no depósito",
    envio: "Enviar do depósito para uma obra",
    devolucao: "Devolver de uma obra para o depósito",
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
            {modo === "envio" && q > (saldo?.quantidade ?? 0) && (
              <span className="text-amber-700"> · mais do que há no depósito</span>
            )}
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
  ferramentas, obras, ocupado, run,
}: {
  ferramentas: Ferramenta[]; obras: Opcao[]; ocupado: boolean; run: Run;
}) {
  const [nova, setNova] = useState(false);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");
  const [arquivadas, setArquivadas] = useState(false);

  const lista = ferramentas.filter((f) => arquivadas || f.active);

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
                  () => cadastrarFerramenta({ name: nome, code: codigo, quantity: parseInt(quantidade) || 0, unitValue: valor ? num(valor) : 0 }),
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
            Nenhuma ferramenta cadastrada ainda.
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
          <div className="min-w-[12rem] flex-1">
            <p className="font-semibold text-ink">
              {f.name}{f.code && <span className="ml-2 text-xs font-normal text-ink-3">#{f.code}</span>}
            </p>
            <p className="text-xs text-ink-3">
              {f.total} {f.total === 1 ? "unidade" : "unidades"}
              {f.unitValue > 0 && <> · {formatCurrency(f.unitValue)} cada</>}
            </p>
          </div>
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
  const [filtro, setFiltro] = useState<"todos" | "materiais" | "ferramentas">("todos");

  const linhas = [
    ...movimentos.map((m) => ({
      id: m.id, tipo: "material" as const, kind: m.kind, date: m.date,
      item: m.material,
      qtd: `${m.kind === "AJUSTE" && m.quantity > 0 ? "+" : ""}${qtd(m.quantity)} ${m.unit}`,
      onde: m.obra ?? (m.fornecedor ? `de ${m.fornecedor}` : null),
      valor: Math.abs(m.quantity) * m.unitCost,
      notes: m.notes,
    })),
    ...ferramentas.flatMap((f) => f.movimentos.map((m) => ({
      id: m.id, tipo: "ferramenta" as const, kind: m.kind, date: m.date,
      item: f.name, qtd: `${m.quantity} un`, onde: m.obra, valor: null as number | null, notes: m.notes,
    }))),
  ]
    .filter((l) => filtro === "todos" || (filtro === "materiais") === (l.tipo === "material"))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex w-fit rounded-full bg-surface p-0.5 text-xs">
          {([["todos", "Todos"], ["materiais", "Materiais"], ["ferramentas", "Ferramentas"]] as const).map(([v, r]) => (
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
        {linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-50">
            {linhas.map((l) => {
              const estilo = l.tipo === "material"
                ? TIPO_MAT[l.kind] ?? { rotulo: l.kind, cor: "bg-surface text-ink-2" }
                : { rotulo: TIPO_FER[l.kind] ?? l.kind, cor: "bg-surface text-ink-2" };
              return (
                <li key={`${l.tipo}-${l.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="w-20 text-xs text-ink-3">{dataBR(l.date)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${estilo.cor}`}>{estilo.rotulo}</span>
                  <span className="font-medium text-ink">{l.item}</span>
                  <span className="text-ink-2">{l.qtd}</span>
                  {l.onde && <span className="text-xs text-ink-3">· {l.onde}</span>}
                  {l.notes && <span className="text-xs text-ink-3">· {l.notes}</span>}
                  <div className="flex-1" />
                  {l.valor !== null && l.valor > 0 && <span className="text-xs font-semibold text-ink-2">{formatCurrency(l.valor)}</span>}
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label="Excluir movimentação"
                    title="Excluir (para corrigir um lançamento errado)"
                    onClick={() => {
                      if (!window.confirm("Excluir esta movimentação? O saldo é recalculado sem ela.")) return;
                      run(() => (l.tipo === "material" ? excluirMovimento(l.id) : excluirMovimentoFerramenta(l.id)));
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
