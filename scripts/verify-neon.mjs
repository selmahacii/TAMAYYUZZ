import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pg = require("../lib/db/node_modules/pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const res = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
);
console.log("Successfully verified! Tables created in Neon:");
console.log(res.rows.map((r) => r.table_name));

await client.end();
