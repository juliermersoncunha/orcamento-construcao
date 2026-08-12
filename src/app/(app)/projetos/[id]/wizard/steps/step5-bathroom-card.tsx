"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRoomEquipment, type RoomEquipmentPayload } from "@/app/actions/fixtures";
import {
  BATHROOM_FIXTURES,
  BATHROOM_FIXTURE_GROUPS,
  BATHROOM_STANDARD_PRESET,
  BATHROOM_ACCESSORIES,
  BATHROOM_OPTIONAL_FIXTURES,
  BATHROOM_ROOM_TYPES,
  getBathroomFixtureSpec,
  getBathroomAccessorySpec,
  includableComponents,
} from "@/lib/fixture-library/bathroom";
import { computePointDemand } from "@/lib/calculations/fixture-engine";
import { Bath, Plus, Trash2, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

// ── Client state shapes ─────────────────────────────────────────────────────
type FixtureState = {
  uid: string;
  fixtureType: string;
  quantity: number;
  config: Record<string, unknown>;
  includedComponents: string[];
};

type DoorState = {
  enabled: boolean;
  width: number;
  height: number;
  includedComponents: string[];
};

type WindowState = {
  enabled: boolean;
  width: number;
  height: number;
  telaMosquiteira: boolean;
};

const WALL_SIDES = [
  { key: "FRENTE", label: "Frente" },
  { key: "FUNDO", label: "Fundo" },
  { key: "ESQUERDA", label: "Esquerda" },
  { key: "DIREITA", label: "Direita" },
];

// Padrão econômico: três opções em vez de escolher parede a parede.
const WALL_TILE_MODES = [
  { value: "NENHUM", label: "Sem revestimento de parede" },
  { value: "ALTURA", label: "Até uma altura (meia parede)" },
  { value: "TODAS",  label: "Todas as paredes, do piso ao teto" },
  { value: "BOX",    label: "Somente a área do box" },
];

type WallTileState = {
  mode: string;
  height: number;
};

type AccessoryState = {
  qty: number;
  config: Record<string, unknown>;
};

// Defaults declared by the accessory's configSchema in the fixture library.
// No padrão econômico o usuário não informa dimensões de acessório — os valores
// padrão da biblioteca são usados como estão.
function defaultAccessoryConfig(type: string): Record<string, unknown> {
  const schema = getBathroomAccessorySpec(type)?.configSchema;
  if (!schema) return {};
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(schema)) {
    if (f.default !== undefined) out[k] = f.default;
  }
  return out;
}

// Traduz o modo escolhido nas linhas de RoomWallFinish que o motor consome.
function wallFinishesFor(mode: string, height: number, roomHeight: number) {
  if (mode === "TODAS") {
    return WALL_SIDES.map((s) => ({ wallSide: s.key, hasTile: true, tileHeight: roomHeight }));
  }
  if (mode === "ALTURA") {
    return WALL_SIDES.map((s) => ({ wallSide: s.key, hasTile: true, tileHeight: height }));
  }
  if (mode === "BOX") {
    return [{ wallSide: "BOX", hasTile: true, tileHeight: height }];
  }
  return [];
}

const RALO_TYPES = ["CAIXA_SIFONADA", "RALO_SIFONADO", "RALO_SECO", "RALO_LINEAR"];

let uidCounter = 0;
const nextUid = () => `fx-${++uidCounter}`;

const HYDRAULIC_LABELS: Record<string, string> = {
  AGUA_FRIA: "Água fria",
  AGUA_QUENTE: "Água quente",
  ESGOTO_40: "Esgoto 40mm",
  ESGOTO_50: "Esgoto 50mm",
  ESGOTO_100: "Esgoto 100mm",
  RALO: "Ralo",
};
const ELECTRICAL_LABELS: Record<string, string> = {
  TOMADA: "Tomada",
  INTERRUPTOR: "Interruptor",
  PONTO_LUZ: "Ponto de luz",
  CIRCUITO_EXCLUSIVO: "Circuito exclusivo",
};

