const { Pool } = require("pg");
require("dotenv/config");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const pool = new Pool({
    host: url.hostname,
    port: Number(url.port) || 6543,
    database: url.pathname.replace("/", ""),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
  });

  const cols = [
    ['"pilarMetros"',   'DOUBLE PRECISION NOT NULL DEFAULT 0'],
    ['"pilarLargura"',  'DOUBLE PRECISION NOT NULL DEFAULT 0.15'],
    ['"pilarAltura"',   'DOUBLE PRECISION NOT NULL DEFAULT 0.30'],
    ['"vigaMetros"',    'DOUBLE PRECISION NOT NULL DEFAULT 0'],
    ['"vigaLargura"',   'DOUBLE PRECISION NOT NULL DEFAULT 0.15'],
    ['"vigaAltura"',    'DOUBLE PRECISION NOT NULL DEFAULT 0.40'],
    ['"sapataQtd"',     'INTEGER NOT NULL DEFAULT 0'],
    ['"sapataLargura"', 'DOUBLE PRECISION NOT NULL DEFAULT 0.60'],
    ['"sapataCompr"',   'DOUBLE PRECISION NOT NULL DEFAULT 0.60'],
    ['"sapataAltura"',  'DOUBLE PRECISION NOT NULL DEFAULT 0.30'],
  ];

  for (const [col, def] of cols) {
    const sql = `ALTER TABLE "ProjectStructure" ADD COLUMN IF NOT EXISTS ${col} ${def}`;
    console.log(sql);
    await pool.query(sql);
  }

  console.log("Done — structure fields added.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
