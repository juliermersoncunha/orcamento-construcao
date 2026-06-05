import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DIRECT_DATABASE_URL;
  if (!connectionString) throw new Error("DIRECT_DATABASE_URL not set");

  const adapter = new PrismaPg(connectionString);
  const prisma = new PrismaClient({ adapter } as any);

  // ── Admin user ─────────────────────────────────────────────────────────────
  const adminEmail = "admin@obrafacil.com";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        password,
        role: "ADMIN",
      },
    });
    console.log("✅ Admin criado: admin@obrafacil.com / senha: admin123");
  } else {
    console.log("ℹ️  Admin já existe, pulando.");
  }

  // ── Materiais com preços da planilha ──────────────────────────────────────
  const materials = [
    // Terraplenagem
    { name: "Escavação e Terraplenagem", unit: "m³", category: "TERRAPLENAGEM", price: 45.00 },
    { name: "Compactação de Aterro", unit: "m²", category: "TERRAPLENAGEM", price: 12.00 },

    // Fundação
    { name: "Concreto Usinado FCK 25 MPa", unit: "m³", category: "FUNDACAO", price: 380.00 },
    { name: "Aço CA-50 (vergalhão)", unit: "kg", category: "FUNDACAO", price: 8.50 },
    { name: "Fôrmas de Madeira (compensado 18mm)", unit: "m²", category: "FUNDACAO", price: 55.00 },

    // Estrutura e Alvenaria
    { name: "Tijolo Cerâmico Furado 9x19x19", unit: "un", category: "ALVENARIA", price: 1.20 },
    { name: "Bloco de Concreto", unit: "un", category: "ALVENARIA", price: 3.50 },
    { name: "Bloco de Concreto Celular", unit: "un", category: "ALVENARIA", price: 4.80 },
    { name: "Cimento CP-II (50kg) – assentamento", unit: "sc", category: "ALVENARIA", price: 42.00 },
    { name: "Areia Média – assentamento", unit: "m³", category: "ALVENARIA", price: 120.00 },
    { name: "Cimento CP-II (50kg) – chapisco", unit: "sc", category: "ALVENARIA", price: 42.00 },
    { name: "Areia Grossa – chapisco", unit: "m³", category: "ALVENARIA", price: 110.00 },
    { name: "Cimento CP-II (50kg) – reboco interno", unit: "sc", category: "ALVENARIA", price: 42.00 },
    { name: "Areia Fina – reboco interno", unit: "m³", category: "ALVENARIA", price: 130.00 },
    { name: "Cimento CP-II (50kg) – reboco externo", unit: "sc", category: "ALVENARIA", price: 42.00 },
    { name: "Areia Fina – reboco externo", unit: "m³", category: "ALVENARIA", price: 130.00 },

    // Laje
    { name: "Escoramento/Fôrma para Laje", unit: "m²", category: "LAJE", price: 38.00 },

    // Cobertura
    { name: "Telha Cerâmica", unit: "un", category: "COBERTURA", price: 2.80 },
    { name: "Telha de Fibrocimento", unit: "un", category: "COBERTURA", price: 18.00 },
    { name: "Telha Metálica", unit: "un", category: "COBERTURA", price: 32.00 },
    { name: "Caibro 5x7cm (pinus)", unit: "m", category: "COBERTURA", price: 12.50 },
    { name: "Ripa 2,5x5cm (pinus)", unit: "m", category: "COBERTURA", price: 6.00 },
    { name: "Cumeeira", unit: "un", category: "COBERTURA", price: 8.50 },
    { name: "Impermeabilizante Acrílico", unit: "L", category: "COBERTURA", price: 28.00 },

    // Elétrica
    { name: "Conduíte Corrugado 3/4\" (flexível)", unit: "m", category: "ELETRICA", price: 3.20 },
    { name: "Fio Flexível 2,5mm² ", unit: "m", category: "ELETRICA", price: 4.80 },
    { name: "Caixa de Passagem 4x4/4x2", unit: "un", category: "ELETRICA", price: 4.50 },
    { name: "Quadro de Distribuição", unit: "un", category: "ELETRICA", price: 450.00 },
    { name: "Disjuntor/DR", unit: "un", category: "ELETRICA", price: 750.00 },

    // Hidrossanitária
    { name: "Tubo PVC Água Fria 3/4\"", unit: "m", category: "HIDRAULICA", price: 8.50 },
    { name: "Tubo PVC Esgoto 100mm", unit: "m", category: "HIDRAULICA", price: 14.00 },
    { name: "Conexões e Registros", unit: "un", category: "HIDRAULICA", price: 18.00 },
    { name: "Caixa d'Água 1000L", unit: "un", category: "HIDRAULICA", price: 480.00 },
    { name: "Fossa Séptica", unit: "un", category: "HIDRAULICA", price: 650.00 },
    { name: "Box de Banheiro", unit: "un", category: "HIDRAULICA", price: 350.00 },

    // Revestimentos
    { name: "Piso Cerâmico", unit: "m²", category: "REVESTIMENTO", price: 45.00 },
    { name: "Argamassa AC-II (assentamento piso)", unit: "sc", category: "REVESTIMENTO", price: 28.00 },
    { name: "Piso Porcelanato", unit: "m²", category: "REVESTIMENTO", price: 95.00 },
    { name: "Argamassa AC-III (assentamento porcelanato)", unit: "sc", category: "REVESTIMENTO", price: 32.00 },
    { name: "Rejunte", unit: "kg", category: "REVESTIMENTO", price: 12.00 },
    { name: "Revestimento Cerâmico (parede)", unit: "m²", category: "REVESTIMENTO", price: 42.00 },
    { name: "Argamassa AC-I (assentamento azulejo)", unit: "sc", category: "REVESTIMENTO", price: 25.00 },

    // Pintura
    { name: "Massa Corrida PVA (20kg)", unit: "bl", category: "PINTURA", price: 41.00 },
    { name: "Tinta Acrílica Fosca", unit: "L", category: "PINTURA", price: 22.00 },

    // Acabamento (Esquadrias)
    { name: "Porta Externa (painel/madeira)", unit: "un", category: "ESQUADRIA", price: 650.00 },
    { name: "Porta Interna (madeira)", unit: "un", category: "ESQUADRIA", price: 420.00 },
    { name: "Janela (alumínio)", unit: "un", category: "ESQUADRIA", price: 380.00 },
    { name: "Batente/Marco de Porta", unit: "un", category: "ESQUADRIA", price: 85.00 },
    { name: "Fechadura Completa", unit: "un", category: "ESQUADRIA", price: 95.00 },
  ];

  let created = 0;
  let updated = 0;
  for (const mat of materials) {
    const existing = await prisma.material.findFirst({ where: { name: mat.name } });
    if (!existing) {
      await prisma.material.create({
        data: {
          name: mat.name,
          unit: mat.unit,
          category: mat.category as any,
          currentPrice: mat.price,
        },
      });
      created++;
    } else if (existing.currentPrice !== mat.price) {
      await prisma.material.update({
        where: { id: existing.id },
        data: { currentPrice: mat.price },
      });
      updated++;
    }
  }
  console.log(`✅ Materiais: ${created} criados, ${updated} atualizados.`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
