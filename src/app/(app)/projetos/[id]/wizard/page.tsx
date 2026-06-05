import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WizardContainer } from "./wizard-container";

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { id } = await params;
  const { etapa } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.userId },
    include: {
      rooms: { orderBy: { order: "asc" } },
      structure: true,
      roofing: true,
      installations: { include: { electricalPoints: true, hydraulicPoints: true } },
      finishes: { include: { roomFinishes: true } },
      walls: true,
    },
  });

  if (!project) redirect("/projetos");

  const currentStep = etapa ? parseInt(etapa) : Math.min(project.wizardStep, 8);

  return <WizardContainer project={project} currentStep={currentStep} />;
}
