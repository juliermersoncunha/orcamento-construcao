"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calculateMaterials } from "@/lib/calculations";
import type { CalculationInput, RoomInput } from "@/lib/calculations";
import { resolveRoomFixtures } from "@/lib/calculations/fixture-engine";
import type { RoomEngineInput } from "@/lib/calculations/fixture-engine";
import { MaterialCategory, PhaseType } from "@prisma/client";

async function getProject(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
  });

  if (!project) redirect("/projetos");
  return { project, session };
}

export async function saveStep2Rooms(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);

  // Parse rooms from formData — expects roomId[], roomName[], roomWidth[], roomLength[], roomHeight[]
  const ids = formData.getAll("roomId") as string[];
  const names = formData.getAll("roomName") as string[];
  const widths = formData.getAll("roomWidth") as string[];
  const lengths = formData.getAll("roomLength") as string[];
  const heights = formData.getAll("roomHeight") as string[];

  const rooms = names
    .map((name, i) => ({
      id: ids[i] ?? "",
      name,
      width: parseFloat(widths[i]) || 0,
      length: parseFloat(lengths[i]) || 0,
      height: parseFloat(heights[i]) || 2.8,
    }))
    .filter((r) => r.name && r.width > 0 && r.length > 0);

  // Update rooms in place (match by id) so linked data — fixtures, joineries,
  // accessories, impermeabilization, points, finishes — survives edits.
  // Only removed rooms are deleted; only added rooms are created.
  const existing = await prisma.room.findMany({
    where: { projectId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));
  const submittedExistingIds = new Set(
    rooms.map((r) => r.id).filter((id) => existingIds.has(id))
  );
  const toDelete = [...existingIds].filter((id) => !submittedExistingIds.has(id));

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.room.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (existingIds.has(r.id)) {
        await tx.room.update({
          where: { id: r.id },
          data: { name: r.name, width: r.width, length: r.length, height: r.height, order: i },
        });
      } else {
        await tx.room.create({
          data: { projectId, name: r.name, width: r.width, length: r.length, height: r.height, order: i },
        });
      }
    }
    await tx.project.update({
      where: { id: projectId },
      data: { wizardStep: Math.max(project.wizardStep, 3) },
    });
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=3`);
}

export async function saveStep3Structure(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);

  const f = (key: string, fallback = 0) => parseFloat(formData.get(key) as string) || fallback;
  const structData = {
    foundationType: formData.get("foundationType") as string,
    structureType: formData.get("structureType") as string,
    blockType: formData.get("blockType") as string,
    floors: parseInt(formData.get("floors") as string) || 1,
    hasLaje: formData.get("hasLaje") === "true",
    hasEscada: formData.get("hasEscada") === "true",
    pilarMetros: f("pilarMetros"),
    pilarLargura: f("pilarLargura", 0.15),
    pilarAltura: f("pilarAltura", 0.30),
    vigaMetros: f("vigaMetros"),
    vigaLargura: f("vigaLargura", 0.15),
    vigaAltura: f("vigaAltura", 0.40),
    sapataQtd: parseInt(formData.get("sapataQtd") as string) || 0,
    sapataLargura: f("sapataLargura", 0.60),
    sapataCompr: f("sapataCompr", 0.60),
    sapataAltura: f("sapataAltura", 0.30),
  };

  await prisma.projectStructure.upsert({
    where: { projectId },
    create: { projectId, ...structData },
    update: structData,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { wizardStep: Math.max(project.wizardStep, 4) },
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=4`);
}

