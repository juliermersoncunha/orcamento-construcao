// Seeds materials and premises used by the bathroom fixture library.
// Idempotent: existing rows keep their price and are not overwritten.
//
// Usage:
//   node prisma/seed-fixture-catalog.js
//   node prisma/seed-fixture-catalog.js "<conn-string>"

require("dotenv").config();
const { Client } = require("pg");
const crypto = require("crypto");

const connectionString = process.argv[2] || process.env.DIRECT_DATABASE_URL;

// ── MATERIALS ─────────────────────────────────────────────────────────────
// Each entry: name, unit, category. Price defaults to 0 (admin fills in).
const MATERIALS = [
  // Louças sanitárias
  { name: "Bacia sanitária com caixa acoplada",    unit: "cj",  category: "LOUCAS_SANITARIAS" },
  { name: "Bacia sanitária convencional",           unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Assento sanitário",                       unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Lavatório suspenso",                     unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Lavatório com coluna",                   unit: "cj",  category: "LOUCAS_SANITARIAS" },
  { name: "Cuba de apoio",                          unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Cuba de embutir",                        unit: "un",  category: "LOUCAS_SANITARIAS" },
  { name: "Cuba de sobrepor",                       unit: "un",  category: "LOUCAS_SANITARIAS" },

  // Metais sanitários
  { name: "Torneira para lavatório",                unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Misturador monocomando lavatório",       unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Misturador monocomando ducha",           unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Válvula de escoamento",                  unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Válvula de descarga",                    unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Acabamento de válvula de descarga",      unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Registro de pressão 3/4\"",             unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Registro angular 1/2\" x 1/2\"",        unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Registro 1/2\" gaveta",                 unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Acabamento de registro",                 unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Braço para chuveiro",                    unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Canopla cromada",                        unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Ducha manual/higiênica",                 unit: "un",  category: "METAIS_SANITARIOS" },
  { name: "Kit ducha higiênica",                    unit: "kit", category: "METAIS_SANITARIOS" },

  // Acessórios hidráulicos
  { name: "Anel de vedação para vaso",              unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Kit fixação de vaso",                    unit: "kit",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Kit fixação de lavatório",               unit: "kit",  category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Engate flexível PVC 30cm",               unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Sifão sanfonado",                        unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Fita veda-rosca",                        unit: "rolo", category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Silicone sanitário",                     unit: "tubo", category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Conexão de parede",                       unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Caixa sifonada 100mm",                   unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Ralo sifonado 100mm",                    unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Ralo seco 100mm",                        unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Ralo linear inox",                       unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Grelha para caixa sifonada",             unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },
  { name: "Grelha 10x10cm",                          unit: "un",   category: "ACESSORIOS_HIDRAULICOS" },

  // Impermeabilização
  { name: "Primer para impermeabilização",          unit: "L",  category: "IMPERMEABILIZACAO" },
  { name: "Primer asfáltico",                        unit: "L",  category: "IMPERMEABILIZACAO" },
  { name: "Argamassa polimérica",                    unit: "kg", category: "IMPERMEABILIZACAO" },
  { name: "Manta asfáltica 4mm",                     unit: "m²", category: "IMPERMEABILIZACAO" },
  { name: "Tela de poliéster para reforço",          unit: "m",  category: "IMPERMEABILIZACAO" },
  { name: "Fita autoadesiva para cantos",            unit: "m",  category: "IMPERMEABILIZACAO" },
  { name: "Reforço para ralo (bota)",                unit: "un", category: "IMPERMEABILIZACAO" },

  // Vidros e box
  { name: "Vidro temperado incolor 8mm",             unit: "m²", category: "VIDROS_BOX" },
  { name: "Perfil de alumínio para box",             unit: "m",  category: "VIDROS_BOX" },
  { name: "Roldana para box de correr",              unit: "cj", category: "VIDROS_BOX" },
  { name: "Dobradiça para box",                       unit: "un", category: "VIDROS_BOX" },
  { name: "Puxador de box",                           unit: "un", category: "VIDROS_BOX" },
  { name: "Borracha de vedação para box",             unit: "m",  category: "VIDROS_BOX" },
  { name: "Kit fixação de box",                       unit: "kit", category: "VIDROS_BOX" },

  // Acessórios de banheiro
  { name: "Espelho comum 4mm",                       unit: "m²",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Kit fixação para espelho",                 unit: "kit", category: "ACESSORIOS_BANHEIRO" },
  { name: "Porta-papel higiênico",                   unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Toalheiro de rosto",                       unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Toalheiro de banho",                       unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Gancho de parede",                         unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Saboneteira",                              unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Porta-shampoo",                            unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Prateleira de vidro",                       unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Gabinete para banheiro",                    unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Armário para banheiro",                     unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Nicho para banheiro",                       unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Lixeira de banheiro",                       unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Barra de apoio para banheiro",             unit: "un",  category: "ACESSORIOS_BANHEIRO" },
  { name: "Kit fixação reforçado",                    unit: "kit", category: "ACESSORIOS_BANHEIRO" },
  { name: "Kit parafusos e buchas",                    unit: "kit", category: "ACESSORIOS_BANHEIRO" },

  // Esquadria — porta do banheiro
  { name: "Folha de porta interna",                  unit: "un",  category: "ESQUADRIA" },
  { name: "Batente / marco de porta",                 unit: "un",  category: "ESQUADRIA" },
  { name: "Kit de alisar (guarnição)",                unit: "kit", category: "ESQUADRIA" },
  { name: "Kit 3 dobradiças",                          unit: "kit", category: "ESQUADRIA" },
  { name: "Fechadura banheiro (privacidade)",         unit: "un",  category: "ESQUADRIA" },
  // "Kit parafusos e buchas para porta" removido — saiu da biblioteca do banheiro.
  { name: "Espuma expansiva PU 500ml",                unit: "un",  category: "ESQUADRIA" },
  // Esquadria — janela do banheiro
  { name: "Janela de alumínio (banheiro)",            unit: "un",  category: "ESQUADRIA" },
  { name: "Peitoril de granito",                      unit: "m",   category: "ESQUADRIA" },
  // "Kit fixação de janela" removido — saiu da biblioteca do banheiro.
  { name: "Selante PU 400ml",                         unit: "un",  category: "ESQUADRIA" },
  { name: "Tela mosquiteira",                         unit: "m²",  category: "ESQUADRIA" },
  // Revestimento — acabamentos do banheiro
  { name: "Soleira de granito",                       unit: "m",   category: "REVESTIMENTO" },
  { name: "Espaçador para revestimento",              unit: "pct", category: "REVESTIMENTO" },

  // Elétrica — chuveiro / exaustor
  { name: "Chuveiro elétrico",                       unit: "un",  category: "ELETRICA" },
  { name: "Disjuntor monopolar exclusivo",           unit: "un",  category: "ELETRICA" },
  { name: "Exaustor de banheiro",                    unit: "un",  category: "ELETRICA" },
  { name: "Duto flexível para exaustor",             unit: "m",   category: "ELETRICA" },
  { name: "Grelha externa para exaustor",            unit: "un",  category: "ELETRICA" },
  // Cabos (bitolas comuns do chuveiro)
  { name: "Cabo flexível 4mm²",                      unit: "m",   category: "ELETRICA" },
  { name: "Cabo flexível 4mm² (terra)",              unit: "m",   category: "ELETRICA" },
  { name: "Cabo flexível 6mm²",                      unit: "m",   category: "ELETRICA" },
  { name: "Cabo flexível 6mm² (terra)",              unit: "m",   category: "ELETRICA" },
  { name: "Cabo flexível 10mm²",                     unit: "m",   category: "ELETRICA" },
  { name: "Cabo flexível 10mm² (terra)",             unit: "m",   category: "ELETRICA" },
  { name: "Eletroduto rígido 3/4\"",                unit: "m",   category: "ELETRICA" },
];

// ── PREMISES ──────────────────────────────────────────────────────────────
// key, label, value (initial coefficient), unit, category
const PREMISES = [
  { key: "ESPUMA_POR_PORTA",              label: "Espuma expansiva por porta",              value: 0.5,  unit: "tubo/porta",     category: "ESQUADRIAS" },
  { key: "SELANTE_POR_JANELA",            label: "Selante PU por janela",                    value: 0.3,  unit: "un/janela",      category: "ESQUADRIAS" },
  { key: "ESPACADOR_POR_M2",              label: "Espaçador por m² de revestimento",         value: 0.05, unit: "pct/m²",         category: "REVESTIMENTO" },
  { key: "SILICONE_POR_INSTALACAO",       label: "Silicone por instalação",                  value: 0.5,  unit: "tubo/instalação", category: "HIDRAULICA" },
  { key: "VEDA_ROSCA_POR_CONEXAO",        label: "Fita veda-rosca por conexão",             value: 0.1,  unit: "rolo/conexão",   category: "HIDRAULICA" },
  { key: "IMPERM_PRIMER_L_M2",            label: "Primer impermeabilização",                 value: 0.15, unit: "L/m²",            category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_ARGAMASSA_KG_M2_DEMAO",  label: "Argamassa polimérica por m²/demão",        value: 1.0,  unit: "kg/m²/demão",     category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_TELA_M_M2",              label: "Tela de reforço por m² imperm.",          value: 0.30, unit: "m/m²",            category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_FITA_M_M",               label: "Fita para cantos por m de canto",         value: 1.10, unit: "m/m",             category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_MANTA_M2_M2",            label: "Manta asfáltica por m²",                   value: 1.10, unit: "m²/m²",           category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_RODAPE_H",               label: "Altura do rodapé impermeabilizado",        value: 0.30, unit: "m",               category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_BOX_H",                  label: "Altura impermeabilizada na área do box",   value: 1.50, unit: "m",               category: "IMPERMEABILIZACAO" },
  { key: "IMPERM_DEMAOS",                 label: "Demãos de impermeabilizante",              value: 3,    unit: "demão(s)",        category: "IMPERMEABILIZACAO" },
  { key: "BOX_AREA_UNIT",                 label: "Vidro do box (fórmula config)",             value: 1.0,  unit: "m²",              category: "VIDROS_BOX" },
  { key: "BOX_PERFIL_UNIT",               label: "Perfil do box (fórmula config)",             value: 1.0,  unit: "m",               category: "VIDROS_BOX" },
  { key: "BOX_VEDACAO_UNIT",              label: "Borracha vedação do box",                    value: 1.0,  unit: "m",               category: "VIDROS_BOX" },
  { key: "EXAUSTOR_DUTO_MULT",            label: "Multiplicador do duto do exaustor",         value: 1.10, unit: "m/m",             category: "ELETRICA" },
  { key: "CHUVEIRO_CABO_FASE_MULT",       label: "Multiplicador cabo fase chuveiro (dist × N)", value: 2.0,  unit: "×",              category: "ELETRICA" },
  { key: "CHUVEIRO_ELETRODUTO_MULT",      label: "Multiplicador eletroduto chuveiro",          value: 1.05, unit: "×",              category: "ELETRICA" },
];

function cuid() {
  return "seed" + crypto.randomBytes(12).toString("hex");
}

async function main() {
  if (!connectionString) throw new Error("No connection string (arg or DIRECT_DATABASE_URL)");
  const needsSsl = /supabase\.(com|co)/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  console.log("Connected to database");

  let inserted = 0, skipped = 0;
  for (const m of MATERIALS) {
    const { rows } = await client.query(
      `SELECT id FROM "Material" WHERE name = $1 AND active = true`,
      [m.name]
    );
    if (rows.length > 0) { skipped++; continue; }
    const id = cuid();
    await client.query(
      `INSERT INTO "Material" (id, name, unit, category, "currentPrice", active, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::"MaterialCategory", 0, true, NOW(), NOW())`,
      [id, m.name, m.unit, m.category]
    );
    inserted++;
  }
  console.log(`\nMaterials: ${inserted} inserted, ${skipped} already existed.`);

  let pInserted = 0, pSkipped = 0;
  for (const p of PREMISES) {
    const { rows } = await client.query(
      `SELECT id FROM "GlobalPremise" WHERE key = $1`,
      [p.key]
    );
    if (rows.length > 0) { pSkipped++; continue; }
    const id = cuid();
    await client.query(
      `INSERT INTO "GlobalPremise" (id, key, label, value, unit, category)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, p.key, p.label, p.value, p.unit, p.category]
    );
    pInserted++;
  }
  console.log(`Premises: ${pInserted} inserted, ${pSkipped} already existed.`);

  await client.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
