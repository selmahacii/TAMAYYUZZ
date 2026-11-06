import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";

const router = Router();

const DEFAULT_CATEGORIES = [
  "Business", "Marketing", "Finance", "Technology", 
  "Communication", "Personal Development", "Design", 
  "Entrepreneuriat", "Management", "Other"
];

// Get all categories, populating defaults if empty
router.get("/categories", async (_req, res): Promise<void> => {
  try {
    let list = await db.select().from(categoriesTable).orderBy(desc(categoriesTable.createdAt));
    
    if (list.length === 0) {
      console.log("Categories table empty. Pre-populating default categories...");
      const insertValues = DEFAULT_CATEGORIES.map(name => ({ name }));
      await db.insert(categoriesTable).values(insertValues);
      list = await db.select().from(categoriesTable).orderBy(desc(categoriesTable.createdAt));
    }
    
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create category (Admin only)
router.post("/categories", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { name, description } = req.body as any;
    if (!name?.trim()) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }

    const trimmed = name.trim();
    // Check duplicate
    const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.name, trimmed));
    if (existing) {
      res.status(400).json({ error: "Category already exists" });
      return;
    }

    const [category] = await db.insert(categoriesTable).values({
      name: trimmed,
      description: description ?? null,
    }).returning();
    
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category (Admin only)
router.delete("/categories/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [deleted] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    
    res.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
