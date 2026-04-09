"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  ListChecks,
  TrendingUp,
  FolderKanban,
  Upload,
  ArrowRight,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { meetingsApi } from "@/lib/api";
import type { Meeting, MeetingStats } from "@/lib/types";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  delay: string;
}) {
  return (
    <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 stat-value">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${color}20`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const speakers = (() => {
    try { return JSON.parse(meeting.speakers); } catch { return []; }
  })();
  const statusColor = meeting.status === "ready"
    ? "var(--accent-green)"
    : meeting.status === "processing"
    ? "var(--accent-yellow)"
    : "var(--text-muted)";

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:bg-[var(--bg-card-hover)]"
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--brand-glow)" }}
      >
        <FileText className="h-5 w-5 text-[var(--brand-hover)]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-white truncate">
          {meeting.title}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <FolderKanban className="h-3 w-3" /> {meeting.project_name}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {meeting.speaker_count} speakers
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {format(new Date(meeting.created_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <span className="badge" style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
        {meeting.status}
      </span>

      <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--brand-hover)]" />
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, meetingsRes] = await Promise.all([
          meetingsApi.stats(),
          meetingsApi.list(),
        ]);
        setStats(statsRes.data);
        setMeetings(meetingsRes.data);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Your meeting intelligence overview
            </p>
          </div>
          <Link href="/upload" className="btn-primary">
            <Upload className="h-4 w-4" /> Upload Transcript
          </Link>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[120px] w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Meetings" value={stats?.total_meetings || 0} icon={FileText} color="var(--brand-primary)" delay="0s" />
            <StatCard label="Action Items" value={stats?.total_action_items || 0} icon={ListChecks} color="var(--accent-green)" delay="0.05s" />
            <StatCard label="Projects" value={stats?.projects?.length || 0} icon={FolderKanban} color="var(--accent-purple)" delay="0.1s" />
            <StatCard label="Avg. Sentiment" value={stats?.avg_sentiment?.toFixed(2) || "0.00"} icon={TrendingUp} color="var(--accent-yellow)" delay="0.15s" />
          </div>
        )}

        {/* Meetings List */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="text-lg font-semibold text-white">Recent Meetings</h2>
            <span className="text-xs text-[var(--text-muted)]">{meetings.length} total</span>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-16 w-full" />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--brand-glow)" }}>
                <Sparkles className="h-8 w-8 text-[var(--brand-hover)]" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-[var(--text-primary)]">No meetings yet</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Upload your first transcript to get started
                </p>
              </div>
              <Link href="/upload" className="btn-primary mt-2">
                <Upload className="h-4 w-4" /> Upload Now
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {meetings.map((m) => (
                <MeetingRow key={m.id} meeting={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
