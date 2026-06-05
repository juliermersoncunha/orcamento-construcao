"use client";

import { useState, useTransition } from "react";
import { saveViability } from "@/app/actions/indirectCosts";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  Check, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";

type Props = {
  projectId: string;
  totalMaterials: number;
  totalLabor: number;
  totalIndirect: number;
  floorArea: number;
  // persistido
  salePrice: number;
  bdiPercent: number;
  notes: string | null;
  landValue: number;
  landAppraisalValue: number;
  itivPercent: number;
  landDocPercent: number;
  hasSale: boolean;
  venalValue: number;
  saleDocPercent: number;
  brokeragePercent: number;
  irPercent: number;
};

function Row({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-2.5 text-sm border-b border-gray-100 last:border-0">
      <span className="text-gray-600">
        {label}
        {sub && <span className="ml-1 text-xs text-gray-400">({sub})</span>}
      </span>
      <span className="font-medium text-gray-900">{formatCurrency(value)}</span>
    </div>
  );
}

function SubTotal({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between px-4 py-3 text-sm font-semibold ${highlight ? "bg-amber-50" : "bg-gray-50"}`}>
      <span className={highlight ? "text-amber-800" : "text-gray-800"}>{label}</span>
      <span className={highlight ? "text-amber-700 text-base" : "text-gray-900"}>{formatCurrency(value)}</span>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      {children}
    </div>
  );
}

function NumInput({
  label, name, value, onChange, placeholder, step = "0.01", suffix,
}: {
  label: string; name: string; value: number; onChange: (v: number) => void;
  placeholder?: string; step?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" name={name} min="0" step={step}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder ?? "0,00"}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {suffix && <span className="text-xs text-gray-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

export function ViabilidadeForm(props: Props) {
  const {
    projectId, totalMaterials, totalLabor, totalIndirect, floorArea,
  } = props;

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // terreno
  const [landValue, setLandValue] = useState(props.landValue);
  const [landAppraisalValue, setLandAppraisalValue] = useState(props.landAppraisalValue);
  const [itivPercent, setItivPercent] = useState(props.itivPercent);
  const [landDocPercent, setLandDocPercent] = useState(props.landDocPercent);

  // construção
  const [bdiPercent, setBdiPercent] = useState(props.bdiPercent);

  // venda
  const [hasSale, setHasSale] = useState(props.hasSale);
  const [salePrice, setSalePrice] = useState(props.salePrice);
  const [venalValue, setVenalValue] = useState(props.venalValue);
  const [saleDocPercent, setSaleDocPercent] = useState(props.saleDocPercent);
  const [brokeragePercent, setBrokeragePercent] = useState(props.brokeragePercent);
  const [irPercent, setIrPercent] = useState(props.irPercent);

  const [notes, setNotes] = useState(props.notes ?? "");

  // ── cálculos terreno ──────────────────────────────────────────────────────
  const itivValue     = landAppraisalValue * (itivPercent / 100);
  const landDocValue  = landAppraisalValue * (landDocPercent / 100);
  const totalLand     = landValue + itivValue + landDocValue;

  // ── cálculos construção ───────────────────────────────────────────────────
  const directCost    = totalMaterials + totalLabor;
  const bdiValue      = directCost * (bdiPercent / 100);
  const totalBuild    = directCost + bdiValue + totalIndirect;

  // ── custo total da operação ───────────────────────────────────────────────
  const totalOperation = totalLand + totalBuild;
  const costPerM2      = floorArea > 0 ? totalOperation / floorArea : 0;

  // ── venda ─────────────────────────────────────────────────────────────────
  const saleDocValue   = venalValue * (saleDocPercent / 100);
  const brokerageValue = salePrice * (brokeragePercent / 100);
  const grossGain      = salePrice - totalOperation;
  const irValue        = grossGain > 0 ? grossGain * (irPercent / 100) : 0;
  const netProfit      = salePrice - totalOperation - saleDocValue - brokerageValue - irValue;
  const marginPct      = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

  const statusColor =
    !hasSale ? "text-gray-600 bg-gray-50 border-gray-200" :
    netProfit > 0 ? "text-green-700 bg-green-50 border-green-200" :
    netProfit < 0 ? "text-red-700 bg-red-50 border-red-200" :
    "text-gray-600 bg-gray-50 border-gray-200";

  const StatusIcon = !hasSale ? Minus : netProfit > 0 ? TrendingUp : TrendingDown;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("hasSale", hasSale ? "true" : "false");
    startTransition(async () => {
      await saveViability(projectId, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">

      {/* ═══ SEÇÃO 1: TERRENO ════════════════════════════════════════════════ */}
      <FieldGroup label="1 — Terreno">
        <div className="p-4 grid grid-cols-2 gap-3">
          <NumInput label="Valor de compra (R$)" name="landValue"
            value={landValue} onChange={setLandValue} placeholder="Ex: 40.000" />
          <NumInput label="Valor de avaliação / base cartorial (R$)" name="landAppraisalValue"
            value={landAppraisalValue} onChange={setLandAppraisalValue} placeholder="Ex: 40.000" />
        </div>

        {/* ITIV */}
        <div className="px-4 pb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">ITIV — Imposto de transmissão</p>
          <div className="flex gap-3">
            {[
              { pct: 2, label: "2% — antecipado", badge: "recomendado" },
              { pct: 3, label: "3% — no ato do registro", badge: "" },
            ].map(({ pct, label, badge }) => (
              <label key={pct}
                className={`flex-1 flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-colors ${
                  itivPercent === pct ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input type="radio" name="itivPercent" value={pct}
                  checked={itivPercent === pct}
                  onChange={() => setItivPercent(pct)}
                  className="accent-amber-600" />
                <span className="text-xs text-gray-700">{label}</span>
                {badge && (
                  <span className="ml-auto text-xs font-medium text-green-700 bg-green-100 rounded px-1.5 py-0.5">
                    {badge}
                  </span>
                )}
              </label>
            ))}
          </div>
          {landAppraisalValue > 0 && (
            <p className="text-xs text-gray-500 mt-1.5 ml-1">
              ITIV: {formatCurrency(itivValue)}
              {itivPercent === 2 && (
                <span className="text-green-600 ml-2">
                  (economia de {formatCurrency(landAppraisalValue * 0.01)} vs. 3%)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Emolumentos cartoriais */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-gray-700">Emolumentos cartoriais (escritura + matrícula + registro)</p>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex items-center gap-1">
              <Info className="w-3 h-3" /> estimativa
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input type="number" name="landDocPercent" min="0" max="20" step="0.01"
              value={landDocPercent || ""}
              onChange={(e) => setLandDocPercent(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-xs text-gray-500">% do valor de avaliação</span>
            {landAppraisalValue > 0 && (
              <span className="ml-auto text-sm font-medium text-gray-700">
                = {formatCurrency(landDocValue)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Tabela ANOREG/RN 2026: ~3,65% (escritura ~R$820 + abertura ~R$260 + registro ~R$380).
            Confirmar com o cartório local.
          </p>
        </div>

        <SubTotal label="Subtotal Terreno" value={totalLand} />
      </FieldGroup>

      {/* ═══ SEÇÃO 2: CONSTRUÇÃO ═════════════════════════════════════════════ */}
      <FieldGroup label="2 — Construção">
        <Row label="Materiais" value={totalMaterials} />
        <Row label="Mão de obra" value={totalLabor} />
        {totalIndirect > 0 && <Row label="Custos indiretos" value={totalIndirect} />}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
          <label className="text-xs font-medium text-gray-700 shrink-0">
            BDI — Overhead + lucro + impostos (%)
          </label>
          <input type="number" name="bdiPercent" min="0" max="100" step="0.1"
            value={bdiPercent || ""}
            onChange={(e) => setBdiPercent(parseFloat(e.target.value) || 0)}
            placeholder="Ex: 25"
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {bdiPercent > 0 && (
            <span className="text-sm text-gray-600 ml-auto">= {formatCurrency(bdiValue)}</span>
          )}
        </div>

        <SubTotal label="Subtotal Construção" value={totalBuild} />
      </FieldGroup>

      {/* ═══ SEÇÃO 3: CUSTO TOTAL ════════════════════════════════════════════ */}
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 overflow-hidden mb-5">
        <div className="flex items-baseline justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Custo total da operação</p>
            <p className="text-xs text-amber-600 mt-0.5">Terreno + Construção</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalOperation)}</p>
        </div>
        {floorArea > 0 && (
          <div className="flex justify-between px-5 py-2 border-t border-amber-200 text-xs text-amber-700">
            <span>Custo/m² construído</span>
            <span className="font-medium">{formatCurrency(costPerM2)}/m²</span>
          </div>
        )}
      </div>

      {/* ═══ SEÇÃO 4: VENDA (toggle) ══════════════════════════════════════════ */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
        <button
          type="button"
          onClick={() => setHasSale((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={hasSale} readOnly className="accent-amber-600" />
            <span className="text-sm font-semibold text-gray-700">
              Haverá venda do imóvel?
            </span>
          </div>
          {hasSale ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {hasSale && (
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Preço de venda (R$)" name="salePrice"
                value={salePrice} onChange={setSalePrice} placeholder="Ex: 180.000" />
              <NumInput label="Valor venal do imóvel (R$)" name="venalValue"
                value={venalValue} onChange={setVenalValue} placeholder="Ex: 160.000"
              />
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Valor venal = base para cálculo da documentação de venda (7,5%).
            </p>

            {/* Docs de venda */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">
                Documentação da venda (ITIV + escritura + registro)
              </p>
              <div className="flex items-center gap-3">
                <input type="number" name="saleDocPercent" min="0" max="30" step="0.1"
                  value={saleDocPercent || ""}
                  onChange={(e) => setSaleDocPercent(parseFloat(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-xs text-gray-500">% do valor venal</span>
                {venalValue > 0 && (
                  <span className="ml-auto text-sm font-medium text-gray-700">= {formatCurrency(saleDocValue)}</span>
                )}
              </div>
            </div>

            {/* Corretagem */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Corretagem</p>
              <div className="flex items-center gap-3">
                <input type="number" name="brokeragePercent" min="0" max="20" step="0.1"
                  value={brokeragePercent || ""}
                  onChange={(e) => setBrokeragePercent(parseFloat(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-xs text-gray-500">% do preço de venda</span>
                {salePrice > 0 && (
                  <span className="ml-auto text-sm font-medium text-gray-700">= {formatCurrency(brokerageValue)}</span>
                )}
              </div>
            </div>

            {/* IR */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">IR sobre ganho de capital</p>
              <div className="flex items-center gap-3">
                <input type="number" name="irPercent" min="0" max="30" step="0.1"
                  value={irPercent || ""}
                  onChange={(e) => setIrPercent(parseFloat(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-xs text-gray-500">% sobre ganho bruto</span>
                {grossGain > 0 && (
                  <span className="ml-auto text-sm font-medium text-gray-700">= {formatCurrency(irValue)}</span>
                )}
              </div>
              {salePrice > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Ganho bruto: {formatCurrency(Math.max(0, grossGain))}
                  {grossGain <= 0 && " (sem ganho — IR não incide)"}
                </p>
              )}
            </div>

            {/* Resumo venda */}
            {salePrice > 0 && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Row label="Preço de venda"        value={salePrice} />
                <Row label="(−) Custo total"       value={-totalOperation} />
                <Row label="(−) Docs da venda"     value={-saleDocValue}   sub={`${saleDocPercent}% venal`} />
                <Row label="(−) Corretagem"        value={-brokerageValue} sub={`${brokeragePercent}% venda`} />
                <Row label="(−) IR ganho capital"  value={-irValue}        sub={`${irPercent}%`} />
                <SubTotal label="Lucro líquido"    value={netProfit} highlight />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ CARD RESULTADO ══════════════════════════════════════════════════ */}
      {hasSale && salePrice > 0 && (
        <div className={`flex items-center gap-4 rounded-xl border-2 px-5 py-4 mb-4 ${statusColor}`}>
          <StatusIcon className="w-7 h-7 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {netProfit >= 0 ? "Lucro líquido" : "Déficit"}
            </p>
            <p className="text-2xl font-bold">{formatCurrency(Math.abs(netProfit))}</p>
            <p className="text-sm opacity-80">
              {marginPct.toFixed(1)}% {netProfit >= 0 ? "do preço de venda" : "abaixo do custo total"}
            </p>
          </div>
        </div>
      )}

      {/* ═══ OBSERVAÇÕES ═════════════════════════════════════════════════════ */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          name="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Negociação, condições especiais, referências de preço..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {saved ? <><Check className="w-4 h-4 mr-1" /> Salvo!</> : isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
