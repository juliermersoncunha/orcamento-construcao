"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { setProjectArchived } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function BotaoArquivar({
  projectId, nome, arquivado,
}: {
  projectId: string;
  nome: string;
  arquivado: boolean;
}) {
  const [ocupado, start] = useTransition();

  function clicar() {
    if (!arquivado && !window.confirm(`Arquivar "${nome}"?\n\nEle sai da lista, mas nada é apagado — dá para desarquivar depois em "Arquivados".`)) {
      return;
    }
    start(async () => {
      await setProjectArchived(projectId, !arquivado);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={ocupado}
      onClick={clicar}
      title={arquivado ? "Desarquivar projeto" : "Arquivar projeto"}
      aria-label={arquivado ? `Desarquivar ${nome}` : `Arquivar ${nome}`}
      className={arquivado ? "" : "w-9 px-0"}
    >
      {arquivado ? (
        <>
          <ArchiveRestore className="w-3.5 h-3.5" />
          Desarquivar
        </>
      ) : (
        <Archive className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}
