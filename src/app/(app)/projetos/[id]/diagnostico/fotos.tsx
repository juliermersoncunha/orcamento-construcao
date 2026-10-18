"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { addRenovationPhoto, updateRenovationPhoto, deleteRenovationPhoto } from "@/app/actions/photos";

export type Foto = { id: string; roomId: string | null; caption: string | null; width: number; height: number };
type Ambiente = { id: string; nome: string };

const campo =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

// Reduz no navegador: foto de celular tem 3–8 MB, o envio aceita até ~1 MB.
async function reduzir(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  for (const [lado, q] of [[1600, 0.8], [1280, 0.72], [1024, 0.65]] as const) {
    const esc = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * esc);
    const h = Math.round(bmp.height * esc);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size < 900_000) return { blob, w, h };
  }
  throw new Error("muito grande");
}

export function EnviarFotos({ projectId, ambientes }: { projectId: string; ambientes: Ambiente[] }) {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function enviar(files: FileList) {
    const lista = [...files];
    setEnviando(true);
    setErros([]);
    const falhas: string[] = [];
    for (let i = 0; i < lista.length; i++) {
      setStatus(`Enviando ${i + 1} de ${lista.length}…`);
      try {
        const { blob, w, h } = await reduzir(lista[i]);
        const fd = new FormData();
        fd.append("file", new File([blob], "foto.jpg", { type: "image/jpeg" }));
        fd.append("width", String(w));
        fd.append("height", String(h));
        fd.append("roomId", roomId);
        fd.append("caption", caption);
        const r = await addRenovationPhoto(projectId, fd);
        if (r?.error) falhas.push(`${lista[i].name}: ${r.error}`);
      } catch {
        falhas.push(`${lista[i].name}: não foi possível ler a imagem`);
      }
    }
    setErros(falhas);
    setStatus(null);
    setEnviando(false);
    setCaption("");
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 print:hidden">
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
        <Camera className="w-4 h-4 text-gray-500" /> Fotos da situação atual
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Escolha o ambiente e, se quiser, uma legenda. As fotos aparecem no ambiente correspondente e saem na impressão.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={campo} disabled={enviando}>
          <option value="">Geral / área externa</option>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="legenda (opcional)"
          disabled={enviando}
          className={`flex-1 min-w-[12rem] ${campo}`}
        />
        <label className={`inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white ${enviando ? "opacity-60" : "cursor-pointer hover:bg-brand-700"}`}>
          <Camera className="w-4 h-4" />
          {enviando ? status : "Adicionar fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={enviando}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) enviar(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {erros.length > 0 && (
        <ul className="mt-2 text-xs text-red-700">
          {erros.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}

export function GaleriaFotos({ fotos, ambientes }: { fotos: Foto[]; ambientes: Ambiente[] }) {
  if (fotos.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {fotos.map((f) => <FotoItem key={f.id} f={f} ambientes={ambientes} />)}
    </div>
  );
}

function FotoItem({ f, ambientes }: { f: Foto; ambientes: Ambiente[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [legenda, setLegenda] = useState(f.caption ?? "");

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <figure className={`break-inside-avoid ${isPending ? "opacity-50" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rota própria autenticada, sem otimização */}
      <img
        src={`/api/fotos/${f.id}`}
        alt={f.caption ?? "Foto da situação atual"}
        width={f.width}
        height={f.height}
        loading="lazy"
        className="w-full h-auto rounded border border-gray-200 print:max-h-[9cm] print:object-contain"
      />
      {f.caption && <figcaption className="hidden print:block mt-1 text-xs text-gray-700">{f.caption}</figcaption>}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 print:hidden">
        <input
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          onBlur={() => { if (legenda.trim() !== (f.caption ?? "")) run(() => updateRenovationPhoto(f.id, { caption: legenda })); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="legenda"
          className={`flex-1 min-w-[8rem] text-xs ${campo}`}
        />
        <select
          value={f.roomId ?? ""}
          onChange={(e) => run(() => updateRenovationPhoto(f.id, { roomId: e.target.value || null }))}
          className={`text-xs ${campo}`}
          title="Mover para outro ambiente"
        >
          <option value="">Geral</option>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { if (confirm("Excluir esta foto?")) run(() => deleteRenovationPhoto(f.id)); }}
          className="p-1 text-gray-400 hover:text-red-600"
          title="Excluir foto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </figure>
  );
}
