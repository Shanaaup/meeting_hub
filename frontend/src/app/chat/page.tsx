"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "@/components/AppLayout";
import { chatApi, meetingsApi } from "@/lib/api";
import type { ChatMessage, Meeting } from "@/lib/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | undefined>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    meetingsApi.list().then((res) => setMeetings(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatApi.query(q, selectedMeeting, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer, citations: res.data.citations },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-120px)] gap-5">
        {/* Sidebar: Meeting Selector */}
        <div className="hidden w-64 flex-shrink-0 lg:block">
          <div className="glass-card h-full flex flex-col">
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4" /> Context
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <button
                className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition-all ${
                  !selectedMeeting
                    ? "bg-[var(--brand-glow)] text-white font-medium"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                }`}
                onClick={() => setSelectedMeeting(undefined)}
              >
                🌐 All Meetings
              </button>
              {meetings.map((m) => (
                <button
                  key={m.id}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-sm truncate transition-all ${
                    selectedMeeting === m.id
                      ? "bg-[var(--brand-glow)] text-white font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => setSelectedMeeting(m.id)}
                  title={m.title}
                >
                  📄 {m.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col glass-card">
          {/* Header */}
          <div className="flex items-center gap-3 border-b px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gradient-brand)" }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Meeting Intelligence AI</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {selectedMeeting
                  ? `Focused on: ${meetings.find((m) => m.id === selectedMeeting)?.title || "..."}`
                  : "Searching across all meetings"}
              </p>
            </div>

            {/* Mobile meeting selector */}
            <select
              className="ml-auto lg:hidden input-field w-auto text-xs py-1.5"
              value={selectedMeeting || ""}
              onChange={(e) => setSelectedMeeting(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All Meetings</option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: "var(--brand-glow)" }}>
                  <Sparkles className="h-10 w-10 text-[var(--brand-hover)]" />
                </div>
                <h3 className="text-lg font-semibold text-white">Ask anything about your meetings</h3>
                <p className="max-w-sm text-center text-sm text-[var(--text-muted)]">
                  I can answer questions, find decisions, summarize discussions, and cite specific speakers and timestamps.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "What are the key decisions across all meetings?",
                    "Who has the most action items?",
                    "Summarize last week's meetings",
                  ].map((q) => (
                    <button
                      key={q}
                      className="btn-ghost text-xs border border-[var(--border-subtle)]"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                  <div className="flex items-start gap-2">
                    {msg.role === "assistant" && (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--brand-hover)]" />
                    )}
                    <div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-medium text-[var(--text-muted)]">📎 Citations:</p>
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
              <div className="flex justify-start animate-fade-in">
                <div className="chat-bubble-ai flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-hover)]" />
                  <span className="text-xs text-[var(--text-muted)]">Searching transcripts & generating answer...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-5 py-4" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                className="input-field flex-1"
                placeholder="Ask a question about your meetings..."
                disabled={loading}
              />
              <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-4 py-3">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
