"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { Community, EventItem, Business } from "../../../lib/types";
import { EventCard } from "../../../components/EventCard";
import { BusinessCard } from "../../../components/BusinessCard";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

export default function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<"posts" | "events" | "businesses">("posts");
  const [joining, setJoining] = useState(false);

  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [showMembers, setShowMembers] = useState(false);

  const [composing, setComposing] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", body: "" });
  const [posting, setPosting] = useState(false);

  function load() {
    api.get(`/communities/${slug}`)
      .then(r => { setCommunity(r.data.community); setIsMember(r.data.isMember); setIsCreator(r.data.isCreator); })
      .catch(() => router.push("/communities"));
  }
  useEffect(load, [slug, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!community) return;
    api.get(`/communities/${slug}/posts`).then(r => setPosts(r.data.posts));
    api.get(`/communities/${slug}/events`).then(r => setEvents(r.data.events));
    api.get(`/communities/${slug}/businesses`).then(r => setBusinesses(r.data.businesses));
  }, [community, slug]);

  const canManage = isCreator || user?.role === "ADMIN";

  function loadMembers() {
    if (!community) return;
    api.get(`/communities/${community.id}/members`).then(r => setMembers(r.data.members)).catch(() => {});
  }

  async function toggleMembership() {
    if (!user) { router.push("/auth/login"); return; }
    if (!community) return;
    setJoining(true);
    try {
      if (isMember) {
        await api.post(`/communities/${community.id}/leave`);
        setIsMember(false);
        toast.info("Left the community.");
      } else {
        await api.post(`/communities/${community.id}/join`);
        setIsMember(true);
        toast.success("You're in! Welcome to the community.");
      }
      setCommunity(c => c ? { ...c, _count: { ...c._count, members: c._count.members + (isMember ? -1 : 1) } } : c);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update membership.");
    } finally {
      setJoining(false);
    }
  }

  function startEdit() {
    if (!community) return;
    setEditForm({ name: community.name, description: community.description });
    setEditing(true);
  }
  async function saveEdit() {
    if (!community) return;
    try {
      await api.put(`/communities/${community.id}`, editForm);
      toast.success("Community updated.");
      setEditing(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update community.");
    }
  }
  async function deleteCommunity() {
    if (!community) return;
    if (!confirm(`Delete "${community.name}"? Members and posts here go with it. This can't be undone.`)) return;
    try {
      await api.delete(`/communities/${community.id}`);
      toast.warning("Community deleted.");
      router.push("/communities");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not delete community.");
    }
  }
  async function setMemberRole(userId: string, role: "MEMBER" | "ADMIN") {
    if (!community) return;
    await api.put(`/communities/${community.id}/members/${userId}`, { role });
    loadMembers();
  }
  async function removeMember(userId: string) {
    if (!community) return;
    if (!confirm("Remove this member from the community?")) return;
    await api.delete(`/communities/${community.id}/members/${userId}`);
    toast.warning("Member removed.");
    loadMembers();
    setCommunity(c => c ? { ...c, _count: { ...c._count, members: Math.max(0, c._count.members - 1) } } : c);
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!community) return;
    if (postForm.title.trim().length < 4 || postForm.body.trim().length < 5) {
      toast.error("Give it a title and a bit more content.");
      return;
    }
    setPosting(true);
    try {
      const r = await api.post(`/communities/${community.id}/posts`, postForm);
      setPosts(p => [r.data.post, ...p]);
      setPostForm({ title: "", body: "" });
      setComposing(false);
      toast.success("Posted!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not post.");
    } finally {
      setPosting(false);
    }
  }
  async function removePost(postId: string) {
    if (!community) return;
    if (!confirm("Remove this post?")) return;
    await api.delete(`/communities/${community.id}/posts/${postId}`);
    setPosts(p => p.filter(x => x.id !== postId));
    toast.warning("Post removed.");
  }

  if (!community) return (
    <div className="page-shell py-9 space-y-4 animate-pulse">
      <div className="aspect-[3/1] shimmer rounded-2xl bg-slate-100" />
      <div className="card-base p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-4 shimmer bg-slate-100 rounded w-3/4" />)}</div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="relative aspect-[3/1] sm:aspect-[4/1] overflow-hidden bg-gradient-to-br from-teal-400 to-sky-600">
        {community.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverImageUrl} alt={community.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">🤝</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {community.status !== "APPROVED" && (
          <div className="absolute top-4 left-4 badge bg-amber-100 text-amber-700">
            {community.status === "PENDING" ? "⏳ Awaiting admin approval — only visible to you" : community.status}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 page-shell pb-5">
          <h1 className="font-extrabold text-2xl sm:text-4xl text-white drop-shadow">{community.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-white/80 mt-1.5">
            {(community.city || community.country) && <span>📍 {[community.city, community.country].filter(Boolean).join(", ")}</span>}
            {community.interestTag && <span>🏷️ {community.interestTag}</span>}
            <span>👥 {community._count.members} member{community._count.members !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className="page-shell py-9">
        <div className="grid gap-9 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div className="card-base p-5 sm:p-7">
              {editing ? (
                <div className="space-y-3">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input-base" placeholder="Community name" />
                  <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="input-base" rows={3} placeholder="Description" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="btn-primary !px-4 !py-2 !text-sm">Save</button>
                    <button onClick={() => setEditing(false)} className="btn-ghost !px-4 !py-2 !text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{community.description}</p>
                  <p className="text-xs text-gray-400 mt-4">Started by {community.creator.organizationName || community.creator.name}</p>
                </>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setTab("posts")} className={tab === "posts" ? "tab-pill-active" : "tab-pill-inactive"}>📝 Posts ({community._count.posts ?? posts.length})</button>
              <button onClick={() => setTab("events")} className={tab === "events" ? "tab-pill-active" : "tab-pill-inactive"}>🎪 Events ({community._count.events})</button>
              <button onClick={() => setTab("businesses")} className={tab === "businesses" ? "tab-pill-active" : "tab-pill-inactive"}>🏪 Businesses ({community._count.businesses})</button>
            </div>

            {tab === "posts" && (
              <div className="space-y-3">
                {isMember || canManage ? (
                  composing ? (
                    <form onSubmit={submitPost} className="card-base p-5 space-y-2">
                      <input value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))} className="input-base" placeholder="Title" />
                      <textarea value={postForm.body} onChange={e => setPostForm(f => ({ ...f, body: e.target.value }))} className="input-base" rows={3} placeholder="Share an announcement or start a discussion…" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={posting} className="btn-primary !px-4 !py-2 !text-sm">{posting ? "Posting…" : "Post"}</button>
                        <button type="button" onClick={() => setComposing(false)} className="btn-ghost !px-4 !py-2 !text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setComposing(true)} className="btn-secondary w-full !justify-center !py-2.5">+ Post an announcement or discussion</button>
                  )
                ) : (
                  <p className="text-xs text-gray-400">Join this community to post here.</p>
                )}

                {posts.length === 0 ? (
                  <div className="card-base p-10 text-center text-gray-400 text-sm">No posts yet — be the first to share something.</div>
                ) : posts.map(p => (
                  <div key={p.id} className="card-base p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{p.title}</h3>
                        <p className="text-xs text-gray-400 mb-2">{p.author?.organizationName || p.author?.name} · {p.publishedAt ? format(new Date(p.publishedAt), "d MMM yyyy") : ""}</p>
                      </div>
                      {(p.authorId === user?.id || canManage) && (
                        <button onClick={() => removePost(p.id)} className="btn-ghost !px-2 !py-1 !text-xs text-red-500">Remove</button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.body}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "events" && (
              events.length === 0 ? (
                <div className="card-base p-10 text-center text-gray-400 text-sm">No events posted in this community yet.</div>
              ) : (
                <div className="listing-grid">{events.map(e => <EventCard key={e.id} event={e} />)}</div>
              )
            )}

            {tab === "businesses" && (
              businesses.length === 0 ? (
                <div className="card-base p-10 text-center text-gray-400 text-sm">No businesses posted in this community yet.</div>
              ) : (
                <div className="listing-grid">{businesses.map(b => <BusinessCard key={b.id} business={b} />)}</div>
              )
            )}
          </div>

          <div className="space-y-4">
            <div className="card-base p-5 text-center">
              <p className="font-extrabold text-3xl text-gray-900">{community._count.members}</p>
              <p className="text-xs text-gray-400 mb-4">member{community._count.members !== 1 ? "s" : ""}</p>
              {isCreator ? (
                <p className="text-xs text-gray-400">You created this community.</p>
              ) : (
                <button onClick={toggleMembership} disabled={joining}
                  className={isMember ? "btn-secondary w-full !justify-center" : "btn-primary w-full !justify-center"}>
                  {joining ? "…" : isMember ? "✓ Member — leave" : "+ Join community"}
                </button>
              )}
            </div>

            <div className="card-base p-5">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Post here</p>
              <p className="text-xs text-gray-400 mb-3">Members can tag their events and businesses to this community when creating a listing.</p>
              <div className="flex flex-col gap-2">
                <Link href="/events/create" className="btn-secondary !text-xs !py-2 !justify-center">+ List an event</Link>
                <Link href="/businesses/create" className="btn-secondary !text-xs !py-2 !justify-center">+ List a business</Link>
              </div>
            </div>

            {canManage && (
              <div className="card-base p-5">
                <button onClick={() => setManaging(m => !m)} className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5 w-full">
                  ⚙️ Manage community {managing ? "▲" : "▼"}
                </button>
                {managing && (
                  <div className="space-y-2 pt-2">
                    <button onClick={startEdit} className="btn-secondary w-full !justify-center !text-xs !py-2">✎ Edit details</button>
                    <button onClick={() => { setShowMembers(s => !s); if (!showMembers) loadMembers(); }} className="btn-secondary w-full !justify-center !text-xs !py-2">
                      👥 {showMembers ? "Hide" : "Manage"} members
                    </button>
                    <button onClick={deleteCommunity} className="btn-danger w-full !justify-center !text-xs !py-2">🗑 Delete community</button>

                    {showMembers && (
                      <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                        {members.length === 0 ? <p className="text-xs text-gray-400">Loading…</p> : members.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 text-xs border-t border-gray-100 pt-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{m.user.organizationName || m.user.name}</p>
                              <p className="text-gray-400">{m.role}{m.userId === community.creator.id ? " · creator" : ""}</p>
                            </div>
                            {m.userId !== community.creator.id && (
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setMemberRole(m.userId, m.role === "ADMIN" ? "MEMBER" : "ADMIN")} className="btn-ghost !px-2 !py-1 !text-[10px]">
                                  {m.role === "ADMIN" ? "Demote" : "Promote"}
                                </button>
                                <button onClick={() => removeMember(m.userId)} className="btn-ghost !px-2 !py-1 !text-[10px] text-red-500">Remove</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
