"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText, Plus, Search, FolderKanban, Users,
  Clock, Trash2, Loader2, ChevronRight, BarChart2,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/AppLayout";
import { meetingsApi } from "@/lib/api";
import type { Meeting } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "badge",
  processing: "badge-brand badge",
  ready: "badge-positive badge",
  error: "badge-negative badge",
};

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    meetingsApi.list().then((r) => setMeetings(r.data)).catch(() =>
      toast.error("Failed to load meetings")
    ).finally(() => setLoading(false));
  }, []);

  const filtered = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.project_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this meeting? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await meetingsApi.delete(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      toast.success("Meeting deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const speakers = (m: Meeting) => {
    try { return JSON.parse(m.speakers || "[]"); } catch { return []; }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">All Meetings</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link href="/upload" className="btn-primary">
            <Plus className="h-4 w-4" /> Upload
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search meetings or projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <FileText className="h-12 w-12 text-[var(--text-muted)] opacity-40" />
            <div>
              <p className="font-medium text-[var(--text-secondary)]">
                {search ? "No meetings match your search" : "No meetings yet"}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {!search && "Upload a transcript to get started"}
              </p>
            </div>
            {!search && (
              <Link href="/upload" className="btn-primary">
                <Plus className="h-4 w-4" /> Upload Transcript
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => router.push(`/meetings/${meeting.id}`)}
                className="glass-card p-5 cursor-pointer hover:border-[var(--brand-primary)] transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors truncate">
                        {meeting.title}
                      </h3>
                      <span className={STATUS_STYLES[meeting.status] || "badge"}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" />
                        {meeting.project_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {speakers(meeting).length > 0 ? speakers(meeting).join(", ") : "Unknown speakers"}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {meeting.word_count.toLocaleString()} words
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(meeting.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleDelete(meeting.id, e)}
                      disabled={deletingId === meeting.id}
                      className="btn-ghost p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                      title="Delete meeting"
                    >
                      {deletingId === meeting.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--brand-hover)] transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
