// Estoque da empresa: o depósito (na casa do dono) e o que ele manda para as
// obras. Tudo aqui é cálculo puro sobre a lista de movimentos — o saldo nunca
// é gravado, para não desencontrar do histórico.
//
// Custo médio ponderado: cada entrada (e cada devolução, que volta pelo custo
// com que saiu) recalcula o médio; envio e ajuste para baixo tiram quantidade
// sem mexer no médio. É o padrão de almoxarifado e o que faz o material que
// sai do depósito chegar à obra pelo valor certo.

export type TipoMovimento = "ENTRADA" | "ENVIO" | "DEVOLUCAO" | "AJUSTE";

export type Movimento = {
  id: string;
  kind: string;
  materialId: string;
  quantity: number;   // sempre positiva, exceto AJUSTE (com sinal)
  unitCost: number;
  projectId: string | null;
  date: string;       // ISO
  createdAt: string;  // desempate na mesma data
};

export type SaldoMaterial = {
  materialId: string;
  quantidade: number;
  custoMedio: number;
  valor: number;
};

/** Ordem cronológica estável: data, depois a hora em que foi lançado. */
export function emOrdem<T extends { date: string; createdAt: string }>(movs: T[]): T[] {
  return [...movs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/** Saldo e custo médio do depósito, por material. */
export function saldosDoDeposito(movs: Movimento[]): Map<string, SaldoMaterial> {
  const out = new Map<string, SaldoMaterial>();
  for (const m of emOrdem(movs)) {
    const s = out.get(m.materialId) ?? { materialId: m.materialId, quantidade: 0, custoMedio: 0, valor: 0 };
    const entra = (q: number, custo: number) => {
      const base = Math.max(0, s.quantidade);
      const nova = base + q;
      s.custoMedio = nova > 0 ? (base * s.custoMedio + q * custo) / nova : custo;
      s.quantidade += q;
    };
    if (m.kind === "ENTRADA" || m.kind === "DEVOLUCAO") entra(m.quantity, m.unitCost);
    else if (m.kind === "ENVIO") s.quantidade -= m.quantity;
    else if (m.kind === "AJUSTE") {
      // Sobra na contagem entra pelo médio de agora; falta só tira.
      if (m.quantity > 0) entra(m.quantity, m.unitCost || s.custoMedio);
      else s.quantidade += m.quantity;
    }
    s.quantidade = arred(s.quantidade);
    s.valor = Math.max(0, s.quantidade) * s.custoMedio;
    out.set(m.materialId, s);
  }
  return out;
}

/**
 * O que uma obra recebeu do depósito (envios menos devoluções), por material,
 * com o custo médio do que recebeu — é o valor que a obra carrega.
 */
export function recebidoPelaObra(movs: Movimento[], projectId: string) {
  const out = new Map<string, { quantidade: number; valor: number }>();
  for (const m of movs) {
    if (m.projectId !== projectId) continue;
    if (m.kind !== "ENVIO" && m.kind !== "DEVOLUCAO") continue;
    const s = out.get(m.materialId) ?? { quantidade: 0, valor: 0 };
    const sinal = m.kind === "ENVIO" ? 1 : -1;
    s.quantidade = arred(s.quantidade + sinal * m.quantity);
    s.valor += sinal * m.quantity * m.unitCost;
    out.set(m.materialId, s);
  }
  return out;
}

// ── Ferramentas ─────────────────────────────────────────────────────────────

export type MovimentoFerramenta = {
  id: string;
  toolId: string;
  kind: string; // AQUISICAO | ENVIO | DEVOLUCAO | BAIXA
  quantity: number;
  projectId: string | null;
  date: string;
  createdAt: string;
};

export type LocalFerramenta = {
  deposito: number;
  porObra: Map<string, number>;
  total: number;
};

/** Onde está cada ferramenta: quantas no depósito e quantas em cada obra. */
export function ondeEstaoAsFerramentas(movs: MovimentoFerramenta[]): Map<string, LocalFerramenta> {
  const out = new Map<string, LocalFerramenta>();
  for (const m of emOrdem(movs)) {
    const l = out.get(m.toolId) ?? { deposito: 0, porObra: new Map<string, number>(), total: 0 };
    const obra = (id: string, d: number) => l.porObra.set(id, (l.porObra.get(id) ?? 0) + d);
    if (m.kind === "AQUISICAO") { l.deposito += m.quantity; l.total += m.quantity; }
    else if (m.kind === "ENVIO" && m.projectId) { l.deposito -= m.quantity; obra(m.projectId, m.quantity); }
    else if (m.kind === "DEVOLUCAO" && m.projectId) { l.deposito += m.quantity; obra(m.projectId, -m.quantity); }
    else if (m.kind === "BAIXA") {
      if (m.projectId) obra(m.projectId, -m.quantity);
      else l.deposito -= m.quantity;
      l.total -= m.quantity;
    }
    for (const [id, n] of l.porObra) if (n === 0) l.porObra.delete(id);
    out.set(m.toolId, l);
  }
  return out;
}

function arred(n: number) {
  return Math.round(n * 1000) / 1000;
}
