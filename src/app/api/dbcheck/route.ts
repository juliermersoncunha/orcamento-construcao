import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "unset";
  let port = "unset";
  let user = "unset";
  try {
    const u = new URL(raw);
    host = u.hostname;
    port = u.port;
    user = decodeURIComponent(u.username);
  } catch {
    host = "unparseable";
  }

  let connect = "not-attempted";
  try {
    const u = new URL(raw);
    const pool = new Pool({
      host: u.hostname,
      port: Number(u.port) || 6543,
      database: u.pathname.replace("/", ""),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
    });
    const r = await pool.query("select 1 as ok");
    connect = `ok:${JSON.stringify(r.rows[0])}`;
    await pool.end();
  } catch (e: unknown) {
    const err = e as { constructor?: { name?: string }; message?: string; code?: string };
    connect = `FAIL:${err?.constructor?.name}:${err?.code ?? ""}:${err?.message}`;
  }

  return NextResponse.json({ host, port, user, connect });
}
