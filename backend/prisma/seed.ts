import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@yotweek.com" },
    update: {},
    create: { name: "Platform Admin", email: "admin@yotweek.com", passwordHash, role: "ADMIN" },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@example.com" },
    update: {},
    create: {
      name: "Gulu Heritage Tours",
      email: "organizer@example.com",
      passwordHash,
      role: "COMPANY",
      organizationName: "Gulu Heritage Tours Ltd",
      isVerifiedOrganizer: true,
      country: "Uganda",
      city: "Gulu",
    },
  });

  await prisma.siteCounter.upsert({
    where: { key: "total_visitors" },
    update: {},
    create: { key: "total_visitors", value: 0 },
  });

  // ─── yotweek core category taxonomy ────────────────────────────────────
  const topLevelCategories: { name: string; slug: string }[] = [
    { name: "Shopping", slug: "shopping" },
    { name: "Nightlife", slug: "nightlife" },
    { name: "Travel & Tours", slug: "travel-tours" },
    { name: "Pets", slug: "pets" },
    { name: "Active Life", slug: "active-life" },
    { name: "Beauty & Spas", slug: "beauty-spas" },
    { name: "Home Services", slug: "home-services" },
    { name: "Mass Media", slug: "mass-media" },
    { name: "Food", slug: "food" },
    { name: "Health & Medical", slug: "health-medical" },
    { name: "Automotive", slug: "automotive" },
    { name: "Financial Services", slug: "financial-services" },
    { name: "Education", slug: "education" },
    { name: "Local Flavor", slug: "local-flavor" },
    { name: "Arts & Entertainment", slug: "arts-entertainment" },
    { name: "Event Planning & Services", slug: "event-planning-services" },
    { name: "Real Estate", slug: "real-estate" },
    { name: "Religious Organizations", slug: "religious-organizations" },
    { name: "Local Services", slug: "local-services" },
    { name: "Public Services & Government", slug: "public-services-government" },
    { name: "Professional Services", slug: "professional-services" },
  ];

  const categoryIdBySlug = new Map<string, string>();
  for (let i = 0; i < topLevelCategories.length; i++) {
    const c = topLevelCategories[i];
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: i },
      create: { name: c.name, slug: c.slug, sortOrder: i },
    });
    categoryIdBySlug.set(c.slug, created.id);
  }

  const restaurants = await prisma.category.upsert({
    where: { slug: "restaurants" },
    update: { name: "Restaurants", parentId: categoryIdBySlug.get("food") },
    create: { name: "Restaurants", slug: "restaurants", parentId: categoryIdBySlug.get("food"), sortOrder: 0 },
  });

  const cuisineSubcategories = [
    { name: "Asian Restaurants", slug: "asian-restaurants" },
    { name: "Sichuan Restaurants", slug: "sichuan-restaurants" },
    { name: "Southern Restaurants", slug: "southern-restaurants" },
    { name: "Soul Food Restaurants", slug: "soul-food-restaurants" },
    { name: "Vietnamese Restaurants", slug: "vietnamese-restaurants" },
    { name: "Buffet Restaurants", slug: "buffet-restaurants" },
    { name: "Chicken Restaurants", slug: "chicken-restaurants" },
    { name: "Hamburger Restaurants", slug: "hamburger-restaurants" },
    { name: "Pizza Restaurants", slug: "pizza-restaurants" },
    { name: "Western Restaurants", slug: "western-restaurants" },
  ];

  const cuisineIdBySlug = new Map<string, string>();
  for (let i = 0; i < cuisineSubcategories.length; i++) {
    const c = cuisineSubcategories[i];
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, parentId: restaurants.id, sortOrder: i },
      create: { name: c.name, slug: c.slug, parentId: restaurants.id, sortOrder: i },
    });
    cuisineIdBySlug.set(c.slug, created.id);
  }

  await prisma.business.upsert({
    where: { slug: "golden-wok-gulu-seed" },
    update: {},
    create: {
      name: "Golden Wok",
      slug: "golden-wok-gulu-seed",
      description: "Family-run pizza and pasta spot in central Gulu, popular with visiting tourists.",
      categoryId: cuisineIdBySlug.get("pizza-restaurants")!,
      city: "Gulu",
      country: "Uganda",
      latitude: 2.7746,
      longitude: 32.2989,
      priceRange: "MODERATE",
      tags: ["pizza", "family-friendly"],
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: admin.id,
      ownerId: organizer.id,
    },
  });

  await prisma.testimonial.upsert({
    where: { id: "seed-testimonial-1" },
    update: {},
    create: {
      id: "seed-testimonial-1",
      userId: organizer.id,
      content: "yotweek made it so easy to list our festival and reach visitors we'd never have found otherwise.",
      rating: 5,
      status: "APPROVED",
      isFeatured: true,
    },
  });

  await prisma.highlight.upsert({
    where: { id: "seed-highlight-1" },
    update: {},
    create: {
      id: "seed-highlight-1",
      title: "Discover Northern Uganda",
      subtitle: "Cultural festivals, wildlife, and local flavor in Gulu and beyond",
      mediaUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200",
      mediaType: "IMAGE",
      linkUrl: "/events?city=Gulu",
      sortOrder: 0,
    },
  });

  await prisma.post.upsert({
    where: { slug: "welcome-to-yotweek-seed" },
    update: {},
    create: {
      authorId: organizer.id,
      title: "Welcome to yotweek",
      slug: "welcome-to-yotweek-seed",
      excerpt: "A quick look at what you can discover here.",
      body: "yotweek connects people with shared interests and passions for exploration. Browse verified events, discover local businesses, and share your own travel stories with the community.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      tags: ["welcome"],
    },
  });

  await prisma.event.upsert({
    where: { slug: "gulu-cultural-festival-seed" },
    update: {},
    create: {
      title: "Gulu Cultural Festival",
      slug: "gulu-cultural-festival-seed",
      description:
        "A celebration of Acholi culture featuring traditional dance, music, food stalls and craft markets in the heart of Gulu town.",
      category: "CULTURAL_HERITAGE",
      scope: "LOCAL",
      priceType: "FREE",
      currency: "UGX",
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      city: "Gulu",
      country: "Uganda",
      latitude: 2.7746,
      longitude: 32.2989,
      languages: ["en", "ach"],
      tags: ["culture", "festival", "family-friendly"],
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: admin.id,
      organizerId: organizer.id,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
