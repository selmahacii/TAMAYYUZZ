import { Router, type IRouter } from "express";
import { eq, and, asc, desc, like, or, sql } from "drizzle-orm";
import { db, knowledgeBaseTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

function formatArticle(a: typeof knowledgeBaseTable.$inferSelect, authorName: string | null) {
  return {
    id: a.id,
    authorName,
    title: a.title,
    content: a.content,
    category: a.category,
    viewCount: a.viewCount,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

// Public: list published help-center articles, optionally filtered by category/search
router.get("/knowledge-base", async (req, res): Promise<void> => {
  const { category, search } = req.query as Record<string, string>;

  const conditions = [eq(knowledgeBaseTable.isPublished, true)];
  if (category && category !== "all") {
    conditions.push(eq(knowledgeBaseTable.category, category as "general" | "students" | "coaches" | "billing" | "technical"));
  }
  if (search) {
    conditions.push(or(
      like(knowledgeBaseTable.title, `%${search}%`),
      like(knowledgeBaseTable.content, `%${search}%`),
    )!);
  }

  const rows = await db
    .select({ a: knowledgeBaseTable, authorName: usersTable.name })
    .from(knowledgeBaseTable)
    .leftJoin(usersTable, eq(knowledgeBaseTable.authorId, usersTable.id))
    .where(and(...conditions))
    .orderBy(asc(knowledgeBaseTable.order), desc(knowledgeBaseTable.createdAt));

  res.json(rows.map(({ a, authorName }) => formatArticle(a, authorName)));
});

// Public: read one published article, increments its view count
router.get("/knowledge-base/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .select({ a: knowledgeBaseTable, authorName: usersTable.name })
    .from(knowledgeBaseTable)
    .leftJoin(usersTable, eq(knowledgeBaseTable.authorId, usersTable.id))
    .where(and(eq(knowledgeBaseTable.id, id), eq(knowledgeBaseTable.isPublished, true)));

  if (!row) { res.status(404).json({ error: "Article not found" }); return; }

  await db.update(knowledgeBaseTable).set({ viewCount: sql`${knowledgeBaseTable.viewCount} + 1` }).where(eq(knowledgeBaseTable.id, id));

  res.json(formatArticle({ ...row.a, viewCount: row.a.viewCount + 1 }, row.authorName));
});

export default router;
