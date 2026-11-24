// A local War Games server for development and tests: the real worker on SQLite, over plain HTTP.
// npx tsx server/test/serve.ts [port] [db file]   (then build the game with VITE_WAR_SERVER=http://localhost:PORT)
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { Env } from '../src/worker';
const port = +(process.argv[2] || 8787); const db = new DatabaseSync(process.argv[3] || ':memory:'); db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const D1 = { prepare(sql: string) { const st = db.prepare(sql); let args: any[] = []; const o: any = { bind(...v: any[]) { args = v; return o; }, async first() { return (st.get(...args) as any) ?? null; }, async all() { return { results: st.all(...args) }; }, async run() { return st.run(...args); } }; return o; } };
const env: Env = { DB: D1 as any, VERIFY: process.env.VERIFY || 'on', ALLOWED_ORIGIN: '*' };
createServer(async (req, res) => { const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer); const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers as any, body: req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS' ? undefined : body }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers.entries())); res.end(Buffer.from(await r.arrayBuffer())); }).listen(port, () => console.log(`War Games server on http://localhost:${port} (verify ${env.VERIFY})`));
