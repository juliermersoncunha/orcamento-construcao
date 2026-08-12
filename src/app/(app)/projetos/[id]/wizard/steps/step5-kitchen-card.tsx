"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRoomEquipment, type RoomEquipmentPayload } from "@/app/actions/fixtures";
import {
  KITCHEN_FIXTURE_GROUPS,
  KITCHEN_STANDARD_PRESET,
  KITCHEN_ACCESSORIES,
  KITCHEN_OPTIONAL_FIXTURES,
  KITCHEN_ROOM_TYPES,
  getKitchenFixtureSpec,
  getKitchenAccessorySpec,
} from "@/lib/fixture-library/kitchen";
import { includableComponents, getFixtureSpec } from "@/lib/fixture-library/registry";
import { computePointDemand } from "@/lib/calculations/fixture-engine";
import { ChefHat, Trash2, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

type FixtureState = {
  uid: string;
  fixtureType: string;
  quantity: number;
  config: Record<string, unknown>;
  includedComponents: string[];
};

type AccessoryState = {
  qty: number;
  config: Record<string, unknown>;
};

let uidCounter = 0;
const nextUid = () => `kx-${++uidCounter}`;

const HYDRAULIC_LABELS: Record<string, string> = {
  AGUA_FRIA: "Água fria",
  ESGOTO_50: "Esgoto 50mm",
};

// Wall tile modes específicos da cozinha: sem, só na parede da pia (comprimento
// informado) ou todas as paredes. Se "somente parede da pia" for escolhido, o
// motor recebe uma linha WALLFINISH sintética com wallSide="PIA" e a área
// exata (evitando usar o perímetro completo da cozinha).
const KITCHEN_WALL_MODES = [
  { value: "NENHUM",  label: "Sem revestimento de parede" },
  { value: "PIA",     label: "Somente parede da pia" },
  { value: "TODAS",   label: "Todas as paredes, do piso ao teto" },
  { value: "ALTURA",  label: "Todas as paredes até uma altura" },
];

type WallTileState = {
  mode: string;
  height: number;
  comprimento: number; // usado no modo PIA
};

export function KitchenCard({ room }: { room: any }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [roomType, setRoomType] = useState<string>(
    room.roomType && KITCHEN_ROOM_TYPES.some((t) => t.value === room.roomType)
      ? room.roomType
      : "COZINHA"
  );

  const [fixtures, setFixtures] = useState<FixtureState[]>(
    (room.fixtures ?? [])
      .filter((f: any) => getKitchenFixtureSpec(f.fixtureType))
      .map((f: any) => ({
        uid: nextUid(),
        fixtureType: f.fixtureType,
        quantity: f.quantity,
        config: safeParse(f.configJson),
        includedComponents: f.includedComponents ?? [],
      }))
  );

  const [accessories, setAccessories] = useState<Record<string, AccessoryState>>(() => {
    const map: Record<string, AccessoryState> = {};
    (room.accessories ?? [])
      .filter((a: any) => getKitchenAccessorySpec(a.accessoryType))
      .forEach((a: any) => {
        map[a.accessoryType] = { qty: a.quantity, config: safeParse(a.configJson) };
      });
    return map;
  });

  const [wallTile, setWallTile] = useState<WallTileState>(() => {
    const existing = ((room.wallFinishes ?? []) as any[]).filter((w) => w.hasTile);
    if (existing.length === 0) return { mode: "NENHUM", height: 1.5, comprimento: room.width };
    const height = existing[0].tileHeight ?? 1.5;
    if (existing.some((w) => w.wallSide === "PIA")) {
      const pia = existing.find((w) => w.wallSide === "PIA");
      return { mode: "PIA", height, comprimento: pia?.wallLength ?? room.width };
    }
    if (height >= room.height) return { mode: "TODAS", height, comprimento: room.width };
    return { mode: "ALTURA", height, comprimento: room.width };
  });

  const [optionalsOpen, setOptionalsOpen] = useState(false);

  // ── Live point demand (só para mostrar; não valida) ───────────────────────
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

  const optionalTypes = new Set(KITCHEN_OPTIONAL_FIXTURES.map((o) => o.fixtureType));
  const mainFixtures = fixtures.filter((f) => !optionalTypes.has(f.fixtureType));
  const optionalCount =
    fixtures.filter((f) => optionalTypes.has(f.fixtureType)).length +
    Object.values(accessories).filter((a) => a.qty > 0).length;

  // ── Mutators ──────────────────────────────────────────────────────────────
  function applyPreset() {
    setFixtures(
      KITCHEN_STANDARD_PRESET.map((p) => ({
        uid: nextUid(),
        fixtureType: p.fixtureType,
        quantity: 1,
        config: { ...((p as any).config ?? {}) },
        includedComponents: [],
      }))
    );
    setSaved(false);
  }

  function addFixture(fixtureType: string) {
    const spec = getKitchenFixtureSpec(fixtureType);
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

  function toggleOptionalFixture(fixtureType: string) {
    const has = fixtures.some((f) => f.fixtureType === fixtureType);
    if (has) {
      setFixtures((prev) => prev.filter((f) => f.fixtureType !== fixtureType));
    } else {
      addFixture(fixtureType);
    }
    setSaved(false);
  }

  function toggleAccessory(type: string) {
    setAccessories((prev) => {
      const cur = prev[type];
      if (cur && cur.qty > 0) {
        const { [type]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [type]: { qty: 1, config: {} } };
    });
    setSaved(false);
  }

  function wallFinishesFor() {
    if (wallTile.mode === "NENHUM") return [];
    if (wallTile.mode === "TODAS") {
      return ["FRENTE","FUNDO","ESQUERDA","DIREITA"].map((s) => ({
        wallSide: s, hasTile: true, tileHeight: room.height,
      }));
    }
    if (wallTile.mode === "ALTURA") {
      return ["FRENTE","FUNDO","ESQUERDA","DIREITA"].map((s) => ({
        wallSide: s, hasTile: true, tileHeight: wallTile.height,
      }));
    }
    if (wallTile.mode === "PIA") {
      return [{
        wallSide: "PIA", hasTile: true,
        tileHeight: wallTile.height,
        wallLength: wallTile.comprimento,
      }];
    }
    return [];
  }

  function handleSave() {
    const payload: RoomEquipmentPayload = {
      roomType,
      fixtures: fixtures.map((f) => ({
        fixtureType: f.fixtureType,
        quantity: f.quantity,
        config: f.config,
        includedComponents: f.includedComponents,
      })),
      door: null,
      window: null,
      accessories: Object.entries(accessories)
        .filter(([, a]) => a.qty > 0)
        .map(([accessoryType, a]) => ({ accessoryType, quantity: a.qty, config: a.config })),
      imperm: null,
      wallFinishes: wallFinishesFor(),
    };
    startTransition(async () => {
      await saveRoomEquipment(room.id, payload);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-orange-700" />
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
            className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {KITCHEN_ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyPreset}
            className="text-xs px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 bg-white hover:bg-orange-100 flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Cozinha padrão econômica
          </button>
        </div>
      </div>

      {/* Fixtures */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Equipamentos</p>
        {mainFixtures.length === 0 && (
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

        <div className="mt-2">
          <select
            value=""
            onChange={(e) => { if (e.target.value) addFixture(e.target.value); e.target.value = ""; }}
            className="text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">+ Adicionar equipamento…</option>
            {KITCHEN_FIXTURE_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map((t) => {
                  const spec = getKitchenFixtureSpec(t);
                  return <option key={t} value={t}>{spec?.label ?? t}</option>;
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Revestimento de parede */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Revestimento de parede</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="flex flex-col gap-0.5 text-xs text-gray-600 sm:col-span-1">
            Modo
            <select
              value={wallTile.mode}
              onChange={(e) => { setWallTile((w) => ({ ...w, mode: e.target.value })); setSaved(false); }}
              className="rounded border border-gray-300 px-1.5 py-1 text-sm"
            >
              {KITCHEN_WALL_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          {wallTile.mode === "PIA" && (
            <label className="flex flex-col gap-0.5 text-xs text-gray-600">
              Comprimento da parede (m)
              <input
                type="number" step="any" value={wallTile.comprimento}
                onChange={(e) => { setWallTile((w) => ({ ...w, comprimento: parseFloat(e.target.value) || 0 })); setSaved(false); }}
                className="rounded border border-gray-300 px-1.5 py-1 text-sm"
              />
            </label>
          )}
          {(wallTile.mode === "PIA" || wallTile.mode === "ALTURA") && (
            <label className="flex flex-col gap-0.5 text-xs text-gray-600">
              Altura (m)
              <input
                type="number" step="any" value={wallTile.height}
                onChange={(e) => { setWallTile((w) => ({ ...w, height: parseFloat(e.target.value) || 0 })); setSaved(false); }}
                className="rounded border border-gray-300 px-1.5 py-1 text-sm"
              />
            </label>
          )}
        </div>
      </div>

      {/* Optionals */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setOptionalsOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 hover:text-gray-800"
        >
          {optionalsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Itens opcionais
          {optionalCount > 0 && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 normal-case tracking-normal">
              {optionalCount}
            </span>
          )}
        </button>
        {optionalsOpen && (
          <div className="rounded-md border border-gray-200 bg-white p-2.5">
            <p className="text-[11px] text-gray-400 mb-1.5">Selecione o que a cozinha vai receber:</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {KITCHEN_OPTIONAL_FIXTURES.map((opt) => {
                const on = fixtures.some((f) => f.fixtureType === opt.fixtureType);
                return (
                  <button
                    key={opt.fixtureType}
                    type="button"
                    onClick={() => toggleOptionalFixture(opt.fixtureType)}
                    className={
                      "text-xs px-2.5 py-1 rounded-full border " +
                      (on ? "border-orange-400 bg-orange-50 text-orange-700" : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50")
                    }
                  >
                    {on ? <><Check className="w-3 h-3 inline mr-0.5" />{opt.label}</> : opt.label}
                  </button>
                );
              })}
              {KITCHEN_ACCESSORIES.map((a) => {
                const on = (accessories[a.type]?.qty ?? 0) > 0;
                return (
                  <button
                    key={a.type}
                    type="button"
                    onClick={() => toggleAccessory(a.type)}
                    className={
                      "text-xs px-2.5 py-1 rounded-full border " +
                      (on ? "border-orange-400 bg-orange-50 text-orange-700" : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50")
                    }
                  >
                    {on ? <><Check className="w-3 h-3 inline mr-0.5" />{a.label}</> : a.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Point demand preview */}
      {pointDemand && (Object.keys(pointDemand.hydraulic).length + Object.keys(pointDemand.electrical).length > 0) && (
        <div className="mb-3 text-xs text-gray-600 bg-white/60 rounded border border-gray-200 p-2">
          <span className="font-medium">Pontos exigidos: </span>
          {Object.entries(pointDemand.hydraulic).map(([k, v]) => (
            <span key={k} className="mr-2">{HYDRAULIC_LABELS[k] ?? k}: {v}</span>
          ))}
          {Object.entries(pointDemand.electrical).map(([k, v]) => (
            <span key={k} className="mr-2">{k}: {v}</span>
          ))}
          <span className="text-gray-400"> · tubos e conexões continuam manuais na seção abaixo.</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Salvo</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="text-sm px-3 py-1.5 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar cozinha"}
        </button>
      </div>
    </div>
  );
}

// ── FixtureRow (mesmo layout do banheiro, adaptado ao registry) ────────────
function FixtureRow({
  fixture, onRemove, onConfig, onQty, onToggleIncluded,
}: {
  fixture: FixtureState;
  onRemove: () => void;
  onConfig: (key: string, value: unknown) => void;
  onQty: (qty: number) => void;
  onToggleIncluded: (material: string) => void;
}) {
  const spec = getFixtureSpec(fixture.fixtureType);
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
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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

function safeParse(s: string | null): Record<string, unknown> {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}

function round2(n: number) { return Math.round(n * 100) / 100; }
