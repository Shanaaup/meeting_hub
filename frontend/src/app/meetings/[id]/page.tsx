"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  ListChecks,
  TrendingUp,
  MessageSquare,
  Download,
  Sparkles,
  Clock,
  Users,
  FolderKanban,
  ChevronDown,
  Send,
  Bot,
  User as UserIcon,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import { meetingsApi, analysisApi, chatApi } from "@/lib/api";
import type {
  MeetingDetail,
  Decision,
  ActionItem,
  SentimentResult,
  SentimentSegment,
  ChatMessage,
  Citation,
} from "@/lib/types";

type Tab = "insights" | "sentiment" | "chat";

/* ── Sentiment Color Map ─────────── */
const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#34d399",
  negative: "#f87171",
  neutral: "#8b95b0",
  consensus: "#34d399",
  conflict: "#f87171",
  enthusiasm: "#a78bfa",
  uncertainty: "#fbbf24",
};

/* ── Sub-components ──────────────── */

function InsightsPanel({
  decisions,
  actions,
  loading,
  onExtract,
  extracting,
  onExportCsv,
  onExportPdf,
}: {
  decisions: Decision[];
  actions: ActionItem[];
  loading: boolean;
  onExtract: () => void;
  extracting: boolean;
  onExportCsv: () => void;
  onExportPdf: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "decisions" | "actions">("all");

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
      </div>
    );
  }

  const noData = decisions.length === 0 && actions.length === 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onExtract} disabled={extracting} className="btn-primary">
          {extracting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {extracting ? "Analyzing..." : noData ? "Extract Insights" : "Re-extract"}
        </button>

        {!noData && (
          <>
            <button onClick={onExportCsv} className="btn-secondary">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={onExportPdf} className="btn-secondary">
              <Download className="h-4 w-4" /> PDF
            </button>
          </>
        )}

        <div className="ml-auto tab-nav">
          {(["all", "decisions", "actions"] as const).map((f) => (
            <button
              key={f}
              className={`tab-item ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "decisions" ? "Decisions" : "Actions"}
            </button>
          ))}
        </div>
      </div>

      {noData && !extracting ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Sparkles className="h-10 w-10 text-[var(--brand-hover)]" />
          <p className="text-sm text-[var(--text-muted)]">
            Click &quot;Extract Insights&quot; to analyze this transcript
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Decisions */}
          {(filter === "all" || filter === "decisions") && decisions.length > 0 && (
            <div className="glass-card">
              <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: "var(--border-subtle)" }}>
                <ListChecks className="h-4 w-4 text-[var(--accent-green)]" />
                <span className="text-sm font-semibold text-white">Decisions ({decisions.length})</span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {decisions.map((d) => (
                  <div key={d.id} className="px-5 py-3">
                    <p className="text-sm text-[var(--text-primary)]">{d.content}</p>
                    <div className="mt-1 flex gap-3 text-xs text-[var(--text-muted)]">
                      {d.speaker && <span>👤 {d.speaker}</span>}
                      {d.timestamp && <span>🕐 {d.timestamp}</span>}
                      <span className="badge-positive badge">{Math.round(d.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {(filter === "all" || filter === "actions") && actions.length > 0 && (
            <div className="glass-card">
              <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: "var(--border-subtle)" }}>
                <AlertTriangle className="h-4 w-4 text-[var(--accent-yellow)]" />
                <span className="text-sm font-semibold text-white">Action Items ({actions.length})</span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {actions.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{a.what}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                      {a.who && <span className="badge-brand badge">👤 {a.who}</span>}
                      {a.due_date && <span>📅 {a.due_date}</span>}
                      <span
                        className="badge"
                        style={{
                          background:
                            a.priority === "high"
                              ? "rgba(248,113,113,0.15)"
                              : a.priority === "low"
                              ? "rgba(52,211,153,0.15)"
                              : "rgba(251,191,36,0.15)",
                          color:
                            a.priority === "high"
                              ? "var(--accent-red)"
                              : a.priority === "low"
                              ? "var(--accent-green)"
                              : "var(--accent-yellow)",
                        }}
                      >
                        {a.priority} priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SentimentPanel({
  result,
  loading,
  onRunSentiment,
  analyzing,
}: {
  result: SentimentResult | null;
  loading: boolean;
  onRunSentiment: () => void;
  analyzing: boolean;
}) {
  const [hoveredSeg, setHoveredSeg] = useState<SentimentSegment | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    );
  }

  if (!result || result.segments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <TrendingUp className="h-10 w-10 text-[var(--accent-purple)]" />
        <p className="text-sm text-[var(--text-muted)]">Run sentiment analysis on this transcript</p>
        <button onClick={onRunSentiment} disabled={analyzing} className="btn-primary">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzing ? "Analyzing..." : "Analyze Sentiment"}
        </button>
      </div>
    );
  }

  const speakerData = Object.entries(result.speaker_scores).map(([name, data]) => ({
    name,
    score: data.avg_score,
    count: data.segment_count,
    sentiment: data.sentiment,
  }));

  return (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Overall Sentiment
            </p>
            <p className="mt-1 text-2xl font-bold" style={{ color: SENTIMENT_COLORS[result.overall_sentiment] || "var(--text-primary)" }}>
              {result.overall_sentiment.charAt(0).toUpperCase() + result.overall_sentiment.slice(1)}
            </p>
          </div>
          <div className="text-right">
            <p className="stat-value">{result.overall_score.toFixed(3)}</p>
            <p className="text-xs text-[var(--text-muted)]">polarity score</p>
          </div>
        </div>
        <button onClick={onRunSentiment} disabled={analyzing} className="btn-ghost mt-3 text-xs">
          {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Re-analyze
        </button>
      </div>

      {/* Speaker Bar Chart */}
      {speakerData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Speaker Sentiment Scores</h3>
          <div style={{ height: Math.max(200, speakerData.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={speakerData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" domain={[-1, 1]} tick={{ fill: "#8b95b0", fontSize: 11 }} axisLine={{ stroke: "#1e2536" }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#f1f3f9", fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                <ReTooltip
                  contentStyle={{
                    background: "#151823",
                    border: "1px solid #1e2536",
                    borderRadius: 12,
                    color: "#f1f3f9",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v.toFixed(3), "Score"]}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                  {speakerData.map((d, i) => (
                    <Cell key={i} fill={SENTIMENT_COLORS[d.sentiment] || "#8b95b0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sentiment Timeline */}
      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Sentiment Timeline</h3>
        <div className="space-y-1">
          {result.segments.map((seg) => (
            <div
              key={seg.id}
              className={`sentiment-${seg.label || seg.sentiment} relative cursor-pointer rounded-lg px-4 py-2 transition-all duration-200 hover:opacity-90`}
              onMouseEnter={() => setHoveredSeg(seg)}
              onMouseLeave={() => setHoveredSeg(null)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {seg.speaker || "Unknown"} — Segment {seg.segment_index + 1}
                </span>
                <span className="text-xs" style={{ color: SENTIMENT_COLORS[seg.sentiment] }}>
                  {seg.score > 0 ? "+" : ""}{seg.score.toFixed(3)} · {seg.label || seg.sentiment}
                </span>
              </div>
              {hoveredSeg?.id === seg.id && (
                <p className="mt-2 text-xs text-[var(--text-secondary)] animate-fade-in line-clamp-3">
                  &quot;{seg.text}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ meetingId, meetingTitle }: { meetingId: number; meetingTitle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatApi.query(q, meetingId, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer, citations: res.data.citations },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that question. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] flex-col glass-card">
      {/* Chat header */}
      <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: "var(--border-subtle)" }}>
        <Bot className="h-5 w-5 text-[var(--brand-hover)]" />
        <span className="text-sm font-semibold text-white">AI Assistant</span>
        <span className="ml-auto text-xs text-[var(--text-muted)]">Context: {meetingTitle}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Bot className="h-12 w-12 text-[var(--brand-hover)] opacity-50" />
            <p className="text-sm text-[var(--text-muted)]">
              Ask questions about this meeting transcript
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "What decisions were made?",
                "Summarize the main points",
                "What action items were assigned?",
              ].map((q) => (
                <button
                  key={q}
                  className="btn-ghost text-xs border border-[var(--border-subtle)]"
                  onClick={() => { setInput(q); }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
              <div className="flex items-start gap-2">
                {msg.role === "assistant" && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--brand-hover)]" />}
                <div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-[var(--text-muted)]">Sources:</p>
                      {msg.citations.map((c, j) => (
                        <div key={j} className="rounded-lg p-2 text-xs" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                          <span className="font-medium text-[var(--brand-hover)]">{c.meeting_title}</span>
                          {c.speaker && <span className="text-[var(--text-muted)]"> · {c.speaker}</span>}
                          {c.timestamp && <span className="text-[var(--text-muted)]"> · {c.timestamp}</span>}
                          <p className="mt-1 text-[var(--text-secondary)] line-clamp-2">{c.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-hover)]" />
              <span className="text-xs text-[var(--text-muted)]">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            className="input-field flex-1"
            placeholder="Ask about this meeting..."
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-3 py-3">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────── */

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = Number(params.id);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [sentimentResult, setSentimentResult] = useState<SentimentResult | null>(null);
  const [tab, setTab] = useState<Tab>("insights");
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const meetingRes = await meetingsApi.get(meetingId);
        setMeeting(meetingRes.data);
        const [decisionsRes, actionsRes] = await Promise.all([
          analysisApi.getDecisions(meetingId).catch(() => ({ data: [] })),
          analysisApi.getActions(meetingId).catch(() => ({ data: [] })),
        ]);
        setDecisions(decisionsRes.data);
        setActions(actionsRes.data);

        try {
          const sentRes = await analysisApi.getSentiment(meetingId);
          setSentimentResult(sentRes.data);
        } catch {}
      } catch {
        toast.error("Meeting not found");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [meetingId, router]);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await analysisApi.extract(meetingId);
      setDecisions(res.data.decisions);
      setActions(res.data.action_items);
      toast.success("Insights extracted!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleSentiment = async () => {
    setAnalyzingSentiment(true);
    try {
      const res = await analysisApi.runSentiment(meetingId);
      setSentimentResult(res.data);
      toast.success("Sentiment analyzed!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Sentiment analysis failed");
    } finally {
      setAnalyzingSentiment(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await analysisApi.exportCsv(meetingId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting?.title || "report"}_report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await analysisApi.exportPdf(meetingId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting?.title || "report"}_report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const speakers = (() => {
    try { return JSON.parse(meeting?.speakers || "[]"); } catch { return []; }
  })();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => router.push("/dashboard")} className="btn-ghost mt-1 px-2 py-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            {loading ? (
              <div className="skeleton h-8 w-64" />
            ) : (
              <>
                <h1 className="section-title text-2xl">{meeting?.title}</h1>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" /> {meeting?.project_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {speakers.join(", ") || "N/A"}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {meeting?.word_count.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {meeting?.created_at ? format(new Date(meeting.created_at), "PPp") : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-nav inline-flex">
          {([
            { key: "insights" as Tab, label: "Decisions & Actions", icon: ListChecks },
            { key: "sentiment" as Tab, label: "Sentiment", icon: TrendingUp },
            { key: "chat" as Tab, label: "AI Chat", icon: MessageSquare },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`tab-item flex items-center gap-2 ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in" key={tab}>
          {tab === "insights" && (
            <InsightsPanel
              decisions={decisions}
              actions={actions}
              loading={loading}
              onExtract={handleExtract}
              extracting={extracting}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
            />
          )}
          {tab === "sentiment" && (
            <SentimentPanel
              result={sentimentResult}
              loading={loading}
              onRunSentiment={handleSentiment}
              analyzing={analyzingSentiment}
            />
          )}
          {tab === "chat" && meeting && (
            <ChatPanel meetingId={meetingId} meetingTitle={meeting.title} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
