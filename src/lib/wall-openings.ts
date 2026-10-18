// Vãos de porta e janela de um ambiente e quanto deles sai da área de parede.
//
// Reboco, chapisco e azulejo descontam o vão inteiro. Pintura (e gesso, massa,
// textura, cal) segue a regra usual de orçamento (TCPO/SINAPI): vão de até
// 2 m² não se desconta, porque a pintura dos requadros compensa; acima disso,
// desconta só o excedente.

export type Vaos = {
  doors?: number | null;
  doorWidth?: number | null;
  doorHeight?: number | null;
  windows?: number | null;
  windowWidth?: number | null;
  windowHeight?: number | null;
};

export type RegraVaos = "cheio" | "pintura";

export const PORTA_PADRAO = { largura: 0.8, altura: 2.1 };
export const JANELA_PADRAO = { largura: 1.2, altura: 1.2 };
const LIMITE_PINTURA_M2 = 2;

function tamanhos(v: Vaos) {
  return {
    nPortas: Math.max(v.doors ?? 0, 0),
    porta: (v.doorWidth ?? PORTA_PADRAO.largura) * (v.doorHeight ?? PORTA_PADRAO.altura),
    nJanelas: Math.max(v.windows ?? 0, 0),
    janela: (v.windowWidth ?? JANELA_PADRAO.largura) * (v.windowHeight ?? JANELA_PADRAO.altura),
  };
}

export function descontoVaos(v: Vaos, regra: RegraVaos): number {
  const t = tamanhos(v);
  if (regra === "cheio") return t.nPortas * t.porta + t.nJanelas * t.janela;
  const excede = (a: number) => Math.max(a - LIMITE_PINTURA_M2, 0);
  return t.nPortas * excede(t.porta) + t.nJanelas * excede(t.janela);
}
