"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setScopeSummary } from "@/app/actions/renovation";

export function EscopoReforma({
  projectId, automatico, editado,
}: {
  projectId: string;
  automatico: string[];
  editado: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const linhas = editado ? editado.split("\n") : automatico;
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");

  function salvar(valor: string | null) {
    startTransition(async () => {
      await setScopeSummary(projectId, valor);
      setEditando(false);
      router.refresh();
    });
  }

  return (
    <section className="mb-6 break-inside-avoid">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-base font-bold">Escopo da reforma</h2>
        {!editando && (
          <button
            type="button"
            onClick={() => { setTexto(linhas.join("\n")); setEditando(true); }}
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline print:hidden"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
      </div>

      {editando ? (
        <div className="print:hidden">
          <p className="text-xs text-gray-500 mb-1">Um item por linha.</p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={Math.max(6, texto.split("\n").length + 1)}
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={isPending} onClick={() => salvar(texto)}>Salvar</Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </div>
      ) : linhas.length === 0 ? (
        <p className="text-gray-500">Nenhum serviço lançado.</p>
      ) : (
        <ul className="list-disc pl-5 flex flex-col gap-1">
          {linhas.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}

      {editado && !editando && (
        <p className="mt-2 text-xs text-amber-700 print:hidden">
          Texto editado à mão: serviços novos não entram sozinhos.{" "}
          <button
            type="button"
            disabled={isPending}
            onClick={() => { if (confirm("Descartar o texto editado e voltar ao resumo automático?")) salvar(null); }}
            className="underline hover:text-amber-900"
          >
            Voltar ao automático
          </button>
        </p>
      )}
    </section>
  );
}
