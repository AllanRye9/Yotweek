import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

// GET /api/search?q=...&category=&city=&priceType=&dateFrom=&dateTo=
// Fuzzy, typo-tolerant search across events, businesses, and posts using
// Postgres trigram similarity (pg_trgm), plus:
//  - Exact phrase matching: wrap the query in "double quotes" to require
//    that exact substring (case-insensitive) rather than fuzzy matching -
//    useful when fuzzy results are too broad for a specific name/phrase.
//  - Optional filters (events only, since businesses/posts don't carry
//    the same category/date/price shape): category, city, priceType,
//    dateFrom, dateTo.
// Falls back gracefully to an empty result set for very short queries
// rather than scanning the whole table.
router.get("/", async (req, res, next) => {
  try {
    const raw = ((req.query.q as string) || "").trim();
    if (raw.length < 2) return res.json({ events: [], businesses: [], posts: [] });

    const phraseMatch = raw.match(/^"(.+)"$/);
    const isExactPhrase = !!phraseMatch;
    const q = phraseMatch ? phraseMatch[1] : raw;

    const { category, city, priceType, dateFrom, dateTo } = req.query as Record<string, string>;

    // Every filter is passed as a bind parameter and checked with an
    // "IS NULL OR ..." pattern, so the query text never changes shape
    // based on which filters are present - keeps this fully parameterized
    // (no dynamic SQL string construction) while still supporting an
    // arbitrary combination of optional filters.
    const [events, businesses, posts] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT id, title, slug, city, country, "coverImageUrl", "startDate", "priceType", price, currency,
               CASE WHEN ${isExactPhrase} THEN 1.0
                    ELSE GREATEST(similarity(title, ${q}), similarity(description, ${q})) END AS score
        FROM "Event"
        WHERE status = 'APPROVED'
          AND (
            (${isExactPhrase} AND (title ILIKE ${"%" + q + "%"} OR description ILIKE ${"%" + q + "%"}))
            OR (NOT ${isExactPhrase} AND (title % ${q} OR description % ${q} OR title ILIKE ${"%" + q + "%"}))
          )
          AND (${category || null}::text IS NULL OR category = (${category || null}::text)::"EventCategory")
          AND (${city || null}::text IS NULL OR city ILIKE (${city || null}::text))
          AND (${priceType || null}::text IS NULL OR "priceType" = (${priceType || null}::text)::"PriceType")
          AND (${dateFrom || null}::text IS NULL OR "startDate" >= (${dateFrom || null}::text)::timestamp)
          AND (${dateTo || null}::text IS NULL OR "startDate" <= (${dateTo || null}::text)::timestamp)
        ORDER BY score DESC, "startDate" ASC
        LIMIT 20
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, name, slug, city, country, "coverImageUrl",
               CASE WHEN ${isExactPhrase} THEN 1.0
                    ELSE GREATEST(similarity(name, ${q}), similarity(description, ${q})) END AS score
        FROM "Business"
        WHERE status = 'APPROVED'
          AND (
            (${isExactPhrase} AND (name ILIKE ${"%" + q + "%"} OR description ILIKE ${"%" + q + "%"}))
            OR (NOT ${isExactPhrase} AND (name % ${q} OR description % ${q} OR name ILIKE ${"%" + q + "%"}))
          )
          AND (${city || null}::text IS NULL OR city ILIKE (${city || null}::text))
        ORDER BY score DESC
        LIMIT 10
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, title, slug, "coverImageUrl",
               CASE WHEN ${isExactPhrase} THEN 1.0 ELSE similarity(title, ${q}) END AS score
        FROM "Post"
        WHERE status = 'PUBLISHED'
          AND (
            (${isExactPhrase} AND title ILIKE ${"%" + q + "%"})
            OR (NOT ${isExactPhrase} AND (title % ${q} OR title ILIKE ${"%" + q + "%"}))
          )
        ORDER BY score DESC
        LIMIT 10
      `,
    ]);

    res.json({ events, businesses, posts, exactPhrase: isExactPhrase });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/suggest?q=... - lightweight autocomplete: just titles/
// names and enough context to render a dropdown, capped small and fast
// (same trigram index as the main search, no filters).
router.get("/suggest", async (req, res, next) => {
  try {
    const q = ((req.query.q as string) || "").trim();
    if (q.length < 2) return res.json({ suggestions: [] });

    const [events, businesses] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT id, title AS label, 'event' AS type, slug, city
        FROM "Event"
        WHERE status = 'APPROVED' AND (title % ${q} OR title ILIKE ${"%" + q + "%"})
        ORDER BY similarity(title, ${q}) DESC
        LIMIT 5
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, name AS label, 'business' AS type, slug, city
        FROM "Business"
        WHERE status = 'APPROVED' AND (name % ${q} OR name ILIKE ${"%" + q + "%"})
        ORDER BY similarity(name, ${q}) DESC
        LIMIT 5
      `,
    ]);

    res.json({ suggestions: [...events, ...businesses].slice(0, 8) });
  } catch (err) {
    next(err);
  }
});

export default router;