export async function saveStep4Roofing(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);

  await prisma.projectRoofing.upsert({
    where: { projectId },
    create: {
      projectId,
      roofType: formData.get("roofType") as string,
      tileType: formData.get("tileType") as string,
      inclination: parseFloat(formData.get("inclination") as string) || 30,
      hasRoof: formData.get("hasRoof") !== "false",
      tileSize: (formData.get("tileSize") as string) || null,
    },
    update: {
      roofType: formData.get("roofType") as string,
      tileType: formData.get("tileType") as string,
      inclination: parseFloat(formData.get("inclination") as string) || 30,
      hasRoof: formData.get("hasRoof") !== "false",
      tileSize: (formData.get("tileSize") as string) || null,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { wizardStep: Math.max(project.wizardStep, 5) },
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=5`);
}

export async function saveStep5Installations(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);

  const rooms = await prisma.room.findMany({ where: { projectId } });

  const installations = await prisma.projectInstallations.upsert({
    where: { projectId },
    create: { projectId, heatingType: formData.get("heatingType") as string },
    update: { heatingType: formData.get("heatingType") as string },
  });

  await prisma.electricalPoint.deleteMany({ where: { installationsId: installations.id } });
  await prisma.hydraulicPoint.deleteMany({ where: { installationsId: installations.id } });

  for (const room of rooms) {
    await prisma.electricalPoint.create({
      data: {
        installationsId: installations.id,
        roomId: room.id,
        outlets: parseInt(formData.get(`outlets_${room.id}`) as string) || 2,
        switches: parseInt(formData.get(`switches_${room.id}`) as string) || 1,
        lightPoints: parseInt(formData.get(`lightPoints_${room.id}`) as string) || 1,
      },
    });
    await prisma.hydraulicPoint.create({
      data: {
        installationsId: installations.id,
        roomId: room.id,
        waterInlets: parseInt(formData.get(`waterInlets_${room.id}`) as string) || 0,
        drainPoints: parseInt(formData.get(`drainPoints_${room.id}`) as string) || 0,
      },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { wizardStep: Math.max(project.wizardStep, 6) },
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=6`);
}

export async function saveStep6Finishes(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);
  const rooms = await prisma.room.findMany({ where: { projectId } });

  const finishes = await prisma.projectFinishes.upsert({
    where: { projectId },
    create: {
      projectId,
      doors: parseInt(formData.get("doors") as string) || 0,
      windows: parseInt(formData.get("windows") as string) || 0,
      externalDoors: parseInt(formData.get("externalDoors") as string) || 1,
      wallFinishType: (formData.get("wallFinishType") as string) || "SO_TINTA",
    },
    update: {
      doors: parseInt(formData.get("doors") as string) || 0,
      windows: parseInt(formData.get("windows") as string) || 0,
      externalDoors: parseInt(formData.get("externalDoors") as string) || 1,
      wallFinishType: (formData.get("wallFinishType") as string) || "SO_TINTA",
    },
  });

  await prisma.roomFinish.deleteMany({ where: { finishesId: finishes.id } });

  for (const room of rooms) {
    await prisma.roomFinish.create({
      data: {
        finishesId: finishes.id,
        roomId: room.id,
        floorType: formData.get(`floorType_${room.id}`) as string || "ceramica",
        wallTile: formData.get(`wallTile_${room.id}`) === "true",
        wallTileHeight: parseFloat(formData.get(`wallTileHeight_${room.id}`) as string) || 1.5,
        paintWalls: formData.get(`paintWalls_${room.id}`) !== "false",
      },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { wizardStep: Math.max(project.wizardStep, 7) },
  });

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=7`);
}

export async function saveStep7Walls(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);

  const sides = ["FRONT", "BACK", "LEFT", "RIGHT"] as const;

  await prisma.$transaction([
    prisma.projectWall.deleteMany({ where: { projectId } }),
    ...sides.map((side) =>
      prisma.projectWall.create({
        data: {
          projectId,
          side,
          hasWall: formData.get(`hasWall_${side}`) === "true",
          length: parseFloat(formData.get(`length_${side}`) as string) || 0,
          height: parseFloat(formData.get(`height_${side}`) as string) || 2.0,
        },
      })
    ),
    prisma.project.update({
      where: { id: projectId },
      data: { wizardStep: Math.max(project.wizardStep, 8) },
    }),
  ]);

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=8`);
}

