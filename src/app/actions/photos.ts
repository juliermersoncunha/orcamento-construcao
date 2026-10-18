"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp"]);
// O navegador reduz antes de enviar; isto só barra o que escapou da redução.
const MAX_BYTES = 950_000;

async function assertOwnsProject(projectId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
    select: { id: true },
  });
  if (!p) redirect("/projetos");
}

async function donoDaFoto(photoId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const f = await prisma.renovationPhoto.findFirst({
    where: { id: photoId, project: { userId: session.userId } },
    select: { id: true, projectId: true },
  });
  if (!f) redirect("/projetos");
  return f;
}

function touch(projectId: string) {
  revalidatePath(`/projetos/${projectId}/diagnostico`);
}

async function ambienteDoProjeto(projectId: string, roomId: string | null) {
  if (!roomId) return null;
  const room = await prisma.room.findFirst({ where: { id: roomId, projectId }, select: { id: true } });
  return room?.id ?? null;
}

export async function addRenovationPhoto(projectId: string, fd: FormData) {
  await assertOwnsProject(projectId);
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "Nenhuma foto enviada." };
  if (!TIPOS.has(file.type)) return { error: "Formato não suportado. Use JPG, PNG ou WEBP." };
  if (file.size > MAX_BYTES) return { error: "Foto grande demais mesmo depois de reduzida." };

  const width = Number(fd.get("width")) || 0;
  const height = Number(fd.get("height")) || 0;
  const caption = String(fd.get("caption") ?? "").trim() || null;
  const roomId = await ambienteDoProjeto(projectId, (fd.get("roomId") as string) || null);

  const last = await prisma.renovationPhoto.findFirst({
    where: { projectId }, orderBy: { order: "desc" }, select: { order: true },
  });
  await prisma.renovationPhoto.create({
    data: {
      projectId, roomId, caption, width, height,
      mime: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
      order: (last?.order ?? -1) + 1,
    },
  });
  touch(projectId);
  return {};
}

export async function updateRenovationPhoto(photoId: string, input: { caption?: string; roomId?: string | null }) {
  const f = await donoDaFoto(photoId);
  const data: { caption?: string | null; roomId?: string | null } = {};
  if (input.caption !== undefined) data.caption = input.caption.trim() || null;
  if (input.roomId !== undefined) data.roomId = await ambienteDoProjeto(f.projectId, input.roomId);
  await prisma.renovationPhoto.update({ where: { id: photoId }, data });
  touch(f.projectId);
  return {};
}

export async function deleteRenovationPhoto(photoId: string) {
  const f = await donoDaFoto(photoId);
  await prisma.renovationPhoto.delete({ where: { id: photoId } });
  touch(f.projectId);
  return {};
}
