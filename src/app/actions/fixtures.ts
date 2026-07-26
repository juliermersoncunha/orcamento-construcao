"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  RoomType,
  FixtureType,
  JoineryType,
  ImpermScope,
} from "@prisma/client";

// Payload persisted for one room's "equipamentos por ambiente" configuration.
export type RoomEquipmentPayload = {
  roomType: string;
  fixtures: {
    fixtureType: string;
    quantity: number;
    config: Record<string, unknown>;
    includedComponents: string[];
    exclusionGroup?: string | null;
  }[];
  door: {
    subtype: string;
    width: number;
    height: number;
    material: string;
    includedComponents: string[];
  } | null;
  accessories: { accessoryType: string; quantity: number }[];
  imperm: {
    scope: string;
    area: number;
    wallHeight: number;
    ralos: number;
    tubulacoes: number;
    system: string;
    coats: number;
    mechProtection: boolean;
  } | null;
};

async function assertOwnsRoom(roomId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const room = await prisma.room.findFirst({
    where: { id: roomId, project: { userId: session.userId } },
    select: { id: true, projectId: true },
  });
  if (!room) redirect("/projetos");
  return room;
}

export async function saveRoomEquipment(roomId: string, payload: RoomEquipmentPayload) {
  const room = await assertOwnsRoom(roomId);

  await prisma.$transaction(async (tx) => {
    // 1. Room type
    await tx.room.update({
      where: { id: roomId },
      data: { roomType: payload.roomType as RoomType },
    });

    // 2. Fixtures — replace all for this room
    await tx.fixture.deleteMany({ where: { roomId } });
    for (const fx of payload.fixtures) {
      await tx.fixture.create({
        data: {
          roomId,
          fixtureType: fx.fixtureType as FixtureType,
          quantity: fx.quantity,
          exclusionGroup: fx.exclusionGroup ?? null,
          configJson: JSON.stringify(fx.config ?? {}),
          includedComponents: fx.includedComponents ?? [],
        },
      });
    }

    // 3. Bathroom door — replace the "banheiro" joinery only
    await tx.roomJoinery.deleteMany({ where: { roomId, subtype: "banheiro" } });
    if (payload.door) {
      await tx.roomJoinery.create({
        data: {
          roomId,
          joineryType: JoineryType.PORTA_INTERNA,
          subtype: payload.door.subtype,
          width: payload.door.width,
          height: payload.door.height,
          material: payload.door.material,
          quantity: 1,
          prefinished: false,
          includedComponents: payload.door.includedComponents ?? [],
        },
      });
    }

    // 4. Accessories — replace all for this room
    await tx.accessory.deleteMany({ where: { roomId } });
    for (const a of payload.accessories) {
      if (a.quantity <= 0) continue;
      await tx.accessory.create({
        data: { roomId, accessoryType: a.accessoryType, quantity: a.quantity },
      });
    }

    // 5. Impermeabilization — upsert (unique per room)
    if (payload.imperm && payload.imperm.scope !== "NENHUM") {
      const im = payload.imperm;
      await tx.roomImpermeabilization.upsert({
        where: { roomId },
        create: {
          roomId,
          scope: im.scope as ImpermScope,
          area: im.area,
          wallHeight: im.wallHeight,
          ralos: im.ralos,
          tubulacoes: im.tubulacoes,
          system: im.system,
          coats: im.coats,
          mechProtection: im.mechProtection,
        },
        update: {
          scope: im.scope as ImpermScope,
          area: im.area,
          wallHeight: im.wallHeight,
          ralos: im.ralos,
          tubulacoes: im.tubulacoes,
          system: im.system,
          coats: im.coats,
          mechProtection: im.mechProtection,
        },
      });
    } else {
      await tx.roomImpermeabilization.deleteMany({ where: { roomId } });
    }
  });

  revalidatePath(`/projetos/${room.projectId}/wizard`);
}
