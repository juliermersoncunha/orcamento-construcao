// Project validation — cross-checks the equipment declared per room against the
// installation points and the material catalog, so gaps surface before the
// budget is trusted.
//
// Pure function (no I/O). Recomputed on render, so it always reflects the
// current state rather than a snapshot taken at generation time.

import { computePointDemand, resolveRoomFixtures } from "./fixture-engine";
import type { RoomEngineInput, PremiseValue } from "./fixture-engine";

export type IssueSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  severity: IssueSeverity;
  kind: "PONTO_FALTANDO" | "PONTO_EXCEDENTE" | "SEM_PRECO" | "MOTOR" | "CIRCUITO";
  scope: string;   // room name, or "Projeto" for project-wide issues
  title: string;
  detail: string;
};

// Points the user declared for a room in Etapa 5.
export type DeclaredPoints = {
  roomId: string;
  outlets: number;
  switches: number;
  lightPoints: number;
  waterInlets: number;
  drainPoints: number;
};

export type ValidationInput = {
  rooms: RoomEngineInput[];
  declared: DeclaredPoints[];
  premises: PremiseValue[];
  // Materials that ended up in the budget with no price — they contribute R$ 0.
  zeroPriceMaterials: string[];
};

// How a fixture's point demand maps onto the declared counters.
const HYDRAULIC_GROUPS = {
  waterInlets: ["AGUA_FRIA", "AGUA_QUENTE"],
  drainPoints: ["ESGOTO_40", "ESGOTO_50", "ESGOTO_100", "RALO"],
} as const;

const ELECTRICAL_GROUPS = {
  outlets: ["TOMADA"],
  switches: ["INTERRUPTOR"],
  lightPoints: ["PONTO_LUZ"],
} as const;

const FIELD_LABELS: Record<string, { one: string; many: string }> = {
  waterInlets: { one: "ponto de água",          many: "pontos de água" },
  drainPoints: { one: "ponto de esgoto/ralo",   many: "pontos de esgoto/ralo" },
  outlets:     { one: "tomada",                  many: "tomadas" },
  switches:    { one: "interruptor",             many: "interruptores" },
  lightPoints: { one: "ponto de luz",            many: "pontos de luz" },
};

function sumOf(demand: Record<string, number>, keys: readonly string[]): number {
  return keys.reduce((s, k) => s + (demand[k] ?? 0), 0);
}

// "Falta 1 ponto de água" / "Faltam 3 pontos de água"
function shortfallTitle(missing: number, field: string): string {
  const l = FIELD_LABELS[field];
  return missing === 1 ? `Falta 1 ${l.one}` : `Faltam ${missing} ${l.many}`;
}

function surplusTitle(extra: number, field: string): string {
  const l = FIELD_LABELS[field];
  return extra === 1
    ? `1 ${l.one} a mais que o exigido`
    : `${extra} ${l.many} a mais que o exigido`;
}

export function validateProject(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { rooms, declared, premises, zeroPriceMaterials } = input;

  // ── 1. Points: what the equipment needs vs. what was declared ─────────────
  const demandByRoom = new Map(computePointDemand(rooms).map((d) => [d.roomId, d]));
  const declaredByRoom = new Map(declared.map((d) => [d.roomId, d]));

  for (const room of rooms) {
    const demand = demandByRoom.get(room.id);
    if (!demand) continue;

    const totalDemand =
      Object.values(demand.hydraulic).reduce((a, b) => a + b, 0) +
      Object.values(demand.electrical).reduce((a, b) => a + b, 0);
    if (totalDemand === 0) continue; // room has no equipment — nothing to check

    const dec = declaredByRoom.get(room.id);
    if (!dec) {
      issues.push({
        severity: "warning",
        kind: "PONTO_FALTANDO",
        scope: room.name,
        title: "Ambiente com equipamentos, mas sem pontos declarados na Etapa 5",
        detail:
          "Os equipamentos exigem pontos hidráulicos/elétricos, mas nenhum ponto foi informado para este ambiente. " +
          "Tubulação, fiação e eletroduto do cálculo geral ficam subestimados.",
      });
      continue;
    }

    for (const [field, keys] of Object.entries(HYDRAULIC_GROUPS)) {
      const need = sumOf(demand.hydraulic, keys);
      const have = dec[field as keyof DeclaredPoints] as number;
      if (need > have) {
        issues.push({
          severity: "warning",
          kind: "PONTO_FALTANDO",
          scope: room.name,
          title: shortfallTitle(need - have, field),
          detail: `Os equipamentos deste ambiente exigem ${need}, mas foram declarados ${have} na Etapa 5.`,
        });
      } else if (have > need && need > 0) {
        issues.push({
          severity: "info",
          kind: "PONTO_EXCEDENTE",
          scope: room.name,
          title: surplusTitle(have - need, field),
          detail: `Declarados ${have}; os equipamentos cadastrados exigem ${need}. Pode ser intencional (previsão futura).`,
        });
      }
    }

    for (const [field, keys] of Object.entries(ELECTRICAL_GROUPS)) {
      const need = sumOf(demand.electrical, keys);
      const have = dec[field as keyof DeclaredPoints] as number;
      if (need > have) {
        issues.push({
          severity: "warning",
          kind: "PONTO_FALTANDO",
          scope: room.name,
          title: shortfallTitle(need - have, field),
          detail: `Os equipamentos deste ambiente exigem ${need}, mas foram declarados ${have} na Etapa 5.`,
        });
      }
    }

    const circuits = demand.electrical.CIRCUITO_EXCLUSIVO ?? 0;
    if (circuits > 0) {
      issues.push({
        severity: "info",
        kind: "CIRCUITO",
        scope: room.name,
        title: `${circuits} circuito(s) exclusivo(s) exigido(s)`,
        detail:
          "Chuveiro elétrico exige circuito próprio com disjuntor dedicado. Cabo, disjuntor e eletroduto " +
          "já entram pelo equipamento; confirme se o quadro de distribuição comporta o circuito.",
      });
    }
  }

  // ── 2. Engine warnings (equipment that generated nothing, etc.) ───────────
  const { warnings } = resolveRoomFixtures(rooms, premises);
  for (const w of warnings) {
    issues.push({
      severity: "warning",
      kind: "MOTOR",
      scope: "Projeto",
      title: "Equipamento não gerou material",
      detail: w,
    });
  }

  // ── 3. Materials priced at zero ───────────────────────────────────────────
  if (zeroPriceMaterials.length > 0) {
    issues.push({
      severity: "error",
      kind: "SEM_PRECO",
      scope: "Projeto",
      title: `${zeroPriceMaterials.length} material(is) sem preço no orçamento`,
      detail:
        "Estes itens entram com quantidade correta mas custo R$ 0, então o total está subestimado: " +
        zeroPriceMaterials.slice(0, 12).join(", ") +
        (zeroPriceMaterials.length > 12 ? `, e mais ${zeroPriceMaterials.length - 12}.` : ".") +
        " Preencha os preços em Admin › Materiais e gere o orçamento novamente.",
    });
  }

  return issues;
}
