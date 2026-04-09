/* ── Type definitions for Meeting Intelligence Hub ── */

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Meeting {
  id: number;
  user_id: number;
  title: string;
  project_name: string;
  filename: string;
  file_type: string;
  word_count: number;
  speaker_count: number;
  speakers: string;
  duration_minutes: number;
  detected_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingDetail extends Meeting {
  raw_text: string | null;
}

export interface MeetingStats {
  total_meetings: number;
  total_action_items: number;
  avg_sentiment: number;
  projects: string[];
}

export interface Decision {
  id: number;
  meeting_id: number;
  content: string;
  context: string | null;
  speaker: string | null;
  timestamp: string | null;
  confidence: number;
  created_at: string;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  what: string;
  who: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  speaker: string | null;
  timestamp: string | null;
  confidence: number;
  created_at: string;
}

export interface SentimentSegment {
  id: number;
  meeting_id: number;
  speaker: string | null;
  segment_index: number;
  start_time: string | null;
  end_time: string | null;
  text: string;
  sentiment: string;
  score: number;
  label: string | null;
  created_at: string;
}

export interface SentimentResult {
  segments: SentimentSegment[];
  speaker_scores: Record<string, { avg_score: number; sentiment: string; segment_count: number }>;
  overall_sentiment: string;
  overall_score: number;
}

export interface ExtractionResult {
  meeting_id: number;
  decisions: Decision[];
  action_items: ActionItem[];
}

export interface Citation {
  meeting_title: string;
  speaker: string | null;
  timestamp: string | null;
  excerpt: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}