// Padrão econômico: liga/desliga. Área, altura do rodapé e demãos vêm das
// Premissas de Cálculo — ver IMPERM_RODAPE_H, IMPERM_BOX_H e IMPERM_DEMAOS.
const IMPERM_BASICA = "PISO_PAREDES";
const IMPERM_SISTEMA_PADRAO = "argamassa_polimerica";

export function BathroomCard({ room }: { room: any }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [roomType, setRoomType] = useState<string>(
    room.roomType && BATHROOM_ROOM_TYPES.some((t) => t.value === room.roomType)
      ? room.roomType
      : "BANHEIRO"
  );

  const [fixtures, setFixtures] = useState<FixtureState[]>(
    (room.fixtures ?? []).map((f: any) => ({
      uid: nextUid(),
      fixtureType: f.fixtureType,
      quantity: f.quantity,
      config: safeParse(f.configJson),
      includedComponents: f.includedComponents ?? [],
    }))
  );

  const existingDoor = (room.joineries ?? []).find((j: any) => j.subtype === "banheiro" && j.joineryType === "PORTA_INTERNA");
  const [door, setDoor] = useState<DoorState>({
    enabled: !!existingDoor,
    width: existingDoor?.width ?? 0.7,
    height: existingDoor?.height ?? 2.1,
    includedComponents: existingDoor?.includedComponents ?? [],
  });

  const existingWindow = (room.joineries ?? []).find((j: any) => j.subtype === "banheiro" && j.joineryType === "JANELA");
  const [win, setWin] = useState<WindowState>({
    enabled: !!existingWindow,
    width: existingWindow?.width ?? 0.6,
    height: existingWindow?.height ?? 0.6,
    telaMosquiteira: existingWindow?.configJson ? !!safeParse(existingWindow.configJson).telaMosquiteira : false,
  });

  const [accessories, setAccessories] = useState<Record<string, AccessoryState>>(() => {
    const map: Record<string, AccessoryState> = {};
    (room.accessories ?? []).forEach((a: any) => {
      map[a.accessoryType] = {
        qty: a.quantity,
        config: { ...defaultAccessoryConfig(a.accessoryType), ...safeParse(a.configJson) },
      };
    });
    return map;
  });

  const [wallTile, setWallTile] = useState<WallTileState>(() => {
    const existing = ((room.wallFinishes ?? []) as any[]).filter((w) => w.hasTile);
    if (existing.length === 0) return { mode: "NENHUM", height: 1.5 };
    const height = existing[0].tileHeight ?? 1.5;
    if (existing.some((w) => w.wallSide === "BOX")) return { mode: "BOX", height };
    if (existing.length >= WALL_SIDES.length && height >= room.height) {
      return { mode: "TODAS", height };
    }
    return { mode: "ALTURA", height };
  });

  const [optionalsOpen, setOptionalsOpen] = useState(false);

  const [impermOn, setImpermOn] = useState<boolean>(
    !!room.imperm && room.imperm.scope !== "NENHUM"
  );

  // ── Live point demand ─────────────────────────────────────────────────────
  const pointDemand = useMemo(() => {
    const engineRoom = {
      id: room.id, name: room.name, roomType,
      width: room.width, length: room.length, height: room.height,
      fixtures: fixtures.map((f) => ({
        id: f.uid, roomId: room.id, fixtureType: f.fixtureType,
        quantity: f.quantity, configJson: JSON.stringify(f.config),
        includedComponents: f.includedComponents,
      })),
      joineries: [], accessories: [], imperm: null, wallFinishes: [],
    };
    return computePointDemand([engineRoom])[0];
  }, [fixtures, roomType, room.id, room.name, room.width, room.length, room.height]);

  const raloCount = fixtures
    .filter((f) => RALO_TYPES.includes(f.fixtureType))
    .reduce((n, f) => n + f.quantity, 0);

  // Os equipamentos opcionais (box, ducha higiênica, exaustor) aparecem só na
  // seção recolhida, não na lista principal.
  const optionalTypes = new Set(BATHROOM_OPTIONAL_FIXTURES.map((o) => o.fixtureType));
  const mainFixtures = fixtures.filter((f) => !optionalTypes.has(f.fixtureType));
  const optionalCount =
    fixtures.filter((f) => optionalTypes.has(f.fixtureType)).length +
    Object.values(accessories).filter((a) => a.qty > 0).length;

  // ── Mutators ──────────────────────────────────────────────────────────────
  function toggleOptionalFixture(fixtureType: string) {
    const has = fixtures.some((f) => f.fixtureType === fixtureType);
    if (has) {
      setFixtures((prev) => prev.filter((f) => f.fixtureType !== fixtureType));
    } else {
      addFixture(fixtureType);
    }
    setSaved(false);
  }

  function applyPreset() {
    setFixtures(
      BATHROOM_STANDARD_PRESET.map((p) => ({
        uid: nextUid(),
        fixtureType: p.fixtureType,
        quantity: p.quantity,
        config: { ...((p as any).config ?? {}) },
        includedComponents: [],
      }))
    );
    setDoor((d) => ({ ...d, enabled: true }));
    setSaved(false);
  }

  function addFixture(fixtureType: string) {
    const spec = getBathroomFixtureSpec(fixtureType);
    const config: Record<string, unknown> = {};
    if (spec?.configSchema) {
      for (const [k, f] of Object.entries(spec.configSchema)) {
        if (f.default !== undefined) config[k] = f.default;
      }
    }
    setFixtures((prev) => [...prev, { uid: nextUid(), fixtureType, quantity: 1, config, includedComponents: [] }]);
    setSaved(false);
  }

  function removeFixture(uid: string) {
    setFixtures((prev) => prev.filter((f) => f.uid !== uid));
    setSaved(false);
  }

  function updateFixtureConfig(uid: string, key: string, value: unknown) {
    setFixtures((prev) => prev.map((f) => (f.uid === uid ? { ...f, config: { ...f.config, [key]: value } } : f)));
    setSaved(false);
  }

  function updateFixtureQty(uid: string, qty: number) {
    setFixtures((prev) => prev.map((f) => (f.uid === uid ? { ...f, quantity: Math.max(1, qty) } : f)));
    setSaved(false);
  }

  function toggleIncluded(uid: string, material: string) {
    setFixtures((prev) => prev.map((f) => {
      if (f.uid !== uid) return f;
      const has = f.includedComponents.includes(material);
      return { ...f, includedComponents: has ? f.includedComponents.filter((m) => m !== material) : [...f.includedComponents, material] };
    }));
    setSaved(false);
  }

  function handleSave() {
    const payload: RoomEquipmentPayload = {
      roomType,
      fixtures: fixtures.map((f) => ({
        fixtureType: f.fixtureType, quantity: f.quantity,
        config: f.config, includedComponents: f.includedComponents,
      })),
      door: door.enabled
        ? { subtype: "banheiro", width: door.width, height: door.height, material: "madeira", includedComponents: door.includedComponents }
        : null,
      window: win.enabled
        ? { width: win.width, height: win.height, telaMosquiteira: win.telaMosquiteira }
        : null,
      accessories: Object.entries(accessories)
        .filter(([, a]) => a.qty > 0)
        .map(([accessoryType, a]) => ({ accessoryType, quantity: a.qty, config: a.config })),
      // Escopo básico: o motor recalcula área, altura e demãos a partir das
      // Premissas. O que vai gravado aqui é só o registro da última edição.
      imperm: impermOn
        ? {
            scope: IMPERM_BASICA,
            area: round2(room.width * room.length),
            wallHeight: 0.3,
            ralos: raloCount,
            tubulacoes: 0,
            system: IMPERM_SISTEMA_PADRAO,
            coats: 3,
            mechProtection: false,
          }
        : null,
      wallFinishes: wallFinishesFor(wallTile.mode, wallTile.height, room.height),
    };
    startTransition(async () => {
      await saveRoomEquipment(room.id, payload);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Bath className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{room.name}</p>
            <p className="text-xs text-gray-500">{round2(room.width * room.length)} m² · pé-direito {room.height} m</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roomType}
            onChange={(e) => { setRoomType(e.target.value); setSaved(false); }}
            className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {BATHROOM_ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyPreset}
            className="text-xs px-3 py-1.5 rounded-full border border-blue-300 text-blue-700 bg-white hover:bg-blue-100 flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Banheiro padrão econômico
          </button>
        </div>
      </div>

      {/* Fixtures */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Equipamentos</p>
        {fixtures.length === 0 && (
          <p className="text-xs text-gray-400 italic py-2">Nenhum equipamento. Use o preenchimento rápido ou adicione abaixo.</p>
        )}
        <div className="flex flex-col gap-2">
          {mainFixtures.map((f) => (
            <FixtureRow
              key={f.uid}
              fixture={f}
              onRemove={() => removeFixture(f.uid)}
              onConfig={(k, v) => updateFixtureConfig(f.uid, k, v)}
              onQty={(q) => updateFixtureQty(f.uid, q)}
              onToggleIncluded={(m) => toggleIncluded(f.uid, m)}
            />
          ))}
        </div>

        {/* Add fixture */}
        <div className="mt-2">
          <select
            value=""
            onChange={(e) => { if (e.target.value) addFixture(e.target.value); e.target.value = ""; }}
            className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">+ Adicionar equipamento…</option>
            {BATHROOM_FIXTURE_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map((t) => {
                  const spec = getBathroomFixtureSpec(t);
                  return <option key={t} value={t}>{spec?.label ?? t}</option>;
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Door */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={door.enabled}
            onChange={(e) => { setDoor((d) => ({ ...d, enabled: e.target.checked })); setSaved(false); }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Porta de banheiro (fechadura de privacidade)
        </label>
        {door.enabled && (
          <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
            <NumField label="Largura (m)" value={door.width} onChange={(v) => { setDoor((d) => ({ ...d, width: v })); setSaved(false); }} step={0.05} />
            <NumField label="Altura (m)" value={door.height} onChange={(v) => { setDoor((d) => ({ ...d, height: v })); setSaved(false); }} step={0.05} />
          </div>
        )}
      </div>

      {/* Window */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={win.enabled}
            onChange={(e) => { setWin((w) => ({ ...w, enabled: e.target.checked })); setSaved(false); }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Janela de banheiro (peitoril, fixação e selante)
        </label>
        {win.enabled && (
          <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
            <NumField label="Largura (m)" value={win.width} onChange={(v) => { setWin((w) => ({ ...w, width: v })); setSaved(false); }} step={0.05} />
            <NumField label="Altura (m)" value={win.height} onChange={(v) => { setWin((w) => ({ ...w, height: v })); setSaved(false); }} step={0.05} />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 col-span-2">
              <input
                type="checkbox"
                checked={win.telaMosquiteira}
                onChange={(e) => { setWin((w) => ({ ...w, telaMosquiteira: e.target.checked })); setSaved(false); }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Incluir tela mosquiteira
            </label>
            <p className="text-[11px] text-gray-400 col-span-2">
              Sem ventilação natural? Adicione o equipamento &quot;Exaustor de banheiro&quot; acima.
            </p>
          </div>
        )}
      </div>

      {/* Wall tile — 3 modos no padrão econômico */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Revestimento de parede (azulejo)</p>
        <div className="grid grid-cols-2 gap-2">
          <SelField
            label="Escopo"
            value={wallTile.mode}
            onChange={(v) => { setWallTile((w) => ({ ...w, mode: v })); setSaved(false); }}
            options={WALL_TILE_MODES}
          />
          {(wallTile.mode === "ALTURA" || wallTile.mode === "BOX") && (
            <NumField
              label="Altura do azulejo (m)"
              value={wallTile.height}
              onChange={(v) => { setWallTile((w) => ({ ...w, height: v })); setSaved(false); }}
            />
          )}
        </div>
        {wallTile.mode === "BOX" && !fixtures.some((f) => f.fixtureType === "BOX_FRONTAL") && (
          <p className="text-[11px] text-amber-700 mt-1.5">
            Nenhum box selecionado — a área será estimada por 1,00 m de largura.
          </p>
        )}
      </div>

      {/* Impermeabilização — liga/desliga */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={impermOn}
            onChange={(e) => { setImpermOn(e.target.checked); setSaved(false); }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Impermeabilização básica
        </label>
        <p className="text-[11px] text-gray-400 mt-1 pl-6">
          Piso, rodapé em todo o perímetro e a área do box quando houver. Alturas e
          número de demãos vêm das Premissas de Cálculo.
        </p>
      </div>

      {/* Itens opcionais — recolhido; nada aqui entra automaticamente */}
      <div className="mb-3 rounded-md bg-white border border-gray-200">
        <button
          type="button"
          onClick={() => setOptionalsOpen((v) => !v)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <span className="text-sm font-medium text-gray-700">
            Itens opcionais
            {optionalCount > 0 && (
              <span className="ml-2 text-xs font-normal text-blue-700">
                {optionalCount} selecionado{optionalCount > 1 ? "s" : ""}
              </span>
            )}
          </span>
          {optionalsOpen
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {optionalsOpen && (
          <div className="border-t border-gray-100 p-3">
            <div className="flex flex-wrap gap-2">
              {BATHROOM_OPTIONAL_FIXTURES.map((o) => {
                const on = fixtures.some((f) => f.fixtureType === o.fixtureType);
                return (
                  <button
                    key={o.fixtureType}
                    type="button"
                    onClick={() => toggleOptionalFixture(o.fixtureType)}
                    className={
                      "text-xs px-2.5 py-1 rounded-full border transition-colors " +
                      (on
                        ? "border-blue-400 bg-blue-100 text-blue-800 font-medium"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50")
                    }
                  >
                    {on ? "✓ " : "+ "}{o.label}
                  </button>
                );
              })}
              {BATHROOM_ACCESSORIES.map((a) => {
                const on = (accessories[a.type]?.qty ?? 0) > 0;
                return (
                  <button
                    key={a.type}
                    type="button"
                    onClick={() => {
                      setAccessories((prev) => {
                        const next = { ...prev };
                        if (on) delete next[a.type];
                        else next[a.type] = { qty: 1, config: defaultAccessoryConfig(a.type) };
                        return next;
                      });
                      setSaved(false);
                    }}
                    className={
                      "text-xs px-2.5 py-1 rounded-full border transition-colors " +
                      (on
                        ? "border-blue-400 bg-blue-100 text-blue-800 font-medium"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50")
                    }
                  >
                    {on ? "✓ " : "+ "}{a.label}
                  </button>
                );
              })}
            </div>

            {/* Só o box pede medida; o resto usa dimensão padrão da biblioteca */}
            {fixtures
              .filter((f) => f.fixtureType === "BOX_FRONTAL")
              .map((f) => (
                <div key={f.uid} className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-end gap-2">
                  <span className="text-xs font-medium text-gray-600 min-w-24">Box de vidro</span>
                  <div className="w-24">
                    <NumField
                      label="Largura (m)"
                      value={Number(f.config.width ?? 1)}
                      onChange={(v) => updateFixtureConfig(f.uid, "width", v)}
                    />
                  </div>
                  <div className="w-24">
                    <NumField
                      label="Altura (m)"
                      value={Number(f.config.height ?? 1.9)}
                      onChange={(v) => updateFixtureConfig(f.uid, "height", v)}
                    />
                  </div>
                  <div className="w-32">
                    <SelField
                      label="Preço por"
                      value={String(f.config.priceMode ?? "conjunto")}
                      onChange={(v) => updateFixtureConfig(f.uid, "priceMode", v)}
                      options={[
                        { value: "conjunto", label: "Conjunto" },
                        { value: "m2", label: "m² de vidro" },
                      ]}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Point demand preview */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Pontos necessários (gerados automaticamente)</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(pointDemand?.hydraulic ?? {}).map(([type, qty]) => (
            <span key={type} className="text-xs px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-800">
              {HYDRAULIC_LABELS[type] ?? type}: {qty}
            </span>
          ))}
          {Object.entries(pointDemand?.electrical ?? {}).map(([type, qty]) => (
            <span key={type} className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800">
              {ELECTRICAL_LABELS[type] ?? type}: {qty}
            </span>
          ))}
          {Object.keys(pointDemand?.hydraulic ?? {}).length === 0 &&
            Object.keys(pointDemand?.electrical ?? {}).length === 0 && (
              <span className="text-xs text-gray-400 italic">Adicione equipamentos para ver os pontos.</span>
            )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Equipamentos salvos
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar equipamentos"}
        </button>
      </div>
    </div>
  );
}

// ── Fixture row ─────────────────────────────────────────────────────────────
function FixtureRow({
  fixture, onRemove, onConfig, onQty, onToggleIncluded,
}: {
  fixture: FixtureState;
  onRemove: () => void;
  onConfig: (key: string, value: unknown) => void;
  onQty: (qty: number) => void;
  onToggleIncluded: (material: string) => void;
}) {
  const spec = getBathroomFixtureSpec(fixture.fixtureType);
  const includables = includableComponents(fixture.fixtureType, fixture.config);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{spec?.label ?? fixture.fixtureType}</span>
          <input
            type="number"
            min={1}
            value={fixture.quantity}
            onChange={(e) => onQty(parseInt(e.target.value) || 1)}
            className="w-14 text-center rounded border border-gray-300 px-1 py-0.5 text-sm"
          />
        </div>
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Config fields */}
      {spec?.configSchema && Object.keys(spec.configSchema).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {Object.entries(spec.configSchema).map(([key, field]) => {
            const val = fixture.config[key];
            if (field.type === "boolean") {
              return (
                <label key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={(e) => onConfig(key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {field.label}
                </label>
              );
            }
            if (field.type === "enum") {
              return (
                <label key={key} className="flex flex-col gap-0.5 text-xs text-gray-600">
                  {field.label}
                  <select
                    value={String(val ?? field.default ?? "")}
                    onChange={(e) => onConfig(key, e.target.value)}
                    className="rounded border border-gray-300 px-1.5 py-1 text-sm"
                  >
                    {(field.options ?? []).map((o) => <option key={o} value={o}>{o}{field.unit ? ` ${field.unit}` : ""}</option>)}
                  </select>
                </label>
              );
            }
            return (
              <label key={key} className="flex flex-col gap-0.5 text-xs text-gray-600">
                {field.label}
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={val === undefined ? "" : String(val)}
                  step={field.type === "number" ? "any" : undefined}
                  onChange={(e) => onConfig(key, field.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                  className="rounded border border-gray-300 px-1.5 py-1 text-sm"
                />
              </label>
            );
          })}
        </div>
      )}

      {/* Included components */}
      {includables.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-gray-400 mb-1">Já incluso no produto comprado:</p>
          <div className="flex flex-wrap gap-1.5">
            {includables.map((mat) => {
              const on = fixture.includedComponents.includes(mat);
              return (
                <button
                  key={mat}
                  type="button"
                  onClick={() => onToggleIncluded(mat)}
                  className={
                    "text-[11px] px-2 py-0.5 rounded-full border " +
                    (on ? "border-green-400 bg-green-50 text-green-700" : "border-gray-300 bg-white text-gray-500")
                  }
                >
                  {on ? "✓ " : ""}{mat}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small field helpers ─────────────────────────────────────────────────────
function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-0.5 text-xs text-gray-600">
      {label}
      <input
        type="number"
        value={value}
        step={step ?? "any"}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="rounded border border-gray-300 px-1.5 py-1 text-sm"
      />
    </label>
  );
}

function SelField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-0.5 text-xs text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-1.5 py-1 text-sm"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ── utils ──
function safeParse(s: string | null): Record<string, unknown> {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}
function round2(n: number) { return Math.round(n * 100) / 100; }
