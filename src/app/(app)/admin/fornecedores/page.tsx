import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierForm } from "./supplier-form";
import { SupplierRow } from "./supplier-row";

export default async function FornecedoresPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/projetos");

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { materials: true } } },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <p className="text-sm text-gray-500 mt-1">
          {suppliers.length} fornecedor(es) cadastrado(s). Vincule-os aos materiais em{" "}
          <span className="font-medium">Materiais e Preços</span> para saber de quem veio cada preço.
        </p>
      </div>

      <SupplierForm />

      <div className="mt-8">
        {suppliers.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              Nenhum fornecedor cadastrado ainda.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left font-medium text-gray-500 py-2">Fornecedor</th>
                      <th className="text-left font-medium text-gray-500 py-2 px-2">Telefone</th>
                      <th className="text-left font-medium text-gray-500 py-2 px-2">Observação</th>
                      <th className="text-center font-medium text-gray-500 py-2 px-2">Materiais</th>
                      <th className="text-center font-medium text-gray-500 py-2 px-2">Status</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <SupplierRow
                        key={s.id}
                        supplier={{
                          id: s.id,
                          name: s.name,
                          phone: s.phone,
                          notes: s.notes,
                          active: s.active,
                          materialCount: s._count.materials,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
