import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Fica fora do proxy (matcher exclui /api), então a sessão e o dono da foto
// são conferidos aqui.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Não autorizado", { status: 401 });

  const { id } = await params;
  const foto = await prisma.renovationPhoto.findFirst({
    where: { id, project: { userId: session.userId } },
    select: { data: true, mime: true },
  });
  if (!foto) return new Response("Não encontrada", { status: 404 });

  return new Response(Buffer.from(foto.data), {
    headers: {
      "Content-Type": foto.mime,
      // O conteúdo de um id nunca muda: troca de foto = id novo.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
