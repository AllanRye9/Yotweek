"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";

const ROLES = ["USER", "AGENT", "COMPANY", "ORGANIZATION", "ADMIN"];

export default function AdminUsersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [q, setQ] = useState("");

  function load() {
    setFetching(true);
    api.get("/admin/users", { params: q ? { q } : {} }).then(r => setUsers(r.data.users)).finally(() => setFetching(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSearch(e: React.FormEvent) { e.preventDefault(); load(); }

  async function toggleVerify(u: any) {
    await api.post(`/admin/users/${u.id}/verify`, { verified: !u.isVerifiedOrganizer });
    toast.success(u.isVerifiedOrganizer ? "Verification removed." : "Organizer verified.");
    load();
  }
  async function toggleSuspend(u: any) {
    if (u.id === user?.id) { toast.error("You can't suspend your own account."); return; }
    await api.post(`/admin/users/${u.id}/suspend`, { suspended: !u.isSuspended });
    toast.warning(u.isSuspended ? "Account reinstated." : "Account suspended.");
    load();
  }
  async function changeRole(u: any, role: string) {
    if (u.id === user?.id) { toast.error("You can't change your own role."); return; }
    await api.put(`/admin/users/${u.id}/role`, { role });
    toast.success(`Role updated to ${role}.`);
    load();
  }

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-7">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl">User Management</h1>
          <p className="text-white/70 text-sm mt-1">Verify organizers, suspend accounts, and manage roles.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={onSearch} className="flex gap-2 mb-6 max-w-md">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email, organization…" className="input-base flex-1" />
          <button type="submit" className="btn-primary !px-5">Search</button>
        </form>

        {fetching ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : users.length === 0 ? (
          <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🔍</p><p className="font-semibold text-gray-700">No users found</p></div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="card-base p-4 flex flex-wrap items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{u.name[0]}</div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-bold text-gray-900 text-sm">{u.name} {u.isSuspended && <span className="badge bg-red-100 text-red-700 ml-1">Suspended</span>}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                  {u.organizationName && <p className="text-xs text-gray-400">{u.organizationName}</p>}
                  <p className="text-[10px] text-gray-300 mt-0.5">Joined {format(new Date(u.createdAt), "d MMM yyyy")}{u.city ? ` · ${u.city}, ${u.country}` : ""}</p>
                </div>
                <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                  className="input-base !py-1.5 !text-xs !w-auto">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => toggleVerify(u)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                    {u.isVerifiedOrganizer ? "✓ Verified" : "Verify"}
                  </button>
                  <button onClick={() => toggleSuspend(u)} className={`!px-3 !py-1.5 !text-xs ${u.isSuspended ? "btn-secondary" : "btn-danger"}`}>
                    {u.isSuspended ? "Reinstate" : "Suspend"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </AdminGuard>
  );
}