export async function calculateAndSaveBudget(projectId: string) {
  const { session } = await getProject(projectId);

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
    include: {
      rooms: {
        include: {
          electricalPoints: true,
          hydraulicPoints: true,
          roomFinishes: true,
          fixtures: true,
          joineries: true,
          accessories: true,
          imperm: true,
          wallFinishes: true,
        },
      },
      structure: true,
      roofing: true,
      installations: true,
      finishes: { include: { roomFinishes: true } },
      walls: true,
    },
  });

  if (!project) redirect("/projetos");

  const roomInputs: RoomInput[] = project.rooms.map((room) => {
    const ep = room.electricalPoints[0];
    const hp = room.hydraulicPoints[0];
    const rf = room.roomFinishes[0];
    // If a room has per-wall tile config, the fixture engine computes its wall
    // tile — the generic calc must skip it to avoid double counting.
    const hasCustomWallTile = room.wallFinishes.some((w) => w.hasTile);
    return {
      name: room.name,
      width: room.width,
      length: room.length,
      height: room.height,
      floorType: rf?.floorType,
      wallTile: rf?.wallTile,
      wallTileHeight: rf?.wallTileHeight,
      paintWalls: rf?.paintWalls,
      electricalOutlets: ep?.outlets,
      electricalSwitches: ep?.switches,
      electricalLightPoints: ep?.lightPoints,
      hydraulicWaterInlets: hp?.waterInlets,
      hydraulicDrainPoints: hp?.drainPoints,
      skipWallTile: hasCustomWallTile,
    };
  });

  const input: CalculationInput = {
    rooms: roomInputs,
    structure: {
      foundationType: project.structure?.foundationType ?? "sapata_corrida",
      structureType: project.structure?.structureType ?? "concreto_armado",
      blockType: project.structure?.blockType ?? "tijolo_furado",
      floors: project.structure?.floors ?? 1,
      hasLaje: project.structure?.hasLaje ?? false,
      hasEscada: project.structure?.hasEscada ?? false,
      pilarMetros: project.structure?.pilarMetros ?? 0,
      pilarLargura: project.structure?.pilarLargura ?? 0.15,
      pilarAltura: project.structure?.pilarAltura ?? 0.30,
      vigaMetros: project.structure?.vigaMetros ?? 0,
      vigaLargura: project.structure?.vigaLargura ?? 0.15,
      vigaAltura: project.structure?.vigaAltura ?? 0.40,
      sapataQtd: project.structure?.sapataQtd ?? 0,
      sapataLargura: project.structure?.sapataLargura ?? 0.60,
      sapataCompr: project.structure?.sapataCompr ?? 0.60,
      sapataAltura: project.structure?.sapataAltura ?? 0.30,
    },
    roofing: {
      roofType: project.roofing?.roofType ?? "duas_aguas",
      tileType: project.roofing?.tileType ?? "ceramica",
      inclination: project.roofing?.inclination ?? 30,
      hasRoof: project.roofing?.hasRoof ?? true,
      tileSize: project.roofing?.tileSize ?? null,
    },
    finishes: {
      doors: project.finishes?.doors ?? 0,
      windows: project.finishes?.windows ?? 0,
      externalDoors: project.finishes?.externalDoors ?? 1,
      wallFinishType: (project.finishes?.wallFinishType ?? "SO_TINTA") as "SO_TINTA" | "MASSA_TINTA" | "GESSO_TINTA",
    },
    heatingType: project.installations?.heatingType ?? "eletrico",
  };

  const materials = calculateMaterials(input);

  // Add muro materials if any walls are configured
  const wallArea = (project.walls ?? [])
    .filter((w: { hasWall: boolean }) => w.hasWall)
    .reduce((sum: number, w: { length: number; height: number }) => sum + w.length * w.height, 0);

  if (wallArea > 0) {
    // Muro alvenaria coefficients (mirrors GlobalPremise seed values)
    const muroMats = [
      { name: "Tijolo Cerâmico Furado 9x19x19", unit: "un", category: "ALVENARIA", qty: wallArea * 25 * 1.10 },
      { name: "Cimento CP-II (50kg)",            unit: "sc", category: "ALVENARIA", qty: wallArea * 0.07 * 1.05 },
      { name: "Areia Grossa",                    unit: "m³", category: "ALVENARIA", qty: wallArea * 0.01 * 1.05 },
    ];
    materials.push(
      ...muroMats.map((m) => ({
        name: m.name,
        unit: m.unit,
        category: m.category,
        phase: "OUTROS",
        quantity: Math.ceil(m.qty * 10) / 10,
      }))
    );
  }

  // ── Fixture library (equipamentos por ambiente) ──────────────────────────
  const engineRooms: RoomEngineInput[] = project.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    roomType: room.roomType,
    width: room.width,
    length: room.length,
    height: room.height,
    fixtures: room.fixtures.map((f) => ({
      id: f.id, roomId: f.roomId, fixtureType: f.fixtureType,
      quantity: f.quantity, configJson: f.configJson, includedComponents: f.includedComponents,
    })),
    joineries: room.joineries.map((j) => ({
      id: j.id, roomId: j.roomId, joineryType: j.joineryType,
      subtype: j.subtype, quantity: j.quantity, includedComponents: j.includedComponents,
      width: j.width, height: j.height, configJson: j.configJson,
    })),
    accessories: room.accessories.map((a) => ({
      id: a.id, roomId: a.roomId, accessoryType: a.accessoryType, quantity: a.quantity,
      configJson: a.configJson,
    })),
    imperm: room.imperm ? {
      roomId: room.imperm.roomId, scope: room.imperm.scope, area: room.imperm.area,
      wallHeight: room.imperm.wallHeight, ralos: room.imperm.ralos, tubulacoes: room.imperm.tubulacoes,
      system: room.imperm.system, coats: room.imperm.coats, mechProtection: room.imperm.mechProtection,
    } : null,
    wallFinishes: room.wallFinishes.map((w) => ({
      wallSide: w.wallSide, hasTile: w.hasTile, tileHeight: w.tileHeight,
      wallLength: w.wallLength ?? null,
    })),
  }));

  const premiseRows = await prisma.globalPremise.findMany();
  const premises = premiseRows.map((p) => ({ key: p.key, value: p.value }));

  const { items: fixtureItems } = resolveRoomFixtures(engineRooms, premises);

  // O cálculo genérico não gera mais "Box de Banheiro" — box é item opcional
  // por ambiente, adicionado no card do banheiro (fixture BOX_FRONTAL).
  // O dedup antigo virou desnecessário.

  // Dedup: portas detalhadas pela biblioteca já trazem a própria soleira de
  // granito, medida pela largura do vão. Não podem contar também a soleira
  // genérica por unidade.
  const detailedDoors = engineRooms.reduce(
    (n, r) => n + r.joineries.filter((j) => j.joineryType === "PORTA_INTERNA").length,
    0
  );
  if (detailedDoors > 0) {
    const soleira = materials.find((m) => m.name === "Soleira de Porta");
    if (soleira) soleira.quantity = Math.max(0, soleira.quantity - detailedDoors);
  }

  // ── Persist budget items ─────────────────────────────────────────────────
  await prisma.budgetItem.deleteMany({ where: { projectId } });

  // Material resolver with cache (avoids repeated queries across ~100 items)
  const matCache = new Map<string, { id: string; currentPrice: number }>();
  async function resolveMaterial(name: string, unit: string, category: string) {
    const cached = matCache.get(name);
    if (cached) return cached;
    let material = await prisma.material.findFirst({ where: { name, active: true } });
    if (!material) {
      material = await prisma.material.create({
        data: { name, unit, category: category as MaterialCategory, currentPrice: 0 },
      });
    }
    const rec = { id: material.id, currentPrice: material.currentPrice };
    matCache.set(name, rec);
    return rec;
  }

  // Classic per-phase items (roomId = null → consolidado / por-etapa apenas)
  for (const mat of materials) {
    if (mat.quantity <= 0) continue;
    const m = await resolveMaterial(mat.name, mat.unit, mat.category);
    await prisma.budgetItem.create({
      data: {
        projectId,
        materialId: m.id,
        phase: mat.phase as PhaseType,
        quantity: mat.quantity,
        unitPriceSnapshot: m.currentPrice,
        sourceKind: "GENERIC",
        autoGenerated: true,
      },
    });
  }

  // Fixture-generated items (carry room + source equipment + memory-of-calc)
  for (const it of fixtureItems) {
    if (it.quantity <= 0) continue;
    const m = await resolveMaterial(it.materialName, it.unit, it.category);
    await prisma.budgetItem.create({
      data: {
        projectId,
        materialId: m.id,
        phase: it.phase as PhaseType,
        quantity: it.quantity,
        unitPriceSnapshot: m.currentPrice,
        roomId: it.roomId,
        sourceKind: it.sourceKind,
        sourceLabel: it.sourceLabel,
        formula: it.formula,
        autoGenerated: true,
      },
    });
  }

  // Manual items (tubos e conexões informados pelo usuário na Etapa 5)
  const manualRows = await prisma.manualBudgetItem.findMany({
    where: { projectId },
    include: { material: true },
  });
  for (const row of manualRows) {
    if (row.quantity <= 0) continue;
    await prisma.budgetItem.create({
      data: {
        projectId,
        materialId: row.materialId,
        phase: "INSTALACOES_HIDROSSANITARIAS" as PhaseType,
        quantity: row.quantity,
        unitPriceSnapshot: row.material.currentPrice,
        sourceKind: "MANUAL",
        sourceLabel: "Informado manualmente",
        autoGenerated: false,
      },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "FINALIZADO" },
  });

  revalidatePath(`/projetos/${projectId}`);
  redirect(`/projetos/${projectId}/orcamento`);
}
