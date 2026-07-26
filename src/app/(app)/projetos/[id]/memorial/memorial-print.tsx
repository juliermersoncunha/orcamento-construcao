"use client";

import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer className="w-4 h-4 mr-1" />
      Imprimir / Salvar PDF
    </Button>
  );
}
