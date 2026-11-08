const NEON_HOST = "ep-spring-mode-ba1olrfk.c-8.eu-central-1.aws.neon.tech";
const NEON_CONN = "postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function queryNeon(sql, params = []) {
  const res = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: {
      "Neon-Connection-String": NEON_CONN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Neon error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.rows ?? [];
}

async function check() {
  const rows = await queryNeon(`SELECT column_name FROM information_schema.columns WHERE table_name = 'announcements';`);
  console.log('announcements columns:', rows.map(r => r.column_name));
}

check().catch(console.error);
