import { db, platformSettingsTable, type PlatformSettings } from "@workspace/db";

let cached: PlatformSettings | null = null;

async function loadFromDb(): Promise<PlatformSettings> {
  const [row] = await db.select().from(platformSettingsTable).limit(1);
  if (row) return row;
  const [created] = await db.insert(platformSettingsTable).values({}).returning();
  return created;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (!cached) cached = await loadFromDb();
  return cached;
}

export function refreshPlatformSettingsCache(updated: PlatformSettings): void {
  cached = updated;
}
