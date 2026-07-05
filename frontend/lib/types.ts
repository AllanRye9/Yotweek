export type Role = "USER" | "AGENT" | "COMPANY" | "ORGANIZATION" | "ADMIN";
export type PriceType = "FREE" | "PAID";
export type EventScope = "LOCAL" | "INTERNATIONAL";
export type EventStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN" | "COMPLETED" | "CANCELLED";
export type EventCategory =
  | "FESTIVAL" | "CONFERENCE" | "CONCERT" | "SPORTS" | "CULTURAL_HERITAGE"
  | "NIGHTLIFE" | "WORKSHOP" | "GUIDED_TOUR" | "ADVENTURE_OUTDOOR"
  | "WILDLIFE_SAFARI" | "FOOD_DRINK" | "RELIGIOUS" | "EXHIBITION" | "OTHER";

export interface Organizer {
  id: string;
  name: string;
  organizationName?: string | null;
  isVerifiedOrganizer: boolean;
  avatarUrl?: string | null;
}

export interface EventItem {
  id: string; title: string; slug: string; description: string;
  category: EventCategory; scope: EventScope; priceType: PriceType;
  price?: string | number | null; currency: string;
  startDate: string; endDate?: string | null; timezone: string;
  venueName?: string | null; address?: string | null;
  city: string; country: string; latitude?: number | null; longitude?: number | null;
  coverImageUrl?: string | null; galleryUrls: string[]; languages: string[]; tags: string[];
  capacity?: number | null; ticketsSold: number; status: EventStatus;
  viewCount: number; isFlagged: boolean; flagReason?: string | null;
  reportCount: number; commissionPct?: number | null;
  organizerId: string; organizer?: Organizer; distanceKm?: number | null;
  _count?: { reviews: number; bookings: number };
  createdAt: string;
}

export interface Business {
  id: string; name: string; slug: string; description: string;
  categoryId: string; category?: { id: string; name: string; slug: string } | null;
  phone?: string | null; email?: string | null; website?: string | null;
  priceRange?: "BUDGET" | "MODERATE" | "EXPENSIVE" | "LUXURY" | null;
  address?: string | null; city: string; country: string;
  latitude?: number | null; longitude?: number | null;
  coverImageUrl?: string | null; galleryUrls: string[]; tags: string[];
  hours?: Record<string, string> | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN" | "CLOSED";
  isVerified: boolean; viewCount: number; reportCount: number;
  ownerId: string; owner?: Organizer; distanceKm?: number | null;
  _count?: { reviews: number };
  createdAt: string;
}

export interface Category {
  id: string; name: string; slug: string; icon?: string | null;
  sortOrder: number; parentId?: string | null;
  businessCount: number;
  children: Category[];
}

export interface UserProfile {
  id: string; name: string; email: string; role: Role;
  phone?: string | null; country?: string | null; city?: string | null;
  organizationName?: string | null; isVerifiedOrganizer: boolean;
  preferredLanguage: string; avatarUrl?: string | null;
}

export interface Review {
  id: string; eventId: string; rating: number; comment?: string | null;
  createdAt: string; user: { name: string; avatarUrl?: string | null };
}

export interface LandingStats {
  totalVisitors: number; dailyVisitors: number;
  totalEventsHeld: number; activeEvents: number; totalRegisteredUsers: number;
}

export interface Testimonial {
  id: string; content: string; rating?: number | null; isFeatured: boolean;
  createdAt: string; user: { name: string; avatarUrl?: string | null; country?: string | null };
}

export interface Highlight {
  id: string; title: string; subtitle?: string | null;
  mediaUrl: string; mediaType: "IMAGE" | "VIDEO";
  linkUrl?: string | null; sortOrder: number;
}

export interface Post {
  id: string; title: string; slug: string; excerpt?: string | null; body: string;
  coverImageUrl?: string | null; images: string[]; tags: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; viewCount: number;
  publishedAt?: string | null; createdAt: string;
  author: { id?: string; name: string; avatarUrl?: string | null; organizationName?: string | null };
}

// Interaction signal stored client-side for the preference engine
export interface UserSignal {
  eventId?: string; businessId?: string; postId?: string;
  action: "view" | "like" | "save" | "book" | "read";
  durationMs?: number;
  category?: string; city?: string; tags?: string[];
  ts: number;
}
