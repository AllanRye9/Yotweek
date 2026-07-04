import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  businessCount: number;
};

type CategoryNode = CategoryRow & { children: CategoryNode[] };

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));

  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// Returns the id of `categoryId` plus every descendant category id, so
// browsing a top-level category (e.g. "Food") also picks up businesses
// filed under nested subcategories (e.g. "Food" -> "Restaurants" ->
// "Pizza Restaurants").
function collectDescendantIds(rows: CategoryRow[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  rows.forEach((r) => {
    if (!r.parentId) return;
    const list = childrenByParent.get(r.parentId) ?? [];
    list.push(r.id);
    childrenByParent.set(r.parentId, list);
  });

  const ids: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    const children = childrenByParent.get(current) ?? [];
    for (const childId of children) {
      ids.push(childId);
      queue.push(childId);
    }
  }
  return ids;
}

// GET /api/categories - full nested tree, each node annotated with a direct
// (non-recursive) count of APPROVED businesses filed directly under it.
router.get("/", async (_req, res, next) => {
  try {
    const [categories, counts] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true, slug: true, icon: true, sortOrder: true, parentId: true },
      }),
      prisma.business.groupBy({
        by: ["categoryId"],
        where: { status: "APPROVED" },
        _count: { _all: true },
      }),
    ]);

    const countByCategory = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    const rows: CategoryRow[] = categories.map((c) => ({
      ...c,
      businessCount: countByCategory.get(c.id) ?? 0,
    }));

    res.json({ categories: buildTree(rows) });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:slug - one category, its immediate children, and the
// APPROVED businesses filed anywhere in its subtree.
router.get("/:slug", async (req, res, next) => {
  try {
    const all = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, icon: true, sortOrder: true, parentId: true },
    });

    const rowsWithCount: CategoryRow[] = all.map((c) => ({ ...c, businessCount: 0 }));
    const target = rowsWithCount.find((c) => c.slug === req.params.slug);
    if (!target) return res.status(404).json({ error: "Category not found" });

    const children = rowsWithCount
      .filter((c) => c.parentId === target.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const subtreeIds = collectDescendantIds(rowsWithCount, target.id);

    const { page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const take = Math.min(parseInt(pageSize, 10) || 20, 50);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where: { categoryId: { in: subtreeIds }, status: "APPROVED" },
        orderBy: { name: "asc" },
        include: { category: { select: { name: true, slug: true } }, _count: { select: { reviews: true } } },
        skip,
        take,
      }),
      prisma.business.count({ where: { categoryId: { in: subtreeIds }, status: "APPROVED" } }),
    ]);

    res.json({ category: target, children, businesses, total, page: Number(page), pageSize: take });
  } catch (err) {
    next(err);
  }
});

export default router;
