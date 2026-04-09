"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Dna, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { analysisApi } from "@/lib/api";
import type { MeetingDNAResult, DNAInsight } from "@/lib/types";

const AXIS_LABELS: Record<string, string> = {
  decisiveness: "Decisiveness",
  engagement: "Engagement",
  sentiment_balance: "Sentiment Balance",
  action_clarity: "Action Clarity",
  participation: "Participation",
  topic_focus: "Topic Focus",
};

const AXIS_DESCRIPTIONS: Record<string, string> = {
  decisiveness: "Ratio of decisions made relative to meeting length",
  engagement: "Speaker turn frequency and dynamic conversation flow",
  sentiment_balance: "Balance between positive and negative sentiment",
  action_clarity: "Action items with clear owners and deadlines",
  participation: "Equity of speaking time across all participants",
  topic_focus: "Coherence and focus of the discussion topics",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "#34d399",
  A: "#34d399",
  "B+": "#60a5fa",
  B: "#60a5fa",
  C: "#fbbf24",
  D: "#f97316",
  F: "#f87171",
};

const INSIGHT_STYLES: Record<string, { bg: string; border: string }> = {
  positive: { bg: "rgba(52, 211, 153, 0.08)", border: "rgba(52, 211, 153, 0.2)" },
  warning: { bg: "rgba(251, 191, 36, 0.08)", border: "rgba(251, 191, 36, 0.2)" },
  info: { bg: "rgba(96, 165, 250, 0.08)", border: "rgba(96, 165, 250, 0.2)" },
};

const PIE_COLORS = ["#6366f1", "#a78bfa", "#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#f97316"];

function AnimatedScore({ score, grade }: { score: number; grade: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Eased
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score]);

  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const gradeColor = GRADE_COLORS[grade] || "#8b95b0";

  return (
    <div className="relative flex flex-col items-center">
      <svg width="150" height="150" viewBox="0 0 150 150" className="drop-shadow-lg">
        {/* Background ring */}
        <circle
          cx="75" cy="75" r="58"
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth="10"
        />
        {/* Animated score ring */}
        <circle
          cx="75" cy="75" r="58"
          fill="none"
          stroke={gradeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 75 75)"
          style={{ transition: "stroke-dashoffset 0.1s ease-out", filter: `drop-shadow(0 0 8px ${gradeColor}40)` }}
        />
        {/* Glow */}
        <circle
          cx="75" cy="75" r="58"
          fill="none"
          stroke={gradeColor}
          strokeWidth="2"
          opacity="0.15"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 75 75)"
          filter="blur(4px)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold" style={{ color: gradeColor }}>
          {displayScore}
        </span>
        <span className="text-xs font-bold tracking-widest" style={{ color: gradeColor, opacity: 0.7 }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: DNAInsight; index: number }) {
  const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info;
  return (
    <div
      className="rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] animate-fade-in-up"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        animationDelay: `${index * 0.08}s`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{insight.icon}</span>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{insight.title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">{insight.detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function MeetingDNAPanel({ meetingId }: { meetingId: number }) {
  const [dna, setDna] = useState<MeetingDNAResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analysisApi
      .getDNA(meetingId)
      .then((res) => setDna(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to compute Meeting DNA"))
      .finally(() => setLoading(false));
  }, [meetingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-hover)]" />
        <p className="text-sm text-[var(--text-muted)]">Computing Meeting DNA...</p>
      </div>
    );
  }

  if (error || !dna) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Dna className="h-10 w-10 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">{error || "No DNA data available"}</p>
      </div>
    );
  }

  // Radar data
  const radarData = Object.entries(dna.axes).map(([key, value]) => ({
    axis: AXIS_LABELS[key] || key,
    value,
    fullMark: 100,
    description: AXIS_DESCRIPTIONS[key] || "",
  }));

  // Speaker pie data
  const speakerData = Object.entries(dna.speaker_word_distribution).map(([name, words]) => ({
    name,
    value: words,
  }));

  const totalWords = speakerData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}
          >
            <Dna className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Meeting DNA</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Multi-dimensional meeting quality fingerprint
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
          {/* Radar Chart */}
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#8b95b0", fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#5a6380", fontSize: 9 }}
                  axisLine={false}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.25}
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#818cf8", stroke: "#6366f1", strokeWidth: 2 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Health Score */}
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
              Health Score
            </p>
            <AnimatedScore score={dna.health_score} grade={dna.grade} />
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-white">{dna.total_decisions}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Decisions</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{dna.total_actions}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Actions</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{dna.total_segments}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Turns</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Axis Breakdown + Speaker Pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Axis Score Cards */}
        <div className="glass-card p-5">
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--brand-hover)]" />
            Dimension Scores
          </h4>
          <div className="space-y-3">
            {Object.entries(dna.axes).map(([key, value]) => {
              const barColor =
                value >= 70 ? "#34d399" : value >= 40 ? "#fbbf24" : "#f87171";
              return (
                <div key={key} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {AXIS_LABELS[key]}
                    </span>
                    <span className="text-xs font-bold" style={{ color: barColor }}>
                      {value.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${value}%`,
                        background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
                        boxShadow: `0 0 8px ${barColor}40`,
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                    {AXIS_DESCRIPTIONS[key]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speaker Distribution Pie */}
        <div className="glass-card p-5">
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-purple)]" />
            Speaker Contribution
          </h4>
          {speakerData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={speakerData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {speakerData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {speakerData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-[var(--text-secondary)]">{d.name}</span>
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {d.value} words ({((d.value / totalWords) * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              No speaker data available
            </p>
          )}
        </div>
      </div>

      {/* Smart Insights */}
      {dna.insights.length > 0 && (
        <div className="glass-card p-5">
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-yellow)]" />
            AI Pattern Insights
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {dna.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
