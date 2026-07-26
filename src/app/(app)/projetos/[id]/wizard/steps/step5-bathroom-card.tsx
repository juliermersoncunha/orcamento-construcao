"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRoomEquipment, type RoomEquipmentPayload } from "@/app/actions/fixtures";
import {
  BATHROOM_FIXTURES,
  BATHROOM_FIXTURE_GROUPS,
  BATHROOM_STANDARD_PRESET,
  BATHROOM_ACCESSORIES,
  BATHROOM_ROOM_TYPES,
  getBathroomFixtureSpec,
  includableComponents,
} from "@/lib/fixture-library/bathroom";
import { computePointDemand } from "@/lib/calculations/fixture-engine";
import { Bath, Plus, Trash2, Check, Sparkles } from "lucide-react";

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

type ImpermState = {
  scope: string;
  area: number;
  wallHeight: number;
  ralos: number;
  tubulacoes: number;
  system: string;
  coats: number;
  mechProtection: boolean;
};

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

const IMPERM_SCOPES = [
  { value: "NENHUM", label: "Não calcular" },
  { value: "BOX", label: "Somente área do box" },
  { value: "PISO", label: "Piso completo" },
  { value: "PISO_PAREDES", label: "Piso e paredes" },
  { value: "CUSTOM", label: "Personalizada" },
];
const IMPERM_SYSTEMS_UI = [
  { value: "argamassa_polimerica", label: "Argamassa polimérica" },
  { value: "manta_asfaltica", label: "Manta asfáltica" },
];

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

  const [accessories, setAccessories] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    (room.accessories ?? []).forEach((a: any) => { map[a.accessoryType] = a.quantity; });
    return map;
  });

  const [imperm, setImperm] = useState<ImpermState>(() => {
    const im = room.imperm;
    return {
      scope: im?.scope ?? "NENHUM",
      area: im?.area ?? round2(room.width * room.length),
      wallHeight: im?.wallHeight ?? 1.5,
      ralos: im?.ralos ?? 1,
      tubulacoes: im?.tubulacoes ?? 3,
      system: im?.system ?? "argamassa_polimerica",
      coats: im?.coats ?? 3,
      mechProtection: im?.mechProtection ?? false,
    };
  });

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
      joineries: [], accessories: [], imperm: null,
    };
    return computePointDemand([engineRoom])[0];
  }, [fixtures, roomType, room.id, room.name, room.width, room.length, room.height]);

  // ── Mutators ──────────────────────────────────────────────────────────────
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
        .filter(([, q]) => q > 0)
        .map(([accessoryType, quantity]) => ({ accessoryType, quantity })),
      imperm: imperm.scope !== "NENHUM"
        ? { ...imperm }
        : null,
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
            Banheiro completo padrão
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
          {fixtures.map((f) => (
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

      {/* Impermeabilization */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Impermeabilização</p>
        <div className="grid grid-cols-2 gap-2">
          <SelField label="Escopo" value={imperm.scope} onChange={(v) => { setImperm((i) => ({ ...i, scope: v })); setSaved(false); }} options={IMPERM_SCOPES} />
          {imperm.scope !== "NENHUM" && (
            <>
              <SelField label="Sistema" value={imperm.system} onChange={(v) => { setImperm((i) => ({ ...i, system: v })); setSaved(false); }} options={IMPERM_SYSTEMS_UI} />
              <NumField label="Área (m²)" value={imperm.area} onChange={(v) => { setImperm((i) => ({ ...i, area: v })); setSaved(false); }} step={0.1} />
              <NumField label="Altura nas paredes (m)" value={imperm.wallHeight} onChange={(v) => { setImperm((i) => ({ ...i, wallHeight: v })); setSaved(false); }} step={0.1} />
              <NumField label="Nº de ralos" value={imperm.ralos} onChange={(v) => { setImperm((i) => ({ ...i, ralos: v })); setSaved(false); }} step={1} />
              <NumField label="Nº de demãos" value={imperm.coats} onChange={(v) => { setImperm((i) => ({ ...i, coats: v })); setSaved(false); }} step={1} />
            </>
          )}
        </div>
      </div>

      {/* Accessories */}
      <div className="mb-3 rounded-md bg-white border border-gray-200 p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Acessórios (opcionais)</p>
        <div className="flex flex-wrap gap-2">
          {BATHROOM_ACCESSORIES.map((a) => {
            const active = (accessories[a.type] ?? 0) > 0;
            return (
              <button
                key={a.type}
                type="button"
                onClick={() => {
                  setAccessories((prev) => ({ ...prev, [a.type]: active ? 0 : 1 }));
                  setSaved(false);
                }}
                className={
                  "text-xs px-2.5 py-1 rounded-full border transition-colors " +
                  (active
                    ? "border-blue-400 bg-blue-100 text-blue-800 font-medium"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50")
                }
              >
                {active ? "✓ " : "+ "}{a.label}
              </button>
            );
          })}
        </div>
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
