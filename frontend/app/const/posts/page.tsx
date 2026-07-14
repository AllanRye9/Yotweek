"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { Post } from "../../../lib/types";

export default function AdminPostsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", excerpt: "", body: "" });

  function load() {
    setFetching(true);
    api.get("/admin/posts", { params: { q: q || undefined, status: status || undefined } })
      .then(r => setPosts(r.data.posts))
      .finally(() => setFetching(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(p: Post) {
    setEditingId(p.id);
    setEditForm({ title: p.title, excerpt: p.excerpt || "", body: p.body });
  }

  async function saveEdit(id: string) {
    try {
      await api.put(`/admin/posts/${id}`, editForm);
      toast.success("Post updated.");
      setEditingId(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save changes — this post may no longer exist.");
      load();
    }
  }

  async function togglePublish(p: Post) {
    try {
      if (p.status === "PUBLISHED") {
        await api.post(`/admin/posts/${p.id}/unpublish`);
        toast.warning("Post unpublished.");
      } else {
        await api.put(`/admin/posts/${p.id}`, { status: "PUBLISHED" });
        toast.success("Post published.");
      }
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update this post.");
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Permanently delete this post? This can't be undone.")) return;
    try {
      await api.delete(`/admin/posts/${id}`);
      toast.warning("Post deleted.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not delete this post.");
      load();
    }
  }

  return (
    <AdminGuard>
      <div className="animate-fade-in">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-extrabold text-2xl">Posts</h1>
            <p className="text-white/70 text-sm mt-1">Edit, publish, or remove any post on the platform.</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
          <form onSubmit={e => { e.preventDefault(); load(); }} className="flex flex-wrap gap-2 mb-6">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by title…" className="input-base flex-1 min-w-[200px]" />
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-base !w-auto">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button type="submit" className="btn-primary !px-5">Search</button>
          </form>

          {fetching ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : posts.length === 0 ? (
            <div className="card-base p-12 text-center"><p className="text-4xl mb-3">📝</p><p className="font-semibold text-gray-700">No posts found.</p></div>
          ) : (
            <div className="space-y-4">
              {posts.map(p => (
                <div key={p.id} className="card-base p-5">
                  {editingId === p.id ? (
                    <div className="space-y-3">
                      <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="input-base" placeholder="Title" />
                      <input value={editForm.excerpt} onChange={e => setEditForm(f => ({ ...f, excerpt: e.target.value }))} className="input-base" placeholder="Excerpt" />
                      <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))} rows={6} className="input-base" placeholder="Body" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(p.id)} className="btn-primary !px-4 !py-1.5 !text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost !px-4 !py-1.5 !text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="font-extrabold text-gray-900">{p.title}</h2>
                          <span className={`badge ${p.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : p.status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">By {p.author?.name} · {format(new Date(p.createdAt), "d MMM yyyy")} · {p.viewCount} views</p>
                        {p.excerpt && <p className="text-sm text-gray-500 line-clamp-2">{p.excerpt}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <button onClick={() => startEdit(p)} className="btn-secondary !px-4 !py-1.5 !text-xs">✎ Edit</button>
                        <button onClick={() => togglePublish(p)} className="btn-ghost !px-4 !py-1.5 !text-xs">{p.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
                        <button onClick={() => remove(p.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
