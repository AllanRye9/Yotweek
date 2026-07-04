import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

// GET /api/search?q=... - fuzzy, typo-tolerant search across events,
// businesses, and posts using Postgres trigram similarity (pg_trgm).
// Falls back gracefully to an empty result set for very short queries
// rather than scanning the whole table.
router.get("/", async (req, res, next) => {
  try {
    const q = ((req.query.q as string) || "").trim();
    if (q.length < 2) return res.json({ events: [], businesses: [], posts: [] });

    // Parameterized raw queries - $1 is always the user's search string,
    // never interpolated into the SQL text itself.
    const [events, businesses, posts] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT id, title, slug, city, country, "coverImageUrl",
               GREATEST(similarity(title, ${q}), similarity(description, ${q})) AS score
        FROM "Event"
        WHERE status = 'APPROVED'
          AND (title % ${q} OR description % ${q} OR title ILIKE ${"%" + q + "%"})
        ORDER BY score DESC
        LIMIT 10
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, name, slug, city, country, "coverImageUrl",
               GREATEST(similarity(name, ${q}), similarity(description, ${q})) AS score
        FROM "Business"
        WHERE status = 'APPROVED'
          AND (name % ${q} OR description % ${q} OR name ILIKE ${"%" + q + "%"})
        ORDER BY score DESC
        LIMIT 10
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, title, slug, "coverImageUrl", similarity(title, ${q}) AS score
        FROM "Post"
        WHERE status = 'PUBLISHED'
          AND (title % ${q} OR title ILIKE ${"%" + q + "%"})
        ORDER BY score DESC
        LIMIT 10
      `,
    ]);

    res.json({ events, businesses, posts });
  } catch (err) {
    next(err);
  }
});

export default router;
