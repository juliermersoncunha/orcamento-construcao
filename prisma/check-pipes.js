// Diagnóstico: mostra o que os blocos manuais da Etapa 5 vão exibir agora que
// espelham o catálogo por categoria.
//
// Usage: node prisma/check-pipes.js "<conn-string>"
const { Client } = require("pg");

const EXCLUDED = [
  "Caixa d'Água 1000L", "Fossa Séptica",
  "Tomada 2P+T 10A", "Conjunto 2 tomadas 2P+T 10A", "Conjunto 3 tomadas 2P+T 10A",
  "Interruptor simples 10A", "Interruptor duplo 10A", "Interruptor triplo 10A",
  "Plafon LED 18W (integrado)", "Plafon plástico E-27", "Lâmpada LED bulbo 9W",
  "Chuveiro elétrico", "Exaustor de banheiro", "Grelha externa para exaustor",
  "Disjuntor monopolar exclusivo",
];

const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect()
  .then(() =>
    c.query(`SELECT name, unit, category, "currentPrice" p FROM "Material"
             WHERE category IN ('HIDRAULICA','ELETRICA') AND active = true ORDER BY category, name`)
  )
  .then((r) => {
    const ex = new Set(EXCLUDED);
    for (const cat of ["HIDRAULICA", "ELETRICA"]) {
      const rows = r.rows.filter((x) => x.category === cat && !ex.has(x.name));
      const semPreco = rows.filter((x) => Number(x.p) === 0).length;
      console.log(`\n=== ${cat}: ${rows.length} itens na tela (${semPreco} sem preço) ===`);
      rows.forEach((x) => console.log(`   ${x.name}  (${x.unit})  R$ ${x.p}`));
    }
    const hidden = r.rows.filter((x) => ex.has(x.name));
    console.log(`\n=== Ocultos (o motor ja gera): ${hidden.length} ===`);
    hidden.forEach((x) => console.log(`   ${x.name}`));
    return c.end();
  })
  .catch((e) => { console.error(e); process.exit(1); });
