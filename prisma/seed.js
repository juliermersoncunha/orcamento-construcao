require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DIRECT_DATABASE_URL;
  if (!connectionString) throw new Error("DIRECT_DATABASE_URL not set");

  const client = new Client({ connectionString });
  await client.connect();

  // Admin user
  const adminEmail = "admin@obrafacil.com";
  const { rows: existing } = await client.query('SELECT id FROM "User" WHERE email = $1', [adminEmail]);
  if (existing.length === 0) {
    const password = await bcrypt.hash("admin123", 12);
    const id = require("crypto").randomUUID().replace(/-/g, "").substring(0, 25);
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO "User" (id, name, email, password, role, active, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,'ADMIN',true,$5,$5)`,
      [id, "Administrador", adminEmail, password, now]
    );
    console.log("✅ Admin criado: admin@obrafacil.com / senha: admin123");
  } else {
    console.log("ℹ️  Admin já existe, pulando.");
  }

  // Materials
  const materials = [
    // Terraplenagem
    ["Escavação e Terraplenagem", "m³", "TERRAPLENAGEM", 45.00],
    ["Compactação de Aterro", "m²", "TERRAPLENAGEM", 12.00],
    // Fundação
    ["Concreto Usinado FCK 25 MPa", "m³", "FUNDACAO", 380.00],
    ["Aço CA-50 (vergalhão)", "kg", "FUNDACAO", 8.50],
    ["Fôrmas de Madeira (compensado 18mm)", "m²", "FUNDACAO", 55.00],
    // Alvenaria
    ["Tijolo Cerâmico Furado 9x19x19", "un", "ALVENARIA", 1.20],
    ["Bloco de Concreto", "un", "ALVENARIA", 3.50],
    ["Bloco de Concreto Celular", "un", "ALVENARIA", 4.80],
    ["Cimento CP-II (50kg) – assentamento", "sc", "ALVENARIA", 42.00],
    ["Areia Média – assentamento", "m³", "ALVENARIA", 120.00],
    ["Cimento CP-II (50kg) – chapisco", "sc", "ALVENARIA", 42.00],
    ["Areia Grossa – chapisco", "m³", "ALVENARIA", 110.00],
    ["Cimento CP-II (50kg) – reboco interno", "sc", "ALVENARIA", 42.00],
    ["Areia Fina – reboco interno", "m³", "ALVENARIA", 130.00],
    ["Cimento CP-II (50kg) – reboco externo", "sc", "ALVENARIA", 42.00],
    ["Areia Fina – reboco externo", "m³", "ALVENARIA", 130.00],
    // Laje
    ["Escoramento/Fôrma para Laje", "m²", "LAJE", 38.00],
    // Cobertura
    ["Telha Cerâmica", "un", "COBERTURA", 2.80],
    ["Telha de Fibrocimento", "un", "COBERTURA", 18.00],
    ["Telha Metálica", "un", "COBERTURA", 32.00],
    ["Caibro 5x7cm (pinus)", "m", "COBERTURA", 12.50],
    ["Ripa 2,5x5cm (pinus)", "m", "COBERTURA", 6.00],
    ["Cumeeira", "un", "COBERTURA", 8.50],
    ["Impermeabilizante Acrílico", "L", "COBERTURA", 28.00],
    // Elétrica
    ['Conduíte Corrugado 3/4" (flexível)', "m", "ELETRICA", 3.20],
    ["Fio Flexível 2,5mm² ", "m", "ELETRICA", 4.80],
    ["Caixa de Passagem 4x4/4x2", "un", "ELETRICA", 4.50],
    ["Quadro de Distribuição", "un", "ELETRICA", 450.00],
    ["Disjuntor/DR", "un", "ELETRICA", 750.00],
    // Hidrossanitária
    ['Tubo PVC Água Fria 3/4"', "m", "HIDRAULICA", 8.50],
    ["Tubo PVC Esgoto 100mm", "m", "HIDRAULICA", 14.00],
    ["Conexões e Registros", "un", "HIDRAULICA", 18.00],
    ["Caixa d'Água 1000L", "un", "HIDRAULICA", 480.00],
    ["Fossa Séptica", "un", "HIDRAULICA", 650.00],
    ["Box de Banheiro", "un", "HIDRAULICA", 350.00],
    // Revestimentos
    ["Piso Cerâmico", "m²", "REVESTIMENTO", 45.00],
    ["Argamassa AC-II (assentamento piso)", "sc", "REVESTIMENTO", 28.00],
    ["Piso Porcelanato", "m²", "REVESTIMENTO", 95.00],
    ["Argamassa AC-III (assentamento porcelanato)", "sc", "REVESTIMENTO", 32.00],
    ["Rejunte", "kg", "REVESTIMENTO", 12.00],
    ["Revestimento Cerâmico (parede)", "m²", "REVESTIMENTO", 42.00],
    ["Argamassa AC-I (assentamento azulejo)", "sc", "REVESTIMENTO", 25.00],
    // Pintura
    ["Massa Corrida PVA (20kg)", "bl", "PINTURA", 41.00],
    ["Tinta Acrílica Fosca", "L", "PINTURA", 22.00],
    // Acabamento
    ["Porta Externa (painel/madeira)", "un", "ESQUADRIA", 650.00],
    ["Porta Interna (madeira)", "un", "ESQUADRIA", 420.00],
    ["Janela (alumínio)", "un", "ESQUADRIA", 380.00],
    ["Batente/Marco de Porta", "un", "ESQUADRIA", 85.00],
    ["Fechadura Completa", "un", "ESQUADRIA", 95.00],
  ];

  let created = 0, updated = 0;
  const crypto = require("crypto");
  const now = new Date().toISOString();

  for (const [name, unit, category, price] of materials) {
    const { rows } = await client.query('SELECT id, "currentPrice" FROM "Material" WHERE name = $1', [name]);
    if (rows.length === 0) {
      const id = crypto.randomUUID().replace(/-/g, "").substring(0, 25);
      await client.query(
        `INSERT INTO "Material" (id, name, unit, category, "currentPrice", active, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4::\"MaterialCategory\",$5,true,$6,$6)`,
        [id, name, unit, category, price, now]
      );
      created++;
    } else if (parseFloat(rows[0].currentPrice) !== price) {
      await client.query(
        `UPDATE "Material" SET "currentPrice"=$1, "updatedAt"=$2 WHERE id=$3`,
        [price, now, rows[0].id]
      );
      updated++;
    }
  }

  console.log(`✅ Materiais: ${created} criados, ${updated} atualizados.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
