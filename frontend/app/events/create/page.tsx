"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

const CATEGORIES = [
  "FESTIVAL", "CONFERENCE", "CONCERT", "SPORTS", "CULTURAL_HERITAGE", "NIGHTLIFE",
  "WORKSHOP", "GUIDED_TOUR", "ADVENTURE_OUTDOOR", "WILDLIFE_SAFARI", "FOOD_DRINK",
  "RELIGIOUS", "EXHIBITION", "OTHER",
];

const initialState = {
  title: "",
  description: "",
  category: "FESTIVAL",
  scope: "LOCAL",
  priceType: "FREE",
  price: "",
  currency: "UGX",
  startDate: "",
  endDate: "",
  venueName: "",
  address: "",
  city: "",
  country: "Uganda",
  latitude: "",
  longitude: "",
  capacity: "",
  languages: "en",
  tags: "",
};

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof initialState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const payload: any = {
        ...form,
        price: form.priceType === "PAID" ? parseFloat(form.price) : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await api.post("/events", payload);
      setMessage(res.data.message || "Submitted for review.");
      setForm(initialState);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || "Could not submit listing.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;

  if (!user) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to list an event</h1>
        <p className="mt-2 text-savanna-900/60">Registered users, companies, agents, and organizations can all post — every listing is reviewed by our team before it goes live.</p>
        <a href="/auth/login" className="btn-primary mt-6 inline-flex">Sign in</a>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="mb-2 font-display text-3xl font-bold">List an event or tourism opportunity</h1>
      <p className="mb-8 text-sm text-savanna-900/60">
        Your listing will be reviewed by our admin team before it appears publicly. Clearly mark whether it&apos;s free or paid.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input required value={form.title} onChange={(e) => update("title", e.target.value)} className="input" />
        </Field>
        <Field label="Description">
          <textarea required rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className="input">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
          <Field label="Scope">
            <select value={form.scope} onChange={(e) => update("scope", e.target.value)} className="input">
              <option value="LOCAL">Local</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Pricing">
            <select value={form.priceType} onChange={(e) => update("priceType", e.target.value)} className="input">
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
            </select>
          </Field>
          {form.priceType === "PAID" && (
            <Field label={`Price (${form.currency})`}>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className="input" />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date & time">
            <input required type="datetime-local" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} className="input" />
          </Field>
          <Field label="End date (optional)">
            <input type="datetime-local" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Venue name">
          <input value={form.venueName} onChange={(e) => update("venueName", e.target.value)} className="input" />
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={(e) => update("address", e.target.value)} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input required value={form.city} onChange={(e) => update("city", e.target.value)} className="input" />
          </Field>
          <Field label="Country">
            <input required value={form.country} onChange={(e) => update("country", e.target.value)} className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude (optional)">
            <input value={form.latitude} onChange={(e) => update("latitude", e.target.value)} className="input" />
          </Field>
          <Field label="Longitude (optional)">
            <input value={form.longitude} onChange={(e) => update("longitude", e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Capacity (optional)">
          <input type="number" value={form.capacity} onChange={(e) => update("capacity", e.target.value)} className="input" />
        </Field>

        <Field label="Languages (comma separated, e.g. en, fr, sw)">
          <input value={form.languages} onChange={(e) => update("languages", e.target.value)} className="input" />
        </Field>

        <Field label="Tags (comma separated)">
          <input value={form.tags} onChange={(e) => update("tags", e.target.value)} className="input" />
        </Field>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Submitting…" : "Submit for review"}
        </button>

        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(42, 34, 19, 0.15);
          border-radius: 0.75rem;
          padding: 0.6rem 0.9rem;
          font-size: 0.9rem;
        }
        .input:focus {
          outline: none;
          border-color: #f97316;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-savanna-900/80">{label}</span>
      {children}
    </label>
  );
}
