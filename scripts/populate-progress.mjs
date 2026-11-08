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

async function run() {
  const students = [74, 68, 70, 71, 72, 73, 69];
  const lessonRows = await queryNeon("SELECT id, course_id FROM lessons WHERE course_id IN (17, 21, 22);");

  for (const s of students) {
    for (const l of lessonRows) {
      if (Math.random() > 0.25) {
        await queryNeon(`
          INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, completed_at, updated_at)
          VALUES ($1, $2, true, 900, NOW() - INTERVAL '3 days', NOW())
          ON CONFLICT DO NOTHING;
        `, [s, l.id]);
      }
    }
  }
  console.log("Progress successfully populated!");
}

run().catch(console.error);
