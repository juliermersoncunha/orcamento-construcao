"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calculateMaterials } from "@/lib/calculations";
import type { CalculationInput, RoomInput } from "@/lib/calculations";
import { MaterialCategory, PhaseType } from "@/generated/prisma/index";

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

  // Parse rooms from formData — expects roomName[], roomWidth[], roomLength[], roomHeight[]
  const names = formData.getAll("roomName") as string[];
  const widths = formData.getAll("roomWidth") as string[];
  const lengths = formData.getAll("roomLength") as string[];
  const heights = formData.getAll("roomHeight") as string[];

  const rooms = names
    .map((name, i) => ({
      name,
      width: parseFloat(widths[i]) || 0,
      length: parseFloat(lengths[i]) || 0,
      height: parseFloat(heights[i]) || 2.8,
    }))
    .filter((r) => r.name && r.width > 0 && r.length > 0);

  await prisma.$transaction([
    prisma.room.deleteMany({ where: { projectId } }),
    ...rooms.map((room, i) =>
      prisma.room.create({
        data: { projectId, ...room, order: i },
      })
    ),
    prisma.project.update({
      where: { id: projectId },
      data: { wizardStep: Math.max(project.wizardStep, 3) },
    }),
  ]);

  revalidatePath(`/projetos/${projectId}/wizard`);
  redirect(`/projetos/${projectId}/wizard?etapa=3`);
}

export async function saveStep3Structure(projectId: string, formData: FormData) {
  const { project } = await getProject(projectId);

  await prisma.projectStructure.upsert({
    where: { projectId },
    create: {
      projectId,
      foundationType: formData.get("foundationType") as string,
      structureType: formData.get("structureType") as string,
      blockType: formData.get("blockType") as string,
      floors: parseInt(formData.get("floors") as string) || 1,
      hasLaje: formData.get("hasLaje") === "true",
      hasEscada: formData.get("hasEscada") === "true",
    },
    update: {
      foundationType: formData.get("foundationType") as string,
      structureType: formData.get("structureType") as string,
      blockType: formData.get("blockType") as string,
      floors: parseInt(formData.get("floors") as string) || 1,
      hasLaje: formData.get("hasLaje") === "true",
      hasEscada: formData.get("hasEscada") === "true",
    },
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
    },
    update: {
      roofType: formData.get("roofType") as string,
      tileType: formData.get("tileType") as string,
      inclination: parseFloat(formData.get("inclination") as string) || 30,
      hasRoof: formData.get("hasRoof") !== "false",
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
    },
    update: {
      doors: parseInt(formData.get("doors") as string) || 0,
      windows: parseInt(formData.get("windows") as string) || 0,
      externalDoors: parseInt(formData.get("externalDoors") as string) || 1,
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
    },
    roofing: {
      roofType: project.roofing?.roofType ?? "duas_aguas",
      tileType: project.roofing?.tileType ?? "ceramica",
      inclination: project.roofing?.inclination ?? 30,
      hasRoof: project.roofing?.hasRoof ?? true,
    },
    finishes: {
      doors: project.finishes?.doors ?? 0,
      windows: project.finishes?.windows ?? 0,
      externalDoors: project.finishes?.externalDoors ?? 1,
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
      { name: "Tijolo furado 9×19×19", unit: "un", category: "ALVENARIA", qty: wallArea * 25 * 1.10 },
      { name: "Cimento CP-II",         unit: "sc", category: "ESTRUTURA",  qty: wallArea * 0.07 * 1.05 },
      { name: "Areia grossa",          unit: "m³", category: "ESTRUTURA",  qty: wallArea * 0.01 * 1.05 },
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

  // Get or create materials in DB and save budget items
  await prisma.budgetItem.deleteMany({ where: { projectId } });

  for (const mat of materials) {
    let material = await prisma.material.findFirst({
      where: { name: mat.name, active: true },
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          name: mat.name,
          unit: mat.unit,
          category: mat.category as MaterialCategory,
          currentPrice: 0,
        },
      });
    }

    await prisma.budgetItem.create({
      data: {
        projectId,
        materialId: material.id,
        phase: mat.phase as PhaseType,
        quantity: mat.quantity,
        unitPriceSnapshot: material.currentPrice,
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
