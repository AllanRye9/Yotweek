import { prisma } from "./prisma";

const SUSPICIOUS_KEYWORDS = [
  "guaranteed profit",
  "wire transfer only",
  "click here",
  "bitcoin doubling",
  "act now limited",
  "no refunds no questions",
  "send money now",
  "free money",
  "work from home guaranteed",
];

// Very small Levenshtein-based similarity check (0..1, 1 = identical).
function titleSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function containsSuspiciousKeywords(text: string): string | null {
  const lower = text.toLowerCase();
  const hit = SUSPICIOUS_KEYWORDS.find((k) => lower.includes(k));
  return hit ?? null;
}

// Looks for an existing APPROVED/PENDING event with a very similar title in
// the same city, with an overlapping start date. Returns the matching
// event id if a likely duplicate is found.
export async function findLikelyDuplicate(input: {
  title: string;
  city: string;
  country: string;
  startDate: Date;
  excludeEventId?: string;
}): Promise<string | null> {
  const windowStart = new Date(input.startDate);
  windowStart.setDate(windowStart.getDate() - 2);
  const windowEnd = new Date(input.startDate);
  windowEnd.setDate(windowEnd.getDate() + 2);

  const candidates = await prisma.event.findMany({
    where: {
      city: input.city,
      country: input.country,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { gte: windowStart, lte: windowEnd },
      ...(input.excludeEventId ? { id: { not: input.excludeEventId } } : {}),
    },
    select: { id: true, title: true },
    take: 50,
  });

  const match = candidates.find((c) => titleSimilarity(c.title, input.title) >= 0.82);
  return match?.id ?? null;
}

// Flags a user who has posted an unusually high number of listings in a
// short window - a common spam pattern.
export async function isPostingTooFrequently(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.event.count({
    where: { organizerId: userId, createdAt: { gte: oneHourAgo } },
  });
  return recentCount >= 5;
}

// Looks for an existing PENDING/APPROVED business with a very similar name
// in the same city. Returns the matching business id if a likely duplicate
// listing is found (e.g. someone re-posting the same shop under a slightly
// reworded name).
export async function findLikelyDuplicateBusiness(input: {
  name: string;
  city: string;
  country: string;
  excludeBusinessId?: string;
}): Promise<string | null> {
  const candidates = await prisma.business.findMany({
    where: {
      city: input.city,
      country: input.country,
      status: { in: ["PENDING", "APPROVED"] },
      ...(input.excludeBusinessId ? { id: { not: input.excludeBusinessId } } : {}),
    },
    select: { id: true, name: true },
    take: 50,
  });

  const match = candidates.find((c) => titleSimilarity(c.name, input.name) >= 0.82);
  return match?.id ?? null;
}

// Flags a user who has posted an unusually high number of business listings
// in a short window - a common spam pattern.
export async function isPostingBusinessesTooFrequently(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.business.count({
    where: { ownerId: userId, createdAt: { gte: oneHourAgo } },
  });
  return recentCount >= 5;
}
